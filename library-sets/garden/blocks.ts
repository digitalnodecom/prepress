/**
 * Night Garden — blocks. Site-defined `prepress/garden-*` types for evening
 * places: a lantern-lit headline with fireflies, generated botanicals, arched
 * windows onto a night sky (the set's stand-in for photos), menu lines,
 * opening hours, a turning seal, a growing vine and a reservation card.
 *
 * Custom-block CSS is global, so every rule is namespaced under
 * `.wp-block-prepress-garden-<slug>` / `.ng-*`. Colours and faces come only
 * from presets; motion is slow and stops under prefers-reduced-motion.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const MIX = (slug: string, pct: number, other = 'transparent') => `color-mix(in srgb, ${C(slug)} ${pct}%, ${other})`;
const HEADING = 'var(--wp--preset--font-family--heading)';
const BODY = 'var(--wp--preset--font-family--body)';
const MONO = 'var(--wp--preset--font-family--mono, ui-monospace, Menlo, monospace)';
const EASE = 'cubic-bezier(.3,.6,.2,1)';

// ---------- botanical generators (authoring time; no ids, so any number can share a page) ----------

const n = (v: number) => (Math.round(v * 10) / 10).toString();
const pt = (x: number, y: number) => `${n(x)} ${n(y)}`;
type P = [number, number];

/** Point and tangent angle on a quadratic curve. */
function quad(p0: P, p1: P, p2: P) {
  return {
    at: (t: number): P => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]],
    angle: (t: number) => Math.atan2(2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]), 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])),
    d: `M${pt(...p0)}Q${pt(...p1)} ${pt(...p2)}`,
  };
}

/** An almond leaf from base (x,y) along angle a. */
function leaf(x: number, y: number, a: number, len: number, wid: number) {
  const tip: P = [x + len * Math.cos(a), y + len * Math.sin(a)];
  const nx = -Math.sin(a), ny = Math.cos(a);
  const m: P = [x + (len / 2) * Math.cos(a), y + (len / 2) * Math.sin(a)];
  return `M${pt(x, y)}Q${pt(m[0] + nx * wid, m[1] + ny * wid)} ${pt(...tip)}Q${pt(m[0] - nx * wid, m[1] - ny * wid)} ${pt(x, y)}Z`;
}

/** Heart leaves need the point at the far end; draw them as two lobes meeting at the tip. */
function heartLeaf(x: number, y: number, a: number, s: number) {
  const tf = (px: number, py: number): P => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)];
  const P = (px: number, py: number) => pt(...tf(px * s, py * s));
  // Base notch at 0,0; tip at 1,0.
  return `M${P(0.08, 0)}C${P(-0.1, -0.45)} ${P(0.45, -0.6)} ${P(1, 0)}C${P(0.45, 0.6)} ${P(-0.1, 0.45)} ${P(0.08, 0)}Z`;
}

function fern() {
  const stem = quad([96, 258], [62, 140], [118, 18]);
  const leaves: string[] = [];
  for (let i = 0; i < 17; i++) {
    const t = 0.06 + i * 0.055;
    const [x, y] = stem.at(t);
    const a = stem.angle(t);
    const len = 64 * (1 - t * 0.82);
    for (const side of [-1, 1]) leaves.push(leaf(x, y, a + side * 1.05, len, len * 0.16));
  }
  const [tx, ty] = stem.at(1);
  leaves.push(leaf(tx, ty, stem.angle(1), 12, 3));
  return `<path class="s" d="${stem.d}"/><path class="l" d="${leaves.join('')}"/>`;
}

/** Map local coordinates (x right, y up from the base) into the 200×260 box. */
function frame(ox: number, oy: number, rot: number, scale: number) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return (x: number, y: number) => pt(ox + (x * c + y * sn) * scale, oy + (x * sn - y * c) * scale);
}

