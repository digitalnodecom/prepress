/**
 * Core data model.
 *
 * The source of truth for every page is WordPress block markup (`post_content`),
 * exactly as Gutenberg would save it. Everything else (preview HTML, the editable
 * section list, the export) is derived from that markup.
 *
 * `BlockNode` is the plain-JSON shape the AI reads and writes. It maps 1:1 onto
 * Gutenberg's block objects ({ name, attributes, innerBlocks }).
 */

export interface BlockNode {
  name: string;
  attributes?: Record<string, unknown>;
  innerBlocks?: BlockNode[];
}

/** A request to expand one of our curated patterns with content. */
export interface PatternCall {
  pattern: string;
  props: Record<string, unknown>;
}

export type SectionSpec = BlockNode | PatternCall;

export const PALETTE_SLUGS = ['base', 'contrast', 'primary', 'secondary', 'accent', 'muted'] as const;
export type PaletteSlug = (typeof PALETTE_SLUGS)[number];

export type Radius = 'none' | 'soft' | 'round';

export interface Design {
  palette: Record<PaletteSlug, string>;
  headingFont: string; // key into FONTS
  bodyFont: string; // key into FONTS
  /** Mono slot (datelines, numbers, code): a key into FONTS with `mono`. Older designs lack it → system mono. */
  monoFont?: string;
  radius: Radius;
  /** Header stays pinned to the top while the page scrolls. Older designs lack it → off. */
  stickyHeader?: boolean;
  contentSize: string;
  wideSize: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string; // "home" is the front page
  /** Serialized block markup — what WordPress stores in post_content. */
  content: string;
  /** Meta description for search results and link previews; the site description when empty. */
  description?: string;
}

export interface Site {
  name: string;
  tagline: string;
  design: Design;
  pages: Page[];
  /** Block markup for the header / footer template parts. */
  header: string;
  footer: string;
  /**
   * Parts the user has edited by hand. Generated parts are rebuilt whenever
   * pages or the design change; custom parts are kept, with menu links synced.
   */
  custom?: Partial<Record<PartSlug, boolean>>;
  /** Site-defined block types (`prepress/*`), exported inside the theme. */
  blocks?: CustomBlockDef[];
  /** Reusable sections: unsynced → inserter/theme patterns; synced → `core/block` refs. */
  patterns?: PatternDef[];
  /** Named looks for core/custom blocks (`is-style-<name>`), picked in the block's Styles panel. */
  blockStyles?: BlockStyleDef[];
  /** Deep-merged over the theme.json generated from `design` (arrays replace). */
  themeJson?: ThemeJsonPatch;
  /** Search & sharing: address, description, social image, favicon (src/lib/siteMeta.ts). */
  seo?: SiteSeo;
  /** Analytics and verification by provider id, rendered by Prepress (src/lib/siteMeta.ts). */
  integrations?: Integrations;
  /** Cookie banner for integrations that need consent. */
  consent?: ConsentSettings;
  /**
   * The owner's own HTML for every published page. Only the editor's settings
   * write it: never MCP, never the library (it isn't shared or imported).
   */
  code?: SiteCode;
}

export interface SiteSeo {
  /** The site's public address (https://example.com), for canonical links, the sitemap and social images. */
  url?: string;
  /** Default meta description. */
  description?: string;
  /** Social sharing image (/uploads/… or https://…). */
  image?: string;
  /** Favicon (/uploads/… or https://…; PNG, SVG or ICO). */
  favicon?: string;
  /** Ask search engines not to index the site. */
  noindex?: boolean;
}

export interface Integrations {
  /** Google Search Console HTML-tag verification: the content="…" value. */
  googleVerification?: string;
  /** Bing Webmaster Tools: the msvalidate.01 content value. */
  bingVerification?: string;
  /** Google Analytics 4 measurement id, G-XXXXXXX. */
  ga4?: string;
  /** Google Tag Manager container id, GTM-XXXXXX. */
  gtm?: string;
  /** Plausible: the site's domain as registered there. */
  plausible?: string;
  /** Fathom site id. */
  fathom?: string;
  /** Umami Cloud website id (UUID). */
  umami?: string;
  /** Meta Pixel id. */
  metaPixel?: string;
}

