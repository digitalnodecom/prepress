/**
 * Passport — blocks for a walk-in mountain hut, built as the stationery of a
 * walker's mountain passport: the passport page with the hut's stamp, the
 * stamp on its own, a trail picker (pick a trailhead, read the walk — CSS
 * radio state, no script), a printed menu line with a dot leader, and a
 * receipt slip with a zigzag foot.
 *
 * House rules for this set: flat fills, real shaped edges (scallops, zigzags),
 * no thin rules, no shadows, no gradients, no monospace. Colours only from the
 * palette presets; CSS namespaced `.wp-block-prepress-hut-*` / `.hp-*`.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const HEAD = 'var(--wp--preset--font-family--heading)';
const BODY = 'var(--wp--preset--font-family--body)';
const EASE = 'cubic-bezier(.2,.7,.2,1)';

/** Four scalloped (cut-out) corners as a mask. */
const SCALLOP = (r: string) =>
  `radial-gradient(circle at 0 0,#0000 ${r},#000 calc(${r} + .5px)) top left/51% 51% no-repeat,radial-gradient(circle at 100% 0,#0000 ${r},#000 calc(${r} + .5px)) top right/51% 51% no-repeat,radial-gradient(circle at 0 100%,#0000 ${r},#000 calc(${r} + .5px)) bottom left/51% 51% no-repeat,radial-gradient(circle at 100% 100%,#0000 ${r},#000 calc(${r} + .5px)) bottom right/51% 51% no-repeat`;

