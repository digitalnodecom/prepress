/**
 * Programme — blocks. One interactive block: the day switcher. Its days are
 * inner core blocks (one group per day, styled "Timetable day", rows styled
 * "Timetable row"), so every session is edited in place; the block only adds
 * the tabs (radio inputs inside their labels) and shows one day at a time with
 * CSS `:has()`. Without `:has()` support, and in the editor, every day shows.
 *
 * House rules: flat fills, no rules, no shadows; colours only from the palette
 * presets; CSS namespaced `.wp-block-prepress-programme-*` / `.pg-*`.
 */
import type { CustomBlockDef } from '../../src/lib/types';
import { b, color as C, group, h, is, p } from '../kit';

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const DAYS = [1, 2, 3];

const sample = (day: string) =>
  group({ className: is('programme-day') }, [
    h(day, 3),
    group({ className: is('programme-slot') }, [p('18:00'), group({}, [p('Session title'), p('Speaker, what they do')]), p('Stage')]),
  ]);

export const days: CustomBlockDef = {
  name: 'prepress/programme-days',
  title: 'Programme by day',
  description: 'Tabs for each day of an event over the day’s timetable: pick a day and only its sessions show, or “All days” for everything. The days are ordinary groups inside the block (one per tab, in order), so sessions are edited in place. Works without scripts.',
  kind: 'interactive',
  icon: 'calendar-alt',
  category: 'widgets',
  attributes: {
    group: { type: 'string', label: 'Unique name (if used twice on a page)', control: 'text', default: 'day' },
    label: { type: 'string', label: 'Tabs label (for screen readers)', control: 'text', default: 'Day' },
    ...Object.fromEntries(DAYS.map((n) => [`day${n}`, { type: 'string', label: `Tab ${n}`, control: 'text', default: ['Fri 3', 'Sat 4', 'Sun 5'][n - 1] }])),
    all: { type: 'string', label: 'Last tab (shows every day)', control: 'text', default: 'All days' },
  },
  innerBlocks: {
    allowed: ['core/group'],
    template: [sample('Friday'), sample('Saturday'), sample('Sunday')],
  },
  template: `<div class="pg-days"><div class="pg-days__tabs" role="radiogroup" aria-label="{{label}}">
${DAYS.map((n) => `<label class="pg-days__tab"><input type="radio" name="{{group}}"${n === 1 ? ' checked' : ''}><span>{{day${n}}}</span></label>`).join('\n')}
<label class="pg-days__tab"><input type="radio" name="{{group}}"><span>{{all}}</span></label>
</div><div class="pg-days__panels">{{{content}}}</div></div>`,
  css: `
.pg-days__tabs{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;gap:6px;padding:.75rem 0;margin-bottom:2rem;background:${C('base')}}
.pg-days__tab{position:relative;display:inline-flex;align-items:center;min-height:3rem;padding:.5rem 1.4rem;background:${C('secondary')};color:${C('contrast')};font-size:var(--wp--preset--font-size--medium);font-weight:500;cursor:pointer;transition:background-color .2s,color .2s}
.pg-days__tab input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.pg-days__tab:hover{background:color-mix(in srgb,${C('contrast')} 12%,${C('secondary')})}
.pg-days__tab:has(input:checked){background:${C('contrast')};color:${C('base')}}
.pg-days__tab:has(input:focus-visible){outline:2px solid ${C('contrast')};outline-offset:3px}
.pg-days__panels > * + *{margin-top:4rem}
@supports selector(:has(*)){
${DAYS.map((n) => `.pg-days:has(.pg-days__tab:nth-child(${n}) input:checked) .pg-days__panels > .wp-block-group:not(:nth-child(${n})){display:none}`).join('\n')}
}
@media (prefers-reduced-motion:no-preference){.pg-days__panels > .wp-block-group{animation:pg-day .35s ${EASE}}}
@keyframes pg-day{from{opacity:0;transform:translateY(.75rem)}}
@media (max-width:640px){.pg-days__tab{flex:1 1 auto;justify-content:center;padding-inline:.9rem}}`,
};

