/**
 * Publish targets: where the rendered static site (the folder Publish writes,
 * --out) is uploaded. Each is a connection string (server/targets/connection.ts):
 *
 *   sftp://user:pass@host/var/www/site   SSH/SFTP — password, key or ssh-agent
 *   ftps://user:pass@host/public_html    FTP over TLS (ftp:// = unencrypted)
 *   s3://KEY:SECRET@bucket/prefix        S3 and S3-compatible storage (R2, MinIO, Spaces …)
 *   /path/to/folder                      a folder on this computer
 *
 * A deploy only ever removes files it uploaded itself (tracked per target in
 * <data>/deploys/<id>.json with content hashes, so unchanged files are
 * skipped). A file it would overwrite that it didn't upload is backed up to
 * <data>/backup/<target>-<time>/ first.
 *
 * Config lives in <data>/deploy.json (mode 0600: it holds passwords and keys).
 * Secrets never leave the server: views show them as MASK, and a MASK sent back
 * means "keep the stored secret".
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { MASK, formatConnection, parseConnection } from './targets/connection.ts';
import { posixDir, type Remote } from './targets/remote.ts';
import { connectFolder } from './targets/folder.ts';
import { connectSftp } from './targets/sftp.ts';
import { connectFtp } from './targets/ftp.ts';
import { connectS3 } from './targets/s3.ts';
import { HOSTING_DOMAIN, connectPrepress } from './targets/prepress.ts';
import { nameProblem } from '../hosting/names.ts';

export type TargetType = 'folder' | 'sftp' | 'ftp' | 's3' | 'prepress';

export interface DeployTarget {
  id: string;
  name: string;
  type: TargetType;
  /** folder: absolute local path · sftp/ftp: remote folder ("." = login folder) · s3: key prefix ("" = bucket root). */
  path: string;
  host?: string;
  port?: number;
  user?: string;
  /** sftp/ftp password (secret). */
  password?: string;
  /** sftp private key file; default: ssh-agent, then ~/.ssh/id_ed25519|id_ecdsa|id_rsa. */
  identityFile?: string;
  /** ftp: FTPS (explicit TLS). */
  secure?: boolean;
  bucket?: string;
  region?: string;
  /** S3-compatible endpoint (R2, MinIO …); AWS when absent. */
  endpoint?: string;
  pathStyle?: boolean;
  accessKeyId?: string;
  /** s3 secret key (secret). */
  secretAccessKey?: string;
  /** Public URL served from this target, for "Open" links. */
  url?: string;
  /** Upload automatically after every Publish. */
  auto: boolean;
}

/** What the editor and MCP see: no secrets. */
export interface TargetView {
  id: string;
  name: string;
  type: TargetType;
  connection: string;
  url?: string;
  auto: boolean;
  /** Plain FTP: the password travels unencrypted. */
  insecure?: boolean;
  last: DeployStatus | null;
}

export interface DeployStatus {
  at: string;
  ok: boolean;
  uploaded: number;
  removed: number;
  unchanged: number;
  error?: string;
  backup?: string;
}

interface TargetState {
  files: Record<string, string>;
  last?: DeployStatus;
  /** SFTP host key fingerprint, pinned on first connect. */
  hostKey?: string;
}

export interface DeployResult extends DeployStatus {
  id: string;
  name: string;
  url?: string;
}

const NAME = /^[^\u0000-\u001f]{1,60}$/;
const HOST = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,252}$|^\[[0-9A-Fa-f:.]+\]$/;
const USER = /^[^\u0000-\u001f\s:@/]{1,64}$/;
const BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const REGION = /^[a-z0-9-]{1,32}$/;
const SAFE_REL = /^(?:[a-z0-9][a-z0-9-]*\/)?[A-Za-z0-9][A-Za-z0-9._-]*$|^uploads\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CONTROL = /[\u0000-\u001f]/;

const inside = (child: string, parent: string) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const expandHome = (p: string) => (p === '~' || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p);

function writeAtomic(file: string, data: string | Buffer, mode?: number) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, data, mode ? { mode } : undefined);
  renameSync(tmp, file);
}

/** Where a target points; changing it makes the old upload manifest meaningless. */
const destination = (t: DeployTarget) => JSON.stringify([t.type, t.host, t.port, t.user, t.path, t.bucket, t.endpoint, t.region]);

/**
 * Validate a target from the editor: `{ id?, name?, connection, url?, auto? }`
 * (or the parsed fields directly). `prev` is the stored target with the same id,
 * whose secrets are kept when the editor sends MASK. Throws a readable message.
 */
