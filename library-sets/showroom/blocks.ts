/**
 * Showroom — blocks for a product-launch site in a white gallery: hardware
 * drawn in CSS (a foldable that unfolds as it scrolls in, a closed foldable, a
 * camera back, a watch), a floating pricing capsule, a sticky product bar,
 * in-page chapter links, spec figures and finish swatches.
 *
 * Custom-block CSS is global, so every rule is namespaced under
 * `.wp-block-prepress-showroom-<slug>` / `.sr-*`. Interface colours come from
 * presets; the hardware is greys mixed from base/contrast and its screens are
 * lit with primary/accent, so devices restyle with the palette too.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const MIX = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
const BODY = 'var(--wp--preset--font-family--body)';
const HEADING = 'var(--wp--preset--font-family--heading)';
const EASE = 'cubic-bezier(.2,.75,.2,1)';

// Hardware materials (mixed from the palette, never raw colours).
const GLASS = MIX(C('contrast'), 92, 'black');
const FRAME = `linear-gradient(145deg, ${MIX(C('contrast'), 30, C('base'))}, ${MIX(C('contrast'), 62, C('base'))} 45%, ${MIX(C('contrast'), 22, C('base'))})`;
const ALU = `linear-gradient(150deg, ${MIX(C('muted'), 70, C('base'))}, ${MIX(C('contrast'), 14, C('base'))} 55%, ${MIX(C('muted'), 85, C('contrast'))})`;
const WALL = `radial-gradient(120% 90% at 18% 12%, ${MIX(C('primary'), 75, 'white')} 0%, transparent 55%), radial-gradient(100% 80% at 88% 92%, ${MIX(C('accent'), 70, 'white')} 0%, transparent 58%), radial-gradient(70% 60% at 60% 40%, ${MIX(C('primary'), 55, C('accent'))} 0%, transparent 70%), linear-gradient(165deg, ${MIX(C('primary'), 55, C('contrast'))}, ${C('contrast')})`;
const TILE = `background:${MIX('white', 20, 'transparent')};border-radius:14%;backdrop-filter:blur(6px)`;

/** A screen's content: status time and four glass widgets. */
const SCREEN = `<span class="sr-scr__time">9:41</span><span class="sr-scr__tiles"><i></i><i></i><i></i><i></i></span>`;

