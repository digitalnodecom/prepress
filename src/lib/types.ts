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
  radius: Radius;
  contentSize: string;
  wideSize: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string; // "home" is the front page
  /** Serialized block markup — what WordPress stores in post_content. */
  content: string;
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
  /** Deep-merged over the theme.json generated from `design` (arrays replace). */
  themeJson?: ThemeJsonPatch;
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
  /** Inner blocks settings, used when the template contains {{{content}}}. */
  innerBlocks?: { allowed?: string[]; template?: BlockNode[] };
}

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