/** One monstera leaf: heart outline with rows of slits beside the midrib (even-odd holes). */
function monsteraLeaf(ox: number, oy: number, rot: number, scale: number) {
  const P = frame(ox, oy, rot, scale);
  // Base notch at 0,0, tip at 0,170; half-width w(y).
  const outline = `M${P(0, 8)}C${P(-30, -14)} ${P(-80, 8)} ${P(-80, 70)}C${P(-80, 130)} ${P(-40, 165)} ${P(0, 172)}C${P(40, 165)} ${P(80, 130)} ${P(80, 70)}C${P(80, 8)} ${P(30, -14)} ${P(0, 8)}Z`;
  const w = (y: number) => 78 * Math.sqrt(Math.max(0, 1 - ((y - 78) / 96) ** 2));
  const holes: string[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const y = 28 + i * 27;
      const x1 = side * 9, x2 = side * w(y + 16) * 0.86;
      const y2 = y + 16 + (i === 0 ? 4 : 0);
      const half = 3.2;
      holes.push(`M${P(x1, y - half)}L${P(x2, y2 - half * 0.5)}Q${P(x2 + side * 2.5, y2)} ${P(x2, y2 + half * 0.5)}L${P(x1, y + half)}Z`);
      if (i > 0 && i < 4) holes.push(`M${P(side * w(y) * 0.38 - 2.5, y + 22)}a${n(2.5 * scale)} ${n(4 * scale)} 0 1 0 ${n(5 * scale)} 0a${n(2.5 * scale)} ${n(4 * scale)} 0 1 0 ${n(-5 * scale)} 0Z`);
    }
  }
  return { leaf: `${outline}${holes.join('')}`, rib: `M${P(0, 6)}Q${P(-2, 90)} ${P(0, 166)}`, base: P(0, 4) };
}

function monstera() {
  const back = monsteraLeaf(138, 186, 0.55, 0.52);
  const front = monsteraLeaf(92, 214, -0.16, 0.86);
  return `<path class="s" d="M${back.base}Q132 230 116 258M${front.base}Q104 236 110 258"/><path class="l" fill-rule="evenodd" d="${back.leaf}"/><path class="l" fill-rule="evenodd" d="${front.leaf}"/><path class="v" d="${back.rib}${front.rib}"/>`;
}

function eucalyptus() {
  const stem = quad([104, 258], [140, 150], [92, 14]);
  const coins: string[] = [];
  for (let i = 0; i < 12; i++) {
    const t = 0.08 + i * 0.077;
    const [x, y] = stem.at(t);
    const a = stem.angle(t) + Math.PI / 2;
    const side = i % 2 ? 1 : -1;
    const r = 19 - i * 0.95;
    const ox = x + side * (r + 3) * Math.cos(a), oy = y + side * (r + 3) * Math.sin(a);
    coins.push(`M${pt(ox - r, oy)}a${n(r)} ${n(r * 0.9)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r * 0.9)} 0 1 0 ${n(-2 * r)} 0Z`);
  }
  return `<path class="s" d="${stem.d}"/><path class="l" d="${coins.join('')}"/>`;
}

function poppy() {
  const main = quad([100, 258], [126, 170], [96, 92]);
  const nod = quad([100, 258], [72, 180], [138, 132]);
  const [fx, fy] = main.at(1);
  // A cup of petals seen from the side, with a notch where two petals meet.
  const P = frame(fx, fy, -0.12, 1);
  const cup = `M${P(0, 0)}C${P(-34, 2)} ${P(-40, 40)} ${P(-24, 52)}C${P(-14, 60)} ${P(-5, 52)} ${P(0, 44)}C${P(5, 52)} ${P(14, 60)} ${P(24, 52)}C${P(40, 40)} ${P(34, 2)} ${P(0, 0)}Z`;
  const folds = `M${P(0, 2)}Q${P(-4, 24)} ${P(0, 44)}M${P(-6, 2)}Q${P(-22, 26)} ${P(-24, 50)}M${P(6, 2)}Q${P(22, 26)} ${P(24, 50)}`;
  const [bx, by] = nod.at(1);
  const B = frame(bx, by, 2.5, 1);
  const bud = `M${B(0, 0)}C${B(-9, 4)} ${B(-10, 20)} ${B(0, 26)}C${B(10, 20)} ${B(9, 4)} ${B(0, 0)}Z`;
  return `<path class="s" d="${main.d}${nod.d}"/><path class="l" d="${cup}${bud}${leaf(100, 250, -2.25, 60, 7)}${leaf(100, 250, -0.95, 54, 6)}${leaf(104, 214, -0.55, 34, 5)}"/><path class="v" d="${folds}"/>`;
}

