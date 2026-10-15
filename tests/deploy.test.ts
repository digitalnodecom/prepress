// @vitest-environment node
// Publish targets: connection strings, and full publishes to SFTP, FTP, S3 and a folder,
// each against a real protocol server running in-process.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createHandler } from '../server/app';
import { MASK, formatConnection, parseConnection } from '../server/targets/connection';
import { signS3 } from '../server/targets/s3';
import { startSftpServer, type SftpServer } from './fixtures/sftp-server';
import { startFtpServer, type FtpServer } from './fixtures/ftp-server';

let server: Server;
let base = '';
let dir = '';
let www = '';
let sftpRoot = '';
let ftpRoot = '';
let sftp: SftpServer;
let ftp: FtpServer;
let s3: Server;
let s3Port = 0;
const objects = new Map<string, Buffer>();
const s3Rejected: string[] = [];

const S3_KEY = 'AKIDTEST';
const S3_SECRET = 'se/cr+et@key';

/** An S3 stand-in that checks every request's SigV4 signature and payload hash, path-style. */
function startS3(): Promise<void> {
  s3 = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const auth = String(req.headers.authorization ?? '');
      const signed = auth.match(/SignedHeaders=([^,]+)/)?.[1].split(';') ?? [];
      const extra: Record<string, string> = {};
      for (const h of signed) if (!['host', 'x-amz-content-sha256', 'x-amz-date'].includes(h)) extra[h] = String(req.headers[h]);
      const amz = String(req.headers['x-amz-date']);
      const date = new Date(`${amz.slice(0, 4)}-${amz.slice(4, 6)}-${amz.slice(6, 8)}T${amz.slice(9, 11)}:${amz.slice(11, 13)}:${amz.slice(13, 15)}Z`);
      const payloadHash = createHash('sha256').update(body).digest('hex');
      const expected = signS3({ method: req.method!, url: new URL(`http://${req.headers.host}${req.url}`), region: 'us-east-1', accessKeyId: S3_KEY, secretAccessKey: S3_SECRET, payloadHash, headers: extra, date }).authorization;
      if (auth !== expected || req.headers['x-amz-content-sha256'] !== payloadHash) {
        s3Rejected.push(`${req.method} ${req.url}`);
        res.writeHead(403).end('<Error><Code>SignatureDoesNotMatch</Code><Message>bad signature</Message></Error>');
        return;
      }
      const key = decodeURIComponent(req.url!.split('?')[0]);
      if (req.method === 'PUT') {
        objects.set(key, body);
        res.writeHead(200).end();
      } else if (req.method === 'GET') {
        const o = objects.get(key);
        if (!o) res.writeHead(404).end('<Error><Code>NoSuchKey</Code></Error>');
        else res.writeHead(200).end(o);
      } else if (req.method === 'DELETE') {
        objects.delete(key);
        res.writeHead(204).end();
      } else res.writeHead(405).end();
    });
  });
  return new Promise((ok) => s3.listen(0, '127.0.0.1', () => ((s3Port = (s3.address() as any).port), ok())));
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prepress-deploy-'));
  www = join(dir, 'www');
  sftpRoot = join(dir, 'sftp-home');
  ftpRoot = join(dir, 'ftp-home');
  // Every destination already holds a file Prepress didn't write (a host's placeholder page).
  mkdirSync(www, { recursive: true });
  writeFileSync(join(www, 'index.html'), 'LOCAL PLACEHOLDER');
  writeFileSync(join(www, 'keep.txt'), 'not ours');
  mkdirSync(join(sftpRoot, 'site'), { recursive: true });
  writeFileSync(join(sftpRoot, 'site', 'index.html'), 'SFTP PLACEHOLDER');
  mkdirSync(join(ftpRoot, 'public_html'), { recursive: true });
  writeFileSync(join(ftpRoot, 'public_html', 'index.html'), 'FTP PLACEHOLDER');
  objects.set('/site-bucket/www/index.html', Buffer.from('S3 PLACEHOLDER'));

  sftp = await startSftpServer(sftpRoot, 'deploy', 'p@ss/w0rd');
  ftp = await startFtpServer(ftpRoot, 'ftpuser', 'ftp-pass');
  await startS3();

  const handle = createHandler({ dataDir: join(dir, 'data'), adminHtml: '<!doctype html>' });
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
}, 30000);

