/**
 * GitHub Pages: the site is committed to a branch (default gh-pages) of a
 * repository with the Git Data API, and Pages serves that branch.
 *
 *   1. the repository (created, public, on first publish if missing);
 *   2. where Pages serves it (owner.github.io/repo/, the root for a
 *      <owner>.github.io repository or a custom domain): root-relative links
 *      are rebased to that path;
 *   3. one commit on top of the branch: changed blobs only, files Prepress
 *      didn't upload (README, CNAME …) kept, files it uploaded before and that
 *      are gone now deleted; git history is the backup;
 *   4. Pages switched on for the branch if it isn't yet.
 *
 * Auth: a token in the connection (github://TOKEN@owner/repo: a fine-grained
 * token with Contents + Pages read/write, or a classic one with "repo") or the
 * connected GitHub account.
 */
import { createHash } from 'node:crypto';
import type { DeployTarget } from '../deploy.ts';
import { GITHUB_API, accountToken, type OAuthOptions } from '../oauth.ts';
import { rebase, type SiteUpload } from './site.ts';

type Opts = OAuthOptions;

/** The blob id git gives these bytes. */
export const gitBlobSha = (data: Buffer) => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');

function client(t: DeployTarget, o: Opts) {
  const f = o.fetch ?? fetch;
  const base = o.githubApi ?? GITHUB_API;
  let token: string | undefined = t.token;
  const auth = async () => (token ??= await accountToken('github', o));

  async function call(path: string, method = 'GET', json?: unknown): Promise<any> {
    const headers: Record<string, string> = { authorization: `Bearer ${await auth()}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'Prepress' };
    if (json !== undefined) headers['content-type'] = 'application/json';
    let r: Response;
    try {
      r = await f(`${base}${path}`, { method, headers, body: json === undefined ? undefined : JSON.stringify(json), signal: AbortSignal.timeout(120_000) });
    } catch (e: any) {
      throw new Error(`Can't reach GitHub: ${e?.cause?.code ?? e?.message ?? e}`);
    }
    // Some answers have no body, or a literal `null` one.
    const j: any = (r.status === 204 ? null : await r.json().catch(() => null)) ?? {};
    if (!r.ok) {
      const msg = j.message ?? `HTTP ${r.status}`;
      throw Object.assign(new Error(r.status === 401 ? `GitHub refused the token (${msg}). Connect again or use a new token.` : `GitHub: ${msg}`), { status: r.status });
    }
    return j;
  }
  const maybe = (path: string) => call(path).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
  return { call, maybe };
}

const repoPath = (t: DeployTarget) => `/repos/${t.host}/${t.path}`;
const branchOf = (t: DeployTarget) => t.branch || 'gh-pages';
/** Where Pages will serve a repository that has no Pages site yet. */
const predictedBase = (t: DeployTarget) => (t.path!.toLowerCase() === `${t.host!.toLowerCase()}.github.io` ? '/' : `/${t.path}/`);

/** Login works and the repository is writable (or can be created). Changes nothing. */
export async function checkGithub(t: DeployTarget, o: Opts): Promise<string> {
  const c = client(t, o);
  const repo = await c.maybe(repoPath(t));
  if (!repo) {
    const me = await c.call('/user');
    const own = String(me.login).toLowerCase() === t.host!.toLowerCase();
    return `Connected as ${me.login}. The repository ${t.host}/${t.path} will be created on the first publish${own ? '' : ' (in that organization, if you may create repositories there)'}.`;
  }
  if (repo.permissions && !repo.permissions.push) throw new Error(`You can't push to ${repo.full_name}.`);
  const pages = await c.maybe(`${repoPath(t)}/pages`);
  return `Connected, can push to ${repo.full_name} (${branchOf(t)})${pages?.html_url ? `: ${pages.html_url}` : ''}`;
}

