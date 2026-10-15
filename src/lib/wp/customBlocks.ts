/**
 * Site-defined block types (`prepress/*`).
 *
 * A custom block is a *dynamic* block: its attributes live in the block
 * comment and the HTML comes from a small template, so stored markup is still
 * plain `serialize()` output and validates like any core block. The same
 * template is rendered here (preview + static publish), in the editor, and by
 * the exported theme's render.php (see wp/export.ts), so all three agree.
 *
 * Templates are untrusted (an AI writes them): sanitizeTemplate() strips
 * scripts, event handlers and javascript: URLs, and every value is escaped
 * according to its attribute type.
 */
import { createElement } from 'react';
import { getBlockType, registerBlockType, unregisterBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import type { CustomAttrDef, CustomBlockDef } from '../types';
import { ensureBlocks } from './registry';

export const CUSTOM_PREFIX = 'prepress/';
const NAME = /^prepress\/[a-z][a-z0-9-]{1,40}$/;
const ATTR = /^[a-zA-Z][a-zA-Z0-9]{0,30}$/;
/** Attribute names WordPress block supports use; a custom block can't redefine them. */
const RESERVED = new Set(['className', 'style', 'align', 'backgroundColor', 'textColor', 'gradient', 'fontSize', 'fontFamily', 'lock', 'metadata', 'anchor', 'layout', 'content']);
const CATEGORIES = new Set(['text', 'media', 'design', 'widgets', 'theme']);
const CONTROLS = new Set(['text', 'textarea', 'richtext', 'url', 'image', 'toggle', 'number', 'select']);
const MAX_TEMPLATE = 20000;

export const isCustomBlock = (name: unknown): name is string => typeof name === 'string' && name.startsWith(CUSTOM_PREFIX);
export const blockSlug = (name: string) => name.slice(CUSTOM_PREFIX.length);
export const hasContentSlot = (def: Pick<CustomBlockDef, 'template'>) => def.template.includes('{{{content}}}');

/** Block supports every custom block gets: the editor shows these panels, render applies them. */
export const CUSTOM_SUPPORTS = {
  html: false,
  anchor: true,
  className: true,
  align: ['wide', 'full'],
  color: { background: true, text: true, link: true },
  spacing: { padding: true, margin: true },
  typography: { fontSize: true },
  __experimentalBorder: { radius: true, width: true, color: true, style: true },
};

// ---------- escaping (keep in sync with phpRenderer() in export.ts) ----------

/** WordPress esc_html(): escapes & < > " ' but doesn't double-encode existing entities. */
export const escHtml = (s: unknown) =>
  String(s ?? '')
    .replace(/&(?!(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);)/g, '&amp;')
    .replace(/[<>"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]!);

const URL_PROTOCOLS = ['http', 'https', 'ftp', 'ftps', 'mailto', 'news', 'irc', 'irc6', 'ircs', 'gopher', 'nntp', 'feed', 'telnet', 'mms', 'rtsp', 'sms', 'svn', 'tel', 'fax', 'xmpp', 'webcal', 'urn'];
const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i;

/**
 * URL attribute values. Mirrors prepress_esc_url() in the exported theme:
 * data:image URIs (placeholders) pass as escaped attributes, anything else goes
 * through WordPress esc_url() rules (allowed protocols, http:// for bare hosts).
 */
export function safeUrl(u: unknown): string {
  let url = String(u ?? '').trim();
  if (!url) return '';
  if (DATA_IMAGE.test(url)) return escHtml(url);
  url = url.replace(/ /g, '%20').replace(/[^a-z0-9\-~+_.?#=!&;,/:%@$|*'()[\]\x80-￿]/gi, '');
  if (!url) return '';
  if (!url.includes(':') && !['/', '#', '?'].includes(url[0]) && !/^[a-z0-9-]+?\.php/i.test(url)) url = 'http://' + url;
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && !URL_PROTOCOLS.includes(scheme)) return '';
  return url.replace(/&(?!#038;)(amp;)?/g, '&#038;').replace(/'/g, '&#039;');
}

const INLINE_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'a', 'br', 'span', 'code', 'mark', 'sub', 'sup', 'small']);

/** Rich text: keep simple inline formatting, drop everything else (a small wp_kses_post). */
export function safeRichText(html: unknown): string {
  return String(html ?? '')
    .replace(/<(script|style|iframe|object|embed|template)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?([a-zA-Z][\w-]*)([^>]*)>/g, (m, tag: string, rest: string) => {
      const t = tag.toLowerCase();
      if (!INLINE_TAGS.has(t)) return '';
      if (m.startsWith('</')) return `</${t}>`;
      if (t === 'a') {
        const href = rest.match(/\shref\s*=\s*("([^"]*)"|'([^']*)')/i);
        const url = href ? safeUrl((href[2] ?? href[3] ?? '').replace(/&amp;/g, '&')) : '';
        return url ? `<a href="${url}">` : '<a>';
      }
      return t === 'br' ? '<br>' : `<${t}>`;
    });
}

export function formatValue(def: CustomAttrDef | undefined, v: unknown): string {
  if (v === undefined || v === null) return '';
  const control = def?.control;
  if (control === 'url' || control === 'image') return safeUrl(v);
  if (control === 'richtext') return safeRichText(v);
  if (def?.type === 'boolean') return v ? 'true' : '';
  if (def?.type === 'number') return Number.isFinite(Number(v)) ? String(Number(v)) : '';
  return escHtml(v);
}

const truthy = (v: unknown) => !(v === undefined || v === null || v === false || v === '' || v === 0);

/** Render a template with attribute values and (already rendered) inner block content. */
export function fillTemplate(def: Pick<CustomBlockDef, 'template' | 'attributes'>, attrs: Record<string, unknown>, content = ''): string {
  const values = { ...defaults(def), ...attrs };
  let out = def.template;
  // Sections, innermost first so they can nest.
  const section = /\{\{([#^])([a-zA-Z][a-zA-Z0-9]*)\}\}((?:(?!\{\{[#^])[\s\S])*?)\{\{\/\2\}\}/;
  for (let guard = 0; guard < 200 && section.test(out); guard++) {
    out = out.replace(section, (_m, kind: string, key: string, body: string) => (truthy(values[key]) === (kind === '#') ? body : ''));
  }
  out = out.replace(/\{\{\{content\}\}\}/g, () => content);
  return out.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g, (_m, key: string) => formatValue(def.attributes[key], values[key]));
}

export function defaults(def: Pick<CustomBlockDef, 'attributes'>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, a] of Object.entries(def.attributes ?? {})) if (a.default !== undefined) out[k] = a.default;
  return out;
}

/** Strip anything executable from an untrusted template. */
export function sanitizeTemplate(html: string): string {
  return String(html ?? '')
    .slice(0, MAX_TEMPLATE)
    .replace(/<(script|style|iframe|object|embed|frame|frameset|applet|base|meta|link|form)\b[\s\S]*?(<\/\1\s*>|$)/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|frame|frameset|applet|base|meta|link|form)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+srcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(javascript|vbscript|data:text\/html)[^"'>\s]*\2/gi, '$1=$2#$2')
    .replace(/\{\{\{(?!content\}\}\})[^}]*\}\}\}/g, '');
}

/** CSS can't break out of its <style> element or pull remote code. */
export function sanitizeCss(css: string | undefined): string {
  return String(css ?? '')
    .slice(0, MAX_TEMPLATE)
    .replace(/<[^>]*>?/g, '')
    .replace(/@import[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '(')
    .replace(/url\(\s*(['"]?)\s*javascript:[^)]*\)/gi, 'url()');
}

/**
 * Validate and clean a block definition coming from an AI or the user.
 * Returns the cleaned definition, or throws with a message an AI can act on.
 */
export function cleanBlockDef(input: any): CustomBlockDef {
  if (!input || typeof input !== 'object') throw new Error('Block definition must be an object');
  const name = String(input.name ?? '').includes('/') ? String(input.name) : `${CUSTOM_PREFIX}${input.name ?? ''}`;
  if (!NAME.test(name)) throw new Error(`Block name must look like "prepress/my-block" (lowercase, digits, dashes). Got "${input.name}".`);
  const attributes: Record<string, CustomAttrDef> = {};
  for (const [key, raw] of Object.entries<any>(input.attributes ?? {})) {
    if (!ATTR.test(key) || RESERVED.has(key)) throw new Error(`Attribute "${key}" is not allowed (use camelCase letters/digits; reserved: ${[...RESERVED].join(', ')})`);
    const type = ['string', 'number', 'boolean'].includes(raw?.type) ? raw.type : 'string';
    const control = CONTROLS.has(raw?.control) ? raw.control : type === 'boolean' ? 'toggle' : type === 'number' ? 'number' : 'text';
    const a: CustomAttrDef = { type, control };
    if (raw?.label) a.label = String(raw.label).slice(0, 80);
    if (raw?.default !== undefined) a.default = type === 'number' ? Number(raw.default) : type === 'boolean' ? !!raw.default : String(raw.default);
    if (control === 'select') a.options = (Array.isArray(raw?.options) ? raw.options : []).map(String).slice(0, 50);
    attributes[key] = a;
  }
  const template = sanitizeTemplate(String(input.template ?? ''));
  if (!template.trim()) throw new Error('Block template is empty');
  const stack: string[] = [];
  for (const m of template.replace(/\{\{\{content\}\}\}/g, '').matchAll(/\{\{([#^/]?)([a-zA-Z][a-zA-Z0-9]*)\}\}/g)) {
    const [, kind, key] = m;
    if (!attributes[key]) throw new Error(`Template uses {{${kind}${key}}} but there is no attribute "${key}"`);
    if (kind === '#' || kind === '^') stack.push(key);
    else if (kind === '/' && stack.pop() !== key) throw new Error(`Template section {{/${key}}} doesn't close the section that is open`);
  }
  if (stack.length) throw new Error(`Template section {{#${stack[stack.length - 1]}}} is never closed`);
  const def: CustomBlockDef = {
    name,
    title: String(input.title || blockSlug(name)).slice(0, 80),
    category: CATEGORIES.has(input.category) ? input.category : 'design',
    attributes,
    template,
  };
  if (input.description) def.description = String(input.description).slice(0, 300);
  if (input.icon) def.icon = String(input.icon).replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (input.css) def.css = sanitizeCss(input.css);
  if (hasContentSlot(def) && input.innerBlocks && typeof input.innerBlocks === 'object') {
    def.innerBlocks = {};
    if (Array.isArray(input.innerBlocks.allowed)) def.innerBlocks.allowed = input.innerBlocks.allowed.map(String);
    if (Array.isArray(input.innerBlocks.template)) def.innerBlocks.template = input.innerBlocks.template;
  }
  return def;
}

// ---------- registration ----------

/** block.json-shaped attributes (what WordPress and @wordpress/blocks expect). */
export function blockJsonAttributes(def: CustomBlockDef) {
  const out: Record<string, { type: string; default?: unknown }> = {};
  for (const [k, a] of Object.entries(def.attributes)) out[k] = a.default !== undefined ? { type: a.type, default: a.default } : { type: a.type };
  return out;
}

export type EditFactory = (def: CustomBlockDef) => (props: any) => any;

const registered = new Map<string, string>();
let editFactory: EditFactory | null = null;

/** Called once by the browser editor to supply the editing UI. */
export function setCustomBlockEdit(factory: EditFactory) {
  editFactory = factory;
  for (const name of [...registered.keys()]) registered.set(name, '');
}

/**
 * Make @wordpress/blocks know exactly the given custom blocks (adds, updates,
 * removes), so parse/serialize/validate and the editor work with them.
 */
export function registerCustomBlocks(defs: CustomBlockDef[]) {
  ensureBlocks();
  const wanted = new Map(defs.map((d) => [d.name, d]));
  for (const name of [...registered.keys()]) {
    if (!wanted.has(name)) {
      if (getBlockType(name)) unregisterBlockType(name);
      registered.delete(name);
    }
  }
  for (const def of defs) {
    const sig = JSON.stringify(def) + (editFactory ? ':edit' : '');
    if (registered.get(def.name) === sig) continue;
    if (getBlockType(def.name)) unregisterBlockType(def.name);
    const content = hasContentSlot(def);
    registerBlockType(def.name, {
      apiVersion: 3,
      title: def.title,
      description: def.description,
      category: def.category,
      icon: def.icon || 'block-default',
      attributes: blockJsonAttributes(def),
      supports: CUSTOM_SUPPORTS,
      edit: editFactory ? editFactory(def) : () => null,
      save: content ? () => createElement(InnerBlocks.Content) : () => null,
    } as any);
    registered.set(def.name, sig);
  }
}

export function customBlockDefs(): string[] {
  return [...registered.keys()];
}
