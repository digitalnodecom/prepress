/** A folder on this computer (e.g. a local web server's document root, or a synced folder). */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DeployTarget } from '../deploy.ts';
import type { Remote } from './remote.ts';

export async function connectFolder(t: DeployTarget): Promise<Remote> {
  const root = t.path;
  mkdirSync(root, { recursive: true });
  return {
    async read(rel) {
      const f = join(root, rel);
      return existsSync(f) && statSync(f).isFile() ? readFileSync(f) : null;
    },
    async write(rel, data) {
      const f = join(root, rel);
      mkdirSync(dirname(f), { recursive: true });
      const tmp = `${f}.${process.pid}.tmp`;
      writeFileSync(tmp, data);
      renameSync(tmp, f);
    },
    async remove(rel) {
      rmSync(join(root, rel), { force: true });
    },
    async removeDir(rel) {
      const d = join(root, rel);
      if (rel && existsSync(d) && readdirSync(d).length === 0) rmdirSync(d);
    },
    async where() {
      return root;
    },
    async close() {},
  };
}
