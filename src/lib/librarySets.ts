/**
 * Library sets: a style, its blocks, patterns made from them and a full-site
 * template made from the patterns (library-sets/<key>/). buildLibrarySet turns
 * a set's source into a real site and the library drafts for every item, with
 * the lineage between them (`uses`, by item key), using the same normalize →
 * serialize path and share builders as everything else.
 */
import type { BlockNode, CustomBlockDef, Design, PatternDef, Site } from './types';
import { patchThemeJson, uid } from './site';
import { normalizeSections, PART_BLOCKS, type NormalizeReport } from './wp/normalize';
import { toMarkup } from './wp/markup';
import { sanitizeDesign } from './wp/design';
import { cleanBlockDef, registerCustomBlocks } from './wp/customBlocks';
import { ensureBlocks } from './wp/registry';
import { sharePattern, shareBlock, shareStyle, shareTemplate, type LibraryDraft } from './library';

export interface LibrarySetDef {
  key: string;
  /** A blocks-only collection publishes just its blocks; the style and `showcase` pages only dress the previews. */
  blocksOnly?: boolean;
  style: { key: string; title: string; description: string; tags: string[]; design: Design; themeJson: Record<string, unknown> };
  blocks: CustomBlockDef[];
  patterns: { key: string; title: string; description: string; tags: string[]; sections: BlockNode[] }[];
  header: BlockNode[];
  footer: BlockNode[];
  /** Blocks-only sets: one section per block, used as that block's library preview. */
  showcase?: BlockNode[];
  template: {
    key: string;
    title: string;
    description: string;
    tags: string[];
    name: string;
    tagline: string;
    brief: string;
    pages: { title: string; slug: string; sections: (string | BlockNode)[] }[];
  };
}

export interface SetItem {
  /** Stable key within the set: "style", "block:<slug>", "pattern:<key>", "template". */
  key: string;
  draft: LibraryDraft;
  /** Keys of the items this one is built from. */
  uses: string[];
}

export interface BuiltSet {
  site: Site;
  items: SetItem[];
  /** Normalizer notes — must be empty for a shippable set. */
  report: string[];
}

export function buildLibrarySet(set: LibrarySetDef): BuiltSet {
  ensureBlocks();
  const blocks = set.blocks.map((b) => cleanBlockDef(b));
  registerCustomBlocks(blocks);
  const blockNames = blocks.map((b) => b.name);
  const design = sanitizeDesign(set.style.design);
  const report: string[] = [];
  const markup = (specs: BlockNode[], allowed?: readonly string[]) => {
    const r: NormalizeReport = { dropped: [], repaired: [] };
    const out = toMarkup(normalizeSections(specs, { design, report: r, ...(allowed ? { allowed: [...allowed, ...blockNames] } : {}) }));
    report.push(...r.dropped.map((d) => `dropped ${d}`), ...r.repaired);
    return out;
  };

  const patternMarkup = new Map(set.patterns.map((p) => [p.key, markup(p.sections)]));
  const patterns: PatternDef[] = set.patterns.map((p, i) => ({ id: 5000 + i, slug: p.key, title: p.title, description: p.description, content: patternMarkup.get(p.key)!, synced: false, categories: [set.key] }));
  const pageSpecs = set.blocksOnly ? [{ title: 'Showcase', slug: 'home', sections: set.showcase ?? [] }] : set.template.pages;
  const pages = pageSpecs.map((pg) => ({
    id: uid(),
    title: pg.title,
    slug: pg.slug,
    content: pg.sections
      .map((s) => {
        if (typeof s !== 'string') return markup([s]);
        const m = patternMarkup.get(s);
        if (m === undefined) throw new Error(`Template page ${pg.slug} uses unknown pattern "${s}"`);
        return m;
      })
      .join('\n\n'),
  }));

  let site: Site = {
    name: set.template.name,
    tagline: set.template.tagline,
    design,
    pages,
    header: markup(set.header, PART_BLOCKS),
    footer: markup(set.footer, PART_BLOCKS),
    custom: { header: true, footer: true },
    blocks,
    patterns,
  };
  site = patchThemeJson(site, set.style.themeJson);

  if (set.blocksOnly) {
    const items: SetItem[] = blocks.map((bl) => ({ key: `block:${bl.name.split('/')[1]}`, draft: shareBlock(site, bl.name, { description: bl.description, tags: [set.key, 'block', ...(bl.category ? [bl.category] : [])] }), uses: [] }));
    return { site, items, report };
  }

  const used = (m: string) => blockNames.filter((n) => m.includes(`<!-- wp:${n} `) || m.includes(`<!-- wp:${n} /-->`) || m.includes(`<!-- wp:${n}-->`)).map((n) => `block:${n.split('/')[1]}`);
  const items: SetItem[] = [
    { key: 'style', draft: shareStyle(site, set.style), uses: [] },
    ...blocks.map((bl) => ({ key: `block:${bl.name.split('/')[1]}`, draft: shareBlock(site, bl.name, { description: bl.description, tags: [set.key, 'block'] }), uses: ['style'] })),
    ...set.patterns.map((p, i) => ({
      key: `pattern:${p.key}`,
      draft: sharePattern(site, patterns[i].id, { title: p.title, description: p.description, tags: p.tags }),
      uses: ['style', ...used(patternMarkup.get(p.key)!)],
    })),
    {
      key: 'template',
      draft: shareTemplate(site, { title: set.template.title, description: set.template.description, tags: set.template.tags, brief: set.template.brief }),
      uses: ['style', ...blocks.map((bl) => `block:${bl.name.split('/')[1]}`), ...set.patterns.map((p) => `pattern:${p.key}`)],
    },
  ];
  return { site, items, report };
}
