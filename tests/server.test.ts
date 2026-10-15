// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler } from '../server/app';

let server: Server;
let base = '';
let dir = '';
let out = '';

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-'));
  out = join(dir, 'www');
  // A web root that already has files, as a hosting panel creates them.
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), 'PANEL PLACEHOLDER');
  writeFileSync(join(out, '.htaccess'), 'panel rules');
  const handle = createHandler({ dataDir: join(dir, 'data'), outDir: out, adminHtml: '<!doctype html><title>admin</title>' });
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const site = { name: 'S', tagline: '', design: {}, header: '', footer: '', pages: [{ id: 'a', title: 'Home', slug: 'home', content: '' }, { id: 'b', title: 'About', slug: 'about', content: '' }] };
const req = (path: string, init: RequestInit = {}) => fetch(base + path, { ...init, headers: { ...(init.headers as any) }, redirect: 'manual' });

describe('server', () => {
  test('placeholder before publishing; admin only at ?admin=1', async () => {
    const home = await req('/');
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('Nothing published yet');
    expect(await (await req('/about/?admin=1')).text()).toContain('<title>admin</title>');
  });

  test('no password; only requests addressed to localhost are answered (DNS rebinding)', async () => {
    expect((await req('/api/site')).status).toBe(200);
    const port = Number(new URL(base).port);
    const status = (host: string) =>
      new Promise<number>((ok, fail) => request({ host: '127.0.0.1', port, path: '/api/site', headers: { host } }, (r) => { r.resume(); ok(r.statusCode!); }).on('error', fail).end());
    expect(await status(`evil.example:${port}`)).toBe(421);
    expect(await status(`127.0.0.1.nip.io:${port}`)).toBe(421);
    expect(await status(`localhost:${port}`)).toBe(200);
    expect(await status(`[::1]:${port}`)).toBe(200);
  });

  test('draft round trip', async () => {
    expect((await req('/api/site', { method: 'PUT', body: JSON.stringify({ site, brief: 'b' }) })).status).toBe(200);
    const j = await (await req('/api/site')).json();
    expect(j.draft.site.pages).toHaveLength(2);
    expect(j.draft.brief).toBe('b');
  });

  test('publish writes a plain static site into the output folder', async () => {
    const r = await req('/api/publish', { method: 'POST', body: JSON.stringify({ site, pages: { home: 'HOME', about: 'ABOUT' }, notFound: 'NF' }) });
    expect(r.status).toBe(200);
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toBe('HOME');
    expect(readFileSync(join(out, 'about', 'index.html'), 'utf8')).toBe('ABOUT');
    expect(readFileSync(join(out, '404.html'), 'utf8')).toBe('NF');
    // Files we didn't write are kept, or backed up before being replaced.
    expect(readFileSync(join(out, '.htaccess'), 'utf8')).toBe('panel rules');
    expect(existsSync(join(dir, 'data', 'backup'))).toBe(true);
    expect(existsSync(join(out, 'draft.json'))).toBe(false);
  });

  test('the preview serves the published files at / and /<slug>/', async () => {
    expect(await (await req('/')).text()).toBe('HOME');
    expect(await (await req('/about/')).text()).toBe('ABOUT');
    expect((await req('/about')).headers.get('location')).toBe('/about/');
    const nf = await req('/missing/');
    expect(nf.status).toBe(404);
    expect(await nf.text()).toBe('NF');
    // Republishing replaces the whole set.
    await req('/api/publish', { method: 'POST', body: JSON.stringify({ site, pages: { home: 'HOME2' } }) });
    expect((await req('/about/')).status).toBe(404);
    expect(existsSync(join(out, 'about'))).toBe(false);
    expect(readFileSync(join(out, '.htaccess'), 'utf8')).toBe('panel rules');
  });

  test('refuses an output folder that would expose the data folder', () => {
    expect(() => createHandler({ dataDir: join(dir, 'www', 'data'), outDir: out })).toThrow(/private data folder/);
    expect(() => createHandler({ dataDir: dir, outDir: dir })).toThrow(/private data folder/);
  });

  test('rejects bad slugs, cross-origin writes and unsafe uploads', async () => {
    expect((await req('/api/publish', { method: 'POST', body: JSON.stringify({ site, pages: { '../x': 'x' } }) })).status).toBe(400);
    expect((await req('/api/site', { method: 'PUT', headers: { origin: 'https://evil.example' }, body: JSON.stringify({ site }) })).status).toBe(403);
    expect((await req('/api/media', { method: 'POST', headers: { 'x-filename': 'a.html' }, body: '<script>' })).status).toBe(415);
    expect((await req('/uploads/..%2Fdraft.json')).status).toBe(404);
  });

  test('uploads media', async () => {
    const r = await req('/api/media', { method: 'POST', headers: { 'x-filename': 'My Photo.png', 'content-type': 'image/png' }, body: new Uint8Array([137, 80, 78, 71]) });
    const m = await r.json();
    expect(m.url).toMatch(/^\/uploads\/my-photo-[0-9a-f]{8}\.png$/);
    const g = await req(m.url);
    expect(g.headers.get('content-type')).toBe('image/png');
    await req('/api/publish', { method: 'POST', body: JSON.stringify({ site, pages: { home: 'HOME3' } }) });
    expect(existsSync(join(out, m.url))).toBe(true);
    expect((await (await req('/api/media')).json()).items).toHaveLength(1);
  });
});

