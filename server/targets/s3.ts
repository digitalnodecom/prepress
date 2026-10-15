/**
 * S3 and S3-compatible storage (AWS, Cloudflare R2, MinIO, DigitalOcean
 * Spaces, Backblaze B2, Wasabi …): PUT/GET/DELETE objects with AWS Signature
 * Version 4. No SDK — a few signed HTTP requests are all publishing needs.
 *
 * Serving the bucket as a website (index documents for /about/ → about/index.html,
 * the 404 page, a CDN or custom domain) is configured at the provider.
 */
import { createHash, createHmac } from 'node:crypto';
import type { DeployTarget } from '../deploy.ts';
import { contentType, type Remote } from './remote.ts';

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();

/** RFC 3986 encoding, as SigV4 wants it ("/" kept between key segments). */
const encodeKey = (key: string) => key.split('/').map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');

export interface SignInput {
  method: string;
  url: URL;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  payloadHash: string;
  /** Extra headers to send and sign (lower-case names). */
  headers?: Record<string, string>;
  date?: Date;
}

/** Headers for a SigV4-signed S3 request (exported for the test against AWS's published example). */
export function signS3(i: SignInput): Record<string, string> {
  const d = i.date ?? new Date();
  const amzDate = d.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const headers: Record<string, string> = { ...(i.headers ?? {}), host: i.url.host, 'x-amz-content-sha256': i.payloadHash, 'x-amz-date': amzDate };
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, ' ')]));
  const query = [...i.url.searchParams.entries()]
    .map(([k, v]) => [encodeKey(k), encodeKey(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const canonical = [i.method, i.url.pathname, query, names.map((n) => `${n}:${lower[n]}\n`).join(''), names.join(';'), i.payloadHash].join('\n');
  const scope = `${day}/${i.region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${i.secretAccessKey}`, day), i.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', key).update(toSign).digest('hex');
  return { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${i.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` };
}

/** Object URL. Custom endpoints use path style (bucket in the path) unless told otherwise; AWS uses virtual hosts. */
export function objectUrl(t: DeployTarget, key: string): URL {
  const bucket = t.bucket!;
  const region = t.region || 'us-east-1';
  const k = encodeKey(key);
  if (t.endpoint) {
    const e = new URL(t.endpoint);
    const base = e.pathname.replace(/\/+$/, '');
    if (t.pathStyle === false) return new URL(`${e.protocol}//${bucket}.${e.host}${base}/${k}`);
    return new URL(`${e.protocol}//${e.host}${base}/${bucket}/${k}`);
  }
  // Dotted bucket names break the *.s3 TLS certificate with virtual hosts.
  if (t.pathStyle || bucket.includes('.')) return new URL(`https://s3.${region}.amazonaws.com/${bucket}/${k}`);
  return new URL(`https://${bucket}.s3.${region}.amazonaws.com/${k}`);
}

async function s3Error(r: Response): Promise<Error> {
  const body = await r.text().catch(() => '');
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
  const message = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
  const hint =
    code === 'SignatureDoesNotMatch' ? ' — check the secret key (and region)'
    : code === 'InvalidAccessKeyId' ? ' — check the access key'
    : code === 'NoSuchBucket' ? ` — bucket "${message ?? ''}" doesn't exist in this region/endpoint`
    : code === 'AuthorizationHeaderMalformed' || code === 'PermanentRedirect' ? ' — wrong region? add ?region=<bucket region>'
    : code === 'AccessDenied' ? ' — the key needs s3:PutObject, s3:GetObject and s3:DeleteObject on this bucket'
    : '';
  return new Error(`S3 ${r.status}${code ? ` ${code}` : ''}${message ? `: ${message}` : ''}${hint}`);
}

export async function connectS3(t: DeployTarget): Promise<Remote> {
  if (!t.accessKeyId || !t.secretAccessKey) throw new Error('The S3 connection needs an access key and secret: s3://KEY:SECRET@bucket');
  const region = t.region || 'us-east-1';
  const prefix = t.path ? `${t.path.replace(/^\/+|\/+$/g, '')}/` : '';
  const key = (rel: string) => prefix + rel;

  async function request(method: 'GET' | 'PUT' | 'DELETE', rel: string, body?: Buffer, extra: Record<string, string> = {}) {
    const url = objectUrl(t, key(rel));
    const payloadHash = sha256(body ?? '');
    const headers = signS3({ method, url, region, accessKeyId: t.accessKeyId!, secretAccessKey: t.secretAccessKey!, payloadHash, headers: extra });
    delete (headers as any).host; // fetch sets it
    try {
      return await fetch(url, { method, headers, body: body ? new Uint8Array(body) : undefined, signal: AbortSignal.timeout(120_000) });
    } catch (e: any) {
      throw new Error(`Can't reach ${url.host}: ${e?.cause?.code ?? e?.message ?? e}`);
    }
  }

  return {
    async read(rel) {
      const r = await request('GET', rel);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      // Without s3:ListBucket, a missing object is 403 rather than 404.
      if (r.status === 404 || r.status === 403) return null;
      throw await s3Error(r);
    },
    async write(rel, data) {
      const cache = rel.endsWith('.html') ? 'no-cache' : 'public, max-age=3600';
      const r = await request('PUT', rel, data, { 'content-type': contentType(rel), 'cache-control': cache });
      if (!r.ok) throw await s3Error(r);
    },
    async remove(rel) {
      const r = await request('DELETE', rel);
      if (!r.ok && r.status !== 404) throw await s3Error(r);
    },
    async removeDir() {
      /* S3 has no folders */
    },
    async where() {
      return `s3://${t.bucket}/${prefix}${t.endpoint ? ` at ${new URL(t.endpoint).host}` : ` (${region})`}`;
    },
    async close() {},
  };
}
