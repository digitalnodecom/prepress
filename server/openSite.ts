/**
 * Open a published Prepress site from its address: every published Prepress site carries
 * /prepress.json (siteMeta.publicSite: content and design only, no secrets) and links it from
 * each page (<link rel="alternate" type="application/vnd.prepress+json">).
 *
 * The file is untrusted, like any library item: it is fetched from public addresses only
 * (checked again on every redirect, size-capped), imported through the library's template
 * import (every block re-normalized, raw code and analytics ids never taken over), and its
 * images are downloaded into this site's media library.
 */
import { assertPublic, defaultResolve } from './media.ts';

export const SOURCE_FILE = 'prepress.json';
export const SOURCE_TYPE = 'application/vnd.prepress+json';
export const SOURCE_FORMAT = 'prepress/site@1';
const MAX_PAGE = 2 * 1024 * 1024;
const MAX_SOURCE = 20 * 1024 * 1024;

export interface FetchOptions {
  fetch?: typeof fetch;
  resolve?: (host: string) => Promise<string[]>;
}

/** GET a public URL (redirects followed by hand, each hop checked), at most `max` bytes. */
async function getPublic(raw: string | URL, max: number, accept: string, o: FetchOptions): Promise<{ url: URL; status: number; type: string; body: string }> {
  const f = o.fetch ?? fetch;
  const resolve = o.resolve ?? defaultResolve;
  let at = new URL(raw);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(at, resolve);
    const res = await f(at, { redirect: 'manual', headers: { accept, 'user-agent': 'Prepress (open published site)' }, signal: AbortSignal.timeout(20_000) }).catch((e: any) => {
      throw new Error(`Can't reach ${at.host}: ${e?.cause?.code ?? e?.message ?? e}`);
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      at = new URL(res.headers.get('location')!, at);
      continue;
    }
    if (Number(res.headers.get('content-length') ?? 0) > max) throw new Error(`${at.pathname} is too large`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > max) throw new Error(`${at.pathname} is too large`);
    return { url: at, status: res.status, type: res.headers.get('content-type') ?? '', body: new TextDecoder().decode(buf) };
  }
  throw new Error('Too many redirects');
}

/** Where a page says its source is, if it links one. */
export function sourceLink(html: string, base: URL): URL | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attr = (n: string) => tag.match(new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))?.slice(2).find((x) => x !== undefined);
    if ((attr('rel') ?? '').toLowerCase().split(/\s+/).includes('alternate') && (attr('type') ?? '').toLowerCase() === SOURCE_TYPE && attr('href')) {
      try {
        return new URL(attr('href')!.replace(/&amp;/g, '&'), base);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export interface PublishedSource {
  /** The site object from prepress.json (still untrusted). */
  site: any;
  generator?: string;
  /** Where prepress.json was found. */
  source: string;
  /** The site's root: /uploads/… in the site resolve against it. */
  root: string;
}

/** Find and fetch a published site's prepress.json from any of its page addresses. */
export async function fetchPublishedSource(input: string, o: FetchOptions = {}): Promise<PublishedSource> {
  let start: URL;
  try {
    start = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    throw new Error('Enter the address of a published Prepress site, e.g. https://example.com');
  }
  const candidates: URL[] = [];
  // 1. The page's own pointer (works for sites served from a sub-path, e.g. GitHub project pages).
  let pageError = '';
  const page = await getPublic(start, MAX_PAGE, 'text/html,*/*;q=0.5', o).catch((e: any) => {
    pageError = String(e?.message ?? e);
    return null;
  });
  if (page && /html/i.test(page.type)) {
    const link = sourceLink(page.body, page.url);
    if (link) candidates.push(link);
  }
  // 2. prepress.json in this folder and every parent folder.
  const segs = (page?.url ?? start).pathname.split('/').slice(1, -1);
  for (let i = segs.length; i >= 0; i--) candidates.push(new URL(`/${[...segs.slice(0, i), SOURCE_FILE].join('/')}`, page?.url ?? start));
  const tried = new Set<string>();
  for (const c of candidates) {
    if (tried.has(c.href) || tried.size >= 6) continue;
    tried.add(c.href);
    const r = await getPublic(c, MAX_SOURCE, 'application/json', o).catch(() => null);
    if (!r || r.status !== 200) continue;
    let j: any;
    try {
      j = JSON.parse(r.body);
    } catch {
      continue;
    }
    if (j?.format !== SOURCE_FORMAT || !Array.isArray(j.site?.pages) || !j.site.pages.length) continue;
    return { site: j.site, generator: typeof j.generator === 'string' ? j.generator.slice(0, 60) : undefined, source: r.url.href, root: new URL('.', r.url).href };
  }
  if (!page) throw new Error(`Couldn't open ${start.host}: ${pageError}`);
  if (page.status >= 400) throw new Error(`${start.host} answered ${page.status} for ${page.url.pathname}`);
  // Older Prepress sites have no prepress.json yet; their pages still carry Prepress's body class.
  if (/<meta name="generator" content="Prepress/i.test(page.body) || /class="wp-site-blocks-body"/.test(page.body)) {
    throw new Error(`${start.host} was published with an older Prepress, before sites carried their source (prepress.json, since 0.7.4). Publish it again with a current version, then open it here.`);
  }
  throw new Error(`${start.host} doesn't look like a site published with Prepress.`);
}

/** Point the site's own media (/uploads/…) at the published copies, so they can be downloaded. */
export function absoluteMedia<T>(value: T, root: string): T {
  const base = root.replace(/\/+$/, '');
  const fix = (s: string) => s.replace(/(["'(=\s])\/uploads\//g, `$1${base}/uploads/`).replace(/^\/uploads\//, `${base}/uploads/`);
  const walk = (v: any): any => (typeof v === 'string' ? fix(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  return walk(value);
}
