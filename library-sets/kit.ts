/**
 * Shared building kit for library sets (library-sets/<set>/). Every set builds
 * its sections from these helpers, so all sets share one shape:
 *
 *   style   → design tokens + theme.json patch + block styles (is-style-<set>-*)
 *   blocks  → prepress/<set>-* (only art, interactive or effect wrappers)
 *   patterns→ one section each, with a role
 *   template→ pages as ordered lists of pattern keys
 *
 * Rules: docs/THEME-SYSTEM.md. Checked by lintSet() (src/lib/setLint.ts).
 */
import type { BlockNode, BlockStyleDef, PatternRole } from '../src/lib/types';

export const SP = (n: number | string) => `var:preset|spacing|${n}`;

export const b = (name: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []): BlockNode => ({ name, attributes, ...(innerBlocks.length ? { innerBlocks } : {}) });
export const p = (content: string, attributes: Record<string, unknown> = {}) => b('core/paragraph', { content, ...attributes });
export const h = (content: string, level: number, attributes: Record<string, unknown> = {}) => b('core/heading', { content, level, ...attributes });
export const img = (url: string, alt: string, attributes: Record<string, unknown> = {}) => b('core/image', { url, alt, ...attributes });
export const group = (attributes: Record<string, unknown>, children: BlockNode[]) => b('core/group', { layout: { type: 'default' }, ...attributes }, children);
export const row = (attributes: Record<string, unknown>, children: BlockNode[]) => b('core/group', { ...attributes, layout: { type: 'flex', flexWrap: 'nowrap', ...((attributes.layout as object) ?? {}) } }, children);
export const button = (text: string, url: string, attributes: Record<string, unknown> = {}) => b('core/button', { text, url, ...attributes });
export const buttons = (list: BlockNode[], attributes: Record<string, unknown> = {}) => b('core/buttons', attributes, list);
export const details = (summary: string, paras: string[], attributes: Record<string, unknown> = {}) => b('core/details', { summary, ...attributes }, paras.map((t) => p(t)));

/** Columns; widths like '40%' (empty = auto). */
export const cols = (widths: string[], children: BlockNode[][], attributes: Record<string, unknown> = {}) =>
  b('core/columns', { align: 'wide', ...attributes }, children.map((c, i) => b('core/column', widths[i] ? { width: widths[i] } : {}, c)));

/** `className` for a block style: is('hut-sheet') → "is-style-hut-sheet". One per block (WordPress picks one style). */
export const is = (style: string) => `is-style-${style}`;

/**
 * A full-width section: one top-level group with a name (the List view and the
 * section tools use it), a ground colour pair, preset padding (≤ spacing|80).
 */
export function section(
  name: string,
  ground: { bg: string; text: string },
  children: BlockNode[],
  o: { top?: number; bottom?: number; side?: number | 0; gap?: number; anchor?: string; style?: string; flow?: boolean } = {},
): BlockNode {
  const pad = (n: number | undefined, d: number) => (n === 0 ? '0' : SP(n ?? d));
  return b(
    'core/group',
    {
      metadata: { name },
      ...(o.anchor ? { anchor: o.anchor } : {}),
      ...(o.style ? { className: is(o.style) } : {}),
      align: 'full',
      backgroundColor: ground.bg,
      textColor: ground.text,
      style: { spacing: { padding: { top: pad(o.top, 80), bottom: pad(o.bottom, 80), left: pad(o.side, 50), right: pad(o.side, 50) }, margin: { top: '0', bottom: '0' }, blockGap: o.gap === 0 ? '0' : SP(o.gap ?? 50) } },
      layout: { type: o.flow ? 'default' : 'constrained' },
    },
    children,
  );
}

/** A block style definition. `name` is prefixed with the set key: blockStyle('hut', 'sheet', …) → "hut-sheet". */
export function blockStyle(set: string, slug: string, label: string, blockTypes: string[], o: { styles?: Record<string, unknown>; css?: string } = {}): BlockStyleDef {
  return { name: `${set}-${slug}`, label, blockTypes, ...(o.styles ? { styles: o.styles } : {}), ...(o.css ? { css: o.css } : {}) };
}

/** CSS custom property for a palette colour / font / radius token. */
export const color = (slug: string) => `var(--wp--preset--color--${slug})`;
export const font = (slug: 'heading' | 'body' | 'mono') => `var(--wp--preset--font-family--${slug})`;
export const radius = (size: 'sm' | 'md' | 'lg' | 'pill') => `var(--wp--custom--radius--${size})`;
export const fontSize = (slug: string) => `var(--wp--preset--font-size--${slug})`;
export const space = (n: number | string) => `var(--wp--preset--spacing--${n})`;

export interface SetPattern {
  key: string;
  title: string;
  description: string;
  tags: string[];
  /** What the section is for; maps to WordPress pattern categories on export. */
  role: PatternRole;
  sections: BlockNode[];
}

export type PageSpec = { title: string; slug: string; sections: (string | BlockNode)[] };
