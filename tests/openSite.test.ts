// prepress.json: what a published site carries about itself (and never carries), and opening a
// published site from its address.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as engine from '../src/lib/engine';
import { createHandler } from '../server/app';
import { publishFiles } from '../src/lib/publish';
import { absoluteMedia, fetchPublishedSource, sourceLink } from '../server/openSite';
import type { Site } from '../src/lib/types';

let demo: Site;
beforeAll(async () => {
  await engine.generateSite({ kind: 'demo', json: async () => ({}) } as any, engine.DEMO_BRIEF, {
    onPlan: (s) => (demo = s),
    onPage: (id, m) => (demo = engine.setPageContent(demo, id, m)),
  });
}, 60000);

// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

const withExtras = (s: Site): Site =>
  ({
    ...s,
    pages: s.pages.map((p, i) => (i === 0 ? { ...p, content: p.content + '\n<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="/uploads/photo.png" alt="Photo"/></figure>\n<!-- /wp:image -->' } : p)),
    seo: { url: 'https://bakery.example', description: 'Bread at dawn.', image: '/uploads/share.png' },
    integrations: { ga4: 'G-ABC1234567' },
    code: { head: '<script>window.ownerOnly=1</script>' },
    // Anything that might ever end up on Site by mistake must not travel.
    deployTargets: [{ connection: 'sftp://deploy:hunter2@host/var/www' }],
    hostingToken: 'f'.repeat(64),
  }) as any;

describe('prepress.json on publish', () => {
  test('pages say they are Prepress and link the source; the source is an allowlist', () => {
    const out = publishFiles(withExtras(demo), { generator: 'Prepress 9.9.9' });
    const home = out.pages.home;
    expect(home).toContain('<meta name="generator" content="Prepress">');
    expect(home).toContain('<link rel="alternate" type="application/vnd.prepress+json" href="/prepress.json" title="Prepress source">');
    const raw = out.files['prepress.json'];
    const j = JSON.parse(raw);
    expect(j).toMatchObject({ format: 'prepress/site@1', generator: 'Prepress 9.9.9' });
    expect(Object.keys(j.site).sort()).toEqual(expect.arrayContaining(['name', 'tagline', 'design', 'pages', 'header', 'footer', 'seo']));
    for (const leak of ['hunter2', 'sftp://', 'ffffffffff', 'ownerOnly', 'G-ABC1234567', 'deployTargets', 'hostingToken', 'integrations', '"code"']) expect(raw, leak).not.toContain(leak);
    expect(j.site.seo).toEqual({ url: 'https://bakery.example', description: 'Bread at dawn.', image: '/uploads/share.png' });
    // Editor previews never carry the pointer (only published pages do).
    expect(engine.renderPage(demo, demo.pages[0])).not.toContain('prepress.json');
  });
});

