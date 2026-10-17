/** Chorus — library set #6, art-directed with tasteskill v2 (mobile-app landing): style → blocks → patterns → template. */
import { BLOCKS } from './blocks';
import { BLOCK_STYLES, DESIGN, STYLE, THEME_JSON } from './style';
import { FOOTER, HEADER, PATTERNS } from './patterns';
import { TEMPLATE } from './template';

export const CHORUS = { key: 'chorus', prefix: 'ch', style: { ...STYLE, design: DESIGN, themeJson: THEME_JSON }, blocks: BLOCKS, blockStyles: BLOCK_STYLES, patterns: PATTERNS, header: HEADER, footer: FOOTER, template: TEMPLATE };
