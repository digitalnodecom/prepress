/**
 * Block styles (WordPress "block style variations"): named looks for a block,
 * stored on the block as `className: "is-style-<name>"`, picked or removed in the
 * block's Styles panel. Defined per site in `site.blockStyles`.
 *
 * One definition feeds every place the look shows up:
 *  - compileBlockStyles() → the preview/publish and editor-canvas CSS
 *  - registerBlockStyles() → the editor's Styles picker
 *  - blockStylesPhp()      → register_block_style() in the exported theme
 *    (style_data = the theme.json part, editable in Global Styles; inline_style = the CSS part)
 */
import { registerBlockStyle, store as blocksStore, unregisterBlockStyle } from '@wordpress/blocks';
import { select } from '@wordpress/data';
import type { BlockStyleDef } from '../types';
import { decls } from './design';
import { nestCss, styleSelector } from './css';
import { sanitizeCss } from './customBlocks';
import { comment } from './wpBlocks';

const NAME = /^[a-z][a-z0-9-]{1,48}$/;
const TYPE = /^(core|prepress)\/[a-z][a-z0-9-]*$/;
const STYLE_KEYS = new Set(['color', 'typography', 'spacing', 'border', 'shadow', 'dimensions']);
const MAX_CSS = 20000;

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Validate a block style from an AI, the user or the library. Throws with an actionable message. */
export function cleanBlockStyle(input: any): BlockStyleDef {
  if (!isObj(input)) throw new Error('Block style must be an object: { name, label, blockTypes, styles?, css? }');
  const name = String(input.name ?? '').replace(/^is-style-/, '');
  if (!NAME.test(name)) throw new Error(`Block style name must be lowercase letters, digits and dashes, e.g. "paper-plate". Got "${input.name}".`);
  if (['default', 'outline', 'fill', 'rounded', 'wide', 'dots', 'stripes', 'plain', 'squared', 'large'].includes(name)) throw new Error(`"${name}" is a WordPress built-in style name; pick another`);
  const blockTypes = (Array.isArray(input.blockTypes) ? input.blockTypes : [input.blockTypes]).map(String).filter((t: string) => TYPE.test(t)).slice(0, 12);
  if (!blockTypes.length) throw new Error('blockTypes must list at least one block, e.g. ["core/image"]');
  const def: BlockStyleDef = { name, label: String(input.label || name).replace(/\s+/g, ' ').trim().slice(0, 60), blockTypes: [...new Set<string>(blockTypes)] };
  if (isObj(input.styles)) {
    const styles: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input.styles)) if (STYLE_KEYS.has(k)) styles[k] = v;
    const json = JSON.stringify(styles);
    if (/<\/?style|<script/i.test(json) || json.length > MAX_CSS) throw new Error('Block style "styles" may not contain HTML and must be under 20 KB');
    if (Object.keys(styles).length) def.styles = styles;
  }
  if (input.css) def.css = sanitizeCss(String(input.css).slice(0, MAX_CSS));
  return def;
}

/** CSS for every block style, for the preview and the editor canvas. */
export function compileBlockStyles(defs: BlockStyleDef[] | undefined): string {
  const out: string[] = [];
  for (const def of defs ?? []) {
    for (const type of def.blockTypes) {
      const sel = styleSelector(def.name, type);
      const d = decls(def.styles);
      // style_data: WordPress wraps it in :root :where(), so it never outranks the block's own settings.
      if (d) out.push(`:root :where(${sel}){${d}}`);
      const css = nestCss(def.css, sel);
      if (css) out.push(css);
    }
  }
  return out.join('\n');
}

/** Block styles a piece of markup uses (they travel with a pattern). */
export function blockStylesUsedIn(markup: string, defs: BlockStyleDef[] | undefined): BlockStyleDef[] {
  return (defs ?? []).filter((d) => new RegExp(`(^|[\\s"])is-style-${d.name}([\\s"]|$)`).test(markup));
}

export function upsertBlockStyles(list: BlockStyleDef[] | undefined, add: BlockStyleDef[]): BlockStyleDef[] {
  const names = new Set(add.map((d) => d.name));
  return [...(list ?? []).filter((d) => !names.has(d.name)), ...add];
}

// ---------- editor registration ----------

const registered = new Map<string, string>(); // `${type}|${name}` → label

/** Make the editor's Styles panel offer exactly these block styles (adds, updates, removes). */
export function registerBlockStyles(defs: BlockStyleDef[] | undefined) {
  const wanted = new Map<string, string>();
  for (const d of defs ?? []) for (const t of d.blockTypes) wanted.set(`${t}|${d.name}`, d.label);
  for (const [key, label] of registered) {
    if (wanted.get(key) === label) continue;
    const [type, name] = key.split('|');
    unregisterBlockStyle(type, name);
    registered.delete(key);
  }
  for (const [key, label] of wanted) {
    if (registered.has(key)) continue;
    const [type, name] = key.split('|');
    if (((select(blocksStore) as any).getBlockStyles(type) ?? []).some((s: any) => s.name === name)) unregisterBlockStyle(type, name);
    registerBlockStyle(type, { name, label });
    registered.set(key, label);
  }
}

// ---------- export ----------

const php = (s: string) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function phpValue(v: unknown, indent: string): string {
  if (Array.isArray(v)) return `array( ${v.map((x) => phpValue(x, indent)).join(', ')} )`;
  if (isObj(v)) return `array(\n${Object.entries(v).map(([k, x]) => `${indent}\t${php(k)} => ${phpValue(x, indent + '\t')},`).join('\n')}\n${indent})`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return php(String(v ?? ''));
}

/**
 * inc/block-styles.php: register_block_style() for each style. The CSS is the
 * same flattened CSS the preview uses, so WordPress and Prepress look the same.
 */
export function blockStylesPhp(defs: BlockStyleDef[], fn: string): string {
  const calls = defs.map((d) => {
    const css = d.blockTypes.map((t) => nestCss(d.css, styleSelector(d.name, t))).filter(Boolean).join('\n');
    const args = [
      `\t\t\t'name'  => ${php(d.name)},`,
      `\t\t\t'label' => ${php(d.label)},`,
      ...(d.styles ? [`\t\t\t'style_data' => ${phpValue(d.styles, '\t\t\t')},`] : []),
      ...(css ? [`\t\t\t'inline_style' => ${php(css)},`] : []),
    ];
    return `\t// ${comment(d.label)}\n\tregister_block_style(\n\t\t${phpValue(d.blockTypes, '\t\t')},\n\t\tarray(\n${args.join('\n')}\n\t\t)\n\t);`;
  });
  return `<?php
/**
 * Block styles made in Prepress: pick them in a block's Styles panel.
 * style_data is editable in Appearance → Editor → Styles → Blocks.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function ${fn}_block_styles() {
${calls.join('\n\n')}
}
add_action( 'init', '${fn}_block_styles' );
`;
}
