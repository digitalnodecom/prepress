/**
 * Publish targets as connection strings — what users paste from their host:
 *
 *   sftp://user:password@host:22/var/www/site      absolute remote folder
 *   sftp://user@host/~/public_html                 relative to the login folder (key or ssh-agent auth)
 *   sftp://user@host/site?key=~/.ssh/deploy_key    a specific private key
 *   ftps://user:password@host/public_html          FTP over TLS (explicit); ftp:// is unencrypted
 *   s3://ACCESS_KEY:SECRET@bucket/prefix?region=eu-central-1
 *   s3://KEY:SECRET@bucket?endpoint=https://<account>.r2.cloudflarestorage.com   (R2, MinIO, Spaces, B2 …)
 *   /Users/me/Sites/www  ·  ~/www  ·  file:///srv/www                            a folder on this computer
 *   prepress://my-site                             free hosting at https://my-site.prepress.digitalno.de
 *   cfpages://ACCOUNT_ID/my-site                   Cloudflare Pages (connected account; or cfpages://API_TOKEN@ACCOUNT_ID/my-site)
 *   github://owner/my-site?branch=gh-pages         GitHub Pages (connected account; or github://TOKEN@owner/my-site)
 *
 * Passwords and secret keys may contain "/", "@" or ":" unencoded (the last "@"
 * before the host ends them); percent-encoding works too. Parsing only splits
 * the string; `cleanTarget` (deploy.ts) validates every field.
 */
import type { DeployTarget, TargetType } from '../deploy.ts';

/** What the editor shows instead of a stored secret. Sent back unchanged, it means "keep the stored one". */
export const MASK = '••••••';

