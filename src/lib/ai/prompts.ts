/**
 * Prompts. The model never writes HTML: it returns JSON block trees or pattern
 * calls, which are normalized and serialized by Gutenberg's own code.
 */
import type { BlockNode, Site } from '../types';
import { FONTS } from '../wp/design';
import { AI_BLOCKS } from '../wp/normalize';
import { PATTERNS, patternCatalogForPrompt } from '../wp/patterns';
import { pageUrl } from '../wp/render';

const FONT_KEYS = Object.keys(FONTS).filter((k) => k !== 'system');

export function planPrompt(brief: string) {
  return `You are the lead designer of a website builder whose output becomes a WordPress block theme.
Plan a small website for this brief:
"""
${brief.slice(0, 4000)}
"""

Reply with ONLY this JSON (no prose):
{
  "name": "Site name",
  "tagline": "Short tagline, max 8 words",
  "design": {
    "palette": {
      "base": "#hex — page background (very light, or very dark for a dark theme)",
      "contrast": "#hex — body text; ≥ 10:1 contrast with base",
      "primary": "#hex — brand color; ≥ 4.5:1 contrast with base",
      "secondary": "#hex — soft supporting tone (borders, subtle fills)",
      "accent": "#hex — highlight color for small details",
      "muted": "#hex — subtle alternate section background, close to base"
    },
    "headingFont": "one of: ${FONT_KEYS.join(', ')}",
    "bodyFont": "one of: ${FONT_KEYS.join(', ')}",
    "radius": "none | soft | round"
  },
  "pages": [
    { "title": "Home", "slug": "home", "purpose": "one sentence", "sections": ["hero-split: what it says", "features-grid: ...", "..."] }
  ]
}

Rules:
- 3–5 pages. The first page is Home with slug "home". Add a contact/visit/booking page when it fits.
- Home has 5–7 sections, other pages 3–6.
- Each section line starts with one of these pattern names: ${Object.keys(PATTERNS).join(', ')}.
- Pick fonts and colors that suit the industry and voice of the brief; avoid generic blue unless it fits.`;
}

function siteContext(site: Site, brief: string) {
  return `Site: ${site.name} — ${site.tagline}
Brief: ${brief.slice(0, 1500)}
Pages and their URLs (use these for buttons and links; never "#"):
${site.pages.map((p) => `- ${p.title}: ${pageUrl(p.slug)}`).join('\n')}`;
}

const RULES = `Each section is EITHER a pattern call (preferred):
  {"pattern": "<name>", "props": {...}}
OR, only when no pattern fits, a raw core block tree:
  {"name": "core/group", "attributes": {...}, "innerBlocks": [...]}

Patterns:
${patternCatalogForPrompt()}

"tone" sets a section's background: base | muted | primary | contrast | secondary.
Vary tones down the page (e.g. base, muted, base, primary). Never put two primary/contrast sections next to each other.

Raw block rules:
- Allowed blocks: ${AI_BLOCKS.join(', ')}.
- A top-level raw section is core/group with {"align":"full","layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70"}}}}.
- Colors only via preset slugs: backgroundColor / textColor ∈ base, contrast, primary, secondary, accent, muted.
- fontSize ∈ small, medium, large, x-large, xx-large, xxx-large. Spacing values: "var:preset|spacing|20" … "|80".
- Text alignment: "style":{"typography":{"textAlign":"center"}}.
- core/heading {"level":2,"content":"…"}; core/paragraph {"content":"…"} (inline <strong>, <em>, <a href> allowed).
- core/buttons > core/button {"text","url"}; core/columns > core/column; core/list > core/list-item {"content"}.
- core/image {"alt":"what the photo shows"} — no url; placeholders are generated.

Copy:
- Specific and concrete, in the brief's voice. No lorem ipsum. Short paragraphs.
- Testimonials, team members, prices and stats are placeholders the owner will replace: keep them modest and plausible, use first name + initial for people.`;

export function pagePrompt(site: Site, brief: string, page: { title: string; purpose?: string; sections?: string[] }) {
  return `You write one page of a website. Your output is converted into WordPress Gutenberg blocks.

${siteContext(site, brief)}

Write the page "${page.title}"${page.purpose ? ` — ${page.purpose}` : ''}.
${page.sections?.length ? `Planned sections, in order:\n${page.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : 'Choose 3–6 fitting sections.'}

Reply with ONLY this JSON: {"sections": [ ... ]}

${RULES}`;
}

export function editSectionPrompt(site: Site, brief: string, pageTitle: string, current: BlockNode[], instruction: string) {
  return `You are editing one section of the "${pageTitle}" page of a website. The output is WordPress Gutenberg blocks.

${siteContext(site, brief)}

Current section (Gutenberg block tree, defaults omitted; images are placeholders described by "alt"):
${JSON.stringify(current).slice(0, 30000)}

Instruction: "${instruction}"

Reply with ONLY this JSON: {"section": <one pattern call or one raw block tree>}
Keep everything the instruction doesn't ask to change (copy, tone/background, structure). If the current section matches a pattern and the change fits it, you may answer with that pattern call.

${RULES}`;
}

export function addSectionPrompt(site: Site, brief: string, pageTitle: string, neighbours: string[], instruction: string) {
  return `You are adding a new section to the "${pageTitle}" page of a website. The output is WordPress Gutenberg blocks.

${siteContext(site, brief)}

Existing sections on this page, in order: ${neighbours.join(' | ') || '(none)'}

Add: "${instruction}"

Reply with ONLY this JSON: {"section": <one pattern call or one raw block tree>}

${RULES}`;
}
