/**
 * Showroom — blocks. One custom block: product hardware drawn in CSS (a
 * foldable that unfolds as it scrolls in, a closed foldable, a camera back, a
 * watch). Everything else in the set — pricing capsule, product bar, chapter
 * links, spec figures, finish swatches — is core blocks with the set's block
 * styles (style.ts), so its text stays editable inline (docs/THEME-SYSTEM.md).
 *
 * Custom-block CSS is global, so every rule is namespaced under
 * `.wp-block-prepress-showroom-<slug>` / `.sr-*`. The hardware is greys mixed
 * from base/contrast and its screens are lit with primary/accent, so devices
 * restyle with the palette too. Corner radii are part of the drawing's
 * geometry (proportions, not the Design's corners), so they sit on the
 * drawing's elements, like path data in an SVG.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const MIX = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
const BODY = 'var(--wp--preset--font-family--body)';
const HEADING = 'var(--wp--preset--font-family--heading)';

// Hardware materials (mixed from the palette, never raw colours).
const GLASS = MIX(C('contrast'), 92, 'black');
const FRAME = `linear-gradient(145deg, ${MIX(C('contrast'), 30, C('base'))}, ${MIX(C('contrast'), 62, C('base'))} 45%, ${MIX(C('contrast'), 22, C('base'))})`;
const ALU = `linear-gradient(150deg, ${MIX(C('muted'), 70, C('base'))}, ${MIX(C('contrast'), 14, C('base'))} 55%, ${MIX(C('muted'), 85, C('contrast'))})`;
const WALL = `radial-gradient(120% 90% at 18% 12%, ${MIX(C('primary'), 75, 'white')} 0%, transparent 55%), radial-gradient(100% 80% at 88% 92%, ${MIX(C('accent'), 70, 'white')} 0%, transparent 58%), radial-gradient(70% 60% at 60% 40%, ${MIX(C('primary'), 55, C('accent'))} 0%, transparent 70%), linear-gradient(165deg, ${MIX(C('primary'), 55, C('contrast'))}, ${C('contrast')})`;
const TILE = `background:${MIX('white', 20, 'transparent')};backdrop-filter:blur(6px)`;

/** Drawing geometry: an element's corner radius. */
const R = (r: string) => ` style="border-radius:${r}"`;
const tiles = (n: number, cls = 'sr-scr__tiles') => `<span class="${cls}">${`<i${R('14%')}></i>`.repeat(n)}</span>`;
/** A screen's content: status time and four glass widgets. */
const SCREEN = `<span class="sr-scr__time">9:41</span>${tiles(4)}`;

