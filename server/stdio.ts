/**
 * `prepress mcp` — the MCP server over stdio, for AI clients on the same
 * machine (Claude Desktop, Claude Code, …), which start it as a subprocess:
 *
 *   claude mcp add prepress -- prepress mcp --data ~/Sites/example
 *
 * Same tools as /mcp on the editor server, working directly on the data
 * folder. It may run while the editor is open on the same folder: writes are
 * locked across processes and the editor reloads when the AI changes the site.
 * No port and no token: whoever can start the process can already read the folder.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSiteCore, type CoreOptions, type Engine } from './app.ts';
import { mcpServerFactory } from './mcp.ts';
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
  })();
  await server.connect(new StdioServerTransport());
  // The client closing our stdin is how a stdio MCP session ends.
  process.stdin.on('end', () => process.exit(0));
  console.error(`Prepress ${VERSION} MCP on stdio · data ${core.dir} · publish ${core.outDir}`);
}
