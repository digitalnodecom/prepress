/**
 * Media import: download a file from the web into the site's media library
 * (<data>/uploads) and return its local URL. Used for every external image or
 * video an editor or AI links (POST /api/media/import, MCP writes), so the
 * site never hotlinks and the export/publish carries every file.
 *
 * Untrusted input (an AI or a pasted page decides the URL), so:
 *  - http(s) only, no credentials in the URL, at most 5 redirects;
 *  - every hop must resolve to a public address (no localhost / LAN / link-local:
 *    the request can't be used to probe this machine or its network);
 *  - only media types the library accepts (no SVG/HTML: they could run script
 *    from this origin), checked against the file's magic bytes;
 *  - size cap, timeout; identical files are stored once (content hash).
 */
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { join } from 'node:path';

export const IMPORT_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'application/pdf': '.pdf',
};

const MAX_BYTES = 50 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

/** File type from its first bytes (what it really is, whatever the server claims). */
export function sniff(b: Uint8Array): string | null {
  const s = (o: number, t: string) => [...t].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b[0] === 0x89 && s(1, 'PNG')) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (s(0, 'GIF8')) return 'image/gif';
  if (s(0, 'RIFF') && s(8, 'WEBP')) return 'image/webp';
  if (s(4, 'ftyp')) return s(8, 'avif') || s(8, 'avis') ? 'image/avif' : 'video/mp4';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  if (s(0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (s(0, '%PDF')) return 'application/pdf';
  return null;
}

/** Loopback, private, link-local, CGNAT, multicast, unspecified … anything not on the public internet. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v);
}

export async function assertPublic(url: URL, resolve: (host: string) => Promise<string[]>) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http(s) links can be imported');
  if (url.username || url.password) throw new Error('Links with a user name or password are not imported');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addrs = isIP(host) ? [host] : await resolve(host).catch(() => {
    throw new Error(`Can't find ${host}`);
  });
  if (!addrs.length || addrs.some(isPrivateAddress)) throw new Error(`${host} is a local or private address; only public web files are imported`);
}

export const defaultResolve = async (host: string) => (await lookup(host, { all: true })).map((a) => a.address);

export interface ImportResult {
  /** Local URL, e.g. /uploads/photo-1a2b3c4d.jpg */
  url: string;
  file: string;
  /** Already in the library (same link or same file). */
  reused: boolean;
}

export function createMediaImporter(opts: { dataDir: string; uploadsDir: string; resolve?: (host: string) => Promise<string[]>; fetch?: typeof fetch }) {
  const indexFile = join(opts.dataDir, 'media-imports.json');
  const resolve = opts.resolve ?? defaultResolve;
  const doFetch = opts.fetch ?? fetch;
  const pending = new Map<string, Promise<ImportResult>>();

  const readIndex = (): Record<string, string> => {
    try {
      return JSON.parse(readFileSync(indexFile, 'utf8'));
    } catch {
      return {};
    }
  };
  const remember = (url: string, file: string) => {
    const idx = readIndex();
    idx[url] = file;
    const tmp = `${indexFile}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(idx, null, 1));
    renameSync(tmp, indexFile);
  };

  async function download(raw: string): Promise<ImportResult> {
    let url: URL;
    try {
      url = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    } catch {
      throw new Error('Not a valid link');
    }
    const known = readIndex()[url.href];
    if (known && existsSync(join(opts.uploadsDir, known))) return { url: `/uploads/${known}`, file: known, reused: true };

    const signal = AbortSignal.timeout(TIMEOUT_MS);
    let res: Response | null = null;
    let at = url;
    for (let hop = 0; hop <= 5; hop++) {
      await assertPublic(at, resolve);
      res = await doFetch(at, { redirect: 'manual', signal, headers: { accept: 'image/*,video/*,audio/*,application/pdf;q=0.9,*/*;q=0.1', 'user-agent': 'Prepress media import' } }).catch((e: any) => {
        throw new Error(`Download failed: ${e?.cause?.code ?? e?.message ?? e}`);
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        at = new URL(res.headers.get('location')!, at);
        continue;
      }
      break;
    }
    if (!res || (res.status >= 300 && res.status < 400)) throw new Error('Too many redirects');
    if (!res.ok) throw new Error(`The link answered ${res.status}`);
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > MAX_BYTES) throw new Error('File is larger than 50 MB');

    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body!.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new Error('File is larger than 50 MB');
      }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks);
    const type = sniff(buf);
    if (!type) {
      const ct = (res.headers.get('content-type') ?? '').split(';')[0].trim();
      throw new Error(ct === 'image/svg+xml' ? 'SVG images are not imported (they can contain scripts); use PNG, JPEG, WebP or AVIF' : `Not an image, video, audio or PDF file${ct ? ` (${ct})` : ''}`);
    }
    const ext = IMPORT_TYPES[type];
    const stem = decodeURIComponent(at.pathname.split('/').pop() ?? '').replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'media';
    const hash = createHash('sha256').update(buf).digest('hex').slice(0, 10);
    // The same file under another name is already in the library: reuse it.
    const existing = readdirSync(opts.uploadsDir).find((f) => f.endsWith(`-${hash}${ext}`));
    const file = existing ?? `${stem}-${hash}${ext}`;
    const target = join(opts.uploadsDir, file);
    const reused = !!existing;
    if (!reused) {
      const tmp = `${target}.${process.pid}.tmp`;
      writeFileSync(tmp, buf);
      renameSync(tmp, target);
    }
    remember(url.href, file);
    return { url: `/uploads/${file}`, file, reused };
  }

  return {
    /** Download one link into the library (concurrent calls for the same link share one download). */
    import(raw: string): Promise<ImportResult> {
      const key = raw.trim();
      if (!pending.has(key)) {
        const p = download(key).finally(() => pending.delete(key));
        pending.set(key, p);
      }
      return pending.get(key)!;
    },
  };
}

export type MediaImporter = ReturnType<typeof createMediaImporter>;

/** Import every external media link in a site and point its blocks at the local copies. */
export async function localizeSite<S extends { pages: any[]; header: string; footer: string; patterns?: any[]; blocks?: any[] }>(
  site: S,
  engine: { externalMediaUrls(m: string, b?: any[]): string[]; replaceMediaUrls(m: string, map: Record<string, string>, b?: any[]): string; siteMarkups(s: any): { get(s: any): string; set(s: any, m: string): any }[] },
  importer: MediaImporter,
): Promise<{ site: S; imported: { from: string; to: string }[]; failed: { url: string; error: string }[] }> {
  const slots = engine.siteMarkups(site);
  const urls = new Set<string>();
  for (const slot of slots) for (const u of engine.externalMediaUrls(slot.get(site), site.blocks)) urls.add(u);
  if (!urls.size) return { site, imported: [], failed: [] };
  const map: Record<string, string> = {};
  const imported: { from: string; to: string }[] = [];
  const failed: { url: string; error: string }[] = [];
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length) {
        const u = queue.shift()!;
        try {
          const r = await importer.import(u);
          map[u] = r.url;
          imported.push({ from: u, to: r.url });
        } catch (e: any) {
          failed.push({ url: u, error: String(e?.message ?? e) });
        }
      }
    }),
  );
  let next: any = site;
  for (const slot of slots) next = slot.set(next, engine.replaceMediaUrls(slot.get(next), map, site.blocks));
  return { site: next, imported, failed };
}
