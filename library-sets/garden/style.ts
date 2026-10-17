/**
 * Night Garden — style: design tokens + theme.json patch. The first dark style:
 * base is the night, contrast the moonlight. Lantern amber is the only accent
 * (≈8:1 on base, so it works as text and as a button with dark text).
 */
import type { Design } from '../../src/lib/types';

export const DESIGN: Design = {
  palette: {
    base: '#0e1411', // night
    contrast: '#ece5d3', // moonlight
    primary: '#ece5d3',
    secondary: '#1d2a22', // leaf shadow
    accent: '#d9a35f', // lantern
    muted: '#141c17',
  },
  headingFont: 'cormorant',
  bodyFont: 'dm-sans',
  monoFont: 'dm-mono',
  radius: 'round',
  stickyHeader: true,
  contentSize: '720px',
  wideSize: '1280px',
};

/** Film grain for dark surfaces: light specks, very faint. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .85 0 0 0 .045 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const THEME_JSON = {
  settings: {
    typography: {
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Medium', size: '1.0625rem', fluid: { min: '1rem', max: '1.0625rem' } },
        { slug: 'large', name: 'Large', size: '1.375rem', fluid: { min: '1.2rem', max: '1.375rem' } },
        { slug: 'x-large', name: 'Extra Large', size: '2rem', fluid: { min: '1.6rem', max: '2.1rem' } },
        { slug: 'xx-large', name: 'Huge', size: '3rem', fluid: { min: '2.2rem', max: '3.2rem' } },
        { slug: 'xxx-large', name: 'Gigantic', size: '4.25rem', fluid: { min: '2.8rem', max: '4.6rem' } },
        { slug: 'display', name: 'Display', size: '6rem', fluid: { min: '3.2rem', max: '6.5rem' } },
        { slug: 'grand', name: 'Grand', size: '8rem', fluid: { min: '3.6rem', max: '8.75rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.65' },
    elements: {
      heading: { typography: { fontWeight: '400', lineHeight: '1.02', letterSpacing: '-0.01em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|display', fontWeight: '300', lineHeight: '0.95' } },
      h2: { typography: { fontWeight: '300', lineHeight: '1' } },
      h3: { typography: { fontWeight: '500', lineHeight: '1.1' } },
      link: { color: { text: 'var:preset|color|accent' } },
      button: {
        color: { background: 'var:preset|color|accent', text: 'var:preset|color|base' },
        typography: { fontFamily: 'var:preset|font-family|mono', fontSize: 'var:preset|font-size|small', fontWeight: '500', letterSpacing: '0.14em', textTransform: 'uppercase' },
        ':hover': { color: { background: 'var:preset|color|contrast', text: 'var:preset|color|base' } },
      },
    },
    css: [
      ':root{color-scheme:dark}',
      // The hero glow bleeds past the column on purpose; never scroll sideways (clip keeps sticky working).
      '.wp-site-blocks{overflow-x:clip}',
      'body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}',
      `:where(.has-base-background-color,.has-muted-background-color,.has-secondary-background-color){background-image:${GRAIN}}`,
      'h1,h2{font-style:italic}',
      'h1,h2,h3{text-wrap:balance}',
      'p{text-wrap:pretty}',
      'h1 em,h2 em,h3 em{color:var(--wp--preset--color--accent)}',
      'a{text-decoration-thickness:1px;text-underline-offset:.22em}',
      ':where(.has-accent-background-color) a:where(:not(.wp-element-button,.wp-block-button__link)){color:inherit}',
      '::selection{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--base)}',
      ':where(a,button,summary,[tabindex]):focus-visible{outline:2px solid var(--wp--preset--color--accent);outline-offset:3px}',
      '.wp-element-button,.wp-block-button__link{padding:1em 1.9em;transition:background-color .25s,color .25s}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:not(.has-background){border:1px solid currentColor;padding:calc(1em - 1px) calc(1.9em - 1px)}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:not(.has-text-color){color:var(--wp--preset--color--contrast)}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:hover{background:var(--wp--preset--color--contrast);color:var(--wp--preset--color--base)}',
      '.wp-block-separator{border:0;border-top:1px solid color-mix(in srgb,currentColor 22%,transparent);opacity:1}',
      '@media (max-width:640px){.ng-header-cta{display:none!important}}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
    ].join('\n'),
  },
};

export const STYLE = {
  key: 'style',
  title: 'Night Garden',
  description: 'Dark hospitality style: night green, moonlight cream and lantern amber; italic Cormorant Garamond over DM Sans, DM Mono for prices and hours, round pills and arches.',
  tags: ['dark', 'restaurant', 'hospitality', 'elegant'],
};
