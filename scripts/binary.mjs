// Compiles the Prepress server + built admin app + headless engine into standalone executables with Bun.
//   node scripts/binary.mjs          → bin/prepress (this machine)
//   node scripts/binary.mjs --all    → bin/prepress-<os>-<arch>[.exe] for every target
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

for (const f of ['dist/index.html', 'dist/engine/engine.js']) {
  if (!existsSync(f)) {
    console.error(`${f} is missing: run \`npm run build\` first.`);
    process.exit(1);
  }
}
const TARGETS = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'windows-x64'];
const all = process.argv.includes('--all');
const jobs = all ? TARGETS.map((t) => ({ target: `bun-${t}`, out: `bin/prepress-${t}${t.startsWith('windows') ? '.exe' : ''}` })) : [{ target: null, out: 'bin/prepress' }];
for (const { target, out } of jobs) {
  execFileSync('npx', ['bun', 'scripts/compile.ts', out, ...(target ? [target] : [])], { stdio: 'inherit' });
}
