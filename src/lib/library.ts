/**
 * The Prepress library (https://prepress.digitalno.de/library): share and
 * reuse templates (whole sites), patterns (sections), blocks (site-defined
 * `prepress/*` types) and styles (design tokens + theme.json).
 *
 * Shared by the editor and the server/MCP: building what gets published
 * (payload + a static preview page) and applying an imported item to a site.
 *
 * Library content is written by strangers, so importing treats it exactly like
 * AI output: block markup goes back through markupToNodes → normalize → toMarkup
 * (allowed blocks and attributes only), custom blocks through cleanBlockDef
 * (sanitized templates/CSS), design through sanitizeDesign, theme.json through
 * cleanThemeJsonPatch.
 */
import { cleanPageDescription } from './siteMeta';
import { parse, serialize } from '@wordpress/blocks';
import type { BlockStyleDef, CustomBlockDef, Design, Page, PatternDef, PatternRole, Site } from './types';
import { applyDesign, blockUsage, createPattern, defineBlock, getSections, insertSection, patchThemeJson, rebuildParts, uid } from './site';
import { markupToNodes, toMarkup, validateMarkup } from './wp/markup';
import { normalizeSections, PART_BLOCKS } from './wp/normalize';
import { cleanThemeJsonPatch, sanitizeDesign } from './wp/design';
import { cleanBlockDef, registerCustomBlocks } from './wp/customBlocks';
import { blockStylesUsedIn, cleanBlockStyle, upsertBlockStyles } from './wp/blockStyles';
import { renderPage } from './wp/render';
import { placeholderImage } from './wp/placeholders';
import { mediaAttrs } from './wp/media';
import { ensureBlocks } from './wp/registry';
import { buildStarter } from './starters';

export type LibraryType = 'template' | 'pattern' | 'block' | 'style';
export const LIBRARY_TYPES: LibraryType[] = ['template', 'pattern', 'block', 'style'];

export interface LibraryPayload {
  template?: { site: Site; brief?: string };
  pattern?: { title: string; description?: string; content: string; blocks: CustomBlockDef[]; blockStyles?: BlockStyleDef[] };
  block?: { block: CustomBlockDef };
  style?: { design: Design; themeJson?: Record<string, unknown>; blockStyles?: BlockStyleDef[] };
}

/** What Prepress sends to the library. */
export interface LibraryDraft {
  type: LibraryType;
  title: string;
  description: string;
  tags: string[];
  payload: LibraryPayload;
  /** A static, script-free page showing the item (rendered with renderPage). */
  preview: string;
}

/** What the library returns for one item. */
export interface LibraryItem {
  id: string;
  type: LibraryType;
  title: string;
  description: string;
  tags: string[];
  payload: LibraryPayload;
  createdAt: string;
  updatedAt: string;
  imports?: number;
  official?: boolean;
  uses?: string[];
}

// ---------- building ----------

/** Media library files aren't shared: local /uploads/ images become placeholders in the site's palette. */
export function withoutLocalMedia(markup: string, design: Design, customBlocks: CustomBlockDef[] = []): string {
  if (!markup.includes('/uploads/')) return markup;
  ensureBlocks();
  const attrs = mediaAttrs(customBlocks);
  const blocks = parse(markup);
  const walk = (list: any[]) => {
    for (const b of list) {
      for (const k of attrs[b.name] ?? []) {
        const v = b.attributes?.[k];
        if (typeof v === 'string' && v.startsWith('/uploads/')) b.attributes[k] = placeholderImage(String(b.attributes.alt ?? b.attributes.mediaAlt ?? 'Image'), design);
      }
      if (b.innerBlocks?.length) walk(b.innerBlocks);
    }
  };
  walk(blocks);
  return serialize(blocks);
}

/** Custom blocks a piece of markup uses (they travel with a pattern). */
function blocksUsedIn(markup: string, site: Site): CustomBlockDef[] {
  return (site.blocks ?? []).filter((b) => markup.includes(`<!-- wp:${b.name}`));
}

const previewOf = (site: Site, content: string) => {
  const page: Page = { id: 'preview', title: 'Preview', slug: 'home', content };
  registerCustomBlocks(site.blocks ?? []);
  return renderPage({ ...site, pages: [page] }, page);
};

