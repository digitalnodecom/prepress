/**
 * Passport — blocks for a walk-in mountain hut: the hut's round stamp (art)
 * and a trail picker (pick a trailhead, read the walk — CSS radio state, no
 * script). The passport page, menu lines and the receipt are core blocks with
 * the set's block styles (style.ts, patterns.ts).
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

export const stampBlock: CustomBlockDef = {
  name: 'prepress/hut-stamp',
  title: 'Hut stamp',
  description: 'The hut’s round rubber stamp on its own: a double ring with text around it, a ridge and seven lakes in a chain. Lands with a press when it scrolls into view.',
  kind: 'art',
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
  kind: 'interactive',
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

export const BLOCKS: CustomBlockDef[] = [stampBlock, routes];
