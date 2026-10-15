/** Night Garden — library set #3 (the first dark style): style → blocks → patterns → template. */
import { BLOCKS } from './blocks';
import { DESIGN, STYLE, THEME_JSON } from './style';
import { FOOTER, HEADER, PATTERNS } from './patterns';
import { TEMPLATE } from './template';

export const GARDEN = { key: 'garden', style: { ...STYLE, design: DESIGN, themeJson: THEME_JSON }, blocks: BLOCKS, patterns: PATTERNS, header: HEADER, footer: FOOTER, template: TEMPLATE };
