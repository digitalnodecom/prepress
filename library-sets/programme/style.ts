/**
 * Programme — style. Dealt by tasteskill v2 ("The name as a monument", seed
 * 2109343206): black ground, off-white ink, a soft grey for secondary notes
 * and one deep crimson for the single action and the price; Hanken Grotesk
 * throughout, two sizes doing nearly all the work (the monument and the text).
 * House rules: no thin rules, no gradients, no shadows at rest, no monospace,
 * no eyebrows, square corners on pictures.
 *
 * The idea: the festival's name is the architecture of the first screen, and
 * the programme reads like a harbour timetable, filled bars on black. The
 * compositions (pinned title over pictures, timetable rows, the price as an
 * object in the line) are block styles; site CSS keeps the globals.
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color } from '../kit';

export const DESIGN: Design = {
  palette: {
    base: '#0a0a0a', // ground
    contrast: '#efefef', // ink
    primary: '#ec3b52', // crimson: the one action, the price (black text on it)
    secondary: '#171717', // surface, one step from the ground
    accent: '#d9d5cc', // harbour stone: the inverted field (black text)
    muted: '#8c8c8c', // soft ink for secondary notes
  },
  headingFont: 'hanken-grotesk',
  bodyFont: 'hanken-grotesk',
  monoFont: 'system-mono',
  radius: 'none',
  contentSize: '680px',
  wideSize: '1360px',
};

const v = color;
const EASE = 'cubic-bezier(.2,.7,.2,1)';
const ENTER_KEYS = '@keyframes pg-enter{from{opacity:0;transform:translateY(1.5rem)}}';
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('programme', slug, label, types, { css });

/** Programme's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  // First screen: the name pinned at the top while the pictures under it scroll past; dates and the action pinned at the foot.
  S('pinned', 'Pinned name over pictures', ['core/group'], `position:relative;
& > .wp-block-heading:first-child{position:sticky;top:0;z-index:2;margin:0!important;padding-top:clamp(.5rem,2vh,1.5rem);font-size:clamp(5rem,35vw,40rem);font-weight:500;line-height:.8;letter-spacing:-.06em;text-align:center;color:${v('primary')};pointer-events:none}
& > .wp-block-image{position:relative;z-index:1;width:min(37vw,34rem)!important;margin:-18vw auto 0!important}
& > .wp-block-image + .wp-block-image{margin-top:12vh!important}
& > .wp-block-image img{aspect-ratio:2/3;object-fit:cover;width:100%;height:auto}
& > .wp-block-group:last-child{position:sticky;bottom:0;z-index:3;align-items:flex-end!important;justify-content:space-between!important;padding-block:2rem!important;pointer-events:none}
& > .wp-block-group:last-child > *{pointer-events:auto}
& > .wp-block-group:last-child > p{max-width:24ch!important;margin:0!important}
@media (max-width:700px){& > .wp-block-heading:first-child{font-size:35vw;padding-top:1rem}& > .wp-block-image{width:100%!important;margin-top:-6vw!important}& > .wp-block-group:last-child{flex-direction:column;align-items:stretch!important;gap:.75rem!important;padding:1rem 0!important;background:${v('base')}}& > .wp-block-group:last-child > p{max-width:none!important;font-size:var(--wp--preset--font-size--medium)}}
@media (prefers-reduced-motion:no-preference){& > .wp-block-heading:first-child{animation:pg-rise 1s ${EASE} both}}
@keyframes pg-rise{from{transform:translateY(30%);opacity:0}}`),
  // One day of the programme: filled timetable bars.
  S('day', 'Timetable day', ['core/group'], `& > .wp-block-heading{margin:0 0 1.25rem!important}
& > * + *{margin-top:6px!important}`),
  S('slot', 'Timetable row (time · what · where)', ['core/group'], `display:grid!important;grid-template-columns:7rem minmax(0,1fr) minmax(8rem,14rem);gap:.25rem 1.5rem!important;align-items:baseline!important;padding:1.1rem 1.25rem!important;background:${v('secondary')};transition:background-color .2s;
& p{margin:0!important}
& > p:first-child{font-size:var(--wp--preset--font-size--large);font-weight:500;font-variant-numeric:tabular-nums lining-nums;letter-spacing:-.02em}
& > .wp-block-group > p:first-child{font-size:var(--wp--preset--font-size--large);font-weight:500;line-height:1.2;letter-spacing:-.015em}
& > .wp-block-group > p + p{margin-top:.3rem!important;color:${v('muted')}}
& > p:last-child{text-align:right;color:${v('muted')}}
&:hover{background:color-mix(in srgb,${v('contrast')} 9%,${v('secondary')})}
@media (max-width:640px){&{grid-template-columns:4.5rem minmax(0,1fr)}& > p:last-child{grid-column:2;text-align:left}& > p:first-child{font-size:var(--wp--preset--font-size--medium)}}`),
  // The price as an object in the line: the figure sits on a crimson block one line tall.
  S('price', 'Price on a block', ['core/heading'], `& mark{background:${v('primary')};color:${v('base')};padding:0 .15em;box-decoration-break:clone;-webkit-box-decoration-break:clone}`),
  S('lead-row', 'Text left, action right', ['core/group'], `justify-content:space-between!important;align-items:flex-end!important;gap:2rem!important;
& > p{max-width:34ch!important;margin:0!important}
@media (max-width:640px){&{flex-direction:column;align-items:flex-start!important}& .wp-block-buttons,& .wp-block-button{width:100%}& .wp-block-button__link{width:100%}}`),
  // The name again, edge to edge, its feet cropped by the bottom of the page.
  S('monument', 'Name, edge to edge', ['core/paragraph', 'core/heading'], `margin:0!important;font-size:clamp(5rem,35vw,40rem);font-weight:500;line-height:.8;letter-spacing:-.06em;text-align:center;overflow:hidden;height:.74em`),
  // A statement in the right half; one square picture hangs from its last line on the left, a small note under it.
  S('split', 'Statement right, picture left', ['core/group'], `display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:var(--wp--preset--spacing--40)!important;
& > *{margin:0!important}
& > p:first-child{grid-column:7/13;grid-row:1;font-size:clamp(1.5rem,1.1rem + 1.2vw,2.125rem);line-height:1.25;letter-spacing:-.02em;text-indent:3em}
& > .wp-block-image{grid-column:1/4;grid-row:1/3;align-self:end;margin-bottom:-60%!important}
& > .wp-block-image img{aspect-ratio:1;object-fit:cover;width:100%;height:auto}
& > p:last-child{grid-column:1/3;grid-row:3;margin-top:calc(60% + 6rem)!important;color:${v('muted')};font-size:var(--wp--preset--font-size--small)}
@media (max-width:781px){&{grid-template-columns:3fr 7fr;row-gap:1.5rem}& > p:first-child{grid-column:1/-1;text-indent:0}& > .wp-block-image{grid-column:2;grid-row:2;margin:0!important}& > p:last-child{grid-column:1;grid-row:2;align-self:end;margin:0!important}}`),
  // People: tall portraits in black and white that take their colour on hover, name and what they do underneath.
  S('people', 'Portrait grid', ['core/group'], `display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:3.5rem var(--wp--preset--spacing--40)!important;
& > *{margin:0!important}
& > :nth-child(3n+2){margin-top:4rem!important}
& p{margin:0!important}
& .wp-block-image{margin:0 0 1rem!important;overflow:hidden}
& .wp-block-image img{aspect-ratio:3/4;object-fit:cover;width:100%;height:auto;filter:grayscale(1) contrast(1.05);transition:filter .5s ${EASE},transform .6s ${EASE}}
& > *:hover img{filter:none;transform:scale(1.03)}
& .wp-block-image + p{font-size:var(--wp--preset--font-size--large);font-weight:500;letter-spacing:-.02em}
& .wp-block-image + p + p{color:${v('muted')}}
& p:last-child:not(:nth-child(2)){margin-top:.75rem!important;font-size:var(--wp--preset--font-size--small)}
@media (max-width:781px){&{grid-template-columns:repeat(2,minmax(0,1fr));gap:2.5rem 1rem!important}& > :nth-child(3n+2){margin-top:0!important}& > :nth-child(2n){margin-top:3rem!important}}`),
  // Prints dropped on the headline: two or three photographs on paper, tilted, laid over a giant two-line word.
  S('prints', 'Prints over a headline', ['core/group'], `position:relative;display:grid!important;place-items:center;min-height:min(100svh,62rem);
& > *{grid-area:1/1;margin:0!important}
& > .wp-block-heading{font-size:clamp(5rem,15vw,15rem);line-height:.85;letter-spacing:-.06em;text-align:center}
& > .wp-block-image{position:relative;z-index:1;width:min(19vw,18rem)!important;padding:.5rem;background:${v('contrast')};transition:transform .25s ${EASE}}
& > .wp-block-image img{aspect-ratio:3/4;object-fit:cover;width:100%;height:auto}
& > .wp-block-image:nth-of-type(1){transform:translate(-78%,34%) rotate(-8deg)}
& > .wp-block-image:nth-of-type(2){transform:translate(62%,26%) rotate(6deg)}
& > .wp-block-image:nth-of-type(3){width:min(13vw,12rem)!important;transform:translate(270%,-95%) rotate(-3deg)}
& > .wp-block-image:hover{z-index:2;transform:translate(0,0) rotate(0)}
& > p{align-self:end;justify-self:start;max-width:30ch!important}
@media (max-width:700px){&{min-height:78svh}& > .wp-block-heading{align-self:start;margin-top:3rem!important;font-size:19vw}& > .wp-block-image{width:40vw!important}& > .wp-block-image:nth-of-type(1){transform:translate(-45%,12%) rotate(-6deg)}& > .wp-block-image:nth-of-type(2){transform:translate(42%,-4%) rotate(5deg)}& > .wp-block-image:nth-of-type(3){display:none}}`),
  // A numbered place: its number on a crimson dot, the name, what happens there and how to find it.
  S('place', 'Numbered place', ['core/group'], `display:grid!important;grid-template-columns:2.5rem minmax(0,1fr);gap:.2rem 1.25rem!important;padding:1.1rem 1.25rem!important;background:${v('secondary')};
& > *{margin:0!important}
& > p:first-child{grid-row:1/4;display:grid;place-items:center;width:2.25rem;height:2.25rem;border-radius:50%;background:${v('primary')};color:${v('base')};font-weight:700;font-variant-numeric:tabular-nums}
& > .wp-block-heading{font-size:var(--wp--preset--font-size--large)}
& > p + p{color:${v('muted')}}
& + &{margin-top:6px!important}`),
  // Questions indented under a wide heading; an open question lays a tile behind itself.
  S('questions', 'Indented questions', ['core/group'], `& > .wp-block-details{margin:0 0 0 33%!important;padding:1rem 1.5rem!important;transition:background-color .2s}
& > .wp-block-details + .wp-block-details{margin-top:1rem!important}
& > .wp-block-details[open]{background:${v('secondary')}}
& summary{list-style:none;display:flex;justify-content:space-between;gap:1rem;font-size:clamp(1.1875rem,1rem + .5vw,1.4375rem);font-weight:400;cursor:pointer}
& summary::-webkit-details-marker{display:none}
& summary::after{content:"";flex:none;width:.6rem;height:.6rem;margin-top:.4rem;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .25s ${EASE}}
& [open] summary::after{transform:rotate(225deg)}
& .wp-block-details > p{max-width:48ch;margin-top:.75rem!important;color:${v('muted')}}
@media (max-width:781px){& > .wp-block-details{margin-left:calc(var(--wp--preset--spacing--30) * -1)!important;margin-right:calc(var(--wp--preset--spacing--30) * -1)!important}}`),
  // Side facts beside a wide paragraph, then a record list beside its one-word label.
  S('facts', 'Facts beside a paragraph', ['core/columns'], `& > .wp-block-column:first-child{flex:0 0 min(30%,14rem)!important}
& > .wp-block-column:first-child p{margin:0!important;font-size:var(--wp--preset--font-size--small)}
& > .wp-block-column:first-child p:nth-child(odd){color:${v('muted')}}
& > .wp-block-column:first-child p:nth-child(odd):not(:first-child){margin-top:1.1rem!important}
& > .wp-block-column:last-child > p{font-size:clamp(1.25rem,1rem + .8vw,1.625rem);line-height:1.35;letter-spacing:-.015em;max-width:36em}
& .wp-block-list{list-style:none;padding:0;columns:2 16rem;column-gap:4rem;font-size:var(--wp--preset--font-size--small)}
& .wp-block-list li{break-inside:avoid;padding:.35rem 0}`),
  // The address as display type, fitted to the width; hover takes the crimson.
  S('email', 'Address as display type', ['core/paragraph'], `font-size:clamp(2.5rem,8.4vw,9rem);font-weight:400;line-height:1;letter-spacing:-.05em;overflow-wrap:anywhere;
& a{text-decoration:none;color:inherit;transition:color .2s}
& a:hover{color:${v('primary')}}
@media (max-width:640px){&{font-size:9.6vw;overflow-wrap:normal}}`),
  S('header', 'Header row', ['core/group'], `& .wp-block-navigation a{text-decoration:none}
& .wp-block-navigation a:hover{color:${v('primary')}}
@media (max-width:700px){& .wp-block-navigation{display:none}}`),
];

const CSS = [
  'body{-webkit-font-smoothing:antialiased;font-kerning:normal;color-scheme:dark}',
  'h1,h2,h3{text-wrap:balance}',
  'p{text-wrap:pretty}',
  'a{text-decoration-thickness:1px;text-underline-offset:.2em}',
  `a:hover{color:${v('primary')}}`,
  `:where(.has-accent-background-color,.has-contrast-background-color) a:where(:not(.wp-element-button)){color:inherit}`,
  `::selection{background:${v('primary')};color:${v('contrast')}}`,
  `:where(a,button,summary,label,[tabindex]):focus-visible{outline:2px solid ${v('contrast')};outline-offset:3px}`,
  `.wp-element-button,.wp-block-button__link{border-radius:0;transition:background-color .2s,color .2s,transform .15s}`,
  `.wp-element-button:active,.wp-block-button__link:active{transform:translateY(1px)}`,
  '.wp-site-blocks{overflow-x:clip}',
  // Entrances: a section's parts rise in as it enters (the pinned first screen keeps still).
  `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){`,
  `.entry-content>.alignfull:not(.is-style-programme-pinned)>*{animation:pg-enter linear both;animation-timeline:view();animation-range:entry 5% entry 50%}`,
  `.entry-content>.alignfull>*:nth-child(2){animation-range:entry 10% entry 58%}`,
  `.entry-content>.alignfull>*:nth-child(n+3){animation-range:entry 15% entry 65%}`,
  `}}`,
  ENTER_KEYS,
  '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
  'html{scroll-behavior:smooth}',
].join('\n');

export const THEME_JSON = {
  settings: {
    typography: {
      // Two sizes do the work (display, body); lead and head in between; small for notes.
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Body', size: '1.1875rem', fluid: { min: '1.0625rem', max: '1.1875rem' } },
        { slug: 'large', name: 'Lead', size: '1.625rem', fluid: { min: '1.25rem', max: '1.625rem' } },
        { slug: 'x-large', name: 'Head', size: '4rem', fluid: { min: '2.25rem', max: '4rem' } },
        { slug: 'xx-large', name: 'Display', size: '8.5rem', fluid: { min: '3.5rem', max: '8.5rem' } },
        { slug: 'xxx-large', name: 'Display (large)', size: '8.5rem', fluid: { min: '3.5rem', max: '8.5rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.45', letterSpacing: '-0.005em' },
    // No hairlines: questions are separated by space and an open tile (block style "Indented questions").
    blocks: { 'core/details': null },
    elements: {
      heading: { typography: { fontWeight: '500', lineHeight: '0.95', letterSpacing: '-0.045em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|xx-large' } },
      h2: { typography: { fontSize: 'var:preset|font-size|x-large' } },
      h3: { typography: { fontSize: 'var:preset|font-size|large', lineHeight: '1.15', letterSpacing: '-0.02em' } },
      link: { color: { text: 'var:preset|color|contrast' } },
      button: {
        color: { background: 'var:preset|color|primary', text: 'var:preset|color|base' },
        typography: { fontSize: 'var:preset|font-size|medium', fontWeight: '500' },
        spacing: { padding: { top: '1em', bottom: '1em', left: '1.8em', right: '1.8em' } },
        ':hover': { color: { background: 'var:preset|color|contrast', text: 'var:preset|color|base' } },
      },
    },
    css: CSS,
  },
};

export const STYLE = {
  key: 'style',
  title: 'Programme',
  description: 'A festival programme on black: the name set edge to edge as the first screen, off-white text, one deep crimson for the price and the single action; Hanken Grotesk in two sizes, timetable rows as filled bars, square corners.',
  tags: ['event', 'festival', 'conference', 'dark'],
};
