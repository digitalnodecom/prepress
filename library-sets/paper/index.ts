/** Paper Edition — library set #2: style → blocks → patterns → template. */
import { BLOCKS } from './blocks';
import { BLOCK_STYLES, DESIGN, STYLE, THEME_JSON } from './style';
import { FOOTER, HEADER, PATTERNS } from './patterns';
import { TEMPLATE } from './template';

export const PAPER = { key: 'paper', prefix: 'pe', style: { ...STYLE, design: DESIGN, themeJson: THEME_JSON }, blocks: BLOCKS, blockStyles: BLOCK_STYLES, patterns: PATTERNS, header: HEADER, footer: FOOTER, template: TEMPLATE };
