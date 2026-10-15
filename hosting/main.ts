/**
 * prepress-hosting — the API behind https://<name>.prepress.digitalno.de
 * (see hosting/api.ts). Configured by environment (systemd EnvironmentFile):
 *
 *   HOSTING_DOMAIN=prepress.digitalno.de
 *   HOSTING_PORT=8787                     listens on 127.0.0.1 only (Caddy in front)
 *   HOSTING_DATA=/var/lib/prepress-hosting
 *   S3_BUCKET=prepress  S3_REGION=fr-par  S3_ENDPOINT=https://s3.fr-par.scw.cloud
 *   S3_ACCESS_KEY=…  S3_SECRET_KEY=…
 */
import { createServer } from 'node:http';
import { createHostingApi } from './api.ts';

const env = (k: string, fallback?: string) => {
  const v = process.env[k] ?? fallback;
  if (v === undefined || v === '') {
    console.error(`prepress-hosting: ${k} is not set`);
    process.exit(2);
  }
  return v;
};

const handle = createHostingApi({
  domain: env('HOSTING_DOMAIN', 'prepress.digitalno.de'),
  dataDir: env('HOSTING_DATA', '/var/lib/prepress-hosting'),
  bucket: env('S3_BUCKET'),
  region: env('S3_REGION', 'fr-par'),
  endpoint: env('S3_ENDPOINT', 'https://s3.fr-par.scw.cloud'),
  accessKeyId: env('S3_ACCESS_KEY'),
  secretAccessKey: env('S3_SECRET_KEY'),
  maxSiteBytes: Number(process.env.HOSTING_MAX_SITE_MB ?? 250) * 1024 * 1024,
  maxFileBytes: Number(process.env.HOSTING_MAX_FILE_MB ?? 25) * 1024 * 1024,
});

const port = Number(process.env.HOSTING_PORT ?? 8787);
createServer((req, res) => void handle(req, res)).listen(port, '127.0.0.1', () => console.log(`prepress-hosting on 127.0.0.1:${port}`));
