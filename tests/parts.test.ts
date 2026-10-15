import { describe, expect, test } from 'vitest';
import { generateSite } from '../src/lib/ai/generate';
import { DEMO_BRIEF } from '../src/lib/ai/demo';
import type { Site } from '../src/lib/types';
import { addPage, applyDesign, rebuildParts, removePage, resetPart, setPageContent, setPart, updatePage } from '../src/lib/site';
import { markupToNodes, toMarkup, validateMarkup } from '../src/lib/wp/markup';

async function demoSite(): Promise<Site> {
  let site!: Site;
  await generateSite({ kind: 'demo', json: async () => { throw new Error('x'); } }, DEMO_BRIEF, {
    onPlan: (s) => { site = s; },
    onPage: (id, markup) => { site = setPageContent(site, id, markup); },
  });
  return site;
}

const links = (markup: string) => {
  const out: { label: string; url: string }[] = [];
  const walk = (nodes: any[]) => nodes.forEach((n) => {
    if (n.name === 'core/navigation-link') out.push({ label: n.attributes.label, url: n.attributes.url });
    walk(n.innerBlocks ?? []);
  });
  walk(markupToNodes(markup));
  return out;
};

/** Simulates a hand edit: prepend a paragraph to the header. */
function editHeader(site: Site): Site {
  const nodes = markupToNodes(site.header);
  nodes[0].innerBlocks!.unshift({ name: 'core/paragraph', attributes: { content: 'Free delivery this week' } });
  return setPart(site, 'header', toMarkup(nodes));
}

describe('template parts', () => {
  test('generated parts are rebuilt; edited parts are kept', async () => {
    let site = await demoSite();
    expect(site.custom?.header).toBeFalsy();
    site = editHeader(site);
    expect(site.custom?.header).toBe(true);
    const renamed = rebuildParts({ ...site, name: 'New name' });
    expect(renamed.header).toContain('Free delivery this week');
    expect(renamed.footer).not.toBe(''); // footer still generated
  });

  test('menu links in an edited header follow page changes', async () => {
    let site = editHeader(await demoSite());
    const before = links(site.header).length;

    const { site: withPage, page } = addPage(site, 'Catering');
    expect(links(withPage.header)).toContainEqual({ label: 'Catering', url: '/catering/' });
    expect(links(withPage.header)).toHaveLength(before + 1);

    const moved = updatePage(withPage, page.id, { title: 'Weddings', slug: 'weddings' });
    expect(links(moved.header)).toContainEqual({ label: 'Weddings', url: '/weddings/' });
    expect(links(moved.header).some((l) => l.url === '/catering/')).toBe(false);

    const removed = removePage(moved, page.id);
    expect(links(removed.header)).toHaveLength(before);
    expect(removed.header).toContain('Free delivery this week');
    for (const m of [withPage.header, moved.header, removed.header]) expect(validateMarkup(m).invalid).toEqual([]);
  });

  test('a custom label survives a page rename', async () => {
    let site = await demoSite();
    const target = site.pages[1];
    const nodes = markupToNodes(site.header);
    const walk = (ns: any[]) => ns.forEach((n) => { if (n.attributes?.url === `/${target.slug}/`) n.attributes.label = 'Our food'; walk(n.innerBlocks ?? []); });
    walk(nodes);
    site = setPart(site, 'header', toMarkup(nodes));
    const next = updatePage(site, target.id, { title: 'Renamed' });
    expect(links(next.header).find((l) => l.url === `/${target.slug}/`)?.label).toBe('Our food');
  });

  test('restyle keeps edits and the reset brings back the generated part', async () => {
    const original = await demoSite();
    let site = editHeader(original);
    site = applyDesign(site, { ...site.design, palette: { ...site.design.palette, primary: '#224466' } });
    expect(site.header).toContain('Free delivery this week');
    expect(validateMarkup(site.header).invalid).toEqual([]);
    const reset = resetPart(site, 'header');
    expect(reset.custom?.header).toBe(false);
    expect(reset.header).not.toContain('Free delivery this week');
  });
});
