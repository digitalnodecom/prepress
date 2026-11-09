// Bridge for installed apps up to 0.7.1, which check the bucket's _downloads/latest.json for
// updates. Releases now live on GitHub (scripts/release-desktop.ts); this uploads the same
// latest.json (pointing at the GitHub asset) and the .dmg to the bucket, so those apps move to a
// version that checks GitHub. Run it once after the first GitHub release (0.7.2); later releases
// don't need it (a stale bucket latest.json only offers 0.7.2, which then updates from GitHub).
// Credentials: PREPRESS_S3_ACCESS_KEY / PREPRESS_S3_SECRET_KEY (Scaleway API key with bucket access).
//   npx bun scripts/release-desktop-s3.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { signS3 } from '../server/targets/s3';

const BASE = 'https://prepress.s3.fr-par.scw.cloud/_downloads/';
const bundle = 'desktop/src-tauri/target/release/bundle';
const accessKeyId = process.env.PREPRESS_S3_ACCESS_KEY;
const secretAccessKey = process.env.PREPRESS_S3_SECRET_KEY;
if (!accessKeyId || !secretAccessKey) throw new Error('Set PREPRESS_S3_ACCESS_KEY and PREPRESS_S3_SECRET_KEY.');

const version = JSON.parse(readFileSync('desktop/src-tauri/tauri.conf.json', 'utf8')).version as string;
const latestFile = `${bundle}/latest.json`;
if (!existsSync(latestFile)) throw new Error(`${latestFile} is missing: build with the updater key first.`);
const latest = JSON.parse(readFileSync(latestFile, 'utf8'));
if (latest.version !== version) throw new Error(`latest.json is for ${latest.version}, tauri.conf.json says ${version}: rebuild.`);
const [platform] = Object.entries(latest.platforms) as [string, { url: string; signature: string }][];
const dmgName = readdirSync(`${bundle}/dmg`).find((n) => n.startsWith(`Prepress_${version}_`) && n.endsWith('.dmg'));
if (!dmgName) throw new Error('No .dmg in the bundle folder.');
const dmg = `${bundle}/dmg/${dmgName}`;
const tarball = `${bundle}/macos/Prepress.app.tar.gz`;
if (readFileSync(`${tarball}.sig`, 'utf8') !== platform[1].signature) throw new Error('The updater signature does not match latest.json: rebuild.');

async function put(file: string, url: string, type: string, extra: Record<string, string>) {
  const body = readFileSync(file);
  const u = new URL(url);
  const headers = signS3({
    method: 'PUT',
    url: u,
    region: 'fr-par',
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    payloadHash: createHash('sha256').update(body).digest('hex'),
    headers: { 'content-type': type, ...extra },
  });
  delete (headers as Record<string, string>).host;
  const r = await fetch(u, { method: 'PUT', headers, body });
  if (!r.ok) throw new Error(`${url}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  // Read it back: a half-written release must not reach latest.json.
  const back = createHash('sha256').update(new Uint8Array(await (await fetch(u, { cache: 'no-store' })).arrayBuffer())).digest('hex');
  if (back !== createHash('sha256').update(body).digest('hex')) throw new Error(`${url}: uploaded file differs`);
  console.log(`✓ ${url} (${(body.length / 1e6).toFixed(1)} MB)`);
}

if (!platform[1].url.startsWith('https://github.com/digitalnodecom/prepress/releases/download/')) throw new Error(`Unexpected updater URL ${platform[1].url}`);
// The update bundle itself is on GitHub; make sure it is there before the bucket points at it.
const asset = await fetch(platform[1].url, { method: 'HEAD', redirect: 'follow' });
if (!asset.ok) throw new Error(`${platform[1].url}: ${asset.status}. Run scripts/release-desktop.ts first.`);
await put(dmg, `${BASE}Prepress-mac-arm64.dmg`, 'application/x-apple-diskimage', {
  'cache-control': 'public, max-age=300',
  'content-disposition': 'attachment; filename="Prepress.dmg"',
});
await put(latestFile, `${BASE}latest.json`, 'application/json', { 'cache-control': 'no-cache' });
console.log(`Released Prepress ${version} (${platform[0]}).`);
