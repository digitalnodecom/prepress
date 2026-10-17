/** Showroom — library set #4 (product launch in a white gallery): style → blocks → patterns → template. */
import { BLOCKS } from './blocks';
import { BLOCK_STYLES, DESIGN, STYLE, THEME_JSON } from './style';
import { FOOTER, HEADER, PATTERNS } from './patterns';
import { TEMPLATE } from './template';

export const SHOWROOM = { key: 'showroom', prefix: 'sr', style: { ...STYLE, design: DESIGN, themeJson: THEME_JSON }, blocks: BLOCKS, blockStyles: BLOCK_STYLES, patterns: PATTERNS, header: HEADER, footer: FOOTER, template: TEMPLATE };
