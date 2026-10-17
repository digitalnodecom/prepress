/**
 * FX — a blocks-only library collection (no template): standalone effect
 * blocks. The design and the showcase sections only dress the previews; the
 * blocks themselves take every colour from whatever site imports them.
 */
import type { BlockNode, Design } from '../../src/lib/types';
import { BLOCKS } from './blocks';

const DESIGN: Design = {
  palette: { base: '#fafafa', contrast: '#131316', primary: '#4f46e5', secondary: '#e4e4e9', accent: '#f0572b', muted: '#f1f1f4' },
  headingFont: 'space-grotesk',
  bodyFont: 'inter',
  monoFont: 'jetbrains-mono',
  radius: 'round',
  contentSize: '720px',
  wideSize: '1120px',
};

const b = (name: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []): BlockNode => ({ name, attributes, ...(innerBlocks.length ? { innerBlocks } : {}) });
const fx = (slug: string, attributes: Record<string, unknown> = {}) => b(`prepress/fx-${slug}`, attributes);
/** One showcase section per block (the block's library preview). */
const show = (name: string, block: BlockNode, wide = true) =>
  b('core/group', { metadata: { name }, align: 'full', backgroundColor: 'base', style: { spacing: { padding: { top: 'var:preset|spacing|70', bottom: 'var:preset|spacing|70', left: 'var:preset|spacing|50', right: 'var:preset|spacing|50' } } }, layout: { type: 'constrained' } }, [
    { ...block, attributes: { ...block.attributes, ...(wide ? { align: 'wide' } : {}) } },
  ]);

const SHOWCASE: BlockNode[] = [
  show('Split-flap', fx('splitflap', { size: 'l' })),
  show('Typewriter', fx('typewriter', { size: 'xl' }), false),
  show('Terminal', fx('terminal'), false),
  show('Starfield', fx('starfield')),
  show('Aurora', fx('aurora')),
  show('Glass', fx('glass')),
  show('Pattern', fx('pattern', { pattern: 'truchet', label: 'Pattern field' })),
  show('Orbit', fx('orbit', { size: 'l' }), false),
  show('Ring', b('core/columns', { align: 'wide' }, [b('core/column', {}, [fx('ring', { value: 72 })]), b('core/column', {}, [fx('ring', { value: 38, label: 'open the newsletter' })]), b('core/column', {}, [fx('ring', { value: 94, label: 'would recommend us' })])]), false),
  show('Counter', fx('counter'), false),
  show('Bars', fx('bars'), false),
];

export const FX = {
  key: 'fx',
  blocksOnly: true,
  style: { key: 'style', title: 'FX preview', description: '', tags: [], design: DESIGN, themeJson: {} },
  blocks: BLOCKS,
  patterns: [],
  header: [],
  footer: [],
  showcase: SHOWCASE,
  template: { key: 'template', title: 'FX', description: '', tags: [], name: 'FX', tagline: '', brief: '', pages: [] },
};
