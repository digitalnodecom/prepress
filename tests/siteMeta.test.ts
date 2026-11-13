// Search & sharing, analytics by provider id, the cookie banner and custom code:
// what lands in published pages, sitemap/robots, the WordPress export, the library, MCP,
// and the sandboxed local preview.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as engine from '../src/lib/engine';
import { createHandler } from '../server/app';
import { cleanCode, cleanIntegration, consentNeeded, mergeIntegrations, mergeSeo } from '../src/lib/siteMeta';
import { renderPage } from '../src/lib/wp/render';
import { publishFiles } from '../src/lib/publish';
import { importLibraryItem, shareTemplate } from '../src/lib/library';
import { exportSite } from '../src/lib/wp/export';
import { updatePage } from '../src/lib/site';
import type { Site } from '../src/lib/types';

let demo: Site;
beforeAll(async () => {
  await engine.generateSite({ kind: 'demo', json: async () => ({}) } as any, engine.DEMO_BRIEF, {
    onPlan: (s) => (demo = s),
    onPage: (id, m) => (demo = engine.setPageContent(demo, id, m)),
  });
}, 60000);

const home = (s: Site) => s.pages.find((p) => p.slug === 'home')!;
const withAll = (s: Site): Site => ({
  ...s,
  seo: { url: 'https://example.com', description: 'Fresh bread every morning.', image: '/uploads/share.jpg', favicon: '/uploads/icon.png' },
  integrations: { googleVerification: 'abcDEF123_-xyz789', ga4: 'G-ABC1234567', plausible: 'example.com' },
  code: { head: '<script src="https://chat.example/w.js"></script>', bodyEnd: '<div id="chat"></div>' },
});

describe('provider ids', () => {
  test('pasted snippets are reduced to the id; anything else is refused', () => {
    expect(cleanIntegration('googleVerification', '<meta name="google-site-verification" content="abcDEF123_-xyz789" />')).toBe('abcDEF123_-xyz789');
    expect(cleanIntegration('ga4', '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234567"></script>')).toBe('G-ABC1234567');
    expect(cleanIntegration('plausible', '<script defer data-domain="Example.com" src="https://plausible.io/js/script.js"></script>')).toBe('example.com');
    expect(cleanIntegration('metaPixel', "fbq('init', '123456789012345');")).toBe('123456789012345');
    expect(cleanIntegration('bingVerification', 'abcdef0123456789abcdef0123456789')).toBe('ABCDEF0123456789ABCDEF0123456789');
    for (const [id, bad] of [['ga4', 'G-1"><script>alert(1)</script>'], ['gtm', 'GTM-'], ['plausible', 'javascript:alert(1)'], ['umami', 'not-a-uuid'], ['nope', 'x']]) {
      expect(() => cleanIntegration(id, bad), `${id} ${bad}`).toThrow();
    }
    expect(mergeIntegrations({ ga4: 'G-ABC1234567' }, { ga4: '', fathom: 'abcdefgh' })).toEqual({ fathom: 'ABCDEFGH' });
    expect(() => mergeSeo(undefined, { image: 'javascript:alert(1)' })).toThrow();
    expect(mergeSeo(undefined, { url: 'example.com/', noindex: false })).toEqual({ url: 'https://example.com' });
    expect(cleanCode({ head: '  ', bodyEnd: '' })).toBeUndefined();
  });
});

