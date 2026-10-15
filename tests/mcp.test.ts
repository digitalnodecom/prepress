import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as engine from '../src/lib/engine';
import { createHandler } from '../server/app';

let server: Server;
let base = '';
let dir = '';
let client: Client;
const TOKEN = 'test-token';

async function call(name: string, args: Record<string, unknown> = {}) {
  const r: any = await client.callTool({ name, arguments: args });
  const text = r.content?.[0]?.text ?? '';
  if (r.isError) throw new Error(text);
  return JSON.parse(text);
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-mcp-'));
  // Seed a draft the way the editor would (the demo site).
  let site: any;
  await engine.generateSite({ kind: 'demo', json: async () => ({}) } as any, engine.DEMO_BRIEF, {
    onPlan: (s) => (site = s),
    onPage: (id, m) => (site = engine.setPageContent(site, id, m)),
  });
  const data = join(dir, 'data');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(data, { recursive: true });
  writeFileSync(join(data, 'draft.json'), JSON.stringify({ site, brief: '', isSample: true, rev: 1 }));
  const handle = createHandler({ dataDir: data, outDir: join(dir, 'www'), engine, mcpToken: TOKEN, password: 'pw' });
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
  client = new Client({ name: 'test', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${TOKEN}` } } }));
}, 60000);

afterAll(async () => {
  await client?.close();
  server?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('MCP server', () => {
  test('rejects requests without the token', async () => {
    const r = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: '{}' });
    expect(r.status).toBe(401);
    const bad = await fetch(`${base}/mcp`, { method: 'POST', headers: { authorization: 'Bearer nope', 'content-type': 'application/json' }, body: '{}' });
    expect(bad.status).toBe(401);
  });

  test('lists the tools and reads the site', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const n of ['get_site', 'set_page_content', 'define_block', 'create_pattern', 'patch_theme_json', 'publish_site', 'export_wordpress']) expect(names).toContain(n);
    const site = await call('get_site');
    expect(site.pages.map((p: any) => p.slug)).toContain('home');
    const catalog = await call('get_block_catalog');
    expect(catalog.coreBlocks.find((b: any) => b.name === 'core/heading').attributes).toContain('level');
    expect(catalog.presets.colors).toContain('primary');
  });

  test('builds a page with a custom block and a synced pattern, patches theme.json, publishes and exports', async () => {
    const def = await call('define_block', {
      name: 'feature-tile',
      title: 'Feature tile',
      attributes: { title: { type: 'string' }, link: { type: 'string', control: 'url' }, wide: { type: 'boolean' } },
      template: '<article class="tile{{#wide}} is-wide{{/wide}}"><h3>{{title}}</h3>{{{content}}}{{#link}}<a href="{{link}}">More</a>{{/link}}</article>',
      css: '.wp-block-prepress-feature-tile .tile{padding:var(--wp--preset--spacing--40)}',
    });
    expect(def.block.name).toBe('prepress/feature-tile');
    expect(def.validation.invalid).toEqual([]);

    const pattern = await call('create_pattern', {
      title: 'Booking CTA',
      synced: true,
      sections: [{ pattern: 'cta-band', props: { heading: 'Book your table', primaryCta: { label: 'Book', url: '/visit/' } } }],
    });
    const ref = pattern.pattern.id;

    const created = await call('create_page', {
      title: 'Catering',
      sections: [
        { pattern: 'hero-centered', props: { heading: 'Catering for 10 to 200', text: 'Office lunches, weddings.', primaryCta: { label: 'Ask', url: '/visit/' } } },
        { name: 'prepress/feature-tile', attributes: { title: 'Weddings & parties', link: 'https://example.org/w', wide: true, nonsense: 1 }, innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'Three-tier cakes.' } }] },
        { name: 'core/block', attributes: { ref } },
      ],
    });
    expect(created.page.slug).toBe('catering');
    expect(created.report.dropped).toContain('prepress/feature-tile.nonsense');
    expect(created.validation.invalid).toEqual([]);

    const page = await call('get_page', { page: 'catering' });
    expect(page.sections).toHaveLength(3);
    expect(page.sections[1].blocks[0].name).toBe('prepress/feature-tile');

    await call('replace_section', { page: 'catering', index: 0, sections: [{ name: 'core/heading', attributes: { level: 1, content: 'Catering' } }] });
    await call('set_part', { part: 'footer', blocks: [{ name: 'core/group', attributes: { align: 'full', backgroundColor: 'contrast', textColor: 'base' }, innerBlocks: [{ name: 'core/site-title' }, { name: 'core/paragraph', attributes: { content: 'Open daily.' } }] }] });
    const patched = await call('patch_theme_json', { patch: { settings: { layout: { wideSize: '1320px' } }, styles: { blocks: { 'core/heading': { typography: { textTransform: 'uppercase' } } } } } });
    expect(patched.patch.settings.layout.wideSize).toBe('1320px');

    const v = await call('validate_site');
    expect(v.invalid).toEqual([]);
    expect(v.brokenPatternRefs).toBeUndefined();

    const pub = await call('publish_site');
    expect(pub.pages).toContain('catering');
    const html = readFileSync(join(dir, 'www', 'catering', 'index.html'), 'utf8');
    expect(html).toContain('class="tile is-wide"');
    expect(html).toContain('Weddings &amp; parties');
    expect(html).toContain('Three-tier cakes.');
    expect(html).toContain('Book your table');
    expect(html).toContain('padding:var(--wp--preset--spacing--40)');
    expect(readFileSync(join(dir, 'www', 'index.html'), 'utf8')).toContain('Open daily.');

    const exp = await call('export_wordpress');
    const dl = await fetch(base + exp.path, { headers: { authorization: `Bearer ${TOKEN}` } });
    expect(dl.status).toBe(200);
    const outer = await JSZip.loadAsync(await dl.arrayBuffer());
    const themeZipName = Object.keys(outer.files).find((f) => f.endsWith('-theme.zip'))!;
    const theme = await JSZip.loadAsync(await outer.file(themeZipName)!.async('uint8array'));
    const files = Object.keys(theme.files);
    const root = files[0].split('/')[0];
    expect(files).toContain(`${root}/blocks/feature-tile/block.json`);
    expect(files).toContain(`${root}/blocks/feature-tile/render.php`);
    expect(files).toContain(`${root}/blocks/feature-tile/style.css`);
    expect(files).toContain(`${root}/inc/prepress-blocks.php`);
    expect(files).toContain(`${root}/assets/prepress-blocks.js`);
    const bj = JSON.parse(await theme.file(`${root}/blocks/feature-tile/block.json`)!.async('string'));
    expect(bj).toMatchObject({ name: 'prepress/feature-tile', apiVersion: 3, render: 'file:./render.php', editorScript: 'prepress-blocks-editor' });
    const fn = await theme.file(`${root}/functions.php`)!.async('string');
    expect(fn).toContain("register_block_type( __DIR__ . '/blocks/' . $block )");
    const tj = JSON.parse(await theme.file(`${root}/theme.json`)!.async('string'));
    expect(tj.settings.layout.wideSize).toBe('1320px');
    const wxrName = Object.keys(outer.files).find((f) => f.endsWith('content.xml'))!;
    const wxr = await outer.file(wxrName)!.async('string');
    expect(wxr).toContain(`<wp:post_id>${ref}</wp:post_id>`);
    expect(wxr).toContain('<wp:post_type><![CDATA[wp_block]]></wp:post_type>');
    expect(wxr).toContain(`<!-- wp:block {"ref":${ref}} /-->`);

    // Without the token, exports can't be downloaded.
    expect((await fetch(base + exp.path)).status).toBe(401);
  }, 60000);

  test('errors come back as tool errors with a useful message', async () => {
    await expect(call('get_page', { page: 'nope' })).rejects.toThrow(/No page "nope"/);
    await expect(call('define_block', { name: 'x y', title: 'X', template: '<p>hi</p>' })).rejects.toThrow(/prepress\/my-block/);
    await expect(call('delete_page', { page: 'home' })).rejects.toThrow(/front page/);
    await expect(call('delete_block', { name: 'feature-tile' })).rejects.toThrow(/is used in page:catering/);
  });

  test('editor saves with a stale revision are refused', async () => {
    const login = await fetch(`${base}/api/login`, { method: 'POST', body: JSON.stringify({ password: 'pw' }) });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const cur = await (await fetch(`${base}/api/site`, { headers: { cookie } })).json();
    const stale = await fetch(`${base}/api/site`, { method: 'PUT', headers: { cookie }, body: JSON.stringify({ site: cur.draft.site, baseRev: cur.draft.rev - 1 }) });
    expect(stale.status).toBe(409);
    expect((await stale.json()).draft.rev).toBe(cur.draft.rev);
    const fresh = await fetch(`${base}/api/site`, { method: 'PUT', headers: { cookie }, body: JSON.stringify({ site: cur.draft.site, baseRev: cur.draft.rev }) });
    expect(fresh.status).toBe(200);
    expect(existsSync(join(dir, 'data', 'draft.json'))).toBe(true);
  });
});