/** The hut stamp: a double ring, text around it, and seven lakes in a chain. */
function stamp(cls: string) {
  const lakes = [
    [62, 118, 7],
    [76, 103, 9],
    [92, 92, 6],
    [104, 78, 11],
    [121, 70, 7],
    [134, 84, 8],
    [143, 101, 6],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
    .join('');
  return `<svg class="${cls}" viewBox="0 0 200 200" role="img" aria-label="{{stamp}}"><circle cx="100" cy="100" r="95" fill="none" stroke-width="5"/><circle cx="100" cy="100" r="62" fill="none" stroke-width="2.5"/><path id="hp-arc" d="M100 100m-79 0a79 79 0 1 1 158 0a79 79 0 1 1-158 0" fill="none" stroke="none"/><text><textPath href="#hp-arc" textLength="490" lengthAdjust="spacing">{{stamp}}</textPath></text><path d="M48 132 L78 112 L96 124 L120 98 L152 130 Z" fill="none" stroke-width="2.5" stroke-linejoin="round"/><g class="hp-lakes">${lakes}</g></svg>`;
}

const STAMP_CSS = (root: string) => `
${root} svg{display:block;width:100%;height:auto;overflow:visible;color:${C('primary')};stroke:currentColor;fill:currentColor}
${root} text{stroke:none;font-family:${HEAD};font-size:19px;letter-spacing:.06em}
${root} .hp-lakes circle{stroke:none}`;

export const pass: CustomBlockDef = {
  name: 'prepress/hut-pass',
  title: 'Passport page',
  description: 'The first screen as a page of a walker’s mountain passport: a paper card with cut corners, the name on two staggered lines, three short facts and the hut’s round stamp pressed at an angle. The card runs off the bottom of the screen.',
  icon: 'id',
  category: 'design',
  attributes: {
    line1: { type: 'string', label: 'Name, first line', control: 'text', default: 'Sedmera' },
    line2: { type: 'string', label: 'Name, second line', control: 'text', default: '1,685 m' },
    lead: { type: 'string', label: 'Sentence', control: 'text', default: 'A stone hut above seven lakes, open in summer only.' },
    fact1: { type: 'string', label: 'Fact 1', control: 'text', default: 'Open 15 June to 30 September' },
    fact2: { type: 'string', label: 'Fact 2', control: 'text', default: '46 bunks, no road' },
    fact3: { type: 'string', label: 'Fact 3', control: 'text', default: '4½ hours on foot from Bohinj' },
    stamp: { type: 'string', label: 'Stamp text', control: 'text', default: 'Koča Sedmera · 1685 m · Dolina sedmih jezer · ' },
  },
  template: `<div class="hp-pass"><div class="hp-pass__card"><h1 class="hp-pass__name"><span>{{line1}}</span><span>{{line2}}</span></h1><p class="hp-pass__lead">{{lead}}</p><p class="hp-pass__facts"><span>{{fact1}}</span><span>{{fact2}}</span><span>{{fact3}}</span></p><div class="hp-pass__stamp">${stamp('hp-stamp')}</div></div></div>`,
  css: `
.wp-block-prepress-hut-pass{margin-block:0!important}
.hp-pass{height:min(calc(100svh - 7.5rem),58rem);min-height:30rem;overflow:hidden;display:flex;justify-content:center;padding-top:clamp(1.5rem,6vh,4rem)}
.hp-pass__card{position:relative;box-sizing:border-box;width:min(100%,36rem);aspect-ratio:5/7;flex:none;padding:clamp(2rem,5vw,3.5rem) clamp(1.25rem,4vw,3.5rem);background:${C('muted')};color:${C('contrast')};text-align:center;-webkit-mask:${SCALLOP('1.6rem')};mask:${SCALLOP('1.6rem')}} /* taste-skill-ignore: mask cuts the corners, no fill */
.hp-pass__name{margin:0;font-family:${HEAD};font-weight:400;text-transform:uppercase;line-height:.85;letter-spacing:-.02em;font-size:clamp(4.5rem,15vw,8.5rem)}
.hp-pass__name span{display:block}
.hp-pass__name span:first-child{transform:translateX(-7%)}
.hp-pass__name span:last-child{transform:translateX(9%);color:${C('primary')}}
.hp-pass__lead{margin:1.4rem auto 0;max-width:22ch;font-family:${BODY};font-style:italic;font-size:clamp(1.25rem,1.1rem + .7vw,1.625rem);line-height:1.3}
.hp-pass__facts{display:flex;flex-direction:column;align-items:center;gap:.9rem;margin:1.8rem 0 0;font-family:${BODY};font-size:1.1875rem}
.hp-pass__facts span+span::before{content:"";display:block;width:.6rem;height:.6rem;margin:0 auto .9rem;background:${C('contrast')};transform:rotate(45deg)}
.hp-pass__stamp{position:absolute;right:4%;top:57%;width:clamp(6.5rem,24%,9rem);transform:rotate(-14deg);opacity:.88;mix-blend-mode:multiply}
${STAMP_CSS('.hp-pass__stamp')}
@media (prefers-reduced-motion:no-preference){.hp-pass__card{animation:hp-rise .9s ${EASE} both}.hp-pass__stamp{animation:hp-stamp .5s ${EASE} .7s both}}
@keyframes hp-rise{from{transform:translateY(6rem)}}
@keyframes hp-stamp{from{transform:rotate(-14deg) scale(1.6);opacity:0}}
@media (max-width:600px){.hp-pass{padding-top:1rem}.hp-pass__name span:first-child,.hp-pass__name span:last-child{transform:none}.hp-pass__stamp{position:relative;right:auto;top:auto;margin:1.8rem auto 0;width:8rem}}`,
};

export const stampBlock: CustomBlockDef = {
  name: 'prepress/hut-stamp',
  title: 'Hut stamp',
  description: 'The hut’s round rubber stamp on its own: a double ring with text around it, a ridge and seven lakes in a chain. Lands with a press when it scrolls into view.',
  icon: 'awards',
  category: 'design',
  attributes: {
    stamp: { type: 'string', label: 'Stamp text', control: 'text', default: 'Koča Sedmera · 1685 m · Dolina sedmih jezer · ' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
  },
  template: `<div class="hp-stampbox" data-size="{{size}}">${stamp('hp-stamp')}</div>`,
  css: `
.hp-stampbox{width:min(100%,var(--s,12rem));transform:rotate(-10deg)}
.hp-stampbox[data-size=s]{--s:6rem}.hp-stampbox[data-size=l]{--s:18rem}
${STAMP_CSS('.hp-stampbox')}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.hp-stampbox svg{animation:hp-press linear both;animation-timeline:view();animation-range:entry 20% cover 35%}}}
@keyframes hp-press{from{transform:scale(1.5);opacity:0}}`,
};

const ROUTE = (n: number, name: string, time: string, ascent: string, from: string, lakes: string) => ({
  [`r${n}`]: { type: 'string', label: `Trail ${n}`, control: 'text', default: name },
  [`r${n}time`]: { type: 'string', label: `Trail ${n} time`, control: 'text', default: time },
  [`r${n}up`]: { type: 'string', label: `Trail ${n} ascent`, control: 'text', default: ascent },
  [`r${n}from`]: { type: 'string', label: `Trail ${n} start`, control: 'text', default: from },
  [`r${n}note`]: { type: 'string', label: `Trail ${n} on the way`, control: 'text', default: lakes },
});

export const routes: CustomBlockDef = {
  name: 'prepress/hut-routes',
  title: 'Trail picker',
  description: 'Pick a trailhead and read that walk: time on foot, height to climb, where to leave the car and what you pass. Three trails; works without scripts (the first is shown by default).',
  icon: 'location',
  category: 'widgets',
  attributes: {
    group: { type: 'string', label: 'Unique name (if used twice on a page)', control: 'text', default: 'trail' },
    ...ROUTE(1, 'From Bohinj', '4 h 30 min', '1,030 m up', 'Savica car park, 653 m', 'The Komarča wall, Black Lake, then the Double Lake below the hut.'),
    ...ROUTE(2, 'From Trenta', '5 h', '1,060 m up', 'Zadnjica valley, 625 m', 'The old mule track over the Hribarice pass, then down past Brown and Green Lake.'),
    ...ROUTE(3, 'From Komna', '3 h', '440 m up', 'Dom na Komni, 1,520 m', 'Easiest by far: a forest path over the plateau to the Black Lake.'),
  },
  template: `<div class="hp-routes"><div class="hp-routes__tabs" role="radiogroup" aria-label="Trailhead">
<input type="radio" id="{{group}}-1" name="{{group}}" checked><label for="{{group}}-1">{{r1}}</label>
<input type="radio" id="{{group}}-2" name="{{group}}"><label for="{{group}}-2">{{r2}}</label>
<input type="radio" id="{{group}}-3" name="{{group}}"><label for="{{group}}-3">{{r3}}</label>
<div class="hp-route hp-route--1"><p class="hp-route__note">{{r1note}}</p><p class="hp-route__time">{{r1time}}</p><p class="hp-route__up">{{r1up}} · start at {{r1from}}</p></div>
<div class="hp-route hp-route--2"><p class="hp-route__note">{{r2note}}</p><p class="hp-route__time">{{r2time}}</p><p class="hp-route__up">{{r2up}} · start at {{r2from}}</p></div>
<div class="hp-route hp-route--3"><p class="hp-route__note">{{r3note}}</p><p class="hp-route__time">{{r3time}}</p><p class="hp-route__up">{{r3up}} · start at {{r3from}}</p></div>
</div></div>`,
  css: `
.hp-routes__tabs{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:.375rem}
.hp-routes input{position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}
.hp-routes label{display:flex;align-items:center;justify-content:center;min-height:2.9rem;padding:.4rem .5rem;background:${C('secondary')};color:${C('contrast')};font-family:${BODY};font-size:1.1875rem;text-align:center;cursor:pointer;transition:background-color .2s,color .2s}
.hp-routes label:hover{background:${C('base')}}
.hp-routes input:checked+label{background:${C('contrast')};color:${C('muted')}}
.hp-routes input:focus-visible+label{outline:3px solid ${C('primary')};outline-offset:2px}
.hp-route{display:none;grid-column:1/-1;padding-top:1.1rem}
.hp-route p{margin:0}
.hp-route__time{margin-top:.9rem!important;font-family:${HEAD};font-size:2.75rem;line-height:.85;letter-spacing:-.02em;text-transform:uppercase}
.hp-route__up{margin-top:.4rem!important;font-family:${BODY};font-size:1.1875rem;font-style:italic}
.hp-route__note{font-family:${BODY};font-size:1.1875rem;line-height:1.45}
.hp-routes input:nth-of-type(1):checked~.hp-route--1,.hp-routes input:nth-of-type(2):checked~.hp-route--2,.hp-routes input:nth-of-type(3):checked~.hp-route--3{display:block}
@media (prefers-reduced-motion:no-preference){.hp-route{animation:hp-in .35s ${EASE}}}
@keyframes hp-in{from{opacity:0;transform:translateY(.6rem)}}`,
};

export const menuItem: CustomBlockDef = {
  name: 'prepress/hut-menu-item',
  title: 'Menu line',
  description: 'One line of a printed menu or price list: name on the left, price on the right, a leader of round dots between them and a short note underneath.',
  icon: 'food',
  category: 'text',
  attributes: {
    name: { type: 'string', label: 'Name', control: 'text', default: 'Jota' },
    price: { type: 'string', label: 'Price', control: 'text', default: '€8.50' },
    note: { type: 'string', label: 'Note', control: 'text', default: 'Sauerkraut and bean soup with smoked pork.' },
  },
  template: `<div class="hp-dish"><p class="hp-dish__row"><span class="hp-dish__name">{{name}}</span><span class="hp-dish__dots" aria-hidden="true"></span><span class="hp-dish__price">{{price}}</span></p>{{#note}}<p class="hp-dish__note">{{note}}</p>{{/note}}</div>`,
  css: `
.wp-block-prepress-hut-menu-item{margin-block-start:1.1rem!important}
.hp-dish p{margin:0}
.hp-dish__row{display:flex;align-items:baseline;gap:.5rem;font-family:${BODY};font-size:1.1875rem}
.hp-dish__dots{flex:1 1 1rem;min-width:1rem;height:0;border-bottom:4px dotted currentColor;opacity:.55;transform:translateY(-.25em)}
.hp-dish__price{font-variant-numeric:tabular-nums lining-nums}
.hp-dish__note{max-width:34ch;margin-top:.2rem!important;font-family:${BODY};font-style:italic;font-size:1.1875rem;line-height:1.4}`,
};

const ROW = (n: number, label: string, amount: string) => ({
  [`l${n}`]: { type: 'string', label: `Line ${n}`, control: 'text', default: label },
  [`a${n}`]: { type: 'string', label: `Line ${n} amount`, control: 'text', default: amount },
});

export const receipt: CustomBlockDef = {
  name: 'prepress/hut-receipt',
  title: 'Receipt slip',
  description: 'A paper receipt with a zigzag foot: a title, up to six itemised lines with amounts, a heavy bar and the total set largest.',
  icon: 'media-text',
  category: 'widgets',
  attributes: {
    title: { type: 'string', label: 'Title', control: 'text', default: 'One night, half board' },
    ...ROW(1, 'Bunk, non-member', '38.00'),
    ...ROW(2, 'Half board', '24.00'),
    ...ROW(3, 'Sheet liner', '6.00'),
    ...ROW(4, 'Tourist tax', '2.50'),
    ...ROW(5, '', ''),
    ...ROW(6, '', ''),
    totalLabel: { type: 'string', label: 'Total label', control: 'text', default: 'Total' },
    total: { type: 'string', label: 'Total', control: 'text', default: '€70.50' },
    note: { type: 'string', label: 'Note', control: 'text', default: 'Cash only. Alpine Club members pay €27 for the bunk.' },
  },
  template: `<div class="hp-slip"><p class="hp-slip__title">{{title}}</p><dl class="hp-slip__rows">{{#l1}}<div><dt>{{l1}}</dt><dd>{{a1}}</dd></div>{{/l1}}{{#l2}}<div><dt>{{l2}}</dt><dd>{{a2}}</dd></div>{{/l2}}{{#l3}}<div><dt>{{l3}}</dt><dd>{{a3}}</dd></div>{{/l3}}{{#l4}}<div><dt>{{l4}}</dt><dd>{{a4}}</dd></div>{{/l4}}{{#l5}}<div><dt>{{l5}}</dt><dd>{{a5}}</dd></div>{{/l5}}{{#l6}}<div><dt>{{l6}}</dt><dd>{{a6}}</dd></div>{{/l6}}</dl>{{#note}}<p class="hp-slip__note">{{note}}</p>{{/note}}<p class="hp-slip__total"><span>{{totalLabel}}</span><b>{{total}}</b></p></div>`,
  css: `
.hp-slip{box-sizing:border-box;width:min(100%,24rem);margin-inline:auto;padding:2rem 1.75rem 3.25rem;background:${C('muted')};color:${C('contrast')};font-family:${BODY};clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),${Array.from({ length: 13 }, (_, i) => `${100 - (i + 0.5) * (100 / 13)}% ${i % 2 ? 'calc(100% - 14px)' : '100%'}`).join(',')},0 calc(100% - 14px))}
.hp-slip p{margin:0}
.hp-slip__title{text-align:center;font-weight:600;font-size:1.625rem}
.hp-slip__rows{margin:1.4rem 0 0}
.hp-slip__rows div{display:flex;justify-content:space-between;gap:1rem;padding:.45rem 0;font-size:1.1875rem}
.hp-slip__rows dt,.hp-slip__rows dd{margin:0}
.hp-slip__rows dd{font-variant-numeric:tabular-nums lining-nums}
.hp-slip__total{display:flex;justify-content:space-between;align-items:baseline;margin-top:1.2rem!important;padding-top:1rem;border-top:4px solid ${C('contrast')};font-size:1.1875rem}
.hp-slip__total b{font-family:${HEAD};font-weight:400;font-size:2.75rem;line-height:.9;font-variant-numeric:tabular-nums}
.hp-slip__note{margin-top:1.4rem!important;font-style:italic;font-size:1.1875rem;line-height:1.4}`,
};

export const BLOCKS: CustomBlockDef[] = [pass, stampBlock, routes, menuItem, receipt];
