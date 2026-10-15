// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler } from '../server/app';

let server: Server;
let base = '';
let dir = '';
let out = '';
let cookie = '';

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-'));
  out = join(dir, 'www');
  // A web root that already has files, as a hosting panel creates them.
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), 'PANEL PLACEHOLDER');
  writeFileSync(join(out, '.htaccess'), 'panel rules');
  const handle = createHandler({ dataDir: join(dir, 'data'), outDir: out, adminHtml: '<!doctype html><title>admin</title>', password: 'secret' });
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const site = { name: 'S', tagline: '', design: {}, header: '', footer: '', pages: [{ id: 'a', title: 'Home', slug: 'home', content: '' }, { id: 'b', title: 'About', slug: 'about', content: '' }] };
const req = (path: string, init: RequestInit = {}) => fetch(base + path, { ...init, headers: { cookie, ...(init.headers as any) }, redirect: 'manual' });

describe('server', () => {
  test('placeholder before publishing; admin only at ?admin=1', async () => {
    const home = await req('/');
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('Nothing published yet');
    expect(await (await req('/about/?admin=1')).text()).toContain('<title>admin</title>');
  });

  test('admin API requires login', async () => {
    expect((await req('/api/site')).status).toBe(401);
    expect((await req('/api/login', { method: 'POST', body: JSON.stringify({ password: 'nope' }) })).status).toBe(401);
    const ok = await req('/api/login', { method: 'POST', body: JSON.stringify({ password: 'secret' }) });
    expect(ok.status).toBe(200);
    cookie = ok.headers.get('set-cookie')!.split(';')[0];
    expect((await req('/api/site')).status).toBe(200);
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

  test('sessions survive a restart; logout revokes', async () => {
    const again = createHandler({ dataDir: join(dir, 'data'), outDir: out, password: 'secret' });
    const s2 = createServer((q, r) => void again(q, r));
    await new Promise<void>((r) => s2.listen(0, '127.0.0.1', r));
    const b2 = `http://127.0.0.1:${(s2.address() as any).port}`;
    expect((await fetch(b2 + '/api/site', { headers: { cookie } })).status).toBe(200);
    s2.close();
    expect(readFileSync(join(dir, 'data', 'sessions.json'), 'utf8')).not.toContain(cookie.split('=')[1]);
    await req('/api/logout', { method: 'POST' });
    expect((await req('/api/site')).status).toBe(401);
  });
});
