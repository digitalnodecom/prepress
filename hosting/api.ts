/**
 * Prepress hosting API — free sites at https://<name>.prepress.digitalno.de.
 *
 * One S3 bucket, one folder per site (<name>/…). Names are first come, first
 * served: the first Prepress install to claim a name with its secret site
 * token owns it, and only that token can upload, delete or release it. Only a
 * SHA-256 of each token is stored.
 *
 * Uploads never pass through this service: it checks ownership, path, type and
 * quota, then returns a short-lived presigned PUT URL for that one object, with
 * the content type, length and caching fixed by the signature.
 *
 * Caddy (deploy/hosting/Caddyfile) serves the sites straight from the bucket
 * and asks /api/v1/tls-ask before getting a certificate for a name.
 *
 *   GET  /api/v1/health
 *   GET  /api/v1/sites/:name                     availability (header x-site-token: is it mine?)
 *   POST /api/v1/sites/:name/claim     {token}   claim (or confirm ownership)
 *   POST /api/v1/sites/:name/presign   {token, path, size}
 *   POST /api/v1/sites/:name/delete    {token, paths}
 *   POST /api/v1/sites/:name/release   {token}   delete the site and its name
 *   GET  /api/v1/tls-ask?domain=…                Caddy on-demand TLS gate
 *   GET  /api/v1/notfound?site=…                 the site's 404.html, status 404
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { encodeKey, presign } from './presign.ts';
import { nameProblem } from './names.ts';

export { NAME, RESERVED, nameProblem } from './names.ts';

export interface HostingConfig {
  /** e.g. prepress.digitalno.de — sites live at <name>.<domain>. */
  domain: string;
  dataDir: string;
  bucket: string;
  region: string;
  /** e.g. https://s3.fr-par.scw.cloud */
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  maxFileBytes?: number;
  maxSiteBytes?: number;
  maxFiles?: number;
  /** Claims per IP per hour. */
  claimsPerHour?: number;
  /** For tests: S3 calls (delete/list/404 fetch). */
  fetch?: typeof fetch;
  now?: () => number;
}

interface SiteRecord {
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
  files: Record<string, number>;
}

