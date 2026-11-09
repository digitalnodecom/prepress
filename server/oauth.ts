/**
 * Connected accounts for publish targets: GitHub (GitHub Pages) and Cloudflare
 * (Cloudflare Pages). No client secret ships in the app; each provider gets the
 * public-client flow it supports:
 *
 *   GitHub      OAuth 2.0 Device Authorization Grant (RFC 8628): the editor shows
 *               a code, the user approves it on github.com, we poll for the token.
 *   Cloudflare  Authorization Code + PKCE (S256) with a loopback redirect
 *               (RFC 8252): Cloudflare has no device flow for third-party
 *               clients. For the few minutes of a sign-in this process listens
 *               on localhost:47830 (the redirect URI registered on the client);
 *               the code is useless without the verifier, which never leaves here.
 *
 * Tokens live only in <data>/accounts.json (mode 0600), next to deploy.json.
 * Views (`accountsView`) never include them. Expiring tokens (Cloudflare) are
 * refreshed with the stored refresh token.
 *
 * The OAuth apps are Prepress's own: client ids in CLIENT_IDS (or
 * PREPRESS_GITHUB_CLIENT_ID / PREPRESS_CLOUDFLARE_CLIENT_ID). Without one, the
 * editor hides "Connect" and a target can still carry an API token in its
 * connection string (github://TOKEN@owner/repo, cfpages://TOKEN@account/project).
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

export type Provider = 'github' | 'cloudflare';

export const CLIENT_IDS: Record<Provider, string> = {
  // GitHub OAuth App "Prepress" (digitalnodecom), device flow enabled, no client secret.
  github: process.env.PREPRESS_GITHUB_CLIENT_ID || 'Ov23liVcqQs6LPXg0uAN',
  // Cloudflare OAuth client "Prepress" (DigitalNode account, public: any Cloudflare user can connect):
  // authorization code + PKCE, token auth "none", redirect http://localhost:47830/oauth/cloudflare/callback.
  cloudflare: process.env.PREPRESS_CLOUDFLARE_CLIENT_ID || '962a5b2b6ce58355bfe3f28d4043d7d1',
};

type ProviderDef =
  | { flow: 'device'; deviceUrl: string; tokenUrl: string; scope: string; verifyHost: string }
  | { flow: 'code'; authUrl: string; tokenUrl: string; scope: string; verifyHost: string; redirectPort: number; redirectPath: string };

export const PROVIDERS: Record<Provider, ProviderDef> = {
  // repo: create the site's repository, push the gh-pages branch and turn Pages on (the Pages API needs it).
  github: { flow: 'device', deviceUrl: 'https://github.com/login/device/code', tokenUrl: 'https://github.com/login/oauth/access_token', scope: 'repo', verifyHost: 'github.com' },
  cloudflare: {
    flow: 'code',
    authUrl: 'https://dash.cloudflare.com/oauth2/auth',
    tokenUrl: 'https://dash.cloudflare.com/oauth2/token',
    // Scope ids registered on the client (one unknown id voids the whole request):
    // Cloudflare Pages edit, list accounts, show who is connected, and a refresh token.
    scope: process.env.PREPRESS_CLOUDFLARE_SCOPES || 'page.write account-settings.read user-details.read offline_access',
    verifyHost: 'dash.cloudflare.com',
    redirectPort: 47830,
    redirectPath: '/oauth/cloudflare/callback',
  },
};

export const GITHUB_API = 'https://api.github.com';
export const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

export interface StoredAccount {
  accessToken: string;
  refreshToken?: string;
  /** ms since epoch; absent = doesn't expire. */
  expiresAt?: number;
  scope?: string;
  /** GitHub login / Cloudflare e-mail, for "Connected as …". */
  label?: string;
  /** Cloudflare accounts the token can use (a target picks one). */
  accounts?: { id: string; name: string }[];
}

export interface AccountView {
  available: boolean;
  connected: boolean;
  label?: string;
  accounts?: { id: string; name: string }[];
}

