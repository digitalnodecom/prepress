// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHandler } from '../server/app';

let server: Server;
let base = '';
let dir = '';
let www = '';
let remote = '';

const FAKE_SFTP = resolve(__dirname, 'fixtures/fake-sftp.mjs');

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-deploy-'));
  www = join(dir, 'www');
  remote = join(dir, 'remote');
  // Both destinations already hold a file Prepress didn't write (a hosting panel placeholder).
  mkdirSync(www, { recursive: true });
  writeFileSync(join(www, 'index.html'), 'PANEL PLACEHOLDER');
  writeFileSync(join(www, 'keep.txt'), 'not ours');
  mkdirSync(join(remote, 'site'), { recursive: true });
  writeFileSync(join(remote, 'site', 'index.html'), 'REMOTE PLACEHOLDER');
  process.env.FAKE_SFTP_ROOT = remote;
  process.env.FAKE_SFTP_LOG = join(dir, 'sftp.log');
  const handle = createHandler({ dataDir: join(dir, 'data'), adminHtml: '<!doctype html>', password: '', sftpBin: FAKE_SFTP });
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const call = async (path: string, method = 'GET', body?: unknown) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as any };
};
const site = { name: 'S', pages: [{ id: 'a', slug: 'home' }, { id: 'b', slug: 'about' }] };
const publish = (pages: Record<string, string>) => call('/api/publish', 'POST', { site, pages, notFound: '<h1>404</h1>' });

describe('deploy targets', () => {
  test('rejects unsafe targets', async () => {
    const bad = [
      { type: 'folder', path: join(dir, 'data', 'x') }, // inside the private data dir
      { type: 'folder', path: dir }, // contains the data dir
      { type: 'sftp', host: '-oProxyCommand=sh', path: 'x' }, // option injection
      { type: 'sftp', host: 'example.com', path: 'a"b' }, // batch quoting
      { type: 'sftp', host: 'example.com', path: '/srv/x', user: 'a b' },
      { type: 'ftp', path: '/x' },
    ];
    for (const t of bad) expect((await call('/api/deploy', 'PUT', { targets: [t] })).status).toBe(400);
    expect((await call('/api/deploy')).body.targets).toEqual([]);
  });

  test('publish deploys to folder + sftp targets; only changed files are re-sent; only our files removed', async () => {
    const saved = await call('/api/deploy', 'PUT', {
      targets: [
        { type: 'folder', name: 'Local', path: www, url: 'http://localhost/', auto: true },
        { type: 'sftp', name: 'Prod', host: 'example.com', user: 'deploy', port: 2222, path: '/site', auto: true },
        { type: 'sftp', name: 'Manual', host: 'example.com', path: 'manual', auto: false },
      ],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.targets.map((t: any) => t.url ?? null)).toEqual(['http://localhost', null, null]);
    writeFileSync(join(dir, 'data', 'uploads', 'pic.png'), 'PNG');

    const first = await publish({ home: '<h1>Home</h1>', about: '<h1>About</h1>' });
    expect(first.status).toBe(200);
    expect(first.body.deploys.map((d: any) => [d.name, d.ok, d.uploaded])).toEqual([['Local', true, 4], ['Prod', true, 4]]);

    for (const root of [www, join(remote, 'site')]) {
      expect(readFileSync(join(root, 'index.html'), 'utf8')).toBe('<h1>Home</h1>');
      expect(readFileSync(join(root, 'about', 'index.html'), 'utf8')).toBe('<h1>About</h1>');
      expect(readFileSync(join(root, 'uploads', 'pic.png'), 'utf8')).toBe('PNG');
    }
    expect(existsSync(join(remote, 'manual'))).toBe(false); // manual target untouched
    // The placeholders were backed up before being replaced.
    expect(readFileSync(join(first.body.deploys[0].backup, 'index.html'), 'utf8')).toBe('PANEL PLACEHOLDER');
    expect(readFileSync(join(first.body.deploys[1].backup, 'index.html'), 'utf8')).toBe('REMOTE PLACEHOLDER');
    // ssh options: batch mode, port, user@host — never an interactive prompt.
    const args = JSON.parse(readFileSync(process.env.FAKE_SFTP_LOG!, 'utf8').trim().split('\n').pop()!);
    expect(args).toEqual(expect.arrayContaining(['BatchMode=yes', '-P', '2222', 'deploy@example.com']));

    // Second publish: about removed, home changed → 1 upload, 2 removals (about page), rest unchanged.
    const second = await publish({ home: '<h1>Home v2</h1>' });
    expect(second.body.deploys.map((d: any) => [d.ok, d.uploaded, d.removed, d.unchanged])).toEqual([[true, 1, 1, 2], [true, 1, 1, 2]]);
    for (const root of [www, join(remote, 'site')]) {
      expect(readFileSync(join(root, 'index.html'), 'utf8')).toBe('<h1>Home v2</h1>');
      expect(existsSync(join(root, 'about'))).toBe(false);
    }
    expect(readFileSync(join(www, 'keep.txt'), 'utf8')).toBe('not ours');

    // Manual deploy of one target, full re-upload.
    const manual = await call('/api/deploy', 'POST', { target: 'Manual', full: true });
    expect(manual.body.deploys).toMatchObject([{ name: 'Manual', ok: true, uploaded: 3 }]);
    expect(readFileSync(join(remote, 'manual', 'index.html'), 'utf8')).toBe('<h1>Home v2</h1>');

    const view = (await call('/api/deploy')).body.targets;
    expect(view.map((t: any) => t.last?.ok)).toEqual([true, true, true]);
  });

  test('failed deploy is reported, publish still succeeds', async () => {
    const targets = (await call('/api/deploy')).body.targets.map(({ last, ...t }: any) => t);
    await call('/api/deploy', 'PUT', { targets: [...targets, { type: 'sftp', name: 'Broken', host: 'denied.example', path: 'x' }] });
    const r = await publish({ home: '<h1>Home v3</h1>' });
    expect(r.status).toBe(200);
    const broken = r.body.deploys.find((d: any) => d.name === 'Broken');
    expect(broken.ok).toBe(false);
    expect(broken.error).toMatch(/Permission denied.*ssh-copy-id/);
    expect(r.body.deploys.filter((d: any) => d.ok).length).toBe(2);
    expect((await call('/api/deploy/test', 'POST', { target: { type: 'sftp', host: 'denied.example', path: 'x' } })).body.ok).toBe(false);
    expect((await call('/api/deploy/test', 'POST', { target: { type: 'sftp', host: 'example.com', path: 'site' } })).body).toMatchObject({ ok: true });
  });

  test('unknown deploy target is 404', async () => {
    expect((await call('/api/deploy', 'POST', { target: 'Nope' })).status).toBe(404);
  });
});
