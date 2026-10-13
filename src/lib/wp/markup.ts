/**
 * BlockNode trees ⇄ serialized block markup, plus validation.
 */
import { createBlock, parse, serialize, getBlockType } from '@wordpress/blocks';
import type { BlockNode } from '../types';
import { ensureBlocks } from './registry';

type WPBlock = ReturnType<typeof createBlock>;

function toWP(node: BlockNode): WPBlock {
  return createBlock(node.name, node.attributes ?? {}, (node.innerBlocks ?? []).map(toWP));
}

/** Serialize already-normalized nodes to post_content markup. */
export function toMarkup(nodes: BlockNode[]): string {
  ensureBlocks();
  return serialize(nodes.map(toWP));
}

function plain(v: unknown): unknown {
  if (v && typeof v === 'object' && typeof (v as any).toHTMLString === 'function') return (v as any).toHTMLString();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

function fromWP(block: any, compact: boolean): BlockNode {
  const defs = (getBlockType(block.name) as any)?.attributes ?? {};
  const attributes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(block.attributes ?? {})) {
    const p = plain(v);
    if (compact) {
      if (p === undefined || p === '' || k === 'lock') continue;
      if (defs[k] && 'default' in defs[k] && JSON.stringify(defs[k].default) === JSON.stringify(p)) continue;
      if (typeof p === 'string' && p.startsWith('data:image/')) {
        // Keep AI context small: placeholders are regenerated from alt text.
        continue;
      }
    }
    attributes[k] = p;
  }
  return { name: block.name, attributes, innerBlocks: (block.innerBlocks ?? []).map((b: any) => fromWP(b, compact)) };
}

/** Parse markup into BlockNodes. `compact` strips defaults and data URIs (for AI context). */
export function markupToNodes(markup: string, compact = false): BlockNode[] {
  ensureBlocks();
  return parse(markup).filter((b: any) => b.name).map((b: any) => fromWP(b, compact));
}

/** Top-level blocks of a page = editable sections. Returns each section's own markup. */
export function splitSections(markup: string): string[] {
  ensureBlocks();
  return parse(markup)
    .filter((b: any) => b.name)
    .map((b: any) => serialize([b]));
}

export function joinSections(sections: string[]): string {
  return sections.filter((s) => s.trim()).join('\n\n');
}

export interface ValidationResult {
  blocks: number;
  invalid: { name: string; issue: string }[];
  byName: Record<string, number>;
}

/**
 * Parse the markup the way the WordPress editor does and report any block whose
 * saved HTML would trigger "This block contains unexpected or invalid content".
 */
export function validateMarkup(markup: string): ValidationResult {
  ensureBlocks();
  const result: ValidationResult = { blocks: 0, invalid: [], byName: {} };
  const walk = (list: any[]) => {
    for (const b of list) {
      if (!b.name) continue;
      result.blocks++;
      result.byName[b.name] = (result.byName[b.name] ?? 0) + 1;
      if (b.isValid === false) {
        const issue = (b.validationIssues ?? []).map((i: any) => (i.args ? i.args.join(' ') : String(i))).join('; ');
        result.invalid.push({ name: b.name, issue: issue.slice(0, 400) });
      }
      walk(b.innerBlocks ?? []);
    }
  };
  walk(parse(markup));
  return result;
}
