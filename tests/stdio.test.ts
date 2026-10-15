// Local MCP (`prepress mcp`, stdio): the same tools working straight on a data
// folder, possibly while an editor server has the same folder open.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as engine from '../src/lib/engine';
import { createSiteCore } from '../server/app';
import { mcpServerFactory } from '../server/mcp';
import { DraftStore, type ChangeEvent } from '../server/store';

let dir = '';
let client: Client;

async function call(name: string, args: Record<string, unknown> = {}) {
  const r: any = await client.callTool({ name, arguments: args });
  const text = r.content?.[0]?.text ?? '';
  if (r.isError) throw new Error(text);
  return JSON.parse(text);
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-stdio-'));
  // A brand-new folder: no draft yet, as when an AI client is set up before the editor was ever opened.
  const core = createSiteCore({ dataDir: join(dir, 'data'), outDir: join(dir, 'www'), engine });
  const server = mcpServerFactory({ store: core.store, engine, publishSite: core.publishSite, exportWordPress: core.exportWordPress, deploy: core.deploy, deployTargets: core.deployer.view })();
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: 'test', version: '1' });
  await client.connect(b);
}, 60000);

afterAll(async () => {
  await client?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('local MCP on a data folder', () => {
  test('create_site starts a site in an empty folder, then it can be filled and published', async () => {
    await expect(call('get_site')).rejects.toThrow(/create_site/);

    const created = await call('create_site', { name: 'Harbor Bakery', tagline: 'Bread at dawn', pages: [{ title: 'Home' }, { title: 'Menu' }], design: { radius: 'round' } });
    expect(created.pages.map((p: any) => p.slug)).toEqual(['home', 'menu']);
    expect(created.validation.invalid).toEqual([]);

    await expect(call('create_site', { name: 'Other' })).rejects.toThrow(/already a site/);

    await call('set_page_content', { page: 'home', sections: [{ name: 'core/heading', attributes: { content: 'Fresh bread', level: 1 } }] });
    const site = await call('get_site');
    expect(site.name).toBe('Harbor Bakery');
    expect(site.design.radius).toBe('round');

    const pub = await call('publish_site');
    expect(pub.pages.sort()).toEqual(['home', 'menu']);
    const html = readFileSync(join(dir, 'www', 'index.html'), 'utf8');
    expect(html).toContain('Fresh bread');
    expect(html).toContain('Harbor Bakery'); // generated header

    const exp = await call('export_wordpress');
    expect(existsSync(exp.localPath)).toBe(true);
  });

  test('create_site replace: true starts over and keeps a backup of the old draft', async () => {
    const r = await call('create_site', { name: 'Second', replace: true });
    expect(readFileSync(r.previousDraftBackup, 'utf8')).toContain('Harbor Bakery');
    expect((await call('get_site')).pages.map((p: any) => p.slug)).toEqual(['home']);
  });

  test('starters: list, create from one with a brief, change the brief', async () => {
    const { starters } = await call('list_starters');
    expect(starters.map((x: any) => x.id)).toContain('saas');
    const r = await call('create_site', { name: 'Orbit Notes', starter: 'saas', brief: 'Note-taking app for researchers.', replace: true });
    expect(r.pages.map((p: any) => p.slug)).toEqual(['home', 'pricing', 'about']);
    expect(r.pages[0].sections.length).toBeGreaterThan(3);
    expect(r.validation.invalid).toEqual([]);
    const site = await call('get_site');
    expect(site.name).toBe('Orbit Notes');
    expect(site.brief).toMatch(/Orbit Notes: a software product[\s\S]*Note-taking app for researchers\./);
    const page = await call('get_page', { page: 'home' });
    expect(JSON.stringify(page)).toContain('Orbit Notes');
    await call('set_brief', { brief: 'Orbit Notes — calm, academic tone.' });
    expect((await call('get_site')).brief).toBe('Orbit Notes — calm, academic tone.');
    await expect(call('create_site', { name: 'X', starter: 'nope', replace: true })).rejects.toThrow(/Unknown starter/);
  });

  test('another process on the same folder sees the change (editor reload)', async () => {
    const other = new DraftStore(join(dir, 'data'));
    const events: ChangeEvent[] = [];
    other.subscribe((e) => events.push(e));
    other.watch(30);
    try {
      await call('set_site_info', { name: 'Renamed by AI' });
      for (let i = 0; i < 100 && !events.length; i++) await new Promise((r) => setTimeout(r, 20));
      expect(events).toEqual([expect.objectContaining({ by: 'mcp', summary: 'Updated site title/tagline' })]);
      expect(events[0].rev).toBe(other.read()!.rev);
    } finally {
      other.close();
    }
  });

  test('writes from two stores on one folder are serialized by the lock file', async () => {
    const data = join(dir, 'data');
    const a = new DraftStore(data);
    const b = new DraftStore(data);
    const start = a.read()!.rev;
    const bump = (s: DraftStore) => s.update('test', async (cur) => {
      await new Promise((r) => setTimeout(r, 2)); // widen the read-modify-write window
      return { site: { ...cur.site, counter: (cur.site.counter ?? 0) + 1 } };
    });
    await Promise.all(Array.from({ length: 20 }, (_, i) => bump(i % 2 ? a : b)));
    const end = a.read()!;
    expect(end.rev).toBe(start + 20);
    expect(end.site.counter).toBe(20);
    expect(existsSync(join(data, 'draft.lock'))).toBe(false);
  });
});
