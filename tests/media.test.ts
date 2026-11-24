// External media → media library: safe download, dedupe, block rewrite, MCP writes.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as engine from '../src/lib/engine';
import { createHandler } from '../server/app';
import { createMediaImporter, isPrivateAddress, localizeSite, sniff } from '../server/media';
import { externalMediaUrls, replaceMediaUrls } from '../src/lib/wp/media';
import { validateMarkup } from '../src/lib/wp/markup';

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);

/** A fake web: host → path → response. */
function fakeWeb(routes: Record<string, { status?: number; type?: string; body?: Buffer | string; location?: string }>) {
  const calls: string[] = [];
  const f = (async (input: any) => {
    const url = new URL(String(input));
    calls.push(url.href);
    const r = routes[url.href];
    if (!r) return new Response('nope', { status: 404 });
    const headers: Record<string, string> = {};
    if (r.type) headers['content-type'] = r.type;
    if (r.location) headers.location = r.location;
    return new Response(typeof r.body === 'string' || r.body === undefined ? (r.body ?? '') : new Uint8Array(r.body), { status: r.status ?? 200, headers });
  }) as typeof fetch;
  const resolve = async (host: string) => (host === 'intranet.example' ? ['10.0.0.5'] : host === 'localhost' ? ['127.0.0.1'] : ['93.184.216.34']);
  return { fetch: f, resolve, calls };
}

let dir = '';
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-media-'));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('safe download into the media library', () => {
  test('helpers: magic bytes and private addresses', () => {
    expect(sniff(PNG)).toBe('image/png');
    expect(sniff(JPG)).toBe('image/jpeg');
    expect(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniff(Buffer.from('<!doctype html>'))).toBeNull();
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '172.20.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '0.0.0.0']) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ['93.184.216.34', '8.8.8.8', '2606:4700::1111']) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  test('imports, names, dedupes, refuses what it should', async () => {
    const uploads = join(dir, 'a', 'uploads');
    mkdirSync(uploads, { recursive: true });
    const web = fakeWeb({
      'https://cdn.example/photos/Sunset%20Beach.png?w=800': { type: 'image/png', body: PNG },
      'https://cdn.example/same-bytes.png': { type: 'image/png', body: PNG },
      'https://cdn.example/moved.jpg': { status: 302, location: 'https://img.example/real.jpg' },
      'https://img.example/real.jpg': { type: 'image/jpeg', body: JPG },
      'https://cdn.example/to-lan.jpg': { status: 301, location: 'http://intranet.example/secret.jpg' },
      'https://cdn.example/logo.svg': { type: 'image/svg+xml', body: '<svg/>' },
      'https://cdn.example/page.jpg': { type: 'image/jpeg', body: '<!doctype html><script>' },
    });
    const imp = createMediaImporter({ dataDir: join(dir, 'a'), uploadsDir: uploads, fetch: web.fetch, resolve: web.resolve });

    const a = await imp.import('https://cdn.example/photos/Sunset%20Beach.png?w=800');
    expect(a.url).toMatch(/^\/uploads\/sunset-beach-[0-9a-f]{10}\.png$/);
    expect(readFileSync(join(uploads, a.file))).toEqual(PNG);
    // Same link again: no download. Same bytes elsewhere: same file.
    const n = web.calls.length;
    expect(await imp.import('https://cdn.example/photos/Sunset%20Beach.png?w=800')).toMatchObject({ url: a.url, reused: true });
    expect(web.calls.length).toBe(n);
    const b = await imp.import('https://cdn.example/same-bytes.png');
    expect(b.file).toBe(a.file);
    expect(b.reused).toBe(true);
    // Redirects are followed (and re-checked).
    expect((await imp.import('//cdn.example/moved.jpg')).url).toMatch(/^\/uploads\/real-[0-9a-f]{10}\.jpg$/);

    await expect(imp.import('https://cdn.example/to-lan.jpg')).rejects.toThrow(/local or private address/);
    await expect(imp.import('http://localhost:8080/api/site')).rejects.toThrow(/local or private address/);
    await expect(imp.import('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/local or private address/);
    await expect(imp.import('file:///etc/passwd')).rejects.toThrow(/Only http/);
    await expect(imp.import('https://user:pw@cdn.example/x.png')).rejects.toThrow(/user name or password/);
    await expect(imp.import('https://cdn.example/logo.svg')).rejects.toThrow(/SVG/);
    await expect(imp.import('https://cdn.example/page.jpg')).rejects.toThrow(/Not an image/);
    await expect(imp.import('https://cdn.example/missing.png')).rejects.toThrow(/answered 404/);
    expect(readdirSync(uploads).sort()).toHaveLength(2);
  });
});

