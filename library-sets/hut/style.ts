/**
 * Passport — style. Dealt by tasteskill v2 ("The page is the object", seed
 * 904979176): sand ground, paper cards, charcoal ink, moss for actions and a
 * deep leaf-green field; Bebas Neue over EB Garamond with a twenty-fold size
 * gap. House rules: no thin rules, no gradients, no shadows at rest, no
 * monospace, no eyebrows, square buttons.
 *
 * The section compositions (drag row, giant word, printed sheet, split FAQ,
 * visit card, back-of-the-card footer) and the motion layer (entrances,
 * scroll progress, curtain footer) live here as classes the patterns use.
 */
import type { Design } from '../../src/lib/types';

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

const v = (slug: string) => `var(--wp--preset--color--${slug})`;
const EASE = 'cubic-bezier(.2,.7,.2,1)';
/** Scalloped top (and optionally bottom) edge as a mask: a row of round bites. */
const SCALLOPS = (r: number, period: number, bottom = true) =>
  `radial-gradient(circle at 50% 0,#0000 ${r}px,#000 ${r + 0.5}px) top/${period}px 51% repeat-x${bottom ? `,radial-gradient(circle at 50% 100%,#0000 ${r}px,#000 ${r + 0.5}px) bottom/${period}px 51% repeat-x` : `,linear-gradient(#000,#000) bottom/100% 51% no-repeat`}`;

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
  // Header row on the sand field
  `.hp-header .wp-block-navigation a{text-decoration:none}`,
  `.hp-header .wp-block-navigation a:hover{text-decoration:underline}`,
  `@media (max-width:700px){.hp-header .wp-block-navigation{display:none}.hp-header .wp-block-group.alignwide{flex-wrap:nowrap!important}}`,
  // Drag row of moments (the walk up): scroll-snap row, varied gaps, a progress bar tied to the row's scroll
  `.hp-walk{timeline-scope:--hp-row}`,
  `.hp-bar{height:6px;background:${v('secondary')};overflow:hidden}`,
  `.hp-bar::after{content:"";display:block;height:100%;width:100%;background:${v('contrast')};transform-origin:left;transform:scaleX(.18)}`,
  `@supports (animation-timeline:scroll()){.hp-bar::after{animation:hp-progress linear both;animation-timeline:--hp-row}}`,
  `@keyframes hp-progress{from{transform:scaleX(.08)}to{transform:scaleX(1)}}`,
  `.hp-row{display:flex!important;flex-wrap:nowrap!important;gap:2rem!important;overflow-x:auto;scroll-snap-type:x mandatory;scroll-timeline:--hp-row x;scrollbar-width:none;padding-inline:var(--wp--preset--spacing--50);scroll-padding-inline:var(--wp--preset--spacing--50);padding-bottom:.5rem}`,
  `.hp-row::-webkit-scrollbar{display:none}`,
  `.hp-row>*{flex:0 0 17.5rem!important;scroll-snap-align:start;display:flex;flex-direction:column}`,
  `.hp-row>*>p:first-child{font-weight:600}`,
  `.hp-row>:nth-child(3n+1) .wp-block-image{padding-top:5rem}.hp-row>:nth-child(3n+2) .wp-block-image{padding-top:8.5rem}.hp-row>:nth-child(3n) .wp-block-image{padding-top:6.5rem}`,
  `.hp-row img{aspect-ratio:4/5;object-fit:cover;width:100%;height:auto}`,
  `@media (max-width:640px){.hp-row>*{flex-basis:72vw!important}.hp-row>:nth-child(3n+1) .wp-block-image{padding-top:2rem}.hp-row>:nth-child(3n+2) .wp-block-image{padding-top:4rem}.hp-row>:nth-child(3n) .wp-block-image{padding-top:3rem}}`,
  // Giant word over filled bars (the seven lakes)
  `.hp-lakes{container-type:inline-size}`,
  `.hp-giant{font-size:49cqw!important;line-height:.8!important;letter-spacing:-.04em!important;margin:0!important}`,
  `.hp-lakes .wp-block-details{margin-top:6px!important;background:${v('secondary')};padding:0 1.1rem}`,
  `.hp-lakes .wp-block-details summary{list-style:none;display:flex;justify-content:space-between;align-items:center;min-height:3.5rem;font-weight:500;font-size:1.1875rem;cursor:pointer}`,
  `.hp-lakes .wp-block-details summary::-webkit-details-marker{display:none}`,
  `.hp-lakes .wp-block-details summary::after{content:"+";font-family:var(--wp--preset--font-family--heading);font-size:1.8rem;line-height:1;transition:transform .25s ${EASE}}`,
  `.hp-lakes .wp-block-details[open] summary::after{transform:rotate(45deg)}`,
  `.hp-lakes .wp-block-details summary:hover{color:${v('primary')}}`,
  `.hp-lakes .wp-block-details>:not(summary){padding-bottom:1.1rem;margin-top:0}`,
  // The printed sheet (kitchen), scalloped top and bottom
  `.hp-sheet{box-sizing:border-box;max-width:37rem!important;margin-inline:auto!important;padding:4rem clamp(1.25rem,5vw,3.5rem)!important;-webkit-mask:${SCALLOPS(9, 26)};mask:${SCALLOPS(9, 26)}} /* taste-skill-ignore: mask cuts the scalloped edge, no fill */`,
  `.hp-sheet h3{margin-top:2.75rem!important}`,
  // Receipt column: the slip rises out of the top of its section
  `.hp-slipcol{margin-top:calc(var(--wp--preset--spacing--80) * -1)}`,
  `@media (max-width:781px){.hp-slipcol{margin-top:0}}`,
  // Questions beside a tall photograph
  `.hp-faq .wp-block-details{margin-top:1.75rem!important}`,
  `.hp-faq .wp-block-details summary{list-style:none;display:flex;justify-content:space-between;gap:1rem;font-size:1.625rem;line-height:1.2;cursor:pointer}`,
  `.hp-faq .wp-block-details summary::-webkit-details-marker{display:none}`,
  `.hp-faq .wp-block-details summary::after{content:"";flex:none;width:.6rem;height:.6rem;margin-top:.45rem;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .25s ${EASE}}`,
  `.hp-faq .wp-block-details[open] summary::after{transform:rotate(225deg)}`,
  `.hp-faq .wp-block-details>:not(summary){margin-top:.6rem!important}`,
  `.hp-tall{margin-top:calc(var(--wp--preset--spacing--80) * -1)!important}`,
  `.hp-tall img{aspect-ratio:3/4;object-fit:cover;width:100%;height:auto}`,
  `.hp-overlap{width:36%!important;margin:-28% 0 0 -2.5rem!important;position:relative;z-index:1;border:.5rem solid ${v('secondary')}}`,
  `.hp-overlap img{aspect-ratio:1;object-fit:cover;width:100%;height:auto}`,
  `@media (max-width:781px){.hp-tall{margin-top:0!important}.hp-overlap{margin:-24% 0 0 auto!important}}`,
  // Visit card on a photograph
  `.hp-visit{min-height:100svh!important}`,
  `.hp-visit .wp-block-cover__inner-container{display:flex;justify-content:flex-end;align-items:flex-start;height:100%}`,
  `.hp-card{box-sizing:border-box;width:min(100%,25rem)!important;margin:0!important;padding:2rem!important;border-radius:8px}`,
  `@media (max-width:640px){.hp-visit{min-height:70svh!important;align-items:flex-end!important}.hp-card{width:100%!important;margin-bottom:-5rem!important}}`,
  `@media (prefers-reduced-motion:no-preference){.hp-visit .wp-block-cover__image-background{animation:hp-drift 40s ease-in-out infinite alternate}}`,
  `@keyframes hp-drift{from{transform:scale(1)}to{transform:scale(1.08) translate(-1.5%,-1%)}}`,
  // Footer: the back of the card, revealed by the curtain
  `.hp-back{box-sizing:border-box;-webkit-mask:${SCALLOPS(22, 100, false)};mask:${SCALLOPS(22, 100, false)};padding-top:4.5rem!important} /* taste-skill-ignore: mask cuts the scalloped edge, no fill */`,
  `.hp-postmark{width:5.5rem!important;margin:0 0 1.5rem auto!important;padding:.375rem;background:${v('muted')};transform:rotate(4deg)}`,
  `.hp-postmark img{aspect-ratio:3/4;object-fit:cover;width:100%;height:auto}`,
  `.hp-back p{max-width:68ch}`,
  `.hp-back>p:last-child{margin-inline:auto}`,
  `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.hp-back{animation:hp-turn linear both;animation-timeline:view();animation-range:entry 0% cover 40%}}}`,
  `@keyframes hp-turn{from{transform:translateY(8rem) rotate(-1.5deg)}}`,
  // Entrances: heading, then text, then picture, as each section enters
  `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){`,
  `.entry-content>.alignfull>*:not(.hp-row):not(.hp-bar),.entry-content>.alignfull .wp-block-column>*,.hp-row>*>*,.hp-lakes>*,.hp-sheet>*{animation:hp-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}`,
  `.entry-content>.alignfull .wp-block-column>*:nth-child(2),.hp-row>*>*:nth-child(2),.hp-sheet>*:nth-child(2){animation-range:entry 10% entry 62%}`,
  `.entry-content>.alignfull .wp-block-column>*:nth-child(n+3),.hp-row>*>*:nth-child(n+3),.hp-sheet>*:nth-child(n+3){animation-range:entry 15% entry 70%}`,
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
