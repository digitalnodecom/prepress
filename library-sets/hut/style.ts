/**
 * Passport — style. Dealt by tasteskill v2 ("The page is the object", seed
 * 904979176): sand ground, paper cards, charcoal ink, moss for actions and a
 * deep leaf-green field; Bebas Neue over EB Garamond with a twenty-fold size
 * gap. House rules: no thin rules, no gradients, no shadows at rest, no
 * monospace, no eyebrows, square buttons.
 *
 * The section compositions (passport page, drag row, giant word, printed
 * sheet, menu lines, receipt, split FAQ, visit card, back-of-the-card footer)
 * and their motion (scroll progress, curtain footer) are block styles
 * (BLOCK_STYLES); site CSS keeps the globals and the section entrances.
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color, radius } from '../kit';

export const DESIGN: Design = {
  palette: {
    base: '#ddd6c6', // sand ground
    contrast: '#2a2a26', // ink
    primary: '#4f6238', // moss: actions
    secondary: '#d0c8b5', // surface, one step from the ground
    accent: '#3f5a2a', // deep leaf-green field
    muted: '#ebeae6', // paper (bone, low chroma)
  },
  headingFont: 'bebas-neue',
  bodyFont: 'eb-garamond',
  monoFont: 'system-mono',
  radius: 'none',
  stickyHeader: true,
  contentSize: '640px',
  wideSize: '1280px',
};

const v = color;
const EASE = 'cubic-bezier(.2,.7,.2,1)';
/** Scalloped top (and optionally bottom) edge as a mask: a row of round bites. */
const SCALLOPS = (r: number, period: number, bottom = true) =>
  `radial-gradient(circle at 50% 0,#0000 ${r}px,#000 ${r + 0.5}px) top/${period}px 51% repeat-x${bottom ? `,radial-gradient(circle at 50% 100%,#0000 ${r}px,#000 ${r + 0.5}px) bottom/${period}px 51% repeat-x` : `,linear-gradient(#000,#000) bottom/100% 51% no-repeat`}`;
/** Four scalloped (cut-out) corners as a mask. */
const CORNERS = (r: string) =>
  `radial-gradient(circle at 0 0,#0000 ${r},#000 calc(${r} + .5px)) top left/51% 51% no-repeat,radial-gradient(circle at 100% 0,#0000 ${r},#000 calc(${r} + .5px)) top right/51% 51% no-repeat,radial-gradient(circle at 0 100%,#0000 ${r},#000 calc(${r} + .5px)) bottom left/51% 51% no-repeat,radial-gradient(circle at 100% 100%,#0000 ${r},#000 calc(${r} + .5px)) bottom right/51% 51% no-repeat`;
/** The receipt's zigzag foot (13 teeth). */
const ZIGZAG = `polygon(0 0,100% 0,100% calc(100% - 14px),${Array.from({ length: 13 }, (_, i) => `${100 - (i + 0.5) * (100 / 13)}% ${i % 2 ? 'calc(100% - 14px)' : '100%'}`).join(',')},0 calc(100% - 14px))`;
/** Scroll entrance for a block's children: heading, then text, then picture. */
const ENTER = (staggered: boolean) => `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){
& > *{animation:hp-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}${staggered ? `
& > *:nth-child(2){animation-range:entry 10% entry 62%}
& > *:nth-child(n+3){animation-range:entry 15% entry 70%}` : ''}
}}
@keyframes hp-enter{from{opacity:0;transform:translateY(1.5rem)}}`;
const COVER_IMG = '& img{aspect-ratio:var(--hp-ratio);object-fit:cover;width:100%;height:auto}';
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('hut', slug, label, types, { css });

/** Passport's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  // The first screen as a page of the walker's passport: a clip box holding a paper card with cut corners.
  S('passport', 'Passport page', ['core/group'], `box-sizing:content-box;height:min(calc(100svh - 7.5rem),58rem);min-height:30rem;overflow:hidden;display:flex!important;justify-content:center!important;padding-top:clamp(1.5rem,6vh,4rem);margin-block:0!important;
& > .wp-block-group{position:relative;box-sizing:border-box;width:min(100%,36rem)!important;aspect-ratio:5/7;flex:none!important;margin:0!important;padding:clamp(2rem,5vw,3.5rem) clamp(1.25rem,4vw,3.5rem)!important;text-align:center;-webkit-mask:${CORNERS('1.6rem')};mask:${CORNERS('1.6rem')}}
& h1{margin:0!important;font-weight:400;text-transform:uppercase;line-height:.85;letter-spacing:-.02em;font-size:clamp(4.5rem,15vw,8.5rem);text-indent:-14%}
& h1 mark{display:block;text-indent:0;transform:translateX(9%)}
& > .wp-block-group > p{margin:1.4rem auto 0!important;max-width:22ch!important;font-style:italic;font-size:clamp(1.25rem,1.1rem + .7vw,1.625rem);line-height:1.3}
& > .wp-block-group > .wp-block-group{display:flex!important;flex-direction:column;align-items:center!important;gap:.9rem!important;margin:1.8rem 0 0!important}
& > .wp-block-group > .wp-block-group p{margin:0!important;font-size:1.1875rem}
& > .wp-block-group > .wp-block-group p + p::before{content:"";display:block;width:.6rem;height:.6rem;margin:0 auto .9rem;background:${v('contrast')};transform:rotate(45deg)}
& .wp-block-prepress-hut-stamp{position:absolute!important;right:4%;top:57%;width:clamp(6.5rem,24%,9rem)!important;margin:0!important;transform:rotate(-14deg);opacity:.88;mix-blend-mode:multiply}
& .hp-stampbox{width:100%;transform:none}
& .hp-stampbox svg{animation:none}
@media (prefers-reduced-motion:no-preference){& > .wp-block-group{animation:hp-rise .9s ${EASE} both}& .wp-block-prepress-hut-stamp{animation:hp-stamp .5s ${EASE} .7s both}}
@keyframes hp-rise{from{transform:translateY(6rem)}}
@keyframes hp-stamp{from{transform:rotate(-14deg) scale(1.6);opacity:0}}
@media (max-width:600px){&{padding-top:1rem}& h1{text-indent:0}& h1 mark{transform:none}& .wp-block-prepress-hut-stamp{position:relative!important;right:auto;top:auto;margin:1.8rem auto 0!important;width:8rem!important}}`),
  // Header row on the sand field
  S('header', 'Header row', ['core/group'], `& .wp-block-navigation a{text-decoration:none}
& .wp-block-navigation a:hover{text-decoration:underline}
@media (max-width:700px){& .wp-block-navigation{display:none}& .wp-block-group.alignwide{flex-wrap:nowrap!important}}`),
  // Drag row of moments (the walk up): the section shares the row's scroll timeline with the progress bar
  S('walk', 'Drag-row section', ['core/group'], 'timeline-scope:--hp-row'),
  S('progress', 'Row progress bar', ['core/spacer'], `height:6px;background:${v('secondary')};overflow:hidden;
&::after{content:"";display:block;height:100%;width:100%;background:${v('contrast')};transform-origin:left;transform:scaleX(.18)}
@supports (animation-timeline:scroll()){&::after{animation:hp-progress linear both;animation-timeline:--hp-row}}
@keyframes hp-progress{from{transform:scaleX(.08)}to{transform:scaleX(1)}}`),
  S('row', 'Drag row (snaps sideways)', ['core/group'], `display:flex!important;flex-wrap:nowrap!important;gap:2rem!important;overflow-x:auto;scroll-snap-type:x mandatory;scroll-timeline:--hp-row x;scrollbar-width:none;padding-inline:var(--wp--preset--spacing--50);scroll-padding-inline:var(--wp--preset--spacing--50);padding-bottom:.5rem;
&::-webkit-scrollbar{display:none}
& > *{flex:0 0 17.5rem!important;scroll-snap-align:start;display:flex!important;flex-direction:column}
& > * > p:first-child{font-weight:600}
& > :nth-child(3n+1) .wp-block-image{padding-top:5rem}
& > :nth-child(3n+2) .wp-block-image{padding-top:8.5rem}
& > :nth-child(3n) .wp-block-image{padding-top:6.5rem}
& img{aspect-ratio:4/5;object-fit:cover;width:100%;height:auto}
@media (max-width:640px){& > *{flex-basis:72vw!important}& > :nth-child(3n+1) .wp-block-image{padding-top:2rem}& > :nth-child(3n+2) .wp-block-image{padding-top:4rem}& > :nth-child(3n) .wp-block-image{padding-top:3rem}}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){
& > * > *{animation:hp-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}
& > * > *:nth-child(2){animation-range:entry 10% entry 62%}
& > * > *:nth-child(n+3){animation-range:entry 15% entry 70%}
}}
@keyframes hp-enter{from{opacity:0;transform:translateY(1.5rem)}}`),
  // Giant word over filled bars (the seven lakes)
  S('lakes', 'Filled bars under a giant word', ['core/group'], `container-type:inline-size;
& .wp-block-details{margin-top:6px!important;background:${v('secondary')};padding:0 1.1rem!important}
& .wp-block-details summary{list-style:none;display:flex;justify-content:space-between;align-items:center;min-height:3.5rem;font-weight:500;font-size:1.1875rem;cursor:pointer}
& .wp-block-details summary::-webkit-details-marker{display:none}
& .wp-block-details summary::after{content:"+";font-family:var(--wp--preset--font-family--heading);font-size:1.8rem;line-height:1;transition:transform .25s ${EASE}}
& .wp-block-details[open] summary::after{transform:rotate(45deg)}
& .wp-block-details summary:hover{color:${v('primary')}}
& .wp-block-details > :not(summary){padding-bottom:1.1rem!important;margin-top:0!important}
${ENTER(false)}`),
  S('giant', 'Giant word (fills its box)', ['core/heading'], 'font-size:49cqw;line-height:.8;letter-spacing:-.04em;margin:0!important'),
  // The hut in photographs: one wide picture over three tall ones, captions in small italic
  S('lead', 'Narrow lead', ['core/paragraph'], 'max-width:32rem!important'),
  S('wide', 'Wide photograph (16:9)', ['core/image'], `--hp-ratio:16/9;${COVER_IMG}
:where(&) figcaption{margin-top:.6rem;font-size:var(--wp--preset--font-size--small);font-style:italic;text-align:left}`),
  S('three', 'Tall photographs (4:5)', ['core/columns'], `--hp-ratio:4/5;${COVER_IMG}
:where(&) figcaption{margin-top:.6rem;font-size:var(--wp--preset--font-size--small);font-style:italic;text-align:left}`),
  // The printed sheet (kitchen), scalloped top and bottom
  S('sheet', 'Printed sheet (scalloped)', ['core/group'], `box-sizing:border-box;max-width:37rem!important;margin-inline:auto!important;padding:4rem clamp(1.25rem,5vw,3.5rem)!important;-webkit-mask:${SCALLOPS(9, 26)};mask:${SCALLOPS(9, 26)};
& h3{margin-top:2.75rem!important}
${ENTER(true)}`),
  // A printed menu line: name — dot leader — price, a note underneath
  S('dish', 'Menu line (dot leader)', ['core/group'], `margin-block-start:1.1rem!important;
& p{margin:0!important}
& > .wp-block-group{display:flex!important;align-items:baseline!important;gap:.5rem!important;font-size:1.1875rem}
& > .wp-block-group::after{content:"";order:1;flex:1 1 1rem;min-width:1rem;height:0;border-bottom:4px dotted currentColor;opacity:.55;transform:translateY(-.25em)}
& > .wp-block-group > p:last-child{order:2;font-variant-numeric:tabular-nums lining-nums}
& > p{max-width:34ch!important;margin-top:.2rem!important;font-style:italic;font-size:1.1875rem;line-height:1.4}`),
  // A receipt slip with a zigzag foot: title, itemised rows, note, total under a heavy bar
  S('receipt', 'Receipt slip (zigzag foot)', ['core/group'], `box-sizing:border-box;width:min(100%,24rem)!important;margin-inline:auto!important;padding:2rem 1.75rem 3.25rem!important;clip-path:${ZIGZAG};
& p{margin:0!important}
& > *{margin-block:0!important}
& > p:first-child{text-align:center;font-weight:600;font-size:1.625rem}
& > .wp-block-group{display:flex!important;justify-content:space-between!important;gap:1rem!important;padding:.45rem 0;font-size:1.1875rem}
& > p:first-child + .wp-block-group{margin-top:1.4rem!important}
& > .wp-block-group > p:last-child{font-variant-numeric:tabular-nums lining-nums}
& > p:not(:first-child){margin-top:1.4rem!important;font-style:italic;font-size:1.1875rem;line-height:1.4}
& > .wp-block-group:last-child{align-items:baseline!important;margin-top:1.2rem!important;padding:1rem 0 0;border-top:4px solid ${v('contrast')}}
& > .wp-block-group:last-child > p:last-child{font-family:var(--wp--preset--font-family--heading);font-weight:400;font-size:2.75rem;line-height:.9;font-variant-numeric:tabular-nums}`),
  // Questions beside a tall photograph
  S('faq', 'Questions without lines', ['core/column'], `& .wp-block-details{margin-top:1.75rem!important}
& .wp-block-details summary{list-style:none;display:flex;justify-content:space-between;gap:1rem;font-size:1.625rem;line-height:1.2;cursor:pointer}
& .wp-block-details summary::-webkit-details-marker{display:none}
& .wp-block-details summary::after{content:"";flex:none;width:.6rem;height:.6rem;margin-top:.45rem;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .25s ${EASE}}
& .wp-block-details[open] summary::after{transform:rotate(225deg)}
& .wp-block-details > :not(summary){margin-top:.6rem!important}`),
  S('tall', 'Tall photograph (rises out)', ['core/image'], `margin-top:calc(var(--wp--preset--spacing--80) * -1)!important;
& img{aspect-ratio:3/4;object-fit:cover;width:100%;height:auto}
@media (max-width:781px){&{margin-top:0!important}}`),
  S('overlap', 'Overlapping square', ['core/image'], `width:36%!important;margin:-28% 0 0 -2.5rem!important;position:relative!important;z-index:1;border:.5rem solid ${v('secondary')};
& img{aspect-ratio:1;object-fit:cover;width:100%;height:auto}
@media (max-width:781px){&{margin:-24% 0 0 auto!important}}`),
  // Visit card on a photograph
  S('visit', 'Full-screen photograph (slow drift)', ['core/cover'], `min-height:100svh;
& .wp-block-cover__inner-container{display:flex!important;justify-content:flex-end!important;align-items:flex-start!important;height:100%}
@media (max-width:640px){&{min-height:70svh;align-items:flex-end!important}}
@media (prefers-reduced-motion:no-preference){& .wp-block-cover__image-background{animation:hp-drift 40s ease-in-out infinite alternate}}
@keyframes hp-drift{from{transform:scale(1)}to{transform:scale(1.08) translate(-1.5%,-1%)}}`),
  S('card', 'Paper card', ['core/group'], `box-sizing:border-box;width:min(100%,25rem)!important;margin:0!important;padding:2rem!important;border-radius:${radius('md')};
@media (max-width:640px){&{width:100%!important;margin-bottom:-5rem!important}}`),
  // Footer: the back of the card, revealed by the curtain
  S('back', 'Back of the card (scalloped top)', ['core/group'], `box-sizing:border-box;-webkit-mask:${SCALLOPS(22, 100, false)};mask:${SCALLOPS(22, 100, false)};padding-top:4.5rem!important;
& p{max-width:68ch!important}
& > p:last-child{margin-inline:auto!important}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){&{animation:hp-turn linear both;animation-timeline:view();animation-range:entry 0% cover 40%}}}
@keyframes hp-turn{from{transform:translateY(8rem) rotate(-1.5deg)}}`),
  S('postmark', 'Postmarked picture', ['core/image'], `width:5.5rem!important;margin:0 0 1.5rem auto!important;padding:.375rem!important;background:${v('muted')};transform:rotate(4deg);
& img{aspect-ratio:3/4;object-fit:cover;width:100%;height:auto}`),
];

const CSS = [
  // Base voice
  'body{-webkit-font-smoothing:antialiased;font-feature-settings:"kern","liga","onum"}',
  'h1,h2,h3{text-wrap:balance}',
  'p{text-wrap:pretty}',
  `a{text-decoration-thickness:1px;text-underline-offset:.2em}`,
  `a:hover{text-decoration-thickness:2px}`,
  `::selection{background:${v('primary')};color:${v('muted')}}`,
  `:where(a,button,summary,label,[tabindex]):focus-visible{outline:3px solid ${v('primary')};outline-offset:3px}`,
  `.wp-element-button,.wp-block-button__link{border-radius:0;padding:.9em 1.6em;transition:background-color .2s,transform .15s}`,
  `.wp-element-button:active,.wp-block-button__link:active{transform:translateY(1px)}`,
  `:where(.has-accent-background-color,.has-contrast-background-color) a:where(:not(.wp-element-button)){color:inherit}`,
  // Entrances: heading, then text, then picture, as each section enters (rows, bars and sheets stagger their own children)
  `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){`,
  `.entry-content>.alignfull>*:not(.is-style-hut-row),.entry-content>.alignfull .wp-block-column>*{animation:hp-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}`,
  `.entry-content>.alignfull .wp-block-column>*:nth-child(2){animation-range:entry 10% entry 62%}`,
  `.entry-content>.alignfull .wp-block-column>*:nth-child(n+3){animation-range:entry 15% entry 70%}`,
  `}}`,
  `@keyframes hp-enter{from{opacity:0;transform:translateY(1.5rem)}}`,
  '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
  'html{scroll-behavior:smooth}',
].join('\n');

export const THEME_JSON = {
  settings: {
    typography: {
      // Five steps do the visible work: small, body, lead, head, display.
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Body', size: '1.1875rem', fluid: { min: '1.0625rem', max: '1.1875rem' } },
        { slug: 'large', name: 'Lead', size: '1.625rem', fluid: { min: '1.25rem', max: '1.625rem' } },
        { slug: 'x-large', name: 'Head', size: '2.75rem', fluid: { min: '2rem', max: '2.75rem' } },
        { slug: 'xx-large', name: 'Display', size: '5.5rem', fluid: { min: '2.5rem', max: '5.5rem' } },
        { slug: 'xxx-large', name: 'Display (large)', size: '5.5rem', fluid: { min: '2.5rem', max: '5.5rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.45' },
    // No hairlines: details are separated by space and fills (the set's own CSS), not the default bottom border.
    blocks: { 'core/details': null },
    elements: {
      heading: { typography: { fontWeight: '400', lineHeight: '0.85', letterSpacing: '-0.02em', textTransform: 'uppercase' } },
      h1: { typography: { fontSize: 'var:preset|font-size|xx-large' } },
      h2: { typography: { fontSize: 'var:preset|font-size|xx-large' } },
      h3: { typography: { fontSize: 'var:preset|font-size|x-large', lineHeight: '0.9' } },
      link: { color: { text: 'var:preset|color|contrast' } },
      button: {
        color: { background: 'var:preset|color|primary', text: 'var:preset|color|muted' },
        typography: { fontFamily: 'var:preset|font-family|body', fontSize: 'var:preset|font-size|medium', fontWeight: '500' },
        ':hover': { color: { background: 'var:preset|color|contrast', text: 'var:preset|color|muted' } },
      },
    },
    css: CSS,
  },
};

export const STYLE = {
  key: 'style',
  title: 'Passport',
  description: 'Mountain-hut stationery: sand ground, paper cards with cut and scalloped edges, charcoal ink, moss for actions; Bebas Neue capitals over EB Garamond, square buttons, no rules or shadows.',
  tags: ['outdoor', 'hospitality', 'stationery', 'print'],
};
