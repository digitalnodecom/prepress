// The all-sites MCP connection (`prepress mcp --sites`, server/sites.ts): list, open, switch, new.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as engine from '../src/lib/engine';
import { mcpServerFactory } from '../server/mcp';
import { allSitesContext, cleanFolderName, listSites, newSiteFolder } from '../server/sites';

let dir = '';
let root = '';
let elsewhere = '';
let recent = '';
let client: Client;

const site = (name: string) => engine.buildStarter('blank', { name }).site;
const seed = (path: string, name: string, extra: Record<string, unknown> = {}) => {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'draft.json'), JSON.stringify({ site: { ...site(name), ...extra }, brief: '', isSample: false, rev: 1 }));
};
const nameIn = (path: string) => JSON.parse(readFileSync(join(path, 'draft.json'), 'utf8')).site.name;

async function call(name: string, args: Record<string, unknown> = {}) {
  const r: any = await client.callTool({ name, arguments: args });
  const text = r.content?.[0]?.text ?? '';
  if (r.isError) throw new Error(text);
  return JSON.parse(text);
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-sites-'));
  root = join(dir, 'Prepress');
  seed(join(root, 'Harbor Bakery'), 'Harbor Bakery');
  seed(join(root, 'Studio'), 'North Studio', { seo: { url: 'https://studio.example' } });
  mkdirSync(join(root, 'Not a site'), { recursive: true });
  writeFileSync(join(root, 'Harbor Bakery', 'deploy.json'), JSON.stringify({ targets: [{ id: 't', name: 'Studio host', connection: 'sftp://me:secret@host/www', url: 'https://harbor.example', auto: false }] }));
  // A site the desktop app opened outside the sites folder (its recent list), and one outside both.
  elsewhere = join(dir, 'Clients', 'Elsewhere');
  seed(elsewhere, 'Elsewhere Co');
  seed(join(dir, 'Hidden'), 'Hidden');
  recent = join(dir, 'sites.json');
  writeFileSync(recent, JSON.stringify({ sites: [{ path: elsewhere, name: 'Elsewhere Co', opened: 1 }, { path: join(dir, 'gone'), name: 'Gone', opened: 0 }] }));

  const [a, b] = InMemoryTransport.createLinkedPair();
  await mcpServerFactory(allSitesContext({ root, recentFile: recent, engine: engine as any }))().connect(a);
  client = new Client({ name: 'test', version: '1' });
  await client.connect(b);
}, 60000);

afterAll(async () => {
  await client?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('all-sites connection', () => {
  test('lists site folders and recent sites, never deploy secrets', () => {
    const sites = listSites(root, recent);
    expect(sites.map((s) => s.name).sort()).toEqual(['Elsewhere Co', 'Harbor Bakery', 'North Studio']);
    expect(sites.find((s) => s.folder === 'Harbor Bakery')!.address).toBe('https://harbor.example');
    expect(sites.find((s) => s.folder === 'Studio')!.address).toBe('https://studio.example');
    expect(JSON.stringify(sites)).not.toContain('secret');
  });

  test('folder names are safe on every OS, and new folders never reuse a site', () => {
    expect(cleanFolderName(' a/b:c*?. ')).toBe('a-b-c--');
    expect(() => cleanFolderName(' .. ')).toThrow(/name/);
    expect(newSiteFolder(root, 'Harbor Bakery')).toBe(join(root, 'Harbor Bakery 2'));
    expect(newSiteFolder(root, 'Not a site')).toBe(join(root, 'Not a site')); // empty folder reused
  });

  test('says how to start, and tools wait for open_site', async () => {
    expect(client.getInstructions()).toMatch(/list_sites/);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(['list_sites', 'open_site', 'new_site', 'get_site', 'create_site']));
    await expect(call('get_site')).rejects.toThrow(/open_site/);
    await expect(call('list_media')).rejects.toThrow(/open_site/);
    const l = await call('list_sites');
    expect(l.open).toBeNull();
    expect(l.sites).toHaveLength(3);
  });

  test('opens a site by folder or name, edits only that one, switches', async () => {
    const o = await call('open_site', { site: 'studio' });
    expect(o).toMatchObject({ ok: true, name: 'North Studio', address: 'https://studio.example' });
    expect((await call('get_site')).name).toBe('North Studio');
    await call('set_site_info', { name: 'North Studio Co' });
    expect(nameIn(join(root, 'Studio'))).toBe('North Studio Co');
    expect(nameIn(join(root, 'Harbor Bakery'))).toBe('Harbor Bakery');

    await call('open_site', { site: 'Elsewhere Co' });
    expect((await call('get_site')).name).toBe('Elsewhere Co');
    expect((await call('list_sites')).sites.find((s: any) => s.open).path).toBe(elsewhere);
  });

  test('only listed sites open', async () => {
    await expect(call('open_site', { site: join(dir, 'Hidden') })).rejects.toThrow(/No site/);
    await expect(call('open_site', { site: 'gone' })).rejects.toThrow(/No site/);
    await expect(call('open_site', { site: '../Hidden' })).rejects.toThrow(/No site/);
  });

  test('new_site makes a folder and create_site fills it', async () => {
    const n = await call('new_site', { name: 'Pottery Shed' });
    expect(n.open).toBe(join(root, 'Pottery Shed'));
    await call('create_site', { name: 'Pottery Shed', starter: 'blank' });
    expect(nameIn(join(root, 'Pottery Shed'))).toBe('Pottery Shed');
    expect((await call('list_sites')).sites.map((s: any) => s.folder)).toContain('Pottery Shed');
    // The other sites were not touched.
    expect(nameIn(elsewhere)).toBe('Elsewhere Co');
    expect(existsSync(join(dir, 'Hidden', 'uploads'))).toBe(false);
  });
});
