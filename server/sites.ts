/**
 * The "all sites" MCP connection (`prepress mcp --sites <folder>`): one entry in an AI app reaches
 * every site in the sites folder (Documents/Prepress in the desktop app) plus the sites the
 * desktop app opened elsewhere (its recent list). The AI lists them, opens one for the session
 * (open_site) or makes a new folder (new_site); every other tool then works on that site, exactly
 * as `prepress mcp --data <site>` would.
 *
 * Only folders in that list can be opened: the AI can't point Prepress at an arbitrary path.
 * Nothing here deletes, moves or renames folders (that stays in the desktop app's site list).
 * deploy.json holds publish passwords: only each target's `url` is read from it.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createSiteCore, type CoreOptions, type Engine } from './app.ts';
import type { McpContext } from './mcp.ts';
import type { DraftStore } from './store.ts';

export interface SiteSummary {
  name: string;
  /** The folder's own name (what open_site takes). */
  folder: string;
  path: string;
  pages: number;
  /** Last draft save (ISO), null if the folder has no site yet. */
  edited: string | null;
  /** Where it's published: the site's address (Search & sharing), else the first publish target's URL. */
  address: string | null;
}

const readJson = (file: string): any => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const isUrl = (s: unknown): s is string => typeof s === 'string' && /^https?:\/\//.test(s);

function summary(path: string): SiteSummary {
  const draftFile = join(path, 'draft.json');
  const d = readJson(draftFile);
  const targets = readJson(join(path, 'deploy.json'))?.targets;
  const address = isUrl(d?.site?.seo?.url) ? d.site.seo.url : (Array.isArray(targets) ? targets.map((t: any) => t?.url).find(isUrl) : null) ?? null;
  let edited: string | null = null;
  try {
    edited = statSync(draftFile).mtime.toISOString();
  } catch {
    /* no site yet */
  }
  const name = typeof d?.site?.name === 'string' && d.site.name.trim() ? d.site.name : basename(path);
  return { name, folder: basename(path), path, pages: Array.isArray(d?.site?.pages) ? d.site.pages.length : 0, edited, address };
}

/** Every site: folders with a draft.json in the sites folder, plus the desktop app's recent sites that still exist. Newest edit first. */
export function listSites(root: string, recentFile?: string): SiteSummary[] {
  const paths = new Set<string>();
  try {
    for (const e of readdirSync(root, { withFileTypes: true })) {
      const p = join(root, e.name);
      if (e.isDirectory() && existsSync(join(p, 'draft.json'))) paths.add(resolve(p));
    }
  } catch {
    /* no sites folder yet */
  }
  const recent = recentFile ? readJson(recentFile)?.sites : null;
  if (Array.isArray(recent)) {
    for (const s of recent) if (typeof s?.path === 'string' && existsSync(join(s.path, 'draft.json'))) paths.add(resolve(s.path));
  }
  return [...paths].map(summary).sort((a, b) => (b.edited ?? '').localeCompare(a.edited ?? ''));
}

/** A site from the list by folder name, path or site name (case-insensitive). */
export function findSite(sites: SiteSummary[], ref: string): SiteSummary {
  const r = String(ref ?? '').trim();
  const low = r.toLowerCase();
  const exact = sites.filter((s) => s.path === r || s.path === resolve(r));
  const byFolder = sites.filter((s) => s.folder.toLowerCase() === low);
  const byName = sites.filter((s) => s.name.toLowerCase() === low);
  const hits = exact.length ? exact : byFolder.length ? byFolder : byName;
  if (hits.length === 1) return hits[0];
  const all = sites.map((s) => `"${s.folder}" (${s.name})`).join(', ') || 'none yet: make one with new_site';
  if (hits.length > 1) throw new Error(`"${r}" matches several sites: ${hits.map((s) => s.path).join(', ')}. Pass the path.`);
  throw new Error(`No site "${r}". Sites: ${all}`);
}