describe('block rewrite', () => {
  test('finds external media in image, cover, media-text, nested blocks; rewrites to valid markup', () => {
    const markup = engine.toMarkup(
      engine.normalizeSections(
        [
          { name: 'core/image', attributes: { url: 'https://cdn.example/a.png', alt: 'A' } },
          { name: 'core/cover', attributes: { url: 'https://cdn.example/b.jpg' }, innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'Hi' } }] },
          { name: 'core/group', innerBlocks: [{ name: 'core/media-text', attributes: { mediaUrl: 'https://cdn.example/c.jpg', mediaType: 'image' }, innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'x' } }] }] },
          { name: 'core/image', attributes: { url: '/uploads/local.png', alt: 'local' } },
        ],
        { design: engine.sanitizeDesign({}) },
      ),
    );
    expect(externalMediaUrls(markup).sort()).toEqual(['https://cdn.example/a.png', 'https://cdn.example/b.jpg', 'https://cdn.example/c.jpg']);
    const out = replaceMediaUrls(markup, { 'https://cdn.example/a.png': '/uploads/a-1.png', 'https://cdn.example/b.jpg': '/uploads/b-1.jpg', 'https://cdn.example/c.jpg': '/uploads/c-1.jpg' });
    expect(out).not.toContain('cdn.example');
    expect(out).toContain('src="/uploads/a-1.png"');
    expect(out).toContain('/uploads/b-1.jpg');
    expect(out).toContain('/uploads/c-1.jpg');
    expect(validateMarkup(out).invalid).toEqual([]);
    expect(replaceMediaUrls(markup, {})).toBe(markup);
  });

  test('localizeSite: imports what it can, reports what it can’t', async () => {
    const uploads = join(dir, 'b', 'uploads');
    mkdirSync(uploads, { recursive: true });
    const web = fakeWeb({ 'https://cdn.example/ok.png': { type: 'image/png', body: PNG } });
    const imp = createMediaImporter({ dataDir: join(dir, 'b'), uploadsDir: uploads, fetch: web.fetch, resolve: web.resolve });
    const { site } = engine.buildStarter('blank', { name: 'T' });
    const content = engine.toMarkup(engine.normalizeSections([{ name: 'core/image', attributes: { url: 'https://cdn.example/ok.png' } }, { name: 'core/image', attributes: { url: 'https://cdn.example/gone.png' } }], { design: site.design }));
    const r = await localizeSite({ ...site, pages: [{ ...site.pages[0], content }] }, engine as any, imp);
    expect(r.imported.map((i) => i.from)).toEqual(['https://cdn.example/ok.png']);
    expect(r.failed).toEqual([{ url: 'https://cdn.example/gone.png', error: 'The link answered 404' }]);
    expect(r.site.pages[0].content).toContain('/uploads/ok-');
    expect(r.site.pages[0].content).toContain('https://cdn.example/gone.png');
  });
});

