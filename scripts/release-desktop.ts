// Publishes a desktop build made by `npm run build:desktop` (signed, notarized, with the updater
// key) as the GitHub release v<version> of digitalnodecom/prepress, with the `gh` CLI:
//   Prepress-mac-arm64.dmg                 the homepage's download link (…/releases/latest/download/…)
//   Prepress-<version>-mac-arm64.app.tar.gz the updater bundle latest.json points at
//   latest.json                            what installed apps check (…/releases/latest/download/latest.json)
// The release is made as a draft, its assets are read back and compared, and only then published:
// installed apps never see a latest.json whose bundle isn't there yet.
// Needs: `gh auth login` with write access to the repo, and HEAD pushed to origin.
//   npx bun scripts/release-desktop.ts            (PREPRESS_RELEASE_NOTES=… for custom notes)
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = 'digitalnodecom/prepress';
const bundle = 'desktop/src-tauri/target/release/bundle';
const gh = (...args: string[]) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

const version = JSON.parse(readFileSync('desktop/src-tauri/tauri.conf.json', 'utf8')).version as string;
const tag = `v${version}`;
const latestFile = `${bundle}/latest.json`;
if (!existsSync(latestFile)) throw new Error(`${latestFile} is missing: build with the updater key first.`);
const latest = JSON.parse(readFileSync(latestFile, 'utf8'));
if (latest.version !== version) throw new Error(`latest.json is for ${latest.version}, tauri.conf.json says ${version}: rebuild.`);
const [platform] = Object.entries(latest.platforms) as [string, { url: string; signature: string }][];
const arch = platform[0] === 'darwin-aarch64' ? 'arm64' : 'x64';
const bundleName = `Prepress-${version}-mac-${arch}.app.tar.gz`;
if (platform[1].url !== `https://github.com/${REPO}/releases/download/${tag}/${bundleName}`) throw new Error(`latest.json points at ${platform[1].url}: rebuild with this scripts/desktop.mjs.`);
const dmgName = readdirSync(`${bundle}/dmg`).find((n) => n.startsWith(`Prepress_${version}_`) && n.endsWith('.dmg'));
if (!dmgName) throw new Error('No .dmg for this version in the bundle folder.');
const tarball = `${bundle}/macos/Prepress.app.tar.gz`;
if (readFileSync(`${tarball}.sig`, 'utf8') !== platform[1].signature) throw new Error('The updater signature does not match latest.json: rebuild.');

// The tag goes on a commit that is on GitHub.
const head = git('rev-parse', 'HEAD');
git('fetch', '-q', 'origin');
if (git('branch', '-r', '--contains', head).split('\n').every((b) => b.trim() !== 'origin/main')) throw new Error('HEAD is not on origin/main: push first.');
if (git('status', '--porcelain', '--untracked-files=no')) throw new Error('Uncommitted changes: commit them first (the release must match a commit).');
const existing = (() => {
  try {
    return gh('release', 'view', tag, '-R', REPO, '--json', 'isDraft', '-q', '.isDraft');
  } catch {
    return null;
  }
})();
if (existing === 'false') throw new Error(`${tag} is already published.`);

// Assets under their published names.
const dir = mkdtempSync(join(tmpdir(), 'prepress-release-'));
const assets: [string, string][] = [
  [join(dir, `Prepress-mac-${arch}.dmg`), `${bundle}/dmg/${dmgName}`],
  [join(dir, bundleName), tarball],
  [join(dir, 'latest.json'), latestFile],
];
for (const [to, from] of assets) copyFileSync(from, to);

try {
  const notes = process.env.PREPRESS_RELEASE_NOTES || latest.notes || '';
  if (existing === null) {
    gh('release', 'create', tag, '-R', REPO, '--draft', '--target', head, '--title', `Prepress ${version}`, ...(notes ? ['--notes', notes] : ['--generate-notes']));
  }
  gh('release', 'upload', tag, '-R', REPO, '--clobber', ...assets.map(([p]) => p));
  // Read every asset back (drafts aren't public yet: through the API, with gh's token).
  for (const [p] of assets) {
    const name = p.slice(dir.length + 1);
    const back = execFileSync('gh', ['release', 'download', tag, '-R', REPO, '-p', name, '-O', '-'], { maxBuffer: 512 * 1024 * 1024 });
    if (sha256(back) !== sha256(readFileSync(p))) throw new Error(`${name}: the uploaded file differs`);
    console.log(`✓ ${name} (${(back.length / 1e6).toFixed(1)} MB)`);
  }
  gh('release', 'edit', tag, '-R', REPO, '--draft=false', '--latest');
  console.log(`Released Prepress ${version} (${platform[0]}): https://github.com/${REPO}/releases/tag/${tag}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
