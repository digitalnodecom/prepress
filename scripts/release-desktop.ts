// Uploads a desktop build made by `npm run build:desktop` (signed, notarized, with the updater key)
// to the downloads folder of the prepress bucket:
//   _downloads/Prepress-mac-arm64.dmg                 the homepage's download link
//   _downloads/Prepress-<version>-mac-arm64.app.tar.gz the updater bundle (immutable)
//   _downloads/latest.json                            what installed apps check; uploaded last
// Credentials: PREPRESS_S3_ACCESS_KEY / PREPRESS_S3_SECRET_KEY (Scaleway API key with bucket access).
//   npx bun scripts/release-desktop.ts
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

if (!platform[1].url.startsWith(BASE)) throw new Error(`Unexpected updater URL ${platform[1].url}`);
await put(tarball, platform[1].url, 'application/gzip', { 'cache-control': 'public, max-age=31536000, immutable' });
await put(dmg, `${BASE}Prepress-mac-arm64.dmg`, 'application/x-apple-diskimage', {
  'cache-control': 'public, max-age=300',
  'content-disposition': 'attachment; filename="Prepress.dmg"',
});
await put(latestFile, `${BASE}latest.json`, 'application/json', { 'cache-control': 'no-cache' });
console.log(`Released Prepress ${version} (${platform[0]}).`);
