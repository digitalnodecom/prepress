/**
 * Site-editor-style page editing: the canvas shows header, page content and
 * footer together, the way WordPress's page editor does with "Show template".
 *
 * Each area is an editor-only wrapper block (`prepress-editor/area`) holding
 * the area's blocks as inner blocks. It is never serialized as a whole: the
 * editor serializes each area's inner blocks separately back to
 * `page.content`, `site.header` and `site.footer`, so stored markup is still
 * plain `serialize()` output of real blocks.
 */
import { createBlock, getBlockType, parse, registerBlockType, serialize } from '@wordpress/blocks';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

export const AREA_BLOCK = 'prepress-editor/area';
export type AreaName = 'header' | 'content' | 'footer';

const LABEL: Record<AreaName, string> = { header: 'Header', content: 'Page content', footer: 'Footer' };
const TAG: Record<AreaName, 'header' | 'main' | 'footer'> = { header: 'header', content: 'main', footer: 'footer' };
const LAYOUT = { type: 'constrained' };

function AreaEdit({ attributes }: any) {
  const area: AreaName = attributes.area;
  const blockProps = useBlockProps({ className: `pp-area pp-area-${area}`, 'data-pp-label': area === 'content' ? undefined : `${LABEL[area]} · every page` });
  const inner = useInnerBlocksProps(blockProps, { templateLock: false, layout: LAYOUT });
  const Tag = TAG[area];
  return <Tag {...inner} />;
}

export function registerAreaBlock() {
  if (getBlockType(AREA_BLOCK)) return;
  registerBlockType(AREA_BLOCK, {
    apiVersion: 3,
    title: 'Template area',
    category: 'theme',
    description: 'Header and footer are shared by every page: changes here apply site-wide.',
    attributes: { area: { type: 'string' }, layout: { type: 'object', default: LAYOUT } },
    supports: {
      inserter: false,
      html: false,
      reusable: false,
      lock: false,
      renaming: false,
      customClassName: false,
      className: false,
      layout: { default: LAYOUT, allowSwitching: false, allowEditing: false, allowInheriting: false },
    },
    __experimentalLabel: (a: any) => LABEL[a.area as AreaName] ?? 'Area',
    edit: AreaEdit,
    save: () => null,
  } as any);
}

export interface AreaMarkup {
  header: string;
  content: string;
  footer: string;
}

/** Build the editor value: three locked area blocks. */
export function areaBlocks(m: AreaMarkup): any[] {
  return (['header', 'content', 'footer'] as AreaName[]).map((area) =>
    createBlock(AREA_BLOCK, { area, lock: { move: true, remove: true } }, parse(m[area])),
  );
}

/** Editor value → each area's markup (serialized inner blocks). */
export function splitAreas(blocks: any[]): Partial<AreaMarkup> {
  const out: Partial<AreaMarkup> = {};
  for (const b of blocks) if (b.name === AREA_BLOCK) out[b.attributes.area as AreaName] = serialize(b.innerBlocks);
  return out;
}
