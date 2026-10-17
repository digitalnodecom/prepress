/**
 * Small CSS helpers shared by the theme.json compiler and block styles:
 *
 *  - blockSelector(): the selector WordPress uses for a block type in theme.json
 *    (block.json `selectors.root`, else `.wp-block-<name>`).
 *  - styleSelector(): the same selector for one block style (`is-style-<name>`).
 *  - nestCss(): flattens CSS written with `&` (and @media/@supports around it)
 *    under a selector, the way a block style's `css` is written.
 *  - wpBlockCss(): theme.json per-block `css`, processed exactly like WordPress
 *    (WP_Theme_JSON::process_blocks_custom_css): bare declarations and one level
 *    of `& sel { … }`, all wrapped in `:root :where(…)`.
 */
import { getBlockType } from '@wordpress/blocks';

export function blockSelector(name: string): string {
  const root = (getBlockType(name) as any)?.selectors?.root;
  if (typeof root === 'string' && root) return root;
  return `.wp-block-${name.replace(/^core\//, '').replace('/', '-')}`;
}

/** `.wp-block-button .wp-block-button__link` → `.wp-block-button.is-style-pill .wp-block-button__link` */
export function styleSelector(name: string, blockType: string): string {
  return splitSelectors(blockSelector(blockType))
    .map((sel) => {
      const s = sel.trim();
      const m = s.match(/^[^\s>+~]+/);
      return m ? `${m[0]}.is-style-${name}${s.slice(m[0].length)}` : `${s}.is-style-${name}`;
    })
    .join(', ');
}

interface Node {
  prelude: string | null; // null = declarations
  text: string;
  children: Node[];
}

/** Parse into top-level items: declaration runs and `prelude { body }` blocks. */
function parse(css: string): Node[] {
  const out: Node[] = [];
  let i = 0;
  let buf = '';
  const flushDecls = () => {
    // Declarations end at `;`; anything left before a `{` belongs to the next prelude.
    const t = buf.trim();
    if (t) out.push({ prelude: null, text: t, children: [] });
    buf = '';
  };
  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      // Prelude = text since the last `;` or `}`.
      const cut = buf.lastIndexOf(';');
      const decl = cut >= 0 ? buf.slice(0, cut + 1) : '';
      const prelude = (cut >= 0 ? buf.slice(cut + 1) : buf).trim();
      buf = decl;
      flushDecls();
      let depth = 1;
      let j = i + 1;
      for (; j < css.length && depth; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
      }
      const body = css.slice(i + 1, j - 1);
      out.push({ prelude, text: body, children: /^@(keyframes|font-face)/i.test(prelude) ? [] : parse(body) });
      i = j;
      continue;
    }
    buf += c;
    i++;
  }
  flushDecls();
  return out;
}

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Split a selector list on top-level commas (not inside :where(…) / :is(…)). */
export function splitSelectors(sel: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of sel) {
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function join(parent: string, sel: string): string {
  const parents = splitSelectors(parent);
  return splitSelectors(sel)
    .flatMap((s) => parents.map((p) => (s.includes('&') ? s.replace(/&/g, p) : `${p} ${s}`)))
    .join(', ');
}

function flatten(nodes: Node[], selector: string, out: string[]) {
  for (const n of nodes) {
    if (n.prelude === null) {
      out.push(`${selector}{${n.text}}`);
    } else if (/^@(media|supports|container|layer)\b/i.test(n.prelude)) {
      const inner: string[] = [];
      flatten(n.children, selector, inner);
      if (inner.length) out.push(`${n.prelude}{${inner.join('')}}`);
    } else if (n.prelude.startsWith('@')) {
      out.push(`${n.prelude}{${n.text}}`);
    } else {
      flatten(n.children, join(selector, n.prelude), out);
    }
  }
}

/** Flatten nested CSS under `selector`. */
export function nestCss(css: string | undefined, selector: string): string {
  if (!css?.trim()) return '';
  const out: string[] = [];
  flatten(parse(strip(css)), selector, out);
  return out.join('\n');
}

/** theme.json `styles.blocks[name].css`, the way WordPress outputs it. */
export function wpBlockCss(css: string | undefined, selector: string): string {
  if (!css?.trim()) return '';
  let out = '';
  const sels = splitSelectors(selector);
  for (const part of strip(css).split('&')) {
    if (!part) continue;
    if (!part.includes('{')) {
      if (part.trim()) out += `:root :where(${selector.trim()}){${part.trim()}}`;
      continue;
    }
    const bits = part.replace(/}/g, '').split('{');
    if (bits.length !== 2) continue;
    let nested = bits[0];
    const pseudo = nested.match(/([>+~\s]*::[a-zA-Z-]+)/)?.[1] ?? '';
    if (pseudo) nested = nested.replace(pseudo, '');
    // " img" scopes (descendant), ":hover" / ".x" appends — like scope_selector / append_to_selector.
    const full = nested.startsWith(' ') ? sels.map((s) => `${s} ${nested.trim()}`).join(', ') : sels.map((s) => s + nested.trimEnd()).join(', ');
    out += `:root :where(${full})${pseudo}{${bits[1].trim()}}`;
  }
  return out;
}

/** Can WordPress process this per-block theme.json `css`? (no at-rules, one level of `&`). */
export function isWpBlockCss(css: string): boolean {
  const s = strip(css);
  if (/@/.test(s)) return false;
  return s.split('&').every((part, i) => {
    const opens = (part.match(/\{/g) ?? []).length;
    const closes = (part.match(/\}/g) ?? []).length;
    return i === 0 ? opens === 0 && closes === 0 : opens <= 1 && opens === closes;
  });
}