/** Paths a Prepress publish produces (pages, 404, media, and a little more for later). */
const PATH = /^(?:[a-z0-9][a-z0-9._-]{0,63}\/){0,4}[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  xml: 'application/xml',
  txt: 'text/plain; charset=utf-8',
  ico: 'image/x-icon',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createHostingApi(cfg: HostingConfig) {
  const maxFile = cfg.maxFileBytes ?? 25 * 1024 * 1024;
  const maxSite = cfg.maxSiteBytes ?? 250 * 1024 * 1024;
  const maxFiles = cfg.maxFiles ?? 2000;
  const claimsPerHour = cfg.claimsPerHour ?? 10;
  const doFetch = cfg.fetch ?? fetch;
  const now = cfg.now ?? Date.now;
  const dbFile = join(cfg.dataDir, 'sites.json');
  mkdirSync(cfg.dataDir, { recursive: true });

  let sites: Record<string, SiteRecord> = (() => {
    try {
      return JSON.parse(readFileSync(dbFile, 'utf8'));
    } catch {
      return {};
    }
  })();
  const save = () => {
    const tmp = `${dbFile}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(sites), { mode: 0o600 });
    renameSync(tmp, dbFile);
  };

  // ---------- rate limits (in memory) ----------
  const hits = new Map<string, number[]>();
  function limit(key: string, max: number, windowMs: number) {
    const t = now();
    const list = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (list.length >= max) throw new HttpError(429, 'Too many requests — try again later.');
    list.push(t);
    hits.set(key, list);
  }

  // ---------- S3 ----------
  const objectUrl = (key: string) => `${cfg.endpoint.replace(/\/+$/, '')}/${cfg.bucket}/${encodeKey(key)}`;
  const publicUrl = (key: string) => objectUrl(key);
  const signed = (method: 'GET' | 'PUT' | 'DELETE', url: string, headers: Record<string, string> = {}, expiresIn = 300) =>
    presign({ method, url, region: cfg.region, accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, expiresIn, headers });

  async function s3Delete(key: string) {
    const r = await doFetch(signed('DELETE', objectUrl(key)), { method: 'DELETE' });
    if (!r.ok && r.status !== 404) throw new HttpError(502, `Storage error ${r.status}`);
  }

  // ---------- helpers ----------
  function owned(name: string, token: unknown): SiteRecord {
    const problem = nameProblem(name);
    if (problem) throw new HttpError(400, problem);
    const site = sites[name];
    if (!site) throw new HttpError(404, `${name}.${cfg.domain} is not claimed.`);
    if (typeof token !== 'string' || token.length < 32 || token.length > 256) throw new HttpError(401, 'Missing site token.');
    if (!timingSafeEqual(Buffer.from(hash(token)), Buffer.from(site.tokenHash))) throw new HttpError(403, `${name}.${cfg.domain} belongs to another Prepress site.`);
    return site;
  }
  const siteBytes = (s: SiteRecord) => Object.values(s.files).reduce((a, b) => a + b, 0);
  const url = (name: string) => `https://${name}.${cfg.domain}`;

  async function body(req: IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
      size += (c as Buffer).length;
      if (size > 512 * 1024) throw new HttpError(413, 'Request too large');
      chunks.push(c as Buffer);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
      throw new HttpError(400, 'Invalid JSON');
    }
  }

  const clientIp = (req: IncomingMessage) => {
    const peer = req.socket.remoteAddress ?? '';
    // Behind Caddy on the same machine: trust its X-Forwarded-For (first hop it appended).
    if (peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1') {
      const xff = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (xff.length) return xff[xff.length - 1];
    }
    return peer;
  };

  // ---------- routes ----------
  async function route(req: IncomingMessage, res: ServerResponse): Promise<[number, unknown] | null> {
    const u = new URL(req.url ?? '/', 'http://x');
    const m = u.pathname.match(/^\/api\/v1\/sites\/([^/]+)(?:\/(claim|presign|delete|release))?$/);

    if (req.method === 'GET' && u.pathname === '/api/v1/health') return [200, { ok: true, domain: cfg.domain, sites: Object.keys(sites).length }];

    if (req.method === 'GET' && u.pathname === '/api/v1/tls-ask') {
      const domain = (u.searchParams.get('domain') ?? '').toLowerCase();
      if (domain === cfg.domain) return [200, { ok: true }];
      const sub = domain.endsWith(`.${cfg.domain}`) ? domain.slice(0, -cfg.domain.length - 1) : '';
      return sub && sites[sub] ? [200, { ok: true }] : [404, { ok: false }];
    }

    if (req.method === 'GET' && u.pathname === '/api/v1/notfound') {
      const site = u.searchParams.get('site') ?? '';
      let html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><style>body{font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#222}</style><main><h1>Page not found</h1><p><a href="/">Go to the home page</a></p></main>`;
      if (sites[site]) {
        const r = await doFetch(publicUrl(`${site}/404.html`)).catch(() => null);
        if (r?.ok) html = await r.text();
      } else {
        html = html.replace('Page not found', 'This site does not exist (yet)').replace('<p><a href="/">Go to the home page</a></p>', '<p>Publish one with Prepress.</p>');
      }
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(html);
      return null;
    }

    if (!m) return [404, { error: 'Not found' }];
    const name = decodeURIComponent(m[1]).toLowerCase();
    const action = m[2];

    if (req.method === 'GET' && !action) {
      limit(`check:${clientIp(req)}`, 120, 60_000);
      const problem = nameProblem(name);
      // With the site's token (header), the owner learns it's theirs.
      const token = req.headers['x-site-token'];
      const mine = !!sites[name] && typeof token === 'string' && token.length >= 32 && timingSafeEqual(Buffer.from(hash(token)), Buffer.from(sites[name].tokenHash));
      return [200, { name, url: url(name), valid: !problem, available: !problem && !sites[name], owner: mine, ...(problem ? { reason: problem } : sites[name] && !mine ? { reason: 'Taken' } : {}) }];
    }
    if (req.method !== 'POST') return [405, { error: 'Method not allowed' }];
    const b = await body(req);

    if (action === 'claim') {
      const problem = nameProblem(name);
      if (problem) throw new HttpError(400, problem);
      if (typeof b.token !== 'string' || b.token.length < 32 || b.token.length > 256) throw new HttpError(400, 'Missing site token.');
      const existing = sites[name];
      if (existing) {
        owned(name, b.token);
        return [200, { name, url: url(name), claimed: false, owner: true }];
      }
      limit(`claim:${clientIp(req)}`, claimsPerHour, 3_600_000);
      const t = new Date(now()).toISOString();
      sites[name] = { tokenHash: hash(b.token), createdAt: t, updatedAt: t, files: {} };
      save();
      return [201, { name, url: url(name), claimed: true, owner: true }];
    }

    const site = owned(name, b.token);

    if (action === 'presign') {
      limit(`presign:${name}`, 5000, 3_600_000);
      const path = String(b.path ?? '');
      if (!PATH.test(path) || path.includes('..')) throw new HttpError(400, `Path not allowed: ${path}`);
      const ext = path.split('.').pop()!.toLowerCase();
      const type = TYPES[ext];
      if (!type) throw new HttpError(415, `File type .${ext} is not hosted`);
      const size = Number(b.size);
      if (!Number.isInteger(size) || size < 0) throw new HttpError(400, 'size must be the file size in bytes');
      if (size > maxFile) throw new HttpError(413, `Files can be at most ${Math.round(maxFile / 1048576)} MB`);
      const others = siteBytes(site) - (site.files[path] ?? 0);
      if (others + size > maxSite) throw new HttpError(413, `A free site can hold ${Math.round(maxSite / 1048576)} MB`);
      if (!(path in site.files) && Object.keys(site.files).length >= maxFiles) throw new HttpError(413, `A free site can hold ${maxFiles} files`);
      const headers = {
        'content-type': type,
        'content-length': String(size),
        'cache-control': ext === 'html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400',
      };
      const putUrl = signed('PUT', objectUrl(`${name}/${path}`), headers, 900);
      site.files[path] = size;
      site.updatedAt = new Date(now()).toISOString();
      save();
      return [200, { method: 'PUT', url: putUrl, headers }];
    }

    if (action === 'delete') {
      const paths: string[] = Array.isArray(b.paths) ? b.paths.map(String).slice(0, 1000) : [];
      for (const p of paths) {
        if (!PATH.test(p) || p.includes('..')) continue;
        await s3Delete(`${name}/${p}`);
        delete site.files[p];
      }
      site.updatedAt = new Date(now()).toISOString();
      save();
      return [200, { deleted: paths.length }];
    }

    if (action === 'release') {
      for (const p of Object.keys(site.files)) await s3Delete(`${name}/${p}`);
      delete sites[name];
      save();
      return [200, { released: name }];
    }

    return [404, { error: 'Not found' }];
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    try {
      const r = await route(req, res);
      if (!r) return;
      res.writeHead(r[0], { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(r[1]));
    } catch (e: any) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: status === 500 ? 'Internal error' : e.message }));
    }
  };
}
