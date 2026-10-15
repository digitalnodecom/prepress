/**
 * S3 presigned URLs (AWS Signature V4, query-string form). The hosting API
 * hands these to Prepress clients so they upload straight to the bucket
 * without ever holding storage credentials. Signed headers (content-type,
 * content-length, cache-control) must be sent exactly as signed, so the API —
 * not the client — decides type, size and caching of every object.
 */
import { createHash, createHmac } from 'node:crypto';

const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
/** RFC 3986 encoding as SigV4 wants it. */
export const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export const encodeKey = (key: string) => key.split('/').map(rfc3986).join('/');

export interface PresignInput {
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  /** Object URL (path already encoded with encodeKey). */
  url: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresIn: number;
  /** Extra headers the uploader must send unchanged (lower-case names). */
  headers?: Record<string, string>;
  date?: Date;
}

export function presign(i: PresignInput): string {
  const u = new URL(i.url);
  const d = i.date ?? new Date();
  const amzDate = d.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${i.region}/s3/aws4_request`;
  const headers: Record<string, string> = { host: u.host };
  for (const [k, v] of Object.entries(i.headers ?? {})) headers[k.toLowerCase()] = String(v).trim();
  const names = Object.keys(headers).sort();
  const q: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${i.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(i.expiresIn),
    'X-Amz-SignedHeaders': names.join(';'),
  };
  const query = Object.keys(q)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(q[k])}`)
    .join('&');
  const canonical = [i.method, u.pathname, query, names.map((n) => `${n}:${headers[n]}\n`).join(''), names.join(';'), 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${i.secretAccessKey}`, day), i.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', key).update(toSign).digest('hex');
  return `${u.origin}${u.pathname}?${query}&X-Amz-Signature=${signature}`;
}
