/**
 * Headless site engine: everything the server (MCP tools, publish, export)
 * needs from the editor's library, bundled with `vite build --ssr` into
 * dist/engine/engine.js and compiled into the binary. Needs a DOM shim
 * (server/dom.ts) loaded first, as WordPress packages touch `window` at import.
 */
export * from './site';
export * from './types';
export { publishFiles, siteHash } from './publish';
export * from './wp/customBlocks';
export { cleanBlockStyle, compileBlockStyles, blockStylesUsedIn } from './wp/blockStyles';
export { lintSite, lintSet } from './setLint';
export { THEME_GUIDELINES } from './guidelines';
export { buildThemeJson as themeJsonFor, mergeThemeJson, cleanThemeJsonPatch, compileGlobalStyles } from './wp/design';
export { normalizeSections, normalizeBlocks, AI_BLOCKS, PART_BLOCKS, type NormalizeReport } from './wp/normalize';
export { toMarkup, markupToNodes, validateMarkup, splitSections, joinSections } from './wp/markup';
export { renderPage, pageUrl } from './wp/render';
export { exportSite, themeSlug } from './wp/export';
export { patternCatalogForPrompt, expandPattern, PATTERNS } from './wp/patterns';
export { buildThemeJson, sanitizeDesign, FONTS, TEXT_FONT_KEYS, MONO_FONT_KEYS, FONT_SIZES, SPACING_SIZES } from './wp/design';
export { generateSite } from './ai/generate';
export { DEMO_BRIEF } from './ai/demo';
export { STARTERS, buildStarter, starterCatalog } from './starters';
export { buildLibrarySet } from './librarySets';
export { shareTemplate, shareSections, sharePattern, shareBlock, shareStyle, importLibraryItem, siteValidity, LIBRARY_TYPES } from './library';
export { externalMediaUrls, replaceMediaUrls, siteMarkups, isExternalMedia } from './wp/media';
export { ensureBlocks } from './wp/registry';

import { getBlockType } from '@wordpress/blocks';
import { ensureBlocks as ensure } from './wp/registry';

const INTERNAL_ATTRS = new Set(['lock', 'metadata', 'className', 'anchor']);

/** Attribute names an AI may set on a block (from its registered block.json + supports). */
export function blockAttributeNames(name: string): string[] {
  ensure();
  return Object.keys((getBlockType(name) as any)?.attributes ?? {}).filter((k) => !INTERNAL_ATTRS.has(k));
}
