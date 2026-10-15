/**
 * Page screenshots for AI review (MCP `view_page`): render the current draft
 * (not the published copy) and photograph it in a headless Chromium browser —
 * Chrome, Edge, Chromium or Brave, whichever is installed, or PREPRESS_BROWSER.
 *
 * Each call: a throwaway HTTP server on 127.0.0.1 serves the rendered page and
 * the media library; the browser runs with a temporary profile and is driven
 * over the DevTools protocol on private pipes; everything is torn down afterwards.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';

export type Device = 'desktop' | 'tablet' | 'phone';
export const DEVICES: Record<Device, { width: number; height: number; mobile: boolean }> = {
  desktop: { width: 1280, height: 800, mobile: false },
  tablet: { width: 820, height: 1180, mobile: true },
  phone: { width: 390, height: 844, mobile: true },
};

/** Longest side of a full-page shot; taller pages are scaled down (use `section` for detail). */
const MAX_FULL = 4000;
const TIMEOUT_MS = 45_000;

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm' };

export function findBrowser(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.PREPRESS_BROWSER && existsSync(env.PREPRESS_BROWSER)) return env.PREPRESS_BROWSER;
  const home = env.HOME ?? '';
  const mac = ['Google Chrome.app/Contents/MacOS/Google Chrome', 'Chromium.app/Contents/MacOS/Chromium', 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'Brave Browser.app/Contents/MacOS/Brave Browser', 'Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'];
  const win = [env['PROGRAMFILES'], env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap((d) => [join(d!, 'Google/Chrome/Application/chrome.exe'), join(d!, 'Microsoft/Edge/Application/msedge.exe'), join(d!, 'BraveSoftware/Brave-Browser/Application/brave.exe')]);
  const linux = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser'].flatMap((n) => (env.PATH ?? '/usr/bin:/usr/local/bin:/snap/bin').split(':').map((d) => join(d, n)));
  const candidates =
    process.platform === 'darwin' ? mac.flatMap((m) => [join('/Applications', m), join(home, 'Applications', m)]) : process.platform === 'win32' ? win : linux;
  return candidates.find((c) => existsSync(c)) ?? null;
}

/**
 * Minimal Chrome DevTools Protocol client over --remote-debugging-pipe
 * (fd 3: commands to the browser, fd 4: replies; NUL-separated JSON). No
 * debugging port is opened, so nothing else on this machine can attach.
 */
class Cdp {
  private id = 0;
  private buf = '';
  private pending = new Map<number, { ok(v: any): void; fail(e: Error): void }>();
  private waiters: { method: string; sessionId?: string; ok(v: any): void }[] = [];
  constructor(
    private out: NodeJS.WritableStream,
    input: NodeJS.ReadableStream,
  ) {
    input.on('data', (chunk: Buffer) => {
      this.buf += chunk.toString('utf8');
      let i: number;
      while ((i = this.buf.indexOf('\0')) >= 0) {
        const raw = this.buf.slice(0, i);
        this.buf = this.buf.slice(i + 1);
        if (raw) this.handle(JSON.parse(raw));
      }
    });
  }
  private handle(m: any) {
    if (m.id && this.pending.has(m.id)) {
      const p = this.pending.get(m.id)!;
      this.pending.delete(m.id);
      m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result);
    } else if (m.method) {
      this.waiters = this.waiters.filter((w) => {
        if (w.method === m.method && (!w.sessionId || w.sessionId === m.sessionId)) {
          w.ok(m.params);
          return false;
        }
        return true;
      });
    }
  }
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    this.out.write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
    return new Promise((ok, fail) => this.pending.set(id, { ok, fail }));
  }
  once(method: string, sessionId?: string): Promise<any> {
    return new Promise((ok) => this.waiters.push({ method, sessionId, ok }));
  }
}

function startBrowser(bin: string, profile: string): { proc: ChildProcess; cdp: Cdp; exited: Promise<never> } {
  const proc = spawn(bin, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--disable-extensions', '--disable-background-networking', 'about:blank'], {
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
  });
  let err = '';
  proc.stderr!.on('data', (d) => (err += d));
  const exited = new Promise<never>((_, fail) => {
    proc.on('error', (e) => fail(new Error(`Could not start the browser: ${e.message}`)));
    proc.on('exit', (code) => fail(new Error(`The browser exited (${code}): ${err.trim().split('\n').slice(-2).join(' ')}`)));
  });
  exited.catch(() => undefined);
  const cdp = new Cdp(proc.stdio[3] as NodeJS.WritableStream, proc.stdio[4] as NodeJS.ReadableStream);
  return { proc, cdp, exited };
}

