/**
 * One-click MCP setup for AI apps on this computer (desktop app only): add or
 * remove this site's `prepress mcp` entry in each app's own config file.
 *
 * Edits are surgical — other servers, comments and formatting are kept — and
 * the first time Prepress changes a file it keeps a copy next to it
 * (`<file>.before-prepress`). Each site gets its own entry, named
 * `prepress-<site folder>`, so several sites can be connected at once.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';

export interface StdioCommand {
  command: string;
  args: string[];
}

type Format = 'json-mcpServers' | 'json-servers' | 'claude-code' | 'toml-codex' | 'yaml-hermes';

interface ClientDef {
  id: string;
  name: string;
  format: Format;
  /** Config file for this OS. */
  file(home: string, env: NodeJS.ProcessEnv): string;
  /** Is the app installed (its config folder exists)? */
  installed(home: string, env: NodeJS.ProcessEnv): boolean;
  /** What the user does after connecting. */
  after: string;
}

export interface ClientStatus {
  id: string;
  name: string;
  installed: boolean;
  connected: boolean;
  /** Connected, but to another Prepress location (the app moved): connect again to fix. */
  outdated: boolean;
  file: string;
  after: string;
  /** The file exists but can't be edited safely (e.g. comments in JSON): set it up by hand. */
  problem?: string;
}

const appData = (home: string, env: NodeJS.ProcessEnv) => env.APPDATA || join(home, 'AppData', 'Roaming');
/** Per-OS app support folder (macOS Application Support, Windows %APPDATA%, Linux ~/.config). */
const appSupport = (home: string, env: NodeJS.ProcessEnv, name: string) =>
  process.platform === 'darwin' ? join(home, 'Library', 'Application Support', name) : process.platform === 'win32' ? join(appData(home, env), name) : join(env.XDG_CONFIG_HOME || join(home, '.config'), name);

export const CLIENTS: ClientDef[] = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    format: 'json-mcpServers',
    file: (h, e) => join(appSupport(h, e, 'Claude'), 'claude_desktop_config.json'),
    installed: (h, e) => existsSync(appSupport(h, e, 'Claude')) || existsSync('/Applications/Claude.app'),
    after: 'Quit and reopen Claude Desktop.',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    format: 'claude-code',
    file: (h) => join(h, '.claude.json'),
    installed: (h) => existsSync(join(h, '.claude.json')) || existsSync(join(h, '.claude')),
    after: 'Start a new Claude Code session (/mcp lists it).',
  },
  {
    id: 'codex',
    name: 'Codex',
    format: 'toml-codex',
    file: (h, e) => join(e.CODEX_HOME || join(h, '.codex'), 'config.toml'),
    installed: (h, e) => existsSync(e.CODEX_HOME || join(h, '.codex')),
    after: 'Start a new Codex session (CLI or IDE extension).',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    format: 'json-mcpServers',
    file: (h) => join(h, '.cursor', 'mcp.json'),
    installed: (h) => existsSync(join(h, '.cursor')),
    after: 'Cursor picks it up in Settings → MCP (toggle it on if needed).',
  },
  {
    id: 'vscode',
    name: 'VS Code (Copilot)',
    format: 'json-servers',
    file: (h, e) => join(appSupport(h, e, 'Code'), 'User', 'mcp.json'),
    installed: (h, e) => existsSync(join(appSupport(h, e, 'Code'), 'User')),
    after: 'In VS Code: Command Palette → MCP: List Servers → start it.',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    format: 'json-mcpServers',
    file: (h) => join(h, '.codeium', 'windsurf', 'mcp_config.json'),
    installed: (h) => existsSync(join(h, '.codeium', 'windsurf')),
    after: 'Refresh the MCP list in Windsurf (Cascade → MCP).',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    format: 'json-mcpServers',
    file: (h) => join(h, '.lmstudio', 'mcp.json'),
    installed: (h) => existsSync(join(h, '.lmstudio')),
    after: 'LM Studio reloads mcp.json automatically.',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    format: 'yaml-hermes',
    file: (h) => join(h, '.hermes', 'config.yaml'),
    installed: (h) => existsSync(join(h, '.hermes')),
    after: 'Restart Hermes.',
  },
];

/** The entry name for a site: prepress-<folder>. */
export function serverName(dataDir: string): string {
  const slug = basename(dataDir).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `prepress${slug ? `-${slug}` : ''}`;
}

// ---------- file helpers ----------

function writeKeepingOriginal(file: string, text: string) {
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file) && !existsSync(`${file}.before-prepress`)) copyFileSync(file, `${file}.before-prepress`);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

