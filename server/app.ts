/**
 * Prepress HTTP handler. Runtime-neutral (node:http compatible), used by:
 *  - the standalone binary (server/main.ts, compiled with Bun)
 *  - `npm run dev` (mounted as Vite middleware)
 *
 * Routes
 *   /?admin=1 (any path)     admin app (the Gutenberg-style editor)
 *   /, /<slug>/              preview of the published site (served from outDir)
 *   /uploads/<file>          uploaded media
 *   /api/*                   admin API (session cookie required when a password is set)
 *
 * Publish writes a plain static site into outDir, servable by any web server
 * (nginx/Apache/a hosting panel) without Prepress running:
 *   index.html, <slug>/index.html, 404.html, uploads/*
 * Only files listed in the manifest (files Prepress wrote) are ever removed.
 * A file Prepress would overwrite that it did not write is first copied to
 * dataDir/backup/<time>/.
 *
 * Storage (dataDir, private)
 *   draft.json               { site, brief, isSample, savedAt }   autosaved by the editor
 *   published.json           { site, files[], publishedAt }        what the last publish wrote
 *   uploads/*                media library (copied into outDir on publish)
 *   deploy.json, deploys/    deploy targets (server/deploy.ts): after Publish, the
 *                            files in outDir are pushed to other folders / SFTP servers
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { join, extname, basename, dirname, resolve, sep } from 'node:path';
import { ConflictError, DraftStore } from './store.ts';
import { createMcpHandler } from './mcp.ts';
import { createDeployer } from './deploy.ts';

/** The headless site engine (src/lib/engine.ts). Injected so tests and dev can load it from source. */
export type Engine = typeof import('../src/lib/engine');

export interface ServerOptions {
  dataDir: string;
  /** Where Publish writes the static site. Default: <dataDir>/public. */
  outDir?: string;
  /** Public URL of the site (e.g. https://example.com) for "View site" links. */
  siteUrl?: string;
  /** Admin app HTML. When absent (dev), admin requests fall through to `next`. */
  adminHtml?: string;
  /** Admin password. Empty = no login (only sensible on localhost). */
  password?: string;
  anthropicKey?: string;
  model?: string;
  /** Enables server-side publish/export and the MCP endpoint. */
  engine?: Engine;
  /** Fixed bearer token for /mcp. Default: generated into <data>/mcp-token.txt. */
  mcpToken?: string;
  /** false disables the MCP endpoint. */
  mcp?: boolean;
  /** sftp executable for remote deploys (tests use a stand-in). Default: `sftp` on PATH. */
  sftpBin?: string;
}

type Next = () => void;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
};
const UPLOAD_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.mp4', '.webm', '.mp3', '.pdf']);
const MAX_UPLOAD = 50 * 1024 * 1024;
const MAX_JSON = 100 * 1024 * 1024;
const COOKIE = 'pp_session';

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

function writeAtomic(file: string, data: string | Buffer) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, file);
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