/** A name usable as a folder name on every OS (same rules as the desktop app's clean_folder_name). */
export function cleanFolderName(name: string): string {
  const clean = String(name ?? '')
    .trim()
    .replace(/[/\\:*?"<>|\u0000-\u001f\u007f]/g, '-')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 80);
  if (!clean) throw new Error('Give the site a name.');
  return clean;
}

/** Make a new site folder in the sites folder: "Name", else "Name 2", "Name 3"… An existing empty folder is reused. */
export function newSiteFolder(root: string, name: string): string {
  const base = cleanFolderName(name);
  for (let i = 1; i < 100; i++) {
    const p = join(root, i === 1 ? base : `${base} ${i}`);
    if (!existsSync(p) || (statSync(p).isDirectory() && readdirSync(p).length === 0)) {
      mkdirSync(p, { recursive: true });
      return resolve(p);
    }
  }
  throw new Error(`Too many folders named "${base}". Pick another name.`);
}

const NO_SITE = 'No site is open in this session. Call list_sites, then open_site {site} (or new_site {name} for a new one).';

export const SITES_INSTRUCTIONS = `This connection reaches all of the owner's Prepress sites. Start every session with list_sites, then open_site {site} to choose the one to work on (ask the owner if it isn't clear which one they mean). Every other tool works on the open site only; open_site again switches. For a new site: new_site {name} makes its folder and opens it, then create_site fills it.`;

/**
 * The McpContext for the all-sites connection: the site tools work on the site opened in this
 * session (each AI session starts its own `prepress mcp` process), and fail until one is open.
 */
export function allSitesContext(opts: { root: string; recentFile?: string; engine: Engine; core?: Omit<CoreOptions, 'dataDir' | 'engine'> }): McpContext & { current(): { path: string } | null } {
  const root = resolve(opts.root);
  let open: { path: string; core: ReturnType<typeof createSiteCore> } | null = null;
  const core = () => {
    if (!open) throw new Error(NO_SITE);
    return open.core;
  };
  const use = (path: string) => {
    open = { path, core: createSiteCore({ ...opts.core, dataDir: path, engine: opts.engine }) };
    return open;
  };
  // The tools hold on to `store`; it follows whichever site is open.
  const store = new Proxy({} as DraftStore, {
    get(_, key) {
      const s = core().store as any;
      const v = s[key];
      return typeof v === 'function' ? v.bind(s) : v;
    },
  });

  return {
    store,
    engine: opts.engine,
    publishSite: (by, o) => core().publishSite(by, o),
    exportWordPress: (o) => core().exportWordPress(o),
    deploy: (which, full) => core().deploy(which, full),
    deployTargets: () => core().deployer.view(),
    localizeMedia: (site) => core().localizeMedia(site),
    importMedia: (url) => core().importer.import(url),
    get uploadsDir() {
      return core().uploadsDir;
    },
    // The AI client started this process on this machine, as this user: it may hand over file paths.
    localFiles: true,
    aiMayChangeCode: () => core().aiMayChangeCode(),
    viewPage: (o) => core().viewPage(o),
    get library() {
      return core().library;
    },
    current: () => (open ? { path: open.path } : null),
    sites: {
      instructions: SITES_INSTRUCTIONS,
      register(tool) {
        tool('list_sites', 'All of the owner’s Prepress sites: name, folder, pages, last edit, published address, and which one is open in this session. Then open_site {site}.', {}, () => ({
          open: open?.path ?? null,
          sitesFolder: root,
          sites: listSites(root, opts.recentFile).map((s) => ({ ...s, open: s.path === open?.path })),
        }), true);

        tool(
          'open_site',
          'Choose the site this session works on (folder name, path or site name from list_sites). Every other tool then reads and changes this site. The owner may have it open in the Prepress app at the same time: their editor updates live.',
          { site: z.string().describe('Folder name, path or site name from list_sites') },
          ({ site }) => {
            const s = findSite(listSites(root, opts.recentFile), site);
            use(s.path);
            const d = open!.core.store.read();
            return { ok: true, open: s.path, name: s.name, folder: s.folder, address: s.address, pages: (d?.site?.pages ?? []).map((p: any) => ({ title: p.title, slug: p.slug })), next: 'get_site for the overview' };
          },
        );

        tool(
          'new_site',
          'Make a new site folder in the sites folder and open it (an existing site is never touched; a taken name gets a number). Then create_site {name, starter, brief} fills it.',
          { name: z.string().describe('The site’s name; also its folder name') },
          ({ name }) => {
            const path = newSiteFolder(root, name);
            use(path);
            return { ok: true, open: path, folder: basename(path), next: `create_site {name: ${JSON.stringify(name)}, starter, brief} (list_starters shows the starters)` };
          },
        );
      },
    },
  };
}

export type SiteTool = (name: string, description: string, inputSchema: Record<string, z.ZodTypeAny>, fn: (args: any) => unknown, readOnly?: boolean) => ReturnType<McpServer['registerTool']>;
