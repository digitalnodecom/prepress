/**
 * The draft site on disk — the single source of truth shared by the editor
 * and MCP clients. Every write bumps `rev`; writers that send a stale
 * `baseRev` get a conflict instead of silently overwriting someone else.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface StoredDraft {
  site: any;
  brief?: string;
  isSample?: boolean;
  publishedHash?: string;
  rev: number;
  savedAt?: string;
  by?: string;
}

export interface ChangeEvent {
  rev: number;
  by: string;
  summary?: string;
}

export class ConflictError extends Error {
  constructor(public current: StoredDraft | null) {
    super('The site changed since you loaded it');
  }
}

export class DraftStore {
  private file: string;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(e: ChangeEvent) => void>();

  constructor(dir: string) {
    this.file = join(dir, 'draft.json');
  }

  read(): StoredDraft | null {
    if (!existsSync(this.file)) return null;
    const d = JSON.parse(readFileSync(this.file, 'utf8'));
    return { ...d, rev: Number(d.rev) || 0 };
  }

  private write(d: StoredDraft) {
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(d));
    renameSync(tmp, this.file);
  }

  /** Serialize all writes through one queue (single process, so this is the lock). */
  private lock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Replace the draft (the editor's autosave). `baseRev` must match unless omitted. */
  put(next: Omit<StoredDraft, 'rev'>, baseRev: number | undefined, by: string): Promise<StoredDraft> {
    return this.lock(() => {
      const cur = this.read();
      if (baseRev !== undefined && cur && cur.rev !== baseRev) throw new ConflictError(cur);
      const d: StoredDraft = { ...next, rev: (cur?.rev ?? 0) + 1, savedAt: new Date().toISOString(), by };
      this.write(d);
      this.emit({ rev: d.rev, by });
      return d;
    });
  }

  /** Read-modify-write (MCP tools). The mutator gets the current draft and returns the new site + a summary. */
  update(by: string, mutate: (cur: StoredDraft) => { site: any; summary?: string } | Promise<{ site: any; summary?: string }>): Promise<StoredDraft> {
    return this.lock(async () => {
      const cur = this.read();
      if (!cur) throw new Error('There is no site yet. Open the editor once, or create one with create_site.');
      const { site, summary } = await mutate(cur);
      const d: StoredDraft = { ...cur, site, isSample: false, rev: cur.rev + 1, savedAt: new Date().toISOString(), by };
      this.write(d);
      this.emit({ rev: d.rev, by, summary });
      return d;
    });
  }

  /** Update fields of the draft that aren't the site (e.g. publishedHash) without a conflict check. */
  patch(fields: Partial<StoredDraft>): Promise<void> {
    return this.lock(() => {
      const cur = this.read();
      if (cur) this.write({ ...cur, ...fields, rev: cur.rev });
    });
  }

  subscribe(fn: (e: ChangeEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: ChangeEvent) {
    for (const fn of this.listeners) {
      try {
        fn(e);
      } catch {
        /* a broken listener must not break writes */
      }
    }
  }
}
