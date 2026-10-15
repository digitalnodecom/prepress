/**
 * Inline HTML inside rich-text attributes (paragraph content, headings, list
 * items, buttons, captions, table cells …) comes from AI output and library
 * items, i.e. from untrusted sources. Keep the formatting the block editor
 * itself produces (bold, italic, links, highlights …) and drop everything else:
 * other tags are unwrapped (their text stays), script-like elements removed
 * with their content, attributes reduced to a safe allowlist.
 */
const KEEP = new Set(['strong', 'b', 'em', 'i', 'a', 'br', 'code', 's', 'del', 'sub', 'sup', 'mark', 'kbd', 'span', 'small', 'u', 'abbr', 'bdo', 'bdi', 'time', 'q', 'cite']);
const DROP = new Set(['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'img', 'video', 'audio', 'source', 'picture', 'canvas']);
const SAFE_URL = /^(https?:|mailto:|tel:|\/(?!\/)|#|\.\.?\/)/i;
const SAFE_CLASS = /^[A-Za-z0-9 _-]{0,200}$/;
const SAFE_DECL = /^(color|background-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([0-9.,\s%]+\)|var\(--wp--preset--color--[a-z0-9-]+\)|[a-z]{3,20})\s*$/i;

function cleanAttrs(el: Element) {
  const tag = el.tagName.toLowerCase();
  for (const { name, value } of [...el.attributes]) {
    const n = name.toLowerCase();
    let keep = false;
    if (tag === 'a' && n === 'href') keep = SAFE_URL.test(value.trim()) && !/^\s*(javascript|data|vbscript):/i.test(value);
    else if (tag === 'a' && n === 'target') keep = value === '_blank';
    else if (tag === 'a' && n === 'rel') keep = /^[a-z ]{0,60}$/.test(value);
    else if (n === 'class') keep = SAFE_CLASS.test(value);
    else if (n === 'style' && (tag === 'mark' || tag === 'span')) {
      const decls = value.split(';').map((d) => d.trim()).filter(Boolean);
      keep = decls.length > 0 && decls.every((d) => SAFE_DECL.test(d));
    } else if ((tag === 'abbr' && n === 'title') || (tag === 'time' && n === 'datetime') || (n === 'lang' || n === 'dir')) keep = value.length < 200;
    if (!keep) el.removeAttribute(name);
  }
  if (tag === 'a' && el.getAttribute('target') === '_blank') el.setAttribute('rel', 'noopener');
}

function walk(node: Node) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 8) {
      child.remove(); // comments
      continue;
    }
    if (child.nodeType !== 1) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP.has(tag)) {
      el.remove();
      continue;
    }
    walk(el);
    if (KEEP.has(tag)) cleanAttrs(el);
    else el.replaceWith(...el.childNodes); // unwrap: keep the text
  }
}

export function sanitizeInline(html: string): string {
  if (!html.includes('<')) return html;
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, ''); // no DOM: plain text
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}`, 'text/html');
  walk(doc.body);
  return doc.body.innerHTML;
}

/** Rich-text values can also sit inside arrays/objects (table rows → cells → content). */
export function sanitizeRich(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeInline(value);
  if (Array.isArray(value)) return value.map(sanitizeRich);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'content' || typeof v === 'object' ? sanitizeRich(v) : v]));
  return value;
}
