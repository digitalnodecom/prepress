/**
 * AI output → valid Gutenberg block tree.
 *
 * LLM output is treated as untrusted input. Every node is checked against the
 * *registered* block types (the same block.json definitions WordPress uses):
 * unknown blocks are unwrapped or dropped, unknown attributes removed, common
 * mistakes repaired (e.g. a button outside core/buttons), and image slots get
 * placeholders. Pattern calls are expanded here too.
 */
import { getBlockType } from '@wordpress/blocks';
import type { BlockNode, Design, SectionSpec } from '../types';
import { expandPattern } from './patterns';
import { placeholderImage } from './placeholders';
import { ensureBlocks } from './registry';

/** Blocks the AI may use directly. Kept intentionally small and static-only. */
export const AI_BLOCKS = [
  'core/group',
  'core/columns',
  'core/column',
  'core/heading',
  'core/paragraph',
  'core/list',
  'core/list-item',
  'core/buttons',
  'core/button',
  'core/image',
  'core/cover',
  'core/media-text',
  'core/quote',
  'core/pullquote',
  'core/separator',
  'core/spacer',
  'core/details',
  'core/table',
] as const;

/** Blocks allowed in template parts (adds dynamic site blocks). */
export const PART_BLOCKS = [...AI_BLOCKS, 'core/site-title', 'core/site-tagline', 'core/site-logo', 'core/navigation', 'core/navigation-link'];

/** Required parent → child wrapping, mirroring block.json `parent` / `allowedBlocks`. */
const WRAP_CHILD: Record<string, string> = {
  'core/buttons': 'core/button',
  'core/columns': 'core/column',
  'core/list': 'core/list-item',
};
const REQUIRES_PARENT: Record<string, string> = {
  'core/button': 'core/buttons',
  'core/column': 'core/columns',
  'core/list-item': 'core/list',
};

/** Attribute names the AI often invents → the real attribute. */
const ALIASES: Record<string, Record<string, string>> = {
  'core/paragraph': { text: 'content' },
  'core/heading': { text: 'content' },
  'core/list-item': { text: 'content' },
  'core/button': { label: 'text', href: 'url', link: 'url' },
  'core/image': { src: 'url' },
  'core/details': { title: 'summary', question: 'summary' },
  'core/quote': { cite: 'citation' },
  'core/pullquote': { cite: 'citation' },
};

/** Text-align moved from block attributes into `style.typography.textAlign` in WP 7.0. */
const TEXT_ALIGN_KEYS = ['textAlign', 'align'];

export interface NormalizeReport {
  dropped: string[];
  repaired: string[];
}

export interface NormalizeOptions {
  design: Design;
  allowed?: readonly string[];
  report?: NormalizeReport;
}

function isPatternCall(x: any): x is { pattern: string; props?: Record<string, unknown> } {
  return x && typeof x === 'object' && typeof x.pattern === 'string';
}

function clean(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      const c = clean(val);
      if (c === undefined || c === null) continue;
      if (c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length === 0) continue;
      out[k] = c;
    }
    return out;
  }
  return v;
}

function coerce(def: any, value: unknown): unknown {
  const type = def?.type;
  const types = Array.isArray(type) ? type : [type];
  if (value === undefined || value === null) return undefined;
  if (types.includes('rich-text') || types.includes('string')) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return types.includes('object') || types.includes('array') ? value : undefined;
  }
  if (types.includes('number') || types.includes('integer')) {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : undefined;
  }
  if (types.includes('boolean')) return typeof value === 'boolean' ? value : value === 'true';
  if (types.includes('array')) return Array.isArray(value) ? value : undefined;
  if (types.includes('object')) return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
  return value;
}