export interface ConsentSettings {
  /** 'auto' (default): show the banner when something needs consent; 'off': load everything right away. */
  mode?: 'auto' | 'off';
  text?: string;
  accept?: string;
  reject?: string;
}

export interface SiteCode {
  /** HTML placed before </head>. */
  head?: string;
  /** HTML placed before </body>. */
  bodyEnd?: string;
  /** Load this code only after the visitor accepts cookies. */
  needsConsent?: boolean;
}

export type ThemeJsonPatch = { settings?: Record<string, unknown>; styles?: Record<string, unknown>; [k: string]: unknown };

export type CustomAttrType = 'string' | 'number' | 'boolean';
export type CustomAttrControl = 'text' | 'textarea' | 'richtext' | 'url' | 'image' | 'toggle' | 'number' | 'select';

export interface CustomAttrDef {
  type: CustomAttrType;
  default?: string | number | boolean;
  label?: string;
  control?: CustomAttrControl;
  options?: string[];
}

export interface CustomBlockDef {
  /** `prepress/<slug>` */
  name: string;
  title: string;
  description?: string;
  /** Dashicon name, e.g. "star-filled". */
  icon?: string;
  category: 'text' | 'media' | 'design' | 'widgets' | 'theme';
  attributes: Record<string, CustomAttrDef>;
  /**
   * HTML inside the block wrapper. Mini-mustache: {{key}} (escaped),
   * {{#key}}…{{/key}} (if truthy), {{^key}}…{{/key}} (if falsy), {{{content}}} (inner blocks).
   */
  template: string;
  /** CSS for this block. Prefer preset variables, e.g. var(--wp--preset--color--primary). */
  css?: string;
  /**
   * Why this is a custom block and not core blocks + a block style:
   * `art` (generated SVG/drawing), `interactive` (CSS state with inputs) or
   * `effect` (motion around content; its text must be inner blocks via {{{content}}}).
   */
  kind?: 'art' | 'interactive' | 'effect';
  /** Inner blocks settings, used when the template contains {{{content}}}. */
  innerBlocks?: { allowed?: string[]; template?: BlockNode[] };
}

/**
 * A block style (WordPress "block style variation"): a named look the user picks
 * in a block's Styles panel, stored as the class `is-style-<name>`. Without it the
 * block is still a plain, valid block. Exported via register_block_style().
 */
export interface BlockStyleDef {
  /** `<set>-<slug>` for library sets; the class is `is-style-<name>`. */
  name: string;
  label: string;
  /** Block types it applies to, e.g. ["core/image"]. */
  blockTypes: string[];
  /** theme.json-shaped root styles (color, typography, spacing, border, shadow, dimensions). */
  styles?: Record<string, unknown>;
  /**
   * CSS for what JSON can't say. Bare declarations apply to the block; `& img {…}`
   * nests under it; `@media` / `@supports` may wrap either.
   */
  css?: string;
}

/** What a pattern is for; maps to WordPress pattern categories on export. */
export type PatternRole =
  | 'hero' | 'page-title' | 'article' | 'intro' | 'story' | 'features' | 'showcase' | 'gallery' | 'list' | 'menu'
  | 'pricing' | 'stats' | 'testimonial' | 'faq' | 'cta' | 'contact' | 'header' | 'footer';

export interface PatternDef {
  /** Stable numeric id; synced patterns are referenced as <!-- wp:block {"ref":id} /-->. */
  id: number;
  slug: string;
  title: string;
  description?: string;
  /** Serialized block markup. */
  content: string;
  synced: boolean;
  categories?: string[];
  role?: PatternRole;
  keywords?: string[];
}

export type PartSlug = 'header' | 'footer';

/** What the planning step returns before pages are built. */
export interface SitePlan {
  name: string;
  tagline: string;
  design: Partial<Design> & { palette?: Partial<Record<PaletteSlug, string>> };
  pages: { title: string; slug: string; purpose: string; sections: string[] }[];
}

export const TARGET_WP_VERSION = '7.0';
