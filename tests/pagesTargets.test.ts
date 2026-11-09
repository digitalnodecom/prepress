// @vitest-environment node
// Cloudflare Pages and GitHub Pages targets, and the connected accounts behind them,
// against in-memory stand-ins of both APIs (an in-memory git for GitHub).
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { cleanTarget, createDeployer } from '../server/deploy';
import { MASK, formatConnection, parseConnection } from '../server/targets/connection';
import { rebase } from '../server/targets/site';
import { pagesHash } from '../server/targets/cfpages';
import { gitBlobSha } from '../server/targets/github';
import { accountToken, accountsView, pollDeviceFlow, startDeviceFlow } from '../server/oauth';

const CF_ACCOUNT = '0123456789abcdef0123456789abcdef';

let root = '';
let data = '';
let out = '';
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'pp-pages-'));
  data = join(root, 'data');
  out = join(root, 'out');
  mkdirSync(data, { recursive: true });
  mkdirSync(out, { recursive: true });
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.useRealTimers();
});

function site(files: Record<string, string | Buffer>) {
  rmSync(out, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(out, rel)), { recursive: true });
    writeFileSync(join(out, rel), body);
  }
  return Object.keys(files);
}

const PAGE = (title: string) => `<!doctype html><title>${title}</title><a href="/">Home</a> <a href="/about/">About</a> <a href="https://example.com/x">x</a> <img src="/uploads/a.jpg" srcset="/uploads/a.jpg 1x, /uploads/a@2x.jpg 2x"><div style="background-image:url(&quot;/uploads/bg.jpg&quot;)"></div><link href="//cdn.example.com/f.css">`;

