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
}

/** What the planning step returns before pages are built. */
export interface SitePlan {
  name: string;
  tagline: string;
  design: Partial<Design> & { palette?: Partial<Record<PaletteSlug, string>> };
  pages: { title: string; slug: string; purpose: string; sections: string[] }[];
}

export const TARGET_WP_VERSION = '7.0';
