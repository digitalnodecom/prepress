/**
 * Deploy targets: copy the published static site (the staging folder that
 * Publish writes) to where it is served. Prepress keeps running for editing;
 * deploys push flat HTML elsewhere.
 *
 *   folder  another directory on this machine (e.g. /var/www/example.com)
 *   sftp    a remote server over SSH/SFTP (OpenSSH `sftp`, the user's SSH keys / agent)
 *
 * Like Publish, a deploy only ever removes files it uploaded itself (tracked
 * per target in <data>/deploys/<id>.json with content hashes, so unchanged
 * files are skipped). A file it would overwrite that it didn't write is backed
 * up to <data>/backup/<target>-<time>/ first.
 *
 * Config lives in <data>/deploy.json (private data dir, never published).
 */
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';

export type TargetType = 'folder' | 'sftp';

export interface DeployTarget {
  id: string;
  name: string;
  type: TargetType;
  /** folder: absolute local path. sftp: remote directory (absolute, or relative to the login dir). */
  path: string;
  host?: string;
  user?: string;
  port?: number;
  /** Private key file; default: ssh-agent / ~/.ssh config and default keys. */
  identityFile?: string;
  /** Public URL served from this target, for "View site" links. */
  url?: string;
  /** Deploy automatically after every Publish. */
  auto: boolean;
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
}

export interface DeployResult extends DeployStatus {
  id: string;
  name: string;
  url?: string;
}

const NAME = /^[^\u0000-\u001f]{1,60}$/;
const HOST = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,252}$|^\[[0-9A-Fa-f:.]+\]$/;
const USER = /^[A-Za-z0-9_][A-Za-z0-9_.@-]{0,63}$/;
const SAFE_REL = /^(?:[a-z0-9][a-z0-9-]*\/)?[A-Za-z0-9][A-Za-z0-9._-]*$|^uploads\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

const inside = (child: string, parent: string) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

function writeAtomic(file: string, data: string | Buffer) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, file);
}

const expandHome = (p: string) => (p === '~' || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p);