type Handler = (req: { method: string; path: string; headers: Record<string, string>; body: any; form?: FormData }) => { status?: number; json: unknown } | undefined;
function fakeFetch(handle: Handler, log: string[] = []): typeof fetch {
  return (async (input: any, init: any = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
    let body: any = init.body;
    let form: FormData | undefined;
    if (body instanceof FormData) form = body;
    else if (typeof body === 'string') body = headers['content-type']?.includes('json') ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
    log.push(`${method} ${url.host}${url.pathname}${url.search}`);
    const r = handle({ method, path: url.pathname + url.search, headers, body, form });
    if (!r) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

describe('connection strings', () => {
  test('cfpages:// and github:// parse, mask the token and round-trip', () => {
    expect(parseConnection(`cfpages://${CF_ACCOUNT}/my-site`)).toEqual({ type: 'cfpages', host: CF_ACCOUNT, path: 'my-site', token: undefined });
    expect(parseConnection('github://tok/en@octo/site?branch=pages')).toEqual({ type: 'github', host: 'octo', path: 'site', token: 'tok/en', branch: 'pages' });
    for (const s of [`cfpages://cf-tok@${CF_ACCOUNT}/my-site`, 'github://ghp_x@octo/site?branch=www']) {
      const t: any = { id: 'x', name: 'x', auto: true, ...parseConnection(s) };
      expect(formatConnection(t)).toContain(MASK);
      expect(formatConnection(t)).not.toContain(t.token);
      expect(parseConnection(formatConnection(t, true))).toEqual(parseConnection(s));
    }
  });

  test('validation and default URLs', () => {
    const g = { dataDir: data, outDir: out };
    expect(cleanTarget({ connection: `cfpages://${CF_ACCOUNT}/my-site` }, g)).toMatchObject({ type: 'cfpages', name: 'Cloudflare Pages', url: 'https://my-site.pages.dev' });
    expect(cleanTarget({ connection: 'github://Octo/site' }, g)).toMatchObject({ name: 'GitHub Pages', url: 'https://octo.github.io/site' });
    expect(cleanTarget({ connection: 'github://octo/octo.github.io' }, g).url).toBe('https://octo.github.io');
    expect(cleanTarget({ connection: 'github://octo/site?branch=gh-pages' }, g).branch).toBeUndefined();
    for (const bad of ['cfpages://nope/my-site', `cfpages://${CF_ACCOUNT}/My_Site`, `cfpages://${CF_ACCOUNT}/`, 'github://-x/site', 'github://octo/..', 'github://octo/a b', 'github://octo/site?branch=../x']) {
      expect(() => cleanTarget({ connection: bad }, g), bad).toThrow();
    }
  });
});

describe('rebase for sites served from a sub-path', () => {
  test('root-relative links, images, srcset and CSS urls move under the base; others stay', () => {
    const html = rebase('about/index.html', Buffer.from(PAGE('A')), '/site/').toString();
    expect(html).toContain('href="/site/"');
    expect(html).toContain('href="/site/about/"');
    expect(html).toContain('src="/site/uploads/a.jpg"');
    expect(html).toContain('srcset="/site/uploads/a.jpg 1x, /site/uploads/a@2x.jpg 2x"');
    expect(html).toContain('url(&quot;/site/uploads/bg.jpg&quot;)');
    expect(html).toContain('href="https://example.com/x"');
    expect(html).toContain('href="//cdn.example.com/f.css"');
    expect(rebase('index.html', Buffer.from(PAGE('A')), '/').toString()).toBe(PAGE('A'));
    expect(rebase('uploads/a.jpg', Buffer.from('href="/x"'), '/site/').toString()).toBe('href="/x"');
  });
});

describe('Cloudflare Pages', () => {
  test('asset hashes match wrangler (BLAKE3 of base64 + extension)', () => {
    // BLAKE3("") = af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262
    expect(pagesHash('LICENSE', Buffer.alloc(0))).toBe('af1349b9f5f9a1a6a0404dea36dcc949');
    expect(pagesHash('a.html', Buffer.from('x'))).not.toBe(pagesHash('a.css', Buffer.from('x')));
  });

  test('creates the project, uploads only missing assets, deploys a full manifest', async () => {
    const stored = new Set<string>();
    const deployments: Record<string, string>[] = [];
    const uploads: string[][] = [];
    let project: any = null;
    const handle: Handler = ({ method, path, headers, body, form }) => {
      const api = path.replace('/client/v4', '');
      const isJwt = headers.authorization === 'Bearer jwt-1';
      if (api.startsWith('/pages/assets/')) {
        if (!isJwt) return { status: 401, json: { success: false, errors: [{ message: 'bad jwt' }] } };
        if (api === '/pages/assets/check-missing') return { json: { success: true, result: body.hashes.filter((h: string) => !stored.has(h)) } };
        if (api === '/pages/assets/upload') {
          for (const f of body) {
            expect(f.base64).toBe(true);
            expect(f.key).toBe(pagesHash(f.metadata.contentType.startsWith('text/html') ? 'x.html' : 'x.jpg', Buffer.from(f.value, 'base64')));
            stored.add(f.key);
          }
          uploads.push(body.map((f: any) => f.key));
          return { json: { success: true, result: null } };
        }
        if (api === '/pages/assets/upsert-hashes') return { json: { success: true, result: null } };
      }
      if (headers.authorization !== 'Bearer cf-token') return { status: 403, json: { success: false, errors: [{ code: 10000, message: 'Authentication error' }] } };
      const p = `/accounts/${CF_ACCOUNT}/pages/projects`;
      if (method === 'GET' && api === `${p}/my-site`) return project ? { json: { success: true, result: project } } : { status: 404, json: { success: false, errors: [{ code: 8000007, message: 'Project not found' }] } };
      if (method === 'POST' && api === p) {
        expect(body).toEqual({ name: 'my-site', production_branch: 'main' });
        project = { name: 'my-site', subdomain: 'my-site-4xq.pages.dev', production_branch: 'main' };
        return { json: { success: true, result: project } };
      }
      if (api === `${p}/my-site/upload-token`) return { json: { success: true, result: { jwt: 'jwt-1' } } };
      if (method === 'POST' && api === `${p}/my-site/deployments`) {
        expect(form!.get('branch')).toBe('main');
        deployments.push(JSON.parse(String(form!.get('manifest'))));
        return { json: { success: true, result: { id: 'd1', url: 'https://d1.my-site-4xq.pages.dev' } } };
      }
      return undefined;
    };
    const d = createDeployer({ dataDir: data, outDir: out, accounts: { fetch: fakeFetch(handle) } });
    const [saved] = d.save([{ connection: `cfpages://cf-token@${CF_ACCOUNT}/my-site` }]);
    expect(saved.connection).toBe(`cfpages://${MASK}@${CF_ACCOUNT}/my-site`);
    expect(JSON.stringify(d.view())).not.toContain('cf-token');

    let files = site({ 'index.html': PAGE('Home'), 'about/index.html': PAGE('About'), 'uploads/a.jpg': Buffer.from([1, 2, 3]) });
    let [r] = await d.deploy(files, saved.id);
    expect(r).toMatchObject({ ok: true, uploaded: 3, unchanged: 0, url: 'https://my-site-4xq.pages.dev' });
    expect(Object.keys(deployments[0]).sort()).toEqual(['/about/index.html', '/index.html', '/uploads/a.jpg']);
    // Pages serves the root, so links are untouched.
    expect(deployments[0]['/index.html']).toBe(pagesHash('index.html', Buffer.from(PAGE('Home'))));
    // The real subdomain is adopted as the target's URL.
    expect(d.view()[0].url).toBe('https://my-site-4xq.pages.dev');

    files = site({ 'index.html': PAGE('Home 2'), 'uploads/a.jpg': Buffer.from([1, 2, 3]) });
    [r] = await d.deploy(files, saved.id);
    expect(r).toMatchObject({ ok: true, uploaded: 1, unchanged: 1, removed: 1 });
    expect(uploads[1]).toHaveLength(1);
    expect(Object.keys(deployments[1]).sort()).toEqual(['/index.html', '/uploads/a.jpg']);

    expect(await d.test({ id: saved.id, connection: saved.connection })).toEqual({ ok: true, message: 'Connected, can deploy: https://my-site-4xq.pages.dev' });
  });

  test('refuses a Git-connected project and reports a bad token', async () => {
    const handle: Handler = ({ headers }) =>
      headers.authorization === 'Bearer good' ? { json: { success: true, result: { name: 'my-site', source: { type: 'github' }, production_branch: 'main' } } } : { status: 403, json: { success: false, errors: [{ message: 'Authentication error' }] } };
    const d = createDeployer({ dataDir: data, outDir: out, accounts: { fetch: fakeFetch(handle) } });
    const files = site({ 'index.html': PAGE('x') });
    const [a, b] = d.save([{ name: 'A', connection: `cfpages://good@${CF_ACCOUNT}/my-site` }, { name: 'B', connection: `cfpages://bad@${CF_ACCOUNT}/my-site` }]);
    expect((await d.deploy(files, a.id))[0].error).toMatch(/Git repository/);
    expect((await d.deploy(files, b.id))[0].error).toMatch(/refused the token/);
  });
});

/** Just enough of GitHub's REST + Git Data API, over an in-memory git. */
function fakeGithub(login = 'octo') {
  const blobs = new Map<string, Buffer>();
  const trees = new Map<string, Map<string, string>>();
  const commits = new Map<string, { tree: string; parents: string[] }>();
  const repos = new Map<string, { refs: Map<string, string>; pages: any; full_name: string }>();
  const treeSha = (m: Map<string, string>) => createHash('sha1').update(JSON.stringify([...m].sort())).digest('hex');
  const putTree = (m: Map<string, string>) => {
    const sha = treeSha(m);
    trees.set(sha, m);
    return sha;
  };
  const putBlob = (b: Buffer) => {
    const sha = gitBlobSha(b);
    blobs.set(sha, b);
    return sha;
  };
  const commit = (tree: string, parents: string[]) => {
    const sha = createHash('sha1').update(tree + parents.join() + commits.size).digest('hex');
    commits.set(sha, { tree, parents });
    return sha;
  };
  const handle: Handler = ({ method, path, headers, body }) => {
    if (headers.authorization !== 'Bearer gh-token') return { status: 401, json: { message: 'Bad credentials' } };
    if (path === '/user') return { json: { login } };
    if (method === 'POST' && path === '/user/repos') {
      const full = `${login}/${body.name}`;
      const init = commit(putTree(new Map([['README.md', putBlob(Buffer.from('# hi'))]])), []);
      repos.set(full, { refs: new Map([['main', init]]), pages: null, full_name: full });
      return { status: 201, json: { full_name: full, permissions: { push: true } } };
    }
    const m = path.match(/^\/repos\/([^/]+\/[^/]+)(\/.*)?$/);
    const repo = m && repos.get(m[1]);
    if (!m || !repo) return undefined;
    const sub = m[2] ?? '';
    if (sub === '') return { json: { full_name: repo.full_name, permissions: { push: true } } };
    if (sub === '/pages') {
      if (method === 'GET') return repo.pages ? { json: repo.pages } : undefined;
      repo.pages = { html_url: `https://${login}.github.io/${repo.full_name.split('/')[1]}/`, build_type: body.build_type, source: body.source };
      return { status: 201, json: repo.pages };
    }
    if (sub.startsWith('/commits?')) return { json: [...repo.refs.values()].slice(0, 1).map((sha) => ({ sha })) };
    let x = sub.match(/^\/git\/ref\/heads\/(.+)$/);
    if (x) return repo.refs.has(x[1]) ? { json: { object: { sha: repo.refs.get(x[1]) } } } : undefined;
    x = sub.match(/^\/git\/commits\/(\w+)$/);
    if (x) return { json: { sha: x[1], tree: { sha: commits.get(x[1])!.tree } } };
    x = sub.match(/^\/git\/trees\/(\w+)\?recursive=1$/);
    if (x) return { json: { truncated: false, tree: [...trees.get(x[1])!].map(([p, sha]) => ({ path: p, sha, type: 'blob', mode: '100644' })) } };
    if (method === 'POST' && sub === '/git/blobs') return { status: 201, json: { sha: putBlob(Buffer.from(body.content, 'base64')) } };
    if (method === 'POST' && sub === '/git/trees') {
      const t = new Map(body.base_tree ? trees.get(body.base_tree)! : []);
      for (const e of body.tree) {
        if (e.sha === null) t.delete(e.path);
        else {
          expect(blobs.has(e.sha)).toBe(true);
          t.set(e.path, e.sha);
        }
      }
      return { status: 201, json: { sha: putTree(t) } };
    }
    if (method === 'POST' && sub === '/git/commits') return { status: 201, json: { sha: commit(body.tree, body.parents) } };
    x = sub.match(/^\/git\/refs\/heads\/(.+)$/);
    if (method === 'PATCH' && x) {
      expect(commits.get(body.sha)!.parents).toEqual([repo.refs.get(x[1])]);
      repo.refs.set(x[1], body.sha);
      return { json: { object: { sha: body.sha } } };
    }
    if (method === 'POST' && sub === '/git/refs') {
      repo.refs.set(body.ref.replace('refs/heads/', ''), body.sha);
      return { status: 201, json: {} };
    }
    return undefined;
  };
  /** The files on a branch, as text. */
  const branch = (full: string, name: string) => {
    const sha = repos.get(full)?.refs.get(name);
    if (!sha) return null;
    return Object.fromEntries([...trees.get(commits.get(sha)!.tree)!].map(([p, b]) => [p, blobs.get(b)!.toString()]));
  };
  /** Someone else commits a file to the branch. */
  const commitFile = (full: string, name: string, path: string, text: string) => {
    const repo = repos.get(full)!;
    const head = repo.refs.get(name)!;
    const t = new Map(trees.get(commits.get(head)!.tree)!);
    t.set(path, putBlob(Buffer.from(text)));
    repo.refs.set(name, commit(putTree(t), [head]));
  };
  return { handle, branch, commitFile, repos };
}

describe('GitHub Pages', () => {
  test('creates the repository, commits the rebased site to gh-pages, turns Pages on', async () => {
    const gh = fakeGithub();
    const log: string[] = [];
    const d = createDeployer({ dataDir: data, outDir: out, accounts: { fetch: fakeFetch(gh.handle, log) } });
    const [saved] = d.save([{ connection: 'github://gh-token@octo/site' }]);
    expect(saved).toMatchObject({ type: 'github', connection: `github://${MASK}@octo/site`, url: 'https://octo.github.io/site' });

    let files = site({ 'index.html': PAGE('Home'), 'about/index.html': PAGE('About'), 'uploads/a.jpg': Buffer.from([1, 2, 3]) });
    let [r] = await d.deploy(files, saved.id);
    expect(r).toMatchObject({ ok: true, uploaded: 3, unchanged: 0, removed: 0 });
    const b = gh.branch('octo/site', 'gh-pages')!;
    expect(Object.keys(b).sort()).toEqual(['.nojekyll', 'about/index.html', 'index.html', 'uploads/a.jpg']);
    expect(b['index.html']).toContain('href="/site/about/"');
    expect(b['index.html']).toContain('src="/site/uploads/a.jpg"');
    expect(gh.repos.get('octo/site')!.pages).toMatchObject({ build_type: 'legacy', source: { branch: 'gh-pages', path: '/' } });
    expect(gh.branch('octo/site', 'main')).toEqual({ 'README.md': '# hi' });

    // Someone adds a CNAME on the branch; the next publish drops a page and keeps their file.
    gh.commitFile('octo/site', 'gh-pages', 'CNAME', 'www.example.com');
    files = site({ 'index.html': PAGE('Home'), 'uploads/a.jpg': Buffer.from([1, 2, 3]) });
    [r] = await d.deploy(files, saved.id);
    expect(r).toMatchObject({ ok: true, uploaded: 0, unchanged: 2, removed: 1 });
    expect(Object.keys(gh.branch('octo/site', 'gh-pages')!).sort()).toEqual(['.nojekyll', 'CNAME', 'index.html', 'uploads/a.jpg']);

    // Nothing changed: no commit at all.
    const before = gh.repos.get('octo/site')!.refs.get('gh-pages');
    log.length = 0;
    [r] = await d.deploy(files, saved.id);
    expect(r).toMatchObject({ ok: true, uploaded: 0, unchanged: 2 });
    expect(gh.repos.get('octo/site')!.refs.get('gh-pages')).toBe(before);
    expect(log.filter((l) => /^(POST|PATCH) /.test(l))).toEqual([]);
  });

  test('a <owner>.github.io repository is served at the root: links stay as they are', async () => {
    const gh = fakeGithub();
    const d = createDeployer({ dataDir: data, outDir: out, accounts: { fetch: fakeFetch(gh.handle) } });
    const [saved] = d.save([{ connection: 'github://gh-token@octo/octo.github.io' }]);
    await d.deploy(site({ 'index.html': PAGE('Home') }), saved.id);
    expect(gh.branch('octo/octo.github.io', 'gh-pages')!['index.html']).toBe(PAGE('Home'));
  });

  test('Pages switched on by GitHub itself (POST conflicts with a null body) is fine', async () => {
    const gh = fakeGithub();
    const handle: Handler = (req) => {
      if (req.method === 'POST' && req.path === '/repos/octo/site/pages') {
        gh.repos.get('octo/site')!.pages = { html_url: 'https://octo.github.io/site/', build_type: 'legacy', source: { branch: 'gh-pages', path: '/' } };
        return { status: 409, json: null };
      }
      return gh.handle(req);
    };
    const d = createDeployer({ dataDir: data, outDir: out, accounts: { fetch: fakeFetch(handle) } });
    const [saved] = d.save([{ connection: 'github://gh-token@octo/site' }]);
    const [r] = await d.deploy(site({ 'index.html': PAGE('Home') }), saved.id);
    expect(r).toMatchObject({ ok: true, uploaded: 1, url: 'https://octo.github.io/site' });
  });

  test('refuses a repository whose Pages are built by Actions, before pushing', async () => {
    const gh = fakeGithub();
    const d = createDeployer({ dataDir: data, outDir: out, accounts: { fetch: fakeFetch(gh.handle) } });
    const [saved] = d.save([{ connection: 'github://gh-token@octo/site' }]);
    await d.deploy(site({ 'index.html': PAGE('Home') }), saved.id);
    gh.repos.get('octo/site')!.pages.build_type = 'workflow';
    const head = gh.repos.get('octo/site')!.refs.get('gh-pages');
    const [r] = await d.deploy(site({ 'index.html': PAGE('Changed') }), saved.id);
    expect(r.error).toMatch(/GitHub Actions/);
    expect(gh.repos.get('octo/site')!.refs.get('gh-pages')).toBe(head);
  });
});

describe('connected accounts (device flow)', () => {
  test('GitHub: code, pending, token; stored 0600 and never shown; used by targets without a token', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
    let polls = 0;
    const gh = fakeGithub();
    const handle: Handler = (req) => {
      if (req.path === '/login/device/code') {
        expect(req.body).toEqual({ client_id: 'gh-client', scope: 'repo' });
        return { json: { device_code: 'dev-1', user_code: 'WDJB-MJHT', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 5 } };
      }
      if (req.path === '/login/oauth/access_token') {
        expect(req.body).toMatchObject({ client_id: 'gh-client', device_code: 'dev-1', grant_type: 'urn:ietf:params:oauth:grant-type:device_code' });
        return { json: ++polls < 2 ? { error: 'authorization_pending' } : { access_token: 'gh-token', scope: 'repo', token_type: 'bearer' } };
      }
      return gh.handle(req);
    };
    const o = { dataDir: data, fetch: fakeFetch(handle), clientIds: { github: 'gh-client', cloudflare: '' } };
    expect(accountsView(o)).toEqual({ github: { available: true, connected: false }, cloudflare: { available: false, connected: false } });
    const start = await startDeviceFlow('github', o);
    expect(start).toMatchObject({ userCode: 'WDJB-MJHT', verificationUri: 'https://github.com/login/device', interval: 5 });
    expect(await pollDeviceFlow('github', start.id, o)).toEqual({ status: 'pending' }); // too early: GitHub not asked
    expect(polls).toBe(0);
    vi.setSystemTime(Date.now() + 5000);
    expect(await pollDeviceFlow('github', start.id, o)).toEqual({ status: 'pending' });
    vi.setSystemTime(Date.now() + 5000);
    expect(await pollDeviceFlow('github', start.id, o)).toEqual({ status: 'connected', account: { available: true, connected: true, label: 'octo' } });
    expect(statSync(join(data, 'accounts.json')).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(accountsView(o))).not.toContain('gh-token');
    expect(await pollDeviceFlow('github', start.id, o)).toMatchObject({ status: 'failed' });

    // A target without a token publishes with the connected account.
    const d = createDeployer({ dataDir: data, outDir: out, accounts: { fetch: o.fetch } });
    const [saved] = d.save([{ connection: 'github://octo/site' }]);
    const [r] = await d.deploy(site({ 'index.html': PAGE('Home') }), saved.id);
    expect(r).toMatchObject({ ok: true, uploaded: 1 });
  });

  test('refuses a verification address on another host', async () => {
    const o = { dataDir: data, clientIds: { github: 'gh-client' }, fetch: fakeFetch(() => ({ json: { device_code: 'd', user_code: 'U', verification_uri: 'https://github.com.evil.example/login/device', expires_in: 600 } })) };
    await expect(startDeviceFlow('github', o)).rejects.toThrow(/Unexpected verification address/);
  });

  test('Cloudflare: no client id → not available; expired tokens are refreshed', async () => {
    await expect(startDeviceFlow('cloudflare', { dataDir: data, clientIds: { cloudflare: '' } })).rejects.toThrow(/isn't set up/);
    writeFileSync(join(data, 'accounts.json'), JSON.stringify({ cloudflare: { accessToken: 'old', refreshToken: 'r1', expiresAt: Date.now() - 1000 } }), { mode: 0o600 });
    const seen: any[] = [];
    const o = {
      dataDir: data,
      clientIds: { cloudflare: 'cf-client' },
      fetch: fakeFetch((req) => {
        seen.push(req.body);
        return req.path === '/oauth2/token' ? { json: { access_token: 'new', refresh_token: 'r2', expires_in: 3600 } } : undefined;
      }),
    };
    expect(await accountToken('cloudflare', o)).toBe('new');
    expect(seen[0]).toEqual({ grant_type: 'refresh_token', refresh_token: 'r1', client_id: 'cf-client' });
    expect(JSON.parse(readFileSync(join(data, 'accounts.json'), 'utf8')).cloudflare).toMatchObject({ accessToken: 'new', refreshToken: 'r2' });
    expect(await accountToken('cloudflare', o)).toBe('new');
    expect(seen).toHaveLength(1);
    await expect(accountToken('github', o)).rejects.toThrow(/Connect your GitHub account/);
  });
});
