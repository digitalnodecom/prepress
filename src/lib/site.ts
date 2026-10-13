/**
 * Site-level operations. Every mutation goes through normalize → serialize, so
 * the stored markup is always valid Gutenberg content.
 */
import { parse, serialize } from '@wordpress/blocks';
import type { BlockNode, Design, Page, Site, SitePlan } from './types';
import { contrastRatio, radiusValue, sanitizeDesign, textOn } from './wp/design';
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

export function rebuildParts(site: Site): Site {
  return { ...site, ...partsFor(site.name, site.tagline, site.pages, site.design) };
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
  return rebuildParts(next);
}

export function addPage(site: Site, title: string): { site: Site; page: Page } {
  let slug = slugify(title);
  while (site.pages.some((p) => p.slug === slug)) slug += '-2';
  const page: Page = { id: uid(), title, slug, content: '' };
  return { site: rebuildParts({ ...site, pages: [...site.pages, page] }), page };
}

export function removePage(site: Site, pageId: string): Site {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page || page.slug === HOME_SLUG) return site;
  return rebuildParts({ ...site, pages: site.pages.filter((p) => p.id !== pageId) });
}
