/**
 * Kinetic Grotesk — style: design tokens + theme.json patch.
 *
 * Paper, ink and one acid accent. The accent is only ever a *background* under
 * ink text (acid on paper fails contrast), never text on paper.
 */
import type { Design } from '../../src/lib/types';

export const DESIGN: Design = {
  palette: {
    base: '#f2f0ea', // paper
    contrast: '#0e0e0e', // ink
    primary: '#0e0e0e',
    secondary: '#e2dfd5',
    accent: '#d7ff3a', // acid
    muted: '#e9e6de',
  },
  headingFont: 'syne',
  bodyFont: 'inter',
  radius: 'none',
  stickyHeader: true,
  contentSize: '760px',
  wideSize: '1440px',
};

/** Paper grain: an SVG turbulence tile, very faint. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .055 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const THEME_JSON = {
  settings: {
    typography: {
      // A patched list replaces the generated one: keep the six base sizes, add display + mega.
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.875rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Medium', size: '1.0625rem', fluid: { min: '1rem', max: '1.0625rem' } },
        { slug: 'large', name: 'Large', size: '1.5rem', fluid: { min: '1.25rem', max: '1.5rem' } },
        { slug: 'x-large', name: 'Extra Large', size: '2.25rem', fluid: { min: '1.75rem', max: '2.5rem' } },
        { slug: 'xx-large', name: 'Huge', size: '3.5rem', fluid: { min: '2.5rem', max: '4rem' } },
        { slug: 'xxx-large', name: 'Gigantic', size: '5rem', fluid: { min: '3rem', max: '6rem' } },
        { slug: 'statement', name: 'Statement', size: '3.5rem', fluid: { min: '1.7rem', max: '4.25rem' } },
        { slug: 'display', name: 'Display', size: '7rem', fluid: { min: '3rem', max: '8.5rem' } },
        { slug: 'mega', name: 'Mega', size: '12rem', fluid: { min: '3.6rem', max: '14rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.55' },
    elements: {
      heading: { typography: { fontWeight: '800', lineHeight: '0.95', letterSpacing: '-0.035em' } },
      h1: { typography: { textTransform: 'uppercase', letterSpacing: '-0.05em', lineHeight: '0.86' } },
      h2: { typography: { textTransform: 'uppercase', letterSpacing: '-0.045em', lineHeight: '0.9' } },
      link: { typography: { textDecoration: 'underline' } },
      button: {
        border: { radius: '999px', width: '1.5px', style: 'solid', color: 'var(--wp--preset--color--contrast)' },
        color: { background: 'var(--wp--preset--color--contrast)', text: 'var(--wp--preset--color--base)' },
        typography: { fontWeight: '600', letterSpacing: '0.01em' },
        ':hover': { color: { background: 'var(--wp--preset--color--accent)', text: 'var(--wp--preset--color--contrast)' } },
      },
    },
    css: [
      // Turning stickers and marquees may poke past the edge; never scroll sideways (clip keeps sticky working).
      '.wp-site-blocks{overflow-x:clip}',
      `body{background-image:${GRAIN};background-attachment:fixed;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}`,
      '::selection{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--contrast)}',
      ':where(a,button,summary,[tabindex]):focus-visible{outline:3px solid var(--wp--preset--color--accent);outline-offset:3px;box-shadow:0 0 0 6px var(--wp--preset--color--contrast)}',
      'a{text-underline-offset:.18em;text-decoration-thickness:1px}',
      'a:hover{text-decoration-thickness:2px}',
      '.kx-hl{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--contrast);padding:0 .12em;box-decoration-break:clone;-webkit-box-decoration-break:clone}',
      '.kx-outline{-webkit-text-fill-color:transparent;-webkit-text-stroke:.03em currentColor}',
      ':where(.has-background) a:where(:not([class*=kx-]):not(.wp-block-button__link)){color:inherit}',
      '.has-accent-background-color .kx-hl{background:var(--wp--preset--color--contrast);color:var(--wp--preset--color--accent)}',
      ':where(h1,h2,h3,h4,.has-statement-font-size,.has-xx-large-font-size,.has-xxx-large-font-size,.has-display-font-size,.has-mega-font-size){overflow-wrap:normal;word-break:normal;hyphens:manual}',
      '.wp-block-separator.is-style-wide{border-top-width:1px}',
      // Project pictures: square corners, an acid frame snaps in on hover, caption = client + meta.
      '.kx-case img{display:block;width:100%;height:auto;transition:outline-offset .25s,outline-color .25s;outline:.5rem solid transparent;outline-offset:0}',
      '.kx-case a:hover img,.kx-case a:focus-visible img{outline-color:var(--wp--preset--color--accent);outline-offset:-.5rem}',
      '.kx-case figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.25rem 1rem;margin-top:.9rem;font-size:var(--wp--preset--font-size--small);font-weight:600;letter-spacing:.1em;text-transform:uppercase;text-align:left}',
      '.kx-case figcaption strong{font-family:var(--wp--preset--font-family--heading);font-size:1.35rem;font-weight:800;letter-spacing:-.02em}',
      '@media (max-width:640px){.kx-header-cta{display:none!important}}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
    ].join('\n'),
  },
};

export const STYLE = {
  key: 'style',
  title: 'Kinetic Grotesk',
  description: 'Swiss-brutalist studio style: paper, ink and one acid accent; screen-wide Syne display type over Inter, pill buttons that flood acid on hover, paper grain.',
  tags: ['brutalist', 'studio', 'grotesk', 'bold'],
};