export interface OAuthOptions {
  dataDir: string;
  fetch?: typeof fetch;
  clientIds?: Partial<Record<Provider, string>>;
  githubApi?: string;
  cloudflareApi?: string;
  /** Tests: listen for the Cloudflare redirect on this port instead of the registered one. */
  callbackPort?: number;
}

const file = (dataDir: string) => join(dataDir, 'accounts.json');

function readStore(dataDir: string): Partial<Record<Provider, StoredAccount>> {
  try {
    return JSON.parse(readFileSync(file(dataDir), 'utf8')) ?? {};
  } catch {
    return {};
  }
}

function writeStore(dataDir: string, s: Partial<Record<Provider, StoredAccount>>) {
  const tmp = `${file(dataDir)}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(s, null, 2), { mode: 0o600 });
  renameSync(tmp, file(dataDir));
}

const clientId = (p: Provider, o: OAuthOptions) => o.clientIds?.[p] ?? CLIENT_IDS[p];
const NAME: Record<Provider, string> = { github: 'GitHub', cloudflare: 'Cloudflare' };

async function form(f: typeof fetch, url: string, body: Record<string, string>): Promise<{ status: number; json: any }> {
  let r: Response;
  try {
    r = await f(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams(body).toString(), signal: AbortSignal.timeout(30_000) });
  } catch (e: any) {
    throw new Error(`Can't reach ${new URL(url).host}: ${e?.cause?.code ?? e?.message ?? e}`);
  }
  return { status: r.status, json: (await r.json().catch(() => null)) ?? {} };
}

type Pending =
  | { kind: 'device'; provider: Provider; deviceCode: string; interval: number; next: number; expires: number }
  | { kind: 'code'; provider: Provider; verifier: string; state: string; redirectUri: string; expires: number; o: OAuthOptions; result?: PollResult };

/** Sign-ins waiting for the user, by id (in memory: a restart just means "Connect" again). */
const pending = new Map<string, Pending>();

export interface SignInStart {
  id: string;
  /** Device flow: the code to enter at verificationUri. */
  userCode?: string;
  verificationUri?: string;
  /** The verification page with the code filled in, when the provider offers one. */
  verificationUriComplete?: string;
  /** Browser flow: open this; the sign-in finishes when the browser comes back to us. */
  authorizeUrl?: string;
  expiresIn: number;
  /** How often to poll, in seconds. */
  interval: number;
}

/** Start connecting an account: a device code (GitHub) or a browser sign-in (Cloudflare). */
export async function startDeviceFlow(provider: Provider, o: OAuthOptions): Promise<SignInStart> {
  const def = PROVIDERS[provider];
  const id = clientId(provider, o);
  if (!id) throw Object.assign(new Error(`Connecting ${NAME[provider]} isn't set up in this build. Use an API token in the connection instead.`), { status: 501 });
  for (const [k, p] of pending) if (p.expires < Date.now()) pending.delete(k);
  if (def.flow === 'code') return startCodeFlow(provider, def, id, o);

  const { status, json } = await form(o.fetch ?? fetch, def.deviceUrl, { client_id: id, scope: def.scope });
  if (status >= 400 || !json.device_code || !json.user_code || !json.verification_uri) {
    const detail = json.error_description ?? json.error ?? `HTTP ${status}`;
    const setup = status === 404 || ['Not Found', 'invalid_client', 'unauthorized_client', 'device_flow_disabled'].includes(json.error);
    throw new Error(setup ? `${def.verifyHost} doesn't accept this app's sign-in (${detail}). Check the OAuth app's client id and that device flow is enabled for it.` : `${def.verifyHost}: ${detail}`);
  }
  const trusted = (u?: string) => {
    if (!u) return undefined;
    const url = new URL(u);
    if (url.protocol !== 'https:' || url.hostname !== def.verifyHost || url.username || url.password) throw new Error(`Unexpected verification address ${url.origin}`);
    return url.toString();
  };
  const interval = Math.max(1, Number(json.interval) || 5);
  const expiresIn = Math.min(900, Math.max(60, Number(json.expires_in) || 600));
  const flow = randomBytes(9).toString('hex');
  pending.set(flow, { kind: 'device', provider, deviceCode: json.device_code, interval, next: Date.now() + interval * 1000, expires: Date.now() + expiresIn * 1000 });
  return { id: flow, userCode: String(json.user_code), verificationUri: trusted(json.verification_uri)!, verificationUriComplete: trusted(json.verification_uri_complete), expiresIn, interval };
}

