/**
 * SFTP over SSH (ssh2, pure JS — no system `sftp` needed, works the same on
 * macOS, Linux and Windows). Authentication, in order: password (if given,
 * also as keyboard-interactive), ssh-agent, then the key file (or the default
 * ~/.ssh keys). Host keys are trusted on first use and pinned per target.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import ssh2, { type SFTPWrapper } from 'ssh2';
import type { DeployTarget } from '../deploy.ts';
import { joinRemote, posixDir, type Remote } from './remote.ts';

export interface HostKeyPin {
  /** Pinned fingerprint ("SHA256:…"), if this target connected before. */
  expected?: string;
  /** Called with the fingerprint seen on a first connection. */
  seen?(fingerprint: string): void;
}

// ssh2 is CommonJS: named imports don't work under Node's ESM loader.
const { Client, utils } = ssh2;

const NO_SUCH_FILE = 2;

const fingerprint = (key: Buffer) => `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}`;

function keyFiles(t: DeployTarget): Buffer[] {
  const files = t.identityFile ? [t.identityFile] : ['id_ed25519', 'id_ecdsa', 'id_rsa'].map((f) => join(homedir(), '.ssh', f)).filter(existsSync);
  const keys: Buffer[] = [];
  for (const f of files) {
    const buf = readFileSync(f);
    const parsed = utils.parseKey(buf);
    if (parsed instanceof Error) {
      // Passphrase-protected keys can't be used without a prompt; the agent can hold them unlocked.
      if (t.identityFile) throw new Error(`Can't use ${f}: ${/passphrase|encrypted/i.test(parsed.message) ? 'it has a passphrase. Add it to ssh-agent (ssh-add) instead' : parsed.message}`);
      continue;
    }
    keys.push(buf);
  }
  return keys;
}

function authMethods(t: DeployTarget): any[] {
  const username = t.user || userInfo().username;
  const methods: any[] = [];
  if (t.password) {
    methods.push({ type: 'password', username, password: t.password });
    methods.push({ type: 'keyboard-interactive', username, prompt: (_n: string, _i: string, _l: string, prompts: unknown[], finish: (a: string[]) => void) => finish(prompts.map(() => t.password!)) });
  }
  const agent = process.env.SSH_AUTH_SOCK || (process.platform === 'win32' ? 'pageant' : '');
  if (agent && !t.password) methods.push({ type: 'agent', username, agent });
  for (const key of t.password ? [] : keyFiles(t)) methods.push({ type: 'publickey', username, key });
  if (!methods.length) throw new Error('No way to log in: add a password to the connection, start ssh-agent, or set ?key=<private key file>');
  return methods;
}

const call = <T,>(fn: (cb: (err: any, v?: T) => void) => void) => new Promise<T>((ok, fail) => fn((err, v) => (err ? fail(err) : ok(v as T))));

function explain(e: any, t: DeployTarget): Error {
  const msg = String(e?.message ?? e);
  if (/All configured authentication methods failed/i.test(msg)) return new Error(t.password ? 'Login failed: wrong user name or password' : 'Login failed: the server did not accept your SSH keys. Add a password to the connection, or add your key on the server (ssh-copy-id).');
  if (e?.code === 'ENOTFOUND') return new Error(`Host not found: ${t.host}`);
  if (e?.code === 'ECONNREFUSED') return new Error(`Connection refused by ${t.host}:${t.port ?? 22}`);
  if (/Timed out/i.test(msg) || e?.code === 'ETIMEDOUT') return new Error(`No answer from ${t.host}:${t.port ?? 22}`);
  if (e?.code === NO_SUCH_FILE) return new Error(`No such file or folder on the server (${msg})`);
  return new Error(msg);
}

export async function connectSftp(t: DeployTarget, pin: HostKeyPin = {}): Promise<Remote> {
  const conn = new Client();
  let hostKeyError: Error | null = null;
  await new Promise<void>((ok, fail) => {
    conn
      .on('ready', ok)
      .on('error', (e) => fail(hostKeyError ?? explain(e, t)))
      .connect({
        host: t.host!.replace(/^\[|\]$/g, ''),
        port: t.port ?? 22,
        username: t.user || userInfo().username,
        readyTimeout: 20_000,
        keepaliveInterval: 15_000,
        authHandler: authMethods(t),
        hostVerifier: (key: Buffer) => {
          const fp = fingerprint(key);
          if (pin.expected && pin.expected !== fp) {
            hostKeyError = new Error(`The server's host key changed (expected ${pin.expected}, got ${fp}). If the server was reinstalled, edit and save this target to trust the new key.`);
            return false;
          }
          if (!pin.expected) pin.seen?.(fp);
          return true;
        },
      } as any);
  });

  let sftp: SFTPWrapper;
  try {
    sftp = await call<SFTPWrapper>((cb) => conn.sftp(cb));
  } catch (e) {
    conn.end();
    throw explain(e, t);
  }

  const base = t.path.replace(/\/+$/, '') || '/';
  const full = (rel: string) => joinRemote(base, rel);
  const made = new Set<string>();

  async function mkdirp(dir: string) {
    if (!dir || dir === '.' || dir === '/' || made.has(dir)) return;
    try {
      const st = await call<any>((cb) => sftp.stat(dir, cb));
      if (!st.isDirectory()) throw new Error(`${dir} exists on the server and is not a folder`);
    } catch (e: any) {
      if (e?.code !== NO_SUCH_FILE) throw explain(e, t);
      await mkdirp(posixDir(dir));
      await call((cb) => sftp.mkdir(dir, cb)).catch(async (err) => {
        // Created meanwhile? Fine.
        await call((cb) => sftp.stat(dir, cb)).catch(() => {
          throw explain(err, t);
        });
      });
    }
    made.add(dir);
  }

  return {
    async read(rel) {
      try {
        return await call<Buffer>((cb) => sftp.readFile(full(rel), cb));
      } catch (e: any) {
        if (e?.code === NO_SUCH_FILE) return null;
        throw explain(e, t);
      }
    },
    async write(rel, data) {
      const target = full(rel);
      await mkdirp(posixDir(target));
      // Upload under a temporary name, then swap it in: visitors never get half a page.
      const tmp = `${target}.prepress-tmp`;
      try {
        await call((cb) => sftp.writeFile(tmp, data, cb));
        try {
          await call((cb) => sftp.ext_openssh_rename(tmp, target, cb));
        } catch {
          await call((cb) => sftp.unlink(target, cb)).catch(() => undefined);
          await call((cb) => sftp.rename(tmp, target, cb));
        }
      } catch (e) {
        await call((cb) => sftp.unlink(tmp, cb)).catch(() => undefined);
        throw explain(e, t);
      }
    },
    async remove(rel) {
      await call((cb) => sftp.unlink(full(rel), cb)).catch((e: any) => {
        if (e?.code !== NO_SUCH_FILE) throw explain(e, t);
      });
    },
    async removeDir(rel) {
      if (rel) await call((cb) => sftp.rmdir(full(rel), cb)).catch(() => undefined);
    },
    async where() {
      await mkdirp(base === '/' ? '' : base);
      const real = await call<string>((cb) => sftp.realpath(base === '/' ? '/' : base, cb)).catch(() => base);
      return `${t.user ? `${t.user}@` : ''}${t.host}:${real}`;
    },
    async close() {
      sftp.end();
      conn.end();
    },
  };
}