export const device: CustomBlockDef = {
  name: 'prepress/showroom-device',
  title: 'Showroom device',
  description: 'Product hardware drawn in CSS, no photo needed: an open foldable that unfolds as it scrolls into view, the folded phone, the camera back or a watch. Screens are lit in the brand colours.',
  icon: 'smartphone',
  category: 'media',
  attributes: {
    device: { type: 'string', label: 'Device', control: 'select', options: ['fold', 'closed', 'camera', 'watch'], default: 'fold' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l', 'xl'], default: 'l' },
    caption: { type: 'string', label: 'Caption', control: 'text', default: '' },
  },
  template: `<figure class="sr-dev" data-device="{{device}}" data-size="{{size}}"{{^caption}} aria-hidden="true"{{/caption}}><div class="sr-stage">
<div class="sr-fold"><div class="sr-fold__half sr-fold__l"><div class="sr-scr">${SCREEN}</div></div><div class="sr-fold__hinge"></div><div class="sr-fold__half sr-fold__r"><div class="sr-scr sr-scr--r"><span class="sr-scr__tiles sr-scr__tiles--r"><i></i><i></i><i></i></span></div></div></div>
<div class="sr-closed"><div class="sr-closed__edge"></div><div class="sr-closed__body"><div class="sr-scr">${SCREEN}</div></div></div>
<div class="sr-cam"><div class="sr-cam__body"><div class="sr-cam__plate"><i class="sr-lens"></i><i class="sr-lens"></i><i class="sr-lens"></i><i class="sr-cam__flash"></i></div><span class="sr-cam__mark"></span></div></div>
<div class="sr-watch"><div class="sr-watch__band"></div><div class="sr-watch__case"><div class="sr-watch__face"><i class="sr-ring sr-ring--1"></i><i class="sr-ring sr-ring--2"></i><i class="sr-ring sr-ring--3"></i><span class="sr-watch__time">10:09</span></div><i class="sr-watch__crown"></i></div><div class="sr-watch__band sr-watch__band--b"></div></div>
</div>{{#caption}}<figcaption>{{caption}}</figcaption>{{/caption}}</figure>`,
  css: `
.sr-dev{margin:0 auto;width:min(100%,var(--w,40rem));text-align:center}
.sr-dev[data-size=s]{--w:16rem}.sr-dev[data-size=m]{--w:26rem}.sr-dev[data-size=xl]{--w:60rem}
.sr-dev figcaption{margin-top:1.2em;font-family:${BODY};font-size:.82rem;letter-spacing:-.01em;color:${MIX(C('contrast'), 60, C('base'))}}
.sr-stage{position:relative;perspective:1600px}
.sr-fold,.sr-closed,.sr-cam,.sr-watch{display:none}
.sr-dev[data-device=fold] .sr-fold,.sr-dev[data-device=closed] .sr-closed,.sr-dev[data-device=camera] .sr-cam,.sr-dev[data-device=watch] .sr-watch{display:flex}
.sr-scr{position:absolute;inset:3.2%;border-radius:7% / 5%;background:${WALL};overflow:hidden}
.sr-scr__time{position:absolute;left:8%;top:3.5%;font-family:${BODY};font-weight:600;font-size:clamp(.45rem,1.6cqi,.9rem);color:white}
.sr-scr__tiles{position:absolute;left:8%;right:8%;top:16%;display:grid;grid-template-columns:1fr 1fr;gap:6%}
.sr-scr__tiles i{aspect-ratio:1;${TILE}}
.sr-scr__tiles i:first-child{grid-column:span 2;aspect-ratio:2.1}
.sr-scr__tiles--r{top:16%}
.sr-scr__tiles--r i:first-child{grid-column:auto;aspect-ratio:1}
.sr-scr__tiles--r i:last-child{grid-column:span 2;aspect-ratio:2.1}
.sr-fold{container-type:inline-size;justify-content:center;align-items:stretch;aspect-ratio:1.42;transform-style:preserve-3d}
.sr-fold__half{position:relative;flex:1;border-radius:9% / 7%;background:${GLASS};box-shadow:inset 0 0 0 2px ${MIX(C('contrast'), 40, C('base'))},inset 0 0 0 4px ${GLASS}}
.sr-fold__l{border-top-right-radius:0;border-bottom-right-radius:0;transform-origin:right center}
.sr-fold__r{border-top-left-radius:0;border-bottom-left-radius:0}
.sr-fold__l .sr-scr{right:0;border-top-right-radius:0;border-bottom-right-radius:0;background-size:200% 100%;background-position:0 0}
.sr-scr--r{left:0;border-top-left-radius:0;border-bottom-left-radius:0;background-size:200% 100%;background-position:100% 0}
.sr-fold__hinge{flex:none;width:1.4%;background:linear-gradient(90deg,${GLASS},${MIX(C('contrast'), 35, C('base'))} 50%,${GLASS})}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.sr-fold__l{animation:sr-unfold linear both;animation-timeline:view();animation-range:entry 0% cover 45%}}}
@keyframes sr-unfold{from{transform:rotateY(-62deg)}}
.sr-closed{container-type:inline-size;justify-content:center;margin-inline:auto;width:46%;aspect-ratio:.43;position:relative}
.sr-closed__body{position:relative;flex:1;border-radius:16% / 7%;background:${GLASS};box-shadow:inset 0 0 0 2px ${MIX(C('contrast'), 40, C('base'))},inset 0 0 0 4px ${GLASS}}
.sr-closed__body .sr-scr{border-radius:13% / 6%}
.sr-closed__edge{position:absolute;inset:1.5% -5.5% 1.5% auto;width:9%;border-radius:0 40% 40% 0 / 0 6% 6% 0;background:${FRAME}}
.sr-cam{container-type:inline-size;justify-content:center;margin-inline:auto;width:52%;aspect-ratio:.47}
.sr-cam__body{position:relative;flex:1;border-radius:15% / 7%;background:${ALU};box-shadow:inset 0 0 0 2px ${MIX(C('contrast'), 18, C('base'))}}
.sr-cam__plate{position:absolute;left:7%;top:3.5%;width:52%;aspect-ratio:1;border-radius:22%;background:${MIX(C('muted'), 80, C('contrast'))};box-shadow:inset 0 0 0 1px ${MIX(C('contrast'), 15, C('base'))};display:grid;grid-template-columns:1fr 1fr;place-items:center;padding:6%}
.sr-lens{width:86%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 35%,${MIX(C('primary'), 45, 'white')} 0 5%,${MIX(C('primary'), 40, 'black')} 12%,${GLASS} 38%,${MIX(C('contrast'), 60, 'black')} 52%,${MIX(C('contrast'), 40, C('base'))} 58%,${MIX(C('contrast'), 80, 'black')} 64%,${MIX(C('muted'), 60, C('contrast'))} 70%)}
.sr-lens:nth-child(3){grid-column:1}
.sr-cam__flash{width:30%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,${MIX(C('accent'), 25, 'white')},${MIX(C('muted'), 60, C('contrast'))} 70%)}
.sr-cam__mark{position:absolute;left:50%;top:52%;width:14%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;box-shadow:inset 0 0 0 1.5px ${MIX(C('contrast'), 22, C('base'))}}
.sr-watch{flex-direction:column;align-items:center;width:46%;margin-inline:auto}
.sr-watch__band{width:74%;aspect-ratio:1.5;border-radius:12% 12% 0 0;background:${MIX(C('primary'), 30, C('contrast'))}}
.sr-watch__band--b{border-radius:0 0 12% 12%}
.sr-watch__case{position:relative;width:100%;aspect-ratio:.84;border-radius:30%;background:${FRAME};padding:5%}
.sr-watch__face{container-type:inline-size;position:relative;height:100%;border-radius:26%;background:${GLASS};display:grid;place-items:center}
.sr-ring{position:absolute;inset:var(--i);border-radius:50%;background:conic-gradient(var(--c) var(--p),${MIX('white', 12, 'transparent')} 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 8%),#000 calc(100% - 8%));mask:radial-gradient(farthest-side,transparent calc(100% - 8%),#000 calc(100% - 8%))}
.sr-ring--1{--i:14% 9%;--c:${C('accent')};--p:78%}
.sr-ring--2{--i:23% 18%;--c:${MIX(C('primary'), 70, 'white')};--p:62%}
.sr-ring--3{--i:32% 27%;--c:${MIX(C('accent'), 50, C('primary'))};--p:88%}
.sr-watch__time{font-family:${HEADING};font-weight:600;font-size:9cqi;color:white}
.sr-watch__crown{position:absolute;right:-4%;top:28%;width:5%;height:16%;border-radius:30%;background:${FRAME}}`,
};

export const pricing: CustomBlockDef = {
  name: 'prepress/showroom-pricing',
  title: 'Showroom pricing capsule',
  description: 'A floating white capsule with the price, a line of financing or availability and a compact blue pill — no shadow, just a hairline.',
  icon: 'tag',
  category: 'widgets',
  attributes: {
    price: { type: 'string', label: 'Price', control: 'text', default: 'From €1,799' },
    note: { type: 'string', label: 'Note', control: 'text', default: 'or €74.95/mo. for 24 mo.' },
    label: { type: 'string', label: 'Button', control: 'text', default: 'Pre-order' },
    url: { type: 'string', label: 'Link', control: 'url', default: '/buy/' },
  },
  template: `<div class="sr-price"><p class="sr-price__text"><b>{{price}}</b>{{#note}} <span>{{note}}</span>{{/note}}</p>{{#url}}<a class="sr-pill" href="{{url}}">{{label}}</a>{{/url}}</div>`,
  css: `
.wp-block-prepress-showroom-pricing{display:flex;justify-content:center}
.sr-price{display:inline-flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.6rem 1.4rem;padding:.75rem .8rem .75rem 1.6rem;border-radius:28px;background:${C('base')};box-shadow:0 0 0 1px ${C('secondary')}}
.sr-price__text{margin:0;font-family:${BODY};font-size:.875rem;line-height:1.3;letter-spacing:-.016em}
.sr-price__text b{font-weight:600}
.sr-price__text span{color:${MIX(C('contrast'), 62, C('base'))}}
.sr-pill{display:inline-block;padding:.55em 1.15em;border-radius:9999px;background:${C('primary')};color:${C('base')}!important;font-family:${BODY};font-size:.8rem;letter-spacing:-.01em;text-decoration:none!important;white-space:nowrap}
.sr-pill:hover{background:${MIX(C('primary'), 86, 'white')}}`,
};

export const localNav: CustomBlockDef = {
  name: 'prepress/showroom-localnav',
  title: 'Showroom product bar',
  description: 'The product’s own bar under the site header: product name, up to three page links and a compact blue pill. It stays at the top while the page scrolls — put it first on the page, outside any group.',
  icon: 'menu',
  category: 'theme',
  attributes: {
    product: { type: 'string', label: 'Product', control: 'text', default: 'Fold 2' },
    url: { type: 'string', label: 'Product link', control: 'url', default: '/' },
    link1: { type: 'string', label: 'Link 1', control: 'text', default: 'Overview' },
    url1: { type: 'string', label: 'Link 1 URL', control: 'url', default: '/' },
    link2: { type: 'string', label: 'Link 2', control: 'text', default: 'Design' },
    url2: { type: 'string', label: 'Link 2 URL', control: 'url', default: '/design/' },
    link3: { type: 'string', label: 'Link 3', control: 'text', default: 'Tech specs' },
    url3: { type: 'string', label: 'Link 3 URL', control: 'url', default: '/specs/' },
    button: { type: 'string', label: 'Button', control: 'text', default: 'Buy' },
    buttonUrl: { type: 'string', label: 'Button link', control: 'url', default: '/buy/' },
  },
  template: `<nav class="sr-local" aria-label="{{product}}"><div class="sr-local__in"><a class="sr-local__name" href="{{url}}">{{product}}</a><span class="sr-local__links">{{#link1}}<a href="{{url1}}">{{link1}}</a>{{/link1}}{{#link2}}<a href="{{url2}}">{{link2}}</a>{{/link2}}{{#link3}}<a href="{{url3}}">{{link3}}</a>{{/link3}}{{#button}}<a class="sr-pill" href="{{buttonUrl}}">{{button}}</a>{{/button}}</span></div></nav>`,
  css: `
.wp-block-prepress-showroom-localnav{position:sticky;top:var(--pp-header-h, 0px);z-index:20;margin-block:0!important}
.sr-local{background:${MIX(C('base'), 78, 'transparent')};backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid ${C('secondary')}}
.sr-local__in{display:flex;align-items:center;justify-content:space-between;gap:1rem;max-width:var(--wp--style--global--wide-size,1024px);margin:0 auto;padding:.7rem var(--wp--style--root--padding-right,1.25rem)}
.sr-local__name{font-family:${HEADING};font-weight:600;font-size:1.2rem;letter-spacing:.012em;color:inherit;text-decoration:none}
.sr-local__links{display:flex;align-items:center;gap:1.5rem}
.sr-local__links a:not(.sr-pill){font-family:${BODY};font-size:.75rem;letter-spacing:-.01em;color:${MIX(C('contrast'), 80, C('base'))};text-decoration:none}
.sr-local__links a:not(.sr-pill):hover{color:${C('primary')}}
@media (max-width:640px){.sr-local__links a:not(.sr-pill){display:none}}
.sr-local .sr-pill{display:inline-block;padding:.45em 1em;border-radius:9999px;background:${C('primary')};color:${C('base')}!important;font-family:${BODY};font-size:.75rem;letter-spacing:-.01em;text-decoration:none!important;white-space:nowrap}
.sr-local .sr-pill:hover{background:${MIX(C('primary'), 86, 'white')}}`,
};

export const chapters: CustomBlockDef = {
  name: 'prepress/showroom-chapters',
  title: 'Showroom chapter links',
  description: 'A quiet horizontal list of in-page links to the sections of a long product page (give each section the matching HTML anchor).',
  icon: 'editor-ul',
  category: 'text',
  attributes: {
    one: { type: 'string', label: 'Chapter 1', control: 'text', default: 'Design' },
    oneId: { type: 'string', label: 'Chapter 1 anchor', control: 'text', default: 'design' },
    two: { type: 'string', label: 'Chapter 2', control: 'text', default: 'Camera' },
    twoId: { type: 'string', label: 'Chapter 2 anchor', control: 'text', default: 'camera' },
    three: { type: 'string', label: 'Chapter 3', control: 'text', default: 'Tech specs' },
    threeId: { type: 'string', label: 'Chapter 3 anchor', control: 'text', default: 'specs' },
    four: { type: 'string', label: 'Chapter 4', control: 'text', default: 'Finishes' },
    fourId: { type: 'string', label: 'Chapter 4 anchor', control: 'text', default: 'finishes' },
  },
  template: `<nav class="sr-chap" aria-label="On this page"><ul>{{#one}}<li><a href="#{{oneId}}">{{one}}</a></li>{{/one}}{{#two}}<li><a href="#{{twoId}}">{{two}}</a></li>{{/two}}{{#three}}<li><a href="#{{threeId}}">{{three}}</a></li>{{/three}}{{#four}}<li><a href="#{{fourId}}">{{four}}</a></li>{{/four}}</ul></nav>`,
  css: `
.sr-chap ul{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem 2.6rem;margin:0;padding:1.75rem 0;list-style:none}
.sr-chap a{font-family:${BODY};font-weight:500;font-size:1.0625rem;line-height:1.47;letter-spacing:-.022em;color:inherit;text-decoration:none}
.sr-chap a:hover{color:${C('primary')}}`,
};

export const spec: CustomBlockDef = {
  name: 'prepress/showroom-spec',
  title: 'Showroom spec figure',
  description: 'One headline number from the tech specs — a large figure with its unit, a label and a fine-print note.',
  icon: 'performance',
  category: 'text',
  attributes: {
    value: { type: 'string', label: 'Figure', control: 'text', default: '7.9' },
    unit: { type: 'string', label: 'Unit', control: 'text', default: '″' },
    label: { type: 'string', label: 'Label', control: 'text', default: 'Inner display' },
    note: { type: 'string', label: 'Note', control: 'text', default: 'LTPO OLED, 1–120 Hz' },
  },
  template: `<div class="sr-spec"><p class="sr-spec__fig">{{value}}<small>{{unit}}</small></p><p class="sr-spec__label">{{label}}</p>{{#note}}<p class="sr-spec__note">{{note}}</p>{{/note}}</div>`,
  css: `
.sr-spec{padding-top:1.1rem;border-top:1px solid ${C('secondary')}}
.sr-spec p{margin:0}
.sr-spec__fig{font-family:${HEADING};font-weight:600;font-size:clamp(2.5rem,5vw,3.5rem);line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.sr-spec__fig small{font-size:.5em;font-weight:500;letter-spacing:0;margin-left:.08em}
.sr-spec__label{margin-top:.55rem!important;font-family:${BODY};font-weight:600;font-size:1.0625rem;letter-spacing:-.022em}
.sr-spec__note{margin-top:.2rem!important;font-family:${BODY};font-size:.875rem;letter-spacing:-.016em;color:${MIX(C('contrast'), 62, C('base'))}}`,
};

export const finishes: CustomBlockDef = {
  name: 'prepress/showroom-finishes',
  title: 'Showroom finishes',
  description: 'Four finish swatches — dark, light, brand and accent, mixed from the palette — with their names. The first is shown selected.',
  icon: 'admin-appearance',
  category: 'design',
  attributes: {
    one: { type: 'string', label: 'Dark finish', control: 'text', default: 'Graphite' },
    two: { type: 'string', label: 'Light finish', control: 'text', default: 'Silver' },
    three: { type: 'string', label: 'Brand finish', control: 'text', default: 'Deep Blue' },
    four: { type: 'string', label: 'Accent finish', control: 'text', default: 'Copper' },
  },
  template: `<div class="sr-fin"><ul class="sr-fin__list"><li><i class="sr-sw sr-sw--1"></i><span>{{one}}</span></li><li><i class="sr-sw sr-sw--2"></i><span>{{two}}</span></li><li><i class="sr-sw sr-sw--3"></i><span>{{three}}</span></li><li><i class="sr-sw sr-sw--4"></i><span>{{four}}</span></li></ul></div>`,
  css: `
.sr-fin__list{display:flex;flex-wrap:wrap;justify-content:center;gap:1.4rem 2.2rem;margin:0;padding:0;list-style:none}
.sr-fin__list li{display:flex;flex-direction:column;align-items:center;gap:.7rem;font-family:${BODY};font-size:.875rem;letter-spacing:-.016em}
.sr-sw{display:block;width:2.6rem;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 1px ${MIX(C('contrast'), 18, 'transparent')}}
.sr-fin__list li:first-child .sr-sw{outline:2px solid ${C('primary')};outline-offset:3px}
.sr-sw--1{background:linear-gradient(145deg,${MIX(C('contrast'), 80, C('base'))},${MIX(C('contrast'), 96, 'black')})}
.sr-sw--2{background:linear-gradient(145deg,${C('base')},${MIX(C('contrast'), 16, C('base'))})}
.sr-sw--3{background:linear-gradient(145deg,${MIX(C('primary'), 60, C('contrast'))},${MIX(C('primary'), 35, C('contrast'))})}
.sr-sw--4{background:linear-gradient(145deg,${MIX(C('accent'), 60, C('base'))},${C('accent')})}`,
};

export const BLOCKS: CustomBlockDef[] = [device, pricing, localNav, chapters, spec, finishes];
