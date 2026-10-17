/**
 * Chorus — style. Dealt by tasteskill v2 ("The product performs", seed
 * 1372792141): frost ground, a paler blue-grey step, slate ink, one teal for
 * actions; Bricolage Grotesque throughout. The interface fragments carry the
 * colour; the page stays quiet around them.
 */
import type { Design } from '../../src/lib/types';

export const DESIGN: Design = {
  palette: {
    base: '#f7f9fa', // frost ground
    contrast: '#1f3038', // slate ink
    primary: '#0d7480', // teal: actions only
    secondary: '#e6ecef', // surface, one step from the ground
    accent: '#5d6b72', // soft ink
    muted: '#d9e2e6', // field, a second step
  },
  headingFont: 'bricolage',
  bodyFont: 'bricolage',
  monoFont: 'system-mono',
  radius: 'soft',
  stickyHeader: true,
  contentSize: '720px',
  wideSize: '1320px',
};

const v = (slug: string) => `var(--wp--preset--color--${slug})`;
const EASE = 'cubic-bezier(.2,.7,.2,1)';

const CSS = [
  'body{-webkit-font-smoothing:antialiased;font-optical-sizing:auto}',
  'h1,h2,h3{text-wrap:balance}',
  'p{text-wrap:pretty}',
  'a{text-decoration-thickness:1px;text-underline-offset:.2em}',
  `::selection{background:${v('primary')};color:${v('base')}}`,
  `:where(a,button,summary,label,[tabindex]):focus-visible{outline:2px solid ${v('primary')};outline-offset:3px}`,
  `.wp-element-button,.wp-block-button__link{border-radius:6px;transition:background-color .2s,transform .15s}`,
  `.wp-element-button:active,.wp-block-button__link:active{transform:translateY(1px)}`,
  // Header
  `.ch-header .wp-block-navigation a{text-decoration:none}.ch-header .wp-block-navigation a:hover{text-decoration:underline}`,
  `@media (max-width:700px){.ch-header .wp-block-navigation .wp-block-navigation-item:not(:first-child){display:none}.ch-header .alignwide{flex-wrap:nowrap!important}}`,
  // FAQ: sticky heading beside filled tiles; the open tile turns teal
  `.ch-faq-h{position:sticky;top:calc(var(--pp-header-h, 0px) + 2rem)}`,
  `@media (max-width:781px){.ch-faq-h{position:static}}`,
  `.ch-tiles .wp-block-details{margin-top:8px!important;padding:0 1.5rem;background:${v('secondary')};border-radius:6px;border:0;transition:background-color .25s}`,
  `.ch-tiles .wp-block-details summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:1rem;min-height:4.5rem;font-weight:500;font-size:1.125rem;cursor:pointer}`,
  `.ch-tiles .wp-block-details summary::-webkit-details-marker{display:none}`,
  `.ch-tiles .wp-block-details summary::after{content:"";flex:none;width:1rem;height:1rem;background:linear-gradient(currentColor,currentColor) center/100% 3px no-repeat,linear-gradient(currentColor,currentColor) center/3px 100% no-repeat;transition:transform .25s ${EASE}} /* taste-skill-ignore: two drawn bars, no fill gradient */`,
  `.ch-tiles .wp-block-details:hover{background:${v('muted')}}`,
  `.ch-tiles .wp-block-details[open]{background:${v('primary')};color:${v('base')}}`,
  `.ch-tiles .wp-block-details[open] summary::after{transform:rotate(45deg)}`,
  `.ch-tiles .wp-block-details>:not(summary){max-width:52ch;margin-top:0;padding-bottom:1.5rem}`,
  // CTA: the sentence ends in the two buttons, set at the sentence's size
  `.ch-blank .wp-block-button__link{font-size:clamp(1.5rem,1rem + 2.4vw,3rem);font-weight:600;letter-spacing:-.03em;padding:.25em .6em;border-radius:8px}`,
  `.ch-blank .wp-block-button:last-child .wp-block-button__link{background:${v('contrast')}}`,
  // Footer: a board of tiles
  `.ch-board{gap:8px!important}`,
  `.ch-board>*{border-radius:6px;min-height:13.75rem;display:flex;flex-direction:column;justify-content:space-between}`,
  `.ch-board .ch-span-4{grid-column:span 4}.ch-board .ch-span-3{grid-column:span 3}.ch-board .ch-span-2{grid-column:span 2}.ch-board .ch-span-8{grid-column:span 8;min-height:20rem;justify-content:center}`,
  `.ch-wordmark{font-size:clamp(4rem,11vw,10rem)!important;line-height:.9!important;letter-spacing:-.05em!important;text-align:center}`,
  `.ch-go{transition:background-color .2s}.ch-go:hover{background:${v('contrast')}!important}`,
  `.ch-go a{text-decoration:none;color:inherit}.ch-go a::after{content:"";position:absolute;inset:0}.ch-go{position:relative}`,
  `.ch-arrow{font-size:clamp(3rem,6vw,5rem)!important;line-height:1!important;align-self:flex-end;transition:transform .25s ${EASE}}.ch-go:hover .ch-arrow{transform:translateX(.4rem)}`,
  `@media (max-width:781px){.ch-board{grid-template-columns:repeat(2,minmax(0,1fr))!important}.ch-board>*{grid-column:span 1!important;min-height:9rem;min-width:0;overflow-wrap:anywhere}.ch-board .ch-span-8,.ch-board .ch-go{grid-column:span 2!important;order:-1}.ch-board .ch-span-8{order:-2;min-height:10rem}}`,
  // Plates as a strip (the birds it knows)
  `.ch-plates img{aspect-ratio:5/8;object-fit:cover;width:100%;height:auto;border-radius:6px}`,
  // Entrances: heading, text, then the fragment
  `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){`,
  `.entry-content>.alignfull>*:not(.wp-block-prepress-chorus-notes):not(.wp-block-prepress-chorus-stages),.ch-tiles>*,.ch-plates>*,.ch-cap{animation:ch-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}`,
  `.ch-tiles>*:nth-child(2n),.ch-plates>*:nth-child(2){animation-range:entry 10% entry 62%}`,
  `.ch-plates>*:nth-child(3){animation-range:entry 15% entry 70%}`,
  `}}`,
  `@keyframes ch-enter{from{opacity:0;transform:translateY(1.5rem)}}`,
  '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
  'html{scroll-behavior:smooth}',
].join('\n');