describe('finding the source', () => {
  const site = { format: 'prepress/site@1', generator: 'Prepress 0.7.4', site: { name: 'B', pages: [{ title: 'Home', slug: 'home', content: '' }] } };
  const web = (routes: Record<string, { type: string; body: string } | { redirect: string }>, seen: string[] = []) =>
    (async (u: any) => {
      const url = String(u);
      seen.push(url);
      const r = routes[url];
      if (!r) return new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } });
      if ('redirect' in r) return new Response(null, { status: 301, headers: { location: r.redirect } });
      return new Response(r.body, { status: 200, headers: { 'content-type': r.type } });
    }) as typeof fetch;
  const pub = async () => ['93.184.216.34'];

  test('follows the page link; walks up folders for sub-path sites; refuses private addresses', async () => {
    const page = (href: string) => ({ type: 'text/html', body: `<html><head><meta name="generator" content="Prepress"><link rel="alternate" type="application/vnd.prepress+json" href="${href}" title="Prepress source"></head></html>` });
    const json = { type: 'application/json', body: JSON.stringify(site) };
    const a = await fetchPublishedSource('bakery.example/about/', { fetch: web({ 'https://bakery.example/about/': page('/prepress.json'), 'https://bakery.example/prepress.json': json }), resolve: pub });
    expect(a).toMatchObject({ source: 'https://bakery.example/prepress.json', root: 'https://bakery.example/', generator: 'Prepress 0.7.4' });

    // A GitHub project page (no link followed here): /repo/prepress.json is found by walking up.
    const b = await fetchPublishedSource('https://octo.github.io/site/about/', { fetch: web({ 'https://octo.github.io/site/prepress.json': json }), resolve: pub });
    expect(b.root).toBe('https://octo.github.io/site/');

    // Redirect into a private network: refused on the hop.
    const seen: string[] = [];
    const resolve = async (h: string) => (h === 'evil.example' ? ['93.184.216.34'] : ['10.0.0.5']);
    await expect(fetchPublishedSource('https://evil.example/', { fetch: web({ 'https://evil.example/': { redirect: 'http://intranet.local/' } }, seen), resolve })).rejects.toThrow();
    expect(seen.some((s) => s.includes('intranet'))).toBe(false);

    await expect(fetchPublishedSource('https://plain.example/', { fetch: web({ 'https://plain.example/': { type: 'text/html', body: '<html><head></head></html>' } }), resolve: pub })).rejects.toThrow(/doesn't look like a site published with Prepress/);
  });

  test('link parsing and media rewriting', () => {
    expect(sourceLink(`<link title='x' href='../prepress.json' type="application/vnd.prepress+json" rel="alternate">`, new URL('https://a.example/x/y/'))?.href).toBe('https://a.example/x/prepress.json');
    expect(sourceLink('<link rel="stylesheet" href="/s.css">', new URL('https://a.example/'))).toBeNull();
    expect(absoluteMedia({ c: '<img src="/uploads/a.png"/> url(/uploads/b.jpg)', i: '/uploads/c.png', n: 'not /uploadsx' }, 'https://a.example/repo/')).toEqual({
      c: '<img src="https://a.example/repo/uploads/a.png"/> url(https://a.example/repo/uploads/b.jpg)',
      i: 'https://a.example/repo/uploads/c.png',
      n: 'not /uploadsx',
    });
  });
});

describe('opening a published site in the editor', () => {
  let dir = '';
  let server: Server;
  let base = '';
  afterAll(() => {
    server?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('pages, design and images come over; analytics, code and the address do not', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pp-open-'));
    const published = publishFiles(withExtras(demo), { generator: 'Prepress 0.7.4' });
    const files: Record<string, { type: string; body: Buffer | string }> = {
      'https://bakery.example/': { type: 'text/html', body: published.pages.home },
      'https://bakery.example/prepress.json': { type: 'application/json', body: published.files['prepress.json'] },
      'https://bakery.example/uploads/photo.png': { type: 'image/png', body: PNG },
      'https://bakery.example/uploads/share.png': { type: 'image/png', body: PNG },
    };
    const fake = (async (u: any) => {
      const f = files[String(u)];
      return f ? new Response(typeof f.body === "string" ? f.body : new Uint8Array(f.body), { status: 200, headers: { 'content-type': f.type } }) : new Response('', { status: 404 });
    }) as typeof fetch;
    const data = join(dir, 'data');
    mkdirSync(data, { recursive: true });
    writeFileSync(join(data, 'draft.json'), JSON.stringify({ site: demo, brief: '', rev: 1 }));
    const handle = createHandler({ dataDir: data, outDir: join(dir, 'www'), engine, mediaImport: { fetch: fake, resolve: async () => ['93.184.216.34'] } });
    server = createServer((q, r) => void handle(q, r));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;

    const r = await fetch(`${base}/api/open-published`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ url: 'https://bakery.example/' }) });
    const j: any = await r.json();
    expect(r.status, JSON.stringify(j)).toBe(200);
    expect(j.source).toBe('https://bakery.example/prepress.json');
    expect(j.site.pages.map((p: any) => p.slug)).toEqual(demo.pages.map((p) => p.slug));
    expect(j.site.design.palette).toEqual(demo.design.palette);
    expect(j.media.imported).toBeGreaterThanOrEqual(1);
    expect(j.site.pages[0].content).toMatch(/src="\/uploads\/[^"]+\.png"/);
    expect(j.site.pages[0].content).not.toContain('bakery.example');
    expect(j.site.seo.description).toBe('Bread at dawn.');
    expect(j.site.seo.image).toMatch(/^\/uploads\/.+\.png$/);
    expect(j.site.seo.url).toBeUndefined();
    expect(j.site.integrations).toBeUndefined();
    expect(j.site.code).toBeUndefined();
    const file = j.site.seo.image.slice('/uploads/'.length);
    expect(existsSync(join(data, 'uploads', file))).toBe(true);
    expect(engine.siteValidity(j.site)).toBe(0);
  });
});
