// MCP view_page: real screenshots in a headless Chromium (skipped when none is installed).
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as engine from '../src/lib/engine';
import { createHandler } from '../server/app';
import { findBrowser } from '../server/screenshot';

const browser = findBrowser();
let dir = '';
let server: Server;
let client: Client;

/** JPEG size from its SOF marker. */
function jpegSize(b64: string) {
  const b = Buffer.from(b64, 'base64');
  for (let i = 2; i < b.length; ) {
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  return null;
}

describe.skipIf(!browser)('view_page', () => {
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'prepress-view-'));
    const { site } = engine.buildStarter('saas', { name: 'Viewtest' });
    mkdirSync(join(dir, 'data'), { recursive: true });
    writeFileSync(join(dir, 'data', 'draft.json'), JSON.stringify({ site, rev: 1 }));
    const handle = createHandler({ dataDir: join(dir, 'data'), engine, mcpToken: 't' });
    server = createServer((q, r) => void handle(q, r));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    client = new Client({ name: 't', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${(server.address() as any).port}/mcp`), { requestInit: { headers: { authorization: 'Bearer t' } } }));
  }, 60000);
  afterAll(async () => {
    await client?.close();
    server?.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const view = async (args: Record<string, unknown>) => {
    const r: any = await client.callTool({ name: 'view_page', arguments: args });
    if (r.isError) throw new Error(r.content[0].text);
    return { image: r.content[0], info: JSON.parse(r.content[1].text) };
  };

  test('whole page on desktop, a section close-up, and a phone view', async () => {
    const full = await view({ page: 'home' });
    expect(full.image).toMatchObject({ type: 'image', mimeType: 'image/jpeg' });
    const fs = jpegSize(full.image.data)!;
    expect(fs.width).toBeLessThanOrEqual(1280);
    expect(full.info.sections.length).toBeGreaterThan(3);
    expect(full.info.pageHeight).toBeGreaterThan(1500);

    const sec = await view({ page: 'home', section: 0 });
    const ss = jpegSize(sec.image.data)!;
    expect(ss.width).toBe(1280);
    expect(ss.height).toBeLessThan(full.info.pageHeight);

    const phone = await view({ page: 'home', device: 'phone', first_screen_only: true });
    expect(jpegSize(phone.image.data)).toEqual({ width: 390, height: 844 });

    await expect(view({ page: 'home', section: 99 })).rejects.toThrow(/no section 99/);
  }, 120000);
});