async function readJson(req: IncomingMessage): Promise<any> {
  const buf = await readBody(req, MAX_JSON);
  try {
    return JSON.parse(buf.toString('utf8') || 'null');
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

function send(res: ServerResponse, status: number, body: string | Buffer, type = 'text/plain; charset=utf-8', headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff', ...headers });
  res.end(body);
}

const json = (res: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}) =>
  send(res, status, JSON.stringify(value), 'application/json', { 'cache-control': 'no-store', ...headers });

function cookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const sha = (s: string) => createHash('sha256').update(s).digest();

const NOT_PUBLISHED = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Coming soon</title>
<style>body{font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f6f4;color:#1d1d1b}main{text-align:center;padding:24px}a{color:inherit}</style></head>
<body><main><h1>Nothing published yet</h1><p>Open the <a href="/?admin=1">editor</a> to build and publish this site.</p></main></body></html>`;

export function createHandler(opts: ServerOptions) {
  const dir = opts.dataDir;
  const outDir = resolve(opts.outDir ?? join(dir, 'public'));
  const uploadsDir = join(dir, 'uploads');
  const manifestFile = join(dir, 'published.json');
  const inside = (child: string, parent: string) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
  // The data dir holds the password, sessions and drafts: it must never be web-served.
  if (inside(resolve(dir), outDir)) throw new Error(`Output folder ${outDir} would publish the private data folder ${resolve(dir)}. Choose a different --out or --data.`);
  for (const d of [dir, outDir, uploadsDir]) mkdirSync(d, { recursive: true });

  const readManifest = (): { files: string[]; publishedAt?: string } => {
    try {
      return JSON.parse(readFileSync(manifestFile, 'utf8'));
    } catch {
      return { files: [] };
    }
  };

  /** Write the static site. Returns the list of files (relative to outDir) it owns. */
  function writeStatic(pages: Record<string, string>, notFound: string | undefined, prev: string[]): string[] {
    const owned = new Set(prev);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const files: [string, Buffer | string][] = [];
    for (const [slug, html] of Object.entries(pages)) files.push([slug === 'home' ? 'index.html' : `${slug}/index.html`, String(html)]);
    if (typeof notFound === 'string') files.push(['404.html', notFound]);
    for (const f of readdirSync(uploadsDir)) {
      if (UPLOAD_EXT.has(extname(f).toLowerCase())) files.push([`uploads/${f}`, readFileSync(join(uploadsDir, f))]);
    }
    for (const [rel, data] of files) {
      const target = join(outDir, rel);
      if (existsSync(target) && !owned.has(rel)) {
        // Not ours (e.g. a hosting panel's placeholder index.html): keep a copy.
        const backup = join(dir, 'backup', stamp, rel);
        mkdirSync(dirname(backup), { recursive: true });
        copyFileSync(target, backup);
      }
      mkdirSync(dirname(target), { recursive: true });
      if (rel.startsWith('uploads/') && existsSync(target) && owned.has(rel) && statSync(target).size === (data as Buffer).length) continue;
      writeAtomic(target, data);
    }
    const now = new Set(files.map(([rel]) => rel));
    // Remove pages/uploads from the previous publish that no longer exist — only files we wrote.
    for (const rel of prev) {
      if (now.has(rel) || rel.includes('..')) continue;
      const target = join(outDir, rel);
      if (existsSync(target)) rmSync(target);
      const parent = dirname(target);
      if (parent !== outDir && existsSync(parent) && readdirSync(parent).length === 0) rmdirSync(parent);
    }
    return [...now];
  }

  // Session tokens are stored hashed so the file can't be replayed as cookies.
  const sessionsFile = join(dir, 'sessions.json');
  const sessions = new Set<string>(existsSync(sessionsFile) ? JSON.parse(readFileSync(sessionsFile, 'utf8')) : []);
  const saveSessions = () => writeAtomic(sessionsFile, JSON.stringify([...sessions].slice(-50)));
  const tokenId = (t: string) => sha(t).toString('hex');
  const password = opts.password ?? '';
  const authed = (req: IncomingMessage) => !password || sessions.has(tokenId(cookies(req)[COOKIE] ?? ''));

  const isAdmin = (url: URL) => url.searchParams.get('admin') === '1';
  const store = new DraftStore(dir);
  const exportsDir = join(dir, 'exports');

  const mcpEnabled = !!opts.engine && opts.mcp !== false;
  const tokenFile = join(dir, 'mcp-token.txt');
  const newToken = () => {
    const t = `pp_${randomBytes(24).toString('base64url')}`;
    writeFileSync(tokenFile, t + '\n', { mode: 0o600 });
    return t;
  };
  let mcpToken = !mcpEnabled ? '' : opts.mcpToken || (existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '') || newToken();

  const bearerOk = (req: IncomingMessage) => {
    const token = mcpToken;
    const h = String(req.headers.authorization ?? '');
    return !!token && h.startsWith('Bearer ') && timingSafeEqual(sha(h.slice(7).trim()), sha(token));
  };

  const deployer = createDeployer({ dataDir: dir, outDir, sftpBin: opts.sftpBin });
  const deploy = (which?: string, full = false) => deployer.deploy(readManifest().files, which, full);

  /** Render the current draft on the server, write the static site, then deploy to the auto targets. */
  async function publishSite(by: string, opt: { deploy?: boolean } = {}) {
    const engine = opts.engine;
    if (!engine) throw Object.assign(new Error('Server-side publishing is not available'), { status: 501 });
    const draft = store.read();
    if (!draft?.site?.pages?.length) throw Object.assign(new Error('There is no site to publish yet'), { status: 400 });
    engine.registerCustomBlocks(draft.site.blocks ?? []);
    const { pages, notFound } = engine.publishFiles(draft.site);
    const files = writeStatic(pages, notFound, readManifest().files);
    const publishedAt = new Date().toISOString();
    writeAtomic(manifestFile, JSON.stringify({ publishedAt, outDir, files, by }));
    await store.patch({ publishedHash: engine.siteHash(draft.site) });
    const deploys = opt.deploy === false ? [] : await deploy('auto');
    return { publishedAt, outDir, siteUrl: opts.siteUrl ?? null, files: files.length, pages: Object.keys(pages), deploys };
  }

  /** Build the WordPress export zip from the current draft into <data>/exports. */
  async function exportWordPress() {
    const engine = opts.engine;
    if (!engine) throw Object.assign(new Error('Server-side export is not available'), { status: 501 });
    const draft = store.read();
    if (!draft?.site?.pages?.length) throw Object.assign(new Error('There is no site to export yet'), { status: 400 });
    engine.registerCustomBlocks(draft.site.blocks ?? []);
    const res = await engine.exportSite(draft.site);
    mkdirSync(exportsDir, { recursive: true });
    writeAtomic(join(exportsDir, res.filename), Buffer.from(res.bytes));
    return { file: res.filename, path: `/api/exports/${res.filename}`, stats: res.stats };
  }

  const mcp = mcpEnabled && opts.engine ? createMcpHandler({ store, engine: opts.engine, publishSite, exportWordPress, deploy, deployTargets: deployer.view, siteUrl: opts.siteUrl }) : null;

  // ---------- API ----------

  async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
    const route = `${req.method} ${url.pathname}`;

    // Same-origin check for state-changing requests (cookie is SameSite=Strict too).
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'Cross-origin request refused' });
    }

    if (route === 'GET /api/health') {
      return json(res, 200, { ok: !!opts.anthropicKey, model: opts.model, server: true, auth: password ? authed(req) : null, siteUrl: opts.siteUrl ?? null });
    }
    if (route === 'POST /api/login') {
      const { password: given } = (await readJson(req)) ?? {};
      if (!password) return json(res, 200, { ok: true });
      if (typeof given !== 'string' || !timingSafeEqual(sha(given), sha(password))) {
        await new Promise((r) => setTimeout(r, 400));
        return json(res, 401, { error: 'Wrong password' });
      }
      const token = randomBytes(32).toString('hex');
      sessions.add(tokenId(token));
      saveSessions();
      return json(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000` });
    }
    if (route === 'POST /api/logout') {
      sessions.delete(tokenId(cookies(req)[COOKIE] ?? ''));
      saveSessions();
      return json(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
    }

    // Export downloads also accept the MCP bearer token, so an AI can fetch what it exported.
    if (req.method === 'GET' && url.pathname.startsWith('/api/exports/') && (authed(req) || bearerOk(req))) {
      const file = join(exportsDir, basename(decodeURIComponent(url.pathname.slice('/api/exports/'.length))));
      if (!file.endsWith('.zip') || !existsSync(file)) return json(res, 404, { error: 'Not found' });
      return send(res, 200, readFileSync(file), 'application/zip', { 'content-disposition': `attachment; filename="${basename(file)}"` });
    }

    if (!authed(req)) return json(res, 401, { error: 'Sign in required', code: 'auth' });

    if (route === 'GET /api/site') {
      return json(res, 200, { draft: store.read(), publishedAt: readManifest().publishedAt ?? null, outDir, siteUrl: opts.siteUrl ?? null });
    }
    if (route === 'PUT /api/site') {
      const body = await readJson(req);
      if (!body?.site?.pages) return json(res, 400, { error: 'Expected { site }' });
      const { baseRev, ...rest } = body;
      try {
        const d = await store.put(rest, typeof baseRev === 'number' ? baseRev : undefined, 'editor');
        return json(res, 200, { ok: true, rev: d.rev });
      } catch (e) {
        if (e instanceof ConflictError) return json(res, 409, { error: e.message, code: 'conflict', draft: e.current });
        throw e;
      }
    }
    if (route === 'GET /api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write(`event: hello\ndata: ${JSON.stringify({ rev: store.read()?.rev ?? 0 })}\n\n`);
      const off = store.subscribe((e) => res.write(`event: change\ndata: ${JSON.stringify(e)}\n\n`));
      const ping = setInterval(() => res.write(': ping\n\n'), 25000);
      req.on('close', () => {
        off();
        clearInterval(ping);
      });
      return;
    }
    if (route === 'GET /api/mcp') {
      return json(res, 200, { enabled: mcpEnabled, token: mcpEnabled ? mcpToken : null, fixed: !!opts.mcpToken });
    }
    if (route === 'POST /api/mcp/token') {
      if (!mcpEnabled) return json(res, 404, { error: 'MCP is disabled' });
      if (opts.mcpToken) return json(res, 409, { error: 'The token is set with --mcp-token / PREPRESS_MCP_TOKEN' });
      mcpToken = newToken();
      return json(res, 200, { ok: true });
    }
    if (route === 'POST /api/export') {
      return json(res, 200, await exportWordPress());
    }
    if (route === 'POST /api/publish') {
      const body = await readJson(req);
      if (!body?.pages && opts.engine) return json(res, 200, { ok: true, ...(await publishSite('editor', { deploy: body?.deploy !== false })) });
      const pages: Record<string, string> = body?.pages ?? {};
      if (!body?.site?.pages || !Object.keys(pages).length) return json(res, 400, { error: 'Expected { site, pages }' });
      for (const slug of Object.keys(pages)) if (!SLUG.test(slug)) return json(res, 400, { error: `Bad page slug: ${slug}` });
      if (!pages.home) return json(res, 400, { error: 'The front page (home) is missing' });
      const files = writeStatic(pages, body.notFound, readManifest().files);
      const publishedAt = new Date().toISOString();
      writeAtomic(manifestFile, JSON.stringify({ publishedAt, outDir, files, site: body.site }));
      const deploys = body.deploy === false ? [] : await deploy('auto');
      return json(res, 200, { ok: true, publishedAt, outDir, files: files.length, deploys });
    }
    if (route === 'GET /api/deploy') {
      return json(res, 200, { targets: deployer.view(), outDir, publishedAt: readManifest().publishedAt ?? null });
    }
    if (route === 'PUT /api/deploy') {
      const body = await readJson(req);
      try {
        deployer.save(body?.targets);
      } catch (e: any) {
        return json(res, 400, { error: String(e?.message ?? e) });
      }
      return json(res, 200, { targets: deployer.view() });
    }
    if (route === 'POST /api/deploy/test') {
      return json(res, 200, await deployer.test((await readJson(req))?.target));
    }
    if (route === 'POST /api/deploy') {
      const body = (await readJson(req)) ?? {};
      if (!readManifest().files.includes('index.html')) return json(res, 400, { error: 'Nothing published yet: Publish first' });
      const which = typeof body.target === 'string' ? body.target : 'all';
      return json(res, 200, { deploys: await deploy(which, body.full === true) });
    }
    if (route === 'POST /api/media') {
      const name = basename(decodeURIComponent(String(req.headers['x-filename'] ?? 'file')));
      const ext = extname(name).toLowerCase();
      if (!UPLOAD_EXT.has(ext)) return json(res, 415, { error: `File type ${ext || '(none)'} is not allowed` });
      const buf = await readBody(req, MAX_UPLOAD);
      const stem = name.slice(0, -ext.length).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
      const file = `${stem}-${randomBytes(4).toString('hex')}${ext}`;
      writeFileSync(join(uploadsDir, file), buf);
      return json(res, 200, { url: `/uploads/${file}`, id: file, mime: MIME[ext] });
    }
    if (route === 'GET /api/media') {
      const items = readdirSync(uploadsDir)
        .filter((f) => UPLOAD_EXT.has(extname(f).toLowerCase()))
        .map((f) => ({ id: f, url: `/uploads/${f}`, mime: MIME[extname(f).toLowerCase()], date: statSync(join(uploadsDir, f)).mtimeMs }))
        .sort((a, b) => b.date - a.date);
      return json(res, 200, { items });
    }
    if (route === 'POST /api/claude') return claude(req, res);

    return json(res, 404, { error: 'Not found' });
  }

  async function claude(req: IncomingMessage, res: ServerResponse) {
    if (!opts.anthropicKey) return json(res, 500, { error: 'ANTHROPIC_API_KEY is not set' });
    const { prompt } = (await readJson(req)) ?? {};
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': opts.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 16000,
        system: 'You produce machine-readable JSON for a website builder. Reply with one JSON value only.',
        messages: [{ role: 'user', content: String(prompt ?? '') }],
      }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      return json(res, r.status, { error: j?.error?.message ?? 'Anthropic API error', code: r.status === 429 ? 'rate_limited' : 'upstream_error' });
    }
    const text = (j.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
    return json(res, 200, { text });
  }

  // ---------- public site ----------

  function uploads(res: ServerResponse, url: URL) {
    const name = basename(decodeURIComponent(url.pathname.slice('/uploads/'.length)));
    const file = join(uploadsDir, name);
    const ext = extname(name).toLowerCase();
    if (!UPLOAD_EXT.has(ext) || !existsSync(file)) return send(res, 404, 'Not found');
    return send(res, 200, readFileSync(file), MIME[ext], { 'cache-control': 'public, max-age=31536000, immutable' });
  }

  function site(res: ServerResponse, url: URL) {
    const path = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, '');
    const headers = { 'cache-control': 'no-cache' };
    const owned = new Set(readManifest().files);
    const rel = path === '' ? 'index.html' : SLUG.test(path) ? `${path}/index.html` : null;
    if (rel && owned.has(rel) && existsSync(join(outDir, rel))) {
      // Canonical URLs end in a slash, as WordPress pages (and static hosts) do.
      if (path && !url.pathname.endsWith('/')) return send(res, 301, '', 'text/plain', { location: `/${path}/${url.search}` });
      return send(res, 200, readFileSync(join(outDir, rel)), MIME['.html'], headers);
    }
    if (!owned.has('index.html')) return send(res, path ? 404 : 200, NOT_PUBLISHED, MIME['.html'], headers);
    const nf = join(outDir, '404.html');
    const has404 = owned.has('404.html') && existsSync(nf);
    return send(res, 404, has404 ? readFileSync(nf) : 'Not found', has404 ? MIME['.html'] : 'text/plain', headers);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse, next?: Next) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (url.pathname === '/mcp') {
        if (!mcp) return json(res, 404, { error: 'MCP is disabled on this server' });
        if (!bearerOk(req)) return json(res, 401, { error: 'Missing or wrong bearer token' }, { 'www-authenticate': 'Bearer' });
        return await mcp(req, res);
      }
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') return next ? next() : send(res, 405, 'Method not allowed');
      if (url.pathname.startsWith('/uploads/')) return uploads(res, url);
      if (isAdmin(url)) {
        if (opts.adminHtml) return send(res, 200, opts.adminHtml, MIME['.html'], { 'cache-control': 'no-cache', 'x-frame-options': 'DENY' });
        return next ? next() : send(res, 500, 'Admin app not bundled');
      }
      // In dev, let Vite serve its own modules and assets.
      if (next && !(req.headers.accept ?? '').includes('text/html')) return next();
      if (url.pathname === '/favicon.ico') return send(res, 404, '');
      return site(res, url);
    } catch (e: any) {
      if (!res.headersSent) json(res, e?.status ?? 500, { error: String(e?.message ?? e) });
    }
  };
}
