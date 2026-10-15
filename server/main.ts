/**
 * Prepress standalone server — the entry point compiled into the binary.
 *
 *   prepress [--port 8080] [--host 127.0.0.1] [--data ./prepress-data] [--out /var/www/site] [--site-url https://example.com] [--password secret]
 *
 * Environment: PORT, HOST, PREPRESS_DATA, PREPRESS_OUT, PREPRESS_SITE_URL, PREPRESS_PASSWORD, ANTHROPIC_API_KEY, ANTHROPIC_MODEL.
 * A `.env` file in the working directory is read too.
 */
// The DOM shim must load before the engine (WordPress packages touch `window` at import).
import './dom.ts';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createHandler } from './app.ts';
// Headless site engine, bundled by `vite build --ssr` (see package.json build:engine).
// @ts-ignore -- build artifact without types; same API as src/lib/engine.ts
import * as engine from '../dist/engine/engine.js';
// Bun inlines the built admin app into the binary.
import adminHtml from '../dist/index.html' with { type: 'text' };

const VERSION = '0.4.0';

function loadDotEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') out.help = '1';
    else if (a === '-v' || a === '--version') out.version = '1';
    else if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=', 2);
      // Switches (--no-auth, --no-mcp) and flags followed by another flag take no value.
      out[k] = v ?? (k.startsWith('no-') || argv[i + 1]?.startsWith('--') ? '' : argv[++i] ?? '');
    }
  }
  return out;
}

loadDotEnv(join(process.cwd(), '.env'));
loadDotEnv(join(process.cwd(), '.env.local'));
const args = parseArgs(process.argv.slice(2));

if (args.version) {
  console.log(`prepress ${VERSION}`);
  process.exit(0);
}
if (args.help) {
  console.log(`prepress ${VERSION} — build a website with the WordPress block editor, serve it, export it to WordPress.

Usage: prepress [options]

  --port <n>          Port to listen on (default 8080, env PORT)
  --host <addr>       Interface to bind (default 127.0.0.1, env HOST; use 0.0.0.0 to expose)
  --data <dir>        Private folder: drafts, uploads, password (default ./prepress-data, env PREPRESS_DATA)
  --out <dir>         Where Publish writes the static site (default <data>/public, env PREPRESS_OUT).
                      Point your web server / hosting panel's document root here, or add
                      deploy targets (editor → Site → Deploy: other folders, SFTP servers)
                      that get a copy on every Publish. The site never needs Prepress running.
  --site-url <url>    Public address of the site, for "View site" links (env PREPRESS_SITE_URL)
  --mcp-token <t>     Fixed bearer token for the MCP endpoint /mcp (env PREPRESS_MCP_TOKEN).
                      Default: generated into <data>/mcp-token.txt (see the editor's Site tab).
  --no-mcp            Turn the MCP endpoint off
  --password <pw>     Admin password (env PREPRESS_PASSWORD). If unset, one is generated and
                      stored in <data>/admin-password.txt. Use --no-auth to disable on localhost.

  ANTHROPIC_API_KEY   Enables AI site generation and section edits (env or .env file)
  ANTHROPIC_MODEL     Model id (default claude-sonnet-5-5)

Editor:  http://<host>:<port>/?admin=1
Preview: http://<host>:<port>/   (the published files, as your web server will serve them)`);
  process.exit(0);
}

const port = Number(args.port ?? process.env.PORT ?? 8080);
const host = args.host ?? process.env.HOST ?? '127.0.0.1';
const dataDir = resolve(args.data ?? process.env.PREPRESS_DATA ?? 'prepress-data');
const outDir = resolve(args.out ?? process.env.PREPRESS_OUT ?? join(dataDir, 'public'));
const siteUrl = (args['site-url'] ?? process.env.PREPRESS_SITE_URL ?? '').replace(/\/+$/, '') || undefined;

mkdirSync(dataDir, { recursive: true });

let password = args.password ?? process.env.PREPRESS_PASSWORD ?? '';
let generated = false;
if (!password && !('no-auth' in args)) {
  const file = join(dataDir, 'admin-password.txt');
  if (existsSync(file)) password = readFileSync(file, 'utf8').trim();
  else {
    password = randomBytes(9).toString('base64url');
    writeFileSync(file, password + '\n', { mode: 0o600 });
    generated = true;
  }
}

let handle: ReturnType<typeof createHandler>;
try {
  handle = createHandler({
  dataDir,
  outDir,
  siteUrl,
  engine: engine as any,
  mcp: !('no-mcp' in args),
  mcpToken: args['mcp-token'] ?? process.env.PREPRESS_MCP_TOKEN ?? undefined,
  adminHtml,
  password,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  });
} catch (e: any) {
  console.error(String(e?.message ?? e));
  process.exit(1);
}

const server = createServer((req, res) => void handle(req, res));
server.on('error', (e: any) => {
  console.error(e?.code === 'EADDRINUSE' ? `Port ${port} is in use. Try --port ${port + 1}.` : String(e?.message ?? e));
  process.exit(1);
});
server.listen(port, host, () => {
  const shown = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
  const base = `http://${shown}:${port}`;
  console.log(`\n  Prepress ${VERSION}\n`);
  console.log(`  Editor   ${base}/?admin=1`);
  console.log(`  Preview  ${base}/`);
  console.log(`  Publish  ${outDir}${siteUrl ? `  →  ${siteUrl}` : ''}`);
  let targets: { name: string; type: string; host?: string; path: string; auto: boolean }[] = [];
  try {
    targets = JSON.parse(readFileSync(join(dataDir, 'deploy.json'), 'utf8')).targets ?? [];
  } catch {}
  for (const t of targets) console.log(`  Deploy   ${t.name}: ${t.type === 'sftp' ? `${t.host}:` : ''}${t.path}${t.auto ? '' : '  (manual)'}`);
  console.log(`  Data     ${dataDir}`);
  if (password) console.log(`  Password ${generated ? password + '  (generated, saved in admin-password.txt)' : '(set)'}`);
  else console.log('  Password none (--no-auth): anyone who can reach this port can edit the site');
  console.log(`  AI       ${process.env.ANTHROPIC_API_KEY ? 'on' : 'off (set ANTHROPIC_API_KEY to enable)'}`);
  console.log(`  MCP      ${'no-mcp' in args ? 'off' : `${base}/mcp  (token: Site tab in the editor, or ${join(dataDir, 'mcp-token.txt')})`}\n`);
});