afterAll(async () => {
  server?.close();
  s3?.close();
  await sftp?.close();
  await ftp?.close();
  rmSync(dir, { recursive: true, force: true });
});

const call = async (path: string, method = 'GET', body?: unknown) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as any };
};
const site = { name: 'S', pages: [{ id: 'a', slug: 'home' }, { id: 'b', slug: 'about' }] };
const publish = (pages: Record<string, string>) => call('/api/publish', 'POST', { site, pages, notFound: '<h1>404</h1>' });

const SFTP = () => `sftp://deploy:p@ss/w0rd@127.0.0.1:${sftp.port}/site`;
const FTP = () => `ftp://ftpuser:ftp-pass@127.0.0.1:${ftp.port}/public_html`;
const S3 = () => `s3://${S3_KEY}:${S3_SECRET}@site-bucket/www?endpoint=http://127.0.0.1:${s3Port}`;

describe('connection strings', () => {
  test('parse what hosts hand out, secrets with "@" and "/" included', () => {
    expect(parseConnection('sftp://deploy:p@ss/w0rd@example.com:2222/var/www/site')).toMatchObject({ type: 'sftp', user: 'deploy', password: 'p@ss/w0rd', host: 'example.com', port: 2222, path: '/var/www/site' });
    expect(parseConnection('sftp://me@example.com/~/public_html?key=~/.ssh/deploy')).toMatchObject({ path: 'public_html', identityFile: '~/.ssh/deploy', password: undefined });
    expect(parseConnection('sftp://me@example.com')).toMatchObject({ path: '.' });
    expect(parseConnection('ftps://u:p%40ss@ftp.example.com/public_html')).toMatchObject({ type: 'ftp', secure: true, password: 'p@ss', path: 'public_html' });
    expect(parseConnection('ftp://u:p@h//srv/www')).toMatchObject({ secure: false, path: '/srv/www' });
    expect(parseConnection('s3://AK:wJal/K7+x@my-bucket/site/v1?region=eu-central-1&endpoint=https://acc.r2.cloudflarestorage.com')).toMatchObject({
      type: 's3', accessKeyId: 'AK', secretAccessKey: 'wJal/K7+x', bucket: 'my-bucket', path: 'site/v1', region: 'eu-central-1', endpoint: 'https://acc.r2.cloudflarestorage.com',
    });
    expect(parseConnection('~/Sites/x')).toEqual({ type: 'folder', path: '~/Sites/x' });
    expect(parseConnection('file:///srv/www')).toEqual({ type: 'folder', path: '/srv/www' });
    expect(() => parseConnection('http://example.com')).toThrow(/Unsupported/);
  });

  test('format masks secrets and round-trips when revealed', () => {
    for (const s of ['sftp://deploy:p@ss/w0rd@example.com:2222/var/www/site', 'ftps://u:pw@h/public_html', 's3://AK:wJal/K7+x@my-bucket/site?region=eu-central-1']) {
      const t: any = { id: 'x', name: 'x', auto: true, ...parseConnection(s) };
      expect(formatConnection(t)).toContain(MASK);
      expect(formatConnection(t)).not.toContain(t.password ?? t.secretAccessKey);
      expect(parseConnection(formatConnection(t, true))).toEqual(parseConnection(s));
    }
  });
});

