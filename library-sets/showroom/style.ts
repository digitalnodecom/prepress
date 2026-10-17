/**
 * Showroom — style: a white gallery for product launches. Pure white and a
 * cool mist for bands, near-black ink, one blue for links and compact pills,
 * a burnt-orange accent kept for tiny "New" labels. Inter throughout, set
 * tight; 28px rounded media, no shadows, no gradients in the interface.
 */
import type { Design } from '../../src/lib/types';

export const DESIGN: Design = {
  palette: {
    base: '#ffffff', // gallery white
    contrast: '#1d1d1f', // ink
    primary: '#0068d1', // link + pill blue (≥4.5:1 on white and on mist)
    secondary: '#d6d6d6', // hairline
    accent: '#b64400', // launch label
    muted: '#f5f5f7', // studio mist
  },
  headingFont: 'inter',
  bodyFont: 'inter',
  monoFont: 'system-mono',
  radius: 'round',
  contentSize: '692px',
  wideSize: '1024px',
};

export const THEME_JSON = {
  settings: {
    typography: {
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Medium', size: '1.0625rem', fluid: { min: '1rem', max: '1.0625rem' } },
        { slug: 'large', name: 'Large', size: '1.3125rem', fluid: { min: '1.1875rem', max: '1.3125rem' } },
        { slug: 'x-large', name: 'Extra Large', size: '1.75rem', fluid: { min: '1.5rem', max: '1.75rem' } },
        { slug: 'xx-large', name: 'Huge', size: '2.5rem', fluid: { min: '2rem', max: '2.5rem' } },
        { slug: 'xxx-large', name: 'Gigantic', size: '3.5rem', fluid: { min: '2.5rem', max: '3.5rem' } },
        { slug: 'hero', name: 'Hero', size: '5rem', fluid: { min: '2.75rem', max: '5rem' } },
        { slug: 'fine', name: 'Fine print', size: '0.75rem', fluid: { min: '0.75rem', max: '0.75rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.47', letterSpacing: '-0.022em' },
    elements: {
      heading: { typography: { fontWeight: '600', lineHeight: '1.08', letterSpacing: '-0.015em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|hero', lineHeight: '1.05', letterSpacing: '-0.015em' } },
      h2: { typography: { fontSize: 'var:preset|font-size|xxx-large', lineHeight: '1.07', letterSpacing: '-0.005em' } },
      h3: { typography: { fontSize: 'var:preset|font-size|x-large', lineHeight: '1.14', letterSpacing: '0.007em' } },
      link: { color: { text: 'var:preset|color|primary' } },
      button: {
        color: { background: 'var:preset|color|primary', text: 'var:preset|color|base' },
        typography: { fontSize: 'var:preset|font-size|medium', fontWeight: '400', letterSpacing: '-0.022em' },
        ':hover': { color: { background: 'var:preset|color|primary', text: 'var:preset|color|base' } },
      },
    },
    css: [
      'body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-feature-settings:"cv11","ss01"}',
      'h1,h2,h3{text-wrap:balance}',
      // The global nav is a thin 49px bar: a sticky header (if switched on) is that tall.
      ':root{--pp-header-size:49px}',
      '.wp-block-columns>.wp-block-column>.wp-block-group.has-background:only-child{height:100%;box-sizing:border-box}',
      'p{text-wrap:pretty}',
      'a:where(:not(.wp-element-button)){text-decoration:none}',
      'a:where(:not(.wp-element-button)):hover{text-decoration:underline}',
      '.wp-element-button,.wp-block-button__link{padding:.62em 1.3em;border-radius:9999px;transition:filter .2s}',
      '.wp-element-button:hover,.wp-block-button__link:hover{filter:brightness(1.12)}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:not(.has-background){border:1px solid currentColor;padding:calc(.62em - 1px) calc(1.3em - 1px)}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:not(.has-text-color){color:var(--wp--preset--color--primary)}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:hover{filter:none;background:var(--wp--preset--color--primary);color:var(--wp--preset--color--base)}',
      '::selection{background:color-mix(in srgb,var(--wp--preset--color--primary) 22%,transparent)}',
      ':where(a,button,summary,[tabindex]):focus-visible{outline:2px solid var(--wp--preset--color--primary);outline-offset:3px;border-radius:6px}',
      '.wp-block-separator{border:0;border-top:1px solid var(--wp--preset--color--secondary);opacity:1}',
      '.sr-fine{color:color-mix(in srgb,var(--wp--preset--color--contrast) 62%,var(--wp--preset--color--base))}',
      '.sr-fine a{color:var(--wp--preset--color--primary)}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
      'html{scroll-behavior:smooth}',
      // Photos: rounded like the cards; the film still keeps its text white; the reel scrolls sideways and snaps.
      '.sr-rounded img{border-radius:28px}',
      '.sr-film{color:var(--wp--preset--color--base)}',
      '.sr-film .wp-block-cover__background{background:linear-gradient(to top,rgb(0 0 0/.65),transparent 55%)!important;opacity:1!important}',
      '.sr-reel{gap:1.25rem!important;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 max(1.5rem,calc((100vw - var(--wp--style--global--wide-size,1200px))/2)) 1rem;scrollbar-width:none;-webkit-overflow-scrolling:touch}',
      '.sr-reel::-webkit-scrollbar{display:none}',
      '.sr-reel>.wp-block-image{flex:0 0 min(78vw,26rem);margin:0;scroll-snap-align:center}',
      '.sr-reel img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:28px}',
      '.sr-reel figcaption{margin-top:.75rem;font-size:var(--wp--preset--font-size--small);font-weight:600;color:color-mix(in srgb,currentColor 60%,transparent);text-align:left}',
    ].join('\n'),
  },
};

export const STYLE = {
  key: 'style',
  title: 'Showroom',
  description: 'Product-launch style: a white gallery with mist-grey bands, near-black type set tight in Inter, one blue for links and compact pills, 28px rounded media and no shadows.',
  tags: ['product', 'minimal', 'launch', 'tech'],
};
