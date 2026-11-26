/**
 * `prepress mcp` — the MCP server over stdio, for AI clients on the same
 * machine (Claude Desktop, Claude Code, …), which start it as a subprocess:
 *
 *   claude mcp add prepress -- prepress mcp --data ~/Sites/example      (one site)
 *   claude mcp add prepress -- prepress mcp --sites ~/Documents/Prepress  (every site in a folder)
 *
 * Same tools as /mcp on the editor server, working directly on the data
 * folder. It may run while the editor is open on the same folder: writes are
 * locked across processes and the editor reloads when the AI changes the site.
 * No port and no token: whoever can start the process can already read the folder.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSiteCore, type CoreOptions, type Engine } from './app.ts';
import { mcpServerFactory } from './mcp.ts';
import { allSitesContext } from './sites.ts';
import { VERSION } from './version.ts';

export async function runStdio(opts: CoreOptions & { engine: Engine }) {
  const core = createSiteCore(opts);
  const server = mcpServerFactory({
    store: core.store,
    engine: opts.engine,
    publishSite: core.publishSite,
    exportWordPress: core.exportWordPress,
    deploy: core.deploy,
    deployTargets: core.deployer.view,
    siteUrl: opts.siteUrl,
    localizeMedia: core.localizeMedia,
    importMedia: core.importer.import,
    uploadsDir: core.uploadsDir,
    // The AI client started this process on this machine, as this user: it may hand over file paths.
    localFiles: true,
    aiMayChangeCode: core.aiMayChangeCode,
    viewPage: core.viewPage,
    library: core.library,
  })();
  await server.connect(new StdioServerTransport());
  // The client closing our stdin is how a stdio MCP session ends.
  process.stdin.on('end', () => process.exit(0));
  console.error(`Prepress ${VERSION} MCP on stdio · data ${core.dir} · publish ${core.outDir}`);
}

/**
 * `prepress mcp --sites <folder> [--recent <sites.json>]`: one connection for all sites (server/sites.ts).
 * The AI opens a site per session with open_site; the site tools then work on it.
 */
export async function runStdioSites(opts: { root: string; recentFile?: string; engine: Engine }) {
  const server = mcpServerFactory(allSitesContext(opts))();
  await server.connect(new StdioServerTransport());
  process.stdin.on('end', () => process.exit(0));
  console.error(`Prepress ${VERSION} MCP on stdio · all sites in ${opts.root}`);
}
