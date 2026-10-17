# The Prepress theme system

What every Prepress site is made of, and the rules for making more of it. These rules hold
for people and for AI, for one-off sites and for the official library sets. They exist so a
site exported to WordPress stays **editable**: a user can still change colours, fonts, corners,
looks and content in the WordPress editor years later, without the person who made it.

`lintSet()` / `lintSite()` (`src/lib/setLint.ts`) check most of this. Library sets must pass
with zero findings. MCP `validate_site` reports the rest as `warnings`.

## The four layers of a site

| Layer | What it is | Where it lives | Where a user changes it |
|---|---|---|---|
| **Style** | design tokens, element/block defaults, block styles, a little site CSS | `site.design`, `site.themeJson`, `site.blockStyles` | Styles panel / WordPress Global Styles, a block's Styles picker |
| **Blocks** | WordPress core blocks + the site's own `prepress/*` blocks | `site.blocks` | Inserter, block settings |
| **Patterns** | one section each, built from blocks | `site.patterns` | Inserter → Patterns |
| **Template** | pages as ordered lists of patterns, plus header and footer | `site.pages`, `site.header`, `site.footer` | the page itself |

A library set (`library-sets/<set>/`) is the same four layers as source:
- `style.ts`: design, theme.json patch and block styles;
- `blocks.ts`;
- `patterns.ts`;
- `template.ts`.

All of them are built with `library-sets/kit.ts`.

## 1. Which block? Go down the ladder, take the first rung that works

1. **A core block and its own settings.** Colour, gradient, typography, spacing, border,
   shadow, min-height, drop cap, grid column span, `is-style-outline`: if the block's settings
   do it, use them. Everything here is editable in the block sidebar.
2. **A core block plus a block style.** Use one for a named look the settings can't express:
   - a dot leader between a dish and its price;
   - a photo printed like a plate;
   - a paper sheet with scalloped edges;
   - a row that scrolls sideways;
   - FAQ items as filled tiles;
   - a word set huge.

   Stored as `className: "is-style-<set>-<name>"`. The user sees it in the block's **Styles**
   panel and can switch it off. Without the style the block is still a plain, valid, readable
   core block.
3. **A pattern of core blocks plus block styles.** Use one for records and compositions:
   - menu item: a group "Leader" with name, price and a description paragraph;
   - opening hours, receipt, byline, stat, index row, price capsule, reservation card,
     masthead.

   Text stays inline-editable like any paragraph.
4. **A custom block** (`prepress/<set>-<name>`), only for one of three reasons, declared as
   `kind`:
   - `art`: generated SVG or a drawing: botanical, engraving, stamp, device, seal, vine,
     shapes;
   - `interactive`: CSS state with inputs, such as a trail picker, a plan switcher or an app
     demo;
   - `effect`: motion around content, such as glow, aurora, marquee or a glass panel. **Its text
     is inner core blocks** (`{{{content}}}` in the template), never attributes.

   Attributes hold settings (motif, speed, a colour slug), not prose. A custom block's content
   is lost if the block goes missing, which is why prose belongs in core blocks.

Never add a static custom block or one that needs a build step or a third-party plugin.

## 2. Where CSS goes: five layers, one home each

| # | Layer | Home | Use it for |
|---|---|---|---|
| 1 | **Tokens** | theme.json `settings` | palette, fonts, font sizes, spacing, shadows, **radius scale** `var(--wp--custom--radius--sm|md|lg|pill)` (follows the Design's corners) |
| 2 | **Defaults** | theme.json `styles.elements` and `styles.blocks["core/x"]` | how *every* heading, link, button, caption, image, details, separator looks. JSON first; `styles.blocks["core/x"].css` only for what JSON can't say, and only in the form WordPress processes: declarations plus one level of `& sel { … }`, no `@media`. WordPress outputs these with zero specificity (`:root :where(…)`), so its own block CSS wins where it sets the same property (separator borders, pullquote padding): such defaults go in site CSS, keyed on the block class |
| 3 | **Block styles** | `site.blockStyles` / set `blockStyles` | a named, optional look for one or more block types. `styles` (theme.json-shaped, editable in Global Styles) plus `css` (anything; `&` nests, `@media` allowed) |
| 4 | **Custom block CSS** | `CustomBlockDef.css` | the inside of a `prepress/*` block. Scoped to `.wp-block-prepress-<name>` or the set's own class prefix (`.hp-*`) |
| 5 | **Site CSS** | theme.json `styles.css` (WordPress: Additional CSS) | globals: `::selection`, focus ring, `color-scheme`, a page-wide grain, the reduced-motion switch, `.wp-site-blocks{overflow-x:clip}`, inline text formats (`.kx-hl`); and global defaults for core blocks that must beat WordPress's block CSS (`.wp-block-separator{…}`). Never an optional look (that's a block style) or a custom block's internals |