describe('over MCP and the editor API', () => {
  let server: Server;
  let base = '';
  let client: Client;
  const data = () => join(dir, 'mcp');
  beforeAll(async () => {
    const { site } = engine.buildStarter('blank', { name: 'Media test' });
    mkdirSync(data(), { recursive: true });
    writeFileSync(join(data(), 'draft.json'), JSON.stringify({ site, rev: 1 }));
    const web = fakeWeb({ 'https://images.example/hero.jpg': { type: 'image/jpeg', body: JPG }, 'https://images.example/team.png': { type: 'image/png', body: PNG } });
    const handle = createHandler({ dataDir: data(), engine, mcpToken: 't', mediaImport: { fetch: web.fetch, resolve: web.resolve } });
    server = createServer((q, r) => void handle(q, r));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    client = new Client({ name: 't', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: 'Bearer t' } } }));
  }, 60000);
  afterAll(async () => {
    await client?.close();
    server?.close();
  });
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r: any = await client.callTool({ name, arguments: args });
    if (r.isError) throw new Error(r.content[0].text);
    return JSON.parse(r.content[0].text);
  };

  test('an AI linking images gets them stored locally, and is told what failed', async () => {
    const r = await call('set_page_content', {
      page: 'home',
      sections: [
        { pattern: 'media-text', props: { heading: 'Hi', text: 'x', imageLabel: 'x' } },
        { name: 'core/image', attributes: { url: 'https://images.example/hero.jpg', alt: 'Hero' } },
        { name: 'core/cover', attributes: { url: 'https://images.example/team.png' }, innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'Team' } }] },
        { name: 'core/image', attributes: { url: 'https://images.example/missing.jpg', alt: 'Missing' } },
      ],
    });
    expect(r.media.imported.map((m: any) => m.from).sort()).toEqual(['https://images.example/hero.jpg', 'https://images.example/team.png']);
    expect(r.media.failed).toEqual([expect.objectContaining({ url: 'https://images.example/missing.jpg' })]);
    expect(r.validation.invalid).toEqual([]);
    const draft = JSON.parse(readFileSync(join(data(), 'draft.json'), 'utf8'));
    const home = draft.site.pages[0].content;
    expect(home).not.toContain('images.example/hero.jpg');
    expect(home).not.toContain('images.example/team.png');
    expect(home).toMatch(/\/uploads\/hero-[0-9a-f]{10}\.jpg/);
    const files = (await call('list_media')).files.map((f: any) => f.url);
    expect(files.some((u: string) => /hero-/.test(u))).toBe(true);
    expect((await call('import_media', { url: 'https://images.example/hero.jpg' })).alreadyInLibrary).toBe(true);

    // Local library URLs are kept as-is (not replaced by placeholders); a cover with an image gets a 50% overlay.
    const local = files.find((u: string) => /hero-/.test(u));
    await call('set_page_content', { page: 'home', sections: [{ name: 'core/image', attributes: { url: local, alt: 'Hero' } }, { name: 'core/cover', attributes: { url: local }, innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'x' } }] }] });
    const after = JSON.parse(readFileSync(join(data(), 'draft.json'), 'utf8')).site.pages[0].content;
    expect(after).toContain(`src="${local}"`);
    expect(after).not.toContain('data:image/svg');
    expect(after).toContain('"dimRatio":50');
  });

  test('editor endpoint imports a link; refuses local addresses', async () => {
    const post = (url: string) => fetch(`${base}/api/media/import`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
    const ok = await (await post('https://images.example/team.png')).json();
    expect(ok.url).toMatch(/^\/uploads\/team-[0-9a-f]{10}\.png$/);
    expect(existsSync(join(data(), ok.url))).toBe(true);
    const bad = await post('http://127.0.0.1:1/x.png');
    expect(bad.status).toBe(422);
    expect((await bad.json()).error).toMatch(/private address/);
  });
});