function moonflower() {
  const vine = 'M36 258C20 200 92 190 84 140C76 92 150 104 132 66';
  const hearts = [
    heartLeaf(40, 222, -2.6, 46),
    heartLeaf(70, 186, -0.2, 40),
    heartLeaf(84, 150, -2.9, 38),
    heartLeaf(96, 112, 0.1, 34),
    heartLeaf(124, 92, -2.4, 26),
  ];
  // A trumpet bloom opening up and to the right, its flared face showing five creases.
  const T = frame(132, 66, 0.55, 1);
  const bloom = `M${T(-4, 0)}L${T(-7, 30)}C${T(-34, 38)} ${T(-40, 54)} ${T(-32, 60)}C${T(-12, 56)} ${T(12, 56)} ${T(32, 60)}C${T(40, 54)} ${T(34, 38)} ${T(7, 30)}L${T(4, 0)}Z`;
  const creases = [-28, -14, 0, 14, 28].map((x) => `M${T(0, 32)}L${T(x, 57)}`).join('');
  const bud = (() => {
    const U = frame(70, 186, -0.9, 1);
    return `M${U(0, 0)}C${U(-6, 10)} ${U(-5, 26)} ${U(0, 34)}C${U(5, 26)} ${U(6, 10)} ${U(0, 0)}Z`;
  })();
  return `<path class="s" d="${vine}"/><path class="l" d="${hearts.join('')}${bloom}${bud}"/><path class="v" d="${creases}"/>`;
}

const BOTANICALS: Record<string, string> = { fern: fern(), monstera: monstera(), eucalyptus: eucalyptus(), poppy: poppy(), moonflower: moonflower() };
const MOTIFS = Object.keys(BOTANICALS);
const botanicalSvgs = (cls: string) =>
  Object.entries(BOTANICALS)
    .map(([k, svg]) => `<svg class="${cls} ${cls}--${k}" viewBox="0 0 200 260" aria-hidden="true" focusable="false"><g class="ng-sway">${svg}</g></svg>`)
    .join('');
/** CSS that shows only the chosen motif's svg. */
const showMotif = (root: string, cls: string) => `${MOTIFS.map((m) => `${root}[data-motif=${m}] .${cls}--${m}`).join(',')}{display:block}`;

/** Shared botanical paint: stems stroke, leaves fill (silhouette) or stroke (line). */
const PAINT = (root: string) => `
${root} svg{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
${root} .s{stroke-width:2}
${root} .l{fill:currentColor;stroke:none}
${root} .v{stroke:var(--ng-vein,${C('base')});stroke-width:1.2;opacity:.55}
${root} .c{fill:var(--ng-heart,${C('accent')});stroke:none}
${root} .c-s{stroke:var(--ng-heart,${C('accent')});stroke-width:1.4}
${root}[data-style=line] .l{fill:none;stroke:currentColor;stroke-width:1.3}
${root}[data-style=line] .v{stroke:currentColor;opacity:.6}
@media (prefers-reduced-motion:no-preference){${root} .ng-sway{transform-box:view-box;transform-origin:100px 258px;animation:ng-sway 9s ease-in-out infinite alternate}}
@keyframes ng-sway{from{transform:rotate(-1.8deg)}to{transform:rotate(1.8deg)}}`;

// ---------- blocks ----------

const FLIES = Array.from({ length: 14 }, (_, i) => {
  const x = (i * 37 + 11) % 100, y = (i * 53 + 7) % 92, d = (i * 1.7) % 9, s = 7 + ((i * 3) % 6);
  return `<i style="--x:${x}%;--y:${y}%;--d:-${n(d)}s;--t:${s}s"></i>`;
}).join('');