const clean = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanTags = (t: unknown) => (Array.isArray(t) ? t : String(t ?? '').split(',')).map((x) => clean(x, 24).toLowerCase()).filter(Boolean).slice(0, 6);

export function shareTemplate(site: Site, meta: { title?: string; description?: string; tags?: string[]; brief?: string } = {}): LibraryDraft {
  const local = (m: string) => withoutLocalMedia(m, site.design, site.blocks);
  // This site's own address, analytics ids, cookie banner and code never travel with a template.
  const { seo: _seo, integrations: _integrations, consent: _consent, code: _code, ...rest } = site;
  const shared: Site = {
    ...rest,
    pages: site.pages.map((p) => ({ ...p, content: local(p.content) })),
    header: local(site.header),
    footer: local(site.footer),
    patterns: (site.patterns ?? []).map((p) => ({ ...p, content: local(p.content) })),
  };
  return {
    type: 'template',
    title: clean(meta.title || site.name, 80),
    description: clean(meta.description || site.tagline, 400),
    tags: cleanTags(meta.tags),
    payload: { template: { site: shared, ...(meta.brief ? { brief: clean(meta.brief, 2000) } : {}) } },
    preview: (() => {
      registerCustomBlocks(shared.blocks ?? []);
      return renderPage(shared, shared.pages[0]);
    })(),
  };
}

/** A section of a page (or several, by index), shared as a pattern. */
export function shareSections(site: Site, pageId: string, indexes: number[], meta: { title: string; description?: string; tags?: string[] }): LibraryDraft {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page) throw new Error('No such page');
  const sections = getSections(page);
  const picked = indexes.filter((i) => sections[i] !== undefined).map((i) => sections[i]);
  if (!picked.length) throw new Error('Pick at least one section');
  return sharePatternContent(site, picked.join('\n\n'), meta);
}

export function sharePattern(site: Site, patternId: number, meta: { title?: string; description?: string; tags?: string[] } = {}): LibraryDraft {
  const p = (site.patterns ?? []).find((x) => x.id === patternId);
  if (!p) throw new Error('No such pattern');
  return sharePatternContent(site, p.content, { title: meta.title || p.title, description: meta.description ?? p.description, tags: meta.tags });
}

function sharePatternContent(site: Site, markup: string, meta: { title: string; description?: string; tags?: string[] }): LibraryDraft {
  const content = withoutLocalMedia(markup, site.design, site.blocks);
  const blocks = blocksUsedIn(content, site);
  const blockStyles = blockStylesUsedIn(content, site.blockStyles);
  return {
    type: 'pattern',
    title: clean(meta.title, 80),
    description: clean(meta.description, 400),
    tags: cleanTags(meta.tags),
    payload: { pattern: { title: clean(meta.title, 80), description: clean(meta.description, 400) || undefined, content, blocks, ...(blockStyles.length ? { blockStyles } : {}) } },
    preview: previewOf({ ...site, blocks, blockStyles, header: '', footer: '' }, content),
  };
}

export function shareBlock(site: Site, name: string, meta: { description?: string; tags?: string[] } = {}): LibraryDraft {
  const block = (site.blocks ?? []).find((b) => b.name === name);
  if (!block) throw new Error(`No block ${name}`);
  // Show it the way the site uses it if possible, else with its defaults.
  const used = site.pages.flatMap((p) => getSections(p)).find((s) => s.includes(`<!-- wp:${name}`));
  const sample = used ? withoutLocalMedia(used, site.design, site.blocks) : `<!-- wp:${name} /-->`;
  return {
    type: 'block',
    title: clean(block.title, 80),
    description: clean(meta.description || block.description, 400),
    tags: cleanTags(meta.tags),
    payload: { block: { block } },
    preview: previewOf({ ...site, blocks: [block], header: '', footer: '' }, sample),
  };
}

