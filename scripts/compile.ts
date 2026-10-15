// Bun compile step (run with `bun scripts/compile.ts [outfile] [target]`).
// Some dependencies (css-tree, via jsdom) load JSON with
// `createRequire(import.meta.url)('…json')`, which a single-file executable
// can't resolve at runtime. This plugin rewrites those calls into static imports.
import type { BunPlugin } from 'bun';

const staticRequires: BunPlugin = {
  name: 'static-create-require',
  setup(build) {
    build.onLoad({ filter: /node_modules\/.*\.(m?js)$/ }, async ({ path }) => {
      const src = await Bun.file(path).text();
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

const [outfile = 'bin/prepress', target] = process.argv.slice(2);
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
