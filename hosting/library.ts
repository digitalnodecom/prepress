/**
 * The Prepress library — https://prepress.digitalno.de/library
 *
 * Anyone can publish a template (whole site), pattern, block or style from
 * Prepress; items are owned by the publishing site's token (SHA-256 stored),
 * so only that site can update or delete them. Everything here is untrusted:
 * Prepress cleans items again on import (src/lib/library.ts), and previews are
 * served with a sandbox CSP (no scripts, opaque origin) and only framed by
 * the library and local Prepress editors.
 *
 *   GET  /api/v1/library/items?type=&q=&limit=&offset=   list (no payloads)
 *   GET  /api/v1/library/items/:id[?import=1]             one item with payload
 *   POST /api/v1/library/items              {token, type, title, description, tags, payload, preview}
 *   POST /api/v1/library/items/:id          {token, …}  update (owner)
 *   POST /api/v1/library/items/:id/delete   {token}     (owner)
 *   POST /api/v1/library/items/:id/report   {reason}
 *   POST /api/v1/library/items/:id/moderate {admin, action: hide|unhide|delete}
 *   GET  /library/preview/:id                            the preview page
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';

export const TYPES = ['template', 'pattern', 'block', 'style'] as const;
export type ItemType = (typeof TYPES)[number];

export interface ItemMeta {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  imports: number;
  /** Hidden by moderation or by reports. */
  hidden?: boolean;
  ownerHash: string;
  reports: string[];
}

export const publicMeta = ({ ownerHash: _o, reports: _r, hidden: _h, ...m }: ItemMeta) => m;

export interface LibraryHelpers {
  body(req: IncomingMessage, max: number): Promise<any>;
  limit(key: string, max: number, windowMs: number): void;
  clientIp(req: IncomingMessage): string;
  fail(status: number, message: string): never;
  now(): number;
}

const MAX_PAYLOAD = 1_500_000;
const MAX_PREVIEW = 1_500_000;
const REPORTS_TO_HIDE = 3;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const clean = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const ID = /^[a-z0-9]{10}$/;

/** Frame-ancestors: the library itself, and Prepress editors on this computer (web and desktop). */
export const PREVIEW_CSP = [
  'sandbox',
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  'img-src data: https:',
  'media-src data: https:',
  "frame-ancestors 'self' http://127.0.0.1:* http://localhost:* tauri://localhost http://tauri.localhost",
].join('; ');