export function shareStyle(site: Site, meta: { title: string; description?: string; tags?: string[] }): LibraryDraft {
  // Shown on a neutral sample page so people judge the style, not the content.
  const sample = buildStarter('saas', { name: 'Sample' }).site;
  const styled = rebuildParts({ ...applyDesign(sample, site.design), themeJson: site.themeJson, blockStyles: site.blockStyles });
  return {
    type: 'style',
    title: clean(meta.title, 80),
    description: clean(meta.description, 400),
    tags: cleanTags(meta.tags),
    payload: { style: { design: site.design, ...(site.themeJson ? { themeJson: site.themeJson as Record<string, unknown> } : {}), ...(site.blockStyles?.length ? { blockStyles: site.blockStyles } : {}) } },
    preview: renderPage(styled, styled.pages[0]),
  };
}

// ---------- importing (untrusted) ----------

const ROLES = new Set<PatternRole>(['hero', 'page-title', 'article', 'intro', 'story', 'features', 'showcase', 'gallery', 'list', 'menu', 'pricing', 'stats', 'testimonial', 'faq', 'cta', 'contact', 'header', 'footer']);

/** Untrusted block styles → cleaned ones; broken definitions are dropped (their blocks fall back to plain). */
function cleanStyles(list: unknown): BlockStyleDef[] {
  const out: BlockStyleDef[] = [];
  for (const d of (Array.isArray(list) ? list : []).slice(0, 100)) {
    try {
      out.push(cleanBlockStyle(d));
    } catch {
      /* dropped */
    }
  }
  return upsertBlockStyles([], out);
}

/** Untrusted markup → allowed blocks and attributes only, re-serialized by WordPress. */
function cleanMarkup(markup: unknown, design: Design, allowed?: readonly string[], customNames: string[] = []): string {
  if (typeof markup !== 'string' || !markup.trim()) return '';
  const nodes = markupToNodes(markup.slice(0, 2_000_000));
  return toMarkup(normalizeSections(nodes, { design, ...(allowed ? { allowed: [...allowed, ...customNames] } : {}) }));
}

export interface ImportResult {
  site: Site;
  summary: string;
  /** For a template: the brief that came with it. */
  brief?: string;
  /** Section index where content was inserted, if any. */
  inserted?: number;
}

/**
 * Apply a library item to a site.
 *  - template → a new site (replaces the given one; callers keep undo)
 *  - pattern  → its custom blocks + a site pattern; with `insertInto`, also inserted on that page
 *  - block    → a site block type (appears in the inserter)
 *  - style    → design tokens + theme.json patch
 */
