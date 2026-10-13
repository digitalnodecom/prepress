/**
 * AI transport. Three backends, picked at startup:
 *  1. "claude"  – running as a claude.ai artifact: uses the viewer's Claude via the `sample` capability
 *  2. "proxy"   – local dev server: POST /api/claude (vite middleware calling the Anthropic API)
 *  3. "demo"    – no AI available: a built-in sample site, so everything else can be tested
 */

export type AIKind = 'claude' | 'proxy' | 'demo';

export interface AI {
  kind: AIKind;
  json<T = unknown>(prompt: string, opts?: { signal?: AbortSignal; fresh?: boolean }): Promise<T>;
}

export class AIError extends Error {
  constructor(public code: string, message: string, public raw?: string) {
    super(message);
  }
}

/** Tolerant JSON extraction: whole text, fenced block, or first {…last }. */
export function extractJson(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    /* fall through */
  }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      /* fall through */
    }
  }
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new AIError('invalid_json', 'The model did not return JSON', text);
}

declare global {
  interface Window {
    claude?: { use(name: string): Promise<any> };
  }
}

async function claudeBackend(): Promise<AI | null> {
  if (!window.claude?.use) return null;
  const sample = await window.claude.use('sample').catch(() => null);
  if (!sample) return null;
  return {
    kind: 'claude',
    async json<T>(prompt: string, opts: { signal?: AbortSignal; fresh?: boolean } = {}) {
      try {
        return (await sample.json(prompt, { signal: opts.signal, modelTier: 'default', ...(opts.fresh ? { cache: false } : {}) })) as T;
      } catch (e: any) {
        throw new AIError(e?.code ?? 'upstream_error', e?.message ?? 'Claude request failed', e?.text);
      }
    },
  };
}

async function proxyBackend(): Promise<AI | null> {
  try {
    const r = await fetch('/api/health');
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.ok) return null;
  } catch {
    return null;
  }
  return {
    kind: 'proxy',
    async json<T>(prompt: string, opts: { signal?: AbortSignal } = {}) {
      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: opts.signal,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new AIError(j.code ?? 'upstream_error', j.error ?? `HTTP ${r.status}`);
      return extractJson(j.text) as T;
    },
  };
}

export async function detectAI(): Promise<AI> {
  return (await claudeBackend()) ?? (await proxyBackend()) ?? { kind: 'demo', json: async () => { throw new AIError('demo', 'No AI backend available'); } };
}

export function friendlyError(e: unknown): string {
  const code = (e as any)?.code;
  switch (code) {
    case 'cancelled':
      return 'Stopped.';
    case 'not_granted':
      return 'Claude access was declined for this page. Reload to be asked again.';
    case 'rate_limited':
      return 'Claude is rate-limited right now — wait a moment and try again.';
    case 'invalid_json':
      return 'Claude replied in an unexpected format. Try again.';
    case 'refused':
      return 'Claude declined that request. Try rephrasing it.';
    case 'session_expired':
      return 'Your Claude session expired — sign in again.';
    case 'sampling_disabled':
      return 'Claude is not available for this account.';
    default:
      return (e as any)?.message ?? 'Something went wrong.';
  }
}