describe('S3 signing', () => {
  // The worked examples in AWS's "Signature Calculations for the Authorization Header" (S3 API reference).
  const creds = { region: 'us-east-1', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', date: new Date('2013-05-24T00:00:00Z') };
  test('GET Object example', () => {
    const h = signS3({ ...creds, method: 'GET', url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'), payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', headers: { range: 'bytes=0-9' } });
    expect(h.authorization).toBe('AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
  });
  test('PUT Object example (encoded key, extra headers)', () => {
    const body = 'Welcome to Amazon S3.';
    const h = signS3({
      ...creds,
      method: 'PUT',
      url: new URL('https://examplebucket.s3.amazonaws.com/test%24file.text'),
      payloadHash: createHash('sha256').update(body).digest('hex'),
      headers: { date: 'Fri, 24 May 2013 00:00:00 GMT', 'x-amz-storage-class': 'REDUCED_REDUNDANCY' },
    });
    expect(h.authorization).toBe('AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class, Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd');
  });
});

describe('publish targets', () => {
  test('rejects unsafe or broken targets', async () => {
    const bad = [
      { connection: join(dir, 'data', 'x') }, // inside the site folder
      { connection: dir }, // contains the site folder
      { connection: 'sftp://-oProxyCommand=sh/x' },
      { connection: 'sftp://u@example.com/' }, // server root
      { connection: 's3://AK:S@Bad_Bucket/x' },
      { connection: 's3://my-bucket/x' }, // no keys
      { connection: 's3://AK:S@my-bucket?endpoint=javascript:alert(1)' },
      { connection: 'gopher://x' },
    ];
    for (const t of bad) expect((await call('/api/deploy', 'PUT', { targets: [t] })).status, JSON.stringify(t)).toBe(400);
    expect((await call('/api/deploy')).body.targets).toEqual([]);
  });

  test('publish uploads to SFTP, FTP, S3 and a folder; secrets never come back', async () => {
    const saved = await call('/api/deploy', 'PUT', {
      targets: [
        { name: 'Local', connection: www, url: 'http://localhost/', auto: true },
        { name: 'SFTP', connection: SFTP(), auto: true },
        { name: 'FTP', connection: FTP(), auto: true },
        { name: 'S3', connection: S3(), auto: true },
      ],
    });
    expect(saved.status).toBe(200);
    const views = saved.body.targets;
    expect(views.map((t: any) => t.type)).toEqual(['folder', 'sftp', 'ftp', 's3']);
    const shown = JSON.stringify(views);
    expect(shown).not.toContain('p@ss/w0rd');
    expect(shown).not.toContain('ftp-pass');
    expect(shown).not.toContain(S3_SECRET);
    expect(views[1].connection).toBe(`sftp://deploy:${MASK}@127.0.0.1:${sftp.port}/site`);
    expect(views[2].insecure).toBe(true);
    // Stored locally, readable only by the user.
    expect(statSync(join(dir, 'data', 'deploy.json')).mode & 0o077).toBe(0);

    writeFileSync(join(dir, 'data', 'uploads', 'pic.png'), 'PNG');
    const first = await publish({ home: '<h1>Home</h1>', about: '<h1>About</h1>' });
    expect(first.status).toBe(200);
    expect(first.body.deploys.map((d: any) => [d.name, d.ok, d.uploaded, d.error ?? ''])).toEqual([
      ['Local', true, 4, ''],
      ['SFTP', true, 4, ''],
      ['FTP', true, 4, ''],
      ['S3', true, 4, ''],
    ]);
    for (const root of [www, join(sftpRoot, 'site'), join(ftpRoot, 'public_html')]) {
      expect(readFileSync(join(root, 'index.html'), 'utf8')).toBe('<h1>Home</h1>');
      expect(readFileSync(join(root, 'about', 'index.html'), 'utf8')).toBe('<h1>About</h1>');
      expect(readFileSync(join(root, 'uploads', 'pic.png'), 'utf8')).toBe('PNG');
    }
    expect(objects.get('/site-bucket/www/index.html')?.toString()).toBe('<h1>Home</h1>');
    expect(objects.get('/site-bucket/www/about/index.html')?.toString()).toBe('<h1>About</h1>');
    expect(s3Rejected).toEqual([]);
    // Placeholders were backed up before being replaced; no temp files left behind.
    expect(first.body.deploys.map((d: any) => readFileSync(join(d.backup, 'index.html'), 'utf8'))).toEqual(['LOCAL PLACEHOLDER', 'SFTP PLACEHOLDER', 'FTP PLACEHOLDER', 'S3 PLACEHOLDER']);
    expect(existsSync(join(sftpRoot, 'site', 'index.html.prepress-tmp'))).toBe(false);

    // Second publish: about removed, home changed → 1 sent, 1 removed, 2 unchanged everywhere.
    const second = await publish({ home: '<h1>Home v2</h1>' });
    expect(second.body.deploys.map((d: any) => [d.ok, d.uploaded, d.removed, d.unchanged])).toEqual(Array(4).fill([true, 1, 1, 2]));
    for (const root of [www, join(sftpRoot, 'site'), join(ftpRoot, 'public_html')]) {
      expect(readFileSync(join(root, 'index.html'), 'utf8')).toBe('<h1>Home v2</h1>');
      expect(existsSync(join(root, 'about'))).toBe(false);
    }
    expect(objects.has('/site-bucket/www/about/index.html')).toBe(false);
    expect(readFileSync(join(www, 'keep.txt'), 'utf8')).toBe('not ours');
  });

  test('editing keeps masked secrets; a changed login needs them again', async () => {
    const views = (await call('/api/deploy')).body.targets;
    const asSent = views.map(({ id, name, connection, url, auto }: any) => ({ id, name, connection, url, auto }));
    asSent[1].name = 'SFTP renamed';
    expect((await call('/api/deploy', 'PUT', { targets: asSent })).status).toBe(200);
    const again = await call('/api/deploy', 'POST', { target: 'SFTP renamed', full: true });
    expect(again.body.deploys).toMatchObject([{ ok: true, uploaded: 3 }]);

    asSent[1].connection = asSent[1].connection.replace('deploy:', 'other:');
    const changed = await call('/api/deploy', 'PUT', { targets: asSent });
    expect(changed.status).toBe(400);
    expect(changed.body.error).toMatch(/password/);
  });

  test('wrong passwords and changed host keys fail with a clear message', async () => {
    const wrongSftp = await call('/api/deploy/test', 'POST', { target: { connection: SFTP().replace('p@ss/w0rd', 'nope') } });
    expect(wrongSftp.body).toMatchObject({ ok: false });
    expect(wrongSftp.body.message).toMatch(/Login failed/);
    const wrongFtp = await call('/api/deploy/test', 'POST', { target: { connection: FTP().replace('ftp-pass', 'nope') } });
    expect(wrongFtp.body.message).toMatch(/Login failed/);
    const wrongS3 = await call('/api/deploy/test', 'POST', { target: { connection: S3().replace(S3_SECRET, 'nope') } });
    expect(wrongS3.body.message).toMatch(/SignatureDoesNotMatch/);
    expect((await call('/api/deploy/test', 'POST', { target: { connection: FTP() } })).body).toMatchObject({ ok: true });
    expect((await call('/api/deploy/test', 'POST', { target: { connection: S3() } })).body).toMatchObject({ ok: true });

    // The SFTP host key was pinned on first connect; a different key is refused.
    const views = (await call('/api/deploy')).body.targets;
    const id = views.find((t: any) => t.type === 'sftp').id;
    const stateFile = join(dir, 'data', 'deploys', `${id}.json`);
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    expect(state.hostKey).toMatch(/^SHA256:/);
    writeFileSync(stateFile, JSON.stringify({ ...state, hostKey: 'SHA256:someone-else' }));
    const r = await call('/api/deploy', 'POST', { target: id });
    expect(r.body.deploys[0].ok).toBe(false);
    expect(r.body.deploys[0].error).toMatch(/host key changed/);
  });

  test('unknown target is 404', async () => {
    expect((await call('/api/deploy', 'POST', { target: 'Nope' })).status).toBe(404);
  });
});