export function importLibraryItem(site: Site, item: Pick<LibraryItem, 'type' | 'title' | 'payload'>, opts: { insertInto?: string; at?: number } = {}): ImportResult {
  ensureBlocks();
  const p = item.payload ?? {};
  if (item.type === 'block') {
    if (!p.block?.block) throw new Error('This library item has no block');
    const r = defineBlock(site, p.block.block);
    registerCustomBlocks(r.site.blocks ?? []);
    return { site: r.site, summary: `Added the block “${r.block.title}” (${r.block.name}) — find it in the inserter` };
  }

  if (item.type === 'style') {
    if (!p.style?.design) throw new Error('This library item has no style');
    let next = applyDesign(site, sanitizeDesign(p.style.design));
    if (p.style.themeJson) next = patchThemeJson({ ...next, themeJson: undefined }, cleanThemeJsonPatch(p.style.themeJson));
    // A style brings its block styles; looks from the previous style go (their blocks fall back to plain).
    next = { ...next, blockStyles: cleanStyles(p.style.blockStyles) };
    if (!next.blockStyles!.length) delete next.blockStyles;
    return { site: rebuildParts(next), summary: `Applied the style “${item.title}”` };
  }

  if (item.type === 'pattern') {
    const pat = p.pattern;
    if (!pat?.content) throw new Error('This library item has no pattern');
    let next = site;
    for (const b of (pat.blocks ?? []).slice(0, 20)) {
      try {
        next = defineBlock(next, cleanBlockDef(b)).site;
      } catch {
        /* a broken block definition is dropped; its uses are dropped by the normalizer below */
      }
    }
    const styles = cleanStyles(pat.blockStyles);
    if (styles.length) next = { ...next, blockStyles: upsertBlockStyles(next.blockStyles, styles) };
    registerCustomBlocks(next.blocks ?? []);
    const content = cleanMarkup(pat.content, next.design, undefined, (next.blocks ?? []).map((b) => b.name));
    if (!content) throw new Error('The pattern is empty after cleaning');
    const made = createPattern(next, { title: pat.title || item.title, description: pat.description, content, synced: false, categories: ['library'] });
    next = made.site;
    let inserted: number | undefined;
    if (opts.insertInto) {
      const page = next.pages.find((x) => x.id === opts.insertInto);
      if (page) {
        inserted = Math.max(0, Math.min(opts.at ?? getSections(page).length, getSections(page).length));
        next = insertSection(next, page.id, inserted, content);
      }
    }
    return { site: next, inserted, summary: `Added the pattern “${made.pattern.title}”${inserted !== undefined ? ' to this page' : ' (Inserter → Patterns)'}` };
  }

  // template
  const t = p.template?.site as Site | undefined;
  if (!t?.pages?.length) throw new Error('This library item has no site');
  const design = sanitizeDesign(t.design);
  let blocks: CustomBlockDef[] = [];
  for (const b of (t.blocks ?? []).slice(0, 50)) {
    try {
      blocks = [...blocks.filter((x) => x.name !== cleanBlockDef(b).name), cleanBlockDef(b)];
    } catch {
      /* drop broken block definitions */
    }
  }
  registerCustomBlocks(blocks);
  const names = blocks.map((b) => b.name);
  const seen = new Set<string>();
  const pages: Page[] = t.pages.slice(0, 30).map((pg, i) => {
    let slug = i === 0 ? 'home' : String(pg.slug ?? '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `page-${i}`;
    while (seen.has(slug)) slug += '-2';
    seen.add(slug);
    const description = cleanPageDescription(pg.description);
    return { id: uid(), title: clean(pg.title || 'Page', 60), slug, content: cleanMarkup(pg.content, design, undefined, names), ...(description ? { description } : {}) };
  });
  const patterns: PatternDef[] = (t.patterns ?? []).slice(0, 50).map((pt) => ({
    id: Number.isInteger(pt.id) && pt.id >= 5000 ? pt.id : 5000,
    slug: String(pt.slug ?? 'pattern').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40) || 'pattern',
    title: clean(pt.title, 80),
    content: cleanMarkup(pt.content, design, undefined, names),
    synced: !!pt.synced,
    ...(pt.description ? { description: clean(pt.description, 400) } : {}),
    ...(Array.isArray(pt.categories) ? { categories: pt.categories.map((c) => clean(c, 30)).filter(Boolean).slice(0, 5) } : {}),
    ...(typeof pt.role === 'string' && ROLES.has(pt.role) ? { role: pt.role } : {}),
    ...(Array.isArray(pt.keywords) ? { keywords: pt.keywords.map((k) => clean(k, 24)).filter(Boolean).slice(0, 8) } : {}),
  }));
  const blockStyles = cleanStyles(t.blockStyles);
  let next: Site = {
    name: clean(t.name, 80) || item.title,
    tagline: clean(t.tagline, 160),
    design,
    pages,
    header: cleanMarkup(t.header, design, PART_BLOCKS, names),
    footer: cleanMarkup(t.footer, design, PART_BLOCKS, names),
    custom: { header: !!t.custom?.header, footer: !!t.custom?.footer },
    ...(blocks.length ? { blocks } : {}),
    ...(patterns.length ? { patterns } : {}),
    ...(blockStyles.length ? { blockStyles } : {}),
  };
  if (t.themeJson) next = patchThemeJson(next, cleanThemeJsonPatch(t.themeJson));
  // Parts the author hadn't customised are regenerated for this site's pages.
  next = rebuildParts(next);
  return { site: next, brief: clean(p.template?.brief, 2000) || undefined, summary: `Started a site from the template “${item.title}”` };
}

/** Block validity of everything in a site (import self-check). */
export function siteValidity(site: Site): number {
  return [...site.pages.map((p) => p.content), site.header, site.footer, ...(site.patterns ?? []).map((p) => p.content)].reduce((n, m) => n + validateMarkup(m).invalid.length, 0);
}

export const usedIn = blockUsage;
