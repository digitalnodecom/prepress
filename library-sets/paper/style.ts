/**
 * Paper Edition — style: design tokens + theme.json patch.
 *
 * Warm paper, ink and one oxblood accent (7.9:1 on paper, so it works as text:
 * links, numbers, drop caps). Fraunces for display, Newsreader for reading,
 * IBM Plex Mono for datelines and numerals. A 680px measure (~68 characters).
 */
import type { Design } from '../../src/lib/types';

export const DESIGN: Design = {
  palette: {
    base: '#f4efe4', // paper
    contrast: '#1c1a16', // ink
    primary: '#1c1a16',
    secondary: '#e7dfcd', // rules, tints
    accent: '#8a2b22', // oxblood
    muted: '#ece5d4',
  },
  headingFont: 'fraunces',
  bodyFont: 'newsreader',
  monoFont: 'ibm-plex-mono',
  radius: 'none',
  contentSize: '680px',
  wideSize: '1240px',
};

/** Paper fibre: a warm, very faint turbulence tile. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .1 0 0 0 .05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const THEME_JSON = {
  settings: {
    typography: {
      // A patched list replaces the generated one: the six base sizes on a reading scale, plus headline + nameplate.
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Medium', size: '1.1875rem', fluid: { min: '1.0625rem', max: '1.1875rem' } },
        { slug: 'large', name: 'Large', size: '1.45rem', fluid: { min: '1.25rem', max: '1.45rem' } },
        { slug: 'x-large', name: 'Extra Large', size: '1.9rem', fluid: { min: '1.5rem', max: '2rem' } },
        { slug: 'xx-large', name: 'Huge', size: '2.75rem', fluid: { min: '2rem', max: '2.9rem' } },
        { slug: 'xxx-large', name: 'Gigantic', size: '3.75rem', fluid: { min: '2.5rem', max: '4rem' } },
        { slug: 'headline', name: 'Headline', size: '4.75rem', fluid: { min: '2.6rem', max: '5.5rem' } },
        { slug: 'nameplate', name: 'Nameplate', size: '8rem', fluid: { min: '3.2rem', max: '9rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.62' },
    elements: {
      heading: { typography: { fontWeight: '400', lineHeight: '1.08', letterSpacing: '-0.015em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|headline', lineHeight: '1', letterSpacing: '-0.03em' } },
      h2: { typography: { lineHeight: '1.04', letterSpacing: '-0.022em' } },
      h3: { typography: { lineHeight: '1.12' } },
      link: { color: { text: 'var:preset|color|accent' } },
      button: {
        color: { background: 'var:preset|color|contrast', text: 'var:preset|color|base' },
        typography: { fontFamily: 'var:preset|font-family|mono', fontSize: 'var:preset|font-size|small', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase' },
        ':hover': { color: { background: 'var:preset|color|accent', text: 'var:preset|color|base' } },
      },
    },
    css: [
      `body{background-image:${GRAIN};background-attachment:fixed;font-feature-settings:"kern","liga","onum";font-optical-sizing:auto;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}`,
      'h1,h2,h3,h4{text-wrap:balance;font-feature-settings:"kern","liga","lnum"}',
      'p{text-wrap:pretty;hanging-punctuation:first allow-end last}',
      'sup{font-family:var(--wp--preset--font-family--mono);font-size:.62em;line-height:0;color:var(--wp--preset--color--accent);padding-left:.1em}',
      ':where(.has-background) sup{color:inherit}',
      'a{text-decoration-thickness:1px;text-underline-offset:.2em}',
      'a:hover{text-decoration-thickness:2px}',
      ':where(.has-background:not(.has-base-background-color,.has-muted-background-color,.has-secondary-background-color)) a:where(:not(.wp-element-button,.wp-block-button__link)){color:inherit}',
      '::selection{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--base)}',
      ':where(a,button,summary,[tabindex]):focus-visible{outline:2px solid var(--wp--preset--color--accent);outline-offset:3px}',
      '.wp-element-button,.wp-block-button__link{border-radius:0;padding:.95em 1.6em}',
      '.wp-block-button.is-style-outline>.wp-block-button__link{border-width:1px}',
      '.wp-block-separator{border:0;border-top:1px solid currentColor;opacity:1}',
      '.wp-block-site-title a{font-style:normal}',
      '@media (max-width:640px){.pe-header-cta{display:none!important}}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
    ].join('\n'),
  },
};

export const STYLE = {
  key: 'style',
  title: 'Paper Edition',
  description: 'Editorial reading style: warm paper, ink and one oxblood accent; Fraunces headlines, Newsreader text and IBM Plex Mono datelines on a 68-character measure.',
  tags: ['editorial', 'serif', 'newsletter', 'reading'],
};
