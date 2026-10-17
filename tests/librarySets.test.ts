// Library sets: every layer builds from the one below, is valid, and imports cleanly.
import { describe, expect, test } from 'vitest';
import { SETS } from '../library-sets';
import { buildLibrarySet } from '../src/lib/librarySets';
import { importLibraryItem, siteValidity } from '../src/lib/library';
import { buildStarter } from '../src/lib/starters';
import { validateMarkup } from '../src/lib/wp/markup';
import { exportSite } from '../src/lib/wp/export';
import JSZip from 'jszip';
import { contrastRatio, sanitizeDesign, textOn } from '../src/lib/wp/design';

/** What each set must look like once built. */
const EXPECT: Record<keyof typeof SETS, { pages: string[]; headerBlock: string; preview: { item: string; contains: string[] } }> = {
  kinetic: { pages: ['home', 'work', 'studio', 'contact'], headerBlock: 'wp:prepress/kinetic-pill', preview: { item: 'pattern:hero', contains: ['kx-marquee', '--wp--preset--font-size--mega', 'Syne'] } },
  garden: { pages: ['home', 'menu', 'evenings', 'visit', 'private-dining'], headerBlock: 'ng-header-cta', preview: { item: 'pattern:hero', contains: ['ng-glow', 'ng-arch', 'Cormorant+Garamond', 'DM+Mono', 'color-scheme:dark'] } },
  showroom: { pages: ['home', 'design', 'specs', 'buy'], headerBlock: 'wp:navigation', preview: { item: 'pattern:hero', contains: ['sr-fold', 'sr-price', '--wp--preset--font-size--hero', 'Inter'] } },
  fx: { pages: ['home'], headerBlock: '', preview: { item: 'block:fx-starfield', contains: ['fx-stars', '@media (prefers-reduced-motion:no-preference)'] } },
  hut: { pages: ['home'], headerBlock: 'hp-header', preview: { item: 'pattern:hero', contains: ['hp-pass', 'Bebas+Neue', 'EB+Garamond'] } },
  chorus: { pages: ['home'], headerBlock: 'ch-header', preview: { item: 'pattern:hero', contains: ['ch-hero', 'data-ui', 'Bricolage+Grotesque'] } },
  paper: { pages: ['home', 'essays', 'on-slow-software', 'about', 'subscribe'], headerBlock: 'pe-header-cta', preview: { item: 'pattern:essay', contains: ['pe-lede', 'pe-note', '--wp--preset--font-family--mono', 'IBM+Plex+Mono', 'Newsreader'] } },
};

for (const [key, set] of Object.entries(SETS) as [keyof typeof SETS, (typeof SETS)[keyof typeof SETS]][]) {
  describe(`library set: ${set.style.title}`, () => {
    const built = buildLibrarySet(set as any);
    const want = EXPECT[key];

    test('builds with no normalizer repairs and zero invalid blocks', () => {
      expect(built.report).toEqual([]);
      expect(siteValidity(built.site)).toBe(0);
      for (const p of built.site.pages) expect(validateMarkup(p.content).invalid, p.slug).toEqual([]);
    });

    test('every block is used by a pattern, every pattern by the template', () => {
      if ((set as any).blocksOnly) {
        // A blocks-only collection publishes exactly its blocks, each shown in its own showcase section.
        expect(built.items.map((i) => i.draft.type)).toEqual(set.blocks.map(() => 'block'));
        for (const bl of set.blocks) expect(built.site.pages[0].content, bl.name).toContain(`wp:${bl.name}`);
        for (const i of built.items) expect(i.draft.preview, i.key).toContain(`wp-block-prepress-${i.key.slice(6)}`);
        return;
      }
      const blockKeys = built.items.filter((i) => i.key.startsWith('block:')).map((i) => i.key);
      const patternUses = new Set(built.items.filter((i) => i.key.startsWith('pattern:')).flatMap((i) => i.uses));
      const partsMarkup = built.site.header + built.site.footer;
      for (const k of blockKeys) expect(patternUses.has(k) || partsMarkup.includes(`wp:prepress/${k.slice(6)}`), k).toBe(true);
      const template = built.items.find((i) => i.key === 'template')!;
      for (const i of built.items.filter((x) => x.key.startsWith('pattern:'))) expect(template.uses).toContain(i.key);
      expect(blockKeys).toHaveLength(set.blocks.length);
    });

    test('each item imports into a blank site and stays valid', () => {
      for (const item of built.items) {
        const blank = buildStarter('blank').site;
        const r = importLibraryItem(blank, { type: item.draft.type, title: item.draft.title, payload: item.draft.payload }, item.draft.type === 'pattern' ? { insertInto: blank.pages[0].id } : {});
        expect(siteValidity(r.site), item.key).toBe(0);
        if (item.draft.type === 'template') {
          expect(r.site.pages.map((p) => p.slug)).toEqual(want.pages);
          expect(r.site.blocks).toHaveLength(set.blocks.length);
          expect(r.site.header).toContain(want.headerBlock);
          expect(r.site.themeJson).toBeTruthy();
        }
        if (item.draft.type === 'style') expect(r.site.design).toEqual(built.site.design);
      }
    });

    test('previews are complete pages with the style and the block CSS', () => {
      const it = built.items.find((i) => i.key === want.preview.item)!;
      expect(it.draft.preview).toMatch(/^<!doctype html>/i);
      for (const s of want.preview.contains) expect(it.draft.preview, s).toContain(s);
    });

    test('the WordPress export ships every block', async () => {
      const res = await exportSite(built.site);
      const outer = await JSZip.loadAsync(res.bytes);
      const themeZip = Object.keys(outer.files).find((n) => n.endsWith('-theme.zip'))!;
      const theme = await JSZip.loadAsync(await outer.file(themeZip)!.async('uint8array'));
      const names = Object.keys(theme.files);
      for (const bl of set.blocks) expect(names.some((n) => n.endsWith(`blocks/${bl.name.split('/')[1]}/block.json`)), bl.name).toBe(true);
      const themeJson = JSON.parse(await theme.file(names.find((n) => n.endsWith('theme.json'))!)!.async('string'));
      expect(themeJson.settings.typography.fontFamilies.map((f: any) => f.slug)).toContain('mono');
      expect(res.stats.invalid).toBe(0);
    });
  });
}

test('every set palette passes the Styles panel contrast checks (light and dark)', () => {
  for (const set of Object.values(SETS)) {
    const d = sanitizeDesign(set.style.design);
    const p = d.palette;
    expect(contrastRatio(p.contrast, p.base), set.key).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.primary, p.base), set.key).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.primary, p[textOn(d, 'primary')]), set.key).toBeGreaterThanOrEqual(4.5);
  }
  const night = sanitizeDesign(SETS.garden.style.design);
  expect(textOn(night, 'accent')).toBe('base');
  expect(contrastRatio(night.palette.accent, night.palette.base)).toBeGreaterThanOrEqual(4.5);
});
