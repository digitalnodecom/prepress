/**
 * Theme-system lint (docs/THEME-SYSTEM.md). lintSet() is strict and runs in the
 * tests for every official library set; lintSite() is the lenient subset the
 * MCP `validate_site` tool reports as warnings for AI-made sites.
 *
 * What it checks:
 *  - blocks carry no className except a registered `is-style-*` (block styles)
 *  - CSS uses tokens: no raw colours (except in masks), no raw font families,
 *    radii from var(--wp--custom--radius--*) (or 0 / 50% / an always-pill 999px)
 *  - `!important` only on layout properties that fight WordPress layout CSS
 *  - each CSS layer stays in its lane (block-style and custom-block CSS live with
 *    them; only site CSS keys on template wrappers like .entry-content; block CSS is scoped)
 *  - per-block theme.json `css` is in the subset WordPress can process
 *  - custom blocks say why they exist (`kind`), effect wrappers hold their text as inner blocks
 *  - patterns: one full-width named section each, a role, preset padding ≤ 80
 *  - templates: a page starts with a hero/page-title, one hero per page, neighbours differ in ground
 */
import type { BlockNode, BlockStyleDef, CustomBlockDef, Site } from './types';
import type { LibrarySetDef } from './librarySets';
import { isWpBlockCss, splitSelectors } from './wp/css';
const hasContentSlot = (d: { template: string }) => d.template.includes('{{{content}}}');

/** WordPress's own block styles, always allowed. */
const BUILTIN_STYLES: Record<string, string[]> = {
  'core/button': ['outline', 'fill'],
  'core/separator': ['wide', 'dots', 'default'],
  'core/image': ['rounded', 'default'],
  'core/quote': ['plain', 'default'],
  'core/table': ['stripes', 'regular'],
  'core/site-logo': ['rounded', 'default'],
};

const IMPORTANT_OK = /^(margin|padding|max-width|min-width|width|flex|gap|row-gap|column-gap|display|grid|order|align-self|justify-self|align-items|justify-content|position|top|inset)/;
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;
// A token times a factor (calc(var(--wp--custom--radius--lg)*1.67)) still follows the Design's corners.
// Percentages describe a shape (circles, ellipses, a drawn device's bezel), not the Design's corners.
const RADIUS_OK = /^(0|0px|\d+(\.\d+)?%|999px|9999px|100vmax|inherit|initial|unset|var\(--wp--custom--radius--(sm|md|lg|pill)\)|calc\(var\(--wp--custom--radius--(sm|md|lg)\)\*[\d.]+\))$/;

interface Rule {
  selector: string; // '' for declarations at top level of a nested css string
  decls: string;
  at: string[];
}

function rules(css: string): Rule[] {
  const out: Rule[] = [];
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const walk = (text: string, at: string[], parent: string) => {
    let i = 0;
    let buf = '';
    while (i < text.length) {
      const c = text[i];
      if (c === '{') {
        const cut = buf.lastIndexOf(';');
        const decl = cut >= 0 ? buf.slice(0, cut + 1) : '';
        if (decl.trim()) out.push({ selector: parent, decls: decl, at });
        const prelude = (cut >= 0 ? buf.slice(cut + 1) : buf).trim();
        buf = '';
        let depth = 1;
        let j = i + 1;
        for (; j < text.length && depth; j++) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') depth--;
        }
        const body = text.slice(i + 1, j - 1);
        if (/^@(keyframes|font-face)/i.test(prelude)) {
          /* keyframe bodies are not rules */
        } else if (prelude.startsWith('@')) walk(body, [...at, prelude], parent);
        else walk(body, at, parent ? `${parent} ${prelude}` : prelude);
        i = j;
        continue;
      }
      buf += c;
      i++;
    }
    if (buf.trim()) out.push({ selector: parent, decls: buf, at });
  };
  walk(src, [], '');
  return out.filter((r) => r.decls.replace(/[\s;]/g, ''));
}

function declList(decls: string): [string, string][] {
  return decls
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const k = d.indexOf(':');
      return [d.slice(0, k).trim().toLowerCase(), d.slice(k + 1).trim()] as [string, string];
    })
    .filter(([k]) => k);
}

/** Token rules for one CSS string. */
/** The part of a selector that is styled: :not(…) arguments name what is *excluded*. */
const targets = (sel: string) => sel.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '');

