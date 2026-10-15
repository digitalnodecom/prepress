/**
 * Prepress standalone server — the entry point compiled into the binary.
 *
 *   prepress [--port 8080] [--data ./prepress-data] [--out ./prepress-data/public] [--site-url https://example.com]
 *   prepress mcp --data <dir>          (MCP over stdio, server/stdio.ts)
 *
 * Local only: listens on 127.0.0.1 without a password (see server/app.ts).
 *
 * Environment: PORT, PREPRESS_DATA, PREPRESS_OUT, PREPRESS_SITE_URL, PREPRESS_MCP_TOKEN, PREPRESS_APP, PREPRESS_PARENT_PID.
 * A `.env` file in the working directory is read too.
 */
// The DOM shim must load before the engine (WordPress packages touch `window` at import).
import './stdio-guard.ts';
import './dom.ts';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createHandler } from './app.ts';
import { runStdio } from './stdio.ts';
import { listTargets } from './deploy.ts';
import { VERSION } from './version.ts';
// Headless site engine, bundled by `vite build --ssr` (see package.json build:engine).
// @ts-ignore -- build artifact without types; same API as src/lib/engine.ts
import * as engine from '../dist/engine/engine.js';
// Bun inlines the built admin app into the binary.
import adminHtml from '../dist/index.html' with { type: 'text' };


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
/** How an AI client on this machine starts `prepress mcp` for this site (shown in the editor's Site tab). */
function stdioCommand() {
  // Compiled binary: execPath is prepress itself. `bun server/main.ts`: execPath is bun + the script.
  const self = /^(bun|node)(\.exe)?$/i.test(basename(process.execPath)) ? [process.execPath, resolve(process.argv[1])] : [process.execPath];
  return { command: self[0], args: [...self.slice(1), 'mcp', '--data', dataDir, '--out', outDir, ...(siteUrl ? ['--site-url', siteUrl] : [])] };
}

// `prepress mcp …` = MCP over stdio (server/stdio.ts); anything else runs the editor server.
const stdio = process.argv[2] === 'mcp';
/** Started by the desktop app (desktop/src-tauri): AI clients connect over stdio, not HTTP. */
const desktop = process.env.PREPRESS_APP === 'desktop';

// Started by the desktop app: don't outlive it, even if it crashes.
const parentPid = Number(process.env.PREPRESS_PARENT_PID);
if (parentPid > 0) {
  setInterval(() => {
    try {
      process.kill(parentPid, 0);
    } catch (e: any) {
      if (e?.code === 'ESRCH') process.exit(0);
    }
  }, 2000).unref();
}
const args = parseArgs(process.argv.slice(stdio ? 3 : 2));

if (args.version) {
  console.log(`prepress ${VERSION}`);
  process.exit(0);
}
if (args.help) {
  console.log(`prepress ${VERSION} — build a website with the WordPress block editor on your computer,
publish it to any host (SFTP, FTP, S3) or export it to WordPress.

Usage: prepress [options]

  --port <n>          Port on 127.0.0.1 (default 8080, env PORT). Local only, no password.
  --data <dir>        The site's folder: drafts, uploads, publish settings (default ./prepress-data,
                      env PREPRESS_DATA). One folder per site.
  --out <dir>         Where Publish renders the static site (default <data>/public, env PREPRESS_OUT).
                      Publish then uploads it to the site's publish targets (editor → Site →
                      Publish to: sftp://, ftps://, s3:// connection or a folder).
  --site-url <url>    Public address of the site, for "View site" links (env PREPRESS_SITE_URL)
  --mcp-token <t>     Fixed bearer token for the MCP endpoint /mcp (env PREPRESS_MCP_TOKEN).
                      Default: generated into <data>/mcp-token.txt (see the editor's Site tab).
  --no-mcp            Turn the MCP endpoint off

  PREPRESS_PARENT_PID   Exit when this process ends (env only; used by the desktop app)
  PREPRESS_APP=desktop  Set by the desktop app: AI clients use stdio (prepress mcp), /mcp is off

Editor:  http://127.0.0.1:<port>/?admin=1
Preview: http://127.0.0.1:<port>/   (the rendered site, as your host will serve it)

prepress mcp --data <dir> [--out <dir>] [--site-url <url>]
  MCP server on stdin/stdout for AI clients on this machine (Claude Desktop,
  Claude Code). Same tools as /mcp, no port or token. Can run while the editor
  is open on the same --data folder; use the same --out. Example:
    claude mcp add prepress -- prepress mcp --data ~/Sites/example`);
  process.exit(0);
}

if (stdio && !(args.data ?? process.env.PREPRESS_DATA)) {
  console.error('prepress mcp: pass --data <folder> (or PREPRESS_DATA). AI clients start this from an unknown working directory.');
  process.exit(2);
}

const port = Number(args.port ?? process.env.PORT ?? 8080);
const dataDir = resolve(args.data ?? process.env.PREPRESS_DATA ?? 'prepress-data');
const outDir = resolve(args.out ?? process.env.PREPRESS_OUT ?? join(dataDir, 'public'));
const siteUrl = (args['site-url'] ?? process.env.PREPRESS_SITE_URL ?? '').replace(/\/+$/, '') || undefined;

mkdirSync(dataDir, { recursive: true });

if (stdio) {
  try {
    await runStdio({ dataDir, outDir, siteUrl, engine: engine as any });
  } catch (e: any) {
    console.error(String(e?.message ?? e));
    process.exit(1);
  }
} else {

  let handle: ReturnType<typeof createHandler>;
  try {
    handle = createHandler({
    dataDir,
    outDir,
    siteUrl,
    engine: engine as any,
    mcp: !('no-mcp' in args),
    mcpToken: args['mcp-token'] ?? process.env.PREPRESS_MCP_TOKEN ?? undefined,
    stdioCommand: stdioCommand(),
    adminHtml,
    runtime: desktop ? 'desktop' : 'server',
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
  if (args.host && args.host !== '127.0.0.1' && args.host !== 'localhost') console.error('  --host is no longer supported: Prepress has no password and only listens on 127.0.0.1.');
  server.listen(port, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${port}`;
    console.log(`\n  Prepress ${VERSION}\n`);
    console.log(`  Editor   ${base}/?admin=1`);
    console.log(`  Preview  ${base}/`);
    console.log(`  Publish  ${outDir}${siteUrl ? `  →  ${siteUrl}` : ''}`);
    for (const t of listTargets(dataDir)) console.log(`  Target   ${t.name}: ${t.connection}${t.auto ? '' : '  (manual)'}`);
    console.log(`  Data     ${dataDir}`);
    const local = stdioCommand();
    if (desktop) console.log(`  AI (MCP) stdio: ${[local.command, ...local.args].join(' ')}\n`);
    else console.log(`  AI (MCP) ${'no-mcp' in args ? 'off' : `${base}/mcp  (token: Site tab in the editor, or ${join(dataDir, 'mcp-token.txt')})`}\n`);
  });
}