export function cleanTarget(raw: any, guard: { dataDir: string; outDir: string }, prev?: DeployTarget): DeployTarget {
  if (!raw || typeof raw !== 'object') throw new Error('Expected a target object');
  const fields: any = typeof raw.connection === 'string' ? { ...parseConnection(raw.connection) } : { ...raw };
  const type: TargetType = fields.type;
  if (!['folder', 'sftp', 'ftp', 's3', 'prepress'].includes(type)) throw new Error('Unknown target type');

  // MASK = keep the stored secret (only if the destination's login is the same).
  const sameLogin = prev && prev.type === type && prev.host === fields.host && prev.user === fields.user && prev.accessKeyId === fields.accessKeyId;
  for (const k of ['password', 'secretAccessKey'] as const) {
    if (fields[k] === MASK) {
      if (!sameLogin || !prev?.[k]) throw new Error('Enter the password / secret again (the login changed)');
      fields[k] = prev[k];
    }
  }

  const defaultName = type === 'prepress' ? 'Prepress (free)' : type === 'folder' ? 'Folder' : type === 's3' ? `S3 ${fields.bucket ?? ''}`.trim() : String(fields.host ?? 'Server');
  const name = String(raw.name ?? '').trim() || defaultName;
  if (!NAME.test(name)) throw new Error('Name is too long or has control characters');
  let path = String(fields.path ?? '').trim();
  if (CONTROL.test(path)) throw new Error('The path contains control characters');

  const t: DeployTarget = {
    id: typeof raw.id === 'string' && /^[a-z0-9]{6,24}$/.test(raw.id) ? raw.id : randomBytes(6).toString('hex'),
    name,
    type,
    path,
    auto: raw.auto !== false,
  };
  if (raw.url) {
    const u = String(raw.url).trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^\s"<>]+$/.test(u)) throw new Error('URL must start with http:// or https://');
    t.url = u;
  }

  if (type === 'prepress') {
    const name = String(fields.host ?? '');
    const problem = nameProblem(name);
    if (problem) throw new Error(`${name || 'Site name'}: ${problem}`);
    t.host = name;
    t.path = '';
    t.url ??= `https://${name}.${HOSTING_DOMAIN}`;
    return t;
  }

  if (type === 'folder') {
    if (!path) throw new Error('Enter a folder');
    path = resolve(expandHome(path));
    const data = resolve(guard.dataDir);
    const out = resolve(guard.outDir);
    if (inside(data, path) || inside(path, data)) throw new Error('The folder must not contain, or be inside, the site folder');
    if (inside(out, path) || inside(path, out)) throw new Error('The folder must not overlap the publish folder (--out); targets get a copy of it');
    if (path === resolve(homedir()) || path === sep || /^[A-Za-z]:\\?$/.test(path)) throw new Error('Pick a dedicated folder, not your home or a drive root');
    t.path = path;
    return t;
  }

  if (type === 's3') {
    if (!BUCKET.test(String(fields.bucket ?? ''))) throw new Error('Bucket name: 3–63 lower-case letters, digits, dots or dashes');
    t.bucket = fields.bucket;
    t.path = path.replace(/^\/+|\/+$/g, '');
    if (fields.region) {
      if (!REGION.test(fields.region)) throw new Error('Bad region');
      t.region = fields.region;
    }
    if (fields.endpoint) {
      let e: URL;
      try {
        e = new URL(fields.endpoint);
      } catch {
        throw new Error('The endpoint must be a URL, e.g. https://<account>.r2.cloudflarestorage.com');
      }
      if (!/^https?:$/.test(e.protocol) || e.username || e.password) throw new Error('The endpoint must be an http(s) URL without credentials');
      t.endpoint = `${e.protocol}//${e.host}${e.pathname.replace(/\/+$/, '')}`;
    }
    if (typeof fields.pathStyle === 'boolean') t.pathStyle = fields.pathStyle;
    if (!fields.accessKeyId || !fields.secretAccessKey) throw new Error('S3 needs an access key and secret: s3://KEY:SECRET@bucket/prefix');
    if (CONTROL.test(fields.accessKeyId + fields.secretAccessKey)) throw new Error('The key contains control characters');
    t.accessKeyId = fields.accessKeyId;
    t.secretAccessKey = fields.secretAccessKey;
    return t;
  }

  // sftp / ftp
  const host = String(fields.host ?? '').trim();
  if (!HOST.test(host)) throw new Error('Host must be a host name or IP address');
  t.host = host;
  if (fields.user) {
    if (!USER.test(fields.user)) throw new Error('Bad user name');
    t.user = fields.user;
  }
  if (fields.password) {
    if (CONTROL.test(fields.password)) throw new Error('The password contains control characters');
    t.password = fields.password;
  }
  if (fields.port !== undefined && fields.port !== '' && fields.port !== null) {
    const port = Number(fields.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be 1–65535');
    t.port = port;
  }
  path = path.replace(/\/+$/, '') || (path.startsWith('/') ? '/' : '.');
  if (path === '/') throw new Error('Pick the site folder, not the server root /');
  t.path = path;
  if (type === 'sftp' && fields.identityFile) {
    const f = resolve(expandHome(String(fields.identityFile).trim()));
    if (!existsSync(f)) throw new Error(`Key file not found: ${f}`);
    t.identityFile = f;
  }
  if (type === 'ftp') t.secure = !!fields.secure;
  return t;
}

export const viewTarget = (t: DeployTarget, last: DeployStatus | null = null): TargetView => ({
  id: t.id,
  name: t.name,
  type: t.type,
  connection: formatConnection(t),
  ...(t.url ? { url: t.url } : {}),
  auto: t.auto,
  ...(t.type === 'ftp' && !t.secure ? { insecure: true } : {}),
  last,
});

function readTargets(dataDir: string): DeployTarget[] {
  try {
    const j = JSON.parse(readFileSync(join(dataDir, 'deploy.json'), 'utf8'));
    return Array.isArray(j.targets) ? j.targets : [];
  } catch {
    return [];
  }
}

/** Targets without secrets (startup log). */
export const listTargets = (dataDir: string) => readTargets(dataDir).map((t) => viewTarget(t));

export function createDeployer(opts: { dataDir: string; outDir: string; hostingApi?: string; hostingFetch?: typeof fetch }) {
  const configFile = join(opts.dataDir, 'deploy.json');
  const stateDir = join(opts.dataDir, 'deploys');
  const locks = new Map<string, Promise<unknown>>();

  const list = () => readTargets(opts.dataDir);

  const readState = (id: string): TargetState => {
    try {
      return JSON.parse(readFileSync(join(stateDir, `${id}.json`), 'utf8'));
    } catch {
      return { files: {} };
    }
  };
  const writeState = (id: string, s: TargetState) => {
    mkdirSync(stateDir, { recursive: true });
    writeAtomic(join(stateDir, `${id}.json`), JSON.stringify(s));
  };

  function save(raw: any[]): TargetView[] {
    if (!Array.isArray(raw)) throw new Error('Expected a list of targets');
    if (raw.length > 20) throw new Error('At most 20 targets');
    const prev = list();
    const targets = raw.map((r) => cleanTarget(r, opts, prev.find((p) => p.id === r?.id)));
    // A target pointing somewhere else starts from scratch: its manifest (and pinned host key) describe the old place.
    for (const t of targets) {
      const old = prev.find((p) => p.id === t.id);
      if (old && destination(old) !== destination(t)) rmSync(join(stateDir, `${t.id}.json`), { force: true });
    }
    for (const p of prev) if (!targets.some((t) => t.id === p.id)) rmSync(join(stateDir, `${p.id}.json`), { force: true });
    writeAtomic(configFile, JSON.stringify({ targets }, null, 2), 0o600);
    return view();
  }

  const view = (): TargetView[] => list().map((t) => viewTarget(t, readState(t.id).last ?? null));

  async function connect(t: DeployTarget, state?: TargetState): Promise<Remote> {
    if (t.type === 'folder') return connectFolder(t);
    if (t.type === 'ftp') return connectFtp(t);
    if (t.type === 's3') return connectS3(t);
    if (t.type === 'prepress') return connectPrepress(t, { dataDir: opts.dataDir, base: opts.hostingApi, fetch: opts.hostingFetch });
    return connectSftp(t, { expected: state?.hostKey, seen: (fp) => state && (state.hostKey = fp) });
  }

  /** The published files (relative paths) and their contents. */
  function collect(files: string[]): Map<string, Buffer> {
    const out = new Map<string, Buffer>();
    for (const rel of files) {
      if (!SAFE_REL.test(rel)) continue;
      const f = join(opts.outDir, rel);
      if (existsSync(f)) out.set(rel, readFileSync(f));
    }
    return out;
  }

  /** Media first, pages next, 404 and the front page last: no page ever links to something not uploaded yet. */
  const rank = (r: string) => (r.startsWith('uploads/') ? 0 : r === 'index.html' ? 3 : r === '404.html' ? 2 : 1);
  const order = (rels: string[]) => [...rels].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  interface Plan {
    put: string[];
    remove: string[];
    unchanged: number;
    hashes: Record<string, string>;
  }

  function planFor(src: Map<string, Buffer>, state: TargetState, full: boolean): Plan {
    const hashes: Record<string, string> = {};
    const put: string[] = [];
    let unchanged = 0;
    for (const [rel, buf] of src) {
      hashes[rel] = hash(buf);
      if (!full && state.files[rel] === hashes[rel]) unchanged++;
      else put.push(rel);
    }
    const remove = Object.keys(state.files).filter((rel) => !src.has(rel) && SAFE_REL.test(rel));
    return { put: order(put), remove, unchanged, hashes };
  }

  async function run(t: DeployTarget, src: Map<string, Buffer>, state: TargetState, plan: Plan): Promise<Partial<DeployStatus>> {
    const remote = await connect(t, state);
    const backupDir = join(opts.dataDir, 'backup', `${t.id}-${stamp()}`);
    let backedUp = false;
    try {
      for (const rel of plan.put) {
        if (!state.files[rel]) {
          // First upload to this path: keep whatever is there (a host's placeholder page).
          const old = await remote.read(rel);
          if (old) {
            const b = join(backupDir, rel);
            mkdirSync(dirname(b), { recursive: true });
            writeFileSync(b, old);
            backedUp = true;
          }
        }
        await remote.write(rel, src.get(rel)!);
      }
      for (const rel of plan.remove) await remote.remove(rel);
      for (const d of new Set(plan.remove.map(posixDir).filter(Boolean))) await remote.removeDir(d);
    } finally {
      await remote.close().catch(() => undefined);
    }
    return backedUp ? { backup: backupDir } : {};
  }

  async function deployOne(t: DeployTarget, files: string[], full = false): Promise<DeployResult> {
    const prev = locks.get(t.id) ?? Promise.resolve();
    const job = prev.catch(() => null).then(async (): Promise<DeployResult> => {
      const state = readState(t.id);
      const src = collect(files);
      const plan = planFor(src, state, full);
      const base = { id: t.id, name: t.name, url: t.url, at: new Date().toISOString() };
      try {
        if (!src.has('index.html')) throw new Error('Nothing published yet: Publish first');
        const extra = await run(t, src, state, plan);
        const last: DeployStatus = { at: base.at, ok: true, uploaded: plan.put.length, removed: plan.remove.length, unchanged: plan.unchanged, ...extra };
        writeState(t.id, { files: plan.hashes, last, ...(state.hostKey ? { hostKey: state.hostKey } : {}) });
        return { ...base, ...last };
      } catch (e: any) {
        const last: DeployStatus = { at: base.at, ok: false, uploaded: 0, removed: 0, unchanged: 0, error: String(e?.message ?? e) };
        writeState(t.id, { ...state, last });
        return { ...base, ...last };
      }
    });
    locks.set(t.id, job);
    return job;
  }

  /** Check a target: log in, write and delete a probe file. Pins the SFTP host key of a saved target. */
  async function test(raw: any): Promise<{ ok: boolean; message: string }> {
    try {
      const stored = list().find((p) => p.id === raw?.id);
      const t = cleanTarget(raw, opts, stored);
      const state = stored && destination(stored) === destination(t) ? readState(t.id) : { files: {} };
      const remote = await connect(t, state);
      try {
        const probe = `.prepress-test-${randomBytes(4).toString('hex')}.txt`;
        await remote.write(probe, Buffer.from('Prepress connection test\n'));
        await remote.remove(probe);
        const where = await remote.where();
        if (stored && state.hostKey && !readState(t.id).hostKey) writeState(t.id, { ...readState(t.id), hostKey: state.hostKey });
        return { ok: true, message: `Connected, can write: ${where}${state.hostKey ? ` · host key ${state.hostKey}` : ''}` };
      } finally {
        await remote.close().catch(() => undefined);
      }
    } catch (e: any) {
      return { ok: false, message: String(e?.message ?? e) };
    }
  }

  return {
    list,
    view,
    save,
    test,
    /** Upload the published files to one target (by id or name), every auto target ('auto') or all ('all'). */
    async deploy(files: string[], which?: string | string[], full = false): Promise<DeployResult[]> {
      const all = list();
      const match = (w: string) => all.filter((t) => t.id === w || t.name.toLowerCase() === w.toLowerCase());
      if (Array.isArray(which)) {
        const chosen = which.flatMap(match);
        const missing = which.filter((w) => !match(w).length);
        if (missing.length) throw Object.assign(new Error(`No publish target "${missing[0]}"`), { status: 404 });
        return Promise.all([...new Set(chosen)].map((t) => deployOne(t, files, full)));
      }
      const chosen = !which || which === 'auto' ? all.filter((t) => t.auto) : which === 'all' ? all : match(which);
      if (which && which !== 'auto' && which !== 'all' && !chosen.length) throw Object.assign(new Error(`No publish target "${which}"`), { status: 404 });
      return Promise.all(chosen.map((t) => deployOne(t, files, full)));
    },
  };
}

export type Deployer = ReturnType<typeof createDeployer>;
