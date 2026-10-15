import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

/**
 * `npm run dev`: mounts the same handler the binary uses (server/app.ts), so the
 * published site, admin API, uploads and the AI proxy behave as in production.
 * Vite serves the admin app itself at /?admin=1. Data lives in ./prepress-data.
 */
function prepressServer(env: Record<string, string>): Plugin {
  return {
    name: 'prepress-server',
    configureServer(server) {
      // Built on the first request: the engine is loaded through Vite's SSR runner, which isn't ready yet here.
      let ready: Promise<(req: any, res: any, next: () => void) => Promise<void>> | null = null;
      const build = async () => {
        await import('./server/dom.ts');
        const { createHandler } = await import('./server/app.ts');
        // The headless engine, loaded through Vite so ?inline CSS and aliases work like in the build.
        const engine = (await server.ssrLoadModule('/src/lib/engine.ts')) as any;
        return createHandler({
          engine,
          dataDir: process.env.PREPRESS_DATA || fileURLToPath(new URL('./prepress-data', import.meta.url)),
          password: env.PREPRESS_PASSWORD || process.env.PREPRESS_PASSWORD || '',
          anthropicKey: env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
          model: env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        });
      };
      server.middlewares.use((req, res, next) => {
        ready ??= build();
        ready.then((handle) => handle(req, res, next), (e) => next(e));
      });
    },
  };
}

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), ...(process.env.ANALYZE || isSsrBuild ? [] : [viteSingleFile()]), ...(process.env.VITEST ? [] : [prepressServer(env)])],
    // The headless engine (src/lib/engine.ts) is bundled whole for the Bun binary. In dev,
    // only WordPress packages go through Vite (their block.json imports need it), like in tests.
    ssr: { noExternal: isSsrBuild ? true : [/@wordpress/, /@ariakit/], target: 'node' },
    resolve: {
      alias: [
        { find: /^@wordpress\/vips\/worker$/, replacement: fileURLToPath(new URL('./src/stubs/vips.ts', import.meta.url)) },
        // Not in the package's `exports` map.
        { find: /^@wordpress\/format-library\/build-style\/(.*)$/, replacement: fileURLToPath(new URL('./node_modules/@wordpress/format-library/build-style/', import.meta.url)) + '$1' },
      ],
    },
    define: {
      'process.env.IS_GUTENBERG_PLUGIN': 'false',
      'process.env.IS_WORDPRESS_CORE': 'true',
      'globalThis.IS_GUTENBERG_PLUGIN': 'false',
      'globalThis.SCRIPT_DEBUG': 'false',
    },
    build: { target: 'es2022', chunkSizeWarningLimit: 20000, assetsInlineLimit: 100000000 },
    test: { environment: 'jsdom', server: { deps: { inline: [/@wordpress/, /@ariakit/] } } },
  };
});