function lintCss(css: string | undefined, where: string, o: { layer: 2 | 3 | 4 | 5; scope?: RegExp; styleNames?: string[] } = { layer: 4 }): string[] {
  if (!css?.trim()) return [];
  const out: string[] = [];
  for (const r of rules(css)) {
    const sel = r.selector;
    if (o.layer !== 5 && /\.entry-content|\.wp-site-blocks/.test(sel)) out.push(`${where}: "${sel}" keys on a template wrapper (the editor canvas has none); only site CSS may`);
    if (o.layer === 5 && (o.styleNames ?? []).some((n) => targets(sel).includes(`.is-style-${n}`))) out.push(`${where}: "${sel}" styles a block style from site CSS; put it in that block style's css`);
    if (o.layer === 5 && /\.wp-block-prepress-/.test(targets(sel))) out.push(`${where}: "${sel}" styles a custom block from site CSS; put it in the block's css`);
    if (o.scope && sel && !splitSelectors(sel).every((s) => o.scope!.test(s))) out.push(`${where}: selector "${sel}" isn't scoped to the block`);
    for (const [prop, value] of declList(r.decls)) {
      if (prop.startsWith('--')) continue; // custom properties are local tokens
      if (COLOR_LITERAL.test(value) && !/mask/.test(prop)) out.push(`${where}: raw colour in "${prop}: ${value}" — use var(--wp--preset--color--*) (or color-mix with one)`);
      if (prop === 'font-family' && !/^(var\(--wp--preset--font-family--[a-z-]+(,[^)]*)?\)|inherit|initial)(\s*!important)?$/.test(value)) out.push(`${where}: raw font family "${value}" — use var(--wp--preset--font-family--heading|body|mono)`);
      if (/^border(-[a-z]+)*-radius$/.test(prop)) {
        const parts = value.replace(/!important/, '').split(/\s+|\//).filter(Boolean);
        if (!parts.every((x) => RADIUS_OK.test(x))) out.push(`${where}: radius "${value}" — use var(--wp--custom--radius--sm|md|lg|pill), 0 or 50%`);
      }
      const killSwitch = r.at.some((a) => /prefers-reduced-motion/.test(a)) && /^(animation|transition|scroll-behavior)/.test(prop);
      if (/!important/.test(value) && !IMPORTANT_OK.test(prop) && !killSwitch) out.push(`${where}: !important on "${prop}" — only layout properties may fight WordPress layout CSS`);
    }
  }
  return out;
}

function walk(nodes: BlockNode[] | undefined, fn: (n: BlockNode) => void) {
  for (const n of nodes ?? []) {
    fn(n);
    walk(n.innerBlocks, fn);
  }
}

/** className rule: only registered block styles (or WordPress's own). */
function lintClasses(nodes: BlockNode[], styles: BlockStyleDef[], where: string): string[] {
  const out: string[] = [];
  walk(nodes, (n) => {
    const cls = n.attributes?.className;
    if (typeof cls !== 'string' || !cls.trim()) return;
    const list = cls.trim().split(/\s+/);
    if (list.length > 1) out.push(`${where}: ${n.name} has several classes "${cls}" — a block takes one block style`);
    for (const c of list) {
      const m = c.match(/^is-style-(.+)$/);
      if (!m) {
        out.push(`${where}: ${n.name} has className "${c}" — define a block style and use is-style-*`);
        continue;
      }
      const def = styles.find((s) => s.name === m[1]);
      if (def) {
        if (!def.blockTypes.includes(n.name)) out.push(`${where}: block style "${m[1]}" isn't registered for ${n.name}`);
      } else if (!(BUILTIN_STYLES[n.name] ?? []).includes(m[1])) out.push(`${where}: unknown block style "${c}" on ${n.name}`);
    }
  });
  return out;
}

const PAD = /^(0|var:preset\|spacing\|(20|30|40|50|60|70|80))$/;

function lintSection(node: BlockNode, where: string): string[] {
  const out: string[] = [];
  const a = node.attributes ?? {};
  if (!['core/group', 'core/cover'].includes(node.name)) out.push(`${where}: a section is a full-width core/group or core/cover, not ${node.name}`);
  if (a.align !== 'full') out.push(`${where}: section isn't align:full`);
  if (!(a.metadata as any)?.name) out.push(`${where}: section has no metadata.name`);
  const pad = (a.style as any)?.spacing?.padding ?? {};
  for (const [side, v] of Object.entries(pad)) if (!PAD.test(String(v))) out.push(`${where}: padding-${side} "${v}" — use spacing presets 20–80`);
  return out;
}

const STRONG = new Set(['contrast', 'primary', 'accent']);
const ground = (n: BlockNode) => (n.name === 'core/cover' ? `cover:${n.attributes?.url ?? n.attributes?.overlayColor ?? ''}` : String(n.attributes?.backgroundColor ?? 'base'));

