# HANDOFF — start here

This file is for the next agent or developer picking up this project. It explains what the project is, why it is built this way, what works, what is unverified, and exactly what to do next. Read this file first, then `CLAUDE.md` (working rules, same content as `AGENTS.md`), then `PLAN.md` (roadmap).

Last updated: 2026-10-14 · Version: v0.3 · Target: WordPress 7.0

## v0.16 — library set #6: Frost / Chorus (mobile-app landing, tasteskill v2)

- `library-sets/chorus/`, direction "The product performs" (seed 1372792141; Bricolage Grotesque, frost and slate, one teal). Idea: the app's own output — the spectrogram — becomes the working interface fragments the page is made of. Fictional app "Chorus" (names the bird from a ten-second recording).
- Blocks `prepress/chorus-hero|row|stages|notes|plans`, each a working fragment marked `data-ui`, all interaction via CSS radio/checkbox state (no script): pick a recording → spectrogram draws + bird named; tick the row to keep it; a four-stop track swaps clause and screen; a pinned field note changed by language / Latin / offline / night / postcard controls; plan names drive one price stage. Spectrograms are generated SVG per species.
- Pictures: public-domain plates (Nozeman & Sepp, *Nederlandsche vogelen*; Grönvold) from Wikimedia Commons at `prepress.s3…/_library/chorus/`, credited in the footer.
- Gate: inspector 0 FAIL, 2 WARN (no video; ten sizes counting the interface's own). Deviations: the hero reel doesn't advance on scroll (slivers only); the CTA's "blank" is the two download buttons, not an email field (no form backend); the stages use radio stops, not a range input (CSS can't read a range value).
- New font: Bricolage Grotesque. Live: template `9qi4ilgimz`, demo `chorus.prepress.digitalno.de`.

## v0.15 — library set #5: Passport (art-directed with tasteskill v2)

- `library-sets/hut/`, directed with the `design-taste-frontend` skill (direction "The page is the object", seed 904979176; Bebas Neue / EB Garamond, sand and moss). Idea: the hut stamp in a walker's mountain passport becomes the paper card the first screen is printed on. Live thing: the trail picker (`prepress/hut-routes`, CSS radio state, no script).
- Blocks `prepress/hut-pass|stamp|routes|menu-item|receipt`; section compositions (drag row with a scroll-timeline progress bar, giant word over `core/details` bars, scalloped menu sheet, split FAQ, card on a `core/cover`, back-of-card footer) are classes in the style CSS.
- Pictures: public-domain postcards (Julian Alps 1912/1930/1966, Lake Bohinj 1950s–60s) and a CC0 panorama from Wikimedia Commons, toned to one warm monochrome and hosted at `prepress.s3…/_library/sedmera/`; credited in the footer. Importing the template copies them into the site's own media library.
- Gate: tasteskill `inspect.mjs` 0 FAIL, 3 WARN (no video; the drag row scrolls sideways by design; fluid sizes at tablet width). Deviations from the sheet: the curtain footer became a rise-in footer (the pinned version failed covered-text/long-pin); the drag row has no arrow buttons (no JS); the receipt has no selectable options.
- New fonts: Bebas Neue, EB Garamond. The skill's working files land in `.taste-skill/` (not part of the app).

## v0.14 — FX: a blocks-only library collection

- `library-sets/fx/` (`blocksOnly: true`): 11 standalone blocks published without style/patterns/template — split-flap board, typewriter headline, CRT terminal, starfield panel, aurora panel, frosted glass card, pattern field (Truchet / moiré / dots / scales), orbit, ring gauge, count-up number, mini bar chart. Pure CSS, palette-driven; numbers count up with registered `@property` integers + `counter()` (final value shows where animation is off).
- Written from scratch; forevercomponents.com was only a source of effect ideas (its components are paid/proprietary, nothing copied).
- `buildLibrarySet` supports `blocksOnly` sets: the set's design + `showcase` sections only dress the previews; items are the blocks with no lineage. Tests branch accordingly.
- Gotcha: "always dark" surfaces must anchor to black (tinted with primary), not mix from `contrast` — on dark styles contrast is light.

## v0.13 — library set #4: Showroom (product launch)

