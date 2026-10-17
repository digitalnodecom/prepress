// Publish a library set (library-sets/<set>/) to the Prepress library as official items,
// bottom-up (style → blocks → patterns → template) with their lineage (`uses`).
//
//   npm run build && npx bun scripts/seed-library.ts kinetic --target local|prod [--api URL]
//
// Items are owned by an "official" site token kept outside the repo
// (~/.config/prepress/official-token, created on first run). Marking items official
// needs the library admin token: --target prod reads it over SSH from the hosting
// server at run time (never printed or stored); --target local takes it from
// PREPRESS_ADMIN_TOKEN. Re-running updates the same items: prod ids are kept in
// library-sets/<set>/published.json (ids aren't secret), local ones in ~/.config/prepress.
import '../server/dom.ts';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
// @ts-ignore -- build artifact
import * as engine from '../dist/engine/engine.js';
import { SETS as ALL } from '../library-sets/index.ts';
import type { BuiltSet } from '../src/lib/librarySets.ts';

const SETS: Record<string, unknown> = ALL;
const PROD_API = 'https://prepress.digitalno.de';
const PROD_SSH = 'root@95.217.217.146';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const setName = args[0];
const target = flag('target') ?? 'local';
if (!SETS[setName] || !['local', 'prod'].includes(target)) {
  console.error('usage: bun scripts/seed-library.ts <set> --target local|prod [--api URL]');
  process.exit(1);
}
const api = (flag('api') ?? (target === 'prod' ? PROD_API : 'http://127.0.0.1:8787')).replace(/\/$/, '');

const configDir = join(homedir(), '.config', 'prepress');
mkdirSync(configDir, { recursive: true, mode: 0o700 });
const tokenFile = join(configDir, 'official-token');
if (!existsSync(tokenFile)) writeFileSync(tokenFile, randomBytes(32).toString('hex'), { mode: 0o600 });
const token = readFileSync(tokenFile, 'utf8').trim();

const admin =
  target === 'prod'
    ? execFileSync('ssh', [PROD_SSH, "sed -n 's/^LIBRARY_ADMIN_TOKEN=//p' /etc/prepress-hosting.env"], { encoding: 'utf8' }).trim()
    : (process.env.PREPRESS_ADMIN_TOKEN ?? '');
if (!admin) {
  console.error(target === 'prod' ? 'Could not read LIBRARY_ADMIN_TOKEN on the server' : 'Set PREPRESS_ADMIN_TOKEN to the local hosting API admin token');
  process.exit(1);
}

const stateFile = target === 'prod' ? join('library-sets', setName, 'published.json') : join(configDir, `seed-${setName}-${new URL(api).host.replace(/[^a-z0-9.-]/gi, '_')}.json`);
const state: Record<string, string> = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
const saveState = () => writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(`${api}/api/v1/library${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const data: any = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

const built: BuiltSet = engine.buildLibrarySet(SETS[setName]);
if (built.report.length) {
  console.error('The set has normalizer notes; fix them first:', built.report);
  process.exit(1);
}

for (const item of built.items) {
  const uses = item.uses.map((k) => {
    if (!state[k]) throw new Error(`${item.key} uses ${k}, which isn't published yet`);
    return state[k];
  });
  const kb = Math.round(JSON.stringify(item.draft).length / 1000);
  const body = { ...item.draft, uses, token };
  let id = state[item.key];
  if (id) {
    const r = await post(`/items/${id}`, body);
    if (r.status === 404) id = '';
    else if (r.status !== 200) throw new Error(`update ${item.key}: ${r.status} ${r.data.error ?? ''}`);
    else console.log(`updated ${item.key} → ${id} (${kb} kB)`);
  }
  if (!id) {
    const r = await post('/items', body, { 'x-admin-token': admin });
    if (r.status !== 201) throw new Error(`publish ${item.key}: ${r.status} ${r.data.error ?? ''}`);
    id = r.data.id as string;
    console.log(`published ${item.key} → ${id} (${kb} kB)`);
  }
  state[item.key] = id;
  saveState();
  const m = await post(`/items/${id}/moderate`, { admin, action: 'official' });
  if (m.status !== 200) throw new Error(`official ${item.key}: ${m.status} ${m.data.error ?? ''}`);
}
console.log(`\n${built.items.length} items.${state.template ? ` Template: ${api}/library/${state.template}` : ` Blocks: ${api}/library?type=block&q=${setName}`}`);
