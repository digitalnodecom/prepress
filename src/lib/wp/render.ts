/**
 * Front-end renderer for the preview — a small JavaScript port of what
 * WordPress does in PHP when it outputs a block theme page:
 *
 *  - walks raw parsed blocks (same parser as PHP's parse_blocks)
 *  - adds layout support classes + per-container CSS (wp_render_layout_support_flag)
 *  - renders dynamic blocks (site title/tagline, navigation, post content, template parts)
 *
 * Saved (static) block HTML is passed through untouched, so what you see is what
 * WordPress will output for the same markup.
 */
import { parse as rawParse } from '@wordpress/block-serialization-default-parser';
import { getBlockType } from '@wordpress/blocks';
import { compileCSS } from '@wordpress/style-engine';
import blockLibraryCss from '@wordpress/block-library/build-style/style.css?inline';
import type { Page, Site } from '../types';
import { compileGlobalStyles, googleFontsUrl, presetToCss } from './design';
import { ensureBlocks } from './registry';
import { templates, HOME_SLUG } from './templates';

interface RawBlock {
  blockName: string | null;
  attrs: Record<string, any>;
  innerBlocks: RawBlock[];
  innerHTML: string;
  innerContent: (string | null)[];
}

interface Ctx {
  site: Site;
  page: Page;
  css: string[];
  n: number;
  markSections: boolean;
}

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function pageUrl(slug: string) {
  return slug === HOME_SLUG ? '/' : `/${slug}/`;
}

// ---------- tag helpers ----------

const OPEN_TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s>"'=/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*(\/?)>/g;

