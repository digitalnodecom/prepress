#!/usr/bin/env node
// Stand-in for OpenSSH `sftp -b <batch> … host` used by tests/deploy.test.ts.
// Runs the batch against a local folder (FAKE_SFTP_ROOT) with sftp's semantics:
// a leading "-" ignores a failing command, anything else aborts with exit 1.
import { copyFileSync, mkdirSync, readFileSync, rmdirSync, rmSync, statSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const batch = args[args.indexOf('-b') + 1];
const host = args[args.length - 1];
const root = process.env.FAKE_SFTP_ROOT;
if (process.env.FAKE_SFTP_LOG) appendFileSync(process.env.FAKE_SFTP_LOG, JSON.stringify(args) + '\n');
if (host.includes('denied')) {
  console.error('user@denied: Permission denied (publickey).');
  process.exit(255);
}
const unq = (s) => JSON.parse(s);
const remote = (p) => join(root, p.replace(/^\/+/, ''));
for (const raw of readFileSync(batch, 'utf8').split('\n').filter(Boolean)) {
  const soft = raw.startsWith('-');
  const line = soft ? raw.slice(1) : raw;
  const [cmd] = line.split(' ', 1);
  const argv = [...line.slice(cmd.length).matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) => unq(`"${m[1]}"`));
  try {
    if (cmd === 'mkdir') mkdirSync(remote(argv[0]));
    else if (cmd === 'put') copyFileSync(argv[0], remote(argv[1]));
    else if (cmd === 'get') copyFileSync(remote(argv[0]), argv[1]);
    else if (cmd === 'rm') rmSync(remote(argv[0]));
    else if (cmd === 'rmdir') rmdirSync(remote(argv[0]));
    else if (cmd === 'cd') statSync(remote(argv[0]));
    else if (cmd === 'pwd') console.log(`Remote working directory: ${root}`);
    else throw new Error(`unknown command ${cmd}`);
  } catch (e) {
    if (!soft) {
      console.error(`${line}: ${e.message}`);
      process.exit(1);
    }
  }
}
