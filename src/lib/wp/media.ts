/**
 * External media → media library. Images (and video/audio) linked from the
 * web are downloaded into the site's uploads and the blocks are pointed at the
 * local copy, so a published site never hotlinks someone else's files and the
 * WordPress export carries every file.
 *
 * This module only finds and rewrites URLs in block attributes (re-serializing
 * with WordPress's own `serialize()`, so the saved HTML follows); downloading
 * happens on the server (server/media.ts).
 */
import { parse, serialize } from '@wordpress/blocks';
import type { CustomBlockDef } from '../types';

/** Block attributes that hold a media URL. */
export const MEDIA_ATTRS: Record<string, string[]> = {
  'core/image': ['url'],
  'core/cover': ['url'],
  'core/media-text': ['mediaUrl'],
  'core/video': ['src', 'poster'],
  'core/audio': ['src'],
};

/** A URL that points outside this site (http(s) or protocol-relative). data: and /uploads/ are local. */
export const isExternalMedia = (url: unknown): url is string => typeof url === 'string' && /^(https?:)?\/\//i.test(url.trim());

/** Attribute names per block, including site-defined blocks' `image` attributes. */
export function mediaAttrs(customBlocks: CustomBlockDef[] = []): Record<string, string[]> {
  const out: Record<string, string[]> = { ...MEDIA_ATTRS };
  for (const b of customBlocks) {
    const names = Object.entries(b.attributes ?? {}).filter(([, a]) => a.control === 'image').map(([k]) => k);
    if (names.length) out[b.name] = names;
  }
  return out;
}

function walk(blocks: any[], fn: (b: any) => void) {
  for (const b of blocks) {
    fn(b);
    if (b.innerBlocks?.length) walk(b.innerBlocks, fn);
  }
}

/** External media URLs used in block markup. */
export function externalMediaUrls(markup: string, customBlocks: CustomBlockDef[] = []): string[] {
  if (!markup || !/\/\//.test(markup)) return [];
  const attrs = mediaAttrs(customBlocks);
  const found = new Set<string>();
  walk(parse(markup), (b) => {
    for (const k of attrs[b.name] ?? []) if (isExternalMedia(b.attributes?.[k])) found.add(b.attributes[k].trim());
  });
  return [...found];
}

/** Point media attributes at new URLs (`map`: external → local). Unchanged markup is returned as-is. */
export function replaceMediaUrls(markup: string, map: Record<string, string>, customBlocks: CustomBlockDef[] = []): string {
  if (!markup || !Object.keys(map).length) return markup;
  const attrs = mediaAttrs(customBlocks);
  const blocks = parse(markup);
  let changed = false;
  walk(blocks, (b) => {
    for (const k of attrs[b.name] ?? []) {
      const v = b.attributes?.[k];
      if (typeof v === 'string' && map[v.trim()]) {
        b.attributes[k] = map[v.trim()];
        // A WordPress attachment id belongs to the old file.
        if (k === 'url' || k === 'mediaUrl') {
          delete b.attributes.id;
          delete b.attributes.mediaId;
        }
        changed = true;
      }
    }
  });
  return changed ? serialize(blocks) : markup;
}

/** Every markup string of a site, with a setter, for site-wide rewrites. */
export function siteMarkups<T extends { pages: { content: string }[]; header: string; footer: string; patterns?: { content: string }[] }>(site: T) {
  return [
    ...site.pages.map((p, i) => ({ get: (s: T) => s.pages[i].content, set: (s: T, m: string): T => ({ ...s, pages: s.pages.map((x, j) => (j === i ? { ...x, content: m } : x)) }) })),
    { get: (s: T) => s.header, set: (s: T, m: string): T => ({ ...s, header: m }) },
    { get: (s: T) => s.footer, set: (s: T, m: string): T => ({ ...s, footer: m }) },
    ...(site.patterns ?? []).map((_, i) => ({ get: (s: T) => s.patterns![i].content, set: (s: T, m: string): T => ({ ...s, patterns: s.patterns!.map((x, j) => (j === i ? { ...x, content: m } : x)) }) })),
  ];
}
