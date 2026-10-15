/**
 * The AI interface the site-generation pipeline (generate.ts) is written
 * against. The editor no longer talks to an AI itself — AI clients work on
 * the site over MCP — so the only implementation left in the app is "demo"
 * (the built-in sample site); tests supply fakes.
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