describe('AI connection depends on the runtime', () => {
  const start = async (runtime: 'desktop' | 'server') => {
    const d = mkdtempSync(join(tmpdir(), `prepress-${runtime}-`));
    const engine = {} as any; // only presence matters for the MCP switch
    const home = join(d, 'home');
    const h = createHandler({ dataDir: join(d, 'My Site'), runtime, engine, homeDir: home, stdioCommand: { command: '/Applications/Prepress.app/Contents/MacOS/prepress', args: ['mcp', '--data', d] } });
    const s = createServer((q, r) => void h(q, r));
    await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
    return { b: `http://127.0.0.1:${(s.address() as any).port}`, close: () => (s.close(), rmSync(d, { recursive: true, force: true })) };
  };

  test('desktop app: stdio only, no HTTP /mcp', async () => {
    const { b, close } = await start('desktop');
    try {
      const info = await (await fetch(`${b}/api/mcp`)).json();
      expect(info).toMatchObject({ mode: 'stdio', stdio: { args: expect.arrayContaining(['mcp']) } });
      expect(info.token).toBeUndefined();
      expect((await fetch(`${b}/mcp`, { method: 'POST' })).status).toBe(404);
      expect((await (await fetch(`${b}/api/health`)).json()).runtime).toBe('desktop');
      // One-click connect to an AI app (here Cursor, in a temp home folder).
      expect(info.name).toBe('prepress-my-site');
      expect(info.clients.find((c: any) => c.id === 'cursor')).toMatchObject({ installed: false, connected: false });
      const post = (body: unknown) => fetch(`${b}/api/mcp/clients`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const r = await (await post({ id: 'cursor', action: 'connect' })).json();
      expect(r.client).toMatchObject({ id: 'cursor', connected: true });
      expect((await post({ id: 'nope', action: 'connect' })).status).toBe(404);
      expect((await post({ id: 'cursor', action: 'delete-everything' })).status).toBe(400);
      expect((await fetch(`${b}/api/mcp/clients`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"id":"cursor","action":"disconnect"}' })).status).toBe(403);
      expect((await (await post({ id: 'cursor', action: 'disconnect' })).json()).client.connected).toBe(false);
    } finally {
      close();
    }
  });

  test('server: HTTP endpoint with token, no stdio', async () => {
    const { b, close } = await start('server');
    try {
      const info = await (await fetch(`${b}/api/mcp`)).json();
      expect(info).toMatchObject({ mode: 'http', enabled: true, token: expect.stringMatching(/^pp_/) });
      expect(info.stdio).toBeUndefined();
      expect((await fetch(`${b}/api/mcp/clients`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"id":"cursor","action":"connect"}' })).status).toBe(404);
      expect((await fetch(`${b}/mcp`, { method: 'POST' })).status).toBe(401);
    } finally {
      close();
    }
  });

  test('the AI proxy is gone', async () => {
    const { b, close } = await start('server');
    try {
      expect((await fetch(`${b}/api/claude`, { method: 'POST', body: '{}' })).status).toBe(404);
    } finally {
      close();
    }
  });
});
