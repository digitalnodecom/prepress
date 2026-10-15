/**
 * Free hosting at https://<name>.prepress.digitalno.de (hosting/api.ts).
 *
 * The site folder holds one secret token (<data>/hosting-token, 0600). The
 * first site to claim a name with its token owns it; later publishes from the
 * same folder — even after the target is removed and added again — present the
 * same token and may update it. Files go straight to storage through
 * short-lived presigned URLs; this machine never holds storage credentials.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DeployTarget } from '../deploy.ts';
import type { Remote } from './remote.ts';

export const HOSTING_API = (process.env.PREPRESS_HOSTING_API || 'https://prepress.digitalno.de').replace(/\/+$/, '');
export const HOSTING_DOMAIN = process.env.PREPRESS_HOSTING_DOMAIN || 'prepress.digitalno.de';

/** This site folder's hosting token (created on first use). */
export function siteToken(dataDir: string): string {
  const file = join(dataDir, 'hosting-token');
  if (existsSync(file)) {
    const t = readFileSync(file, 'utf8').trim();
    if (t.length >= 32) return t;
  }
  const t = randomBytes(32).toString('hex');
  writeFileSync(file, t + '\n', { mode: 0o600 });
  return t;
}

async function api(base: string, path: string, body?: unknown, f: typeof fetch = fetch, headers: Record<string, string> = {}): Promise<any> {
  let r: Response;
  try {
    r = await f(`${base}/api/v1${path}`, body === undefined ? { headers, signal: AbortSignal.timeout(20_000) } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  } catch (e: any) {
    throw new Error(`Can't reach Prepress hosting (${new URL(base).host}): ${e?.cause?.code ?? e?.message ?? e}`);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error ?? `Prepress hosting answered ${r.status}`), { status: r.status });
  return j;
}

/** Is a name free, or already this site's? (editor's live check) */
export const checkName = (name: string, opts: { dataDir: string; base?: string; fetch?: typeof fetch }) =>
  api(opts.base ?? HOSTING_API, `/sites/${encodeURIComponent(name)}`, undefined, opts.fetch, { 'x-site-token': siteToken(opts.dataDir) });

export async function connectPrepress(t: DeployTarget, opts: { dataDir: string; base?: string; fetch?: typeof fetch }): Promise<Remote> {
  const base = opts.base ?? HOSTING_API;
  const f = opts.fetch ?? fetch;
  const name = t.host!;
  const token = siteToken(opts.dataDir);
  // Claim the name (first time) or prove ownership (every later publish).
  const claim = await api(base, `/sites/${name}/claim`, { token }, f).catch((e) => {
    if (e.status === 403) throw new Error(`${name}.${HOSTING_DOMAIN} is already taken by another site. Pick another name.`);
    throw e;
  });
  return {
    async read() {
      return null; // the whole folder is this site's; nothing to back up
    },
    async write(rel, data) {
      const p = await api(base, `/sites/${name}/presign`, { token, path: rel, size: data.length }, f);
      const r = await f(p.url, { method: 'PUT', headers: { 'content-type': p.headers['content-type'], 'cache-control': p.headers['cache-control'] }, body: new Uint8Array(data), signal: AbortSignal.timeout(120_000) }).catch((e: any) => {
        throw new Error(`Upload of ${rel} failed: ${e?.cause?.code ?? e?.message ?? e}`);
      });
      if (!r.ok) throw new Error(`Upload of ${rel} failed (${r.status})`);
    },
    async remove(rel) {
      await api(base, `/sites/${name}/delete`, { token, paths: [rel] }, f);
    },
    async removeDir() {},
    async where() {
      return claim.url;
    },
    async close() {},
  };
}
