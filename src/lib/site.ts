/**
 * Site-level operations. Every mutation goes through normalize → serialize, so
 * the stored markup is always valid Gutenberg content.
 */
import { createBlock, parse, serialize } from '@wordpress/blocks';
import type { BlockNode, CustomBlockDef, Design, Page, PartSlug, PatternDef, Site, SitePlan } from './types';
import { cleanBlockDef } from './wp/customBlocks';
import { cleanThemeJsonPatch, contrastRatio, mergeThemeJson, radiusValue, sanitizeDesign, textOn } from './wp/design';
import { markupToNodes, splitSections, joinSections, toMarkup } from './wp/markup';
import { normalizeBlocks, normalizeSections, PART_BLOCKS, type NormalizeReport } from './wp/normalize';
import { buildFooter, buildHeader } from './wp/patterns';
import { isPlaceholder, placeholderImage } from './wp/placeholders';
import { ensureBlocks } from './wp/registry';
import { HOME_SLUG } from './wp/templates';
import { pageUrl } from './wp/render';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48) || 'page'
  );
}

export function navFor(site: Pick<Site, 'pages'>) {
  return site.pages.map((p) => ({ label: p.title, url: pageUrl(p.slug) }));
}

function partsFor(name: string, tagline: string, pages: Page[], design: Design) {
  const nav = pages.filter((p) => p.slug !== HOME_SLUG).map((p) => ({ label: p.title, url: pageUrl(p.slug) }));
  const contact = pages.find((p) => /contact|book|reserve|get-in-touch/.test(p.slug));
  const opts = { design, allowed: PART_BLOCKS };
  const header = toMarkup(normalizeBlocks(buildHeader(name, contact ? nav.filter((n) => n.url !== pageUrl(contact.slug)) : nav, contact?.title, contact ? pageUrl(contact.slug) : undefined), opts));
  const footer = toMarkup(normalizeBlocks(buildFooter(name, tagline, [{ label: 'Home', url: '/' }, ...nav], design), opts));
  return { header, footer };
}

/** Create an empty site shell from the planning step. */
export function siteFromPlan(plan: SitePlan): Site {
  ensureBlocks();
  const design = sanitizeDesign(plan.design as Partial<Design>);
  const seen = new Set<string>();
  const pages: Page[] = (plan.pages ?? []).slice(0, 6).map((p, i) => {
    let slug = i === 0 ? HOME_SLUG : slugify(p.slug || p.title);
    while (seen.has(slug)) slug += '-2';
    seen.add(slug);
    return { id: uid(), title: String(p.title || (i === 0 ? 'Home' : 'Page')), slug, content: '' };
  });
  if (!pages.length) pages.push({ id: uid(), title: 'Home', slug: HOME_SLUG, content: '' });
  const name = String(plan.name || 'My site');
  const tagline = String(plan.tagline || '');
  return { name, tagline, design, pages, ...partsFor(name, tagline, pages, design) };
}

/**
 * Regenerate the header/footer from the site. Parts the user edited are kept;
 * when `before` (the page list before this change) is given, their menu links
 * follow page additions, renames and removals.
 */
export function rebuildParts(site: Site, before?: Page[]): Site {
  const auto = partsFor(site.name, site.tagline, site.pages, site.design);
  const keep = (slug: PartSlug) => (before ? syncPartLinks(site[slug], before, site.pages) : site[slug]);
  return {
    ...site,
    header: site.custom?.header ? keep('header') : auto.header,
    footer: site.custom?.footer ? keep('footer') : auto.footer,
  };
}

/** Store hand-edited part markup and mark the part as user-owned. */
export function setPart(site: Site, slug: PartSlug, markup: string): Site {
  if (site[slug] === markup) return site;
  return { ...site, [slug]: markup, custom: { ...site.custom, [slug]: true } };
}

/** Throw away hand edits and go back to the generated part. */
export function resetPart(site: Site, slug: PartSlug): Site {
  return rebuildParts({ ...site, custom: { ...site.custom, [slug]: false } });
}

/**
 * Keep links in a hand-edited part pointing at the right pages:
 * removed page → its menu items go; renamed/moved page → label and URL follow;
 * new page → appended to every navigation block.
 */