const readText = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : '');

class Unsafe extends Error {}

function readJson(file: string): Record<string, any> {
  const text = readText(file);
  if (!text.trim()) return {};
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Unsafe(`${file} is not a JSON object`);
    return v;
  } catch (e) {
    if (e instanceof Unsafe) throw e;
    throw new Unsafe(`${basename(file)} has comments or isn't plain JSON, so Prepress won't rewrite it. Add the entry by hand (copy it below).`);
  }
}

/** Preserve the file's indentation style. */
const indentOf = (text: string) => text.match(/\n([ \t]+)"/)?.[1] ?? '  ';

// ---------- formats ----------

type Entry = { command: string; args: string[] } & Record<string, unknown>;

interface Adapter {
  get(file: string, name: string): Entry | null;
  set(file: string, name: string, cmd: StdioCommand): void;
  remove(file: string, name: string): void;
}

const jsonAdapter = (key: 'mcpServers' | 'servers', extra: Record<string, unknown> = {}): Adapter => ({
  get(file, name) {
    return readJson(file)[key]?.[name] ?? null;
  },
  set(file, name, cmd) {
    const text = readText(file);
    const j = readJson(file);
    j[key] = { ...(j[key] ?? {}), [name]: { ...extra, command: cmd.command, args: cmd.args } };
    writeKeepingOriginal(file, JSON.stringify(j, null, indentOf(text)) + '\n');
  },
  remove(file, name) {
    if (!existsSync(file)) return;
    const text = readText(file);
    const j = readJson(file);
    if (!j[key]?.[name]) return;
    delete j[key][name];
    writeKeepingOriginal(file, JSON.stringify(j, null, indentOf(text)) + '\n');
  },
});

/** TOML basic string. */
const tq = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
const tomlHeader = (name: string) => new RegExp(`^\\[mcp_servers\\.(?:"${name}"|${name})\\]\\s*(#.*)?$`);

/** Codex config.toml: replace/append our `[mcp_servers.<name>]` table, leave everything else byte-for-byte. */
const codexAdapter: Adapter = {
  get(file, name) {
    const lines = readText(file).split('\n');
    const i = lines.findIndex((l) => tomlHeader(name).test(l.trim()));
    if (i < 0) return null;
    const body = lines.slice(i + 1, nextTable(lines, i + 1)).join('\n');
    const command = body.match(/^\s*command\s*=\s*"((?:[^"\\]|\\.)*)"/m)?.[1]?.replace(/\\(.)/g, '$1') ?? '';
    const argsRaw = body.match(/^\s*args\s*=\s*\[([\s\S]*?)\]/m)?.[1] ?? '';
    const args = [...argsRaw.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, '$1'));
    return { command, args };
  },
  set(file, name, cmd) {
    const block = [`[mcp_servers.${name}]`, `command = ${tq(cmd.command)}`, `args = [${cmd.args.map(tq).join(', ')}]`];
    const lines = removeTable(readText(file).split('\n'), name);
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    writeKeepingOriginal(file, [...lines, ...(lines.length ? [''] : []), ...block, ''].join('\n'));
  },
  remove(file, name) {
    if (!existsSync(file) || !this.get(file, name)) return;
    writeKeepingOriginal(file, removeTable(readText(file).split('\n'), name).join('\n'));
  },
};