/** Add classes / inline style / attributes to an opening tag string. */
function patchTag(tag: string, add: { classes?: string[]; style?: string; attrs?: Record<string, string> }) {
  let out = tag;
  const classes = (add.classes ?? []).filter(Boolean);
  if (classes.length) {
    if (/\sclass="/.test(out)) out = out.replace(/\sclass="([^"]*)"/, (_m, c) => ` class="${(c + ' ' + classes.join(' ')).trim()}"`);
    else out = out.replace(/^<([\w-]+)/, `<$1 class="${classes.join(' ')}"`);
  }
  if (add.style) {
    if (/\sstyle="/.test(out)) out = out.replace(/\sstyle="([^"]*)"/, (_m, s) => ` style="${s.replace(/;?\s*$/, ';')}${add.style}"`);
    else out = out.replace(/^<([\w-]+)/, `<$1 style="${add.style}"`);
  }
  for (const [k, v] of Object.entries(add.attrs ?? {})) out = out.replace(/^<([\w-]+)/, `<$1 ${k}="${esc(v)}"`);
  return out;
}

/** Patch the first opening tag in html. */
function patchFirst(html: string, add: Parameters<typeof patchTag>[1]) {
  OPEN_TAG.lastIndex = 0;
  const m = OPEN_TAG.exec(html);
  if (!m) return html;
  return html.slice(0, m.index) + patchTag(m[0], add) + html.slice(m.index + m[0].length);
}

/** Patch the last opening tag in html (the inner-blocks wrapper, as WordPress does). */
function patchLast(html: string, add: Parameters<typeof patchTag>[1]) {
  OPEN_TAG.lastIndex = 0;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = OPEN_TAG.exec(html))) last = m;
  if (!last) return html;
  return html.slice(0, last.index) + patchTag(last[0], add) + html.slice(last.index + last[0].length);
}

// ---------- layout support ----------

function gapValue(gap: unknown, axis: 'top' | 'left' | 'both'): string | null {
  if (gap == null || gap === '') return null;
  if (typeof gap === 'string') return presetToCss(gap);
  if (typeof gap === 'object') {
    const g = gap as { top?: string; left?: string };
    const top = g.top != null ? presetToCss(g.top) : null;
    const left = g.left != null ? presetToCss(g.left) : null;
    if (axis === 'top') return top;
    if (axis === 'left') return left;
    if (top || left) return `${top ?? 'var(--wp--style--block-gap)'} ${left ?? 'var(--wp--style--block-gap)'}`;
  }
  return null;
}

function layoutFor(block: RawBlock) {
  const type = getBlockType(block.blockName!) as any;
  const support = type?.supports?.layout ?? type?.supports?.__experimentalLayout;
  if (!support) return null;
  const def = typeof support === 'object' ? support.default ?? {} : {};
  const layout = { ...def, ...(block.attrs.layout ?? {}) };
  let t: string = layout.type ?? (layout.inherit ? 'constrained' : 'default');
  if (t === 'default' && layout.inherit) t = 'constrained';
  return { ...layout, type: t };
}

function applyLayout(block: RawBlock, html: string, firstChunk: string | null, ctx: Ctx): string {
  const layout = layoutFor(block);
  if (!layout) return html;
  const slug = block.blockName!.replace('core/', '');
  const kind = layout.type === 'default' ? 'flow' : layout.type;
  const id = `wp-container-${slug}-is-layout-${++ctx.n}`;
  const sel = `.${id}`;
  const rules: string[] = [];
  const gap = block.attrs.style?.spacing?.blockGap;

  if (kind === 'constrained') {
    const cs = layout.contentSize;
    const ws = layout.wideSize;
    if (cs || ws) {
      rules.push(`${sel} > :where(:not(.alignleft):not(.alignright):not(.alignfull)){max-width:${cs ?? 'var(--wp--style--global--content-size)'};margin-left:auto !important;margin-right:auto !important}`);
      rules.push(`${sel} > .alignwide{max-width:${ws ?? cs ?? 'var(--wp--style--global--wide-size)'}}`);
    }
  }
  if (kind === 'flow' || kind === 'constrained') {
    const g = gapValue(gap, 'top');
    if (g) rules.push(`:root :where(${sel}) > *{margin-block-start:${g};margin-block-end:0}`, `:root :where(${sel}) > :first-child{margin-block-start:0}`);
  }
  if (kind === 'flex') {
    const vertical = layout.orientation === 'vertical';
    const just: Record<string, string> = { left: 'flex-start', right: 'flex-end', center: 'center', 'space-between': 'space-between', stretch: 'stretch' };
    const vAlign: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end', stretch: 'stretch', 'space-between': 'space-between' };
    const d: string[] = [];
    if (layout.flexWrap === 'nowrap') d.push('flex-wrap:nowrap');
    if (vertical) {
      d.push('flex-direction:column');
      if (layout.justifyContent && just[layout.justifyContent]) d.push(`align-items:${just[layout.justifyContent]}`);
      else d.push('align-items:flex-start');
    } else {
      if (layout.justifyContent && just[layout.justifyContent]) d.push(`justify-content:${just[layout.justifyContent]}`);
      if (layout.verticalAlignment && vAlign[layout.verticalAlignment]) d.push(`align-items:${vAlign[layout.verticalAlignment]}`);
    }
    const g = gapValue(gap, 'both');
    if (g) d.push(`gap:${g}`);
    if (d.length) rules.push(`${sel}{${d.join(';')}}`);
  }
  if (kind === 'grid') {
    const min = layout.minimumColumnWidth ?? '12rem';
    rules.push(`${sel}{grid-template-columns:${layout.columnCount ? `repeat(${layout.columnCount}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))`}}`);
    const g = gapValue(gap, 'both');
    if (g) rules.push(`${sel}{gap:${g}}`);
  }
  if (block.blockName === 'core/columns') {
    const g = gapValue(gap, 'both');
    if (g) rules.push(`${sel}{gap:${g}}`);
  }

  if (rules.length) ctx.css.push(...rules);
  const classes = [`is-layout-${kind}`, `wp-block-${slug}-is-layout-${kind}`];
  if (rules.length) classes.push(id);
  if (kind === 'constrained') classes.push('has-global-padding');

  // WordPress adds layout classes to the inner-blocks wrapper (e.g. the cover's
  // inner container) — the last opening tag before the first inner block.
  if (block.innerBlocks.length && firstChunk) {
    const patched = patchLast(firstChunk, { classes });
    return patched + html.slice(firstChunk.length);
  }
  return patchFirst(html, { classes });
}

// ---------- block supports for dynamic blocks (get_block_wrapper_attributes) ----------

function wrapper(name: string, attrs: Record<string, any>, extra: string[] = []): string {
  const cls = [`wp-block-${name.replace('core/', '')}`, ...extra];
  if (attrs.className) cls.push(attrs.className);
  if (attrs.align) cls.push(`align${attrs.align}`);
  if (attrs.fontSize) cls.push(`has-${attrs.fontSize}-font-size`);
  if (attrs.fontFamily) cls.push(`has-${attrs.fontFamily}-font-family`);
  if (attrs.textColor) cls.push(`has-${attrs.textColor}-color`, 'has-text-color');
  if (attrs.backgroundColor) cls.push(`has-${attrs.backgroundColor}-background-color`, 'has-background');
  const ta = attrs.style?.typography?.textAlign ?? attrs.textAlign;
  if (ta) cls.push(`has-text-align-${ta}`);
  let style = '';
  try {
    style = attrs.style ? compileCSS(attrs.style) : '';
  } catch {
    style = '';
  }
  return `class="${esc(cls.join(' '))}"${style ? ` style="${esc(style)}"` : ''}`;
}

// ---------- renderer ----------

function renderChildren(block: RawBlock, ctx: Ctx): { html: string; first: string | null } {
  let i = 0;
  let first: string | null = null;
  const parts = block.innerContent.map((chunk, idx) => {
    if (chunk === null) return renderBlock(block.innerBlocks[i++], ctx);
    if (idx === 0) first = chunk;
    return chunk;
  });
  return { html: parts.join(''), first: block.innerContent[0] === null ? null : first };
}

function renderNavigation(block: RawBlock, ctx: Ctx): string {
  const a = block.attrs;
  const vertical = a.layout?.orientation === 'vertical';
  const justify = a.layout?.justifyContent;
  const extra = ['is-responsive'];
  if (vertical) extra.push('is-vertical');
  if (justify) extra.push(`items-justified-${justify}`);
  const items = block.innerBlocks.map((b) => renderBlock(b, ctx)).join('');
  const nav = `<nav ${wrapper('core/navigation', { ...a, style: undefined }, extra)} aria-label="Menu"><ul class="wp-block-navigation__container ${extra.join(' ')} wp-block-navigation">${items}</ul></nav>`;
  return applyLayout(block, nav, null, ctx);
}

function renderDynamic(block: RawBlock, ctx: Ctx): string | null {
  const a = block.attrs ?? {};
  switch (block.blockName) {
    case 'core/site-title': {
      const tag = a.level === 0 || a.level == null ? 'p' : `h${a.level}`;
      return `<${tag} ${wrapper('core/site-title', a)}><a href="/" rel="home">${esc(ctx.site.name)}</a></${tag}>`;
    }
    case 'core/site-tagline':
      return `<p ${wrapper('core/site-tagline', a)}>${esc(ctx.site.tagline)}</p>`;
    case 'core/navigation':
      return renderNavigation(block, ctx);
    case 'core/navigation-link': {
      const url = String(a.url ?? '#');
      const current = url === pageUrl(ctx.page.slug);
      return `<li class="wp-block-navigation-item wp-block-navigation-link${current ? ' current-menu-item' : ''}"><a class="wp-block-navigation-item__content" href="${esc(url)}"${current ? ' aria-current="page"' : ''}><span class="wp-block-navigation-item__label">${a.label ?? ''}</span></a></li>`;
    }
    case 'core/post-title':
      return `<h1 ${wrapper('core/post-title', a)}>${esc(ctx.page.title)}</h1>`;
    case 'core/post-content': {
      const sections = rawParse(ctx.page.content).filter((b: RawBlock) => b.blockName);
      const inner = sections
        .map((b: RawBlock, i: number) => {
          const html = renderBlock(b, ctx);
          return ctx.markSections ? patchFirst(html, { attrs: { 'data-bw-section': String(i) } }) : html;
        })
        .join('\n');
      const html = `<div ${wrapper('core/post-content', a, ['entry-content'])}>${inner}</div>`;
      return applyLayout(block, html, null, ctx);
    }
    case 'core/template-part': {
      const markup = a.slug === 'header' ? ctx.site.header : a.slug === 'footer' ? ctx.site.footer : '';
      const tag = a.tagName ?? 'div';
      const inner = rawParse(markup)
        .filter((b: RawBlock) => b.blockName)
        .map((b: RawBlock) => renderBlock(b, ctx))
        .join('');
      return `<${tag} class="wp-block-template-part" data-bw-part="${esc(a.slug ?? '')}">${inner}</${tag}>`;
    }
    default:
      return null;
  }
}

function renderBlock(block: RawBlock, ctx: Ctx): string {
  if (!block.blockName) return block.innerHTML;
  const dyn = renderDynamic(block, ctx);
  if (dyn !== null) return dyn;
  const { html, first } = renderChildren(block, ctx);
  return applyLayout(block, html, first, ctx);
}

// ---------- document ----------

const PREVIEW_CSS = `
html{scroll-behavior:smooth}
body{-webkit-font-smoothing:antialiased}
.wp-site-blocks > *{margin-block-start:0}
img{max-width:100%;height:auto}
[data-bw-section]{position:relative;cursor:pointer;transition:box-shadow .12s}
body.bw-editing [data-bw-section]:hover{box-shadow:inset 0 0 0 2px rgba(59,130,246,.55)}
body.bw-editing [data-bw-section].bw-selected{box-shadow:inset 0 0 0 3px #3b82f6}
.wp-block-image img{display:block;width:100%}
.wp-block-media-text__media img{border-radius:inherit}
`;

const PREVIEW_SCRIPT = `
(function(){
  document.body.classList.add('bw-editing');
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if (a) {
      e.preventDefault();
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) === '/') parent.postMessage({ bw: 'navigate', href: href }, '*');
    }
    var s = e.target.closest('[data-bw-section]');
    if (s) parent.postMessage({ bw: 'select', index: Number(s.getAttribute('data-bw-section')) }, '*');
  });
  window.addEventListener('message', function(e){
    var d = e.data || {};
    if (d.bw === 'highlight') {
      document.querySelectorAll('.bw-selected').forEach(function(n){ n.classList.remove('bw-selected'); });
      var el = document.querySelector('[data-bw-section="' + d.index + '"]');
      if (el) { el.classList.add('bw-selected'); if (d.scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  });
})();`;

export interface RenderOptions {
  markSections?: boolean;
  interactive?: boolean;
}

/** Render a full HTML document for one page of the site. */
export function renderPage(site: Site, page: Page, opts: RenderOptions = {}): string {
  ensureBlocks();
  const ctx: Ctx = { site, page, css: [], n: 0, markSections: !!opts.markSections };
  const body = rawParse(templates().page)
    .filter((b: RawBlock) => b.blockName)
    .map((b: RawBlock) => renderBlock(b, ctx))
    .join('\n');
  const fonts = googleFontsUrl(site.design);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)} – ${esc(site.name)}</title>
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fonts}">` : ''}
<style id="wp-block-library">${blockLibraryCss}</style>
<style id="global-styles">${compileGlobalStyles(site.design)}</style>
<style id="core-block-supports">${ctx.css.join('\n')}</style>
<style>${PREVIEW_CSS}</style>
</head><body class="wp-site-blocks-body"><div class="wp-site-blocks">${body}</div>${opts.interactive ? `<script>${PREVIEW_SCRIPT}</script>` : ''}</body></html>`;
}
