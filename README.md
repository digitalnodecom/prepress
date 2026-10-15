# Prepress

> Picking this up? Read **[HANDOFF.md](HANDOFF.md)** first.

A website builder you run on your own computer (desktop app or one binary). You edit pages in the **real WordPress block editor (Gutenberg)**; the site stays in a local folder until you **publish** it as static HTML to your host (SFTP, FTP/FTPS, S3 or R2) or **export** it to WordPress. Every page is stored as Gutenberg `post_content`, styles live in a real `theme.json`, and "Export" produces a block theme + WXR import file that open in WordPress 7.0 with zero invalid blocks. AI works on the site from outside, over MCP: Claude Desktop, Claude Code or any MCP client can write pages, restyle, add blocks and publish, while the editor updates live.

## Run it

**Desktop app** (`npm run build:desktop` → `desktop/src-tauri/target/release/bundle/`): a native window (Tauri, Rust) with a site launcher — create a site, open a site folder, recent sites. Each site is a folder (default `~/Documents/Prepress/<name>`); the app runs the bundled `prepress` server for it and stops it on quit.

**Binary**:

```bash
./prepress --data ~/Sites/example   # editor:  http://127.0.0.1:8080/?admin=1
                                    # preview: http://127.0.0.1:8080/
./prepress --help                   # --port, --data, --out, --site-url, --no-mcp
```

There is no password: Prepress listens on 127.0.0.1 only and refuses requests not addressed to localhost (no other machine, and no web page via DNS rebinding, can reach it).

- **Start from a template**: *New site* (or any new, empty site folder) opens a gallery with live previews: **Blank** plus 8 starters (local business, restaurant & café, portfolio, studio/agency, product/SaaS, consultant & coach, event, nonprofit). Your site name is filled in everywhere, and the starter's brief (plus your one-line description) is saved as the **site brief** (Site tab, editable) so an AI client knows what the site is for.
- **AI = MCP only.** The editor has no built-in AI. **Settings** (gear) → *AI connection* shows how to connect, depending on where Prepress runs: in the **desktop app** it lists the AI apps found on this computer — Claude Desktop, Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, LM Studio, Hermes — with a one-click **Connect** that adds this site (`prepress-<site>`, stdio) to that app's MCP config (other settings kept, original saved as `.before-prepress`, **Disconnect** undoes it), plus copy-paste JSON/command for anything else; HTTP `/mcp` is off; the **standalone binary/server** offers HTTP `/mcp` with a bearer token.
- **Editor** (`/?admin=1`): Gutenberg canvas with block toolbar, inserter (blocks, our section patterns, media), list view, block inspector, breadcrumbs; plus Page, AI, Styles and Site panels; Edit / Preview / Code modes. Drafts autosave to the server.
- **Publish** renders a plain static site (`index.html`, `<slug>/index.html`, `404.html`, `uploads/`) into `--out` (default `<data>/public`, previewed at `/`), then uploads it to the targets you tick in the **Publish** dialog (targets are managed there or in **Settings → Publishing**). A target is a connection string — `sftp://user:pass@host/var/www/site` (password, SSH key or agent), `ftps://user:pass@host/public_html`, `s3://KEY:SECRET@bucket/prefix?region=…` (or `&endpoint=` for R2, MinIO, Spaces, B2), or a local folder. Only changed files are uploaded; only files Prepress uploaded are ever deleted; anything it would replace is backed up first. Passwords stay in the site folder (`deploy.json`, mode 0600) and are never sent back to the page. See [docs/DEPLOY.md](docs/DEPLOY.md); hosting providers: [docs/EXOPANEL.md](docs/EXOPANEL.md).
- **Media**: images (and video/audio/PDF) linked from the web — inserted by URL or pasted in the editor, or written by an AI over MCP — are downloaded into the site's media library and the blocks point at the local copy, so the published site and the WordPress export never hotlink. Only public http(s) addresses, only real image/video/audio/PDF files (no SVG/HTML), 50 MB max; identical files are stored once.
- **AI review**: the MCP tool `view_page` returns a screenshot of the current draft (desktop/tablet/phone, whole page or one section), rendered in a headless Chrome/Edge/Chromium/Brave found on the machine (or `PREPRESS_BROWSER`), so an AI can look at its work and fix it.
- **Export** downloads the WordPress theme + content zip. The theme ships every site-made block (`blocks/`, registered from the theme, no plugin) and pattern (`patterns/`, synced ones as reusable blocks in `content.xml`).
- **MCP** (`/mcp`, Streamable HTTP, bearer token): an AI can read and change the whole site — pages and sections, header/footer, design tokens, theme.json, custom block types, patterns — then publish or export. Open editors update live. Connect Claude Code with the command shown in the editor's **Site** tab:

  ```bash
  claude mcp add --transport http prepress http://127.0.0.1:8080/mcp --header "Authorization: Bearer <token>"
  ```
- **Local MCP (stdio)**: `prepress mcp --data <folder>` runs the same tools over stdin/stdout, so an AI client on your computer (Claude Desktop, Claude Code) starts Prepress itself: no port, no token. It works on a folder that has no site yet (`create_site`) and can run while the editor has the same folder open (writes are locked across processes; the editor reloads live). The editor's **Site** tab shows the exact command and the Claude Desktop config.

  ```bash
  claude mcp add prepress -- /path/to/prepress mcp --data ~/Sites/example --out ~/Sites/example/public
  ```

## Local app, remote host

1. Open the desktop app → **Create site** (or `./prepress --data ~/Sites/example`, or let an AI build it over `prepress mcp`).
2. Click **Publish**. The first time, it asks where the site should go: paste the connection your host gave you (SFTP, FTPS, S3/R2), **Test**, **Save target**.
3. Tick the targets and **Publish**: the site is rendered on your computer and only changed files are uploaded; each target shows its result. The host only serves static files. An AI can do the same with `publish_site` / `deploy_site`.
4. **Export** any time for WordPress (theme + content zip).

## Develop

```bash
npm install
npm test            # block validity, AI pipeline, export, server
npm run dev         # http://localhost:5173/?admin=1 (same server handler, data in ./prepress-data)
npm run build:bin   # → bin/prepress for this machine
npm run desktop     # desktop app in dev mode (needs Rust + cargo-tauri); npm run build:desktop to bundle
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
server/main.ts            binary entry point (CLI flags, listen on 127.0.0.1, `prepress mcp`)
server/deploy.ts          publish targets (state, ownership, backups); server/targets/* = sftp, ftp, s3, folder
desktop/                  desktop app (Tauri): src-tauri/src/main.rs + ui/ launcher; scripts/desktop.mjs builds it
tests/*                   vitest (jsdom)
```

**Continuing this project (human or AI agent)?** Start with `HANDOFF.md`, then `CLAUDE.md` / `AGENTS.md` (rules) and `PLAN.md` (roadmap). Screenshots are in `docs/screenshots/`.