export const glow: CustomBlockDef = {
  name: 'prepress/garden-glow',
  title: 'Garden glow headline',
  description: 'A large italic headline lit by a lantern (amber) or moon (cream) glow, with optional fireflies drifting through it. Wrap a word in italics to light it in the accent colour.',
  icon: 'lightbulb',
  category: 'design',
  attributes: {
    eyebrow: { type: 'string', label: 'Eyebrow', control: 'text', default: 'Garden restaurant & wine bar' },
    title: { type: 'string', label: 'Headline', control: 'richtext', default: 'Dinner under<br>the <em>lanterns</em>' },
    light: { type: 'string', label: 'Light', control: 'select', options: ['amber', 'moon', 'both'], default: 'amber' },
    fireflies: { type: 'boolean', label: 'Fireflies', control: 'toggle', default: true },
  },
  template: `<div class="ng-glow" data-light="{{light}}"><div class="ng-glow__light" aria-hidden="true"></div>{{#fireflies}}<div class="ng-flies" aria-hidden="true">${FLIES}</div>{{/fireflies}}{{#eyebrow}}<p class="ng-glow__eyebrow">{{eyebrow}}</p>{{/eyebrow}}<h1 class="ng-glow__title">{{title}}</h1></div>`,
  css: `
.ng-glow{position:relative;isolation:isolate;padding-block:clamp(1rem,4vw,3rem)}
.ng-glow__light{position:absolute;z-index:-1;inset:-30% -20%;pointer-events:none;background:radial-gradient(closest-side at 32% 52%,${MIX('accent', 30)},${MIX('accent', 10)} 45%,transparent 75%)}
.ng-glow[data-light=moon] .ng-glow__light{background:radial-gradient(closest-side at 62% 40%,${MIX('contrast', 20)},${MIX('contrast', 6)} 45%,transparent 75%)}
.ng-glow[data-light=both] .ng-glow__light{background:radial-gradient(closest-side at 28% 60%,${MIX('accent', 28)},transparent 70%),radial-gradient(closest-side at 78% 28%,${MIX('contrast', 16)},transparent 70%)}
.ng-glow__eyebrow{margin:0 0 1.2em;font-family:${MONO};font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;color:${C('accent')}}
.ng-glow__title{margin:0;font-family:${HEADING};font-style:italic;font-weight:300;font-size:var(--wp--preset--font-size--grand,clamp(3.4rem,9vw,8rem));line-height:.92;letter-spacing:-.02em;text-wrap:balance}
.ng-glow__title em{font-style:italic;color:${C('accent')}}
.ng-flies{position:absolute;inset:-10% -5%;z-index:-1;pointer-events:none}
.ng-flies i{position:absolute;left:var(--x);top:var(--y);width:4px;height:4px;border-radius:50%;background:${C('accent')};box-shadow:0 0 6px 2px ${MIX('accent', 60)},0 0 18px 6px ${MIX('accent', 22)};opacity:.55}
@media (prefers-reduced-motion:no-preference){.ng-flies i{animation:ng-fly var(--t) ease-in-out var(--d) infinite alternate,ng-blink calc(var(--t) * .45) ease-in-out var(--d) infinite alternate}}
@keyframes ng-fly{0%{transform:translate(0,0)}33%{transform:translate(18px,-14px)}66%{transform:translate(-10px,-26px)}100%{transform:translate(12px,8px)}}
@keyframes ng-blink{0%,30%{opacity:.1}70%,100%{opacity:.95}}`,
};

