/**
 * FTP / FTPS (explicit TLS) with basic-ftp. Shared hosting often offers only
 * this. Plain ftp:// sends the password unencrypted; the editor says so.
 */
import { PassThrough, Readable } from 'node:stream';
import { Client } from 'basic-ftp';
import type { DeployTarget } from '../deploy.ts';
import { posixDir, type Remote } from './remote.ts';

const posixJoin = (a: string, b: string) => (a.endsWith('/') ? a + b : `${a}/${b}`);

function explain(e: any, t: DeployTarget): Error {
  const msg = String(e?.message ?? e);
  if (e?.code === 530) return new Error('Login failed: wrong user name or password');
  if (e?.code === 'ENOTFOUND') return new Error(`Host not found: ${t.host}`);
  if (e?.code === 'ECONNREFUSED') return new Error(`Connection refused by ${t.host}:${t.port ?? 21}`);
  if (/AUTH TLS|TLS not available|534|502/i.test(msg) && t.secure) return new Error(`${msg} — the server may not support FTPS; ask your host, or use sftp://`);
  return new Error(msg);
}

export async function connectFtp(t: DeployTarget): Promise<Remote> {
  const c = new Client(30_000);
  try {
    await c.access({ host: t.host!, port: t.port ?? 21, user: t.user || 'anonymous', password: t.password ?? '', secure: !!t.secure, secureOptions: { servername: t.host } });
  } catch (e) {
    c.close();
    throw explain(e, t);
  }
  let root: string;
  try {
    const home = await c.pwd();
    root = t.path.startsWith('/') ? t.path : t.path === '.' ? home : posixJoin(home, t.path);
    root = root.replace(/\/+$/, '') || '/';
    await c.ensureDir(root);
  } catch (e) {
    c.close();
    throw explain(e, t);
  }
  const full = (rel: string) => posixJoin(root, rel);
  const made = new Set<string>([root]);

  // basic-ftp runs one command at a time; deploys are sequential anyway.
  return {
    async read(rel) {
      const chunks: Buffer[] = [];
      const sink = new PassThrough();
      sink.on('data', (d: Buffer) => chunks.push(d));
      try {
        await c.downloadTo(sink, full(rel));
        return Buffer.concat(chunks);
      } catch (e: any) {
        if (e?.code === 550) return null; // no such file
        throw explain(e, t);
      }
    },
    async write(rel, data) {
      const dir = posixDir(full(rel));
      try {
        if (!made.has(dir)) {
          await c.ensureDir(dir);
          made.add(dir);
        }
        await c.uploadFrom(Readable.from([data]), full(rel));
      } catch (e) {
        throw explain(e, t);
      }
    },
    async remove(rel) {
      await c.remove(full(rel), true);
    },
    async removeDir(rel) {
      if (rel) await c.send(`RMD ${full(rel)}`).catch(() => undefined);
    },
    async where() {
      return `${t.secure ? 'ftps' : 'ftp'}://${t.user ? `${t.user}@` : ''}${t.host}${root}`;
    },
    async close() {
      c.close();
    },
  };
}
