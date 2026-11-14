// Builds the desktop app (desktop/, Tauri) around the Prepress server binary.
//   node scripts/desktop.mjs build   → desktop/src-tauri/target/release/bundle/ (.app + .dmg on macOS, .msi/.exe on Windows, .deb/.AppImage on Linux)
//   node scripts/desktop.mjs dev     → run it without bundling
// Needs bin/prepress (npm run build:bin) and Rust + the Tauri CLI (cargo install tauri-cli --version "^2").
// Builds for this machine only: Tauri apps are built on the OS they target.
//
// macOS release (so downloads open without "is damaged"):
//   APPLE_SIGNING_IDENTITY="Developer ID Application: …"  → Tauri signs the app and the server
//     sidecar with the hardened runtime + desktop/src-tauri/Entitlements.plist
//   PREPRESS_NOTARY_PROFILE=<name>  → the .dmg is notarized and stapled afterwards. Create the
//     profile once: xcrun notarytool store-credentials <name> --apple-id … --team-id …
//
// Auto-update: the build also makes the updater bundle (macOS: Prepress.app.tar.gz; Windows: the
// NSIS installer; + .sig, minisign), signed with the key in ~/.config/prepress/updater.key (or
// TAURI_SIGNING_PRIVATE_KEY), and stages the release files in target/release/publish/ (see
// stage()). Without the key the updater bundle is skipped. The app checks
// plugins.updater.endpoints in tauri.conf.json; `npx bun scripts/release-desktop.ts` uploads.
// Windows: `npm run build:desktop -- --bundles nsis` (the .msi isn't published).
// The public key in tauri.conf.json must match: losing the private key means installed apps
// can't update any more (they need a manual download of a build with a new key).
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

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

const keyFile = `${homedir()}/.config/prepress/updater.key`;
const env = { ...process.env };
if (!env.TAURI_SIGNING_PRIVATE_KEY && existsSync(keyFile)) env.TAURI_SIGNING_PRIVATE_KEY = keyFile;
env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??= '';
const updater = mode === 'build' && !!env.TAURI_SIGNING_PRIVATE_KEY;
const extra = updater || mode !== 'build' ? [] : ['--config', JSON.stringify({ bundle: { createUpdaterArtifacts: false } })];
if (mode === 'build' && !updater) console.warn(`No updater key (${keyFile}): building without the auto-update bundle.`);
const r = spawnSync('cargo', ['tauri', mode, ...extra, ...process.argv.slice(3)], { cwd: 'desktop/src-tauri', stdio: 'inherit', env });
if (r.status !== 0 || mode !== 'build') process.exit(r.status ?? 1);

const run = (cmd, args) => {
  const x = spawnSync(cmd, args, { stdio: 'inherit' });
  if (x.status !== 0) process.exit(x.status ?? 1);
};
const bundle = 'desktop/src-tauri/target/release/bundle';
const version = JSON.parse(readFileSync('desktop/src-tauri/tauri.conf.json', 'utf8')).version;
const arch = triple.startsWith('aarch64') ? 'aarch64' : 'x86_64';
const releaseUrl = (name) => `https://github.com/digitalnodecom/prepress/releases/download/v${version}/${name}`;

/**
 * The files of this platform's release, under their published names, in
 * desktop/src-tauri/target/release/publish/, plus latest-<platform>.json: this platform's part
 * of the updater's latest.json. scripts/release-desktop.ts merges the parts of every platform
 * built (CI builds macOS and Windows) into one latest.json and uploads everything.
 */
function stage(platform, files, updaterAsset, sigFile) {
  const out = 'desktop/src-tauri/target/release/publish';
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) if (f.startsWith('latest-') || files.some(([name]) => name === f)) rmSync(`${out}/${f}`);
  for (const [name, from] of files) copyFileSync(from, `${out}/${name}`);
  const part = {
    version,
    notes: process.env.PREPRESS_RELEASE_NOTES ?? '',
    pub_date: new Date().toISOString(),
    platforms: { [platform]: { signature: readFileSync(sigFile, 'utf8'), url: releaseUrl(updaterAsset) } },
  };
  writeFileSync(`${out}/latest-${platform}.json`, JSON.stringify(part, null, 2) + '\n');
  console.log(`\n${platform}: release files in ${out}/. Publish: npx bun scripts/release-desktop.ts`);
}

if (process.platform === 'win32') {
  // Windows: the NSIS installer is both the download and the updater bundle (Tauri 2 signs it
  // with the updater key: <installer>.sig). Not Authenticode-signed yet: SmartScreen warns.
  if (!updater) process.exit(0);
  const nsis = `${bundle}/nsis`;
  const exeName = readdirSync(nsis).find((n) => n === `Prepress_${version}_x64-setup.exe`);
  if (!exeName || !existsSync(`${nsis}/${exeName}.sig`)) {
    console.error(`No signed NSIS installer for ${version} in ${nsis} (build with --bundles nsis and the updater key).`);
    process.exit(1);
  }
  const name = 'Prepress-windows-x64-setup.exe';
  stage(`windows-${arch}`, [[name, `${nsis}/${exeName}`]], name, `${nsis}/${exeName}.sig`);
  process.exit(0);
}
if (process.platform !== 'darwin') process.exit(0);

const dmgDir = `${bundle}/dmg`;
const app = `${bundle}/macos/Prepress.app`;
if (!process.env.APPLE_SIGNING_IDENTITY) {
  console.warn('\nNot signed (APPLE_SIGNING_IDENTITY unset): other Macs will say the app "is damaged".');
  process.exit(0);
}
run('codesign', ['--verify', '--deep', '--strict', app]);
const profile = process.env.PREPRESS_NOTARY_PROFILE;
if (!profile) {
  console.warn('\nSigned but not notarized (PREPRESS_NOTARY_PROFILE unset): Gatekeeper will still block downloads.');
  process.exit(0);
}
const dmgs = readdirSync(dmgDir).filter((f) => f.startsWith(`Prepress_${version}_`) && f.endsWith('.dmg'));
for (const f of dmgs) {
  const dmg = `${dmgDir}/${f}`;
  run('xcrun', ['notarytool', 'submit', dmg, '--keychain-profile', profile, '--wait']);
  run('xcrun', ['stapler', 'staple', dmg]);
  run('spctl', ['--assess', '--type', 'open', '--context', 'context:primary-signature', '-v', dmg]);
}
if (!updater) process.exit(0);

// The dmg's notarization covers the app inside it: staple that ticket to the .app too, then
// rebuild the updater bundle from the stapled app and sign it again.
run('xcrun', ['stapler', 'staple', app]);
const tarball = `${bundle}/macos/Prepress.app.tar.gz`;
rmSync(tarball, { force: true });
rmSync(`${tarball}.sig`, { force: true });
run('tar', ['--no-mac-metadata', '-czf', tarball, '-C', `${bundle}/macos`, 'Prepress.app']);
const key = env.TAURI_SIGNING_PRIVATE_KEY;
const signArgs = existsSync(key) ? ['-f', key] : ['-k', key];
const s = spawnSync('cargo', ['tauri', 'signer', 'sign', ...signArgs, '-p', env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD, tarball], { stdio: ['ignore', 'ignore', 'inherit'] });
if (s.status !== 0) process.exit(s.status ?? 1);

const macArch = arch === 'aarch64' ? 'arm64' : 'x64';
const bundleName = `Prepress-${version}-mac-${macArch}.app.tar.gz`;
stage(`darwin-${arch}`, [[`Prepress-mac-${macArch}.dmg`, `${dmgDir}/${dmgs[0]}`], [bundleName, tarball]], bundleName, `${tarball}.sig`);