type Parsed = Partial<Pick<DeployTarget, 'type' | 'path' | 'host' | 'port' | 'user' | 'password' | 'identityFile' | 'secure' | 'bucket' | 'region' | 'endpoint' | 'pathStyle' | 'accessKeyId' | 'secretAccessKey' | 'token' | 'branch'>>;

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function parseConnection(input: string): Parsed {
  const str = String(input ?? '').trim();
  if (!str) throw new Error('Enter a connection, e.g. sftp://user@example.com/var/www/site');
  const m = str.match(/^([a-z0-9]+):\/\/(.*)$/i);
  if (!m) {
    // A local folder: /abs, ~/x, C:\x
    if (/^(\/|~|[A-Za-z]:[\\/])/.test(str)) return { type: 'folder', path: str };
    throw new Error('Start with prepress://, cfpages://, github://, sftp://, ftps://, ftp://, s3:// or a folder path');
  }
  const scheme = m[1].toLowerCase();
  let rest = m[2];
  if (scheme === 'file') return { type: 'folder', path: decode(rest.replace(/^localhost(?=\/)/, '')) };
  if (scheme === 'prepress') return { type: 'prepress', host: rest.replace(/[/?#].*$/, '').toLowerCase(), path: '' };
  if (scheme === 'cfpages' || scheme === 'github') {
    // [TOKEN@]account-or-owner/project-or-repo[?branch=…]; the token is everything before the last "@".
    const q = rest.indexOf('?', rest.lastIndexOf('@') + 1);
    const query = new URLSearchParams(q >= 0 ? rest.slice(q + 1) : '');
    if (q >= 0) rest = rest.slice(0, q);
    const at = rest.lastIndexOf('@');
    const token = at >= 0 ? decode(rest.slice(0, at)) || undefined : undefined;
    const [host = '', ...more] = rest.slice(at + 1).split('/');
    const out: Parsed = { type: scheme, host, path: more.join('/').replace(/\/+$/, ''), token };
    if (scheme === 'github' && query.get('branch')) out.branch = query.get('branch')!;
    return out;
  }

  const type: Exclude<TargetType, 'prepress' | 'cfpages' | 'github'> | undefined = scheme === 'sftp' || scheme === 'ssh' ? 'sftp' : scheme === 'ftp' || scheme === 'ftps' ? 'ftp' : scheme === 's3' ? 's3' : undefined;
  if (!type) throw new Error(`Unsupported connection type "${scheme}://". Use prepress://, cfpages://, github://, sftp://, ftps://, ftp:// or s3://`);

  // Query (?key=…, ?region=…) — only after the host part, so secrets may contain "?" only percent-encoded.
  let query = new URLSearchParams();
  const at = rest.lastIndexOf('@');
  const q = rest.indexOf('?', at + 1);
  if (q >= 0) {
    query = new URLSearchParams(rest.slice(q + 1));
    rest = rest.slice(0, q);
  }

  let user: string | undefined;
  let secret: string | undefined;
  if (at >= 0) {
    const cred = rest.slice(0, at);
    rest = rest.slice(at + 1);
    const colon = cred.indexOf(':');
    user = decode(colon >= 0 ? cred.slice(0, colon) : cred) || undefined;
    secret = colon >= 0 ? decode(cred.slice(colon + 1)) : undefined;
  }

  const slash = rest.indexOf('/');
  const hostPort = slash >= 0 ? rest.slice(0, slash) : rest;
  let path = slash >= 0 ? decode(rest.slice(slash)) : '';

  if (type === 's3') {
    const out: Parsed = { type, bucket: hostPort, path: path.replace(/^\/+|\/+$/g, ''), accessKeyId: user, secretAccessKey: secret };
    if (query.get('region')) out.region = query.get('region')!;
    if (query.get('endpoint')) out.endpoint = query.get('endpoint')!;
    const style = query.get('path-style') ?? query.get('pathStyle') ?? query.get('style');
    if (style !== null) out.pathStyle = style === 'path' || style === '1' || style === 'true';
    return out;
  }

  const hp = hostPort.match(/^(\[[^\]]+\]|[^:]*)(?::(\d+))?$/);
  if (!hp) throw new Error('Could not read the host and port');
  const out: Parsed = { type, host: hp[1], user, password: secret };
  if (hp[2]) out.port = Number(hp[2]);
  if (type === 'sftp') {
    // sftp://host/abs/path is absolute; sftp://host/~/x (or no path) is relative to the login folder.
    path = path === '' || path === '/~' ? '.' : path.startsWith('/~/') ? path.slice(3) : path;
    if (query.get('key')) out.identityFile = query.get('key')!;
  } else {
    // FTP paths are relative to the login folder (RFC 1738); "//abs" for an absolute one.
    path = path.startsWith('//') ? path.slice(1) : path.replace(/^\/+/, '') || '.';
    out.secure = scheme === 'ftps';
  }
  out.path = path;
  return out;
}

/** A target as a connection string; secrets replaced by MASK unless `reveal`. */
export function formatConnection(t: DeployTarget, reveal = false): string {
  const enc = (s: string) => encodeURIComponent(s);
  const secret = (s?: string) => (s ? `:${reveal ? enc(s) : MASK}` : '');
  if (t.type === 'folder') return t.path;
  if (t.type === 'prepress') return `prepress://${t.host}`;
  if (t.type === 'cfpages' || t.type === 'github') {
    const token = t.token ? `${reveal ? enc(t.token) : MASK}@` : '';
    return `${t.type}://${token}${t.host}/${t.path}${t.type === 'github' && t.branch ? `?branch=${enc(t.branch)}` : ''}`;
  }
  if (t.type === 's3') {
    const qs = new URLSearchParams();
    if (t.region) qs.set('region', t.region);
    if (t.endpoint) qs.set('endpoint', t.endpoint);
    if (t.pathStyle !== undefined) qs.set('path-style', t.pathStyle ? '1' : '0');
    const cred = t.accessKeyId ? `${enc(t.accessKeyId)}${secret(t.secretAccessKey)}@` : '';
    return `s3://${cred}${t.bucket}${t.path ? `/${t.path}` : ''}${qs.size ? `?${qs.toString().replace(/%3A/g, ':').replace(/%2F/g, '/')}` : ''}`;
  }
  const cred = t.user ? `${enc(t.user)}${secret(t.password)}@` : '';
  const host = `${t.host}${t.port ? `:${t.port}` : ''}`;
  if (t.type === 'sftp') {
    const path = t.path === '.' ? '' : t.path.startsWith('/') ? t.path : `/~/${t.path}`;
    return `sftp://${cred}${host}${path}${t.identityFile ? `?key=${t.identityFile}` : ''}`;
  }
  const path = t.path === '.' ? '' : t.path.startsWith('/') ? `/${t.path}` : `/${t.path}`;
  return `${t.secure ? 'ftps' : 'ftp'}://${cred}${host}${path}`;
}
