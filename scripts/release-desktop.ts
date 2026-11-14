// Publishes the desktop builds staged by `npm run build:desktop` (scripts/desktop.mjs stage():
// desktop/src-tauri/target/release/publish/) as the GitHub release v<version> of
// digitalnodecom/prepress, with the `gh` CLI. CI builds macOS and Windows and puts both
// platforms' files into that folder; a local run publishes what this machine built.
//   Prepress-mac-arm64.dmg                  macOS download (the homepage links …/releases/latest/download/…)
//   Prepress-<version>-mac-arm64.app.tar.gz macOS updater bundle
//   Prepress-windows-x64-setup.exe          Windows download and updater bundle
//   latest.json                             every platform's latest-<platform>.json part merged:
//                                           what installed apps check (…/releases/latest/download/latest.json)
// The release is made as a draft, its assets are read back and compared, and only then published:
// installed apps never see a latest.json whose bundle isn't there yet.
// Needs: `gh auth login` with write access to the repo, and HEAD pushed to origin.
//   npx bun scripts/release-desktop.ts [folder]   (PREPRESS_RELEASE_NOTES=… for custom notes)
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = 'digitalnodecom/prepress';
const staged = process.argv[2] ?? 'desktop/src-tauri/target/release/publish';
const gh = (...args: string[]) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

const version = JSON.parse(readFileSync('desktop/src-tauri/tauri.conf.json', 'utf8')).version as string;
const tag = `v${version}`;
if (!existsSync(staged)) throw new Error(`${staged} is missing: build with \`npm run build:desktop\` (and the updater key) first.`);

// One latest.json from every platform's part; each part must be this version and point at a file
// that is here, under the name it will have on the release.
type Part = { version: string; notes?: string; pub_date: string; platforms: Record<string, { url: string; signature: string }> };
const parts = readdirSync(staged).filter((f) => /^latest-[a-z0-9_-]+\.json$/.test(f));
if (!parts.length) throw new Error(`No latest-<platform>.json in ${staged}: build with the updater key first.`);
const platforms: Part['platforms'] = {};
let notes = '';
let pubDate = '';
for (const f of parts) {
  const part = JSON.parse(readFileSync(join(staged, f), 'utf8')) as Part;
  if (part.version !== version) throw new Error(`${f} is for ${part.version}, tauri.conf.json says ${version}: rebuild.`);
  for (const [platform, p] of Object.entries(part.platforms)) {
    const name = p.url.slice(p.url.lastIndexOf('/') + 1);
    if (p.url !== `https://github.com/${REPO}/releases/download/${tag}/${name}`) throw new Error(`${platform} points at ${p.url}: rebuild with this scripts/desktop.mjs.`);
    if (!existsSync(join(staged, name))) throw new Error(`${platform}: ${name} is not in ${staged}.`);
    if (!p.signature?.trim()) throw new Error(`${platform}: no updater signature.`);
    platforms[platform] = p;
  }
  notes ||= part.notes ?? '';
  if (part.pub_date > pubDate) pubDate = part.pub_date;
}
const latest = { version, notes: process.env.PREPRESS_RELEASE_NOTES || notes, pub_date: pubDate, platforms };
const names = readdirSync(staged).filter((f) => !parts.includes(f) && f !== 'latest.json');
console.log(`Prepress ${version}: ${Object.keys(platforms).join(', ')}`);
if (!platforms['darwin-aarch64']) console.warn('Warning: no macOS build: Mac apps will find no update in this latest.json.');
if (!platforms['windows-x86_64']) console.warn('Warning: no Windows build: Windows apps will find no update in this latest.json.');

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

const dir = mkdtempSync(join(tmpdir(), 'prepress-release-'));
for (const n of names) copyFileSync(join(staged, n), join(dir, n));
writeFileSync(join(dir, 'latest.json'), JSON.stringify(latest, null, 2) + '\n');
const assets = [...names, 'latest.json'].map((n) => join(dir, n));

try {
  if (existing === null) {
    gh('release', 'create', tag, '-R', REPO, '--draft', '--target', head, '--title', `Prepress ${version}`, ...(latest.notes ? ['--notes', latest.notes] : ['--generate-notes']));
  }
  gh('release', 'upload', tag, '-R', REPO, '--clobber', ...assets);
  // Read every asset back (drafts aren't public yet: through the API, with gh's token).
  for (const p of assets) {
    const name = p.slice(dir.length + 1);
    const back = execFileSync('gh', ['release', 'download', tag, '-R', REPO, '-p', name, '-O', '-'], { maxBuffer: 512 * 1024 * 1024 });
    if (sha256(back) !== sha256(readFileSync(p))) throw new Error(`${name}: the uploaded file differs`);
    console.log(`✓ ${name} (${(back.length / 1e6).toFixed(1)} MB)`);
  }
  gh('release', 'edit', tag, '-R', REPO, '--draft=false', '--latest');
  console.log(`Released Prepress ${version}: https://github.com/${REPO}/releases/tag/${tag}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