Rules (lint-checked):
- **Tokens only.** No raw colours outside tokens: use `var(--wp--preset--color--<slug>)`, or
  `color-mix()` with one. Mask gradients may use `#000`/`transparent`. No raw font families:
  use `var(--wp--preset--font-family--heading|body|mono)`. Radii come from
  `var(--wp--custom--radius--*)`, `0` or a percentage (a shape, like a circle). `999px` means "always a pill", whatever the
  Design.
- **No `className` hooks.** A block's `className` is a registered `is-style-*` or nothing. One
  per block.
- **No template-wrapper selectors** (`.entry-content`, `.wp-site-blocks >`) outside site CSS.
  The editor canvas has no such wrappers, so the look would differ there.
- **`!important` only on layout properties** that fight WordPress's layout CSS (margin,
  padding, width, flex, gap, display, position). The reduced-motion kill switch is the one
  exception.
- **Layout comes from block settings first:** flex/grid/constrained layout, `blockGap`,
  `columnSpan`, `minHeight`, `aspectRatio`. CSS layout belongs in a block style.
- Dark styles: set base dark and contrast light in the palette, and add `color-scheme: dark`
  in site CSS.
- Motion: transform and opacity only, behind `@media (prefers-reduced-motion: no-preference)`
  or killed by the reduced-motion switch, and `@supports` for scroll-driven animation.

## 3. Patterns and how they combine

- **One pattern = one section.** It is a top-level `core/group` (or `core/cover`) with:
  - `align: "full"`;
  - `metadata.name`;
  - a ground (`backgroundColor` + `textColor` slugs);
  - padding from spacing presets 20–80;
  - no outer margins.

  Use `section()` from the kit.
- **Every pattern has a `role`**: hero, page-title, article (long-form text with its own title), intro, story, features, showcase, gallery,
  list, menu, pricing, stats, testimonial, faq, cta, contact, header, footer. Roles map to
  WordPress pattern categories on export, and let AI compose pages across sets.
- **A template page is an ordered list of pattern keys.** An inline section is allowed only
  first, as the page's own title.
  - A page starts with a hero, a page-title or an article.
  - One hero per page.
  - Two strong grounds (contrast/primary/accent) never touch.
  - End on a cta or contact where the page has an action.
- **Patterns don't nest patterns.** Synced patterns (`core/block` refs) are only for content
  the user really shares across pages, such as one CTA kept identical everywhere.
- **Portable by construction.** A pattern needs only tokens, core blocks, its block styles and
  its custom blocks. The library ships the styles and blocks with it.
  - Dropped into a site with another style, it takes on that site's colours, fonts and corners.
  - A missing block style degrades to the plain block.
- **Header and footer** are template parts (`custom: true` once hand-made). The export also
  ships them as patterns for those areas.

## 4. Export

- **The theme** contains:
  - `theme.json` (layers 1, 2 and 5);
  - `inc/block-styles.php`: `register_block_style()` per block style, with `style_data` for
    the JSON part and `inline_style` for the CSS part;
  - templates, parts, and `patterns/*.php` with `Categories` from the role, `Keywords` and
    `Block Types`.
- **Custom blocks** go in the theme (one zip) or in a companion `<site>-blocks` plugin (survives
  a theme switch; required for the WordPress.org theme directory). The export dialog and MCP
  `export_wordpress {blocks}` choose.
- **Everything uses WordPress's own mechanisms,** so a user edits it in WordPress without
  Prepress.

## 5. Making a set (or a template from scratch)

1. **Style.** Palette (contrast ≥ 7:1, primary ≥ 4.5:1 on base), three fonts, radius, sizes.
   Put element and core-block defaults in the theme.json patch. Keep site CSS short.
2. **Block styles.** Name each look you need, `<set>-<name>`, for the block types it fits.
3. **Blocks.** Only art, interactive or effect, each with `kind`.
4. **Patterns.** One section each, with a role and real content (no lorem). Pictures: the
   project's own, generated (see CLAUDE.md, "Set photography"), or open-licence and credited.
5. **Template.** Pages from pattern keys, plus header and footer.
6. **Check:**
   - `npm test` (validity, zero repairs, `lintSet`, every layer used);
   - `scripts/qa-set.ts` screenshots at desktop and phone;
   - change the palette, fonts and corners in the Styles panel and make sure everything
     follows.
