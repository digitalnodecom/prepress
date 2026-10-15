# HANDOFF — start here

This file is for the next agent or developer picking up this project. It explains what the project is, why it is built this way, what works, what is unverified, and exactly what to do next. Read this file first, then `CLAUDE.md` (working rules, same content as `AGENTS.md`), then `PLAN.md` (roadmap).

Last updated: 2026-10-14 · Version: v0.3 · Target: WordPress 7.0

## v0.4 changes (read first)

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
| Block set | **Core blocks only** | Guarantees the export works on any vanilla WordPress install with no plugin. |
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
5. Core blocks only in content. Adding a custom block means shipping a plugin with the export; ask the owner first.
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
