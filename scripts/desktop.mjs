// Builds the desktop app (desktop/, Tauri) around the Prepress server binary.
//   node scripts/desktop.mjs build   → desktop/src-tauri/target/release/bundle/ (.app + .dmg on macOS, .msi/.exe on Windows, .deb/.AppImage on Linux)
//   node scripts/desktop.mjs dev     → run it without bundling
// Needs bin/prepress (npm run build:bin) and Rust + the Tauri CLI (cargo install tauri-cli --version "^2").
// Builds for this machine only: Tauri apps are built on the OS they target.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, chmodSync, existsSync, mkdirSync } from 'node:fs';

const mode = process.argv[2] === 'dev' ? 'dev' : 'build';
const exe = process.platform === 'win32' ? '.exe' : '';
const server = `bin/prepress${exe}`;
if (!existsSync(server)) {
  console.error(`${server} is missing: run \`npm run build:bin\` first.`);
  process.exit(1);
}
const triple = execFileSync('rustc', ['-vV'], { encoding: 'utf8' }).match(/^host: (.+)$/m)?.[1];
if (!triple) {
  console.error('Rust is not installed (rustc not found): https://rustup.rs');
  process.exit(1);
}
// Tauri sidecars are named <name>-<target triple>; the bundle ships it as plain `prepress`.
mkdirSync('desktop/src-tauri/binaries', { recursive: true });
const sidecar = `desktop/src-tauri/binaries/prepress-${triple}${exe}`;
copyFileSync(server, sidecar);
chmodSync(sidecar, 0o755);

const r = spawnSync('cargo', ['tauri', mode, ...process.argv.slice(3)], { cwd: 'desktop/src-tauri', stdio: 'inherit' });
process.exit(r.status ?? 1);
