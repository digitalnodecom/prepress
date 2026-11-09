/**
 * Prepress HTTP handler. Runtime-neutral (node:http compatible), used by:
 *  - the standalone binary (server/main.ts, compiled with Bun)
 *  - `npm run dev` (mounted as Vite middleware)
 *
 * Routes
 *   /?admin=1 (any path)     admin app (the Gutenberg-style editor)
 *   /, /<slug>/              preview of the published site (served from outDir)
 *   /uploads/<file>          uploaded media
 *   /api/*                   admin API
 *
 * There is no password: the server listens on 127.0.0.1 only and answers only
 * requests addressed to a loopback host name (Host header), so other machines
 * can't reach it and web pages can't use DNS rebinding to talk to it.
 * Cross-origin writes are refused (Origin check).
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
 *   deploy.json, deploys/    publish targets (server/deploy.ts): after Publish, the
 *                            files in outDir are uploaded over SFTP / FTP / S3 or to a folder
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { join, extname, basename, dirname, resolve, sep } from 'node:path';
import { ConflictError, DraftStore, withFileLock } from './store.ts';
import { createMcpHandler } from './mcp.ts';
import { createDeployer } from './deploy.ts';
import { createClients } from './clients.ts';
import { HOSTING_DOMAIN, checkName } from './targets/prepress.ts';
import { accountsView, disconnect, pollDeviceFlow, startDeviceFlow, type OAuthOptions, type Provider } from './oauth.ts';
import { createLibraryClient, libraryId } from './library.ts';
import { createMediaImporter, localizeSite } from './media.ts';
import { screenshot, type Device } from './screenshot.ts';

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
  /**
   * Where Prepress runs. 'desktop' (the app): AI clients connect over stdio
   * (`prepress mcp`), so the HTTP /mcp endpoint is off. 'server' (the binary on
   * its own): AI clients connect to /mcp with the bearer token.
   */
  runtime?: 'desktop' | 'server';
  /** Enables server-side publish/export and the MCP endpoint. */
  engine?: Engine;
  /** Fixed bearer token for /mcp. Default: generated into <data>/mcp-token.txt. */
  mcpToken?: string;
  /** false disables the MCP endpoint. */
  mcp?: boolean;
  /** Prepress hosting API base (default https://prepress.digitalno.de, env PREPRESS_HOSTING_API); tests point it at a local one. */
  hostingApi?: string;
  /** Test hooks for connected accounts and the Cloudflare/GitHub targets (server/oauth.ts): fake fetch, API bases, client ids. */
  accounts?: Omit<OAuthOptions, 'dataDir'>;
  /** Test hooks for media import (server/media.ts): fake fetch / DNS. */
  mediaImport?: { fetch?: typeof fetch; resolve?: (host: string) => Promise<string[]> };
  /** Home folder whose AI apps' configs "Connect" edits (tests use a temp folder). Default: the user's home. */
  homeDir?: string;
  /** How to start `prepress mcp` (stdio) for this site; shown in the editor. Absent in dev. */
  stdioCommand?: { command: string; args: string[] };
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

/** Host names the server answers to (any port). Anything else is a DNS-rebinding attempt or a misrouted request. */
const LOOPBACK = /^(?:localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)(?::\d{1,5})?$/i;

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

const sha = (s: string) => createHash('sha256').update(s).digest();

