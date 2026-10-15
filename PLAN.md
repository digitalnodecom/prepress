# Prepress — roadmap

Status: **v0.3** — MCP server, custom blocks, patterns, theme.json editing. **v0.2** — standalone binary, Gutenberg editor, self-hosted site. Earlier: **working prototype (v0.1).** Generate a multi-page site from a brief, edit sections with AI, restyle via theme.json tokens, export a WordPress 7.0 block theme + WXR. All output passes Gutenberg's block validator.

Each milestone below is sized to be picked up as one Claude Code session. Keep `npm test` green throughout (see CLAUDE.md).

---

## M1 — Prove the export in a real WordPress (do this first)

The tests validate markup with Gutenberg's JS validator. Next, confirm the end-to-end import in actual WordPress.

- [ ] Add `scripts/playground-check.mjs` using `@wp-playground/cli`: boot WP 7.0, install the exported theme zip, import `content.xml`, then for each page load `/wp-admin/post.php?post=ID&action=edit` headlessly and assert no `.block-editor-warning` elements. Also screenshot the front end.
- [ ] Add it to CI (GitHub Actions) on every PR.
- [ ] Diff the preview renderer against the real front end: render each demo page in Playground and in `renderPage()`, compare screenshots, fix gaps in `wp/render.ts` (navigation overlay on mobile is a known gap).
- [ ] Generate a `blueprint.json` in the export so "Open in WordPress Playground" works with one click.

## M2 — Persistence and a real backend

v0.2 ships a single-site file-backed server (`server/app.ts`): draft autosave, publish, media uploads, password login. What remains:

- [ ] Backend (Hono/Next API routes + Postgres). Tables: `sites`, `pages` (markup), `revisions`, `assets`.
- [ ] Move AI calls server-side (keeps keys private, enables streaming, rate limits, usage metering).
- [ ] Store markup revisions per page; undo history from revisions instead of in-memory snapshots.
- [ ] Auth + multiple sites per user.

## M3 — Editing depth

- [ ] **Edit operations instead of section regeneration.** Have the model emit ops (`update_attrs(path, attrs)`, `insert(path, node)`, `move`, `remove`) for small edits so untouched copy can't drift. Keep whole-section replace for structural changes.
- [ ] **Inline text editing** in the preview (contenteditable on text blocks, mapped back to block attributes by path).
- [x] **Embed the real block editor** — done in v0.2: it is now the main editing surface.
- [x] Pattern picker without AI — the inserter's Patterns tab (`wp/inserterPatterns.ts`).
- [ ] Section variations ("show me 3 alternatives"), with side-by-side preview.

## M4 — Media pipeline

- [ ] Upload images (S3/R2), stock search (Unsplash/Pexels), and optional AI image generation per placeholder `alt`.
- [ ] Export: put media into the WXR as `attachment` items with `wp:attachment_url`, rewrite block `url`/`id` attributes so the importer sideloads them into the media library.
- [ ] Self-host fonts: download Google Fonts into the theme (`assets/fonts`) and declare `fontFace` in theme.json (removes the `functions.php` enqueue; GDPR-friendly).

## M5 — Hosting before the move to WordPress

- [ ] Publish the static render (already produced in the export's `static/` folder) to a CDN with custom domains.
- [ ] Forms: core WordPress has no stable form block. Options: (a) ship a tiny companion plugin with a `prepress/form` block and a matching hosted endpoint, (b) map to a popular forms plugin on export. Decide before building.
- [ ] SEO basics: per-page title/description (exported as post meta via a small plugin or Yoast/RankMath meta keys), sitemap, OG images.

## M6 — Direct push to WordPress

- [ ] "Connect a WordPress site" with Application Passwords. Push theme + pages via the REST API (`/wp/v2/pages`, `/wp/v2/templates`, `/wp/v2/global-styles`) instead of a zip.
- [ ] Two-way sync is out of scope for v1. Treat the WordPress push as a one-way graduation, with a warning before overwriting.

## M7 — Quality of generation

- [ ] Grow the pattern library to around 40 patterns, each with 2–3 layout variants. Add a visual regression test per pattern.
- [ ] Evals: a set of 30 briefs × automatic checks (valid markup, contrast ≥ 4.5 on all text/background slug pairs, no `#` links, no lorem ipsum, section-count bounds), plus a human rating sheet.
- [ ] Brand input: logo upload → palette extraction; "match this website" URL → palette and fonts.
- [ ] Multilingual sites (Polylang/WPML-compatible export).

## Open questions

1. **Who is the first customer:** freelancers/agencies (want WP handoff) or small businesses (want hosting)? This decides the order of M5 and M6.
2. **WordPress version policy:** pin to the latest WP release, or let users choose a target (6.8 / 6.9 / 7.0) and re-serialize with that version's packages at export time?
3. **Custom blocks:** decided in v0.3 — site-defined dynamic `prepress/*` blocks shipped inside the theme. Open: move them to a companion plugin so they survive a theme switch?
4. **Header navigation:** inline links in the header part (current) vs. a `wp_navigation` post in the WXR (editable in the Site Editor's Navigation screen).

## Known gaps in v0.1

- Images are SVG placeholders (data URIs) in the export.
- Navigation has no mobile overlay in the preview (WordPress renders one).
- Undo history is in memory only; the draft autosaves to localStorage per browser.
- No forms, blog posts or SEO meta.