export function syncPartLinks(markup: string, before: Page[], after: Page[]): string {
  if (!markup.trim()) return markup;
  ensureBlocks();
  const oldByUrl = new Map(before.map((p) => [pageUrl(p.slug), p]));
  const nowById = new Map(after.map((p) => [p.id, p]));
  const added = after.filter((p) => !before.some((b) => b.id === p.id) && p.slug !== HOME_SLUG);
  let changed = false;

  const walk = (list: any[]): any[] =>
    list.flatMap((b) => {
      const a = b.attributes ?? {};
      const old = typeof a.url === 'string' ? oldByUrl.get(a.url) : undefined;
      if (old && (b.name === 'core/navigation-link' || b.name === 'core/button')) {
        const now = nowById.get(old.id);
        if (!now) {
          changed = true;
          if (b.name === 'core/navigation-link') return [];
          a.url = '/';
        } else {
          if (now.slug !== old.slug) {
            a.url = pageUrl(now.slug);
            changed = true;
          }
          const labelKey = b.name === 'core/button' ? 'text' : 'label';
          if (now.title !== old.title && String(a[labelKey] ?? '') === old.title) {
            a[labelKey] = now.title;
            changed = true;
          }
        }
      }
      b.innerBlocks = walk(b.innerBlocks ?? []);
      if (b.name === 'core/navigation' && added.length) {
        const have = new Set(b.innerBlocks.map((x: any) => x.attributes?.url));
        for (const p of added) {
          if (have.has(pageUrl(p.slug))) continue;
          b.innerBlocks.push(createBlock('core/navigation-link', { label: p.title, url: pageUrl(p.slug), kind: 'custom' }));
          changed = true;
        }
      }
      return [b];
    });

  const blocks = walk(parse(markup));
  return changed ? serialize(blocks) : markup;
}

/** Normalize AI sections and serialize. Returns markup + what was repaired. */
export function sectionsToMarkup(sections: unknown, design: Design): { markup: string; report: NormalizeReport } {
  const report: NormalizeReport = { dropped: [], repaired: [] };
  const nodes = normalizeSections(sections, { design, report });
  return { markup: toMarkup(nodes), report };
}

export function setPageContent(site: Site, pageId: string, content: string): Site {
  return { ...site, pages: site.pages.map((p) => (p.id === pageId ? { ...p, content } : p)) };
}

export function getSections(page: Page): string[] {
  return page.content.trim() ? splitSections(page.content) : [];
}

export function replaceSection(site: Site, pageId: string, index: number, markup: string): Site {
  const page = site.pages.find((p) => p.id === pageId)!;
  const sections = getSections(page);
  sections.splice(index, 1, ...splitSections(markup));
  return setPageContent(site, pageId, joinSections(sections));
}

export function insertSection(site: Site, pageId: string, index: number, markup: string): Site {
  const page = site.pages.find((p) => p.id === pageId)!;
  const sections = getSections(page);
  sections.splice(index, 0, ...splitSections(markup));
  return setPageContent(site, pageId, joinSections(sections));
}

export function removeSection(site: Site, pageId: string, index: number): Site {
  const page = site.pages.find((p) => p.id === pageId)!;
  const sections = getSections(page);
  sections.splice(index, 1);
  return setPageContent(site, pageId, joinSections(sections));
}

export function moveSection(site: Site, pageId: string, index: number, dir: -1 | 1): Site {
  const page = site.pages.find((p) => p.id === pageId)!;
  const sections = getSections(page);
  const j = index + dir;
  if (j < 0 || j >= sections.length) return site;
  [sections[index], sections[j]] = [sections[j], sections[index]];
  return setPageContent(site, pageId, joinSections(sections));
}

/** Human label for a section: its metadata name, else first heading text. */
export function sectionLabel(markup: string): string {
  const meta = markup.match(/"metadata":\{"name":"([^"]+)"/);
  let metaName = meta?.[1];
  try {
    if (metaName) metaName = JSON.parse(`"${metaName}"`);
  } catch {
    /* keep raw */
  }
  const h = markup.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/);
  const text = h
    ? h[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&#0?39;|&rsquo;/g, '’')
        .replace(/&quot;/g, '"')
        .trim()
    : '';
  if (metaName && text) return `${metaName} · ${text}`;
  return metaName ?? (text || markup.match(/<!-- wp:([\w/-]+)/)?.[1] || 'Section');
}

