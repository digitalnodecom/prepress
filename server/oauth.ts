/**
 * Connected accounts for publish targets: GitHub (GitHub Pages) and Cloudflare
 * (Cloudflare Pages), both signed in with the OAuth 2.0 Device Authorization
 * Grant (RFC 8628). The editor shows a short code, the user approves it on
 * github.com / dash.cloudflare.com in their own browser, and we poll for the
 * token. No redirect URI, no local callback port, no client secret in the app.
 *
 * Tokens live only in <data>/accounts.json (mode 0600), next to deploy.json.
 * Views (`accountsView`) never include them. Cloudflare access tokens expire
 * (about an hour) and are refreshed with the stored refresh token; GitHub
 * OAuth App tokens don't expire.
 *
 * The OAuth apps are Prepress's own: set their client ids in CLIENT_IDS (or
 * PREPRESS_GITHUB_CLIENT_ID / PREPRESS_CLOUDFLARE_CLIENT_ID). Without one, the
 * editor hides "Connect" and a target can still carry an API token in its
 * connection string (github://TOKEN@owner/repo, cfpages://TOKEN@account/project).
 */
import { randomBytes } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type Provider = 'github' | 'cloudflare';

export const CLIENT_IDS: Record<Provider, string> = {
  github: process.env.PREPRESS_GITHUB_CLIENT_ID || '',
  cloudflare: process.env.PREPRESS_CLOUDFLARE_CLIENT_ID || '',
};

interface ProviderDef {
  deviceUrl: string;
  tokenUrl: string;
  scope: string;
  /** Where the user may be sent to type the code (anything else in a response is refused). */
  verifyHost: string;
}

export const PROVIDERS: Record<Provider, ProviderDef> = {
  // repo: create the site's repository, push the gh-pages branch and turn Pages on (the Pages API needs it).
  github: { deviceUrl: 'https://github.com/login/device/code', tokenUrl: 'https://github.com/login/oauth/access_token', scope: 'repo', verifyHost: 'github.com' },
  cloudflare: { deviceUrl: 'https://dash.cloudflare.com/oauth2/device/auth', tokenUrl: 'https://dash.cloudflare.com/oauth2/token', scope: 'account:read user:read pages:write offline_access', verifyHost: 'dash.cloudflare.com' },
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

async function form(f: typeof fetch, url: string, body: Record<string, string>): Promise<{ status: number; json: any }> {
  let r: Response;
  try {
    r = await f(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams(body).toString(), signal: AbortSignal.timeout(30_000) });
  } catch (e: any) {
    throw new Error(`Can't reach ${new URL(url).host}: ${e?.cause?.code ?? e?.message ?? e}`);
  }
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

interface Pending {
  provider: Provider;
  deviceCode: string;
  interval: number;
  next: number;
  expires: number;
}

/** Device flows waiting for the user, by id (in memory: a restart just means "Connect" again). */
const pending = new Map<string, Pending>();

export interface DeviceStart {
  id: string;
  userCode: string;
  verificationUri: string;
  /** The verification page with the code filled in, when the provider offers one. */
  verificationUriComplete?: string;
  expiresIn: number;
  interval: number;
}

export async function startDeviceFlow(provider: Provider, o: OAuthOptions): Promise<DeviceStart> {
  const def = PROVIDERS[provider];
  const id = clientId(provider, o);
  if (!id) throw Object.assign(new Error(`Connecting ${provider === 'github' ? 'GitHub' : 'Cloudflare'} isn't set up in this build. Use an API token in the connection instead.`), { status: 501 });
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
  for (const [k, p] of pending) if (p.expires < Date.now()) pending.delete(k);
  pending.set(flow, { provider, deviceCode: json.device_code, interval, next: Date.now() + interval * 1000, expires: Date.now() + expiresIn * 1000 });
  return { id: flow, userCode: String(json.user_code), verificationUri: trusted(json.verification_uri)!, verificationUriComplete: trusted(json.verification_uri_complete), expiresIn, interval };
}

export type PollResult = { status: 'pending' } | { status: 'connected'; account: AccountView } | { status: 'failed'; error: string };

/** One poll of a device flow. Polling faster than the provider allows just answers "pending". */
export async function pollDeviceFlow(provider: Provider, flowId: string, o: OAuthOptions): Promise<PollResult> {
  const p = pending.get(flowId);
  if (!p || p.provider !== provider) return { status: 'failed', error: 'This sign-in expired. Start again.' };
  if (Date.now() > p.expires) {
    pending.delete(flowId);
    return { status: 'failed', error: 'The code expired. Start again.' };
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
  const acc: StoredAccount = { accessToken: json.access_token, scope: json.scope };
  if (json.refresh_token) acc.refreshToken = json.refresh_token;
  if (json.expires_in) acc.expiresAt = Date.now() + Number(json.expires_in) * 1000;
  await describe(provider, acc, o);
  writeStore(o.dataDir, { ...readStore(o.dataDir), [provider]: acc });
  return { status: 'connected', account: view(provider, acc, o) };
}

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
