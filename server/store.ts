/**
 * The draft site on disk — the single source of truth shared by the editor
 * and MCP clients. Every write bumps `rev`; writers that send a stale
 * `baseRev` get a conflict instead of silently overwriting someone else.
 *
 * Several processes may share one data folder (the editor server and a
 * `prepress mcp` stdio process started by an AI client): writes take a lock
 * file, and `watch()` notices writes made by another process so open editors
 * reload.
 */
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, unwatchFile, watchFile, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface StoredDraft {
  site: any;
  brief?: string;
  isSample?: boolean;
  publishedHash?: string;
  rev: number;
  savedAt?: string;
  by?: string;
  /** What the last MCP write did (shown by editors that reload because of it). */
  summary?: string;
}

export interface ChangeEvent {
  rev: number;
  by: string;
  summary?: string;
}

/** What an MCP write changes: the site, optionally other draft fields (e.g. the brief). */
export interface Mutation {
  site: any;
  summary?: string;
  fields?: Partial<Pick<StoredDraft, 'brief'>>;
}

export class ConflictError extends Error {
  constructor(public current: StoredDraft | null) {
    super('The site changed since you loaded it');
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Cross-process mutex: an exclusive lock file next to the data. A lock older
 * than `staleMs` is assumed to be left over from a crashed process.
 */
export async function withFileLock<T>(file: string, fn: () => T | Promise<T>, staleMs = 60_000): Promise<T> {
  const deadline = Date.now() + staleMs + 5_000;
  let fd: number | undefined;
  while (fd === undefined) {
    try {
      fd = openSync(file, 'wx');
    } catch (e: any) {
      if (e?.code !== 'EEXIST') throw e;
      try {
        if (Date.now() - statSync(file).mtimeMs > staleMs) unlinkSync(file);
      } catch {
        /* released meanwhile */
      }
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${file}`);
      await sleep(25);
    }
  }
  try {
    writeFileSync(fd, String(process.pid));
    return await fn();
  } finally {
    closeSync(fd);
    try {
      unlinkSync(file);
    } catch {
      /* already gone */
    }
  }
}

export class DraftStore {
  private file: string;
  private lockFile: string;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(e: ChangeEvent) => void>();
  /** Highest rev this process has written or announced. */
  private seenRev = -1;
  private watching = false;

  constructor(dir: string) {
    this.file = join(dir, 'draft.json');
    this.lockFile = join(dir, 'draft.lock');
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
    this.seenRev = Math.max(this.seenRev, d.rev);
  }

  /** Serialize writes: one queue inside this process, a lock file across processes. */
  private lock<T>(fn: () => T | Promise<T>): Promise<T> {
    const locked = () => withFileLock(this.lockFile, fn);
    const run = this.queue.then(locked, locked);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Announce writes made by other processes (e.g. `prepress mcp`) to this process's subscribers. */
  watch(intervalMs = 400) {
    if (this.watching) return;
    this.watching = true;
    try {
      this.seenRev = Math.max(this.seenRev, this.read()?.rev ?? 0);
    } catch {
      /* unreadable draft: the next write fixes it */
    }
    const w = watchFile(this.file, { interval: intervalMs }, () => {
      let d: StoredDraft | null = null;
      try {
        d = this.read();
      } catch {
        return; // mid-write; the next poll sees the final file
      }
      if (!d || d.rev <= this.seenRev) return;
      this.seenRev = d.rev;
      this.emit({ rev: d.rev, by: d.by ?? 'external', summary: d.summary });
    });
    (w as any)?.unref?.();
  }

  close() {
    if (this.watching) unwatchFile(this.file);
    this.watching = false;
  }

  /** Replace the draft (the editor's autosave). `baseRev` must match unless omitted. */
  put(next: Omit<StoredDraft, 'rev'>, baseRev: number | undefined, by: string): Promise<StoredDraft> {
    return this.lock(() => {
      const cur = this.read();
      if (baseRev !== undefined && cur && cur.rev !== baseRev) throw new ConflictError(cur);
      const d: StoredDraft = { ...next, rev: (cur?.rev ?? 0) + 1, savedAt: new Date().toISOString(), by, summary: undefined };
      this.write(d);
      this.emit({ rev: d.rev, by });
      return d;
    });
  }

  /** Read-modify-write (MCP tools). The mutator gets the current draft and returns the new site + a summary. */
  update(by: string, mutate: (cur: StoredDraft) => Mutation | Promise<Mutation>): Promise<StoredDraft> {
    return this.lock(async () => {
      const cur = this.read();
      if (!cur?.site?.pages) throw new Error('There is no site yet. Create one with create_site, or open the editor once.');
      const { site, summary, fields } = await mutate(cur);
      const d: StoredDraft = { ...cur, ...fields, site, isSample: false, rev: cur.rev + 1, savedAt: new Date().toISOString(), by, summary };
      this.write(d);
      this.emit({ rev: d.rev, by, summary });
      return d;
    });
  }

  /** Create or replace the whole site (MCP create_site). */
  create(site: any, by: string, summary: string, extra: Partial<StoredDraft> = {}): Promise<StoredDraft> {
    return this.lock(() => {
      const cur = this.read();
      const d: StoredDraft = { ...extra, site, isSample: false, rev: (cur?.rev ?? 0) + 1, savedAt: new Date().toISOString(), by, summary };
      this.write(d);
      this.emit({ rev: d.rev, by, summary });
      return d;
    });
  }

  /** Copy draft.json to <data>/backup/draft-<time>.json; returns the copy's path. */
  backup(): string | null {
    if (!existsSync(this.file)) return null;
    const dest = join(dirname(this.file), 'backup', `draft-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(this.file, dest);
    return dest;
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