/** Compact JSON of a section for AI editing context. */
export function sectionForAI(markup: string): BlockNode[] {
  return markupToNodes(markup, true);
}

// ---------- restyle ----------

/**
 * Apply a new design to all content: regenerate placeholder art in the new
 * palette and repair any text/background slug pairs whose contrast fell
 * below 3:1. Markup stays slug-based, so nothing else needs to change.
 */
const CARD_RADII = ['0px', '12px', '24px'];

function restyleMarkup(markup: string, design: Design): string {
  if (!markup.trim()) return markup;
  ensureBlocks();
  const blocks = parse(markup);
  const walk = (list: any[]) => {
    for (const b of list) {
      const a = b.attributes ?? {};
      if (b.name === 'core/image' && isPlaceholder(a.url)) a.url = placeholderImage(a.alt || 'Image', design);
      if (b.name === 'core/media-text' && isPlaceholder(a.mediaUrl)) a.mediaUrl = placeholderImage(a.mediaAlt || 'Image', design);
      if (b.name === 'core/cover' && isPlaceholder(a.url)) a.url = placeholderImage(a.alt || 'Background', design, 1800, 1100);
      // Card/image corner radius written by our patterns follows the design setting.
      const r = a.style?.border?.radius;
      if (typeof r === 'string' && CARD_RADII.includes(r)) {
        a.style = { ...a.style, border: { ...a.style.border, radius: radiusValue(design.radius).card } };
      }
      const bg = a.backgroundColor as keyof Design['palette'] | undefined;
      const fg = a.textColor as keyof Design['palette'] | undefined;
      if (bg && fg && design.palette[bg] && design.palette[fg] && contrastRatio(design.palette[bg], design.palette[fg]) < 3) {
        a.textColor = textOn(design, bg);
      }
      walk(b.innerBlocks ?? []);
    }
  };
  walk(blocks);
  return serialize(blocks);
}

export function applyDesign(site: Site, design: Design): Site {
  const next: Site = {
    ...site,
    design,
    pages: site.pages.map((p) => ({ ...p, content: restyleMarkup(p.content, design) })),
  };
  const parts = rebuildParts(next);
  return {
    ...parts,
    header: parts.custom?.header ? restyleMarkup(parts.header, design) : parts.header,
    footer: parts.custom?.footer ? restyleMarkup(parts.footer, design) : parts.footer,
  };
}

export function addPage(site: Site, title: string): { site: Site; page: Page } {
  let slug = slugify(title);
  while (site.pages.some((p) => p.slug === slug)) slug += '-2';
  const page: Page = { id: uid(), title, slug, content: '' };
  return { site: rebuildParts({ ...site, pages: [...site.pages, page] }, site.pages), page };
}

export function removePage(site: Site, pageId: string): Site {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page || page.slug === HOME_SLUG) return site;
  return rebuildParts({ ...site, pages: site.pages.filter((p) => p.id !== pageId) }, site.pages);
}

/** Rename a page or change its slug. The front page keeps the "home" slug. */
export function updatePage(site: Site, pageId: string, patch: { title?: string; slug?: string }): Site {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page) return site;
  const title = patch.title?.trim() || page.title;
  let slug = page.slug;
  if (page.slug !== HOME_SLUG && patch.slug !== undefined) {
    slug = slugify(patch.slug || title);
    if (slug === HOME_SLUG) slug = 'home-2';
    while (site.pages.some((p) => p.id !== pageId && p.slug === slug)) slug += '-2';
  }
  if (title === page.title && slug === page.slug) return site;
  return rebuildParts({ ...site, pages: site.pages.map((p) => (p.id === pageId ? { ...p, title, slug } : p)) }, site.pages);
}

// ---------- custom blocks ----------

/** Add or replace a site-defined block type (input is cleaned/validated). */
export function defineBlock(site: Site, input: unknown): { site: Site; block: CustomBlockDef } {
  const block = cleanBlockDef(input);
  const blocks = [...(site.blocks ?? []).filter((b) => b.name !== block.name), block];
  return { site: { ...site, blocks }, block };
}