const b64url = (b: Buffer) => b.toString('base64url');

async function startCodeFlow(provider: Provider, def: Extract<ProviderDef, { flow: 'code' }>, id: string, o: OAuthOptions): Promise<SignInStart> {
  const port = o.callbackPort ?? def.redirectPort;
  const redirectUri = `http://localhost:${port}${def.redirectPath}`;
  await listenForCallback(port, def.redirectPath);
  // One browser sign-in at a time per provider: a new one replaces the old.
  for (const [k, p] of pending) if (p.kind === 'code' && p.provider === provider && !p.result) pending.delete(k);
  const verifier = b64url(randomBytes(32));
  const state = b64url(randomBytes(24));
  const flow = randomBytes(9).toString('hex');
  const expiresIn = 600;
  pending.set(flow, { kind: 'code', provider, verifier, state, redirectUri, expires: Date.now() + expiresIn * 1000, o });
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: id,
    redirect_uri: redirectUri,
    scope: def.scope,
    state,
    code_challenge: b64url(createHash('sha256').update(verifier).digest()),
    code_challenge_method: 'S256',
  });
  return { id: flow, authorizeUrl: `${def.authUrl}?${q}`, expiresIn, interval: 2 };
}

export type PollResult = { status: 'pending' } | { status: 'connected'; account: AccountView } | { status: 'failed'; error: string };