const NOT_PUBLISHED = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Coming soon</title>
<style>body{font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f6f4;color:#1d1d1b}main{text-align:center;padding:24px}a{color:inherit}</style></head>
<body><main><h1>Nothing published yet</h1><p>Open the <a href="/?admin=1">editor</a> to build and publish this site.</p></main></body></html>`;

export interface PublishOptions {
  /** false: only render to outDir. */
  deploy?: boolean;
  /** Upload to these targets (ids or names) instead of the auto ones; [] = none. */
  targets?: string[];
}

export type CoreOptions = Pick<ServerOptions, 'dataDir' | 'outDir' | 'siteUrl' | 'engine' | 'mediaImport' | 'hostingApi' | 'accounts'>;

/**
 * Everything that works on a site's data folder without HTTP: the draft store,
 * publishing to outDir, deploy targets, WordPress export. Shared by the HTTP
 * server and `prepress mcp` (stdio), which may run at the same time on one folder.
 */
export function createSiteCore(opts: CoreOptions) {
  const dir = opts.dataDir;
  const outDir = resolve(opts.outDir ?? join(dir, 'public'));
  const uploadsDir = join(dir, 'uploads');
  const manifestFile = join(dir, 'published.json');
  const inside = (child: string, parent: string) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
  // The data dir holds drafts, deploy credentials and tokens: it must never be web-served.
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
  function writeStatic(pages: Record<string, string>, notFound: string | undefined, prev: string[], extra: Record<string, string> = {}): string[] {
    const owned = new Set(prev);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const files: [string, Buffer | string][] = [];
    for (const [slug, html] of Object.entries(pages)) files.push([slug === 'home' ? 'index.html' : `${slug}/index.html`, String(html)]);
    if (typeof notFound === 'string') files.push(['404.html', notFound]);
    for (const [rel, text] of Object.entries(extra)) if (rel === 'robots.txt' || rel === 'sitemap.xml') files.push([rel, text]);
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

  const store = new DraftStore(dir);
  const exportsDir = join(dir, 'exports');
  const deployer = createDeployer({ dataDir: dir, outDir, hostingApi: opts.hostingApi, accounts: opts.accounts });
  // Publish and deploy take a lock file too: an editor server and a stdio MCP process may share this folder.
  const publishLock = join(dir, 'publish.lock');
  const deployFiles = (which?: string | string[], full = false) => deployer.deploy(readManifest().files, which, full);
  const deploy = (which?: string, full = false) => withFileLock(publishLock, () => deployFiles(which, full), 10 * 60_000);

  /** Render the current draft on the server, write the static site, then deploy to the auto targets. */
  /** Publish: render, write outDir, upload. `targets` (ids or names) picks where to upload; default: the auto targets. */
  async function publishSite(by: string, opt: PublishOptions = {}) {
    return withFileLock(publishLock, () => publishLocked(by, opt), 10 * 60_000);
  }
  async function publishLocked(by: string, opt: PublishOptions) {
    const engine = opts.engine;
    if (!engine) throw Object.assign(new Error('Server-side publishing is not available'), { status: 501 });
    const draft = store.read();
    if (!draft?.site?.pages?.length) throw Object.assign(new Error('There is no site to publish yet'), { status: 400 });
    engine.registerCustomBlocks(draft.site.blocks ?? []);
    // Canonical links and the sitemap need the public address: the site's own, else the first target that has one.
    const targets = deployer.view();
    const fallbackUrl = (targets.find((t) => t.auto && t.url) ?? targets.find((t) => t.url))?.url;
    const { pages, notFound, files: extra } = engine.publishFiles(draft.site, { siteUrl: fallbackUrl });
    const files = writeStatic(pages, notFound, readManifest().files, extra);
    const publishedAt = new Date().toISOString();
    writeAtomic(manifestFile, JSON.stringify({ publishedAt, outDir, files, by }));
    await store.patch({ publishedHash: engine.siteHash(draft.site) });
    const deploys = opt.deploy === false ? [] : await deployFiles(opt.targets ?? 'auto');
    return { publishedAt, outDir, siteUrl: opts.siteUrl ?? null, files: files.length, pages: Object.keys(pages), deploys };
  }

  /** Build the WordPress export zip from the current draft into <data>/exports. */
  async function exportWordPress(o: { blocks?: 'theme' | 'plugin' } = {}) {
    const engine = opts.engine;
    if (!engine) throw Object.assign(new Error('Server-side export is not available'), { status: 501 });
    const draft = store.read();
    if (!draft?.site?.pages?.length) throw Object.assign(new Error('There is no site to export yet'), { status: 400 });
    engine.registerCustomBlocks(draft.site.blocks ?? []);
    const res = await engine.exportSite(draft.site, { blocks: o.blocks === 'plugin' ? 'plugin' : 'theme' });
    mkdirSync(exportsDir, { recursive: true });
    writeAtomic(join(exportsDir, res.filename), Buffer.from(res.bytes));
    return { file: res.filename, path: `/api/exports/${res.filename}`, localPath: join(exportsDir, res.filename), stats: res.stats };
  }


  const importer = createMediaImporter({ dataDir: dir, uploadsDir, ...opts.mediaImport });
  /** Download every external image/video a site links into the media library and point the blocks at the copies. */
  const localizeMedia = async (site: any) => {
    if (!opts.engine) return { site, imported: [], failed: [] };
    opts.engine.registerCustomBlocks(site.blocks ?? []);
    return localizeSite(site, opts.engine as any, importer);
  };

  /** Screenshot a page of the current draft (MCP view_page). */
  async function viewPage(o: { page: any; device?: Device; section?: number; fullPage?: boolean }) {
    const engine = opts.engine;
    if (!engine) throw new Error('Rendering is not available here');
    const draft = store.read();
    if (!draft?.site?.pages) throw new Error('There is no site yet');
    engine.registerCustomBlocks(draft.site.blocks ?? []);
    const html = engine.renderPage(draft.site, o.page, { markSections: true });
    return screenshot({ html, uploadsDir, device: o.device, section: o.section, fullPage: o.fullPage });
  }

  const library = createLibraryClient({ dataDir: dir, base: opts.hostingApi });

  return { library, importer, localizeMedia, viewPage, dir, outDir, uploadsDir, manifestFile, exportsDir, store, deployer, readManifest, writeStatic, publishSite, exportWordPress, deploy };
}

export function createHandler(opts: ServerOptions) {
  const core = createSiteCore(opts);
  const { library, importer, localizeMedia, viewPage, dir, outDir, uploadsDir, manifestFile, exportsDir, store, deployer, readManifest, writeStatic, publishSite, exportWordPress, deploy } = core;
  // Writes by a `prepress mcp` process on the same folder reach open editors too.
  store.watch();
  const isAdmin = (url: URL) => url.searchParams.get('admin') === '1';
  const runtime = opts.runtime ?? 'server';
  const clients = runtime === 'desktop' && opts.stdioCommand ? createClients({ dataDir: dir, stdio: opts.stdioCommand, home: opts.homeDir }) : null;
  // The desktop app's AI connection is stdio; no network endpoint needed.
  const mcpEnabled = !!opts.engine && opts.mcp !== false && runtime !== 'desktop';
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

  const mcp = mcpEnabled && opts.engine ? createMcpHandler({ store, engine: opts.engine, publishSite, exportWordPress, deploy, deployTargets: deployer.view, siteUrl: opts.siteUrl, localizeMedia, importMedia: importer.import, uploadsDir, viewPage, library }) : null;

  // ---------- API ----------

  async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
    const route = `${req.method} ${url.pathname}`;

    // Same-origin check for state-changing requests (cookie is SameSite=Strict too).
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // "null" is a sandboxed document (the published-site preview, which may run the owner's scripts).
      const origin = req.headers.origin;
      if (origin && (origin === 'null' || !URL.canParse(origin) || new URL(origin).host !== req.headers.host)) return json(res, 403, { error: 'Cross-origin request refused' });
    }

    if (route === 'GET /api/health') {
      return json(res, 200, { server: true, runtime, siteUrl: opts.siteUrl ?? null, folder: basename(resolve(dir)) });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/exports/')) {
      const file = join(exportsDir, basename(decodeURIComponent(url.pathname.slice('/api/exports/'.length))));
      if (!file.endsWith('.zip') || !existsSync(file)) return json(res, 404, { error: 'Not found' });
      return send(res, 200, readFileSync(file), 'application/zip', { 'content-disposition': `attachment; filename="${basename(file)}"` });
    }


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
      if (runtime === 'desktop') return json(res, 200, { mode: 'stdio', stdio: opts.stdioCommand ?? null, name: clients?.name ?? null, clients: clients?.list() ?? [] });
      return json(res, 200, { mode: 'http', enabled: mcpEnabled, token: mcpEnabled ? mcpToken : null, fixed: !!opts.mcpToken });
    }
    if (route === 'POST /api/mcp/clients') {
      // Desktop app only: add/remove this site in an AI app's MCP config on this computer.
      if (!clients) return json(res, 404, { error: 'Only available in the desktop app' });
      const { id, action } = (await readJson(req)) ?? {};
      if (typeof id !== 'string' || (action !== 'connect' && action !== 'disconnect')) return json(res, 400, { error: 'Expected { id, action: "connect" | "disconnect" }' });
      try {
        return json(res, 200, { client: action === 'connect' ? clients.connect(id) : clients.disconnect(id) });
      } catch (e: any) {
        return json(res, e?.status ?? 400, { error: String(e?.message ?? e) });
      }
    }
    if (route === 'POST /api/mcp/token') {
      if (!mcpEnabled) return json(res, 404, { error: 'MCP is disabled' });
      if (opts.mcpToken) return json(res, 409, { error: 'The token is set with --mcp-token / PREPRESS_MCP_TOKEN' });
      mcpToken = newToken();
      return json(res, 200, { ok: true });
    }
    if (route === 'POST /api/export') {
      const body = await readJson(req).catch(() => null);
      return json(res, 200, await exportWordPress({ blocks: body?.blocks === 'plugin' ? 'plugin' : 'theme' }));
    }
    if (route === 'POST /api/publish') {
      const body = await readJson(req);
      if (!body?.pages && opts.engine) {
        const targets = Array.isArray(body?.targets) ? body.targets.filter((t: unknown): t is string => typeof t === 'string').slice(0, 20) : undefined;
        return json(res, 200, { ok: true, ...(await publishSite('editor', { deploy: body?.deploy !== false, targets })) });
      }
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
    // Library (prepress.digitalno.de/library): browse, import, share — proxied so the site token stays here.
    if (url.pathname.startsWith('/api/library/')) {
      try {
        if (route === 'GET /api/library/items') {
          const p = url.searchParams;
          return json(res, 200, { base: library.base, ...(await library.search({ type: p.get('type') ?? undefined, q: p.get('q') ?? undefined, sort: p.get('sort') ?? undefined, official: p.get('official') === '1' ? '1' : undefined, offset: Number(p.get('offset') ?? 0) || undefined })) });
        }
        if (route === 'GET /api/library/mine') return json(res, 200, { base: library.base, ...(await library.mine()) });
        const item = url.pathname.match(/^\/api\/library\/items\/([^/]+)(\/delete)?$/);
        if (item) {
          const id = libraryId(decodeURIComponent(item[1]));
          if (!id) return json(res, 400, { error: 'Not a library item id or link' });
          if (req.method === 'GET' && !item[2]) return json(res, 200, await library.get(id, url.searchParams.get('import') === '1'));
          if (req.method === 'POST' && item[2]) return json(res, 200, await library.remove(id));
        }
        if (route === 'POST /api/library/share') {
          const draft = (await readJson(req)) ?? {};
          const r = await library.share(draft);
          return json(res, 201, { ...r, url: library.pageUrl(r.id) });
        }
        return json(res, 404, { error: 'Not found' });
      } catch (e: any) {
        return json(res, e?.status && e.status < 600 ? e.status : 502, { error: String(e?.message ?? e) });
      }
    }
    if (route === 'GET /api/hosting/check') {
      // Is <name>.prepress.digitalno.de free? (the Publish dialog's live check)
      const name = String(url.searchParams.get('name') ?? '').toLowerCase().slice(0, 64);
      try {
        return json(res, 200, { domain: HOSTING_DOMAIN, ...(await checkName(name, { dataDir: dir, base: opts.hostingApi })) });
      } catch (e: any) {
        return json(res, 502, { error: String(e?.message ?? e) });
      }
    }
    if (route === 'GET /api/accounts') {
      // Connected GitHub / Cloudflare accounts for publish targets (never the tokens).
      return json(res, 200, accountsView({ ...opts.accounts, dataDir: dir }));
    }
    if (route === 'POST /api/accounts/connect' || route === 'POST /api/accounts/poll' || route === 'POST /api/accounts/disconnect') {
      const body = (await readJson(req)) ?? {};
      const provider = body.provider as Provider;
      if (provider !== 'github' && provider !== 'cloudflare') return json(res, 400, { error: 'Unknown provider' });
      const o: OAuthOptions = { ...opts.accounts, dataDir: dir };
      try {
        if (route === 'POST /api/accounts/connect') return json(res, 200, await startDeviceFlow(provider, o));
        if (route === 'POST /api/accounts/poll') return json(res, 200, await pollDeviceFlow(provider, String(body.id ?? ''), o));
        await disconnect(provider, o);
        return json(res, 200, accountsView(o));
      } catch (e: any) {
        return json(res, e?.status && e.status < 600 ? e.status : 502, { error: String(e?.message ?? e) });
      }
    }
    if (route === 'POST /api/media/import') {
      // Editor: an image linked by URL (inserted, pasted) becomes a media library file.
      const { url } = (await readJson(req)) ?? {};
      if (typeof url !== 'string' || url.length > 4096) return json(res, 400, { error: 'Expected { url }' });
      try {
        const r = await importer.import(url);
        return json(res, 200, { url: r.url, id: r.file, mime: MIME[extname(r.file)], reused: r.reused });
      } catch (e: any) {
        return json(res, 422, { error: String(e?.message ?? e) });
      }
    }
    if (route === 'GET /api/media') {
      const items = readdirSync(uploadsDir)
        .filter((f) => UPLOAD_EXT.has(extname(f).toLowerCase()))
        .map((f) => ({ id: f, url: `/uploads/${f}`, mime: MIME[extname(f).toLowerCase()], date: statSync(join(uploadsDir, f)).mtimeMs }))
        .sort((a, b) => b.date - a.date);
      return json(res, 200, { items });
    }
    return json(res, 404, { error: 'Not found' });
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
    // Published pages may carry the owner's scripts and analytics: serve them sandboxed (an opaque
    // origin), so nothing on them can use this server's API the way the editor on the same host can.
    const headers = { 'cache-control': 'no-cache', 'content-security-policy': 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads' };
    const owned = new Set(readManifest().files);
    if ((path === 'robots.txt' || path === 'sitemap.xml') && owned.has(path) && existsSync(join(outDir, path))) {
      return send(res, 200, readFileSync(join(outDir, path)), path.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8', headers);
    }
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
    if (!LOOPBACK.test(String(req.headers.host ?? ''))) return send(res, 421, 'Prepress only answers on localhost / 127.0.0.1');
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