/** Where a block type is used: page ids, part slugs, pattern ids. */
export function blockUsage(site: Site, name: string): string[] {
  const needle = `<!-- wp:${name}`;
  const where: string[] = [];
  for (const p of site.pages) if (p.content.includes(needle)) where.push(`page:${p.slug}`);
  for (const part of ['header', 'footer'] as const) if (site[part].includes(needle)) where.push(`part:${part}`);
  for (const pt of site.patterns ?? []) if (pt.content.includes(needle)) where.push(`pattern:${pt.slug}`);
  return where;
}

/** Remove a block type. With `removeUses`, its instances are deleted from all content first. */
export function deleteBlock(site: Site, name: string, removeUses = false): Site {
  const used = blockUsage(site, name);
  if (used.length && !removeUses) throw new Error(`Block ${name} is used in ${used.join(', ')}. Pass force/removeUses to delete it and its uses.`);
  const strip = (markup: string) => {
    if (!markup.includes(`<!-- wp:${name}`)) return markup;
    ensureBlocks();
    const walk = (list: any[]): any[] => list.filter((b) => b.name !== name).map((b) => ({ ...b, innerBlocks: walk(b.innerBlocks ?? []) }));
    return serialize(walk(parse(markup)));
  };
  return {
    ...site,
    blocks: (site.blocks ?? []).filter((b) => b.name !== name),
    pages: site.pages.map((p) => ({ ...p, content: strip(p.content) })),
    header: strip(site.header),
    footer: strip(site.footer),
    patterns: (site.patterns ?? []).map((p) => ({ ...p, content: strip(p.content) })),
  };
}

// ---------- patterns ----------

const FIRST_PATTERN_ID = 5000;

export function createPattern(site: Site, input: { title: string; slug?: string; description?: string; content: string; synced?: boolean; categories?: string[] }): { site: Site; pattern: PatternDef } {
  const patterns = site.patterns ?? [];
  let slug = slugify(input.slug || input.title);
  while (patterns.some((p) => p.slug === slug)) slug += '-2';
  const id = Math.max(FIRST_PATTERN_ID - 1, ...patterns.map((p) => p.id)) + 1;
  const pattern: PatternDef = { id, slug, title: String(input.title || slug).slice(0, 80), content: input.content, synced: !!input.synced };
  if (input.description) pattern.description = String(input.description).slice(0, 300);
  if (input.categories?.length) pattern.categories = input.categories.map(String).slice(0, 5);
  return { site: { ...site, patterns: [...patterns, pattern] }, pattern };
}

export function updatePattern(site: Site, id: number, patch: Partial<Pick<PatternDef, 'title' | 'description' | 'content' | 'synced' | 'categories'>>): Site {
  if (!(site.patterns ?? []).some((p) => p.id === id)) throw new Error(`No pattern with id ${id}`);
  return { ...site, patterns: (site.patterns ?? []).map((p) => (p.id === id ? { ...p, ...patch, id, slug: p.slug } : p)) };
}

/** Delete a pattern. References to a synced pattern are replaced by a copy of its content (detached). */
export function deletePattern(site: Site, id: number): Site {
  const pattern = (site.patterns ?? []).find((p) => p.id === id);
  if (!pattern) throw new Error(`No pattern with id ${id}`);
  const detach = (markup: string) => {
    if (!pattern.synced || !markup.includes('<!-- wp:block')) return markup;
    ensureBlocks();
    const copy = parse(pattern.content);
    const walk = (list: any[]): any[] =>
      list.flatMap((b) => (b.name === 'core/block' && Number(b.attributes?.ref) === id ? copy : [{ ...b, innerBlocks: walk(b.innerBlocks ?? []) }]));
    return serialize(walk(parse(markup)));
  };
  return {
    ...site,
    patterns: (site.patterns ?? []).filter((p) => p.id !== id),
    pages: site.pages.map((p) => ({ ...p, content: detach(p.content) })),
    header: detach(site.header),
    footer: detach(site.footer),
  };
}

// ---------- theme.json ----------

export function patchThemeJson(site: Site, patch: unknown): Site {
  const clean = cleanThemeJsonPatch(patch);
  return { ...site, themeJson: mergeThemeJson((site.themeJson ?? {}) as Record<string, any>, clean as Record<string, any>) };
}

export function resetThemeJson(site: Site): Site {
  const { themeJson: _drop, ...rest } = site;
  return rest;
}
