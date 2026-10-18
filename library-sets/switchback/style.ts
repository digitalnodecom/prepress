/**
 * Switchback — style. From the "Optimizzly" flavour (flavors.design): an
 * outdoor brand that happens to sell software. Pale sage paper, dark fir ink,
 * a lime that only ever fills (buttons, the face of extruded type), and two
 * candy colours (light blue, pink) that own whole cards. Archivo at 75% width,
 * weight 800–900, for every headline; Hanken Grotesk for text; Roboto Mono for
 * the small uppercase labels.
 *
 * The signature is the type: the emphasised line of each headline (a <mark>
 * in the heading) is a lime face stroked in fir and pushed back through four
 * stepped greens, like a printed sticker. Sections are sheets with rounded
 * shoulders that overlap the sheet above (block style "Overlapping band"); the
 * overlap follows the Design's corners, so with square corners the sheets
 * simply stack. Stickers and drawn things cast hard offset shadows; almost
 * nothing has a soft one. House rules: no grey, no gradient buttons, no
 * blurred text shadows, nothing that only exists after a script runs.
 *
 * Colours outside the six palette slots (the four extrusion greens, pink and
 * the holographic hues) are set tokens in theme.json settings.custom.switchback,
 * so they are editable in WordPress too: var(--wp--custom--switchback--*).
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color } from '../kit';

export const DESIGN: Design = {
  palette: {
    base: '#eff6e9', // pale sage page
    contrast: '#08251a', // dark fir ink: text, dark slabs, every outline
    primary: '#0d3a29', // mid fir: dark buttons, links, plan cards on the dark slab
    secondary: '#ffffff', // white sheets, the featured plan, integration pills
    accent: '#abff44', // lime: buttons, the face of extruded type (always with fir text or a fir stroke)
    muted: '#91dbda', // light blue: the footer sheet, the event card, one story
  },
  headingFont: 'archivo-condensed',
  bodyFont: 'hanken-grotesk',
  monoFont: 'roboto-mono',
  radius: 'round',
  contentSize: '760px',
  wideSize: '1376px',
};

const v = color;
/** A set token (theme.json settings.custom.switchback). */
const t = (k: string) => `var(--wp--custom--switchback--${k})`;
/** A corner from the Design's radius scale, scaled (40px bands are lg × 1.667 on round corners). */
const r = (size: 'sm' | 'md' | 'lg', f = 1) => (f === 1 ? `var(--wp--custom--radius--${size})` : `calc(var(--wp--custom--radius--${size})*${f})`);
const fir = (pct: number) => `color-mix(in srgb,${v('contrast')} ${pct}%,transparent)`;
/** Sage one step darker: logo tiles, cards on white, nav hover. */
const SAGE2 = `color-mix(in srgb,${v('base')} 92%,${v('contrast')})`;
/** The hairline: nav pill, pills, FAQ rows. */
const LINE = `color-mix(in srgb,${v('base')} 82%,${v('accent')})`;
/** The 1px edge on everything lime, one shade darker than the fill. */
const LIME_EDGE = `color-mix(in srgb,${v('accent')} 82%,${t('ex2')})`;
const EASE = 'cubic-bezier(.4,0,.2,1)';
const EASE_OUT = 'cubic-bezier(0,0,.2,1)';
/** Lime face, fir stroke, four stepped greens behind (the static frame of the extrusion). */
const EXTRUDE = `color:${v('accent')};-webkit-text-stroke:.025em ${v('contrast')};paint-order:stroke fill;text-shadow:-.062em .062em 0 ${t('ex2')},-.124em .124em 0 ${t('ex3')},-.186em .186em 0 ${t('ex4')},-.248em .248em 0 ${t('ex5')}`;
/** The wordmark extrudes in solid fir instead. */
const FIR_STACK = (n: number, step: number) => Array.from({ length: n }, (_, i) => `-${(step * (i + 1)).toFixed(3)}em ${(step * (i + 1)).toFixed(3)}em 0 ${v('contrast')}`).join(',');
const MONO = `font-family:var(--wp--preset--font-family--mono);font-size:.75rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase`;
const DISPLAY = `font-family:var(--wp--preset--font-family--heading);font-weight:800;line-height:.9;letter-spacing:-.01em`;
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('switchback', slug, label, types, { css });

