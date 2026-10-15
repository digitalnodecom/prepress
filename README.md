# Prepress

> Picking this up? Read **[HANDOFF.md](HANDOFF.md)** first.

A website builder that runs as **one binary**, edits pages in the **real WordPress block editor (Gutenberg)**, serves the site itself, and exports to WordPress at any time. Every page is stored as Gutenberg `post_content`, styles live in a real `theme.json`, and "Export" produces a block theme + WXR import file that open in WordPress 7.0 with zero invalid blocks. Optional: Claude generates whole sites from a brief and edits sections from plain-language instructions.

## Run it

```bash
./prepress                      # site:   http://127.0.0.1:8080/
                                # editor: http://127.0.0.1:8080/?admin=1
./prepress --help               # --port, --host, --data, --password, --no-auth
```

On first start Prepress creates `./prepress-data/` (draft, published pages, uploads) and prints a generated admin password (also saved in `prepress-data/admin-password.txt`). Set `ANTHROPIC_API_KEY` (env or `.env` next to the binary) to turn on AI.

- **Editor** (`/?admin=1`): Gutenberg canvas with block toolbar, inserter (blocks, our section patterns, media), list view, block inspector, breadcrumbs; plus Page, AI, Styles and Site panels; Edit / Preview / Code modes. Drafts autosave to the server.
- **Publish** writes a plain static site (`index.html`, `<slug>/index.html`, `404.html`, `uploads/`) into `--out` (default `prepress-data/public`, previewed at `/`), then **deploys** it to every target set in **Site → Deploy**: another folder on this machine (your web root) or a remote server over SFTP (your SSH keys). Only changed files are uploaded; only files Prepress uploaded are ever deleted. Or point the web server at `--out` and stop Prepress when you're not editing. See [docs/DEPLOY.md](docs/DEPLOY.md); for running it per site inside a hosting panel (systemd, reverse proxy, env config) see [docs/EXOPANEL.md](docs/EXOPANEL.md).
- **Export** downloads the WordPress theme + content zip. The theme ships every site-made block (`blocks/`, registered from the theme, no plugin) and pattern (`patterns/`, synced ones as reusable blocks in `content.xml`).
- **MCP** (`/mcp`, Streamable HTTP, bearer token): an AI can read and change the whole site — pages and sections, header/footer, design tokens, theme.json, custom block types, patterns — then publish or export. Open editors update live. Connect Claude Code with the command shown in the editor's **Site** tab:

  ```bash
  claude mcp add --transport http prepress http://127.0.0.1:8080/mcp --header "Authorization: Bearer <token>"
  ```

## Develop

```bash
npm install
npm test            # block validity, AI pipeline, export, server
npm run dev         # http://localhost:5173/?admin=1 (same server handler, data in ./prepress-data)
npm run build:bin   # → bin/prepress for this machine
npm run build:bin:all  # → bin/prepress-{darwin,linux}-{arm64,x64}, prepress-windows-x64.exe
```

The binary is Bun-compiled (`server/main.ts`) with the single-file admin app (`dist/index.html`) embedded. `npm run build` also writes `dist/prepress.html`, the same editor as a claude.ai artifact page (no server: drafts in localStorage, AI via the viewer's Claude account).

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
src/lib/backend.ts        drafts, publish, media (server or localStorage)
src/ui/editor/*           Gutenberg block editor integration, media library
src/ui/*                  React app
server/app.ts             HTTP handler: public site, admin API, uploads, AI proxy
server/main.ts            binary entry point (CLI flags, password, listen)
tests/*                   vitest (jsdom)
```

**Continuing this project (human or AI agent)?** Start with `HANDOFF.md`, then `CLAUDE.md` / `AGENTS.md` (rules) and `PLAN.md` (roadmap). Screenshots are in `docs/screenshots/`.
