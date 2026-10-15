// A small in-process SFTP server (ssh2's own Server) over a local folder, for tests.
// Password login; the folder is the user's home. Only what Prepress uses is implemented.
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readSync, readdirSync, renameSync, rmdirSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import ssh2 from 'ssh2';

const { Server, utils } = ssh2;
const { STATUS_CODE, OPEN_MODE } = (utils as any).sftp;

export interface SftpServer {
  port: number;
  close(): Promise<void>;
}

export async function startSftpServer(root: string, user: string, password: string, hostKey = utils.generateKeyPairSync('ed25519').private): Promise<SftpServer> {
  const real = (p: string) => {
    const r = resolve(root, `.${p.startsWith('/') ? p : `/${p}`}`);
    if (!r.startsWith(resolve(root))) throw new Error('outside root');
    return r;
  };
  const server = new Server({ hostKeys: [hostKey] }, (client: any) => {
    client
      .on('authentication', (ctx: any) => (ctx.method === 'password' && ctx.username === user && ctx.password === password ? ctx.accept() : ctx.reject(['password'])))
      .on('error', () => undefined)
      .on('ready', () => {
        client.on('session', (accept: any) => {
          accept().on('sftp', (acc: any) => {
            const sftp = acc();
            const handles = new Map<string, { fd: number }>();
            let next = 0;
            const status = (id: number, code: number) => sftp.status(id, code);
            const guard = (id: number, fn: () => void) => {
              try {
                fn();
              } catch (e: any) {
                status(id, e?.code === 'ENOENT' ? STATUS_CODE.NO_SUCH_FILE : STATUS_CODE.FAILURE);
              }
            };
            const attrs = (s: { mode: number; size: number; atimeMs: number; mtimeMs: number }) => ({ mode: s.mode, uid: 0, gid: 0, size: s.size, atime: Math.floor(s.atimeMs / 1000), mtime: Math.floor(s.mtimeMs / 1000) });
            sftp
              .on('REALPATH', (id: number, p: string) => guard(id, () => {
                const abs = real(p).slice(resolve(root).length) || '/';
                sftp.name(id, [{ filename: abs, longname: abs, attrs: {} }]);
              }))
              .on('STAT', (id: number, p: string) => guard(id, () => sftp.attrs(id, attrs(statSync(real(p))))))
              .on('LSTAT', (id: number, p: string) => guard(id, () => sftp.attrs(id, attrs(statSync(real(p))))))
              .on('MKDIR', (id: number, p: string) => guard(id, () => {
                if (existsSync(real(p))) return status(id, STATUS_CODE.FAILURE);
                mkdirSync(real(p));
                status(id, STATUS_CODE.OK);
              }))
              .on('RMDIR', (id: number, p: string) => guard(id, () => {
                if (readdirSync(real(p)).length) return status(id, STATUS_CODE.FAILURE);
                rmdirSync(real(p));
                status(id, STATUS_CODE.OK);
              }))
              .on('REMOVE', (id: number, p: string) => guard(id, () => {
                unlinkSync(real(p));
                status(id, STATUS_CODE.OK);
              }))
              .on('RENAME', (id: number, from: string, to: string) => guard(id, () => {
                if (existsSync(real(to))) return status(id, STATUS_CODE.FAILURE); // like OpenSSH without posix-rename
                renameSync(real(from), real(to));
                status(id, STATUS_CODE.OK);
              }))
              .on('OPEN', (id: number, p: string, flags: number) => guard(id, () => {
                const mode = flags & OPEN_MODE.WRITE ? 'w' : 'r';
                const fd = openSync(real(p), mode);
                const h = Buffer.from(String(next++));
                handles.set(h.toString(), { fd });
                sftp.handle(id, h);
              }))
              .on('FSTAT', (id: number, h: Buffer) => guard(id, () => sftp.attrs(id, attrs(fstatSync(handles.get(h.toString())!.fd)))))
              .on('READ', (id: number, h: Buffer, offset: number, length: number) => guard(id, () => {
                const { fd } = handles.get(h.toString())!;
                const buf = Buffer.alloc(length);
                const n = readSync(fd, buf, 0, length, offset);
                if (!n) return status(id, STATUS_CODE.EOF);
                sftp.data(id, buf.subarray(0, n));
              }))
              .on('WRITE', (id: number, h: Buffer, offset: number, data: Buffer) => guard(id, () => {
                writeSync(handles.get(h.toString())!.fd, data, 0, data.length, offset);
                status(id, STATUS_CODE.OK);
              }))
              .on('CLOSE', (id: number, h: Buffer) => guard(id, () => {
                const e = handles.get(h.toString());
                if (e) closeSync(e.fd);
                handles.delete(h.toString());
                status(id, STATUS_CODE.OK);
              }));
          });
        });
      });
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  return {
    port: (server.address() as AddressInfo).port,
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}

export const newHostKey = () => utils.generateKeyPairSync('ed25519').private;
export const fileIn = (root: string, rel: string) => join(root, rel);