/** Switchback's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  // Every section after the first is a sheet: rounded shoulders, pulled up over the sheet above.
  S('band', 'Overlapping band', ['core/group', 'core/cover'], `position:relative;margin-top:calc(${r('lg')}*-1.667)!important;border-radius:${r('lg', 1.667)} ${r('lg', 1.667)} 0 0;overflow:clip`),
  // The first screen: a photograph, its bottom corners rounded, the next sheet's shoulders over them.
  S('hero', 'First screen', ['core/cover'], `border-radius:0 0 ${r('lg', 1.667)} ${r('lg', 1.667)};overflow:clip;padding-bottom:calc(var(--wp--preset--spacing--50) + ${r('lg', 1.667)})!important;
& > .wp-block-cover__inner-container{display:flex;flex-direction:column;align-self:stretch;min-height:min(36rem,70svh)}
& > .wp-block-cover__inner-container > *{width:100%}
& > .wp-block-cover__inner-container > .wp-block-group:last-child{margin-top:auto!important}`),
  // A page's own first sheet, under the floating header.
  S('title', 'Page title sheet', ['core/group'], `padding-top:calc(var(--wp--preset--spacing--80) + 5rem)!important;border-radius:0 0 ${r('lg', 1.667)} ${r('lg', 1.667)}`),
  // The emphasised line of a headline: write it as highlighted text (a <mark>) on its own line.
  S('extrude', 'Extruded line', ['core/heading'], `& mark{display:inline-block;margin:.14em 0 .3em .1em;background:none;${EXTRUDE}}
.has-contrast-background-color &:not(.has-text-color){color:${v('secondary')}}`),
  S('wordmark', 'Wordmark', ['core/site-title'], `${DISPLAY};font-size:2.375rem;font-weight:900;line-height:1;letter-spacing:-.02em;
& a{color:${v('accent')};text-decoration:none;-webkit-text-stroke:.05em ${v('contrast')};paint-order:stroke fill;text-shadow:${FIR_STACK(3, 0.02)}}
@media (max-width:720px){&{font-size:2rem}}`),
  // The name at the foot of the footer, as big as the page is wide.
  S('monument', 'Wordmark, page wide', ['core/paragraph'], `${DISPLAY};margin:0!important;font-size:clamp(4.5rem,17vw,15.625rem);font-weight:900;line-height:1;letter-spacing:-.03em;text-align:center;color:${v('accent')};-webkit-text-stroke:.024em ${v('contrast')};paint-order:stroke fill;text-shadow:${FIR_STACK(6, 0.014)}`),
  S('eyebrow', 'Label (mono capitals)', ['core/paragraph'], MONO),
  // Display type in a paragraph: event marks, prices, stat figures.
  S('outlined', 'Outlined lime mark', ['core/paragraph'], `${DISPLAY};font-size:clamp(3rem,7vw,5.25rem);font-weight:900;letter-spacing:-.02em;color:${v('accent')};-webkit-text-stroke:.05em ${v('contrast')};paint-order:stroke fill`),

  // The header floats over the first screen: the wordmark left, a frosted pill of links and the one action right.
  S('header', 'Floating header', ['core/group'], `position:absolute!important;inset:0 0 auto;z-index:10;padding:1.25rem 2rem!important;
@media (max-width:720px){&{padding:1rem!important}}`),
  S('navpill', 'Frosted link pill', ['core/group'], `gap:2px!important;padding:8px!important;border:1px solid ${LINE};border-radius:${r('md', 1.625)};background:color-mix(in srgb,${v('base')} 85%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
& .wp-block-navigation{gap:2px!important}
& .wp-block-navigation a{display:inline-flex;align-items:center;height:40px;padding:0 1.25rem;border-radius:${r('md', 0.875)};text-decoration:none;letter-spacing:.02em;transition:background-color .15s ${EASE}}
& .wp-block-navigation a:hover{background:${SAGE2}}
& .wp-block-button__link{padding:.55em 1.1em!important;font-size:var(--wp--preset--font-size--medium);border-radius:${r('md', 0.875)}}
@media (max-width:900px){& .wp-block-navigation{display:none!important}&{border:0;background:none;-webkit-backdrop-filter:none;backdrop-filter:none}}`),

  // The bottom of the first screen: lead, action and a proof line left; three glass pills right.
  S('hero-foot', 'First-screen foot', ['core/group'], `justify-content:space-between!important;align-items:flex-end!important;gap:1.5rem!important;
& > .wp-block-group:first-child{display:flex;flex-direction:column;align-items:flex-start;gap:1.25rem}
& > .wp-block-group:first-child > *{margin:0!important}
& > .wp-block-group:first-child > p:first-child{max-width:21rem!important;font-size:var(--wp--preset--font-size--large);font-weight:500;color:${v('accent')};text-shadow:0 1px 0 ${fir(45)},0 0 12px ${fir(75)}}
& > .wp-block-group:first-child > p:last-child{display:flex;align-items:center;gap:8px;font-size:.9375rem;font-weight:500;color:${v('base')}}
& > .wp-block-group:first-child > p:last-child::before{content:"";flex:none;width:11px;height:11px;border:1px solid ${v('contrast')};border-radius:50%;background:${v('accent')}}
@media (max-width:720px){&{flex-direction:column;align-items:stretch!important}& > .wp-block-group:first-child{align-items:center;text-align:center}}`),
  S('pills', 'Floating glass pills', ['core/group'], `position:relative;width:340px;height:150px;flex:none;
& > p{position:absolute;margin:0!important;display:inline-flex;align-items:center;gap:10px;padding:8px 20px 8px 8px;border-radius:${r('lg')};background:color-mix(in srgb,${v('secondary')} 45%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:${v('contrast')};font-weight:500;font-size:1rem;white-space:nowrap}
& > p::before{content:"↯";display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:color-mix(in srgb,${v('secondary')} 75%,transparent);font-weight:900}
& > p:nth-child(1){right:0;top:0}
& > p:nth-child(2){right:90px;top:58px}
& > p:nth-child(3){right:20px;top:116px}
@media (prefers-reduced-motion:no-preference){& > p{animation:sb-bob 5s ease-in-out infinite}& > p:nth-child(2){animation-delay:-1.7s}& > p:nth-child(3){animation-delay:-3.1s}}
@keyframes sb-bob{50%{translate:0 -8px}}
@media (max-width:1080px){&{display:none!important}}`),

  // The event: a photograph slab holding a light blue card, the ticket line and button on the right.
  S('event', 'Event slab', ['core/cover'], `min-height:0;padding:1.5rem!important;border-radius:${r('lg', 1.667)};overflow:clip;
& > .wp-block-cover__inner-container{display:flex;flex-wrap:wrap;align-items:center;gap:1.5rem}
& > .wp-block-cover__inner-container > .wp-block-group:first-child{flex:1 1 34rem;max-width:40rem!important;margin:0!important;padding:1.75rem 2rem 2rem!important;border-radius:${r('sm', 1.5)}}
& > .wp-block-cover__inner-container > .wp-block-group:first-child > *{margin:0!important}
& > .wp-block-cover__inner-container > .wp-block-group:first-child > * + *{margin-top:.75rem!important}
& > .wp-block-cover__inner-container > .wp-block-group:last-child{flex:0 1 18rem;display:flex;flex-direction:column;align-items:flex-end;gap:1rem;margin:0 0 0 auto!important;text-align:right}
& > .wp-block-cover__inner-container > .wp-block-group:last-child > *{margin:0!important}
& > .wp-block-cover__inner-container > .wp-block-group:last-child > p{${MONO};font-size:.8125rem;line-height:1.7;color:${v('accent')};text-shadow:0 0 10px ${fir(80)}}
@media (max-width:720px){&{padding:10px!important}& > .wp-block-cover__inner-container > .wp-block-group:first-child{padding:1.25rem!important}& > .wp-block-cover__inner-container > .wp-block-group:last-child{align-items:flex-start;margin:0 6px 6px!important;text-align:left}}`),
  // Customer names as small tiles, an initial on a square.
  S('logos', 'Name tiles', ['core/group'], `justify-content:center!important;gap:.75rem!important;
& > p{display:flex;align-items:center;gap:12px;margin:0!important;padding:10px 24px 10px 10px;border-radius:${r('sm', 1.5)};background:${v('base')};font-weight:500;font-size:1rem}
& > p strong{display:grid;place-items:center;width:44px;height:44px;border-radius:${r('sm')};background:${SAGE2};${DISPLAY};font-size:1.25rem;font-weight:900}`),
  // Four figures in a row; the third on lime.
  S('stats', 'Figures row', ['core/group'], `display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem!important;
& > .wp-block-group{display:flex;flex-direction:column;gap:6px;margin:0!important;padding:1.5rem;border-radius:${r('lg')};background:${v('base')}}
& > .wp-block-group > *{margin:0!important}
& > .wp-block-group > p:first-child{${DISPLAY};font-size:3.5rem;letter-spacing:-.02em}
& > .wp-block-group > p:last-child{font-size:1rem;color:color-mix(in srgb,${v('contrast')} 62%,${v('base')})}
& > .wp-block-group:nth-child(2) > p:first-child{color:${t('ex2')}}
& > .wp-block-group:nth-child(3){background:${v('accent')}}
& > .wp-block-group:nth-child(3) > p:last-child{color:${v('contrast')}}
@media (max-width:1080px){&{grid-template-columns:repeat(2,minmax(0,1fr))}}`),

  // Product cards: a framed landscape "screenshot" with an app panel drawn over it and a lime chip (the caption), then label, title, text, a dark button.
  S('cards', 'Product cards', ['core/group'], `display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem!important;
& > .wp-block-group{display:flex;flex-direction:column;align-items:flex-start;gap:.75rem;margin:0!important;padding:8px 8px 24px;border-radius:${r('lg')};background:${SAGE2};transition:transform .2s ${EASE_OUT}}
& > .wp-block-group:hover{transform:translateY(-4px)}
& > .wp-block-group > *{margin:0!important}
& > .wp-block-group > :not(.wp-block-image){margin-inline:16px!important}
& > .wp-block-group > .wp-block-image{position:relative;align-self:stretch;margin-bottom:.75rem!important;border-radius:${r('md')};overflow:clip}
& > .wp-block-group > .wp-block-image img{display:block;width:100%;height:240px;object-fit:cover}
& > .wp-block-group > .wp-block-image::before{content:"";position:absolute;inset:18% 11% 13%;border-radius:${r('sm')};background:linear-gradient(${SAGE2},${SAGE2}) top/100% 20px no-repeat,linear-gradient(90deg,${SAGE2} 0 22%,${v('secondary')} 22%);box-shadow:0 24px 48px -24px ${fir(35)}}
& > .wp-block-group > .wp-block-image::after{content:"";position:absolute;left:32%;right:20%;top:calc(18% + 34px);height:8px;border-radius:999px;background:${LINE};box-shadow:0 16px 0 ${LINE},0 32px 0 ${LINE},0 48px 0 ${SAGE2}}
& > .wp-block-group > .wp-block-image figcaption{position:absolute;z-index:1;right:9%;top:26%;margin:0;padding:4px 10px;border:1px solid ${LIME_EDGE};border-radius:${r('sm', 0.875)};background:${v('accent')};color:${v('contrast')};font-size:.75rem;font-weight:500;line-height:1.3}
& > .wp-block-group > p:nth-child(2){${MONO};color:color-mix(in srgb,${v('contrast')} 62%,${v('base')})}
& > .wp-block-group > .wp-block-heading{font-size:var(--wp--preset--font-size--x-large);line-height:1.05;letter-spacing:0}
& > .wp-block-group > p:nth-child(4){flex:1}
@media (max-width:1080px){&{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:720px){&{grid-template-columns:minmax(0,1fr)}}`),

  // Three paths: a sage text card beside drawn things, the sides swapping each row.
  S('paths', 'Alternating rows', ['core/group'], `display:flex!important;flex-direction:column;gap:var(--wp--preset--spacing--70)!important;
& > .wp-block-group{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;gap:3rem!important;margin:0!important}
& > .wp-block-group > .wp-block-group{display:flex;flex-direction:column;gap:.75rem;margin:0!important;padding:2rem;border-radius:${r('lg')};background:${v('base')}}
& > .wp-block-group > .wp-block-group > *{margin:0!important}
& > .wp-block-group > .wp-block-group > .wp-block-heading{font-size:var(--wp--preset--font-size--x-large);line-height:1.05;letter-spacing:0}
& > .wp-block-group > .wp-block-group > p{max-width:30rem}
& > .wp-block-group:nth-child(even) > .wp-block-group{order:2}
@media (max-width:720px){& > .wp-block-group{grid-template-columns:minmax(0,1fr)}& > .wp-block-group:nth-child(even) > .wp-block-group{order:0}& > .wp-block-group > .wp-block-group{padding:1.5rem}}`),

  // Stories: three cards, each its own candy colour; a result set large.
  S('stories', 'Story cards', ['core/group'], `display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem!important;
& > .wp-block-group{display:flex;flex-direction:column;gap:1rem;min-height:21rem;margin:0!important;padding:1.75rem;border-radius:${r('lg')};background:${v('base')}}
& > .wp-block-group:nth-child(2){background:${t('pink')}}
& > .wp-block-group:nth-child(3){background:${v('muted')}}
& > .wp-block-group > *{margin:0!important}
& > .wp-block-group > p:first-child{${MONO}}
& > .wp-block-group > .wp-block-heading{max-width:12ch;font-size:2.5rem}
& > .wp-block-group > p:nth-child(3){flex:1;font-size:1.0625rem;line-height:1.55}
& > .wp-block-group > p:last-child{font-size:.9375rem;color:${v('primary')}}
& > .wp-block-group > p:last-child strong{display:block;font-size:1rem;font-weight:500;color:${v('contrast')}}
@media (max-width:1080px){&{grid-template-columns:repeat(2,minmax(0,1fr))}& > .wp-block-group:last-child{grid-column:1/-1}}
@media (max-width:720px){&{grid-template-columns:minmax(0,1fr)}& > .wp-block-group:last-child{grid-column:auto}}`),

  // Plans on the dark sheet: fir cards with a faint hairline; the middle one white.
  S('plans', 'Plan cards', ['core/group'], `display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem!important;
& > .wp-block-group{display:flex;flex-direction:column;gap:.75rem;margin:0!important;padding:1.75rem;border:1px solid color-mix(in srgb,${v('secondary')} 14%,transparent);border-radius:${r('lg')}}
& > .wp-block-group > *{margin:0!important}
& > .wp-block-group > p:first-child{font-weight:500;color:${v('accent')}}
& > .wp-block-group.has-secondary-background-color > p:first-child{color:${t('ex4')}}
& > .wp-block-group > p:nth-child(2){${DISPLAY};font-size:3.75rem;line-height:1}
& > .wp-block-group > p:nth-child(2) small{margin-left:6px;font-family:var(--wp--preset--font-family--body);font-size:1rem;font-weight:500;letter-spacing:0;opacity:.75}
& > .wp-block-group > p:nth-child(3){flex:1;font-size:1.0625rem}
& > .wp-block-group > .wp-block-buttons .wp-block-button__link{width:100%}
& > .wp-block-group > .wp-block-buttons .wp-block-button{width:100%}
@media (max-width:1080px){&{grid-template-columns:repeat(2,minmax(0,1fr))}& > .wp-block-group:last-child{grid-column:1/-1}}
@media (max-width:720px){&{grid-template-columns:minmax(0,1fr)}& > .wp-block-group:last-child{grid-column:auto}}`),

  // Questions as white rows with a lime plus that turns into a cross.
  S('faq', 'Question rows', ['core/group'], `display:flex!important;flex-direction:column;gap:.75rem!important;
& > .wp-block-details{margin:0!important;border:1px solid ${LINE};border-radius:${r('lg')};background:${v('secondary')}}
& summary{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:1.375rem 1.5rem;list-style:none;cursor:pointer;${DISPLAY};font-size:1.625rem;line-height:1.12;letter-spacing:0}
& summary::-webkit-details-marker{display:none}
& summary::after{content:"+";flex:none;display:grid;place-items:center;width:32px;height:32px;border:1px solid ${LIME_EDGE};border-radius:${r('sm', 1.25)};background:${v('accent')};color:${v('contrast')};font:500 1.625rem/1 var(--wp--preset--font-family--body);transition:transform .2s ${EASE_OUT}}
& [open] summary::after{transform:rotate(45deg)}
& .wp-block-details > p{max-width:62ch;margin:0!important;padding:.25rem 1.5rem 1.625rem;font-size:1.0625rem;line-height:1.55}`),

  // A wall of outlined pills (links); every fifth is lime.
  S('wall', 'Pill wall', ['core/group'], `justify-content:center!important;gap:10px!important;
& > p{display:inline-flex;align-items:center;gap:8px;height:40px;margin:0!important;padding:0 16px;border:1px solid ${LINE};border-radius:${r('sm', 1.25)};background:${v('secondary')};font-weight:500;font-size:1rem;transition:transform .15s ${EASE}}
& > p:hover{transform:translateY(-2px)}
& > p a{color:inherit;text-decoration:none}
& > p::before{content:"";width:14px;height:14px;border-radius:calc(var(--wp--custom--radius--sm)*0.5);background:${t('ex2')}}
& > p:nth-child(3n)::before{border-radius:50%;background:${t('pink')}}
& > p:nth-child(4n)::before{background:${v('muted')}}
& > p:nth-child(5n){border-color:${LIME_EDGE};background:${v('accent')}}
& > p:nth-child(5n)::before{background:${v('contrast')}}`),
  // A frosted panel for text that sits on a photograph.
  S('glass', 'Frosted panel', ['core/group'], `padding:1.25rem 1.5rem!important;border-radius:${r('lg')};background:color-mix(in srgb,${v('secondary')} 55%,transparent);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)`),

  // The last ask: a dark slab with a photograph on one side and the words on the other.
  S('cta', 'Dark slab with picture', ['core/group'], `display:grid!important;grid-template-columns:1fr 1.15fr;gap:1.5rem!important;padding:12px!important;border-radius:${r('lg', 1.667)};
& > *{margin:0!important}
& > .wp-block-image{border-radius:${r('lg')};overflow:clip}
& > .wp-block-image img{display:block;width:100%;height:100%;min-height:24rem;object-fit:cover}
& > .wp-block-group{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:1rem;padding:1.75rem 2rem 2rem .75rem}
& > .wp-block-group > *{margin:0!important}
& > .wp-block-group > p:last-child{max-width:46ch;font-size:.8125rem;opacity:.7}
@media (max-width:1080px){&{grid-template-columns:minmax(0,1fr)}& > .wp-block-image img{min-height:12rem;max-height:16rem}& > .wp-block-group{padding:.5rem 1.25rem 1.25rem}}`),

  // Footer: link columns with condensed headings and a translucent status card.
  S('footer-cols', 'Footer columns', ['core/columns'], `& .wp-block-heading{font-size:1.5rem;margin:0 0 .75rem!important}
& p{margin:0!important;font-weight:500;font-size:1rem;line-height:2}
& a{text-decoration:none}
& a:hover{text-decoration:underline}`),
  S('status', 'Status card', ['core/group'], `padding:1rem 1.25rem!important;border-radius:${r('md')};background:color-mix(in srgb,${v('secondary')} 45%,transparent);
& > *{margin:0!important}
& > p:first-child{display:flex;align-items:center;gap:8px;font-weight:500}
& > p:first-child::before{content:"";width:11px;height:11px;border:1px solid ${v('contrast')};border-radius:50%;background:${v('accent')}}
& > p + p{margin-top:6px!important;font-size:.9375rem}`),

  // Buttons: dark (fir on fir) and holographic (one per page, dark sheets only).
  S('dark', 'Dark button', ['core/button'], `background:${v('primary')};border-color:${v('contrast')};color:${v('base')}`),
  S('holo', 'Holographic edge', ['core/button'], `border-color:transparent;background:linear-gradient(${v('contrast')},${v('contrast')}) padding-box,linear-gradient(90deg,${t('holo--green')},${t('holo--violet')},${t('holo--rose')},${t('holo--cyan')}) border-box;color:${v('base')}`),
];

const CSS = [
  'body{-webkit-font-smoothing:antialiased}',
  'h1,h2,h3{text-wrap:balance}',
  'p{text-wrap:pretty}',
  `::selection{background:${v('accent')};color:${v('contrast')}}`,
  `:where(a,button,summary,[tabindex]):focus-visible{outline:2px solid ${v('contrast')};outline-offset:3px}`,
  // Buttons: a 1px edge one shade darker than the fill; a ring grows outside on hover instead of a lift shadow.
  `.wp-block-button__link{position:relative;border:1px solid ${LIME_EDGE};transition:transform .15s ${EASE}}`,
  `.wp-block-button__link::after{content:"";position:absolute;inset:-4px;border:2px solid ${v('accent')};border-radius:inherit;opacity:0;transition:opacity .15s ${EASE};pointer-events:none}`,
  `.wp-block-button__link:hover{transform:translateY(-1px)}`,
  `.wp-block-button__link:hover::after{opacity:1}`,
  `.wp-block-button.is-style-outline>.wp-block-button__link{border-color:color-mix(in srgb,currentColor 45%,transparent);background:transparent}`,
  `.has-contrast-background-color .wp-block-button.is-style-outline>.wp-block-button__link{color:${v('base')}}`,
  `mark{background:none;color:inherit}`,
  '.wp-site-blocks{overflow-x:clip}',
  // The header floats over the first screen, so the page starts at the very top.
  '.wp-site-blocks>header{margin:0}',
  '.wp-site-blocks>main{margin-block-start:0}',
  '.wp-site-blocks>footer{margin-block-start:0}',
  '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
].join('\n');

export const THEME_JSON = {
  settings: {
    // Set tokens beyond the six palette colours: var(--wp--custom--switchback--…).
    custom: {
      switchback: {
        ex2: '#3ab533',
        ex3: '#40a142',
        ex4: '#2e8c45',
        ex5: '#227d47',
        pink: '#ff99b6',
        holo: { green: '#8ff0a8', cyan: '#4ec9f0', violet: '#a97dff', lime: '#8dff3d', rose: '#ff8fbd' },
      },
    },
    typography: {
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.9375rem', fluid: false },
        { slug: 'medium', name: 'Body', size: '1.125rem', fluid: { min: '1.0625rem', max: '1.125rem' } },
        { slug: 'large', name: 'Lead', size: '1.375rem', fluid: { min: '1.1875rem', max: '1.375rem' } },
        { slug: 'x-large', name: 'Card title', size: '2.25rem', fluid: { min: '1.875rem', max: '2.25rem' } },
        { slug: 'xx-large', name: 'Headline', size: '6rem', fluid: { min: '2.75rem', max: '6rem' } },
        { slug: 'xxx-large', name: 'Display', size: '9.375rem', fluid: { min: '4rem', max: '9.375rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.45' },
    blocks: { 'core/details': null },
    elements: {
      heading: { typography: { fontWeight: '800', lineHeight: '0.9', letterSpacing: '-0.01em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|xx-large' } },
      h2: { typography: { fontSize: 'var:preset|font-size|xx-large' } },
      h3: { typography: { fontSize: 'var:preset|font-size|x-large', lineHeight: '1.05', letterSpacing: '0' } },
      link: { color: { text: 'var:preset|color|primary' } },
      button: {
        color: { background: 'var:preset|color|accent', text: 'var:preset|color|contrast' },
        typography: { fontSize: 'var:preset|font-size|large', fontWeight: '500', letterSpacing: '0.02em', lineHeight: '1' },
        border: { radius: 'calc(var(--wp--custom--radius--md)*1.25)' },
        spacing: { padding: { top: '0.75em', bottom: '0.75em', left: '1.1em', right: '1.1em' } },
      },
    },
    css: CSS,
  },
};

export const STYLE = {
  key: 'style',
  title: 'Switchback',
  description: 'An outdoor poster for a software product: pale sage paper, dark fir ink, lime buttons, condensed Archivo headlines with one line extruded through four stepped greens, sheets with rounded shoulders that overlap, candy-coloured cards and hard offset shadows.',
  tags: ['saas', 'product', 'playful', 'bold'],
};