export const device: CustomBlockDef = {
  name: 'prepress/showroom-device',
  kind: 'art',
  title: 'Showroom device',
  description: 'Product hardware drawn in CSS, no photo needed: an open foldable that unfolds as it scrolls into view, the folded phone, the camera back or a watch. Screens are lit in the brand colours.',
  icon: 'smartphone',
  category: 'media',
  attributes: {
    device: { type: 'string', label: 'Device', control: 'select', options: ['fold', 'closed', 'camera', 'watch'], default: 'fold' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l', 'xl'], default: 'l' },
  },
  template: `<figure class="sr-dev" data-device="{{device}}" data-size="{{size}}" aria-hidden="true"><div class="sr-stage">
<div class="sr-fold"><div class="sr-fold__half sr-fold__l"${R('9% 0 0 9% / 7% 0 0 7%')}><div class="sr-scr"${R('7% 0 0 7% / 5% 0 0 5%')}>${SCREEN}</div></div><div class="sr-fold__hinge"></div><div class="sr-fold__half sr-fold__r"${R('0 9% 9% 0 / 0 7% 7% 0')}><div class="sr-scr sr-scr--r"${R('0 7% 7% 0 / 0 5% 5% 0')}>${tiles(3, 'sr-scr__tiles sr-scr__tiles--r')}</div></div></div>
<div class="sr-closed"><div class="sr-closed__edge"${R('0 40% 40% 0 / 0 6% 6% 0')}></div><div class="sr-closed__body"${R('16% / 7%')}><div class="sr-scr"${R('13% / 6%')}>${SCREEN}</div></div></div>
<div class="sr-cam"><div class="sr-cam__body"${R('15% / 7%')}><div class="sr-cam__plate"${R('22%')}><i class="sr-lens"></i><i class="sr-lens"></i><i class="sr-lens"></i><i class="sr-cam__flash"></i></div><span class="sr-cam__mark"></span></div></div>
<div class="sr-watch"><div class="sr-watch__band"${R('12% 12% 0 0')}></div><div class="sr-watch__case"${R('30%')}><div class="sr-watch__face"${R('26%')}><i class="sr-ring sr-ring--1"></i><i class="sr-ring sr-ring--2"></i><i class="sr-ring sr-ring--3"></i><span class="sr-watch__time">10:09</span></div><i class="sr-watch__crown"${R('30%')}></i></div><div class="sr-watch__band sr-watch__band--b"${R('0 0 12% 12%')}></div></div>
</div></figure>`,
  css: `
.sr-dev{margin:0 auto;width:min(100%,var(--w,40rem));text-align:center}
.sr-dev[data-size=s]{--w:16rem}.sr-dev[data-size=m]{--w:26rem}.sr-dev[data-size=xl]{--w:60rem}
.sr-stage{position:relative;perspective:1600px}
.sr-fold,.sr-closed,.sr-cam,.sr-watch{display:none}
.sr-dev[data-device=fold] .sr-fold,.sr-dev[data-device=closed] .sr-closed,.sr-dev[data-device=camera] .sr-cam,.sr-dev[data-device=watch] .sr-watch{display:flex}
.sr-scr{position:absolute;inset:3.2%;background:${WALL};overflow:hidden}
.sr-scr__time{position:absolute;left:8%;top:3.5%;font-family:${BODY};font-weight:600;font-size:clamp(.45rem,1.6cqi,.9rem);color:white}
.sr-scr__tiles{position:absolute;left:8%;right:8%;top:16%;display:grid;grid-template-columns:1fr 1fr;gap:6%}
.sr-scr__tiles i{aspect-ratio:1;${TILE}}
.sr-scr__tiles i:first-child{grid-column:span 2;aspect-ratio:2.1}
.sr-scr__tiles--r{top:16%}
.sr-scr__tiles--r i:first-child{grid-column:auto;aspect-ratio:1}
.sr-scr__tiles--r i:last-child{grid-column:span 2;aspect-ratio:2.1}
.sr-fold{container-type:inline-size;justify-content:center;align-items:stretch;aspect-ratio:1.42;transform-style:preserve-3d}
.sr-fold__half{position:relative;flex:1;background:${GLASS};box-shadow:inset 0 0 0 2px ${MIX(C('contrast'), 40, C('base'))},inset 0 0 0 4px ${GLASS}}
.sr-fold__l{transform-origin:right center}
.sr-fold__l .sr-scr{right:0;background-size:200% 100%;background-position:0 0}
.sr-scr--r{left:0;background-size:200% 100%;background-position:100% 0}
.sr-fold__hinge{flex:none;width:1.4%;background:linear-gradient(90deg,${GLASS},${MIX(C('contrast'), 35, C('base'))} 50%,${GLASS})}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.sr-fold__l{animation:sr-unfold linear both;animation-timeline:view();animation-range:entry 0% cover 45%}}}
@keyframes sr-unfold{from{transform:rotateY(-62deg)}}
.sr-closed{container-type:inline-size;justify-content:center;margin-inline:auto;width:46%;aspect-ratio:.43;position:relative}
.sr-closed__body{position:relative;flex:1;background:${GLASS};box-shadow:inset 0 0 0 2px ${MIX(C('contrast'), 40, C('base'))},inset 0 0 0 4px ${GLASS}}
.sr-closed__edge{position:absolute;inset:1.5% -5.5% 1.5% auto;width:9%;background:${FRAME}}
.sr-cam{container-type:inline-size;justify-content:center;margin-inline:auto;width:52%;aspect-ratio:.47}
.sr-cam__body{position:relative;flex:1;background:${ALU};box-shadow:inset 0 0 0 2px ${MIX(C('contrast'), 18, C('base'))}}
.sr-cam__plate{position:absolute;left:7%;top:3.5%;width:52%;aspect-ratio:1;background:${MIX(C('muted'), 80, C('contrast'))};box-shadow:inset 0 0 0 1px ${MIX(C('contrast'), 15, C('base'))};display:grid;grid-template-columns:1fr 1fr;place-items:center;padding:6%}
.sr-lens{width:86%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 35%,${MIX(C('primary'), 45, 'white')} 0 5%,${MIX(C('primary'), 40, 'black')} 12%,${GLASS} 38%,${MIX(C('contrast'), 60, 'black')} 52%,${MIX(C('contrast'), 40, C('base'))} 58%,${MIX(C('contrast'), 80, 'black')} 64%,${MIX(C('muted'), 60, C('contrast'))} 70%)}
.sr-lens:nth-child(3){grid-column:1}
.sr-cam__flash{width:30%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,${MIX(C('accent'), 25, 'white')},${MIX(C('muted'), 60, C('contrast'))} 70%)}
.sr-cam__mark{position:absolute;left:50%;top:52%;width:14%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;box-shadow:inset 0 0 0 1.5px ${MIX(C('contrast'), 22, C('base'))}}
.sr-watch{flex-direction:column;align-items:center;width:46%;margin-inline:auto}
.sr-watch__band{width:74%;aspect-ratio:1.5;background:${MIX(C('primary'), 30, C('contrast'))}}
.sr-watch__case{position:relative;width:100%;aspect-ratio:.84;background:${FRAME};padding:5%}
.sr-watch__face{container-type:inline-size;position:relative;height:100%;background:${GLASS};display:grid;place-items:center}
.sr-ring{position:absolute;inset:var(--i);border-radius:50%;background:conic-gradient(var(--c) var(--p),${MIX('white', 12, 'transparent')} 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 8%),#000 calc(100% - 8%));mask:radial-gradient(farthest-side,transparent calc(100% - 8%),#000 calc(100% - 8%))}
.sr-ring--1{--i:14% 9%;--c:${C('accent')};--p:78%}
.sr-ring--2{--i:23% 18%;--c:${MIX(C('primary'), 70, 'white')};--p:62%}
.sr-ring--3{--i:32% 27%;--c:${MIX(C('accent'), 50, C('primary'))};--p:88%}
.sr-watch__time{font-family:${HEADING};font-weight:600;font-size:9cqi;color:white}
.sr-watch__crown{position:absolute;right:-4%;top:28%;width:5%;height:16%;background:${FRAME}}`,
};

export const BLOCKS: CustomBlockDef[] = [device];