describe('MCP: titles, favicons and media management', () => {
  // ICO with one 1×1 image entry.
  const ICO = Buffer.from('0000010001000101000001002000300000001600000000', 'hex');
  const connect = async (localFiles: boolean) => {
    const data = mkdtempSync(join(dir, 'manage-'));
    const { site } = engine.buildStarter('blank', { name: 'Bakery' });
    writeFileSync(join(data, 'draft.json'), JSON.stringify({ site, rev: 1 }));
    const web = fakeWeb({ 'https://cdn.example/icon.png': { type: 'image/png', body: Buffer.concat([PNG, Buffer.from([7])]) }, 'https://cdn.example/share.jpg': { type: 'image/jpeg', body: JPG } });
    const { createSiteCore } = await import('../server/app');
    const { mcpServerFactory } = await import('../server/mcp');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const core = createSiteCore({ dataDir: data, outDir: join(data, 'www'), engine, mediaImport: { fetch: web.fetch, resolve: web.resolve } });
    const server = mcpServerFactory({ store: core.store, engine, publishSite: core.publishSite, exportWordPress: core.exportWordPress, deploy: core.deploy, deployTargets: core.deployer.view, localizeMedia: core.localizeMedia, importMedia: core.importer.import, uploadsDir: core.uploadsDir, localFiles })();
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const client = new Client({ name: 't', version: '1' });
    await client.connect(b);
    const call = async (name: string, args: Record<string, unknown> = {}) => {
      const r: any = await client.callTool({ name, arguments: args });
      if (r.isError) throw new Error(r.content[0].text);
      return JSON.parse(r.content[0].text);
    };
    return { data, call, client };
  };

  test('upload (base64), favicon and social image from links, page titles, usage and delete', async () => {
    const { data, call, client } = await connect(false);
    // Base64 in, a library URL out; the same bytes again are reused.
    const up = await call('upload_media', { data: PNG.toString('base64'), name: 'Team Photo.png' });
    expect(up.url).toMatch(/^\/uploads\/team-photo-[0-9a-f]{10}\.png$/);
    expect((await call('upload_media', { data: `data:image/png;base64,${PNG.toString('base64')}`, name: 'again.png' })).url).toBe(up.url);
    await expect(call('upload_media', { data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), name: 'x.svg' })).rejects.toThrow(/SVG/);
    // Over HTTP (not stdio) there is no path parameter: a path is never read.
    const tool = (await client.listTools()).tools.find((t) => t.name === 'upload_media')!;
    expect(Object.keys((tool.inputSchema as any).properties)).not.toContain('path');
    await expect(call('upload_media', { path: '/etc/hosts' })).rejects.toThrow(/data/);

    // An ICO favicon, and linked images downloaded into the library.
    const ico = await call('upload_media', { data: ICO.toString('base64'), name: 'favicon.ico' });
    expect(ico.url).toMatch(/\.ico$/);
    const seo = await call('set_seo', { favicon: 'https://cdn.example/icon.png', image: 'https://cdn.example/share.jpg' });
    expect(seo.seo.favicon).toMatch(/^\/uploads\/icon-[0-9a-f]{10}\.png$/);
    expect(seo.seo.image).toMatch(/^\/uploads\/share-[0-9a-f]{10}\.jpg$/);
    await expect(call('set_seo', { favicon: 'https://cdn.example/missing.png' })).rejects.toThrow(/Favicon/);
    await call('set_seo', { favicon: ico.url });

    // Titles: the site name, a page's menu title and its own title for the browser tab / search.
    await call('set_site_info', { name: 'Harbor Bakery' });
    await call('create_page', { title: 'About' });
    const page = await call('update_page', { page: 'about', seo_title: 'About us – bread since 1920' });
    expect(page.page.documentTitle).toBe('About us – bread since 1920');
    expect((await call('update_page', { page: 'home', seo_title: '' })).page.documentTitle).toBe('Harbor Bakery');
    const draft = JSON.parse(readFileSync(join(data, 'draft.json'), 'utf8'));
    const about = draft.site.pages.find((p: any) => p.slug === 'about');
    const html = engine.renderPage(draft.site, about);
    expect(html).toContain('<title>About us – bread since 1920</title>');
    expect(html).toContain(`<link rel="icon" href="${ico.url}" type="image/x-icon">`);

    // Usage, then delete: refused while used, unless forced; unused files go.
    await call('insert_section', { page: 'about', sections: [{ name: 'core/image', attributes: { url: up.url, alt: 'Team' } }] });
    const files = (await call('list_media')).files;
    expect(files.find((f: any) => f.url === up.url).usedIn).toEqual(['page:about']);
    expect(files.find((f: any) => f.url === ico.url).usedIn).toEqual(['seo.favicon']);
    await expect(call('delete_media', { file: up.url })).rejects.toThrow(/used in page:about/);
    const unused = files.find((f: any) => !f.usedIn.length);
    expect((await call('delete_media', { file: unused.url })).deleted).toBe(unused.url);
    expect(existsSync(join(data, 'uploads', unused.url.slice('/uploads/'.length)))).toBe(false);
    expect((await call('delete_media', { file: up.url, force: true })).brokenIn).toEqual(['page:about']);
    await expect(call('delete_media', { file: '../draft.json' })).rejects.toThrow(/No file/);
    expect(existsSync(join(data, 'draft.json'))).toBe(true);
  });

  test('over stdio, a file on this computer can be uploaded by path', async () => {
    const { call } = await connect(true);
    const file = join(dir, 'local photo.jpg');
    writeFileSync(file, JPG);
    const r = await call('upload_media', { path: file });
    expect(r.url).toMatch(/^\/uploads\/local-photo-[0-9a-f]{10}\.jpg$/);
    await expect(call('upload_media', { path: 'relative.jpg' })).rejects.toThrow(/absolute/);
    await expect(call('upload_media', { path: join(dir, 'nope.jpg') })).rejects.toThrow(/No file/);
    writeFileSync(join(dir, 'notes.txt'), 'secret notes');
    await expect(call('upload_media', { path: join(dir, 'notes.txt') })).rejects.toThrow(/Not an image/);
  });
});
