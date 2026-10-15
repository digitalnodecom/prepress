// @vitest-environment node
// One-click MCP setup: edits each AI app's config surgically, keeps a backup, undoes cleanly.
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { CLIENTS, createClients, serverName } from '../server/clients';

let home = '';
const stdio = { command: '/Applications/Prepress.app/Contents/MacOS/prepress', args: ['mcp', '--data', '/Users/me/Documents/Prepress/Harbor Bakery', '--out', '/Users/me/Documents/Prepress/Harbor Bakery/public'] };
const env = { APPDATA: '', XDG_CONFIG_HOME: '' } as NodeJS.ProcessEnv;
const file = (id: string) => CLIENTS.find((c) => c.id === id)!.file(home, env);
const put = (f: string, text: string) => {
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, text);
};
const make = () => createClients({ dataDir: '/Users/me/Documents/Prepress/Harbor Bakery', stdio, home, env });

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'prepress-home-'));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

const hasPython = (() => {
  try {
    execFileSync('python3', ['-c', 'import tomllib']);
    return true;
  } catch {
    return false;
  }
})();
const parseToml = (text: string) => JSON.parse(execFileSync('python3', ['-c', 'import sys, tomllib, json; print(json.dumps(tomllib.loads(sys.stdin.read())))'], { input: text }).toString());