- `library-sets/showroom/`: a white-gallery product-launch style (white + #f5f5f7 mist, ink #1d1d1f, one blue for links and compact pills, orange accent for "New" labels; Inter set tight; 28px cards, no shadows), built from a third-party style reference but with a fictional brand (Norde / Fold 2) and no third-party names, logos or fonts.
- Blocks `prepress/showroom-device|pricing|localnav|chapters|spec|finishes`. Hardware is drawn in CSS from palette mixes (open foldable that unfolds on scroll, closed foldable, camera back, watch); `localnav` is sticky and must sit top-level in the page (not inside a group). Every block carries the CSS it needs (pill styles are duplicated in `localnav` and `pricing`: block CSS only loads where the block is used).
- 11 patterns, template *Norde* (Fold 2, Design, Tech specs, Buy); demo `norde.prepress.digitalno.de`; 79 official library items.

## v0.12 — official templates in New site; library opens on Templates

- New site dialog: a "By Prepress" row (official library templates, live previews) above the built-in starters, fetched via `/api/library/items?type=template&official=1`; hidden when offline. Choosing one imports it (`startFromLibrary` in App.tsx), applies the typed site name, and puts the "about" text first in the brief, followed by the template's brief.
- `official=1` passes through the local library proxy; MCP `library_search` takes `official: true`.
- prepress.digitalno.de/library opens on Templates; "All" is `?type=all` (a search or the By Prepress filter still shows all types).

## v0.11 — library set #3: Night Garden (first dark style)

- `library-sets/garden/`: night green `#0e1411`, moonlight cream, lantern amber (≈8:1, used as text and as a button with dark text); Cormorant Garamond (new FONTS entry) / DM Sans / DM Mono; round radius; `color-scheme: dark`; grain only on dark-backgrounded sections.
- Blocks `prepress/garden-glow|botanical|arch|menu-item|hours|seal|vine|reserve`: lantern/moon glow headline with CSS fireflies; five generated botanicals (fern, monstera with even-odd fenestrations, eucalyptus, poppy, moonflower) as line or silhouette; arched night-sky windows (moon, dusk, amber) as the photo stand-in; menu lines and opening hours with dotted leaders; a `textPath` seal (shared id is fine: identical geometry); a vine divider that grows in on scroll; a reservation card that links out (no forms).
- 10 patterns + header/footer; template *Nocturne* (Home, Menu, Evenings, Visit, Private dining), every page ends on the `#reserve` card.
- Gotchas found: block attributes can't be named `style`/`align` (reserved); spacing presets stop at 80; a `label()` helper must merge `style.typography`, not replace it.
- Tests: every set's palette passes the Styles panel contrast checks; Night Garden's `textOn(accent)` is base.
- Live: 60 official items (Nocturne template `jx0ajj4moa`); demo `nocturne.prepress.digitalno.de` (token in a scratch folder).

## v0.10 — mono font slot + library set #2: Paper Edition

- **Mono slot:** `Design.monoFont` (optional; `sanitizeDesign` defaults it to `system-mono`, only `FONTS` entries with `mono: true` qualify). `buildThemeJson` always emits a `mono` font family, so `var(--wp--preset--font-family--mono)` / `fontFamily: "mono"` work on every site; `googleFontsUrl` loads it. New faces: Newsreader, IBM Plex Mono, JetBrains Mono, DM Mono, Space Mono, System Mono; Fraunces now loads italics and weight 300. Styles panel has a Mono select (heading/body selects list only text faces); MCP `set_design` takes `monoFont`, `get_block_catalog` lists `monoFonts`.
- **Paper Edition** (`library-sets/paper/`): warm paper, ink, oxblood; Fraunces / Newsreader / IBM Plex Mono on a 680px measure. Blocks `prepress/paper-masthead|lede|pullquote|note|byline|ornament|index-row|engraving` (drop cap via `initial-letter` with a float fallback; sidenotes sit after their paragraph and hang in the margin at ≥1180px; dot-leader index rows; five generated line-art engravings with no SVG ids). 10 patterns + header/footer; template *The Margin* (Home, Essays, On slow software, About, Subscribe).
- `library-sets/index.ts` is the set registry used by `qa-set.ts`, `seed-library.ts` and `tests/librarySets.test.ts` (which now runs every check for every set, including the export's `mono` family).
- Live: 40 official items (Paper template `zi4wwurgev`); demo `the-margin.prepress.digitalno.de` published from a scratch site (token in that scratch folder).

## v0.9 — official library set #1: Kinetic Grotesk

- `library-sets/kinetic/`: style (paper/ink/acid, Syne + Inter, display/mega/statement sizes, grain, focus, reduced-motion kill switch), 8 dynamic blocks (`prepress/kinetic-marquee|display|index-row|label|stat|wordmark|shape|pill`, CSS namespaced, pure-CSS motion behind reduced-motion + `@supports` guards), 10 patterns + header/footer, template *Kinetic Studio* (Home, Work, Studio, Contact). `buildLibrarySet()` turns it into a site and 20 library drafts with lineage.
- Library API: `uses` (validated ids, max 30) and `official` (moderate action `official|unofficial`); item pages show **Built with** / **Used in**; library list has a **By Prepress** filter and badges (also in the editor's Library dialog and MCP `library_search`). Moderators skip the publish rate limit (`x-admin-token`), official items can't be hidden by reports.
- `scripts/seed-library.ts` publishes a set bottom-up (idempotent), `scripts/qa-set.ts` renders pages/items with headless Chrome (reduced motion by default; `server/screenshot.ts` got a `reducedMotion` option).
- Renderer fix: navigation keeps its typography/colour styles and font-size class on `<nav>` and `<ul>` (were dropped; the theme's `.wp-block-navigation` rule also hit the `<ul>`). Re-publish sites to pick it up.
- Live: 20 official items on /library (template `pdmcvfg8tt`), demo published to `kinetic-studio.prepress.digitalno.de` from a scratch site (its hosting token lives in that scratch folder; release the name if not wanted).
- Follow-ups: more sets (Night Garden, Paper Edition), official templates in the New-site dialog, a mono font slot.

## v0.8 — library + homepage (prepress.digitalno.de)

- **Homepage** (`hosting/pages.ts`, served by the hosting API): logo, explanation, cards for Web version (coming soon until `WEB_URL` is set), Desktop app (`DOWNLOAD_MAC_URL` → the latest GitHub release's `Prepress-mac-arm64.dmg`; its version is read from that release's `latest.json`), Library; note about `*.prepress.digitalno.de`.
- **Library** at `/library` (`hosting/library.ts`): types template/pattern/block/style; publish/update/delete owned by the site token (SHA-256 stored); search, type filter, sort by imports; previews (`/library/preview/:id`) with `sandbox` CSP, framable only by the library and local Prepress editors; reports (3 distinct visitors hide an item); moderation with `LIBRARY_ADMIN_TOKEN` (`POST /api/v1/library/items/:id/moderate {admin, action: hide|unhide|delete}`); limits: 1.5 MB payload/preview, 10 publishes/hour/IP.
- **Prepress:** `src/lib/library.ts` builds items (local /uploads images → placeholders, custom blocks travel with patterns) and imports them through the normalizer; Library dialog (Browse with live sandboxed previews, Share sections/pattern/template/block/style, Yours); MCP `library_search`, `library_import` (template import backs up the draft and carries the brief), `library_share`.
- **Security fix found on the way:** rich-text attributes weren't sanitized (AI output could carry `<img onerror>` into the site and the editor canvas). `src/lib/wp/inline.ts` now keeps only editor inline formatting, everywhere content is normalized.
- **Desktop fix:** removed the `on_navigation` guard (it cancelled and opened every iframe — embeds, library previews — in the browser).
- Verified: `tests/library.test.ts` (round trips, hostile items, API ownership/reports/moderation, page escaping, MCP end to end).

## v0.7 — free hosting at *.prepress.digitalno.de (live)

- **Infra (live):** Scaleway project "Prepress" (isolated from the other projects), bucket `prepress` (fr-par) with a bucket policy: public `GetObject` only (no listing), writes only for IAM application `prepress-hosting` (ObjectStorageFullAccess scoped to that project) and the org owner. Server `prepress` 95.217.217.146 (Ubuntu 26.04): Caddy 2.11.7 (official repo), `prepress-hosting.service` (DynamicUser, sandboxed, 127.0.0.1:8787), ufw 22/80/443. DNS (Cloudflare, DNS-only): `prepress.digitalno.de` and `*.prepress.digitalno.de` → 95.217.217.146. Let's Encrypt via on-demand TLS gated by `/api/v1/tls-ask`.
- **API** `hosting/api.ts` (+`presign.ts`, `names.ts`, `main.ts`): claim (first come; token SHA-256 stored), availability (owner-aware with `x-site-token`), presign (path/type allowlist, 25 MB/file, 250 MB & 2000 files/site, signed content-type/length/cache-control; Scaleway rejects a different length), delete, release, tls-ask, notfound (site's 404.html with status 404). Claims rate-limited per IP.
- **Client:** target `prepress://name`; token per site folder in `<data>/hosting-token`; Publish dialog card "Free on prepress.digitalno.de" with live check (`GET /api/hosting/check` → API with the site token).
- **Verified live:** claimed and published `https://harbor-bakery.prepress.digitalno.de` from a local binary (pages 200, clean-URL redirect, custom 404 with status 404, query strings/`?acl` neutralised, no S3 headers, HSTS); unclaimed names get no certificate; a second site folder sees the name as taken. Tests: `tests/hosting.test.ts` (presign vs AWS example, API rules, end-to-end publish via a local API + S3 stand-in).
- Open: no moderation/abuse reporting yet; `sites.json` isn't backed up; cookies are shared across *.prepress.digitalno.de (sites can set cookies for siblings — consider adding the domain to the Public Suffix List); `harbor-bakery` is a real claimed demo (release it with the token in the test site folder if unwanted).

## v0.6.5 — media import, AI screenshots

- **External media are always copied into the media library.** `src/lib/wp/media.ts` finds media URLs in block attributes (image url, cover url, media-text mediaUrl, video/audio src/poster, custom-block `image` attributes) and rewrites them via `serialize()`. `server/media.ts` downloads: http(s) only, no credentials, every hop must resolve to a public IP (no localhost/LAN/link-local/metadata), ≤5 redirects, 30 s, 50 MB, type by magic bytes (PNG/JPEG/GIF/WebP/AVIF/MP4/WebM/MP3/PDF; SVG/HTML refused), deduped by content hash, URL→file index in `<data>/media-imports.json`. Used by: MCP writes (`change()` downloads first, outside the lock; results in `media.imported/failed`), MCP `import_media` / `list_media`, editor `MediaLocalizer` → `POST /api/media/import` (inserted/pasted images), errors shown as a banner. Normalizer now keeps `/uploads/…` URLs (was replacing them with placeholders) and gives covers with an image a 50% overlay like the WP editor.
- **`view_page`** MCP tool: screenshot of the current draft (desktop 1280 / tablet 820 / phone 390; whole page scaled to ≤4000 px, or one section at full size, or first screen) + section list; headless Chrome/Edge/Chromium/Brave over `--remote-debugging-pipe` (`server/screenshot.ts`). ~1.5 s per shot.
- Verified: `tests/media.test.ts` (SSRF guards, redirects, dedupe, type checks, rewrite validity, MCP + editor API), `tests/viewpage.test.ts` (real Chrome: sizes, section clip, phone); compiled binary over stdio: real images from Unsplash, Picsum (redirects) and Wikimedia imported, screenshots returned; in the browser: Image block → Insert from URL (Unsplash) → replaced by `/uploads/…`, saved draft has no external link. Known: DNS is checked before the request, so a hostile DNS server could still rebind between check and fetch (acceptable for a local app; pin the IP if this ever runs as a shared service).

## v0.6.4 — one-click connect to local AI apps

- Desktop app → Settings → AI connection lists Claude Desktop, Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, LM Studio, Hermes (installed ones first) with **Connect / Disconnect / Update** (`server/clients.ts`, `POST /api/mcp/clients`). Entry `prepress-<site folder>` → this site's `prepress mcp` (the app's bundled binary). Formats: JSON `mcpServers` (Claude Desktop, Cursor, Windsurf, LM Studio), `~/.claude.json` user-scope `mcpServers` with `type: stdio` (Claude Code), VS Code `User/mcp.json` `servers` with `type: stdio`, Codex `~/.codex/config.toml` `[mcp_servers.<name>]`, Hermes `~/.hermes/config.yaml` `mcp_servers:`. Surgical edits, `.before-prepress` backup, JSONC refused. "Other apps / set up by hand" keeps the copyable JSON and command.
- Verified: `tests/clients.test.ts` (every format: adds next to existing entries, keeps comments/other tables, idempotent, outdated detection, undo restores the file byte-for-byte; TOML checked with Python tomllib, YAML with `yaml`); API test in desktop runtime; on this Mac the panel detected 6 installed apps and read all their configs without problems. Not done: actually clicking Connect against the real configs on this Mac (that edits the owner's files — left for the owner).

## v0.6.3 — Publish dialog, Settings window

- **Publish** button opens `src/ui/PublishDialog.tsx`: tick targets (defaults = targets marked "Selected by default", formerly `auto`), Publish → per-target result; with no targets it starts on the connection form (Test, Save target) or "Only render locally". API: `POST /api/publish {targets: [ids]}`; MCP `publish_site {targets?}` (names). `deployer.deploy` accepts a list.
- Gear opens `src/ui/SettingsDialog.tsx`: Site (title, tagline, brief) · Publishing (`DeployPanel`, form extracted as `TargetForm`) · AI connection (`McpPanel`) · Data (open site.json, sample site, blocks used). The sidebar toggle is its own icon (PanelRight). Sidebar "Site" tab → "Pages" (pages, site blocks, patterns).
- Verified: test for chosen/default/none targets over HTTP and MCP; in the browser: Publish with no targets → folder target saved from the dialog → published and uploaded (4 files) with a per-target ✓; Settings → Publishing lists it.

## v0.6.2 — AI only through MCP; MCP by runtime

- Removed the editor's AI: AI tab + SectionsPanel (per-section instructions), "Describe it (AI)" in New site, AI page-writing on Add page, the `/api/claude` Anthropic proxy, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`. AI clients work over MCP. The site brief is now an editable field in the Site tab (MCP reads/writes it).
- Runtime detection: the desktop app starts the server with `PREPRESS_APP=desktop` → `runtime: 'desktop'`: Site tab shows only the stdio setup (Claude Desktop JSON + Claude Code command pointing at the app's bundled binary) and HTTP `/mcp` is off (404). The standalone binary → `runtime: 'server'`: Site tab shows only the HTTP endpoint + token. `/api/health` reports `runtime`.
- Verified: tests (desktop/server `/api/mcp` + `/mcp`, proxy gone); browser (server mode: tabs Page/Block/Styles/Site, HTTP panel); desktop app: `/api/mcp` = stdio, `/mcp` 404, and an MCP client started the app's bundled `prepress mcp` from the advertised command (32 tools, read the site).

## v0.6.1 — starter templates

- `src/lib/starters.ts`: **Blank** + 8 starters (local business, restaurant & café, portfolio, studio/agency, product/SaaS, consultant & coach, event/conference, nonprofit). Built from section patterns through `sectionsToMarkup`, `{name}` filled in, each with a `brief` saved as the site brief (+ the user's one-line "what is it about").
- New-site dialog (`NewSiteDialog.tsx`): Templates tab (live thumbnails via `renderPage` in scaled sandboxed iframes, name + about fields) and the AI "Describe it" tab. A fresh site folder opens with the Blank placeholder (`isSample`) and the picker, name defaulting to the folder name (`/api/health` → `folder`). `isSample` now clears on the first real edit, so an AI's `create_site` can't silently replace user work.
- MCP: `list_starters`, `create_site {name, starter, brief, design?, replace?}` (default starter "blank"; `pages` without a starter still makes empty pages), `set_brief`; `get_site` returns `brief`. 32 tools.
- Verified: tests (every starter valid/linked; MCP create-from-starter); in the browser: fresh folder → picker with folder name → Restaurant template → 108 valid blocks, brief saved; placeholder stays a placeholder until the first edit.

## v0.6 changes (read first) — new direction

Owner's direction (2026-10-15): Prepress is **the interface for creating a site**, used as a **local app** (later also hosted at prepress.digitalno.de). Site data stays local until the user **publishes** static files over SFTP / S3 / other connections, or **exports** a WordPress zip. No passwords.

- **Password removed** everywhere (server sessions, `/api/login`, Login screen, `admin-password.txt`, `--password`, `--no-auth`, `--host`). Replaced by: listen on 127.0.0.1 only, `Host` header must be loopback (421 otherwise — DNS rebinding), Origin check on writes. Old `admin-password.txt` / `sessions.json` files in existing data folders are simply ignored.
- **Publish targets = connection strings** (`server/targets/`): `sftp://` via ssh2 (pure JS, replaces the system `sftp` batch; password, agent or key; TOFU host-key pin per target), `ftp://`/`ftps://` via basic-ftp, `s3://` with a hand-written SigV4 (AWS, R2, MinIO, Spaces …), folders. Secrets only in `<data>/deploy.json` (0600), masked in every response; `MASK` sent back keeps them. UI: Site → **Publish to** (one connection field + templates, Test, Save, plain-FTP warning).
- **Desktop app** `desktop/` (Tauri 2, Rust): launcher (create site in `~/Documents/Prepress/<name>`, open folder, recent sites), native menus (Sites…, New Site…, Open Site Folder…, Show Site Folder, Open Preview in Browser), external links → system browser, downloads → `~/Downloads` + reveal, server killed on quit (and exits by itself if the app dies: `PREPRESS_PARENT_PID`). `npm run build:desktop` → `.app` + `.dmg` (macOS); build on Windows/Linux for those. Signed + notarized with a Developer ID; updates itself from the latest GitHub release's `latest.json` (since 0.7.2; 0.6.2–0.7.1 were moved there through the bucket's old `_downloads/latest.json`; 0.6.1 and older need one manual download). Release: build with the signing env, then `scripts/release-desktop.ts` (GitHub release via `gh`).
- Tests: `tests/deploy.test.ts` runs full publishes against an in-process SFTP server (ssh2 `Server`, `tests/fixtures/sftp-server.ts`), a minimal FTP server (`tests/fixtures/ftp-server.ts`), a signature-checking S3 stand-in, and a folder; SigV4 checked against AWS's two published examples; connection-string parsing/masking. `tests/server.test.ts` checks the Host guard.
- Verified by hand: compiled binary → real OpenSSH (key auth) publish + Test (shows pinned host key); the editor's Publish-to form (templates, plain-FTP warning, connection error message); the desktop app opens a site straight into the editor (no login), the launcher renders with no recent sites, quitting stops the server.
- Not verified: real AWS S3 / R2 (no credentials here; signing matches AWS's vectors), FTPS against a real server, the desktop app on Windows/Linux, "Create site" click in the app (would write to ~/Documents).
- Open for the hosted version (prepress.digitalno.de): where site data lives, how a hosted service uploads (SFTP from the server; only S3-style storage can be written from the browser), auth.

## v0.5 changes

- **Local MCP over stdio**: `prepress mcp --data <dir> [--out <dir>] [--site-url <url>]` (`server/stdio.ts`). Same tools as HTTP `/mcp` via `mcpServerFactory()`; HTTP and stdio both build on `createSiteCore()` (split out of `createHandler`). `--data` is required in this mode (clients start it from an unknown cwd). stdout is JSON-RPC only (`server/stdio-guard.ts`).
- **Shared data folder across processes**: `DraftStore` writes take a lock file (`draft.lock`, stale after 60 s); publish/deploy take `publish.lock`. `store.watch()` (editor server) polls `draft.json` and emits SSE `change` for writes by another process, so an open editor shows "Updated by AI" and reloads. Drafts now store `summary` of the last MCP write.
- New MCP tool **`create_site`** `{name, tagline?, pages?, design?, replace?}` (30 tools): a fresh folder no longer needs the editor opened first. `replace: true` backs up the old draft to `<data>/backup/draft-<time>.json`. `export_wordpress` now also returns `localPath`.
- Editor Site tab → AI connection shows the stdio command for Claude Code and a Claude Desktop config (`GET /api/mcp` → `stdio`, computed in `server/main.ts`; null in `npm run dev`). Startup log prints it as "Local AI".
- `server/version.ts` holds the version (0.5.0).
- Verified: `tests/stdio.test.ts` (create_site on an empty folder → fill → publish → export; cross-store change event; 20 concurrent writes from two stores serialized). By hand with the binary: SDK `StdioClientTransport` spawning `bin/prepress mcp` while `bin/prepress` served the same folder: create/edit/publish over stdio deployed to a local folder and a real OpenSSH SFTP server; the server's `/api/events` emitted `{by:"mcp"}`; the open editor showed "Updated by AI" and the new title; the command shown in the Site tab works as-is.
- Direction from the owner: Prepress should become a **local app** (run on your computer, publish to a remote host). Pieces in place: local editor, stdio MCP, SFTP deploy. Missing for an app: packaging (tray/desktop wrapper or `prepress` opening the browser), a site switcher over several data folders, SSH key onboarding in the UI, FTP/SFTP-password hosts.

## v0.4 changes

- **Deploy targets** (`server/deploy.ts`): Publish writes `--out` (staging, previewed at `/`), then copies it to every `auto` target: `folder` (local dir) or `sftp` (system OpenSSH `sftp -b` batch, `BatchMode=yes`, `accept-new`, user's keys). Per-target hash manifest in `<data>/deploys/<id>.json` → only changed files upload, only our files get removed, foreign files backed up to `<data>/backup/<id>-<time>/`. Config `<data>/deploy.json`, validated by `cleanTarget` (no option injection via host, no quotes in batch paths, folders can't overlap `--data`/`--out`).
- API: `GET/PUT /api/deploy`, `POST /api/deploy` `{target?, full?}`, `POST /api/deploy/test`. Publish responses carry `deploys[]`. MCP: `publish_site {deploy?}` deploys; new `deploy_site {target?, full?}` (29 tools). MCP can't edit targets.
- UI: `src/ui/DeployPanel.tsx` in the Site tab (list, status, Deploy now, add/edit/test/remove).
- **Header/footer in the page editor** (`src/ui/editor/templateAreas.tsx`): like WordPress's "Show template", the page canvas shows header, page content and footer; header/footer edit in place (site-wide, marks the part custom) via editor-only area wrapper blocks that are split back on save. List view shows Header / Page content / Footer. Status-bar toggle. Header/Footer tabs still edit a part alone.
- Fixed: the first edit after load reloaded the canvas iframe (settings rebuilt on every content change via `info.pages` and `site.blocks ?? []`), dropping keystrokes.
- Fixed CLI parsing: `--no-auth --mcp-token x` used to swallow `--mcp-token` as the value of `--no-auth`.
- Verified: `tests/deploy.test.ts` (folder + `tests/fixtures/fake-sftp.mjs` stand-in), and by hand against a real OpenSSH sshd: MCP publish → SFTP + folder, incremental redeploy (0 uploaded), deleted page removed remotely, placeholder backed up, editor panel add/test/save/deploy, Publish button deploying to 3 targets.

## v0.3 changes

- **MCP server** (`server/mcp.ts`, `/mcp`, stateless Streamable HTTP, bearer token in `<data>/mcp-token.txt`). 28 tools: read (site, page, part, theme.json, block catalog, validate), pages/sections, header/footer, site info, design, theme.json patch, custom blocks, patterns, publish, export. Every write: store (rev + SSE) → normalize → serialize → validation report.
- **Headless engine**: the server now runs the editor's lib (`src/lib/engine.ts`, bundled by Vite SSR) under jsdom. Publish renders on the server (`POST /api/publish` with no body); `POST /api/export` builds the WP zip into `<data>/exports/`.
- **Custom blocks** (`wp/customBlocks.ts`): dynamic `prepress/*` blocks with typed attributes + sanitized template; generic editor UI (`ui/editor/customBlockEdit.tsx`); exported as theme blocks (`wp/wpBlocks.ts`). TS/JS/PHP template parity is tested.
- **Patterns**: `site.patterns`; unsynced → inserter "Site patterns" + theme `patterns/*.php`; synced → `core/block {ref}` with ids ≥ 5000, WXR `wp_block` items, edited in their own editor view.
- **theme.json patch**: `site.themeJson` deep-merged in `buildThemeJson`; preview CSS reads the merged presets.
- **Concurrency**: `server/store.ts` (rev, mutex), editor 409 → reload, `/api/events` SSE → live reload with a toast; undo brings back the editor's previous state.
- Verified: `npm test` 35/35 (adds custom blocks incl. PHP parity, theme.json, MCP end-to-end), `npx tsc` clean, binary built and driven by an external MCP client with the editor open (live update, custom block inspector, synced pattern edit, server publish).
- **Not verified**: the exported theme in a real WordPress (custom blocks' render.php/editor JS, synced pattern id preservation by the importer). Do PLAN M1 (Playground) next. Block icons are dashicon names; Prepress's editor doesn't load the Dashicons font, so they show blank there (fine in WordPress).


## v0.2 changes (read first)

- **Renamed** Blockwright → Prepress everywhere (package, UI, export generator strings, `site.json` format `prepress/site@1`, localStorage key, `data-pp-*` preview attributes).
- **Binary + server.** `server/app.ts` is one HTTP handler used by both `npm run dev` (Vite middleware) and the Bun-compiled binary (`server/main.ts`, `npm run build:bin`). `/?admin=1` → editor; `/` and `/<slug>/` → the published site; `/uploads/*` → media; `/api/*` → draft, publish, media, login, Claude proxy. Data dir: `draft.json`, `published/pages/*.html`, `published/site.json`, `uploads/`, `admin-password.txt`, `sessions.json` (hashed tokens). Password is generated on first run unless `--password`/`PREPRESS_PASSWORD`/`--no-auth`. Binds 127.0.0.1 by default.
- **Gutenberg editor.** `src/ui/editor/Editor.tsx` embeds `@wordpress/block-editor` (canvas iframe, inserter with our patterns, list view, inspector, breadcrumb, format library) on each page's `post_content`. The old section list is now the "AI" sidebar tab and stays in sync with editor selection (`SelectionSync`). Code mode edits markup directly (re-parsed + re-serialized). Media library = `editor.MediaUpload` filter backed by `/api/media`.
- **Publish model.** The browser renders each page with `renderPage()` and posts the HTML; the server only stores and serves files. The server never runs WordPress packages.
- **Verified:** `npm test` 14/14 (adds server + inserter-pattern tests), `npx tsc` clean, binary built for 5 targets, headless check of login → edit text in canvas → autosave → publish → public page shows the edit.
- **Not verified:** real AI (still no key in this environment), Windows/Linux binaries were cross-compiled but not run, image upload exercised by tests only (not through the editor UI).
- **Header/footer editing** (v0.2.1): Header and Footer tabs in the top bar open the part in the same editor. First edit marks the part custom (`site.custom`); custom parts survive restyles/renames, and their menu links follow page add/rename/remove (custom labels are kept). "Reset to automatic" in the sidebar discards edits. Dynamic blocks there use our own edit components (`src/ui/editor/dynamicBlocks.tsx`); link search suggests the site's pages. Tests: `tests/parts.test.ts`.
- **Static output** (v0.2.2): Publish writes `index.html` / `<slug>/index.html` / `404.html` / `uploads/` into `--out` (default `<data>/public`), for a web server or hosting panel on 80/443 while Prepress runs on another port only for editing. `--site-url` sets "View site" links. See `docs/DEPLOY.md`.
- Admin UI is light-only (`data-theme="light"` on `<html>`): WordPress components have no dark theme.


---

## 1. The product in one paragraph

Prepress is an AI website builder whose native file format is **WordPress Gutenberg block markup**. A user describes their business, the AI plans the pages and the visual style, writes each page, and the user can then edit sections by giving instructions in plain language. When the user is ready to move to WordPress, they export a zip containing a **block theme** (`theme.json`, templates, header/footer template parts) and a **WXR import file** with all pages. Because the content was WordPress block markup all along, the move is a copy, not a conversion. The pitch: "start fast with AI, never locked in."

## 2. Origin and the decisions already made

The project started from a brainstorm with the owner. These decisions were made there and should be treated as settled unless the owner says otherwise:

| Decision | Choice | Why |
| --- | --- | --- |
| Source of truth | Serialized block markup (`post_content`) | Any internal format converted later drifts and loses fidelity. With markup as the format, export is a copy. |
| Architecture | **Option A**: own stack + Gutenberg's npm packages (`@wordpress/blocks`, `@wordpress/block-library`) running outside WordPress | Most product freedom. Option B (WordPress under the hood) inherits WP's hosting/UX constraints. Option C (own format + converter) was rejected for the drift reason. WordPress Playground is still planned as a *verification* tool (PLAN.md M1). |
| How the AI produces content | The model returns **JSON block trees or pattern calls**, never HTML | Gutenberg validates saved HTML against each block's `save()` output. LLM-written HTML triggers "This block contains unexpected or invalid content". Serializing with Gutenberg's own `serialize()` makes output valid by construction. |
| Layout quality | A curated **pattern library** the AI picks from and fills | LLMs make mediocre layouts from raw columns/groups but are good at choosing and filling good patterns. |
| Styling | Design tokens in `theme.json`; blocks reference **preset slugs** (`backgroundColor: "primary"`) | A global restyle is one theme.json edit, here and later in the WordPress Site Editor. |
| Block set | **Core blocks first; block styles for looks; custom `prepress/*` blocks only for art, interactive or effect wrappers** (`docs/THEME-SYSTEM.md`) | Content stays editable core blocks in any WordPress; looks are `is-style-*` the user can switch off; custom blocks ship in the theme or a companion plugin (export choice). |
| WordPress version | **Pinned to 7.0** | Block markup and attributes change between releases (e.g. 7.0 moved heading/paragraph `textAlign` into `style.typography.textAlign`). Pinning makes output match one editor exactly. |

## 3. Current status

### Works (verified)

- Generate a 3–5 page site from a brief: plan → design tokens → pages written two at a time.
- Sample site (bakery "Fern & Ember") loads with no AI, so everything except generation is testable offline.
- Click a section in the preview to select it; edit it with an instruction; add a section; reorder; delete; undo/redo (in memory).
- Styles panel: 6-color palette, heading/body fonts, corner radius, content/wide widths. Restyling regenerates placeholder images in the new palette and repairs text/background pairs whose contrast drops below 3:1.
- Site panel: rename site/tagline, add/remove pages (AI writes new pages), open a previously exported `site.json`.
- Block markup view: page content, header/footer parts, page template, theme.json.
- Export zip: block theme zip, `content.xml` (WXR), `site.json`, static HTML per page, README with import steps.
- Status pill runs WordPress's block validator on every change ("WP 7.0 · N blocks · all valid").
- **Tests: 6 passing** (`npm test`). They check, with Gutenberg's own validator:
  - all 15 patterns × 3 background tones serialize to valid blocks with no dropped attributes;
  - the full sample site, header, footer and all templates are valid;
  - deliberately messy AI output (wrong attribute names, button outside `core/buttons`, unknown block, missing image URL) is repaired into valid markup;
  - the full AI pipeline (plan → pages → section edit) using a fake model that answers like Claude, including fenced JSON;
  - render, restyle, section replace, and the export zip structure (theme files present, theme.json version 3, zero invalid blocks).
- Built app checked in headless Chromium at 1440px and 400px wide: renders, section selection works, no horizontal overflow on phones.

### Not verified yet (be honest about these)

1. **Real AI calls were never run.** The build environment could not reach Claude. Prompts are untested against a real model. Expect to tune `src/lib/ai/prompts.ts` after the first real runs (JSON shape compliance, section counts, copy quality).
2. **The export has not been imported into a real WordPress install.** Validity is proven with the same JS validator the editor uses, which is strong evidence but not proof. PLAN.md M1 automates this with WordPress Playground. Do this first.
3. The preview renderer (`src/lib/wp/render.ts`) is a JavaScript port of a subset of what WordPress does in PHP. It has not been diffed against the real front end. Known gap: no mobile navigation overlay.

### Known limitations

- Images are SVG placeholders stored as data URIs (also in the export).
- Fonts load from Google Fonts (enqueued in the exported `functions.php`); not self-hosted.
- Navigation is inline links in the header part, not a `wp_navigation` post.
- No forms (core WordPress has none), no blog posts, no SEO meta.
- Persistence is a localStorage draft in one browser plus the exported `site.json`. No backend, no accounts.

## 4. How to run it

Requirements: Node 20+ (built with Node 22), npm 10+.

```bash
npm install
npm test          # ~30 s, must stay green
npx tsc           # typecheck, must be clean
npm run dev       # http://localhost:5173
npm run build     # dist/index.html (single file) + dist/prepress.html (claude.ai artifact format)
```

AI in local dev: create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5-5    # optional; the default
```

The Vite dev server exposes `GET /api/health` and `POST /api/claude {prompt}` → `{text}` (see `vite.config.ts`). The key never reaches the browser. Without a key, the app runs in demo mode (sample site, no generation).

### The three AI backends (`src/lib/ai/client.ts`)

`detectAI()` picks the first that works:

1. **claude**: the app is running as a claude.ai artifact. Uses `window.claude.use("sample")` → `sample.json(prompt)`, which runs on the viewer's own Claude account. Export uses `window.claude.use("downloads")` because artifacts can't trigger downloads directly.
2. **proxy**: local dev server with `ANTHROPIC_API_KEY`.
3. **demo**: no AI; generation buttons are disabled with an explanation.

For a production backend, add a fourth transport that calls your own server (PLAN.md M2) and keep the same `AI` interface: `json<T>(prompt, {signal}) → Promise<T>`.

## 5. How it works (the pipeline)

```
brief
  └─► planPrompt ──► {name, tagline, design{palette,fonts,radius}, pages[{title,slug,purpose,sections[]}]}
        └─► siteFromPlan(): sanitize design, slugs, build header/footer parts
              └─► per page (2 in parallel): pagePrompt ──► {"sections":[ pattern call | raw block tree ]}
                    └─► normalizeSections()   wp/normalize.ts
                    │     • expand pattern calls via wp/patterns.ts
                    │     • drop blocks not in the allowlist / not registered (keep their children or text)
                    │     • drop attributes not in that block's block.json; fix aliases (text→content, href→url…)
                    │     • wrap orphans (button→buttons, column→columns, list-item→list)
                    │     • move legacy textAlign into style.typography.textAlign
                    │     • give images on-palette SVG placeholders from their alt text
                    └─► toMarkup(): createBlock() + serialize()   ← Gutenberg's own code
                          └─► Page.content  (the source of truth)
                                ├─► renderPage()  preview (wp/render.ts)
                                ├─► validateMarkup()  parse + isValid, same as the editor
                                └─► exportSite()  theme zip + WXR + site.json + static (wp/export.ts)
```

Editing a section sends the section's current block tree (defaults and data URIs stripped by `markupToNodes(markup, true)`) plus the instruction, and gets back one section. Sections are the **top-level blocks** of a page; `splitSections`/`joinSections` move between the two.

### Preview renderer (`wp/render.ts`)

Static blocks' saved HTML is passed through untouched. At render time it adds what PHP adds on a real site:

- layout classes and per-container CSS (`is-layout-constrained`, `wp-container-…`), like `wp_render_layout_support_flag`;
- dynamic blocks: `core/site-title`, `core/site-tagline`, `core/navigation` + `navigation-link`, `core/post-title`, `core/post-content`, `core/template-part`;
- global styles CSS compiled from the same theme.json that is exported (`compileGlobalStyles` in `wp/design.ts`), plus `@wordpress/block-library`'s `style.css`.

It renders the page through `templates().page`, the same template that ships in the theme. Section wrappers get `data-pp-section` attributes and a small script posts click/navigation messages to the app.

## 6. File map

| File | Lines | What it does |
| --- | --- | --- |
| `src/lib/types.ts` | 66 | `Site`, `Page`, `Design`, `BlockNode`, `SitePlan`, `TARGET_WP_VERSION` |
| `src/lib/site.ts` | 193 | Site operations: create from plan, set/replace/insert/move/remove sections, add/remove pages, `applyDesign` (restyle + contrast repair), section labels |
| `src/lib/wp/registry.ts` | 18 | `ensureBlocks()` → `registerCoreBlocks()` once |
| `src/lib/wp/normalize.ts` | 238 | AI JSON → valid block tree. `AI_BLOCKS` allowlist, `PART_BLOCKS` for header/footer |
| `src/lib/wp/markup.ts` | 90 | `toMarkup`, `markupToNodes`, `splitSections`, `joinSections`, `validateMarkup` |
| `src/lib/wp/patterns.ts` | 570 | 15 patterns (`PATTERNS`), helpers (`section`, `card`, `grid`, `buttons`), `buildHeader`, `buildFooter`, `patternCatalogForPrompt` |
| `src/lib/wp/design.ts` | 387 | Fonts, default design, color math, presets, `buildThemeJson`, `compileGlobalStyles` |
| `src/lib/wp/render.ts` | 330 | Preview renderer (see §5) |
| `src/lib/wp/templates.ts` | 70 | `page`, `single`, `index` templates built as block trees |
| `src/lib/wp/placeholders.ts` | 34 | On-palette SVG placeholder images |
| `src/lib/wp/export.ts` | 236 | `exportSite`, `buildWxr`, theme `style.css`/`functions.php`/README generation |
| `src/lib/ai/prompts.ts` | 122 | `planPrompt`, `pagePrompt`, `editSectionPrompt`, `addSectionPrompt` |
| `src/lib/ai/client.ts` | 114 | Transports, `extractJson`, `friendlyError` |
| `src/lib/ai/generate.ts` | 80 | `generateSite`, `editSection`, `newSection`, `writePage` |
| `src/lib/ai/demo.ts` | 195 | Sample brief, plan and pages (pattern calls) |
| `src/ui/App.tsx` | 537 | App state, undo/redo, actions, layout |
| `src/ui/Preview.tsx` | 66 | iframe preview, device widths, scroll keeping, postMessage bridge |
| `src/ui/SectionsPanel.tsx` | 151 | Section list, edit/add with AI, move/delete |
| `src/ui/DesignPanel.tsx` | 109 | Palette, contrast checks, fonts, radius, widths |
| `src/ui/SitePanel.tsx` | 131 | Site name, pages, block usage stats, open `site.json` |
| `src/ui/MarkupView.tsx` | 68 | Highlighted markup / theme.json viewer |
| `src/ui/NewSiteDialog.tsx` | 57 | Brief input with examples |
| `src/ui/styles.css` | — | App styles; light and dark themes via tokens |
| `src/stubs/vips.ts` | — | Stub for `@wordpress/vips/worker` (avoids bundling 13 MB of WASM) |
| `tests/roundtrip.test.ts` | 119 | Patterns, sample site, repair, render/restyle/export |
| `tests/ai-pipeline.test.ts` | 71 | Fake-model test of the full AI path |
| `scripts/artifact.mjs` | 24 | Converts the single-file build into a claude.ai artifact page |
| `vite.config.ts` | — | Vite + dev AI proxy + vitest config + vips alias |
| `docs/screenshots/` | — | What the app looks like (desktop, section selected, styles, markup view, phone) |

## 7. Rules that keep the output valid

These are also in `CLAUDE.md` / `AGENTS.md`. Breaking any of them will eventually produce invalid blocks in WordPress.

1. `Page.content`, `Site.header`, `Site.footer` hold **only** markup produced by `serialize()`.
2. Never hand-write block markup, including templates. Build `BlockNode` trees and call `toMarkup()` (after `normalize*` for anything that came from the AI).
3. `npm test` must stay green. Add a test when you add a pattern, block, or export file.
4. Colors, font sizes and spacing use preset slugs/`var:preset|…` values, never raw values.
5. Follow `docs/THEME-SYSTEM.md`: core blocks + block styles first; a custom block only for art, interactive or effect wrappers (`kind`), whose text is inner blocks.
6. All `@wordpress/*` packages are pinned through `overrides` in `package.json` to their `wp-7.0` dist-tag versions, and the four direct dependencies use the exact same versions (otherwise npm fails with `EOVERRIDE`). To move to a new WordPress version: get each package's `wp-X.Y` version with `npm view <pkg>@wp-X.Y version`, update overrides and direct deps, run tests, look for attribute moves, update `TARGET_WP_VERSION`.
7. Treat AI output as untrusted input: drop and report unknown blocks/attributes, never pass them through.

## 8. Gotchas found while building

- WordPress packages ship `import x from "./block.json"` without import attributes. Vitest needs `test.server.deps.inline: [/@wordpress/, /@ariakit/]` (already in `vite.config.ts`).
- `@wordpress/block-library` pulls in `@wordpress/vips` (13 MB WASM) through the media upload code. It's aliased to a stub; the bundle is about 4.4 MB.
- jsdom prints "Could not parse CSS stylesheet" during tests. It's noise from block-library styles, not a failure.
- With `useRootPaddingAwareAlignments`, root padding must be CSS variables, not `body` padding, or `alignfull` sections don't reach the edges. `compileGlobalStyles` handles this.
- Layout classes (`is-layout-*`) are added at render time, never saved in markup. Don't put them in content.
- Dynamic blocks save as self-closing comments. If you add one to a template or part, add a case to `renderDynamic` in `render.ts`.
- Section names come from `metadata.name`, which `serialize()` JSON-escapes (`&` → `&`); `sectionLabel()` unescapes it.
- Bundled libraries contain a literal U+FFFD character; `scripts/artifact.mjs` escapes it because the artifact publisher rejects it.
- Artifacts can't download files via `<a download>`; the app uses the `downloads` capability there and a normal link elsewhere.

## 9. What to do next (in order)

Each item is sized for one working session. Acceptance criteria are in brackets.

1. **Run real AI once and tune prompts.** `npm run dev` with a key; generate 5 sites from different briefs (the examples in `NewSiteDialog.tsx` are a good start). Fix prompt issues in `prompts.ts`, add normalizer repairs for any new mistake patterns with a test case. [5/5 briefs produce a complete site with 0 invalid blocks and no `#` links.]
2. **PLAN.md M1: verify in real WordPress** with `@wp-playground/cli`: install theme, import WXR, open each page in the editor headlessly, assert no block warnings, screenshot the front end. Wire into CI. [Script exits 0 for the sample site and one generated site.]
3. **Diff the preview against the real front end** (from step 2's screenshots) and close the biggest gaps in `render.ts`, starting with the mobile navigation overlay.
4. Then follow PLAN.md: M2 backend and persistence, M3 edit operations and inline text editing, M4 media, and so on.

Before step 4, ask the owner the open questions at the bottom of PLAN.md (first customer, WordPress version policy, custom blocks, navigation storage). Their answers change the order of the roadmap.

## 10. Context about the owner and environment

- Owner: Trajche Kralev. The brainstorm and v0.1 were done with Claude in claude.ai; a test build was published there as a private artifact.
- The repo has git history (`git log`). No remote is configured; add one before pushing.
- `node_modules/` and `dist/` are not included in the zip. Run `npm install` and `npm run build`.
