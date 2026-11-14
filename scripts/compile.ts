// Bun compile step (run with `bun scripts/compile.ts [outfile] [target]`).
// Some dependencies (css-tree, via jsdom) load JSON with
// `createRequire(import.meta.url)('…json')`, which a single-file executable
// can't resolve at runtime. This plugin rewrites those calls into static imports.
// Others read a data file next to their source at load time
// (`fs.readFileSync(path.resolve(__dirname, '…'), …)`, jsdom's default stylesheet):
// that path only exists on the build machine, so the file's text is inlined instead.
// `require.resolve('./…')` of a sibling file (jsdom's sync-XHR worker, never used here)
// would likewise fail at load, so it becomes the bare relative path.
import type { BunPlugin } from 'bun';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RESOLVE_SIBLING = /\brequire\.resolve\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g;
const DIRNAME_READ = /\bfs\.readFileSync\(\s*path\.resolve\(\s*__dirname\s*,\s*(['"])([^'"]+)\1\s*\)\s*,\s*(?:\{\s*encoding:\s*)?['"]utf-?8['"]\s*\}?\s*\)/g;

const staticRequires: BunPlugin = {
  name: 'static-node-modules',
  setup(build) {
    build.onLoad({ filter: /node_modules[\\/].*\.(m?js)$/ }, async ({ path }) => {
      let src = await Bun.file(path).text();
      const before = src;
      src = src
        .replace(DIRNAME_READ, (_m, _q, rel) => JSON.stringify(readFileSync(resolve(dirname(path), rel), 'utf8')))
        .replace(RESOLVE_SIBLING, (_m, _q, rel) => JSON.stringify(rel));
      if (src !== before && !src.includes('createRequire(import.meta.url)')) return { contents: src, loader: 'js' };
      if (!src.includes('createRequire(import.meta.url)')) return undefined;
      const imports: string[] = [];
      let n = 0;
      const out = src.replace(/\brequire\(\s*(['"])([^'"]+)\1\s*\)/g, (_m, _q, spec) => {
        const id = `__req${n++}`;
        imports.push(spec.endsWith('.json') ? `import ${id} from ${JSON.stringify(spec)} with { type: 'json' };` : `import * as ${id} from ${JSON.stringify(spec)};`);
        return id;
      });
      return { contents: imports.join('\n') + '\n' + out, loader: 'js' };
    });
  },
};

const [outfile = process.platform === 'win32' ? 'bin/prepress.exe' : 'bin/prepress', target] = process.argv.slice(2);
const result = await Bun.build({
  entrypoints: [process.env.ENTRY ?? 'server/main.ts'],
  minify: true,
  plugins: [staticRequires],
  compile: { outfile, ...(target ? { target: target as any } : {}) },
} as any);
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`compiled ${outfile}${target ? ` (${target})` : ''}`);