describe('published pages', () => {
  test('meta tags everywhere; analytics, banner and custom code only when live', () => {
    const s = withAll(demo);
    const preview = renderPage(s, home(s));
    expect(preview).toContain('<meta name="description" content="Fresh bread every morning.">');
    expect(preview).toContain('<link rel="canonical" href="https://example.com/">');
    expect(preview).toContain('<meta property="og:image" content="https://example.com/uploads/share.jpg">');
    expect(preview).toContain('<link rel="icon" href="/uploads/icon.png" type="image/png">');
    expect(preview).not.toContain('googletagmanager');
    expect(preview).not.toContain('chat.example');
    expect(preview).not.toContain('google-site-verification');

    const live = renderPage(s, home(s), { live: true });
    expect(live).toContain('<meta name="google-site-verification" content="abcDEF123_-xyz789">');
    // GA4 sets cookies: inert until consent. Plausible doesn't: loads right away. Custom code isn't marked: loads.
    expect(live).toMatch(/<template data-pp-consent><script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-ABC1234567"><\/script>/);
    expect(live).toMatch(/\n<script defer data-domain="example\.com" src="https:\/\/plausible\.io\/js\/script\.js"><\/script>/);
    expect(live).toContain('<script src="https://chat.example/w.js"></script>\n</head>');
    expect(live).toMatch(/<div id="chat"><\/div>\n<div id="pp-consent"[^>]*hidden>/);
    expect(live.indexOf('id="pp-consent"')).toBeGreaterThan(live.indexOf('<body'));
  });

  test('code marked as needing consent waits too; no banner when nothing needs it or it is off', () => {
    const s = { ...withAll(demo), code: { bodyEnd: '<script>track()</script>', needsConsent: true } };
    expect(renderPage(s, home(s), { live: true })).toContain('<template data-pp-consent><script>track()</script></template>');
    const quiet = { ...demo, integrations: { plausible: 'example.com' } };
    expect(consentNeeded(quiet)).toBe(false);
    expect(renderPage(quiet, home(quiet), { live: true })).not.toContain('id="pp-consent"');
    const off = { ...withAll(demo), consent: { mode: 'off' as const } };
    const html = renderPage(off, home(off), { live: true });
    expect(html).not.toContain('data-pp-consent');
    expect(html).toContain('<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234567"></script>');
  });

  test('values that bypassed validation (a hand-edited draft) are not rendered', () => {
    const s = { ...demo, integrations: { ga4: 'G-X"><script>alert(1)</script>' } as any, seo: { image: 'javascript:alert(1)' } };
    const html = renderPage(s, home(s), { live: true });
    expect(html).not.toContain('alert(1)');
  });

  test('page descriptions, sitemap and robots', () => {
    let s = withAll(demo);
    const about = s.pages.find((p) => p.slug !== 'home')!;
    s = updatePage(s, about.id, { description: '  Who   we are.\n' });
    expect(s.pages.find((p) => p.id === about.id)!.description).toBe('Who we are.');
    const out = publishFiles(s);
    expect(out.pages[about.slug]).toContain('<meta name="description" content="Who we are.">');
    expect(out.files['sitemap.xml']).toContain(`<loc>https://example.com/${about.slug}/</loc>`);
    expect(out.files['sitemap.xml']).toContain('<loc>https://example.com/</loc>');
    expect(out.files['robots.txt']).toBe('User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n');
    // No address of its own: the publish target's is used; none at all: robots only.
    const bare = { ...demo };
    expect(publishFiles(bare, { siteUrl: 'https://bakery.pages.dev' }).files['sitemap.xml']).toContain('<loc>https://bakery.pages.dev/</loc>');
    expect(Object.keys(publishFiles(bare).files).sort()).toEqual(['prepress.json', 'robots.txt']);
    expect(publishFiles({ ...s, seo: { ...s.seo, noindex: true } }).files['robots.txt']).toBe('User-agent: *\nDisallow: /\n');
  });
});

describe('library and WordPress export', () => {
  test('a shared template carries none of the site settings; importing ignores them', () => {
    const s = withAll(demo);
    const draft = shareTemplate(s, { title: 'T' });
    const shared = (draft.payload as any).template.site;
    for (const k of ['seo', 'integrations', 'consent', 'code']) expect(shared[k], k).toBeUndefined();
    expect(draft.preview).not.toContain('chat.example');
    const evil = { ...shared, code: { head: '<script>steal()</script>' }, integrations: { ga4: 'G-EVIL12345' } };
    const imported = importLibraryItem(demo, { type: 'template', title: 'T', payload: { template: { site: evil } } } as any).site;
    expect(imported.code).toBeUndefined();
    expect(imported.integrations).toBeUndefined();
  });

  test('inc/site-code.php prints the live parts from a nowdoc (nothing in them runs as PHP)', async () => {
    const s = { ...withAll(demo), code: { head: '<?php system("id"); ?>\nPREPRESS_HTML\n<script>x()</script>' } };
    const { bytes } = await exportSite(s);
    const outer = await JSZip.loadAsync(bytes);
    const themeZip = Object.keys(outer.files).find((f) => f.endsWith('-theme.zip'))!;
    const theme = await JSZip.loadAsync(await outer.file(themeZip)!.async('uint8array'));
    const slug = Object.keys(theme.files)[0].split('/')[0];
    const php = await theme.file(`${slug}/inc/site-code.php`)!.async('string');
    expect(php).toContain("echo <<<'PREPRESS_HTML_X'\n");
    expect(php).toContain('<?php system("id"); ?>');
    expect(await theme.file(`${slug}/functions.php`)!.async('string')).toContain("require_once __DIR__ . '/inc/site-code.php';");
    let hasPhp = true;
    try {
      execFileSync('php', ['-v'], { stdio: 'ignore' });
    } catch {
      hasPhp = false;
    }
    if (hasPhp) {
      const dir = mkdtempSync(join(tmpdir(), 'pp-code-'));
      // Run it with stub WordPress hooks: the head prints the code as text, untouched.
      writeFileSync(join(dir, 'site-code.php'), php);
      writeFileSync(join(dir, 'run.php'), `<?php define('ABSPATH', '/'); $h = array(); function add_action($n, $f) { global $h; $h[$n][] = $f; } require 'site-code.php'; foreach ($h['wp_head'] as $f) { $f(); }`);
      const out = execFileSync('php', [join(dir, 'run.php')], { encoding: 'utf8' });
      expect(out).toContain('<?php system("id"); ?>');
      expect(out).toContain('<meta name="google-site-verification"');
      rmSync(dir, { recursive: true, force: true });
    }
    const plain = await exportSite(demo);
    const o2 = await JSZip.loadAsync(plain.bytes);
    const t2 = await JSZip.loadAsync(await o2.file(Object.keys(o2.files).find((f) => f.endsWith('-theme.zip'))!)!.async('uint8array'));
    expect(Object.keys(t2.files).some((f) => f.endsWith('inc/site-code.php'))).toBe(false);
  });
});

describe('server: MCP and the sandboxed preview', () => {
  let server: Server;
  let base = '';
  let dir = '';
  let client: Client;
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r: any = await client.callTool({ name, arguments: args });
    const text = r.content?.[0]?.text ?? '';
    if (r.isError) throw new Error(text);
    return JSON.parse(text);
  };

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'pp-meta-'));
    const data = join(dir, 'data');
    mkdirSync(data, { recursive: true });
    // The owner's code, as the editor saves it.
    writeFileSync(join(data, 'draft.json'), JSON.stringify({ site: { ...demo, code: { head: '<script>window.ownerCode=1</script>' } }, brief: '', rev: 1 }));
    const handle = createHandler({ dataDir: data, outDir: join(dir, 'www'), engine, mcpToken: 't' });
    server = createServer((req, res) => void handle(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    client = new Client({ name: 'test', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: 'Bearer t' } } }));
  }, 60000);
  afterAll(async () => {
    await client?.close();
    server?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('MCP sets ids, SEO and the banner; sees that custom code exists, never its text', async () => {
    await expect(call('set_integrations', { ga4: '<script>alert(1)</script>' })).rejects.toThrow(/Google Analytics 4/);
    expect((await call('set_integrations', { ga4: 'G-ABC1234567' })).cookieBanner).toBe(true);
    await call('set_seo', { url: 'https://bakery.example', description: 'Bread.' });
    await call('set_cookie_banner', { text: 'Cookies?' });
    const about = (await call('get_site')).pages.find((p: any) => p.slug !== 'home');
    await call('update_page', { page: about.slug, description: 'About us.' });
    const site = await call('get_site');
    expect(site.integrations).toEqual({ ga4: 'G-ABC1234567' });
    expect(site.seo).toEqual({ url: 'https://bakery.example', description: 'Bread.' });
    expect(site.pageDescriptions[about.slug]).toBe('About us.');
    expect(site.customCode).toMatchObject({ head: true, bodyEnd: false });
    expect(JSON.stringify(site)).not.toContain('ownerCode');
    const { tools } = await client.listTools();
    expect(tools.some((t) => /code/i.test(t.name))).toBe(false);
  });

  test('publish writes the live pages, sitemap and robots; the preview is sandboxed; null-origin writes are refused', async () => {
    await call('publish_site', { deploy: false });
    const index = readFileSync(join(dir, 'www', 'index.html'), 'utf8');
    expect(index).toContain('window.ownerCode=1');
    expect(index).toContain('Cookies?');
    expect(readFileSync(join(dir, 'www', 'sitemap.xml'), 'utf8')).toContain('<loc>https://bakery.example/</loc>');

    const r = await fetch(`${base}/`);
    expect(r.headers.get('content-security-policy')).toMatch(/^sandbox allow-scripts/);
    expect(r.headers.get('content-security-policy')).not.toContain('allow-same-origin');
    const robots = await fetch(`${base}/robots.txt`);
    expect(await robots.text()).toContain('Sitemap: https://bakery.example/sitemap.xml');

    // A script on the sandboxed preview has origin "null": it can't change anything.
    const w = await fetch(`${base}/api/deploy`, { method: 'PUT', headers: { 'content-type': 'application/json', origin: 'null' }, body: JSON.stringify({ targets: [] }) });
    expect(w.status).toBe(403);
  });
});
