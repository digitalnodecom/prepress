import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { generateSite } from '../src/lib/ai/generate';
import { DEMO_BRIEF } from '../src/lib/ai/demo';
import type { Site } from '../src/lib/types';
import { setPageContent, sectionsToMarkup, applyDesign, getSections, replaceSection } from '../src/lib/site';
import { validateMarkup } from '../src/lib/wp/markup';
import { renderPage } from '../src/lib/wp/render';
import { exportSite, buildWxr } from '../src/lib/wp/export';
import { templates } from '../src/lib/wp/templates';
import { PATTERNS } from '../src/lib/wp/patterns';
import { sanitizeDesign } from '../src/lib/wp/design';

async function demoSite(): Promise<Site> {
  let site!: Site;
  await generateSite({ kind: 'demo', json: async () => { throw new Error('x'); } }, DEMO_BRIEF, {
    onPlan: (s) => { site = s; },
    onPage: (id, markup) => { site = setPageContent(site, id, markup); },
    onPageError: (id, e) => { throw e; },
  });
  return site;
}

function expectValid(markup: string, label: string) {
  const v = validateMarkup(markup);
  if (v.invalid.length) console.log(label, v.invalid);
  expect(v.invalid, label).toEqual([]);
  return v;
}

describe('round trip', () => {
  test('every pattern serializes to valid blocks', () => {
    const design = sanitizeDesign({});
    const sample: Record<string, any> = {
      heading: 'H', text: 'T', intro: 'I', eyebrow: 'E', imageLabel: 'img', primaryCta: { label: 'Go', url: '/' }, secondaryCta: { label: 'More', url: '/x/' },
      items: [{ title: 'a', text: 'b', icon: '★', value: '1', label: 'l', quote: 'q', name: 'n', role: 'r', question: 'q?', answer: 'a' }, { title: 'c', text: 'd' }, { title: 'e', text: 'f' }, { title: 'g', text: 'h' }],
      plans: [{ name: 'A', price: '$1', period: '/mo', features: ['x'], cta: { label: 'Buy', url: '/' }, featured: true }, { name: 'B', price: '$2', features: ['y'], cta: { label: 'Buy', url: '/' } }],
      members: [{ name: 'A B', role: 'C' }], bullets: ['x', 'y'], cta: { label: 'c', url: '/' }, paragraphs: ['p1', 'p2'], names: ['A', 'B'], label: 'L',
      email: 'a@b.c', phone: '+1 2', address: 'addr', hours: 'h',
    };
    for (const name of Object.keys(PATTERNS)) {
      for (const tone of ['base', 'primary', 'contrast']) {
        const { markup, report } = sectionsToMarkup([{ pattern: name, props: { ...sample, tone } }], design);
        expect(markup.length, name).toBeGreaterThan(50);
        expectValid(markup, `${name}/${tone}`);
        expect(report.dropped, `${name} dropped attrs`).toEqual([]);
      }
    }
  });

  test('demo site: all pages, parts and templates are valid Gutenberg markup', async () => {
    const site = await demoSite();
    expect(site.pages.length).toBe(4);
    let total = 0;
    for (const p of site.pages) {
      expect(p.content.length).toBeGreaterThan(100);
      total += expectValid(p.content, p.title).blocks;
    }
    expectValid(site.header, 'header');
    expectValid(site.footer, 'footer');
    for (const [k, t] of Object.entries(templates())) expectValid(t, `template ${k}`);
    expect(total).toBeGreaterThan(100);
  });

  test('messy AI output is repaired', () => {
    const design = sanitizeDesign({});
    const { markup, report } = sectionsToMarkup([
      { name: 'group', attributes: { align: 'full', bogus: 1 }, innerBlocks: [
        { name: 'core/heading', attributes: { text: 'Hi', textAlign: 'center', level: '2' } },
        { name: 'core/button', attributes: { label: 'Go', href: '/x/' } },
        { name: 'core/columns', innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'in col' } }] },
        { name: 'core/list', innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'li' } }] },
        { name: 'acme/slider', attributes: {}, innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'kept' } }] },
        { name: 'core/image', attributes: { alt: 'A dog' } },
      ] },
      'plain string becomes a paragraph',
    ], design);
    expectValid(markup, 'messy');
    expect(markup).toContain('wp:buttons');
    expect(markup).toContain('wp:column ');
    expect(markup).toContain('has-text-align-center');
    expect(markup).toContain('kept');
    expect(markup).toContain('data:image/svg+xml');
    expect(report.dropped).toContain('acme/slider');
  });

  test('render, restyle, edit, export', async () => {
    let site = await demoSite();
    const html = renderPage(site, site.pages[0], { markSections: true, interactive: true });
    expect(html).toContain('is-layout-constrained');
    expect(html).toContain('data-bw-section="0"');
    expect(html).toContain('wp-block-navigation-item');
    expect(html).toContain('Fern &amp; Ember');

    const before = getSections(site.pages[0]).length;
    site = replaceSection(site, site.pages[0].id, 1, sectionsToMarkup([{ pattern: 'stats', props: { items: [{ value: '1', label: 'x' }] } }], site.design).markup);
    expect(getSections(site.pages[0]).length).toBe(before);

    site = applyDesign(site, { ...site.design, palette: { ...site.design.palette, primary: '#f5f5f5' } });
    for (const p of site.pages) expectValid(p.content, 'restyled ' + p.title);

    const wxr = buildWxr(site);
    expect(wxr).toContain('<wp:post_type><![CDATA[page]]></wp:post_type>');

    const res = await exportSite(site);
    expect(res.stats.invalid).toBe(0);
    const zip = await JSZip.loadAsync(await res.blob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names.some((n) => n.endsWith('content.xml'))).toBe(true);
    const themeZipName = names.find((n) => n.endsWith('-theme.zip'))!;
    const theme = await JSZip.loadAsync(await zip.file(themeZipName)!.async('arraybuffer'));
    const tnames = Object.keys(theme.files);
    for (const f of ['style.css', 'theme.json', 'templates/page.html', 'templates/front-page.html', 'templates/index.html', 'parts/header.html', 'parts/footer.html', 'functions.php']) {
      expect(tnames.some((n) => n.endsWith(f)), f).toBe(true);
    }
    const tj = JSON.parse(await theme.file(tnames.find((n) => n.endsWith('theme.json'))!)!.async('string'));
    expect(tj.version).toBe(3);
  });
});