export function createLibrary(dataDir: string, h: LibraryHelpers, opts: { adminToken?: string } = {}) {
  const dir = join(dataDir, 'library');
  mkdirSync(dir, { recursive: true });
  const indexFile = join(dir, 'index.json');
  let index: Record<string, ItemMeta> = (() => {
    try {
      return JSON.parse(readFileSync(indexFile, 'utf8'));
    } catch {
      return {};
    }
  })();
  const write = (file: string, data: string) => {
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, data, { mode: 0o600 });
    renameSync(tmp, file);
  };
  const save = () => write(indexFile, JSON.stringify(index));

  function validate(b: any, partial = false) {
    const type = b.type as ItemType;
    if (!partial && !TYPES.includes(type)) h.fail(400, `type must be one of ${TYPES.join(', ')}`);
    const title = clean(b.title, 80);
    if (!partial && title.length < 3) h.fail(400, 'Give it a title (3–80 characters)');
    const payload = b.payload;
    if (!partial || payload !== undefined) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) h.fail(400, 'payload must be an object');
      const key = type ?? Object.keys(payload)[0];
      if (!payload[key]) h.fail(400, `payload.${key} is missing`);
      const size = JSON.stringify(payload).length;
      if (size > MAX_PAYLOAD) h.fail(413, `The item is too large (${Math.round(size / 1000)} kB, max ${MAX_PAYLOAD / 1000} kB)`);
    }
    if ((!partial || b.preview !== undefined) && (typeof b.preview !== 'string' || b.preview.length > MAX_PREVIEW)) h.fail(400, 'preview must be an HTML page (max 1.5 MB)');
    const tags = (Array.isArray(b.tags) ? b.tags : []).map((t: unknown) => clean(t, 24).toLowerCase()).filter(Boolean).slice(0, 6);
    return { type, title, description: clean(b.description, 400), tags, payload, preview: b.preview as string | undefined };
  }

  function owned(id: string, token: unknown): ItemMeta {
    const m = index[id];
    if (!m) h.fail(404, 'No such library item');
    if (typeof token !== 'string' || token.length < 32 || !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(m.ownerHash))) h.fail(403, 'Only the site that published this item can change it');
    return m;
  }

  const counted = new Map<string, number>();
  const visible = () => Object.values(index).filter((m) => !m.hidden);

  function list(q: URLSearchParams) {
    const type = q.get('type');
    const text = clean(q.get('q'), 80).toLowerCase();
    const limit = Math.min(60, Math.max(1, Number(q.get('limit') ?? 24) || 24));
    const offset = Math.max(0, Number(q.get('offset') ?? 0) || 0);
    let items = visible();
    if (type && TYPES.includes(type as ItemType)) items = items.filter((m) => m.type === type);
    if (text) items = items.filter((m) => `${m.title} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(text));
    const sort = q.get('sort') === 'popular' ? (a: ItemMeta, b: ItemMeta) => b.imports - a.imports : (a: ItemMeta, b: ItemMeta) => b.updatedAt.localeCompare(a.updatedAt);
    items.sort(sort);
    return { total: items.length, items: items.slice(offset, offset + limit).map(publicMeta) };
  }

  function get(id: string) {
    const m = index[id];
    if (!m || m.hidden) return null;
    const payload = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8'));
    return { ...publicMeta(m), payload };
  }

  /** Library API routes; returns null when the path isn't the library's. */
  async function route(req: IncomingMessage, res: ServerResponse, u: URL): Promise<[number, unknown] | 'done' | null> {
    const p = u.pathname;

    const prev = p.match(/^\/library\/preview\/([a-z0-9]{10})$/);
    if (prev && req.method === 'GET') {
      const m = index[prev[1]];
      const file = join(dir, `${prev[1]}.html`);
      if (!m || m.hidden || !existsSync(file)) return [404, { error: 'Not found' }];
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': PREVIEW_CSP, 'x-content-type-options': 'nosniff', 'cache-control': 'public, max-age=300' });
      res.end(readFileSync(file));
      return 'done';
    }

    if (!p.startsWith('/api/v1/library/')) return null;
    const m = p.match(/^\/api\/v1\/library\/items(?:\/([a-z0-9]{10}))?(?:\/(delete|report|moderate))?$/);
    if (!m) return [404, { error: 'Not found' }];
    const [, id, action] = m;

    if (req.method === 'GET' && !id) {
      // With the site's token (header) and ?mine=1: the items this site published, hidden ones included.
      const token = req.headers['x-site-token'];
      if (u.searchParams.get('mine') === '1') {
        if (typeof token !== 'string' || token.length < 32) h.fail(401, 'Missing site token');
        const mine = Object.values(index).filter((m) => timingSafeEqual(Buffer.from(m.ownerHash), Buffer.from(hash(token))));
        return [200, { total: mine.length, items: mine.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((m) => ({ ...publicMeta(m), hidden: !!m.hidden })) }];
      }
      return [200, list(u.searchParams)];
    }
    if (req.method === 'GET' && id && !action) {
      const item = get(id);
      if (!item) return [404, { error: 'No such library item' }];
      if (u.searchParams.get('import') === '1') {
        // Count each visitor once a day per item.
        const key = `${hash(h.clientIp(req)).slice(0, 16)}:${id}`;
        const t = h.now();
        if (!(counted.get(key)! > t - 86_400_000)) {
          counted.set(key, t);
          index[id].imports++;
          save();
        }
      }
      return [200, item];
    }
    if (req.method !== 'POST') return [405, { error: 'Method not allowed' }];

    if (!id) {
      const b = await h.body(req, 4_000_000);
      if (typeof b.token !== 'string' || b.token.length < 32) h.fail(401, 'Missing site token');
      h.limit(`publish:${h.clientIp(req)}`, 10, 3_600_000);
      const v = validate(b);
      let newId = '';
      do newId = randomBytes(8).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10).padEnd(10, '0');
      while (index[newId] || !ID.test(newId));
      const t = new Date(h.now()).toISOString();
      write(join(dir, `${newId}.json`), JSON.stringify(v.payload));
      write(join(dir, `${newId}.html`), v.preview!);
      index[newId] = { id: newId, type: v.type, title: v.title, description: v.description, tags: v.tags, createdAt: t, updatedAt: t, imports: 0, ownerHash: hash(b.token), reports: [] };
      save();
      return [201, { id: newId, url: `/library/${newId}` }];
    }

    if (action === 'report') {
      const b = await h.body(req, 8_000);
      report(id, h.clientIp(req), b.reason);
      return [200, { ok: true }];
    }

    if (action === 'moderate') {
      const b = await h.body(req, 8_000);
      if (!opts.adminToken || typeof b.admin !== 'string' || !timingSafeEqual(Buffer.from(hash(b.admin)), Buffer.from(hash(opts.adminToken)))) h.fail(403, 'Not allowed');
      const meta = index[id];
      if (!meta) h.fail(404, 'No such library item');
      if (b.action === 'delete') return [200, remove(id)];
      meta.hidden = b.action === 'hide';
      if (b.action === 'unhide') meta.reports = [];
      save();
      return [200, { ok: true, hidden: meta.hidden }];
    }

    const b = await h.body(req, 4_000_000);
    const meta = owned(id, b.token);
    if (action === 'delete') return [200, remove(id)];
    const v = validate({ ...b, type: meta.type }, true);
    if (b.title !== undefined) meta.title = v.title;
    if (b.description !== undefined) meta.description = v.description;
    if (b.tags !== undefined) meta.tags = v.tags;
    if (b.payload !== undefined) write(join(dir, `${id}.json`), JSON.stringify(v.payload));
    if (b.preview !== undefined) write(join(dir, `${id}.html`), v.preview!);
    meta.updatedAt = new Date(h.now()).toISOString();
    save();
    return [200, { id, url: `/library/${id}` }];
  }

  /** One report per visitor; enough reports hide the item until a moderator looks. */
  function report(id: string, ip: string, reason?: unknown) {
    h.limit(`report:${ip}`, 20, 3_600_000);
    const meta = index[id];
    if (!meta) h.fail(404, 'No such library item');
    const who = hash(`report:${ip}`).slice(0, 16);
    if (!meta.reports.includes(who)) meta.reports.push(who);
    if (meta.reports.length >= REPORTS_TO_HIDE) meta.hidden = true;
    console.log(`library report ${id} (${meta.reports.length}): ${clean(reason, 200)}`);
    save();
  }

  function remove(id: string) {
    delete index[id];
    rmSync(join(dir, `${id}.json`), { force: true });
    rmSync(join(dir, `${id}.html`), { force: true });
    save();
    return { deleted: id };
  }

  return { route, list, get, report, count: () => visible().length };
}

export type Library = ReturnType<typeof createLibrary>;
