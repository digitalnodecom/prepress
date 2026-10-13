# CLAUDE.md — working on Blockwright

## Non-negotiables

1. **Page content is WordPress block markup.** `Page.content`, `Site.header` and `Site.footer` are serialized Gutenberg markup. Never store HTML that didn't come from `serialize()`.
2. **Never hand-write block markup.** Build `BlockNode` trees and go through `normalizeSections()/normalizeBlocks()` → `toMarkup()`. This includes templates (`wp/templates.ts`).
3. **Zero invalid blocks.** Every change must keep `npm test` green. The tests run WordPress's own block validator over every pattern in every tone, the demo site, header/footer, templates and the export.
4. **Use preset slugs, never raw values,** for colors, font sizes and spacing in patterns and prompts. Raw values break restyling and the Site Editor experience.
5. **Core blocks only** in content. A custom block would require shipping a plugin with the export; discuss before adding one.
6. **WordPress version is pinned** (`TARGET_WP_VERSION` + `overrides` in package.json). When bumping: update every `@wordpress/*` override to the new `wp-X.Y` dist-tag, set the direct deps to the same exact versions, run tests, check for attribute moves (WP 7.0 moved heading/paragraph `textAlign` into `style.typography.textAlign`).

## Commands

- `npm test` — vitest (jsdom). ~30 s; WordPress packages are inlined via `test.server.deps.inline`.
- `npm run dev` — app + `/api/claude` proxy (needs `ANTHROPIC_API_KEY` in `.env.local`).
- `npm run build` — single-file build + `dist/blockwright.html` artifact page.
- `npx tsc` — typecheck.

## Gotchas

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