export function lintSet(set: LibrarySetDef): string[] {
  const out: string[] = [];
  const styles = set.blockStyles ?? [];
  const tj = set.style.themeJson as any;
  const prefix = new RegExp(`\\.(wp-block-prepress-${set.key}-|${set.prefix}-)`);

  // CSS layers
  out.push(...lintCss(tj?.styles?.css, 'site CSS', { layer: 5, styleNames: styles.map((d) => d.name) }));
  for (const [name, s] of Object.entries<any>(tj?.styles?.blocks ?? {})) {
    if (!s?.css) continue;
    if (!isWpBlockCss(s.css)) out.push(`styles.blocks["${name}"].css: WordPress only processes declarations and one level of "& sel {…}" here (no @media) — use a block style`);
    out.push(...lintCss(s.css, `styles.blocks["${name}"].css`, { layer: 2 }));
  }
  for (const s of styles) {
    if (!s.name.startsWith(`${set.key}-`)) out.push(`block style "${s.name}": name it ${set.key}-<slug>`);
    out.push(...lintCss(s.css, `block style ${s.name}`, { layer: 3 }));
  }
  for (const def of set.blocks) {
    const slug = def.name.split('/')[1];
    if (!slug.startsWith(`${set.key}-`)) out.push(`${def.name}: name it prepress/${set.key}-<slug>`);
    if (!def.kind) out.push(`${def.name}: no kind — a custom block is art, interactive or an effect wrapper; anything else is core blocks + a block style`);
    if (def.kind === 'effect' && !hasContentSlot(def)) out.push(`${def.name}: an effect wrapper keeps its text as inner blocks ({{{content}}})`);
    out.push(...lintCss(def.css, def.name, { layer: 4, scope: prefix }));
  }

  // Blocks and classes
  const all: [string, BlockNode[]][] = [
    ['header', set.header],
    ['footer', set.footer],
    ...set.patterns.map((p) => [`pattern ${p.key}`, p.sections] as [string, BlockNode[]]),
    ...(set.showcase ? [['showcase', set.showcase] as [string, BlockNode[]]] : []),
  ];
  for (const [where, nodes] of all) out.push(...lintClasses(nodes, styles, where));

  // Patterns
  const roles = new Map(set.patterns.map((p) => [p.key, p.role]));
  for (const p of set.patterns) {
    if (!p.role) out.push(`pattern ${p.key}: no role`);
    if (p.sections.length !== 1) out.push(`pattern ${p.key}: one pattern is one section (has ${p.sections.length})`);
    for (const s of p.sections) out.push(...lintSection(s, `pattern ${p.key}`));
  }

  // Templates
  for (const page of set.template.pages) {
    const keys = page.sections.map((s) => (typeof s === 'string' ? s : null));
    const first = keys[0] ? roles.get(keys[0]) : 'page-title'; // an inline first section is the page's own title
    if (keys.length && !['hero', 'page-title', 'article'].includes(first ?? '')) out.push(`template page ${page.slug}: starts with ${first ?? 'an inline section'}, not a hero, page-title or article`);
    if (keys.filter((k) => k && roles.get(k) === 'hero').length > 1) out.push(`template page ${page.slug}: more than one hero`);
    const nodes = page.sections.map((s) => (typeof s === 'string' ? set.patterns.find((p) => p.key === s)?.sections[0] : s)).filter(Boolean) as BlockNode[];
    for (let i = 1; i < nodes.length; i++) {
      if (STRONG.has(ground(nodes[i])) && ground(nodes[i]) === ground(nodes[i - 1])) {
        // Two strong bands in a row read as one block of colour; quiet grounds (base, muted…) may repeat.
        out.push(`template page ${page.slug}: "${keys[i - 1]}" and "${keys[i]}" sit on the same ground (${ground(nodes[i])})`);
      }
    }
  }
  return out;
}

/** The lenient subset for any site (MCP validate_site warnings). */
export function lintSite(site: Site, nodesOf: (markup: string) => BlockNode[]): string[] {
  const out: string[] = [];
  const styles = site.blockStyles ?? [];
  const tj = site.themeJson as any;
  out.push(...lintCss(tj?.styles?.css, 'site CSS', { layer: 5, styleNames: styles.map((d) => d.name) }));
  for (const s of styles) out.push(...lintCss(s.css, `block style ${s.name}`, { layer: 3 }));
  for (const def of (site.blocks ?? []) as CustomBlockDef[]) out.push(...lintCss(def.css, def.name, { layer: 4 }));
  const markups: [string, string][] = [...site.pages.map((p) => [`page ${p.slug}`, p.content] as [string, string]), ['header', site.header], ['footer', site.footer]];
  for (const [where, m] of markups) out.push(...lintClasses(nodesOf(m), styles, where));
  return [...new Set(out)].slice(0, 50);
}
