// @vitest-environment node
// Free hosting: the hosting API (names, tokens, quotas, presigned uploads) and
// Prepress publishing to it end to end, against an S3 stand-in.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHostingApi } from '../hosting/api';
import { presign } from '../hosting/presign';
import { createHandler } from '../server/app';

const listen = (s: Server) => new Promise<string>((r) => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${(s.address() as any).port}`)));

let dir = '';
let s3: Server;
let s3Base = '';
const objects = new Map<string, { body: Buffer; type?: string; cache?: string }>();
let api: Server;
let apiBase = '';
let prepress: Server;
let ppBase = '';

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-hosting-'));
  // S3 stand-in: presigned PUT/DELETE/GET on /<bucket>/<key>; checks the signed length.
  s3 = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const u = new URL(req.url!, 'http://x');
      const key = decodeURIComponent(u.pathname);
      if (req.method === 'PUT') {
        if (!u.searchParams.get('X-Amz-Signature')) return res.writeHead(403).end();
        const body = Buffer.concat(chunks);
        if (Number(req.headers['content-length']) !== body.length) return res.writeHead(400).end();
        objects.set(key, { body, type: req.headers['content-type'], cache: req.headers['cache-control'] as string });
        return res.writeHead(200).end();
      }
      if (req.method === 'DELETE') {
        objects.delete(key);
        return res.writeHead(204).end();
      }
      const o = objects.get(key);
      if (!o) return res.writeHead(404).end();
      res.writeHead(200, { 'content-type': o.type ?? 'application/octet-stream' }).end(o.body);
    });
  });
  s3Base = await listen(s3);

  const handle = createHostingApi({ domain: 'prepress.test', dataDir: join(dir, 'api'), bucket: 'sites', region: 'fr-par', endpoint: s3Base, accessKeyId: 'AK', secretAccessKey: 'SK', maxSiteBytes: 2000, claimsPerHour: 5 });
  api = createServer((q, r) => void handle(q, r));
  apiBase = await listen(api);

  const h = createHandler({ dataDir: join(dir, 'site'), adminHtml: '<!doctype html>', hostingApi: apiBase });
  prepress = createServer((q, r) => void h(q, r));
  ppBase = await listen(prepress);
});

afterAll(() => {
  for (const s of [s3, api, prepress]) s?.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = async (path: string, body: unknown) => {
  const r = await fetch(`${apiBase}/api/v1${path}`, { method: 'POST', body: JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as any };
};
const A = 'a'.repeat(64);
const B = 'b'.repeat(64);

describe('presigned URLs', () => {
  test('match AWS’s published example (GET object, 24 h)', () => {
    const url = presign({ method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt', region: 'us-east-1', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', expiresIn: 86400, date: new Date('2013-05-24T00:00:00Z') });
    expect(url).toContain('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
  });
});

describe('hosting API', () => {
  test('names: rules, reserved, availability', async () => {
    const check = async (n: string) => (await fetch(`${apiBase}/api/v1/sites/${n}`)).json() as any;
    expect(await check('harbor-bakery')).toMatchObject({ valid: true, available: true, url: 'https://harbor-bakery.prepress.test' });
    expect((await check('ab')).valid).toBe(false);
    expect((await check('-bad')).valid).toBe(false);
    expect(await check('www')).toMatchObject({ valid: false, reason: 'That name is reserved.' });
    expect((await check('xn--abc')).valid).toBe(false);
  });

  test('first come, first served; only the same token can update', async () => {
    expect((await post('/sites/harbor/claim', { token: A })).status).toBe(201);
    expect((await post('/sites/harbor/claim', { token: A })).body).toMatchObject({ claimed: false, owner: true });
    const other = await post('/sites/harbor/claim', { token: B });
    expect(other.status).toBe(403);
    expect(other.body.error).toMatch(/belongs to another/);
    expect((await post('/sites/harbor/presign', { token: B, path: 'index.html', size: 3 })).status).toBe(403);
    expect((await post('/sites/harbor/presign', { token: 'short', path: 'index.html', size: 3 })).status).toBe(401);
    // The owner's token is recognised on the availability check.
    const mine = await (await fetch(`${apiBase}/api/v1/sites/harbor`, { headers: { 'x-site-token': A } })).json();
    expect(mine).toMatchObject({ available: false, owner: true });
    expect(await (await fetch(`${apiBase}/api/v1/sites/harbor`)).json()).toMatchObject({ owner: false, reason: 'Taken' });
    // Only a hash is stored.
    expect(readFileSync(join(dir, 'api', 'sites.json'), 'utf8')).not.toContain(A);
    expect(statSync(join(dir, 'api', 'sites.json')).mode & 0o077).toBe(0);
  });

  test('presign: allowed paths and types only, size quota, type and caching fixed by the API', async () => {
    const ok = await post('/sites/harbor/presign', { token: A, path: 'about/index.html', size: 10 });
    expect(ok.status).toBe(200);
    expect(ok.body.headers).toEqual({ 'content-type': 'text/html; charset=utf-8', 'content-length': '10', 'cache-control': 'public, max-age=0, must-revalidate' });
    expect(ok.body.url).toContain(`${s3Base}/sites/harbor/about/index.html?`);
    expect(ok.body.url).toContain('X-Amz-SignedHeaders=cache-control%3Bcontent-length%3Bcontent-type%3Bhost');
    for (const path of ['../x.html', 'a/../../b.html', '.env', 'x.php', 'x.svg', 'a/b/c/d/e/f.html', 'evil.exe']) expect((await post('/sites/harbor/presign', { token: A, path, size: 1 })).status, path).toBeGreaterThanOrEqual(400);
    expect((await post('/sites/harbor/presign', { token: A, path: 'big.png', size: 5000 })).status).toBe(413);
  });

  test('TLS gate and 404 pages', async () => {
    const ask = async (d: string) => (await fetch(`${apiBase}/api/v1/tls-ask?domain=${d}`)).status;
    expect(await ask('harbor.prepress.test')).toBe(200);
    expect(await ask('prepress.test')).toBe(200);
    expect(await ask('nobody.prepress.test')).toBe(404);
    expect(await ask('a.harbor.prepress.test')).toBe(404);
    expect(await ask('harbor.evil.example')).toBe(404);
    objects.set('/sites/harbor/404.html', { body: Buffer.from('<h1>Custom 404</h1>'), type: 'text/html' });
    const nf = await fetch(`${apiBase}/api/v1/notfound?site=harbor`);
    expect(nf.status).toBe(404);
    expect(await nf.text()).toBe('<h1>Custom 404</h1>');
    expect(await (await fetch(`${apiBase}/api/v1/notfound?site=nobody`)).text()).toMatch(/does not exist/);
  });

  test('claims are rate limited per IP', async () => {
    const h = createHostingApi({ domain: 'prepress.test', dataDir: join(dir, 'api-limit'), bucket: 'sites', region: 'fr-par', endpoint: s3Base, accessKeyId: 'AK', secretAccessKey: 'SK', claimsPerHour: 3 });
    const srv = createServer((q, r) => void h(q, r));
    const base = await listen(srv);
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++) statuses.push((await fetch(`${base}/api/v1/sites/limit-test-${i}/claim`, { method: 'POST', body: JSON.stringify({ token: A }) })).status);
      expect(statuses).toEqual([201, 201, 201, 429]);
    } finally {
      srv.close();
    }
  });

  test('release deletes the files and frees the name', async () => {
    expect((await post('/sites/harbor/release', { token: B })).status).toBe(403);
    expect((await post('/sites/harbor/release', { token: A })).status).toBe(200);
    expect(await (await fetch(`${apiBase}/api/v1/sites/harbor`)).json()).toMatchObject({ available: true });
  });
});

describe('Prepress publishing to free hosting', () => {
  const call = async (path: string, method = 'GET', body?: unknown) => {
    const r = await fetch(ppBase + path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: (await r.json()) as any };
  };
  const site = { name: 'S', pages: [{ id: 'a', slug: 'home' }, { id: 'b', slug: 'about' }] };

  test('check, add prepress://name, publish, update, remove a page', async () => {
    expect((await call('/api/hosting/check?name=corner-cafe')).body).toMatchObject({ available: true, owner: false, domain: 'prepress.digitalno.de' });
    const saved = await call('/api/deploy', 'PUT', { targets: [{ connection: 'prepress://corner-cafe', auto: true }] });
    expect(saved.status).toBe(200);
    expect(saved.body.targets[0]).toMatchObject({ type: 'prepress', name: 'Prepress (free)', connection: 'prepress://corner-cafe', url: 'https://corner-cafe.prepress.digitalno.de' });
    expect((await call('/api/deploy', 'PUT', { targets: [{ connection: 'prepress://www' }] })).body.error).toMatch(/reserved/);

    const first = await call('/api/publish', 'POST', { site, pages: { home: '<h1>Home</h1>', about: '<h1>About</h1>' }, notFound: '<h1>Lost</h1>' });
    expect(first.body.deploys).toMatchObject([{ ok: true, uploaded: 3 }]);
    expect(objects.get('/sites/corner-cafe/index.html')?.body.toString()).toBe('<h1>Home</h1>');
    expect(objects.get('/sites/corner-cafe/about/index.html')?.type).toBe('text/html; charset=utf-8');
    expect(objects.get('/sites/corner-cafe/404.html')?.body.toString()).toBe('<h1>Lost</h1>');
    // The site's token lives in the site folder and is now the owner.
    const token = readFileSync(join(dir, 'site', 'hosting-token'), 'utf8').trim();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect((await call('/api/hosting/check?name=corner-cafe')).body).toMatchObject({ available: false, owner: true });

    const second = await call('/api/publish', 'POST', { site, pages: { home: '<h1>Home v2</h1>' }, notFound: '<h1>Lost</h1>' });
    expect(second.body.deploys).toMatchObject([{ ok: true, uploaded: 1, removed: 1, unchanged: 1 }]);
    expect(objects.has('/sites/corner-cafe/about/index.html')).toBe(false);
  });

  test('a name owned by someone else fails with a clear message', async () => {
    expect((await post('/sites/taken-name/claim', { token: B })).status).toBe(201);
    expect((await call('/api/hosting/check?name=taken-name')).body).toMatchObject({ available: false, owner: false, reason: 'Taken' });
    await call('/api/deploy', 'PUT', { targets: [{ connection: 'prepress://taken-name' }] });
    const r = await call('/api/deploy', 'POST', { target: 'Prepress (free)', full: true });
    expect(r.body.deploys[0].ok).toBe(false);
    expect(r.body.deploys[0].error).toMatch(/already taken by another site/);
  });

  test('a new folder with a copied hosting-token is the same owner (token = identity)', async () => {
    const copy = join(dir, 'copy');
    const h = createHandler({ dataDir: copy, adminHtml: '<!doctype html>', hostingApi: apiBase });
    const s = createServer((q, r) => void h(q, r));
    const base = await listen(s);
    try {
      writeFileSync(join(copy, 'hosting-token'), readFileSync(join(dir, 'site', 'hosting-token')));
      const r = await (await fetch(`${base}/api/hosting/check?name=corner-cafe`)).json();
      expect(r).toMatchObject({ owner: true });
      expect(existsSync(join(copy, 'hosting-token'))).toBe(true);
    } finally {
      s.close();
    }
  });
});

describe('homepage', () => {
  test('shows the desktop version from latest.json next to the download, cached', async () => {
    let calls = 0;
    let version = '0.7.0';
    let windows = false;
    let t = 1_000_000;
    const fake = (async (url: any) => {
      expect(String(url)).toBe('https://cdn.test/_downloads/latest.json');
      calls++;
      return new Response(JSON.stringify({ version, platforms: { 'darwin-aarch64': {}, ...(windows ? { 'windows-x86_64': {} } : {}) } }), { status: 200 });
    }) as typeof fetch;
    const handle = createHostingApi({ domain: 'prepress.test', dataDir: join(dir, 'home'), bucket: 'sites', region: 'fr-par', endpoint: s3Base, accessKeyId: 'AK', secretAccessKey: 'SK', downloadMac: 'https://cdn.test/_downloads/Prepress-mac-arm64.dmg', fetch: fake, now: () => t });
    const srv = createServer((q, r) => void handle(q, r));
    const base = await listen(srv);
    const home = async () => (await fetch(`${base}/`)).text();
    expect(await home()).toContain('Download for Mac <span class="ver">v0.7.0</span>');
    expect(await home()).not.toContain('Download for Windows');
    version = '0.7.1';
    windows = true;
    expect(await home()).toContain('v0.7.0'); // cached
    expect(calls).toBe(1);
    t += 11 * 60_000; // stale: served as is, refreshed behind the scenes
    await home();
    await new Promise((r) => setTimeout(r, 20));
    expect(await home()).toContain('v0.7.1');
    // A release with a Windows build: the installer next to the Mac download.
    expect(await home()).toContain('href="https://cdn.test/_downloads/Prepress-windows-x64-setup.exe">Download for Windows');
    version = '<script>';
    t += 11 * 60_000;
    await home();
    await new Promise((r) => setTimeout(r, 20));
    expect(await home()).toContain('v0.7.1'); // junk is ignored
    srv.close();
  });
});
