// The library: sharing/importing logic, the library API, and Prepress + MCP end to end.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as engine from '../src/lib/engine';
import { buildStarter } from '../src/lib/starters';
import { importLibraryItem, shareBlock, shareSections, shareStyle, shareTemplate, siteValidity } from '../src/lib/library';
import { defineBlock, getSections } from '../src/lib/site';
import { sanitizeInline } from '../src/lib/wp/inline';
import { createHostingApi } from '../hosting/api';
import { createHandler } from '../server/app';

const listen = (s: Server) => new Promise<string>((r) => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${(s.address() as any).port}`)));

describe('sharing and importing (untrusted content)', () => {
  test('a template round-trips: same pages, valid blocks, local media become placeholders', () => {
    const { site } = buildStarter('restaurant', { name: 'Olive' });
    site.pages[0].content += '\n\n' + engine.toMarkup(engine.normalizeSections([{ name: 'core/image', attributes: { url: '/uploads/photo-1.jpg', alt: 'Our room' } }], { design: site.design }));
    expect(site.pages[0].content).toContain('/uploads/photo-1.jpg');
    const d = shareTemplate(site, { title: 'Bistro', tags: ['Food', 'Restaurant'] });
    expect(d.type).toBe('template');
    expect(d.tags).toEqual(['food', 'restaurant']);
    expect(JSON.stringify(d.payload)).not.toContain('/uploads/');
    expect(d.preview).toMatch(/^<!doctype html>/i);
    const r = importLibraryItem(buildStarter('blank').site, { type: 'template', title: d.title, payload: d.payload });
    expect(r.site.pages.map((p) => p.title)).toEqual(site.pages.map((p) => p.title));
    expect(r.site.name).toBe('Olive');
    expect(siteValidity(r.site)).toBe(0);
  });

  test('sections → pattern with its custom blocks; import adds blocks + pattern, inserts on a page', () => {
    let { site } = buildStarter('saas', { name: 'S' });
    site = defineBlock(site, { name: 'prepress/badge', title: 'Badge', category: 'text', attributes: { label: { type: 'string', default: 'New' } }, template: '<span>{{label}}</span>' }).site;
    engine.registerCustomBlocks(site.blocks ?? []);
    site.pages[0].content += '\n\n<!-- wp:prepress/badge {"label":"Hot"} /-->';
    const n = getSections(site.pages[0]).length;
    const d = shareSections(site, site.pages[0].id, [0, n - 1], { title: 'Hero + badge' });
    expect(d.payload.pattern!.blocks.map((b) => b.name)).toEqual(['prepress/badge']);
    const target = buildStarter('blank').site;
    const r = importLibraryItem(target, { type: 'pattern', title: d.title, payload: d.payload }, { insertInto: target.pages[0].id });
    expect(r.site.blocks?.map((b) => b.name)).toEqual(['prepress/badge']);
    expect(r.site.patterns?.[0].title).toBe('Hero + badge');
    expect(r.site.pages[0].content).toContain('wp:prepress/badge');
    expect(siteValidity(r.site)).toBe(0);
  });

  test('blocks and styles', () => {
    let { site } = buildStarter('portfolio');
    site = defineBlock(site, { name: 'prepress/quote-card', title: 'Quote card', category: 'text', attributes: { text: { type: 'string', default: 'Hello' } }, template: '<blockquote>{{text}}</blockquote>' }).site;
    const b = shareBlock(site, 'prepress/quote-card');
    expect(importLibraryItem(buildStarter('blank').site, { type: 'block', title: b.title, payload: b.payload }).site.blocks?.[0].name).toBe('prepress/quote-card');
    const s = shareStyle(site, { title: 'Editorial' });
    const styled = importLibraryItem(buildStarter('blank').site, { type: 'style', title: s.title, payload: s.payload }).site;
    expect(styled.design.headingFont).toBe(site.design.headingFont);
    expect(styled.design.palette).toEqual(site.design.palette);
  });

  test('hostile items are cleaned: scripts, event handlers, unknown blocks, bad block templates, bad design', () => {
    const evil = [
      '<!-- wp:html --><script>alert(1)</script><!-- /wp:html -->',
      '<!-- wp:paragraph --><p>Hi <img src=x onerror="alert(1)"><a href="javascript:alert(1)">x</a> <strong onclick="x()">bold</strong><script>bad()</script></p><!-- /wp:paragraph -->',
    ].join('\n\n');
    const r = importLibraryItem(buildStarter('blank').site, {
      type: 'pattern',
      title: 'Evil',
      payload: { pattern: { title: 'Evil', content: evil, blocks: [{ name: 'prepress/evil-box', title: 'X', category: 'text', attributes: {}, template: '<div onclick="steal()"><script>x</script>ok</div>' } as any] } },
    });
    const all = JSON.stringify(r.site);
    for (const bad of ['<script', 'onerror', 'onclick', 'javascript:', 'wp:html']) expect(all, bad).not.toContain(bad);
    expect(r.site.patterns?.[0].content).toContain('<strong>bold</strong>');
    const styled = importLibraryItem(buildStarter('blank').site, { type: 'style', title: 'x', payload: { style: { design: { palette: { primary: 'url(javascript:1)' } as any, headingFont: '</style><script>' } as any, themeJson: { styles: { css: 'body{}' } } } } });
    expect(JSON.stringify(styled.site.design)).not.toMatch(/javascript|script/);
  });

  test('inline sanitizer keeps editor formatting', () => {
    expect(sanitizeInline('a <strong>b</strong> <em>c</em> <a href="https://x.example" target="_blank">d</a> <mark style="background-color:rgba(0,0,0,0)" class="has-inline-color has-primary-color">e</mark>')).toBe(
      'a <strong>b</strong> <em>c</em> <a href="https://x.example" target="_blank" rel="noopener">d</a> <mark style="background-color:rgba(0,0,0,0)" class="has-inline-color has-primary-color">e</mark>',
    );
    expect(sanitizeInline('<div><b>x</b></div><iframe src=x></iframe><span style="position:fixed">y</span>')).toBe('<b>x</b><span>y</span>');
  });
});

describe('library API and Prepress', () => {
  let dir = '';
  let api: Server;
  let apiBase = '';
  let pp: Server;
  let ppBase = '';
  let client: Client;
  const A = 'a'.repeat(64);
  const B = 'b'.repeat(64);

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'prepress-library-'));
    const h = createHostingApi({ domain: 'prepress.test', dataDir: join(dir, 'api'), bucket: 'b', region: 'fr-par', endpoint: 'http://127.0.0.1:9', accessKeyId: 'AK', secretAccessKey: 'SK', adminToken: 'admin-secret' });
    api = createServer((q, r) => void h(q, r));
    apiBase = await listen(api);
    const { site } = buildStarter('consultant', { name: 'Coach Site' });
    mkdirSync(join(dir, 'site'), { recursive: true });
    writeFileSync(join(dir, 'site', 'draft.json'), JSON.stringify({ site, brief: 'A coach', rev: 1 }));
    const handle = createHandler({ dataDir: join(dir, 'site'), engine, mcpToken: 't', hostingApi: apiBase, adminHtml: '<!doctype html>' });
    pp = createServer((q, r) => void handle(q, r));
    ppBase = await listen(pp);
    client = new Client({ name: 't', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${ppBase}/mcp`), { requestInit: { headers: { authorization: 'Bearer t' } } }));
  }, 60000);
  afterAll(async () => {
    await client?.close();
    api?.close();
    pp?.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r: any = await client.callTool({ name, arguments: args });
    if (r.isError) throw new Error(r.content[0].text);
    return JSON.parse(r.content[0].text);
  };
  const apiPost = async (path: string, body: unknown, ip?: string) =>
    new Promise<{ status: number; body: any }>((ok, fail) => {
      const u = new URL(apiBase + path);
      const data = JSON.stringify(body);
      const req = request({ host: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data), ...(ip ? { 'x-forwarded-for': ip } : {}) } }, (res) => {
        let t = '';
        res.on('data', (c) => (t += c));
        res.on('end', () => ok({ status: res.statusCode!, body: JSON.parse(t || '{}') }));
      });
      req.on('error', fail);
      req.end(data);
    });

  test('an AI shares a pattern and a template; the library lists them with sandboxed previews', async () => {
    const shared = await call('library_share', { type: 'pattern', title: 'Coaching hero', description: 'Split hero', tags: ['coach'], page: 'home', sections: [0] });
    expect(shared.id).toMatch(/^[a-z0-9]{10}$/);
    expect(shared.page).toBe(`${apiBase}/library/${shared.id}`);
    await call('library_share', { type: 'template', title: 'Coach in a box' });

    const found = await call('library_search', { query: 'coach' });
    expect(found.items.map((i: any) => i.type).sort()).toEqual(['pattern', 'template']);
    const prev = await fetch(`${apiBase}/library/preview/${shared.id}`);
    expect(prev.headers.get('content-security-policy')).toMatch(/^sandbox; default-src 'none'/);
    expect(prev.headers.get('content-security-policy')).toContain('frame-ancestors');
    expect(await prev.text()).toMatch(/^<!doctype html>/i);

    // Editor path (local server proxies, adds the site token).
    const list = await (await fetch(`${ppBase}/api/library/items?type=pattern`)).json();
    expect(list.base).toBe(apiBase);
    expect(list.items[0].title).toBe('Coaching hero');
    const mine = await (await fetch(`${ppBase}/api/library/mine`)).json();
    expect(mine.items).toHaveLength(2);
  });

  test('an AI imports a pattern into a page, counted once; only the owner can change or delete', async () => {
    const { items } = await call('library_search', { type: 'pattern' });
    const id = items[0].id;
    const before = (await call('get_page', { page: 'about' })).sections.length;
    const r = await call('library_import', { id: `https://prepress.digitalno.de/library/${id}`, page: 'about' });
    expect(r.note).toMatch(/Added the pattern/);
    expect(r.validation.invalid).toEqual([]);
    expect((await call('get_page', { page: 'about' })).sections.length).toBe(before + 1);
    await call('library_import', { id, page: 'about' });
    expect((await call('library_search', { type: 'pattern' })).items[0].imports).toBe(1);

    expect((await apiPost(`/api/v1/library/items/${id}`, { token: B, title: 'Hijacked' })).status).toBe(403);
    expect((await apiPost(`/api/v1/library/items/${id}/delete`, { token: B })).status).toBe(403);
    const draft = JSON.parse(readFileSync(join(dir, 'site', 'draft.json'), 'utf8'));
    expect(draft.site.patterns.some((p: any) => p.title === 'Coaching hero')).toBe(true);
  });

  test('importing a template replaces the site, keeps a backup and the brief', async () => {
    const { items } = await call('library_search', { type: 'template' });
    await call('library_import', { id: items[0].id });
    const site = await call('get_site');
    expect(site.name).toBe('Coach Site');
    expect(site.brief).toBe('A coach');
  });

  test('reports from three visitors hide an item; a moderator can bring it back', async () => {
    const pub = await apiPost('/api/v1/library/items', { token: A, type: 'style', title: 'Spammy', payload: { style: { design: {} } }, preview: '<!doctype html><p>x</p>' });
    expect(pub.status).toBe(201);
    const id = pub.body.id;
    for (const ip of ['198.51.100.1', '198.51.100.2', '198.51.100.1', '198.51.100.3']) await apiPost(`/api/v1/library/items/${id}/report`, { reason: 'spam' }, ip);
    expect((await fetch(`${apiBase}/api/v1/library/items/${id}`)).status).toBe(404);
    expect((await apiPost(`/api/v1/library/items/${id}/moderate`, { admin: 'wrong', action: 'unhide' })).status).toBe(403);
    expect((await apiPost(`/api/v1/library/items/${id}/moderate`, { admin: 'admin-secret', action: 'unhide' })).status).toBe(200);
    expect((await fetch(`${apiBase}/api/v1/library/items/${id}`)).status).toBe(200);
    expect((await apiPost(`/api/v1/library/items/${id}/delete`, { token: A })).status).toBe(200);
  });

  test('pages: homepage cards, library and item pages escape everything', async () => {
    const pub = await apiPost('/api/v1/library/items', { token: A, type: 'pattern', title: '<script>alert(1)</script> Hero', description: '"><img src=x onerror=1>', tags: ['<b>'], payload: { pattern: { title: 'x', content: '', blocks: [] } }, preview: '<!doctype html>' });
    const home = await fetch(`${apiBase}/`);
    expect(home.headers.get('content-security-policy')).toContain("default-src 'none'");
    const homeHtml = await home.text();
    for (const s of ['Web version', 'Desktop app', 'Library', 'your-name.prepress.test']) expect(homeHtml).toContain(s);
    expect(await (await fetch(`${apiBase}/library`)).text()).toMatch(/class="on" href="\/library">Templates/);
    for (const path of ['/library?type=all', '/library?type=pattern', `/library/${pub.body.id}`]) {
      const html = await (await fetch(apiBase + path)).text();
      expect(html).not.toContain('<script>alert(1)');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; Hero');
    }
    expect((await fetch(`${apiBase}/library/zzzzzzzzzz`)).status).toBe(404);
  });

  test('lineage: uses must exist, item pages link both ways; only a moderator marks official', async () => {
    const style = (await apiPost('/api/v1/library/items', { token: A, type: 'style', title: 'Base style', payload: { style: { design: {} } }, preview: '<!doctype html>' })).body.id;
    expect((await apiPost('/api/v1/library/items', { token: A, type: 'pattern', title: 'Bad', uses: ['zzzzzzzzzz'], payload: { pattern: { title: 'x', content: '', blocks: [] } }, preview: '<!doctype html>' })).status).toBe(400);
    const pat = (await apiPost('/api/v1/library/items', { token: A, type: 'pattern', title: 'Child pattern', uses: [style, style], payload: { pattern: { title: 'x', content: '', blocks: [] } }, preview: '<!doctype html>' })).body.id;
    expect((await (await fetch(`${apiBase}/api/v1/library/items/${pat}`)).json()).uses).toEqual([style]);
    expect(await (await fetch(`${apiBase}/library/${pat}`)).text()).toMatch(/Built with[\s\S]*Base style/);
    expect(await (await fetch(`${apiBase}/library/${style}`)).text()).toMatch(/Used in[\s\S]*Child pattern/);

    expect((await apiPost(`/api/v1/library/items/${style}`, { token: A, official: true, title: 'Base style' })).status).toBe(200);
    expect((await (await fetch(`${apiBase}/api/v1/library/items/${style}`)).json()).official).toBeUndefined();
    expect((await apiPost(`/api/v1/library/items/${style}/moderate`, { admin: 'wrong', action: 'official' })).status).toBe(403);
    expect((await apiPost(`/api/v1/library/items/${style}/moderate`, { admin: 'admin-secret', action: 'official' })).body.official).toBe(true);
    const official = await (await fetch(`${apiBase}/api/v1/library/items?official=1`)).json();
    expect(official.items.map((i: any) => i.id)).toEqual([style]);
    expect(await (await fetch(`${apiBase}/library?official=1`)).text()).toContain('By Prepress');
    // Reports can't hide an official item.
    for (const ip of ['203.0.113.1', '203.0.113.2', '203.0.113.3']) await apiPost(`/api/v1/library/items/${style}/report`, { reason: 'x' }, ip);
    expect((await fetch(`${apiBase}/api/v1/library/items/${style}`)).status).toBe(200);
  });
});