/** Validate a target from the editor. Throws a readable message. */
export function cleanTarget(raw: any, guard: { dataDir: string; outDir: string }): DeployTarget {
  if (!raw || typeof raw !== 'object') throw new Error('Expected a target object');
  const type: TargetType = raw.type === 'sftp' ? 'sftp' : raw.type === 'folder' ? 'folder' : (() => { throw new Error('type must be "folder" or "sftp"'); })();
  const name = String(raw.name ?? '').trim() || (type === 'folder' ? 'Local folder' : 'Remote server');
  if (!NAME.test(name)) throw new Error('Name is too long or has control characters');
  let path = String(raw.path ?? '').trim();
  if (!path || /[\u0000-\u001f"\\]/.test(path)) throw new Error('Path is empty or contains quotes, backslashes or control characters');
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
  if (type === 'folder') {
    path = resolve(expandHome(path));
    const data = resolve(guard.dataDir);
    const out = resolve(guard.outDir);
    if (inside(data, path) || inside(path, data)) throw new Error('The folder must not contain, or be inside, the private data folder');
    if (inside(out, path) || inside(path, out)) throw new Error('The folder must not overlap the publish folder (--out); deploy copies from it');
    if (path === resolve(homedir()) || path === sep) throw new Error('Pick a dedicated folder, not your home or the root folder');
    t.path = path;
  } else {
    const host = String(raw.host ?? '').trim();
    if (!HOST.test(host)) throw new Error('Host must be a hostname, IP or ~/.ssh/config alias');
    t.host = host;
    if (raw.user) {
      const user = String(raw.user).trim();
      if (!USER.test(user)) throw new Error('Bad user name');
      t.user = user;
    }
    if (raw.port !== undefined && raw.port !== '' && raw.port !== null) {
      const port = Number(raw.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be 1–65535');
      t.port = port;
    }
    if (raw.identityFile) {
      const f = resolve(expandHome(String(raw.identityFile).trim()));
      if (!existsSync(f)) throw new Error(`Key file not found: ${f}`);
      t.identityFile = f;
    }
    // sftp paths are relative to the login folder; "~/x" means the same.
    path = path.replace(/^~\/?/, '') || '.';
    if (path === '/') throw new Error('Pick the site folder, not /');
    t.path = path;
  }
  return t;
}

/** Targets hold no secrets (SSH keys stay in ~/.ssh or the agent), so the UI can show them as-is. */
export function createDeployer(opts: { dataDir: string; outDir: string; sftpBin?: string }) {
  const configFile = join(opts.dataDir, 'deploy.json');
  const stateDir = join(opts.dataDir, 'deploys');
  const locks = new Map<string, Promise<unknown>>();

  const list = (): DeployTarget[] => {
    try {
      const j = JSON.parse(readFileSync(configFile, 'utf8'));
      return Array.isArray(j.targets) ? j.targets : [];
    } catch {
      return [];
    }
  };

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

  function save(raw: any[]): DeployTarget[] {
    if (!Array.isArray(raw)) throw new Error('Expected a list of targets');
    if (raw.length > 20) throw new Error('At most 20 targets');
    const targets = raw.map((t) => cleanTarget(t, opts));
    const prev = list();
    // A target whose destination changed starts from scratch: its old manifest describes another place.
    for (const t of targets) {
      const old = prev.find((p) => p.id === t.id);
      if (old && (old.type !== t.type || old.path !== t.path || old.host !== t.host || old.user !== t.user || old.port !== t.port)) rmSync(join(stateDir, `${t.id}.json`), { force: true });
    }
    for (const p of prev) if (!targets.some((t) => t.id === p.id)) rmSync(join(stateDir, `${p.id}.json`), { force: true });
    writeAtomic(configFile, JSON.stringify({ targets }, null, 2));
    return targets;
  }

  const view = () => list().map((t) => ({ ...t, last: readState(t.id).last ?? null }));

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

  /** Pages before uploads would make pages link to missing media mid-deploy; upload media first, pages last, 404 + home at the very end. */
  const order = (rels: string[]) =>
    [...rels].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const rank = (r: string) => (r.startsWith('uploads/') ? 0 : r === 'index.html' ? 3 : r === '404.html' ? 2 : 1);

  async function deployFolder(t: DeployTarget, src: Map<string, Buffer>, state: TargetState, plan: Plan): Promise<Partial<DeployStatus>> {
    const root = t.path;
    mkdirSync(root, { recursive: true });
    const backupDir = join(opts.dataDir, 'backup', `${t.id}-${stamp()}`);
    let backedUp = false;
    for (const rel of plan.put) {
      const target = join(root, rel);
      if (!state.files[rel] && existsSync(target) && statSync(target).isFile()) {
        const b = join(backupDir, rel);
        mkdirSync(dirname(b), { recursive: true });
        copyFileSync(target, b);
        backedUp = true;
      }
      mkdirSync(dirname(target), { recursive: true });
      writeAtomic(target, src.get(rel)!);
    }
    for (const rel of plan.remove) {
      const target = join(root, rel);
      if (existsSync(target)) rmSync(target);
      const parent = dirname(target);
      if (parent !== root && existsSync(parent) && readdirSync(parent).length === 0) rmdirSync(parent);
    }
    return backedUp ? { backup: backupDir } : {};
  }

  /** sftp batch file quoting: double quotes, backslash-escaped. */
  const q = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const remote = (t: DeployTarget, rel = '') => {
    const base = t.path.replace(/\/+$/, '') || '.';
    return rel ? `${base}/${rel}` : base;
  };

  function sftpArgs(t: DeployTarget, batch: string): string[] {
    const args = ['-b', batch, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=15'];
    if (t.port) args.push('-P', String(t.port));
    if (t.identityFile) args.push('-i', t.identityFile);
    args.push(t.user ? `${t.user}@${t.host}` : t.host!);
    return args;
  }

  function runSftp(t: DeployTarget, lines: string[]): Promise<string> {
    const tmp = join(opts.dataDir, `.sftp-${randomBytes(4).toString('hex')}.batch`);
    writeFileSync(tmp, lines.join('\n') + '\n', { mode: 0o600 });
    return new Promise((ok, fail) => {
      const p = spawn(opts.sftpBin ?? 'sftp', sftpArgs(t, tmp), { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      p.stdout.on('data', (d) => (out += d));
      p.stderr.on('data', (d) => (err += d));
      const timer = setTimeout(() => p.kill(), 10 * 60 * 1000);
      p.on('error', (e: any) => {
        clearTimeout(timer);
        rmSync(tmp, { force: true });
        fail(new Error(e?.code === 'ENOENT' ? 'The sftp command was not found. Install OpenSSH client.' : String(e?.message ?? e)));
      });
      p.on('close', (code) => {
        clearTimeout(timer);
        rmSync(tmp, { force: true });
        if (code === 0) return ok(out);
        const msg = err.trim().split('\n').filter((l) => !/^sftp>|^Connected to/.test(l)).slice(-3).join(' ') || `sftp exited with code ${code}`;
        fail(new Error(/Permission denied|publickey/i.test(msg) ? `${msg} — add this machine's SSH key to the server (ssh-copy-id) or set a key file` : msg));
      });
    });
  }

  async function deploySftp(t: DeployTarget, src: Map<string, Buffer>, state: TargetState, plan: Plan): Promise<Partial<DeployStatus>> {
    // Stage exact bytes in a private temp dir, so what is uploaded is what was hashed.
    const stage = join(opts.dataDir, `.deploy-${t.id}-${randomBytes(4).toString('hex')}`);
    const backupDir = join(opts.dataDir, 'backup', `${t.id}-${stamp()}`);
    const lines: string[] = [];
    const dirs = new Set<string>();
    try {
      // Every directory we may write into, parents first. "-" = ignore errors (already exists).
      const base = remote(t);
      const parts = base.split('/');
      for (let i = 1; i <= parts.length; i++) {
        const d = parts.slice(0, i).join('/');
        if (d && d !== '.' && d !== '~') dirs.add(d);
      }
      for (const rel of plan.put) if (rel.includes('/')) dirs.add(remote(t, dirname(rel)));
      for (const d of dirs) lines.push(`-mkdir ${q(d)}`);
      let backups = 0;
      for (const rel of plan.put) {
        const local = join(stage, rel);
        mkdirSync(dirname(local), { recursive: true });
        writeFileSync(local, src.get(rel)!);
        if (!state.files[rel]) {
          // First upload of this path: fetch what's there (if anything) before overwriting it.
          const b = join(backupDir, rel);
          mkdirSync(dirname(b), { recursive: true });
          lines.push(`-get ${q(remote(t, rel))} ${q(b)}`);
          backups++;
        }
        lines.push(`put ${q(local)} ${q(remote(t, rel))}`);
      }
      for (const rel of plan.remove) lines.push(`-rm ${q(remote(t, rel))}`);
      for (const d of new Set(plan.remove.filter((r) => r.includes('/')).map((r) => remote(t, dirname(r))))) lines.push(`-rmdir ${q(d)}`);
      if (!lines.some((l) => !l.startsWith('-mkdir'))) lines.push('pwd');
      await runSftp(t, lines);
      // Keep only backups that actually downloaded something.
      let kept = false;
      if (backups && existsSync(backupDir)) {
        const prune = (d: string): boolean => {
          let any = false;
          for (const f of readdirSync(d)) {
            const p = join(d, f);
            if (statSync(p).isDirectory()) any = prune(p) || any;
            else any = true;
          }
          if (!any) rmdirSync(d);
          return any;
        };
        kept = prune(backupDir);
      }
      return kept ? { backup: backupDir } : {};
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  }

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

  async function deployOne(t: DeployTarget, files: string[], full = false): Promise<DeployResult> {
    const prev = locks.get(t.id) ?? Promise.resolve();
    const run = prev.catch(() => null).then(async (): Promise<DeployResult> => {
      const state = readState(t.id);
      const src = collect(files);
      const plan = planFor(src, state, full);
      const base = { id: t.id, name: t.name, url: t.url, at: new Date().toISOString() };
      try {
        if (!src.has('index.html')) throw new Error('Nothing published yet: Publish first');
        const extra = t.type === 'folder' ? await deployFolder(t, src, state, plan) : await deploySftp(t, src, state, plan);
        const last: DeployStatus = { at: base.at, ok: true, uploaded: plan.put.length, removed: plan.remove.length, unchanged: plan.unchanged, ...extra };
        writeState(t.id, { files: plan.hashes, last });
        return { ...base, ...last };
      } catch (e: any) {
        const last: DeployStatus = { at: base.at, ok: false, uploaded: 0, removed: 0, unchanged: 0, error: String(e?.message ?? e) };
        writeState(t.id, { ...state, last });
        return { ...base, ...last };
      }
    });
    locks.set(t.id, run);
    return run;
  }

  /** Check a target is reachable and writable, without deploying. */
  async function test(raw: any): Promise<{ ok: boolean; message: string }> {
    try {
      const t = cleanTarget(raw, opts);
      if (t.type === 'folder') {
        mkdirSync(t.path, { recursive: true });
        const probe = join(t.path, `.prepress-${randomBytes(4).toString('hex')}`);
        writeFileSync(probe, '');
        rmSync(probe);
        return { ok: true, message: `Can write to ${t.path}` };
      }
      const out = await runSftp(t, [`-mkdir ${q(remote(t))}`, `cd ${q(remote(t))}`, 'pwd']);
      const dir = out.match(/Remote working directory: (.*)/)?.[1]?.trim();
      return { ok: true, message: `Connected${dir ? `: ${dir}` : ''}` };
    } catch (e: any) {
      return { ok: false, message: String(e?.message ?? e) };
    }
  }

  return {
    list,
    view,
    save,
    test,
    /** Deploy the published files to one target (by id or name), or every auto target. */
    async deploy(files: string[], which?: string | 'auto', full = false): Promise<DeployResult[]> {
      const all = list();
      const chosen = !which || which === 'auto' ? all.filter((t) => t.auto) : which === 'all' ? all : all.filter((t) => t.id === which || t.name.toLowerCase() === which.toLowerCase());
      if (which && which !== 'auto' && which !== 'all' && !chosen.length) throw Object.assign(new Error(`No deploy target "${which}"`), { status: 404 });
      return Promise.all(chosen.map((t) => deployOne(t, files, full)));
    },
  };
}

export type Deployer = ReturnType<typeof createDeployer>;
