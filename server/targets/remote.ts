/** One connection to a publish target. Paths are relative to the target's folder / prefix, "/"-separated. */
export interface Remote {
  /** What is at `rel` now, or null if nothing (used to back up files Prepress didn't upload). */
  read(rel: string): Promise<Buffer | null>;
  write(rel: string, data: Buffer): Promise<void>;
  /** Delete a file; a missing file is not an error. */
  remove(rel: string): Promise<void>;
  /** Remove a directory if empty (best effort; not all targets have directories). */
  removeDir(rel: string): Promise<void>;
  /** Where we are, for the editor's "Test" message. */
  where(): Promise<string>;
  close(): Promise<void>;
}

export const posixDir = (rel: string) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
export const joinRemote = (base: string, rel: string) => (!base || base === '.' ? rel : `${base.replace(/\/+$/, '')}/${rel}`);

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  pdf: 'application/pdf',
  woff2: 'font/woff2',
};
export const contentType = (rel: string) => TYPES[rel.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream';