function nextTable(lines: string[], from: number) {
  for (let j = from; j < lines.length; j++) if (/^\s*\[/.test(lines[j])) return j;
  return lines.length;
}
function removeTable(lines: string[], name: string) {
  const i = lines.findIndex((l) => tomlHeader(name).test(l.trim()));
  if (i < 0) return lines;
  let end = nextTable(lines, i + 1);
  // Also drop sub-tables like [mcp_servers.<name>.env].
  while (end < lines.length && new RegExp(`^\\s*\\[mcp_servers\\.(?:"${name}"|${name})\\.`).test(lines[end])) end = nextTable(lines, end + 1);
  return [...lines.slice(0, i), ...lines.slice(end)];
}

/** Hermes config.yaml: our entry under the top-level `mcp_servers:` map, written as JSON-style values (valid YAML). */
const hermesAdapter: Adapter = {
  get(file, name) {
    const lines = readText(file).split('\n');
    const r = yamlEntry(lines, name);
    if (!r) return null;
    const body = lines.slice(r.start, r.end).join('\n');
    const command = body.match(/command:\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? body.match(/command:\s*(\S+)/)?.[1] ?? '';
    const args = (() => {
      const m = body.match(/args:\s*(\[[^\n]*\])/);
      try {
        return m ? (JSON.parse(m[1]) as string[]) : [];
      } catch {
        return [];
      }
    })();
    return { command: command.replace(/\\(.)/g, '$1'), args };
  },
  set(file, name, cmd) {
    let lines = readText(file).split('\n');
    const r = yamlEntry(lines, name);
    if (r) lines = [...lines.slice(0, r.start), ...lines.slice(r.end)];
    const top = lines.findIndex((l) => /^mcp_servers:\s*(#.*)?$/.test(l) || /^mcp_servers:\s*(\{\s*\}|null|~)?\s*$/.test(l));
    const entry = (ind: string) => [`${ind}${name}:`, `${ind}${ind}command: ${JSON.stringify(cmd.command)}`, `${ind}${ind}args: ${JSON.stringify(cmd.args)}`];
    if (top < 0) {
      if (lines.some((l) => /^mcp_servers\s*:/.test(l))) throw new Unsafe('config.yaml has mcp_servers in a form Prepress can’t edit safely. Add the entry by hand (copy it below).');
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      lines.push(...(lines.length ? [''] : []), 'mcp_servers:', ...entry('  '), '');
    } else {
      lines[top] = 'mcp_servers:';
      const ind = lines.slice(top + 1).find((l) => /^\s+\S/.test(l) && !/^\s*#/.test(l))?.match(/^(\s+)/)?.[1] ?? '  ';
      lines.splice(top + 1, 0, ...entry(ind));
    }
    writeKeepingOriginal(file, lines.join('\n'));
  },
  remove(file, name) {
    if (!existsSync(file)) return;
    const lines = readText(file).split('\n');
    const r = yamlEntry(lines, name);
    if (!r) return;
    writeKeepingOriginal(file, [...lines.slice(0, r.start), ...lines.slice(r.end)].join('\n'));
  },
};

/** Line range of `  <name>:` inside the top-level `mcp_servers:` block. */
function yamlEntry(lines: string[], name: string): { start: number; end: number } | null {
  const top = lines.findIndex((l) => /^mcp_servers:/.test(l));
  if (top < 0) return null;
  let start = -1;
  let ind = '';
  for (let i = top + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\S/.test(l)) break; // next top-level key
    const m = l.match(/^(\s+)([^\s:#][^:]*):\s*$/);
    if (m && m[2].replace(/^["']|["']$/g, '') === name) {
      start = i;
      ind = m[1];
      break;
    }
  }
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === '' || lines[end].match(/^(\s*)/)![1].length > ind.length)) end++;
  // Keep a trailing blank line that separates the next entry.
  while (end > start + 1 && lines[end - 1].trim() === '') end--;
  return { start, end };
}

const ADAPTERS: Record<Format, Adapter> = {
  'json-mcpServers': jsonAdapter('mcpServers'),
  'json-servers': jsonAdapter('servers', { type: 'stdio' }),
  'claude-code': jsonAdapter('mcpServers', { type: 'stdio', env: {} }),
  'toml-codex': codexAdapter,
  'yaml-hermes': hermesAdapter,
};

// ---------- API ----------

export function createClients(opts: { dataDir: string; stdio: StdioCommand; home?: string; env?: NodeJS.ProcessEnv }) {
  const home = opts.home ?? homedir();
  const env = opts.env ?? process.env;
  const name = serverName(opts.dataDir);
  const same = (e: Entry | null) => !!e && e.command === opts.stdio.command && JSON.stringify(e.args) === JSON.stringify(opts.stdio.args);

  function status(c: ClientDef): ClientStatus {
    const file = c.file(home, env);
    const base = { id: c.id, name: c.name, installed: c.installed(home, env), file, after: c.after };
    try {
      const e = ADAPTERS[c.format].get(file, name);
      return { ...base, connected: !!e, outdated: !!e && !same(e) };
    } catch (err) {
      return { ...base, connected: false, outdated: false, problem: String((err as Error).message) };
    }
  }

  return {
    name,
    list: () => CLIENTS.map(status),
    connect(id: string): ClientStatus {
      const c = CLIENTS.find((x) => x.id === id);
      if (!c) throw Object.assign(new Error(`Unknown app "${id}"`), { status: 404 });
      ADAPTERS[c.format].set(c.file(home, env), name, opts.stdio);
      return status(c);
    },
    disconnect(id: string): ClientStatus {
      const c = CLIENTS.find((x) => x.id === id);
      if (!c) throw Object.assign(new Error(`Unknown app "${id}"`), { status: 404 });
      ADAPTERS[c.format].remove(c.file(home, env), name);
      return status(c);
    },
  };
}