/** One poll of a sign-in. Polling a device flow faster than the provider allows just answers "pending". */
export async function pollDeviceFlow(provider: Provider, flowId: string, o: OAuthOptions): Promise<PollResult> {
  const p = pending.get(flowId);
  if (!p || p.provider !== provider) return { status: 'failed', error: 'This sign-in expired. Start again.' };
  if (Date.now() > p.expires) {
    pending.delete(flowId);
    return { status: 'failed', error: p.kind === 'device' ? 'The code expired. Start again.' : 'The sign-in timed out. Start again.' };
  }
  if (p.kind === 'code') {
    if (!p.result) return { status: 'pending' };
    pending.delete(flowId);
    return p.result;
  }
  if (Date.now() < p.next) return { status: 'pending' };
  const { json } = await form(o.fetch ?? fetch, PROVIDERS[provider].tokenUrl, { client_id: clientId(provider, o), device_code: p.deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' });
  if (json.error === 'authorization_pending' || json.error === 'slow_down') {
    if (json.error === 'slow_down') p.interval += 5;
    p.next = Date.now() + p.interval * 1000;
    return { status: 'pending' };
  }
  pending.delete(flowId);
  if (!json.access_token) return { status: 'failed', error: json.error === 'access_denied' ? 'Access was denied.' : json.error === 'expired_token' ? 'The code expired. Start again.' : (json.error_description ?? json.error ?? 'Sign-in failed') };
  return { status: 'connected', account: await saveGrant(provider, json, o) };
}

async function saveGrant(provider: Provider, json: any, o: OAuthOptions): Promise<AccountView> {
  const acc: StoredAccount = { accessToken: json.access_token, scope: json.scope };
  if (json.refresh_token) acc.refreshToken = json.refresh_token;
  if (json.expires_in) acc.expiresAt = Date.now() + Number(json.expires_in) * 1000;
  await describe(provider, acc, o);
  writeStore(o.dataDir, { ...readStore(o.dataDir), [provider]: acc });
  return view(provider, acc, o);
}

// ---------- the loopback redirect (browser sign-in) ----------

let callback: { port: number; servers: Server[]; idle?: ReturnType<typeof setTimeout> } | null = null;

const PAGE = (title: string, text: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;color:#1c1c1c}h1{font-size:22px}</style></head><body><h1>${title}</h1><p>${text}</p></body></html>`;
const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Listen on localhost (IPv4 and IPv6) for the provider's redirect; closes itself when no sign-in waits. */
async function listenForCallback(port: number, path: string) {
  if (callback?.port === port) return armIdle();
  if (callback) await closeCallback();
  const handle = async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
    const u = new URL(req.url ?? '/', 'http://localhost');
    const send = (status: number, title: string, text: string) => {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'", 'referrer-policy': 'no-referrer' });
      res.end(PAGE(title, text));
    };
    if (req.method !== 'GET' || u.pathname !== path) return send(404, 'Not found', 'Nothing here.');
    const state = u.searchParams.get('state') ?? '';
    const entry = [...pending.values()].find((p): p is Extract<Pending, { kind: 'code' }> => p.kind === 'code' && !p.result && p.state === state && p.expires > Date.now());
    if (!entry) return send(400, 'Sign-in not recognised', 'This sign-in expired or was started elsewhere. Go back to Prepress and click Connect again.');
    const name = NAME[entry.provider];
    const err = u.searchParams.get('error');
    if (err) {
      const detail = u.searchParams.get('error_description') || err;
      entry.result = { status: 'failed', error: err === 'access_denied' ? 'Access was denied.' : `${name}: ${detail}` };
      return send(400, `${name} sign-in didn't finish`, `${escHtml(detail)}. Go back to Prepress to try again.`);
    }
    const code = u.searchParams.get('code');
    if (!code) return send(400, 'Sign-in not recognised', 'The answer had no code. Go back to Prepress and try again.');
    try {
      const { status, json } = await form(entry.o.fetch ?? fetch, PROVIDERS[entry.provider].tokenUrl, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: entry.redirectUri,
        client_id: clientId(entry.provider, entry.o),
        code_verifier: entry.verifier,
      });
      if (!json.access_token) throw new Error(json.error_description ?? json.error ?? `HTTP ${status}`);
      const account = await saveGrant(entry.provider, json, entry.o);
      entry.result = { status: 'connected', account };
      send(200, `Connected to ${name}`, `${account.label ? `Signed in as ${escHtml(account.label)}. ` : ''}You can close this tab and go back to Prepress.`);
    } catch (e: any) {
      entry.result = { status: 'failed', error: `${name}: ${String(e?.message ?? e)}` };
      send(502, `${name} sign-in failed`, `${escHtml(String(e?.message ?? e))}. Go back to Prepress to try again.`);
    }
    armIdle();
  };
  const listen = (host: string) =>
    new Promise<Server | null>((resolve, reject) => {
      const srv = createServer((q, r) => void handle(q, r));
      srv.once('error', (e: any) => (host === '::1' && e.code !== 'EADDRINUSE' ? resolve(null) : reject(e)));
      srv.listen(port, host, () => resolve(srv));
    });
  let servers: Server[];
  try {
    const v4 = await listen('127.0.0.1');
    const v6 = await listen('::1').catch((e) => {
      v4?.close();
      throw e;
    });
    servers = [v4, v6].filter((s): s is Server => !!s);
  } catch (e: any) {
    throw new Error(e?.code === 'EADDRINUSE' ? `Port ${port} is in use (another Prepress window signing in, or another app). Finish or close that, then try again.` : `Can't listen on localhost:${port}: ${e?.message ?? e}`);
  }
  callback = { port, servers };
  armIdle();
}

/** Stop listening once nothing waits for a redirect (checked every minute while something does). */
function armIdle() {
  if (!callback) return;
  if (callback.idle) clearTimeout(callback.idle);
  callback.idle = setTimeout(() => {
    const waiting = [...pending.values()].some((p) => p.kind === 'code' && !p.result && p.expires > Date.now());
    if (waiting) armIdle();
    else void closeCallback();
  }, 60_000);
  callback.idle.unref?.();
}

async function closeCallback() {
  const c = callback;
  callback = null;
  if (!c) return;
  if (c.idle) clearTimeout(c.idle);
  await Promise.all(c.servers.map((s) => new Promise((r) => s.close(() => r(null)))));
}

/** Tests: stop the loopback listener now. */
export const stopCallbackListener = closeCallback;

/** Fill in who this is (and, for Cloudflare, which accounts it can publish to). */
async function describe(provider: Provider, acc: StoredAccount, o: OAuthOptions) {
  const f = o.fetch ?? fetch;
  const headers = { authorization: `Bearer ${acc.accessToken}`, accept: 'application/json', 'user-agent': 'Prepress' };
  if (provider === 'github') {
    const r = await f(`${o.githubApi ?? GITHUB_API}/user`, { headers, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    const j: any = await r?.json().catch(() => null);
    if (j?.login) acc.label = String(j.login);
    return;
  }
  const api = o.cloudflareApi ?? CLOUDFLARE_API;
  const [u, a] = await Promise.all([
    f(`${api}/user`, { headers, signal: AbortSignal.timeout(20_000) }).then((r) => r.json()).catch(() => null) as Promise<any>,
    f(`${api}/accounts?per_page=50`, { headers, signal: AbortSignal.timeout(20_000) }).then((r) => r.json()).catch(() => null) as Promise<any>,
  ]);
  if (u?.result?.email) acc.label = String(u.result.email);
  if (Array.isArray(a?.result)) acc.accounts = a.result.map((x: any) => ({ id: String(x.id), name: String(x.name ?? x.id) }));
}

const view = (p: Provider, acc: StoredAccount | undefined, o: OAuthOptions): AccountView => ({
  available: !!clientId(p, o),
  connected: !!acc,
  ...(acc?.label ? { label: acc.label } : {}),
  ...(acc?.accounts ? { accounts: acc.accounts } : {}),
});

export function accountsView(o: OAuthOptions): Record<Provider, AccountView> {
  const s = readStore(o.dataDir);
  return { github: view('github', s.github, o), cloudflare: view('cloudflare', s.cloudflare, o) };
}

/** Forget a connected account (Cloudflare's refresh token is revoked too, best effort). */
export async function disconnect(provider: Provider, o: OAuthOptions) {
  const s = readStore(o.dataDir);
  const acc = s[provider];
  delete s[provider];
  writeStore(o.dataDir, s);
  if (provider === 'cloudflare' && acc?.refreshToken) {
    await form(o.fetch ?? fetch, 'https://dash.cloudflare.com/oauth2/revoke', { client_id: clientId(provider, o), token: acc.refreshToken }).catch(() => undefined);
  }
}

/** A usable access token for a connected account, refreshed if it's about to expire. */
export async function accountToken(provider: Provider, o: OAuthOptions): Promise<string> {
  const s = readStore(o.dataDir);
  const acc = s[provider];
  const name = provider === 'github' ? 'GitHub' : 'Cloudflare';
  if (!acc) throw new Error(`Connect your ${name} account first (Settings → Publishing), or put an API token in the connection.`);
  if (!acc.expiresAt || acc.expiresAt - 60_000 > Date.now()) return acc.accessToken;
  if (!acc.refreshToken) throw new Error(`The ${name} sign-in expired. Connect again.`);
  const { json } = await form(o.fetch ?? fetch, PROVIDERS[provider].tokenUrl, { grant_type: 'refresh_token', refresh_token: acc.refreshToken, client_id: clientId(provider, o) });
  if (!json.access_token) throw new Error(`The ${name} sign-in expired (${json.error_description ?? json.error ?? 'refresh failed'}). Connect again.`);
  acc.accessToken = json.access_token;
  if (json.refresh_token) acc.refreshToken = json.refresh_token;
  acc.expiresAt = json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : undefined;
  writeStore(o.dataDir, { ...readStore(o.dataDir), [provider]: acc });
  return acc.accessToken;
}