/** The days block with its day groups. */
export const programmeDays = (attrs: Record<string, unknown>, dayGroups: ReturnType<typeof b>[]) => b('prepress/programme-days', attrs, dayGroups);

/** Five numbered places on a schematic harbour: the town's point, the harbour notch, a breakwater. */
const PLACES = [
  [366, 236], // 1 the quay
  [520, 262], // 2 salt store
  [396, 182], // 3 the square, at the head of the harbour
  [414, 322], // 4 harbour wall
  [96, 152], // 5 the point and its lighthouse
];

export const map: CustomBlockDef = {
  name: 'prepress/programme-map',
  title: 'Harbour map',
  description: 'A drawn map of a small harbour town with five numbered places (the quay, a warehouse, the square, the harbour wall, the point with its lighthouse). The numbers match a list of places beside it; the dots land one by one as the map scrolls into view.',
  kind: 'art',
  icon: 'location-alt',
  category: 'design',
  attributes: {
    label: { type: 'string', label: 'Description (for screen readers)', control: 'text', default: 'Map of the harbour with the five festival places numbered 1 to 5' },
  },
  template: `<div class="pg-map"><svg viewBox="0 0 600 400" role="img" aria-label="{{label}}">
<rect class="pg-map__sea" width="600" height="400"/>
<path class="pg-map__land" d="M600 30C450 42 250 76 112 122Q52 142 80 168C200 208 300 236 352 252L352 206L440 206L440 280C500 298 560 312 600 322Z"/>
<path class="pg-map__wall" d="M440 280L398 336"/>
<path class="pg-map__pier" d="M352 252L330 300"/>
<path class="pg-map__lane" d="M396 182C430 150 470 120 520 108M396 182C330 170 220 150 120 150M396 182L520 262"/>
<g class="pg-map__light"><circle cx="70" cy="146" r="6"/></g>
${PLACES.map(([x, y], i) => `<g class="pg-map__dot pg-map__dot--${i + 1}"><circle cx="${x}" cy="${y}" r="15"/><text x="${x}" y="${y + 6}" text-anchor="middle">${i + 1}</text></g>`).join('')}
</svg></div>`,
  css: `
.pg-map svg{display:block;width:100%;height:auto}
.pg-map__sea{fill:${C('secondary')}}
.pg-map__land{fill:color-mix(in srgb,${C('contrast')} 16%,${C('base')})}
.pg-map__wall,.pg-map__pier{fill:none;stroke:color-mix(in srgb,${C('contrast')} 16%,${C('base')});stroke-width:10;stroke-linecap:square}
.pg-map__lane{fill:none;stroke:${C('base')};stroke-width:3;stroke-dasharray:2 8;stroke-linecap:round}
.pg-map__light circle{fill:${C('contrast')}}
.pg-map__dot circle{fill:${C('primary')}}
.pg-map__dot text{fill:${C('base')};font-family:var(--wp--preset--font-family--body);font-size:17px;font-weight:700}
@media (prefers-reduced-motion:no-preference){
.pg-map__light circle{animation:pg-blink 2.4s steps(1) infinite}
@supports (animation-timeline:view()){.pg-map__dot{transform-box:fill-box;transform-origin:center;animation:pg-drop linear both;animation-timeline:view();animation-range:entry 20% entry 45%}
${PLACES.map((_, i) => `.pg-map__dot--${i + 1}{animation-range:entry ${20 + i * 8}% entry ${45 + i * 8}%}`).join('')}}
}
@keyframes pg-blink{50%{opacity:.15}}
@keyframes pg-drop{from{opacity:0;transform:translateY(-1.5rem) scale(.4)}}`,
};

export const BLOCKS: CustomBlockDef[] = [days, map];
