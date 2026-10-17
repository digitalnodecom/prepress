/**
 * Showroom — style: a white gallery for product launches. Pure white and a
 * cool mist for bands, near-black ink, one blue for links and compact pills,
 * a burnt-orange accent kept for tiny "New" labels. Inter throughout, set
 * tight; rounded media (the large radius), no shadows, no gradients in the interface.
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color, font, radius } from '../kit';

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
      // The header part sticks with the global nav scrolled out of view, so the product bar under it stays at the top.
      '.wp-site-blocks>header.wp-block-template-part{position:sticky;top:calc(-1 * var(--pp-header-size));z-index:20}',
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
      ':where(a,button,summary,[tabindex]):focus-visible{outline:2px solid var(--wp--preset--color--primary);outline-offset:3px;border-radius:var(--wp--custom--radius--sm)}',
      '.wp-block-separator{border:0;border-top:1px solid var(--wp--preset--color--secondary);opacity:1}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
      'html{scroll-behavior:smooth}',
    ].join('\n'),
  },
};

const BODY = font('body');
const FINE = `color-mix(in srgb,${color('contrast')} 62%,${color('base')})`;
const PILL_HOVER = `color-mix(in srgb,${color('primary')} 86%,white)`;
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('showroom', slug, label, types, { css });

/** Showroom's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  // Fine print: muted text, blue links (footnotes, the footer).
  S('fine', 'Fine print', ['core/paragraph', 'core/navigation'], `color:${FINE};
& a{color:${color('primary')}}`),
  // A compact blue pill (pricing capsule, product bar).
  S('pill', 'Compact pill', ['core/button'], `padding:.55em 1.15em;font-family:${BODY};font-size:.8rem;letter-spacing:-.01em;white-space:nowrap;
&:hover{background:${PILL_HOVER};filter:none}`),
  // The floating pricing capsule: price and a line of financing, then a pill; a hairline, no shadow.
  S('capsule', 'Pricing capsule', ['core/group'], `width:fit-content;gap:.6rem 1.4rem;padding:.75rem .8rem .75rem 1.6rem;border-radius:${radius('lg')};box-shadow:0 0 0 1px ${color('secondary')};
& p{margin:0;font-family:${BODY};font-size:.875rem;line-height:1.3;letter-spacing:-.016em;color:${FINE}}
& p strong{font-weight:600;color:${color('contrast')}}`),
  // The product's own bar: frosted, a hairline below; it stays at the top while the page scrolls.
  S('product-bar', 'Product bar', ['core/group'], `position:sticky;top:var(--pp-header-h, 0px);z-index:20;margin-block:0!important;background:color-mix(in srgb,${color('base')} 78%,transparent);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid ${color('secondary')};
& > .wp-block-group{gap:1rem}
& > .wp-block-group > p:first-child{font-family:${font('heading')};font-weight:600;font-size:1.2rem;letter-spacing:.012em}
& > .wp-block-group > p:first-child a{color:inherit;text-decoration:none}
& .wp-block-group .wp-block-group{gap:1.5rem}
& .wp-block-group .wp-block-group > p{font-family:${BODY};font-size:.75rem;letter-spacing:-.01em}
& .wp-block-group .wp-block-group > p a{color:color-mix(in srgb,${color('contrast')} 80%,${color('base')});text-decoration:none}
& .wp-block-group .wp-block-group > p a:hover{color:${color('primary')}}
& .wp-block-button .wp-block-button__link{padding:.45em 1em;font-size:.75rem}
@media (max-width:640px){& .wp-block-group .wp-block-group > p{display:none}}`),
  // In-page chapter links: a quiet centred row.
  S('chapters', 'Chapter links', ['core/list'], `display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem 2.6rem;padding:1.75rem 0;list-style:none;
& li{margin:0}
& a{font-family:${BODY};font-weight:500;font-size:1.0625rem;line-height:1.47;letter-spacing:-.022em;color:inherit;text-decoration:none}
& a:hover{color:${color('primary')};text-decoration:none}`),
  // One headline number from the tech specs: figure (unit in <small>), label, note.
  S('spec', 'Spec figure', ['core/group'], `padding-top:1.1rem;border-top:1px solid ${color('secondary')};
& p{margin:0}
& > p:first-child{font-family:${font('heading')};font-weight:600;font-size:clamp(2.5rem,5vw,3.5rem);line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
& > p:first-child small{font-size:.5em;font-weight:500;letter-spacing:0;margin-left:.08em}
& > p:nth-child(2){margin-top:.55rem;font-family:${BODY};font-weight:600;font-size:1.0625rem;letter-spacing:-.022em}
& > p:nth-child(3){margin-top:.2rem;font-family:${BODY};font-size:.875rem;letter-spacing:-.016em;color:${FINE}}`),
  // Finish swatches: dark, light, brand and accent, mixed from the palette; the first is shown selected.
  S('finishes', 'Finish swatches', ['core/list'], `display:flex;flex-wrap:wrap;justify-content:center;gap:1.4rem 2.2rem;padding:0;list-style:none;
& li{display:flex;flex-direction:column;align-items:center;gap:.7rem;margin:0;font-family:${BODY};font-size:.875rem;letter-spacing:-.016em}
& li::before{content:"";display:block;width:2.6rem;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 1px color-mix(in srgb,${color('contrast')} 18%,transparent)}
& li:first-child::before{outline:2px solid ${color('primary')};outline-offset:3px}
& li:nth-child(4n+1)::before{background:linear-gradient(145deg,color-mix(in srgb,${color('contrast')} 80%,${color('base')}),color-mix(in srgb,${color('contrast')} 96%,black))}
& li:nth-child(4n+2)::before{background:linear-gradient(145deg,${color('base')},color-mix(in srgb,${color('contrast')} 16%,${color('base')}))}
& li:nth-child(4n+3)::before{background:linear-gradient(145deg,color-mix(in srgb,${color('primary')} 60%,${color('contrast')}),color-mix(in srgb,${color('primary')} 35%,${color('contrast')}))}
& li:nth-child(4n)::before{background:linear-gradient(145deg,color-mix(in srgb,${color('accent')} 60%,${color('base')}),${color('accent')})}`),
  // Photos rounded like the cards.
  S('rounded', 'Rounded like the cards', ['core/image'], `& img{border-radius:${radius('lg')}}`),
  // The film still: white type over a dark fade at the foot of the photo.
  S('film', 'Film still', ['core/cover'], `color:${color('base')}`),
  // A full-width reel of portrait shots that scrolls sideways and snaps.
  S('reel', 'Sideways reel', ['core/group'], `gap:1.25rem!important;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 max(1.5rem,calc((100vw - var(--wp--style--global--wide-size,1200px))/2)) 1rem;scrollbar-width:none;-webkit-overflow-scrolling:touch;
&::-webkit-scrollbar{display:none}
& > .wp-block-image{flex:0 0 min(78vw,26rem);margin:0;scroll-snap-align:center}
& img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:${radius('lg')}}
& figcaption{margin-top:.75rem;font-size:var(--wp--preset--font-size--small);font-weight:600;color:color-mix(in srgb,currentColor 60%,transparent);text-align:left}`),
];

export const STYLE = {
  key: 'style',
  title: 'Showroom',
  description: 'Product-launch style: a white gallery with mist-grey bands, near-black type set tight in Inter, one blue for links and compact pills, rounded media and no shadows.',
  tags: ['product', 'minimal', 'launch', 'tech'],
};
