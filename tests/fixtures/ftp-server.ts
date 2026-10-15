// A minimal FTP server over a local folder, for tests: enough of RFC 959 + EPSV
// for basic-ftp (login, PWD/CWD/MKD, STOR, RETR, DELE, RMD). Plain FTP only.
import { createServer, type Server, type Socket } from 'node:net';
import { existsSync, mkdirSync, readFileSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';

export interface FtpServer {
  port: number;
  commands: string[];
  close(): Promise<void>;
}

export async function startFtpServer(root: string, user: string, password: string): Promise<FtpServer> {
  const commands: string[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((ctl) => {
    sockets.add(ctl);
    ctl.on('error', () => undefined); // clients may reset the connection on close
    ctl.on('close', () => sockets.delete(ctl));
    let cwd = '/';
    let loggedIn = false;
    let givenUser = '';
    let data: Promise<Socket> | null = null;
    let dataServer: Server | null = null;
    const reply = (line: string) => ctl.write(`${line}\r\n`);
    const virt = (p: string) => posix.resolve(cwd, p);
    const real = (p: string) => resolve(root, `.${virt(p)}`);

    const openPassive = () =>
      new Promise<number>((ok) => {
        dataServer?.close();
        const ds = createServer();
        dataServer = ds;
        data = new Promise((got) => ds.once('connection', (s) => got(s.on('error', () => undefined))));
        ds.listen(0, '127.0.0.1', () => ok((ds.address() as any).port));
      });
    const takeData = async () => {
      const s = await data!;
      data = null;
      dataServer?.close();
      dataServer = null;
      return s;
    };

    reply('220 test ftp');
    let buf = '';
    ctl.on('data', async (chunk) => {
      buf += chunk.toString('utf8');
      let i: number;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const sp = line.indexOf(' ');
        const cmd = (sp < 0 ? line : line.slice(0, sp)).toUpperCase();
        const arg = sp < 0 ? '' : line.slice(sp + 1);
        commands.push(cmd === 'PASS' ? 'PASS ***' : line);
        if (!loggedIn && !['USER', 'PASS', 'FEAT', 'QUIT', 'OPTS'].includes(cmd)) {
          reply('530 Not logged in');
          continue;
        }
        try {
          switch (cmd) {
            case 'USER':
              givenUser = arg;
              reply('331 Password required');
              break;
            case 'PASS':
              if (givenUser === user && arg === password) {
                loggedIn = true;
                reply('230 Logged in');
              } else reply('530 Login incorrect');
              break;
            case 'FEAT':
              reply('211-Features\r\n EPSV\r\n UTF8\r\n211 End');
              break;
            case 'OPTS':
            case 'TYPE':
            case 'STRU':
              reply('200 OK');
              break;
            case 'PWD':
              reply(`257 "${cwd}"`);
              break;
            case 'CWD':
              if (existsSync(real(arg)) && statSync(real(arg)).isDirectory()) {
                cwd = virt(arg);
                reply('250 OK');
              } else reply('550 No such directory');
              break;
            case 'MKD':
              mkdirSync(real(arg));
              reply(`257 "${virt(arg)}" created`);
              break;
            case 'RMD':
              rmdirSync(real(arg));
              reply('250 Removed');
              break;
            case 'DELE':
              if (!existsSync(real(arg))) reply('550 No such file');
              else {
                unlinkSync(real(arg));
                reply('250 Deleted');
              }
              break;
            case 'SIZE':
              if (existsSync(real(arg))) reply(`213 ${statSync(real(arg)).size}`);
              else reply('550 No such file');
              break;
            case 'EPSV':
              reply(`229 Entering Extended Passive Mode (|||${await openPassive()}|)`);
              break;
            case 'STOR': {
              const target = real(arg);
              reply('150 Ready');
              const s = await takeData();
              const parts: Buffer[] = [];
              s.on('data', (d) => parts.push(d));
              await new Promise((ok) => s.on('close', ok));
              writeFileSync(target, Buffer.concat(parts));
              reply('226 Stored');
              break;
            }
            case 'RETR': {
              if (!existsSync(real(arg)) || !statSync(real(arg)).isFile()) {
                dataServer?.close();
                data = null;
                reply('550 No such file');
                break;
              }
              reply('150 Sending');
              const s = await takeData();
              s.end(readFileSync(real(arg)));
              await new Promise((ok) => s.on('close', ok));
              reply('226 Sent');
              break;
            }
            case 'QUIT':
              reply('221 Bye');
              ctl.end();
              break;
            default:
              reply('502 Not implemented');
          }
        } catch {
          reply('550 Failed');
        }
      }
    });
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  return {
    port: (server.address() as any).port,
    commands,
    close: () =>
      new Promise((ok) => {
        for (const s of sockets) s.destroy();
        server.close(() => ok());
      }),
  };
}