describe('AI app connections', () => {
  test('entry name per site', () => {
    expect(serverName('/x/Harbor Bakery')).toBe('prepress-harbor-bakery');
    expect(serverName('/x/Café Ümlaut!')).toBe('prepress-cafe-umlaut');
  });

  test('nothing installed: listed, not installed, not connected', () => {
    const list = make().list();
    expect(list.map((c) => c.id)).toEqual(['claude-desktop', 'claude-code', 'codex', 'cursor', 'vscode', 'windsurf', 'lmstudio', 'hermes']);
    expect(list.every((c) => !c.connected)).toBe(true);
    expect(list.find((c) => c.id === 'cursor')!.installed).toBe(false);
  });

  test('Claude Desktop: adds next to other servers, keeps settings, backup, clean undo', () => {
    const original = JSON.stringify({ mcpServers: { github: { command: 'npx', args: ['-y', 'gh'] } }, globalShortcut: 'Alt+Space' }, null, 2) + '\n';
    put(file('claude-desktop'), original);
    const c = make();
    expect(c.list()[0]).toMatchObject({ installed: true, connected: false });
    expect(c.connect('claude-desktop')).toMatchObject({ connected: true, outdated: false });
    const j = JSON.parse(readFileSync(file('claude-desktop'), 'utf8'));
    expect(j.mcpServers['prepress-harbor-bakery']).toEqual(stdio);
    expect(j.mcpServers.github).toEqual({ command: 'npx', args: ['-y', 'gh'] });
    expect(j.globalShortcut).toBe('Alt+Space');
    expect(readFileSync(`${file('claude-desktop')}.before-prepress`, 'utf8')).toBe(original);
    c.connect('claude-desktop'); // idempotent
    expect(Object.keys(JSON.parse(readFileSync(file('claude-desktop'), 'utf8')).mcpServers)).toEqual(['github', 'prepress-harbor-bakery']);
    expect(c.disconnect('claude-desktop').connected).toBe(false);
    expect(readFileSync(file('claude-desktop'), 'utf8')).toBe(original);
  });

  test('Claude Code: user-scope mcpServers in ~/.claude.json, everything else untouched', () => {
    put(file('claude-code'), JSON.stringify({ numStartups: 42, projects: { '/x': { allowedTools: [] } } }));
    const c = make();
    c.connect('claude-code');
    const j = JSON.parse(readFileSync(file('claude-code'), 'utf8'));
    expect(j.mcpServers['prepress-harbor-bakery']).toEqual({ type: 'stdio', env: {}, ...stdio });
    expect(j.numStartups).toBe(42);
    expect(j.projects['/x']).toEqual({ allowedTools: [] });
  });

  test('a moved app shows as outdated; connecting again updates it', () => {
    put(file('cursor'), JSON.stringify({ mcpServers: { 'prepress-harbor-bakery': { command: '/old/prepress', args: [] } } }));
    const c = make();
    expect(c.list().find((x) => x.id === 'cursor')).toMatchObject({ connected: true, outdated: true });
    expect(c.connect('cursor')).toMatchObject({ connected: true, outdated: false });
  });

  test.skipIf(!hasPython)('Codex: TOML table appended; comments and other tables untouched; clean undo', () => {
    const original = [
      '# my codex settings',
      'model = "gpt-5"',
      '',
      '[mcp_servers.docs]',
      'command = "npx"',
      'args = ["-y", "docs-mcp"]',
      '',
      '[mcp_servers.docs.env]',
      'TOKEN = "abc"',
      '',
      '[profiles.fast]',
      'model = "gpt-5-mini"',
      '',
    ].join('\n');
    put(file('codex'), original);
    const c = make();
    c.connect('codex');
    const text = readFileSync(file('codex'), 'utf8');
    const t = parseToml(text);
    expect(t.mcp_servers['prepress-harbor-bakery']).toEqual(stdio);
    expect(t.mcp_servers.docs).toEqual({ command: 'npx', args: ['-y', 'docs-mcp'], env: { TOKEN: 'abc' } });
    expect(t.profiles.fast.model).toBe('gpt-5-mini');
    expect(text.startsWith(original.trimEnd())).toBe(true);
    expect(c.list().find((x) => x.id === 'codex')).toMatchObject({ connected: true, outdated: false });
    c.connect('codex');
    expect(readFileSync(file('codex'), 'utf8').match(/\[mcp_servers\.prepress-harbor-bakery\]/g)).toHaveLength(1);
    c.disconnect('codex');
    expect(readFileSync(file('codex'), 'utf8').trimEnd()).toBe(original.trimEnd());
  });

  test('VS Code: "servers" key with type stdio; a JSONC file with comments is left alone', () => {
    put(file('vscode'), '{\n  "servers": {}\n}\n');
    const c = make();
    c.connect('vscode');
    expect(JSON.parse(readFileSync(file('vscode'), 'utf8')).servers['prepress-harbor-bakery']).toEqual({ type: 'stdio', ...stdio });

    put(file('vscode'), '{\n  // my servers\n  "servers": {}\n}\n');
    expect(c.list().find((x) => x.id === 'vscode')!.problem).toMatch(/comments/);
    expect(() => c.connect('vscode')).toThrow(/by hand/);
    expect(readFileSync(file('vscode'), 'utf8')).toContain('// my servers');
  });

  test('Hermes: YAML entry under mcp_servers, other keys and comments kept; works without mcp_servers too', () => {
    const original = ['# hermes', 'model: nous/hermes-4', 'mcp_servers:', '  filesystem:', '    command: "npx"', '    args: ["-y", "fs"]', '', 'terminal:', '  backend: local', ''].join('\n');
    put(file('hermes'), original);
    const c = make();
    c.connect('hermes');
    const y = YAML.parse(readFileSync(file('hermes'), 'utf8'));
    expect(y.mcp_servers['prepress-harbor-bakery']).toEqual(stdio);
    expect(y.mcp_servers.filesystem).toEqual({ command: 'npx', args: ['-y', 'fs'] });
    expect(y.terminal).toEqual({ backend: 'local' });
    expect(c.list().find((x) => x.id === 'hermes')).toMatchObject({ connected: true, outdated: false });
    c.connect('hermes');
    expect(Object.keys(YAML.parse(readFileSync(file('hermes'), 'utf8')).mcp_servers)).toEqual(['prepress-harbor-bakery', 'filesystem']);
    c.disconnect('hermes');
    expect(readFileSync(file('hermes'), 'utf8')).toBe(original);

    put(file('hermes'), 'model: nous/hermes-4\n');
    c.connect('hermes');
    expect(YAML.parse(readFileSync(file('hermes'), 'utf8'))).toEqual({ model: 'nous/hermes-4', mcp_servers: { 'prepress-harbor-bakery': stdio } });
  });

  test('connecting an app with no config file yet creates it', () => {
    mkdirSync(join(home, '.lmstudio'));
    const c = make();
    expect(c.connect('lmstudio')).toMatchObject({ installed: true, connected: true });
    expect(existsSync(`${file('lmstudio')}.before-prepress`)).toBe(false);
  });
});
