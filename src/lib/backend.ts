/**
 * Where the site lives.
 *  - "server": running under the Prepress server (binary or `npm run dev`).
 *              Drafts autosave to the server; Publish renders every page and
 *              the server serves them at / and /<slug>/.
 *  - "local":  no server (e.g. the claude.ai artifact build). Drafts go to
 *              localStorage; there is no public site, only the export.
 */
import type { Site } from './types';
export { siteHash } from './publish';

export interface Draft {
  site: Site;
  brief: string;
  isSample: boolean;
  /** Hash of the site as last published (server mode). */
  publishedHash?: string;
  /** Server revision of this draft; bumped by every save (editor or MCP). */
  rev?: number;
}

export type BackendKind = 'server' | 'local';

export interface Backend {
  kind: BackendKind;
  /** Server mode only: true when a password is set and this browser is not signed in. */
  needsLogin: boolean;
  /** Public address of the published site, when configured (--site-url). Else the preview on this server. */
  siteUrl: string | null;
}

const STORAGE_KEY = 'prepress:draft:v1';

export async function connectBackend(): Promise<Backend> {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    const j = r.ok ? await r.json() : null;
    if (j?.server) return { kind: 'server', needsLogin: j.auth === false, siteUrl: j.siteUrl ?? null };
  } catch {
    /* no server */
  }
  return { kind: 'local', needsLogin: false, siteUrl: null };
}

export async function login(password: string): Promise<boolean> {
  const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
  return r.ok;
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST' }).catch(() => null);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { code: j.code ?? 'server', status: r.status, data: j });
  return j as T;
}

export async function loadDraft(b: Backend): Promise<{ draft: Draft | null; publishedAt: string | null }> {
  if (b.kind === 'server') {
    const j = await api<{ draft: Draft | null; publishedAt: string | null }>('/api/site', { cache: 'no-store' });
    return { draft: j.draft?.site?.pages ? j.draft : null, publishedAt: j.publishedAt };
  }
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return { draft: d?.site?.pages ? d : null, publishedAt: null };
  } catch {
    return { draft: null, publishedAt: null };
  }
}

/**
 * Save the draft. Server mode sends `baseRev`; if someone else (an MCP client)
 * saved in between, this throws `{ code: 'conflict', data: { draft } }` with the newer draft.
 * Returns the new revision.
 */
export async function saveDraft(b: Backend, d: Draft, baseRev?: number): Promise<number | undefined> {
  if (b.kind === 'server') {
    const { rev: _rev, ...rest } = d;
    const j = await api<{ rev: number }>('/api/site', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...rest, baseRev }) });
    return j.rev;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: the session still works */
  }
  return undefined;
}

/** Server-sent change notifications (another client, e.g. an AI over MCP, changed the site). */
export function subscribeChanges(onChange: (e: { rev: number; by: string; summary?: string }) => void): () => void {
  if (typeof EventSource === 'undefined') return () => {};
  const es = new EventSource('/api/events');
  es.addEventListener('change', (ev) => {
    try {
      onChange(JSON.parse((ev as MessageEvent).data));
    } catch {
      /* ignore malformed events */
    }
  });
  return () => es.close();
}

/** Ask the server to build the WordPress export from the saved draft; returns a download path. */
export async function exportOnServer(): Promise<{ file: string; path: string; stats: { pages: number; blocks: number; invalid: number } }> {
  return api('/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
}

export interface DeployTarget {
  id: string;
  name: string;
  type: 'folder' | 'sftp';
  path: string;
  host?: string;
  user?: string;
  port?: number;
  identityFile?: string;
  url?: string;
  auto: boolean;
}
export interface DeployResult {
  id: string;
  name: string;
  url?: string;
  at: string;
  ok: boolean;
  uploaded: number;
  removed: number;
  unchanged: number;
  error?: string;
  backup?: string;
}
export type DeployTargetView = DeployTarget & { last: DeployResult | null };

const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** Publish the saved draft: the server renders every page, writes the static site and deploys it to the auto targets. */
export async function publish(): Promise<{ publishedAt: string; deploys: DeployResult[] }> {
  return api('/api/publish', post({}));
}

export const loadDeploy = () => api<{ targets: DeployTargetView[]; outDir: string; publishedAt: string | null }>('/api/deploy');
export const saveDeployTargets = (targets: DeployTarget[]) => api<{ targets: DeployTargetView[] }>('/api/deploy', { ...post({ targets }), method: 'PUT' });
export const testDeployTarget = (target: DeployTarget) => api<{ ok: boolean; message: string }>('/api/deploy/test', post({ target }));
export const deployNow = (target: string, full = false) => api<{ deploys: DeployResult[] }>('/api/deploy', post({ target, full }));

export interface MediaItem {
  id: string;
  url: string;
  mime: string;
}

export async function uploadMedia(file: File): Promise<MediaItem> {
  return api('/api/media', { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream', 'x-filename': encodeURIComponent(file.name) }, body: file });
}

export async function listMedia(): Promise<MediaItem[]> {
  return (await api<{ items: MediaItem[] }>('/api/media', { cache: 'no-store' })).items;
}