export async function publishGithub(t: DeployTarget, files: Map<string, Buffer>, owned: string[], o: Opts): Promise<SiteUpload> {
  const c = client(t, o);
  const branch = branchOf(t);
  const rp = repoPath(t);

  let repo = await c.maybe(rp);
  if (!repo) {
    const me = await c.call('/user');
    const body = { name: t.path, description: 'Website published with Prepress', homepage: '', auto_init: true, has_issues: false, has_wiki: false };
    repo = await c.call(String(me.login).toLowerCase() === t.host!.toLowerCase() ? '/user/repos' : `/orgs/${t.host}/repos`, 'POST', body);
  }
  if (repo.permissions && !repo.permissions.push) throw new Error(`You can't push to ${repo.full_name}.`);

  let pages = await c.maybe(`${rp}/pages`);
  const base = pages?.html_url ? new URL(pages.html_url).pathname : predictedBase(t);
  if (pages?.build_type === 'workflow') throw new Error(`GitHub Pages for ${repo.full_name} is built by GitHub Actions. Switch its Pages source to "Deploy from a branch" (${branch}, / root).`);
  if (pages && (pages.source?.branch !== branch || pages.source?.path !== '/')) throw new Error(`GitHub Pages for ${repo.full_name} serves ${pages.source?.branch}${pages.source?.path}, not ${branch}/. Change it in the repository's Pages settings, or set ?branch= in the connection.`);

  // What we want on the branch: the site (rebased to where Pages serves it) and .nojekyll (serve files as they are).
  const want = new Map<string, Buffer>();
  for (const [rel, data] of files) want.set(rel, rebase(rel, data, base));
  want.set('.nojekyll', Buffer.alloc(0));

  // The branch now (an empty repository has none and no default branch either).
  let head: string | null = null;
  let baseTree: string | null = null;
  const remote = new Map<string, string>();
  const ref = await c.maybe(`${rp}/git/ref/heads/${branch}`).catch((e) => (e.status === 409 ? null : Promise.reject(e)));
  if (ref?.object?.sha) {
    head = ref.object.sha;
    const commit = await c.call(`${rp}/git/commits/${head}`);
    baseTree = commit.tree.sha;
    const tree = await c.call(`${rp}/git/trees/${baseTree}?recursive=1`);
    if (tree.truncated) throw new Error(`The ${branch} branch has too many files for the GitHub API. Use a branch only for the site.`);
    for (const e of tree.tree ?? []) if (e.type === 'blob') remote.set(e.path, e.sha);
  } else if ((await c.maybe(`${rp}/commits?per_page=1`).catch((e) => (e.status === 409 ? 'empty' : Promise.reject(e)))) === 'empty') {
    // The Git Data API can't write to a repository without any commit: start it with .nojekyll on the branch.
    const put = await c.call(`${rp}/contents/.nojekyll`, 'PUT', { message: 'Start the site', content: '', branch });
    head = put.commit.sha;
    baseTree = put.commit.tree.sha;
    remote.set('.nojekyll', gitBlobSha(Buffer.alloc(0)));
  }

  const entries: { path: string; mode: '100644'; type: 'blob'; sha: string | null }[] = [];
  const changed = [...want].filter(([rel, data]) => remote.get(rel) !== gitBlobSha(data));
  for (let i = 0; i < changed.length; i += 4) {
    const batch = await Promise.all(
      changed.slice(i, i + 4).map(async ([rel, data]) => ({ path: rel, mode: '100644' as const, type: 'blob' as const, sha: (await c.call(`${rp}/git/blobs`, 'POST', { content: data.toString('base64'), encoding: 'base64' })).sha as string })),
    );
    entries.push(...batch);
  }
  // Only files Prepress uploaded before are deleted.
  const gone = owned.filter((rel) => !want.has(rel) && remote.has(rel));
  for (const rel of gone) entries.push({ path: rel, mode: '100644', type: 'blob', sha: null });

  if (entries.length) {
    const tree = await c.call(`${rp}/git/trees`, 'POST', baseTree ? { base_tree: baseTree, tree: entries } : { tree: entries });
    const commit = await c.call(`${rp}/git/commits`, 'POST', { message: 'Publish from Prepress', tree: tree.sha, parents: head ? [head] : [] });
    if (head) await c.call(`${rp}/git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: false });
    else await c.call(`${rp}/git/refs`, 'POST', { ref: `refs/heads/${branch}`, sha: commit.sha });
  }

  if (!pages) {
    // GitHub often switches Pages on by itself when a gh-pages branch appears; then the POST conflicts.
    pages = await c.call(`${rp}/pages`, 'POST', { build_type: 'legacy', source: { branch, path: '/' } }).catch(async (e) => {
      const now = await c.maybe(`${rp}/pages`).catch(() => null);
      if (now?.html_url) return now;
      throw e;
    });
  }

  const siteFiles = changed.filter(([rel]) => rel !== '.nojekyll').length;
  return {
    uploaded: siteFiles,
    unchanged: files.size - siteFiles,
    removed: gone.length,
    siteUrl: pages?.html_url ? String(pages.html_url).replace(/\/+$/, '') : undefined,
  };
}