/** Serve one rendered page plus the media library on a random local port. */
function serve(html: string, uploadsDir: string): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (path.startsWith('/uploads/')) {
      const f = join(uploadsDir, basename(path));
      if (existsSync(f) && MIME[extname(f).toLowerCase()]) {
        res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] });
        return res.end(readFileSync(f));
      }
    }
    res.writeHead(404).end();
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${(server.address() as any).port}/` })));
}

export interface ShotOptions {
  html: string;
  uploadsDir: string;
  device?: Device;
  /** Section index (needs `data-pp-section` markers in the HTML): shoot only that section. */
  section?: number;
  /** false: only the first screen. Default: the whole page. */
  fullPage?: boolean;
  /** Emulate prefers-reduced-motion: reduce (default), so entrance and scroll animations show their final state. */
  reducedMotion?: boolean;
  browser?: string | null;
}

export interface Shot {
  data: string; // base64
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  /** Page height in CSS px (before any scaling). */
  pageHeight: number;
  scale: number;
  sections: number;
}

export async function screenshot(o: ShotOptions): Promise<Shot> {
  const bin = o.browser === undefined ? findBrowser() : o.browser;
  if (!bin) throw new Error('No Chromium browser found (Chrome, Edge, Chromium or Brave). Install one, or set PREPRESS_BROWSER to its executable.');
  const dev = DEVICES[o.device ?? 'desktop'];
  const profile = mkdtempSync(join(tmpdir(), 'prepress-shot-'));
  const { server, url } = await serve(o.html, o.uploadsDir);
  const b = startBrowser(bin, profile);
  const proc = b.proc;
  const cdp = b.cdp;
  const work = (async (): Promise<Shot> => {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m: string, p: Record<string, unknown> = {}) => cdp.send(m, p, sessionId);
    await s('Page.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: dev.width, height: dev.height, deviceScaleFactor: 1, mobile: dev.mobile });
    await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: o.reducedMotion === false ? 'no-preference' : 'reduce' }] });
    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await s('Page.navigate', { url });
    await loaded;
    // Web fonts, then let layout settle.
    await s('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => new Promise(r => setTimeout(r, 150)))', awaitPromise: true });
    const info = JSON.parse(
      (
        await s('Runtime.evaluate', {
          returnByValue: true,
          expression: `JSON.stringify((() => {
            const all = document.querySelectorAll('[data-pp-section]');
            const el = ${o.section === undefined ? 'null' : `document.querySelector('[data-pp-section="${Number(o.section)}"]')`};
            const r = el && el.getBoundingClientRect();
            return { h: Math.ceil(document.documentElement.scrollHeight), w: document.documentElement.clientWidth, n: all.length,
                     rect: r ? { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } : null };
          })())`,
        })
      ).result.value,
    );
    if (o.section !== undefined && !info.rect) throw new Error(`This page has no section ${o.section} (it has ${info.n}: 0–${info.n - 1})`);
    const area = info.rect
      ? { x: Math.max(0, info.rect.x), y: Math.max(0, info.rect.y), width: Math.max(1, Math.ceil(info.rect.w)), height: Math.max(1, Math.ceil(info.rect.h)) }
      : { x: 0, y: 0, width: dev.width, height: o.fullPage === false ? dev.height : info.h };
    const scale = Math.min(1, MAX_FULL / Math.max(area.height, 1));
    const shot = await s('Page.captureScreenshot', { format: 'jpeg', quality: 78, captureBeyondViewport: true, clip: { ...area, scale } });
    return { data: shot.data, mimeType: 'image/jpeg', width: Math.round(area.width * scale), height: Math.round(area.height * scale), pageHeight: info.h, scale: Math.round(scale * 100) / 100, sections: info.n };
  })();
  try {
    return await Promise.race([work, b.exited, new Promise<never>((_, fail) => setTimeout(() => fail(new Error('Screenshot timed out')), TIMEOUT_MS))]);
  } finally {
    proc.kill();
    server.close();
    // The browser may still hold files for a moment.
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1500).unref?.();
  }
}
