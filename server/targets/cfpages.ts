/**
 * Cloudflare Pages, Direct Upload (the API `wrangler pages deploy` uses):
 *
 *   1. the project (created on first publish as a Direct Upload project);
 *   2. a short-lived upload JWT for it;
 *   3. check-missing: which file hashes Cloudflare doesn't have yet;
 *   4. upload only those, in buckets;
 *   5. a deployment whose manifest maps every path to its hash.
 *
 * A deployment is the whole site, so there is nothing to delete file by file,
 * and every earlier deployment stays in the dashboard (one click to roll back):
 * that is this target's backup. A project connected to a Git repository is
 * refused, since its deployments come from there.
 *
 * Auth: an API token in the connection (cfpages://TOKEN@ACCOUNT_ID/project,
 * permission "Cloudflare Pages: Edit") or the connected Cloudflare account.
 */
import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex } from '@noble/hashes/utils';
import type { DeployTarget } from '../deploy.ts';
import { CLOUDFLARE_API, accountToken, type OAuthOptions } from '../oauth.ts';
import { contentType } from './remote.ts';
import type { SiteUpload } from './site.ts';

/** Cloudflare's asset key: BLAKE3 of the base64 contents + extension, 32 hex chars (wrangler's hashFile). */
export function pagesHash(rel: string, data: Buffer): string {
  const dot = rel.lastIndexOf('.');
  const ext = dot > rel.lastIndexOf('/') ? rel.slice(dot + 1) : '';
  return bytesToHex(blake3(new TextEncoder().encode(data.toString('base64') + ext))).slice(0, 32);
}

const MAX_ASSET = 25 * 1024 * 1024;
const MAX_BUCKET = 40 * 1024 * 1024;
const MAX_BUCKET_FILES = 2000;

type Opts = OAuthOptions;

function client(t: DeployTarget, o: Opts) {
  const f = o.fetch ?? fetch;
  const base = o.cloudflareApi ?? CLOUDFLARE_API;
  let token: string | undefined = t.token;
  const auth = async () => (token ??= await accountToken('cloudflare', o));

  async function call(path: string, init: { method?: string; json?: unknown; form?: FormData; bearer?: string } = {}): Promise<any> {
    const headers: Record<string, string> = { authorization: `Bearer ${init.bearer ?? (await auth())}`, accept: 'application/json' };
    let body: BodyInit | undefined;
    if (init.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(init.json);
    } else if (init.form) body = init.form;
    let r: Response;
    try {
      r = await f(`${base}${path}`, { method: init.method ?? (body ? 'POST' : 'GET'), headers, body, signal: AbortSignal.timeout(120_000) });
    } catch (e: any) {
      throw new Error(`Can't reach Cloudflare: ${e?.cause?.code ?? e?.message ?? e}`);
    }
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) {
      const err = j.errors?.[0];
      throw Object.assign(new Error(r.status === 401 || r.status === 403 || /authenticat/i.test(err?.message ?? '') ? `Cloudflare refused the token (${err?.message ?? r.status}). It needs "Cloudflare Pages: Edit" on this account.` : `Cloudflare: ${err?.message ?? `HTTP ${r.status}`}`), { status: r.status, code: err?.code });
    }
    return j.result;
  }
  return { call };
}

const projectPath = (t: DeployTarget) => `/accounts/${t.host}/pages/projects/${t.path}`;

async function getProject(c: ReturnType<typeof client>, t: DeployTarget): Promise<any | null> {
  try {
    return await c.call(projectPath(t));
  } catch (e: any) {
    if (e.status === 404) return null;
    throw e;
  }
}

/** Login works and the project is there (or can be created). Changes nothing. */
export async function checkCfPages(t: DeployTarget, o: Opts): Promise<string> {
  const c = client(t, o);
  const p = await getProject(c, t);
  if (!p) {
    await c.call(`/accounts/${t.host}/pages/projects?per_page=1`);
    return `Connected. The project "${t.path}" will be created on the first publish (https://${t.path}.pages.dev).`;
  }
  if (p.source) throw new Error(`The project "${t.path}" deploys from a Git repository. Pick a new project name for Prepress.`);
  return `Connected, can deploy: https://${p.subdomain}`;
}

export async function publishCfPages(t: DeployTarget, files: Map<string, Buffer>, owned: string[], o: Opts): Promise<SiteUpload> {
  const c = client(t, o);
  let project = await getProject(c, t);
  if (project?.source) throw new Error(`The project "${t.path}" deploys from a Git repository. Pick a new project name for Prepress.`);
  project ??= await c.call(`/accounts/${t.host}/pages/projects`, { json: { name: t.path, production_branch: 'main' } });

  const manifest: Record<string, string> = {};
  const byHash = new Map<string, { rel: string; data: Buffer }>();
  for (const [rel, data] of files) {
    if (data.length > MAX_ASSET) throw new Error(`${rel} is larger than Cloudflare Pages allows (25 MB)`);
    const h = pagesHash(rel, data);
    manifest[`/${rel}`] = h;
    byHash.set(h, { rel, data });
  }
  const hashes = [...byHash.keys()];

  const { jwt } = await c.call(`${projectPath(t)}/upload-token`);
  const missing: string[] = await c.call('/pages/assets/check-missing', { json: { hashes }, bearer: jwt });

  // Buckets of ≤40 MB / ≤2000 files, as wrangler sends them.
  const buckets: string[][] = [];
  let cur: string[] = [];
  let size = 0;
  for (const h of missing) {
    const n = byHash.get(h)?.data.length ?? 0;
    if (cur.length && (size + n > MAX_BUCKET || cur.length >= MAX_BUCKET_FILES)) {
      buckets.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(h);
    size += n;
  }
  if (cur.length) buckets.push(cur);
  for (const b of buckets) {
    const payload = b.map((h) => {
      const { rel, data } = byHash.get(h)!;
      return { key: h, value: data.toString('base64'), metadata: { contentType: contentType(rel) }, base64: true };
    });
    await c.call('/pages/assets/upload', { json: payload, bearer: jwt });
  }
  // Tells Cloudflare these hashes are in use (speeds up the next check-missing); not fatal.
  await c.call('/pages/assets/upsert-hashes', { json: { hashes }, bearer: jwt }).catch(() => undefined);

  const form = new FormData();
  form.append('manifest', JSON.stringify(manifest));
  form.append('branch', project.production_branch ?? 'main');
  form.append('commit_message', 'Published with Prepress');
  await c.call(`${projectPath(t)}/deployments`, { form });

  const now = new Set(files.keys());
  return {
    uploaded: missing.length,
    unchanged: files.size - missing.length,
    removed: owned.filter((rel) => !now.has(rel)).length,
    siteUrl: project.subdomain ? `https://${project.subdomain}` : undefined,
  };
}