function normalizeAttributes(name: string, raw: Record<string, unknown> | undefined, opts: NormalizeOptions): Record<string, unknown> {
  const type = getBlockType(name) as any;
  const defs = type?.attributes ?? {};
  const attrs: Record<string, unknown> = {};
  const aliases = ALIASES[name] ?? {};
  const input: Record<string, unknown> = { ...(raw ?? {}) };

  // Text alignment: route legacy keys into style.typography.textAlign when the block
  // supports typography.textAlign rather than a textAlign attribute.
  for (const key of TEXT_ALIGN_KEYS) {
    const v = input[key];
    if (typeof v === 'string' && ['left', 'center', 'right'].includes(v) && !defs[key]) {
      if (type?.supports?.typography?.textAlign) {
        const style = (input.style as any) ?? {};
        input.style = { ...style, typography: { ...(style.typography ?? {}), textAlign: v } };
        delete input[key];
        opts.report?.repaired.push(`${name}: ${key} → style.typography.textAlign`);
      }
    }
  }

  for (const [k0, v] of Object.entries(input)) {
    const k = aliases[k0] ?? k0;
    if (!defs[k]) {
      if (k0 !== 'placeholderLabel') opts.report?.dropped.push(`${name}.${k0}`);
      continue;
    }
    const c = coerce(defs[k], v);
    if (c !== undefined) attrs[k] = c;
  }

  // Images: always resolve to a placeholder unless a usable URL was given.
  const label = String(input.placeholderLabel ?? input.alt ?? input.mediaAlt ?? 'Image');
  const usable = (u: unknown) => typeof u === 'string' && /^(data:image\/|https?:\/\/)/.test(u) && !u.includes('example.com');
  if (name === 'core/image' && !usable(attrs.url)) {
    attrs.url = placeholderImage(label, opts.design);
    attrs.alt = attrs.alt ?? label;
  }
  if (name === 'core/media-text' && !usable(attrs.mediaUrl)) {
    attrs.mediaUrl = placeholderImage(label, opts.design);
    attrs.mediaType = 'image';
    attrs.mediaAlt = attrs.mediaAlt ?? label;
  }
  if (name === 'core/cover' && attrs.url && !usable(attrs.url)) {
    attrs.url = placeholderImage(label, opts.design, 1800, 1100);
  }
  if (name === 'core/cover' && !attrs.url && !attrs.gradient && !attrs.overlayColor && !attrs.customOverlayColor) {
    attrs.gradient = 'primary-to-contrast';
    attrs.dimRatio = 100;
  }
  return clean(attrs) as Record<string, unknown>;
}

function normalizeNode(node: unknown, parent: string | null, opts: NormalizeOptions): BlockNode[] {
  if (isPatternCall(node)) {
    const expanded = expandPattern(node.pattern, (node.props ?? {}) as any, opts.design);
    if (!expanded) {
      opts.report?.dropped.push(`pattern:${node.pattern}`);
      return [];
    }
    return normalizeNode(expanded, parent, opts);
  }
  if (!node || typeof node !== 'object') {
    if (typeof node === 'string' && node.trim()) return [{ name: 'core/paragraph', attributes: { content: node } }];
    return [];
  }
  const n = node as any;
  let name: string = typeof n.name === 'string' ? n.name : typeof n.blockName === 'string' ? n.blockName : '';
  if (name && !name.includes('/')) name = 'core/' + name;
  const allowed = opts.allowed ?? AI_BLOCKS;
  const kids: unknown[] = Array.isArray(n.innerBlocks) ? n.innerBlocks : Array.isArray(n.children) ? n.children : [];

  ensureBlocks();
  if (!name || !allowed.includes(name) || !getBlockType(name)) {
    opts.report?.dropped.push(name || '(unnamed)');
    // Keep content where we can: unwrap children, or salvage text as a paragraph.
    if (kids.length) return kids.flatMap((k) => normalizeNode(k, parent, opts));
    const text = n.attributes?.content ?? n.attributes?.text;
    return typeof text === 'string' && text.trim() ? [{ name: 'core/paragraph', attributes: { content: text } }] : [];
  }

  // A child that needs a specific parent but isn't inside it: wrap it.
  const needs = REQUIRES_PARENT[name];
  if (needs && parent !== needs) {
    opts.report?.repaired.push(`wrapped ${name} in ${needs}`);
    return normalizeNode({ name: needs, attributes: {}, innerBlocks: [node] }, parent, opts);
  }

  const attributes = normalizeAttributes(name, n.attributes, opts);
  let innerBlocks = kids.flatMap((k) => normalizeNode(k, name, opts));

  // A parent whose children must be a specific type: wrap strays.
  const childType = WRAP_CHILD[name];
  if (childType) {
    const fixed: BlockNode[] = [];
    for (const c of innerBlocks) {
      if (c.name === childType) fixed.push(c);
      else if (childType === 'core/list-item' && c.name === 'core/paragraph') fixed.push({ name: childType, attributes: { content: c.attributes?.content } });
      else {
        opts.report?.repaired.push(`wrapped ${c.name} in ${childType}`);
        fixed.push({ name: childType, attributes: {}, innerBlocks: [c] });
      }
    }
    innerBlocks = fixed;
  }

  // Blocks that never have children.
  if (['core/paragraph', 'core/heading', 'core/image', 'core/separator', 'core/spacer', 'core/button', 'core/navigation-link', 'core/site-title', 'core/site-tagline'].includes(name)) {
    innerBlocks = [];
  }
  return [{ name, attributes, innerBlocks }];
}

/** Normalize a list of AI-produced sections (pattern calls or raw blocks). */
export function normalizeSections(input: unknown, opts: NormalizeOptions): BlockNode[] {
  const list: SectionSpec[] = Array.isArray(input) ? input : input ? [input as SectionSpec] : [];
  return list.flatMap((s) => normalizeNode(s, null, opts));
}

export function normalizeBlocks(input: BlockNode[], opts: NormalizeOptions): BlockNode[] {
  return input.flatMap((s) => normalizeNode(s, null, opts));
}
