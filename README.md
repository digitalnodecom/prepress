# Blockwright

An AI site builder whose native format is **WordPress block markup**. Every page is stored as Gutenberg `post_content`, styles live in a real `theme.json`, and "Export to WordPress" produces a block theme + WXR import file that open in WordPress 7.0 with zero invalid blocks.

## Run it

```bash
npm install
npm test            # round-trip tests: patterns, demo site, AI pipeline, export
npm run dev         # http://localhost:5173 — sample site, styles, reorder, export
```

AI generation in local dev: create `.env.local` with

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5-5   # optional
```

The Vite dev server then proxies `/api/claude` to the Anthropic Messages API (key stays server-side).

`npm run build` produces `dist/index.html` (single file) and `dist/blockwright.html` (the same app, formatted as a claude.ai artifact page, where AI runs on the viewer's own Claude account via the `sample` capability).

## How it works

```
brief ──► plan (name, palette, fonts, page outline)          ai/prompts.ts
      ──► per page: JSON sections = pattern calls | raw block trees
      ──► normalize against registered block.json schemas     wp/normalize.ts
      ──► createBlock + serialize()  (Gutenberg's own code)   wp/markup.ts
      ──► post_content markup  ◄── source of truth (types.ts: Page.content)
            ├─► preview: JS port of WP's front-end render     wp/render.ts
            └─► export: theme zip + WXR + site.json + static  wp/export.ts
```

Key decisions:

- **The model never writes HTML.** It returns JSON block trees or calls into a curated pattern library (`wp/patterns.ts`). Gutenberg's `serialize()` writes the markup, so output is valid by construction. `validateMarkup()` runs the same validator the editor runs on load.
- **Pinned to WordPress 7.0.** All `@wordpress/*` packages are pinned via `overrides` to their `wp-7.0` dist-tag versions, so saved markup matches what WP 7.0's editor expects. Upgrading WP = bump the overrides and re-run tests.
- **Tokens, not values.** Blocks reference preset slugs (`backgroundColor: "primary"`, `var:preset|spacing|70`), so a restyle is one `theme.json` change, here and in the Site Editor.
- **Same templates everywhere.** `wp/templates.ts` builds the theme templates as block trees; the preview renders through them, and the export ships them.

## Layout

```
src/lib/types.ts          data model (Site, Page, Design, BlockNode)
src/lib/site.ts           site operations (sections, pages, restyle, contrast guard)
src/lib/wp/registry.ts    registerCoreBlocks() once
src/lib/wp/normalize.ts   AI JSON → valid block tree (allowlist, attr filtering, repairs)
src/lib/wp/markup.ts      serialize / parse / validate
src/lib/wp/patterns.ts    15 section patterns + header/footer
src/lib/wp/design.ts      design tokens → theme.json → global-styles CSS
src/lib/wp/render.ts      preview renderer (layout support, dynamic blocks)
src/lib/wp/templates.ts   block-theme templates
src/lib/wp/export.ts      theme zip, WXR, README, static HTML
src/lib/ai/*              prompts, transport (artifact / dev proxy / demo), orchestration
src/ui/*                  React app
tests/*                   vitest (jsdom)
```

See `PLAN.md` for the roadmap and `CLAUDE.md` for working conventions.
