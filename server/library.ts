/**
 * Client for the Prepress library (hosting/library.ts on prepress.digitalno.de).
 * The local server talks to it on behalf of the editor and MCP, adding this site
 * folder's token (the same one that owns its free-hosting name) to publish,
 * update and delete items. Items are untrusted: callers import them through
 * importLibraryItem (src/lib/library.ts), which cleans everything.
 */
import { HOSTING_API, siteToken } from './targets/prepress.ts';

export function createLibraryClient(opts: { dataDir: string; base?: string; fetch?: typeof fetch }) {
  const base = (opts.base ?? HOSTING_API).replace(/\/+$/, '');
  const f = opts.fetch ?? fetch;
  const token = () => siteToken(opts.dataDir);

  async function call(path: string, init: RequestInit = {}): Promise<any> {
    let r: Response;
    try {
      r = await f(`${base}/api/v1/library${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
    } catch (e: any) {
      throw Object.assign(new Error(`Can't reach the Prepress library (${new URL(base).host}): ${e?.cause?.code ?? e?.message ?? e}`), { status: 502 });
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error ?? `The library answered ${r.status}`), { status: r.status });
    return j;
  }
  const post = (path: string, body: unknown) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  return {
    base,
    search(q: { type?: string; q?: string; limit?: number; offset?: number; sort?: string }) {
      const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
      return call(`/items?${qs}`);
    },
    mine: () => call('/items?mine=1', { headers: { 'x-site-token': token() } }),
    /** One item with its payload; `forImport` counts it as an import. */
    get: (id: string, forImport = false) => call(`/items/${encodeURIComponent(id)}${forImport ? '?import=1' : ''}`),
    share: (draft: { type: string; title: string; description?: string; tags?: string[]; payload: unknown; preview: string }) => post('/items', { ...draft, token: token() }),
    update: (id: string, patch: Record<string, unknown>) => post(`/items/${encodeURIComponent(id)}`, { ...patch, token: token() }),
    remove: (id: string) => post(`/items/${encodeURIComponent(id)}/delete`, { token: token() }),
    /** Public page and preview URLs. */
    pageUrl: (id: string) => `${base}/library/${id}`,
    previewUrl: (id: string) => `${base}/library/preview/${id}`,
  };
}

export type LibraryClient = ReturnType<typeof createLibraryClient>;

/** "abc123defg", ".../library/abc123defg" or "prepress.digitalno.de/library/abc123defg" → id. */
export function libraryId(input: string): string | null {
  const m = String(input).trim().match(/(?:^|\/library\/)([a-z0-9]{10})(?:[/?#].*)?$/);
  return m ? m[1] : null;
}
