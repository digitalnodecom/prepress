/**
 * Chorus — style. Dealt by tasteskill v2 ("The product performs", seed
 * 1372792141): frost ground, a paler blue-grey step, slate ink, one teal for
 * actions; Bricolage Grotesque throughout. The interface fragments carry the
 * colour; the page stays quiet around them.
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color, radius } from '../kit';

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

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const ENTER_KEYS = '@keyframes ch-enter{from{opacity:0;transform:translateY(1.5rem)}}';

const CSS = [
  'body{-webkit-font-smoothing:antialiased;font-optical-sizing:auto}',
  'h1,h2,h3{text-wrap:balance}',
  'p{text-wrap:pretty}',
  'a{text-decoration-thickness:1px;text-underline-offset:.2em}',
  `::selection{background:${color('primary')};color:${color('base')}}`,
  `:where(a,button,summary,label,[tabindex]):focus-visible{outline:2px solid ${color('primary')};outline-offset:3px}`,
  `.wp-element-button,.wp-block-button__link{border-radius:${radius('md')};transition:background-color .2s,transform .15s}`,
  `.wp-element-button:active,.wp-block-button__link:active{transform:translateY(1px)}`,
  // Entrances: each section's children rise in as they scroll into view (the pinned blocks keep still)
  `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){`,
  `.entry-content>.alignfull>*:not(.wp-block-prepress-chorus-notes):not(.wp-block-prepress-chorus-stages){animation:ch-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}`,
  `}}`,
  ENTER_KEYS,
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

/** The same rise-in the site CSS gives every section's children, for children inside a styled block. */
const ENTER = (sel: string, ranges: [string, string][] = []) => `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){${sel}{animation:ch-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}${ranges.map(([s, r]) => `${s}{animation-range:${r}}`).join('')}}}
${ENTER_KEYS}`;
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('chorus', slug, label, types, { css });
/** Board tiles in order: copyright, menu, place, write to us, wordmark, get the app (of 12 columns). */

/** Frost's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  S('header', 'Frost header', ['core/group'], `& .wp-block-navigation a{text-decoration:none}
& .wp-block-navigation a:hover{text-decoration:underline}
@media (max-width:700px){& .wp-block-navigation .wp-block-navigation-item:not(:first-child){display:none}& .alignwide{flex-wrap:nowrap!important}}`),
  S('sticky', 'Sticky beside its column', ['core/heading', 'core/group'], `position:sticky;top:calc(var(--pp-header-h, 0px) + 2rem);
@media (max-width:781px){&{position:static}}`),
  // FAQ: filled tiles; the open tile turns teal
  S('tiles', 'Questions as filled tiles', ['core/column', 'core/group'], `& .wp-block-details{margin-top:8px!important;padding:0 1.5rem;background:${color('secondary')};border-radius:${radius('md')};border:0;transition:background-color .25s}
& .wp-block-details summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:1rem;min-height:4.5rem;font-weight:500;font-size:1.125rem;cursor:pointer}
& .wp-block-details summary::-webkit-details-marker{display:none}
& .wp-block-details summary::after{content:"";flex:none;width:1rem;height:1rem;background:linear-gradient(currentColor,currentColor) center/100% 3px no-repeat,linear-gradient(currentColor,currentColor) center/3px 100% no-repeat;transition:transform .25s ${EASE}} /* taste-skill-ignore: two drawn bars, no fill gradient */
& .wp-block-details:hover{background:${color('muted')}}
& .wp-block-details[open]{background:${color('primary')};color:${color('base')}}
& .wp-block-details[open] summary::after{transform:rotate(45deg)}
& .wp-block-details>:not(summary){max-width:52ch;margin-top:0;padding-bottom:1.5rem}
${ENTER('&>*', [['&>*:nth-child(2n)', 'entry 10% entry 62%']])}`),
  // CTA: the sentence ends in the two buttons, set at the sentence's size
  S('sentence', 'Buttons at sentence size', ['core/buttons'], `& .wp-block-button__link{font-size:clamp(1.5rem,1rem + 2.4vw,3rem);font-weight:600;letter-spacing:-.03em;padding:.25em .6em;border-radius:${radius('md')}}
& .wp-block-button:last-child .wp-block-button__link{background:${color('contrast')}}`),
  // Footer: a board of tiles. The spans are the tiles' own grid column spans (block settings).
  S('board', 'Board of tiles', ['core/group'], `gap:8px!important;
&>*{border-radius:${radius('md')};min-height:13.75rem;display:flex;flex-direction:column;justify-content:space-between}
&>:has(>.is-style-chorus-wordmark){min-height:20rem;justify-content:center}
@media (max-width:781px){&{grid-template-columns:repeat(2,minmax(0,1fr))!important}&>*{grid-column:span 1!important;min-height:9rem;min-width:0;overflow-wrap:anywhere}&>:has(>.is-style-chorus-wordmark),&>.is-style-chorus-go{grid-column:span 2!important;order:-1}&>:has(>.is-style-chorus-wordmark){order:-2;min-height:10rem}}`),
  S('wordmark', 'Wordmark', ['core/paragraph'], 'font-size:clamp(4rem,11vw,10rem);line-height:.9;letter-spacing:-.05em;text-align:center'),
  // A whole tile that is one link; it darkens on hover and its arrow moves
  S('go', 'Link tile', ['core/group'], `position:relative;transition:box-shadow .2s;
&:hover{box-shadow:inset 0 0 0 100vmax ${color('contrast')}}
& a{text-decoration:none;color:inherit}
& a::after{content:"";position:absolute;inset:0}
&:hover .is-style-chorus-arrow{transform:translateX(.4rem)}`),
  S('arrow', 'Arrow', ['core/paragraph'], `font-size:clamp(3rem,6vw,5rem);line-height:1;align-self:flex-end;transition:transform .25s ${EASE}`),
  // Plates as a strip (the birds it knows)
  S('plates', 'Strip of tall plates', ['core/columns'], `& img{aspect-ratio:5/8;object-fit:cover;width:100%;height:auto;border-radius:${radius('md')}}
${ENTER('&>*', [['&>*:nth-child(2)', 'entry 10% entry 62%'], ['&>*:nth-child(3)', 'entry 15% entry 70%']])}`),
  S('places', 'Places (portrait photos, two-line captions)', ['core/columns'], `& img{aspect-ratio:4/5;object-fit:cover;width:100%;height:auto;border-radius:${radius('md')}}
& figcaption{display:flex;flex-direction:column;gap:.15rem;margin-top:.75rem;font-size:var(--wp--preset--font-size--small);text-align:left;color:inherit}
& figcaption strong{font-size:var(--wp--preset--font-size--medium);font-weight:600;letter-spacing:-.01em}
${ENTER('&>*')}`),
  S('wide-photo', 'Wide photograph (21:9)', ['core/image'], `margin-bottom:var(--wp--preset--spacing--40)!important;
& img{aspect-ratio:21/9;object-fit:cover;width:100%;height:auto;border-radius:${radius('md')}}`),
  S('dawn', 'Display line over a photograph', ['core/cover'], '& h2{font-size:clamp(2.5rem,1.2rem + 5vw,6rem);letter-spacing:-.04em;line-height:.95}'),
  S('aside', 'Short line, flush left', ['core/paragraph'], 'max-width:34rem;margin-left:0!important'),
];

export const STYLE = {
  key: 'style',
  title: 'Frost',
  description: 'App-landing style where the product performs: frost ground with blue-grey steps, slate ink, one teal for actions, Bricolage Grotesque throughout, filled tiles instead of lines.',
  tags: ['app', 'software', 'minimal', 'product'],
};
