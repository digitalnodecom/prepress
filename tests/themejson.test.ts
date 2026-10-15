import { describe, expect, test } from 'vitest';
import { buildThemeJson, cleanThemeJsonPatch, compileGlobalStyles, googleFontsUrl, sanitizeDesign } from '../src/lib/wp/design';
import { patchThemeJson, resetThemeJson } from '../src/lib/site';
import type { Site } from '../src/lib/types';

const design = sanitizeDesign({});
const site: Site = { name: 'S', tagline: '', design, header: '', footer: '', pages: [] };

describe('theme.json patch', () => {
  test('deep-merges over the generated theme.json; arrays replace; null deletes; version stays 3', () => {
    let s = patchThemeJson(site, {
      version: 2,
      settings: { typography: { fontSizes: [{ slug: 'huge', name: 'Huge', size: '5rem' }] }, layout: { wideSize: '1400px' } },
      styles: { blocks: { 'core/quote': null, 'core/heading': { typography: { textTransform: 'uppercase' } } } },
    });
    s = patchThemeJson(s, { styles: { color: { background: 'var:preset|color|muted' } } });
    const tj: any = buildThemeJson(s.design, s.themeJson);
    expect(tj.version).toBe(3);
    expect(tj.settings.typography.fontSizes).toEqual([{ slug: 'huge', name: 'Huge', size: '5rem' }]);
    expect(tj.settings.layout).toEqual({ contentSize: design.contentSize, wideSize: '1400px' });
    expect(tj.settings.color.palette).toHaveLength(6);
    expect(tj.styles.blocks['core/quote']).toBeUndefined();
    expect(tj.styles.color.background).toBe('var:preset|color|muted');
    expect(tj.styles.blocks['core/heading'].typography.textTransform).toBe('uppercase');
    expect(resetThemeJson(s).themeJson).toBeUndefined();
  });

  test('preview CSS follows the patched presets', () => {
    const s = patchThemeJson(site, { settings: { typography: { fontSizes: [{ slug: 'huge', name: 'Huge', size: '5rem' }] }, layout: { contentSize: '700px' } } });
    const css = compileGlobalStyles(s.design, s.themeJson);
    expect(css).toContain('--wp--preset--font-size--huge:5rem');
    expect(css).toContain('.has-huge-font-size');
    expect(css).not.toContain('--wp--preset--font-size--medium:');
    expect(css).toContain('--wp--style--global--content-size:700px');
  });

  test('rejects bad patches', () => {
    expect(() => cleanThemeJsonPatch([])).toThrow(/must be an object/);
    expect(() => cleanThemeJsonPatch({ styles: { css: '</style><script>x</script>' } })).toThrow(/HTML/);
    expect(() => cleanThemeJsonPatch({ big: 'x'.repeat(300 * 1024) })).toThrow(/too large/);
  });
});

describe('mono font slot', () => {
  test('defaults to system mono, only accepts mono faces, always emits a "mono" family', () => {
    const old = sanitizeDesign({ headingFont: 'syne', bodyFont: 'inter' } as any);
    expect(old.monoFont).toBe('system-mono');
    expect(sanitizeDesign({ monoFont: 'inter' } as any).monoFont).toBe('system-mono');
    const d = sanitizeDesign({ headingFont: 'fraunces', bodyFont: 'newsreader', monoFont: 'ibm-plex-mono' } as any);
    const fams: any[] = (buildThemeJson(d) as any).settings.typography.fontFamilies;
    expect(fams.map((f) => f.slug)).toEqual(['heading', 'body', 'mono']);
    expect(fams[2].fontFamily).toContain('IBM Plex Mono');
    expect(googleFontsUrl(d)).toContain('family=IBM+Plex+Mono');
    expect((buildThemeJson(old) as any).settings.typography.fontFamilies.map((f: any) => f.slug)).toEqual(['heading', 'body', 'mono']);
    expect(googleFontsUrl(old)).not.toContain('Mono');
    expect(compileGlobalStyles(d)).toContain('--wp--preset--font-family--mono');
  });
});
