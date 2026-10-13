import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

/**
 * Local AI proxy for `npm run dev`: POST /api/claude {prompt} → Anthropic Messages API.
 * Set ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL) in .env.local.
 */
function claudeProxy(env: Record<string, string>): Plugin {
  const key = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const model = env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  return {
    name: 'claude-proxy',
    configureServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: !!key, model }));
      });
      server.middlewares.use('/api/claude', async (req, res) => {
        res.setHeader('content-type', 'application/json');
        if (!key) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set' }));
          return;
        }
        let body = '';
        for await (const chunk of req) body += chunk;
        try {
          const { prompt } = JSON.parse(body);
          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
              model,
              max_tokens: 16000,
              system: 'You produce machine-readable JSON for a website builder. Reply with one JSON value only.',
              messages: [{ role: 'user', content: prompt }],
            }),
          });
          const j: any = await r.json();
          if (!r.ok) {
            res.statusCode = r.status;
            res.end(JSON.stringify({ error: j?.error?.message ?? 'Anthropic API error', code: r.status === 429 ? 'rate_limited' : 'upstream_error' }));
            return;
          }
          const text = (j.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
          res.end(JSON.stringify({ text }));
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e?.message ?? e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), ...(process.env.ANALYZE ? [] : [viteSingleFile()]), claudeProxy(env)],
    resolve: {
      alias: [{ find: /^@wordpress\/vips\/worker$/, replacement: fileURLToPath(new URL('./src/stubs/vips.ts', import.meta.url)) }],
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