export const botanical: CustomBlockDef = {
  name: 'prepress/garden-botanical',
  title: 'Garden botanical',
  description: 'A generated botanical — fern, monstera, eucalyptus, poppy or moonflower — as a filled silhouette or a fine line drawing, swaying slowly.',
  icon: 'palmtree',
  category: 'media',
  attributes: {
    motif: { type: 'string', label: 'Plant', control: 'select', options: MOTIFS, default: 'fern' },
    drawing: { type: 'string', label: 'Drawing', control: 'select', options: ['silhouette', 'line'], default: 'line' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
    tone: { type: 'string', label: 'Colour', control: 'select', options: ['text', 'accent'], default: 'text' },
  },
  template: `<div class="ng-bot" data-motif="{{motif}}" data-style="{{drawing}}" data-size="{{size}}" data-tone="{{tone}}" aria-hidden="true">${botanicalSvgs('ng-bot__svg')}</div>`,
  css: `
.ng-bot{margin-inline:auto;width:min(100%,var(--s,11rem))}
.ng-bot[data-size=s]{--s:6.5rem}.ng-bot[data-size=l]{--s:17rem}
.ng-bot[data-tone=accent]{color:${C('accent')}}
.ng-bot__svg{display:none;width:100%;height:auto}
${showMotif('.ng-bot', 'ng-bot__svg')}
${PAINT('.ng-bot')}`,
};

export const arch: CustomBlockDef = {
  name: 'prepress/garden-arch',
  title: 'Garden arch',
  description: 'An arched window onto a night sky — moonlit, dusk or lantern amber — with a plant in silhouette against it. The set’s stand-in for a photograph.',
  icon: 'format-image',
  category: 'media',
  attributes: {
    motif: { type: 'string', label: 'Plant', control: 'select', options: MOTIFS, default: 'monstera' },
    sky: { type: 'string', label: 'Sky', control: 'select', options: ['moon', 'dusk', 'amber'], default: 'moon' },
    height: { type: 'string', label: 'Height', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
    caption: { type: 'string', label: 'Caption', control: 'text', default: '' },
  },
  template: `<figure class="ng-arch" data-motif="{{motif}}" data-sky="{{sky}}" data-height="{{height}}"{{^caption}} aria-hidden="true"{{/caption}}><div class="ng-arch__frame"><span class="ng-arch__orb" aria-hidden="true"></span>${botanicalSvgs('ng-arch__svg')}</div>{{#caption}}<figcaption>{{caption}}</figcaption>{{/caption}}</figure>`,
  css: `
.ng-arch{margin:0}
.ng-arch__frame{position:relative;overflow:hidden;isolation:isolate;aspect-ratio:3/4;border-radius:999px 999px 0 0;border:1px solid ${MIX('contrast', 22)};color:${C('base')};background:radial-gradient(1.5px 1.5px at 22% 24%,${C('contrast')},transparent),radial-gradient(1px 1px at 70% 16%,${C('contrast')},transparent),radial-gradient(1px 1px at 46% 36%,${MIX('contrast', 80)},transparent),radial-gradient(1.5px 1.5px at 84% 40%,${MIX('contrast', 70)},transparent),radial-gradient(1px 1px at 12% 46%,${MIX('contrast', 70)},transparent),linear-gradient(to bottom,${C('secondary')},${MIX('secondary', 60, C('base'))})}
.ng-arch[data-height=s] .ng-arch__frame{aspect-ratio:4/5}.ng-arch[data-height=l] .ng-arch__frame{aspect-ratio:3/4.6}
.ng-arch[data-sky=dusk] .ng-arch__frame{background:radial-gradient(1px 1px at 30% 18%,${MIX('contrast', 80)},transparent),radial-gradient(1px 1px at 72% 12%,${MIX('contrast', 70)},transparent),linear-gradient(to bottom,${C('secondary')} 0%,${MIX('accent', 30, C('secondary'))} 58%,${MIX('accent', 75, C('secondary'))} 100%)}
.ng-arch[data-sky=amber] .ng-arch__frame{background:radial-gradient(120% 70% at 50% 100%,${C('accent')} 0%,${MIX('accent', 55, C('secondary'))} 40%,${C('secondary')} 85%)}
.ng-arch__orb{position:absolute;z-index:-1;left:58%;top:16%;width:22%;aspect-ratio:1;border-radius:50%;background:${C('contrast')};box-shadow:0 0 40px 10px ${MIX('contrast', 25)},0 0 120px 40px ${MIX('contrast', 10)}}
.ng-arch[data-sky=dusk] .ng-arch__orb{top:auto;bottom:26%;left:22%;width:26%;background:${C('accent')};box-shadow:0 0 60px 20px ${MIX('accent', 35)}}
.ng-arch[data-sky=amber] .ng-arch__orb{display:none}
.ng-arch__svg{display:none;position:absolute;left:50%;bottom:-3%;width:88%;height:auto;transform:translateX(-50%)}
${showMotif('.ng-arch', 'ng-arch__svg')}
${PAINT('.ng-arch')}
.ng-arch{--ng-vein:${C('secondary')};--ng-heart:${C('base')}}
@media (max-width:600px){.ng-arch{max-width:17rem;margin-inline:auto}}
.ng-arch figcaption{margin-top:.9em;font-family:${MONO};font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;text-align:center;opacity:.75}`,
};

export const menuItem: CustomBlockDef = {
  name: 'prepress/garden-menu-item',
  title: 'Garden menu item',
  description: 'One dish or drink: name and price joined by a dotted leader, dietary marks in the accent colour, and a short description underneath.',
  icon: 'food',
  category: 'text',
  attributes: {
    name: { type: 'string', label: 'Name', control: 'text', default: 'Charred leeks, hazelnut, brown butter' },
    marks: { type: 'string', label: 'Marks', control: 'text', default: 'v · gf' },
    price: { type: 'string', label: 'Price', control: 'text', default: '14' },
    description: { type: 'string', label: 'Description', control: 'text', default: 'Leeks from Ana’s plot, cooked in the embers until sweet.' },
  },
  template: `<div class="ng-dish"><p class="ng-dish__head"><span class="ng-dish__name">{{name}}</span>{{#marks}}<span class="ng-dish__marks">{{marks}}</span>{{/marks}}<span class="ng-dish__dots" aria-hidden="true"></span><span class="ng-dish__price">{{price}}</span></p>{{#description}}<p class="ng-dish__desc">{{description}}</p>{{/description}}</div>`,
  css: `
.wp-block-prepress-garden-menu-item{margin-block-start:1.4rem}
.ng-dish__head{display:flex;align-items:baseline;gap:.55em;margin:0}
.ng-dish__name{font-family:${HEADING};font-weight:500;font-size:1.45rem;line-height:1.15;text-wrap:balance}
.ng-dish__marks{flex:none;font-family:${MONO};font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:${C('accent')}}
.ng-dish__dots{flex:1 1 1.5rem;min-width:1rem;border-bottom:1px dotted ${MIX('contrast', 40)};transform:translateY(-.3em)}
.ng-dish__price{flex:none;font-family:${MONO};font-size:.95rem;font-variant-numeric:tabular-nums}
.ng-dish__desc{margin:.3em 0 0;max-width:34em;font-family:${BODY};font-size:.92rem;line-height:1.5;color:${MIX('contrast', 74, C('base'))}}`,
};

export const hours: CustomBlockDef = {
  name: 'prepress/garden-hours',
  title: 'Garden opening hours',
  description: 'One line of opening hours — days, times and an optional note — joined by a dotted leader. Stack them for a timetable; tick “closed” to dim a day.',
  icon: 'clock',
  category: 'text',
  attributes: {
    days: { type: 'string', label: 'Days', control: 'text', default: 'Wednesday – Saturday' },
    time: { type: 'string', label: 'Hours', control: 'text', default: '17:00 – 00:00' },
    note: { type: 'string', label: 'Note', control: 'text', default: '' },
    closed: { type: 'boolean', label: 'Closed', control: 'toggle', default: false },
  },
  template: `<p class="ng-hours"{{#closed}} data-closed="true"{{/closed}}><span class="ng-hours__days">{{days}}</span><span class="ng-hours__dots" aria-hidden="true"></span><span class="ng-hours__time">{{time}}</span>{{#note}}<span class="ng-hours__note">{{note}}</span>{{/note}}</p>`,
  css: `
.wp-block-prepress-garden-hours{margin-block-start:.2rem!important}
.ng-hours{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 .6em;margin:0;padding:.55em 0;border-bottom:1px solid ${MIX('contrast', 14)}}
.ng-hours__days{font-family:${HEADING};font-style:italic;font-size:1.3rem}
.ng-hours__dots{flex:1 1 1rem;border-bottom:1px dotted ${MIX('contrast', 35)};transform:translateY(-.3em)}
.ng-hours__time{font-family:${MONO};font-size:.85rem;letter-spacing:.04em;font-variant-numeric:tabular-nums}
.ng-hours__note{flex-basis:100%;font-family:${MONO};font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:${C('accent')}}
.ng-hours[data-closed=true]{opacity:.5}`,
};

const SPRIG = `<path class="ng-seal__sprig" d="M100 128Q98 100 104 72${[0, 1, 2, 3, 4].map((i) => leaf(100 + (i % 2 ? 2 : -1), 120 - i * 11, i % 2 ? -0.5 : -2.6, 16 - i, 5)).join('')}"/>`;

export const seal: CustomBlockDef = {
  name: 'prepress/garden-seal',
  title: 'Garden seal',
  description: 'A round seal: a line of text set around a circle, turning very slowly around a small sprig. For a season, a founding year or a motto.',
  icon: 'awards',
  category: 'design',
  attributes: {
    text: { type: 'string', label: 'Text around the circle', control: 'text', default: 'Autumn menu · Open evenings · Since 2019 · ' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
    tone: { type: 'string', label: 'Colour', control: 'select', options: ['text', 'accent'], default: 'accent' },
  },
  template: `<div class="ng-seal" data-size="{{size}}" data-tone="{{tone}}"><svg viewBox="0 0 200 200" role="img" aria-label="{{text}}"><circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="58"/><g class="ng-seal__ring"><path id="ng-seal-arc" d="M100 100m-77 0a77 77 0 1 1 154 0a77 77 0 1 1-154 0" fill="none" stroke="none"/><text><textPath href="#ng-seal-arc" textLength="480" lengthAdjust="spacing">{{text}}</textPath></text></g>${SPRIG}</svg></div>`,
  css: `
.ng-seal{width:min(100%,var(--s,10rem))}
.ng-seal[data-size=s]{--s:7rem}.ng-seal[data-size=l]{--s:14rem}
.ng-seal[data-tone=accent]{color:${C('accent')}}
.ng-seal svg{display:block;width:100%;height:auto;fill:none;stroke:currentColor;stroke-width:1;overflow:visible}
.ng-seal text{fill:currentColor;stroke:none;font-family:${MONO};font-size:13.5px;letter-spacing:.18em;text-transform:uppercase}
.ng-seal__sprig{fill:currentColor;stroke:currentColor;stroke-width:1.4}
@media (prefers-reduced-motion:no-preference){.ng-seal__ring{transform-box:view-box;transform-origin:100px 100px;animation:ng-turn 60s linear infinite}}
@keyframes ng-turn{to{transform:rotate(360deg)}}`,
};

const VINE = (() => {
  const stem = 'M0 20C40 4 80 36 120 20S200 4 240 20';
  const leaves: string[] = [];
  // Alternate leaves on the two cubic segments, leaning the way the stem grows.
  const segs: [P, P, P, P][] = [[[0, 20], [40, 4], [80, 36], [120, 20]], [[120, 20], [160, 4], [200, 4], [240, 20]]];
  const cubic = ([a, b, c, d]: [P, P, P, P], t: number): { p: P; ang: number } => {
    const u = 1 - t;
    const p: P = [u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0], u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1]];
    const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
    const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
    return { p, ang: Math.atan2(dy, dx) };
  };
  let k = 0;
  for (const seg of segs) {
    for (const t of [0.12, 0.3, 0.5, 0.7, 0.88]) {
      const { p: [x, y], ang } = cubic(seg, t);
      const side = k++ % 2 ? 1 : -1;
      const size = 16 - Math.abs(x - 120) / 22;
      leaves.push(leaf(x, y, ang + side * 0.7, size, size * 0.3));
    }
  }
  return `<path class="ng-vine__stem" pathLength="1" d="${stem}"/><path class="ng-vine__leaves" d="${leaves.join('')}"/><circle class="ng-vine__bud" cx="120" cy="20" r="3.2"/>`;
})();

export const vine: CustomBlockDef = {
  name: 'prepress/garden-vine',
  title: 'Garden vine divider',
  description: 'A section break: a short vine with leaves and an amber bud between two hairlines. The vine grows in as it scrolls into view.',
  icon: 'minus',
  category: 'design',
  attributes: {
    position: { type: 'string', label: 'Position', control: 'select', options: ['center', 'left'], default: 'center' },
  },
  template: `<div class="ng-vine" data-position="{{position}}" role="separator"><svg viewBox="0 0 240 40" aria-hidden="true" focusable="false">${VINE}</svg></div>`,
  css: `
.ng-vine{display:flex;align-items:center;gap:1rem;color:${C('contrast')}}
.ng-vine::before,.ng-vine::after{content:"";flex:1 1 0;border-top:1px solid ${MIX('contrast', 22)}}
.ng-vine[data-position=left]::before{display:none}
.ng-vine svg{flex:none;width:9.5rem;height:auto;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.2;stroke-linecap:round}
.ng-vine__leaves{fill:currentColor;stroke:none;opacity:.85}
.ng-vine__bud{fill:${C('accent')};stroke:none}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.ng-vine__stem{stroke-dasharray:1;animation:ng-grow linear both;animation-timeline:view();animation-range:entry 10% cover 40%}.ng-vine__leaves,.ng-vine__bud{animation:ng-bloom linear both;animation-timeline:view();animation-range:entry 30% cover 45%}}}
@keyframes ng-grow{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes ng-bloom{from{opacity:0}}`,
};

export const reserve: CustomBlockDef = {
  name: 'prepress/garden-reserve',
  title: 'Garden reservation card',
  description: 'A softly glowing card that sends guests to your booking page, with a phone number for those who would rather call. A link, not a form.',
  icon: 'calendar-alt',
  category: 'widgets',
  attributes: {
    eyebrow: { type: 'string', label: 'Eyebrow', control: 'text', default: 'Reservations' },
    title: { type: 'string', label: 'Title', control: 'text', default: 'Keep a table in the garden' },
    detail: { type: 'string', label: 'Detail', control: 'text', default: 'Wednesday to Saturday from five. Walk-ins welcome at the bar; the garden is best booked.' },
    label: { type: 'string', label: 'Button', control: 'text', default: 'Book a table' },
    url: { type: 'string', label: 'Booking link', control: 'url', default: 'https://example.com/book' },
    phone: { type: 'string', label: 'Phone', control: 'text', default: '+386 1 234 5678' },
  },
  template: `<div class="ng-res"><p class="ng-res__eyebrow">{{eyebrow}}</p><p class="ng-res__title">{{title}}</p>{{#detail}}<p class="ng-res__detail">{{detail}}</p>{{/detail}}<p class="ng-res__actions">{{#url}}<a class="ng-res__btn" href="{{url}}">{{label}}<span aria-hidden="true"> →</span></a>{{/url}}{{#phone}}<span class="ng-res__phone">or call <a href="tel:{{phone}}">{{phone}}</a></span>{{/phone}}</p></div>`,
  css: `
.ng-res{position:relative;isolation:isolate;padding:clamp(2rem,5vw,3.75rem) clamp(1.5rem,5vw,4rem);border:1px solid ${MIX('accent', 45)};border-radius:2rem;background:${C('muted')};text-align:center;box-shadow:0 0 0 6px ${MIX('accent', 6)},0 30px 120px -20px ${MIX('accent', 30)}}
.ng-res__eyebrow{margin:0;font-family:${MONO};font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:${C('accent')}}
.ng-res__title{margin:.4em 0 0;font-family:${HEADING};font-style:italic;font-weight:300;font-size:clamp(2.2rem,5vw,3.6rem);line-height:1}
.ng-res__detail{margin:1em auto 0;max-width:34em;color:${MIX('contrast', 80, C('base'))}}
.ng-res__actions{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:1rem 1.5rem;margin:1.8em 0 0}
.ng-res__btn{display:inline-block;padding:.95em 1.9em;border-radius:999px;background:${C('accent')};color:${C('base')};font-family:${MONO};font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;transition:background-color .25s,color .25s}
.ng-res__btn:hover,.ng-res__btn:focus-visible{background:${C('contrast')};color:${C('base')}}
.ng-res__phone{font-family:${MONO};font-size:.8rem;letter-spacing:.06em}
.ng-res__phone a{color:inherit}`,
};

export const BLOCKS: CustomBlockDef[] = [glow, botanical, arch, menuItem, hours, seal, vine, reserve];