export const THEME_JSON = {
  settings: {
    typography: {
      // Five steps: small, body, lead, head, display.
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Body', size: '1.125rem', fluid: { min: '1.0625rem', max: '1.125rem' } },
        { slug: 'large', name: 'Lead', size: '1.625rem', fluid: { min: '1.25rem', max: '1.625rem' } },
        { slug: 'x-large', name: 'Head', size: '2rem', fluid: { min: '1.625rem', max: '2rem' } },
        { slug: 'xx-large', name: 'Display', size: '4rem', fluid: { min: '2.5rem', max: '4rem' } },
        { slug: 'xxx-large', name: 'Display (large)', size: '4rem', fluid: { min: '2.5rem', max: '4rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.5' },
    blocks: { 'core/details': null },
    elements: {
      heading: { typography: { fontWeight: '600', lineHeight: '0.95', letterSpacing: '-0.04em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|xx-large' } },
      h2: { typography: { fontSize: 'var:preset|font-size|xx-large' } },
      h3: { typography: { fontSize: 'var:preset|font-size|x-large', letterSpacing: '-0.02em', lineHeight: '1.1' } },
      link: { color: { text: 'var:preset|color|contrast' } },
      button: {
        color: { background: 'var:preset|color|primary', text: 'var:preset|color|base' },
        typography: { fontSize: 'var:preset|font-size|medium', fontWeight: '500' },
        ':hover': { color: { background: 'var:preset|color|contrast', text: 'var:preset|color|base' } },
      },
    },
    css: CSS,
  },
};

export const STYLE = {
  key: 'style',
  title: 'Frost',
  description: 'App-landing style where the product performs: frost ground with blue-grey steps, slate ink, one teal for actions, Bricolage Grotesque throughout, filled tiles instead of lines.',
  tags: ['app', 'software', 'minimal', 'product'],
};
