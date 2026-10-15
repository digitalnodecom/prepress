# CLAUDE.md — working on Prepress

> New to this project? Read `HANDOFF.md` first: what it is, why it's built this way, what's verified, and what to do next.

## Non-negotiables

1. **Page content is WordPress block markup.** `Page.content`, `Site.header` and `Site.footer` are serialized Gutenberg markup. Never store HTML that didn't come from `serialize()`.
2. **Never hand-write block markup.** Build `BlockNode` trees and go through `normalizeSections()/normalizeBlocks()` → `toMarkup()`. This includes templates (`wp/templates.ts`).
3. **Zero invalid blocks.** Every change must keep `npm test` green. The tests run WordPress's own block validator over every pattern in every tone, the demo site, header/footer, templates and the export.
4. **Use preset slugs, never raw values,** for colors, font sizes and spacing in patterns and prompts. Raw values break restyling and the Site Editor experience.
5. **Core blocks + site-defined `prepress/*` blocks only.** Custom blocks are dynamic (attributes in the comment, HTML from a sanitized mini-mustache template), defined as `CustomBlockDef` in `site.blocks`, rendered by `fillTemplate()` and exported inside the theme (`blocks/<slug>/block.json` + `render.php` + `assets/prepress-blocks.js`). The TS renderer, the exported editor JS (`RUNTIME` in `wp/wpBlocks.ts`) and the generated PHP must stay identical; `tests/customBlocks.test.ts` checks all three (PHP part needs a local `php`). Never add a static custom block or one that needs a plugin.
6. **WordPress version is pinned** (`TARGET_WP_VERSION` + `overrides` in package.json). When bumping: update every `@wordpress/*` override to the new `wp-X.Y` dist-tag, set the direct deps to the same exact versions, run tests, check for attribute moves (WP 7.0 moved heading/paragraph `textAlign` into `style.typography.textAlign`).

## Commands

- `npm test` — vitest (jsdom). ~30 s; WordPress packages are inlined via `test.server.deps.inline`.
- `npm run dev` — Vite + the real server handler (`server/app.ts`): site at `/`, editor at `/?admin=1`, data in `./prepress-data` (or `PREPRESS_DATA`). AI needs `ANTHROPIC_API_KEY` in `.env.local`.
- `npm run build` — single-file admin build (`dist/index.html`) + `dist/prepress.html` artifact page.
- `npm run build:bin` — build + compile `bin/prepress` (Bun, embeds `dist/index.html`). `build:bin:all` cross-compiles macOS/Linux/Windows.
- `npx tsc` — typecheck.
- `npm run build` also bundles the headless engine (`src/lib/engine.ts` → `dist/engine/engine.js`, Vite SSR, everything inlined) that the server uses for MCP, publish and export.

## Gotchas

- The server runs the same lib as the editor (`src/lib/engine.ts`) under a **jsdom** shim (`server/dom.ts`). Not happy-dom: WordPress's attribute parser (hpq) needs `hasOwnProperty(el.attributes, name)`, which happy-dom lacks, and images lose `src`/`alt`. Bun can't bundle `createRequire(import.meta.url)('x.json')` (css-tree, via jsdom): `scripts/compile.ts` rewrites those into static imports.
- The draft (`<data>/draft.json`) has a `rev`; every writer goes through `server/store.ts`. Editor saves send `baseRev` and get 409 on conflict; MCP writes broadcast on `/api/events` and open editors reload.
- Register site blocks (`registerCustomBlocks(site.blocks)`) before parsing/serializing content that uses them — App, MCP tools and `exportSite` all do.
- AI-supplied text that ends up in PHP/CSS comments (site name, block/pattern titles) must go through `comment()` in `wp/wpBlocks.ts`; templates through `sanitizeTemplate`, CSS through `sanitizeCss`.

- The editor is the real `@wordpress/block-editor` (`src/ui/editor/Editor.tsx`). Its `onChange`/`onInput` go through `serialize()`, so rule 1 holds. `__experimentalFeatures` must have presets keyed by origin (`{ theme: [...] }`) and `appearanceTools` expanded by hand (PHP does that in WordPress).
- Page editing shows header + content + footer in one canvas (site-editor style, `src/ui/editor/templateAreas.tsx`): three editor-only `prepress-editor/area` wrapper blocks, root `templateLock: 'all'`. They are never stored: `splitAreas()` serializes each area's inner blocks back to `page.content` / `site.header` / `site.footer`, and only areas whose output changed are written (so opening a page never marks a part custom). Toggle: status bar "Hide header & footer" (localStorage).
- Keep `EditorProvider` settings referentially stable (memoized assets, no fresh `[]` props): a new `__unstableResolvedAssets` reloads the canvas iframe and drops keystrokes.
- Header/footer are editable (top-bar tabs). `site.custom[part]` marks a hand-edited part: `rebuildParts()` then keeps it and only syncs menu links (`syncPartLinks`); untouched parts are still regenerated. Pass the previous page list to `rebuildParts(site, before)` from any page add/rename/remove.
- Core edit components for `site-title`, `site-tagline`, `navigation`, `navigation-link` need core-data/REST, so `src/ui/editor/dynamicBlocks.tsx` replaces them via `editor.BlockEdit`. Attributes stay core's.
- Canvas CSS is passed to the editor iframe via `__unstableResolvedAssets.styles`; parent-page CSS is not the content CSS.
- The public site is static HTML rendered by the admin (`renderPage`) at Publish time and written by the server into `--out` (a plain static folder any web server can serve; Prepress needn't run). Publish only touches files in its manifest (`<data>/published.json`) and backs up anything else it would overwrite. `--out` may never contain `--data`. Changing `render.ts` needs a re-publish to show up.
- Deploy targets (`server/deploy.ts`) copy `--out` elsewhere after Publish (local folder or `sftp -b` batch). Same ownership rule per target: hash manifest in `<data>/deploys/<id>.json`, never delete what we didn't upload, back up what we'd overwrite. Anything user-typed that reaches the sftp command line or batch file goes through `cleanTarget` first.
- `@wordpress/format-library` CSS is not in its `exports` map; it's aliased in `vite.config.ts`.
- `@wordpress/vips/worker` is aliased to `src/stubs/vips.ts`; otherwise 13 MB of WASM gets bundled.
- `@wordpress/*` direct dependencies must equal their override versions exactly or npm errors with `EOVERRIDE`.
- Dynamic blocks (site-title, navigation, post-content, template-part) save as self-closing comments; `wp/render.ts` renders them for the preview. If you add a dynamic block to a template or part, add a renderer case.
- Layout classes and container CSS are added at render time (like PHP `wp_render_layout_support_flag`), not saved in markup. Don't put `is-layout-*` classes into content.
- Placeholder images are SVG data URIs; `applyDesign()` regenerates them from `alt` text in the new palette.
- AI JSON is untrusted: unknown blocks and attributes are dropped and reported, not passed through.

## Adding a pattern

1. Add an entry to `PATTERNS` in `wp/patterns.ts` (description + compact props schema the model sees + `build`).
2. Use `section()`, `card()`, `grid()`, `buttons()` helpers and preset slugs.
3. Add sample props to the "every pattern" test in `tests/roundtrip.test.ts` if it needs new keys; run `npm test`.
