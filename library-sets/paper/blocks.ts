/**
 * Paper Edition — blocks. Site-defined `prepress/paper-*` types for long-form
 * reading: masthead, drop-cap lede, pull quote, sidenote, byline, ornament,
 * index row with a dot leader, and engraved line-art (generated SVG, no ids,
 * so any number of them can share a page).
 *
 * Custom-block CSS is global, so every rule is namespaced under
 * `.wp-block-prepress-paper-<slug>` / `.pe-*`. Colours and faces come only from
 * presets (heading, body, mono), so the blocks restyle with any Style.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const HEADING = 'var(--wp--preset--font-family--heading)';
const BODY = 'var(--wp--preset--font-family--body)';
const MONO = 'var(--wp--preset--font-family--mono, ui-monospace, Menlo, monospace)';
const EASE = 'cubic-bezier(.25,.6,.2,1)';
const HAIR = 'color-mix(in srgb, currentColor 22%, transparent)';

// ---------- engraving generators (run at authoring time) ----------

const n = (v: number) => (Math.round(v * 10) / 10).toString();
const pt = (x: number, y: number) => `${n(x)} ${n(y)}`;
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

/** Horizontal hatching inside a circle, as one path. */
function hatchCircle(cx: number, cy: number, r: number, from: number, to: number, step: number, inset = 2) {
  const d: string[] = [];
  for (let y = from; y <= to; y += step) {
    const dy = y - cy;
    if (Math.abs(dy) >= r - 1) continue;
    const half = Math.sqrt(r * r - dy * dy) - inset;
    if (half > 2) d.push(`M${pt(cx - half, y)}H${n(cx + half)}`);
  }
  return d.join('');
}

function sun() {
  const rays: string[] = [];
  for (let i = 0; i < 36; i++) {
    const a = i * 10;
    const [x1, y1] = polar(100, 100, 46, a);
    const [x2, y2] = polar(100, 100, i % 2 ? 72 : 92, a);
    rays.push(`M${pt(x1, y1)}L${pt(x2, y2)}`);
  }
  const ring: string[] = [];
  for (let i = 0; i < 36; i++) {
    const [x, y] = polar(100, 100, 82, i * 10 + 5);
    ring.push(`<circle class="f" cx="${n(x)}" cy="${n(y)}" r="1.3"/>`);
  }
  return `<g class="pe-eng__rays"><path d="${rays.join('')}"/>${ring.join('')}</g><circle cx="100" cy="100" r="36"/><circle cx="100" cy="100" r="40"/><path d="${hatchCircle(100, 100, 36, 72, 135, 4.2)}"/>`;
}

function moon() {
  // Crescent: a disc (100,100,r64) minus an offset disc (126,86,r56); hatching in the crescent only.
  const R = 64, ox = 126, oy = 86, r = 56;
  const d: string[] = [];
  for (let y = 40; y <= 162; y += 4) {
    const dy = y - 100;
    if (Math.abs(dy) >= R) continue;
    const xl = 100 - Math.sqrt(R * R - dy * dy) + 2;
    const xr = 100 + Math.sqrt(R * R - dy * dy) - 2;
    const ody = y - oy;
    const end = Math.abs(ody) < r ? Math.min(xr, ox - Math.sqrt(r * r - ody * ody) - 2) : xr;
    if (end - xl > 2) d.push(`M${pt(xl, y)}H${n(end)}`);
  }
  // Outline: outer arc then inner arc between the two intersection points.
  const dx = ox - 100, dy = oy - 100, dist = Math.hypot(dx, dy);
  const a = (R * R - r * r + dist * dist) / (2 * dist);
  const h = Math.sqrt(R * R - a * a);
  const mx = 100 + (a * dx) / dist, my = 100 + (a * dy) / dist;
  const p1 = [mx + (h * dy) / dist, my - (h * dx) / dist];
  const p2 = [mx - (h * dy) / dist, my + (h * dx) / dist];
  const outline = `M${pt(p1[0], p1[1])}A${R} ${R} 0 1 0 ${pt(p2[0], p2[1])}A${r} ${r} 0 0 1 ${pt(p1[0], p1[1])}Z`;
  const star = (x: number, y: number, s: number) => `M${pt(x, y - s)}Q${pt(x, y)} ${pt(x + s, y)}Q${pt(x, y)} ${pt(x, y + s)}Q${pt(x, y)} ${pt(x - s, y)}Q${pt(x, y)} ${pt(x, y - s)}Z`;
  return `<path d="${outline}"/><path d="${d.join('')}"/><path class="f" d="${star(156, 52, 7)}${star(172, 128, 4.5)}${star(38, 40, 5)}${star(150, 170, 3.5)}"/>`;
}

function waves() {
  const rows: string[] = [];
  for (let i = 0; i < 9; i++) {
    const y = 88 + i * 12 + i * i * 0.6;
    const amp = 1.6 + i * 0.55;
    const w = 18 + i * 3.2;
    let d = `M-60 ${n(y)}`;
    for (let x = -60, k = 0; x < 260; x += w / 2, k++) d += `Q${pt(x + w / 4, y + (k % 2 ? amp : -amp))} ${pt(x + w / 2, y)}`;
    rows.push(d);
  }
  const sunHatch = hatchCircle(100, 78, 26, 56, 76, 3.6);
  return `<path d="M8 78H192"/><path d="M74 78A26 26 0 0 1 126 78"/><path d="${sunHatch}"/><g class="pe-eng__sea"><path d="${rows.join('')}"/></g>`;
}

function compass() {
  const ticks: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = i * 5;
    const [x1, y1] = polar(100, 100, i % 9 === 0 ? 78 : 86, a);
    const [x2, y2] = polar(100, 100, 92, a);
    ticks.push(`M${pt(x1, y1)}L${pt(x2, y2)}`);
  }
  const point = (deg: number, len: number, w: number) => {
    const t = polar(100, 100, len, deg);
    const s1 = polar(100, 100, w, deg - 45);
    const s2 = polar(100, 100, w, deg + 45);
    return [`M100 100L${pt(t[0], t[1])}L${pt(s1[0], s1[1])}Z`, `M100 100L${pt(t[0], t[1])}L${pt(s2[0], s2[1])}Z`];
  };
  const filled: string[] = [];
  const open: string[] = [];
  for (const [deg, len, w] of [[-45, 52, 11], [45, 52, 11], [135, 52, 11], [225, 52, 11], [-90, 80, 15], [0, 80, 15], [90, 80, 15], [180, 80, 15]] as const) {
    const [a, b] = point(deg, len, w);
    filled.push(a);
    open.push(b);
  }
  return `<circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="86"/><path d="${ticks.join('')}"/><circle cx="100" cy="100" r="62"/><g class="pe-eng__needle"><path class="pe-eng__paper" d="${open.join('')}"/><path class="f" d="${filled.join('')}"/><circle class="pe-eng__paper" cx="100" cy="100" r="5"/></g>`;
}

function laurel() {
  // One branch along a quadratic curve; the other is its mirror.
  const P0 = [100, 176], P1 = [26, 150], P2 = [44, 46];
  const at = (t: number) => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
  const tan = (t: number) => Math.atan2(2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]), 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]));
  const leaves: string[] = [];
  const veins: string[] = [];
  for (let i = 0; i < 10; i++) {
    const t = 0.1 + i * 0.088;
    const [x, y] = at(t);
    const base = tan(t);
    for (const side of [-1, 1]) {
      const ang = base + side * 0.75;
      const len = 19 - i * 0.7;
      const wid = 6 - i * 0.18;
      const tip = [x + len * Math.cos(ang), y + len * Math.sin(ang)];
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const mid = [x + (len / 2) * Math.cos(ang), y + (len / 2) * Math.sin(ang)];
      leaves.push(`M${pt(x, y)}Q${pt(mid[0] + nx * wid, mid[1] + ny * wid)} ${pt(tip[0], tip[1])}Q${pt(mid[0] - nx * wid, mid[1] - ny * wid)} ${pt(x, y)}`);
      veins.push(`M${pt(x, y)}L${pt(mid[0] + (tip[0] - mid[0]) * 0.7, mid[1] + (tip[1] - mid[1]) * 0.7)}`);
    }
  }
  const [ex, ey] = at(1);
  const branch = `<path d="M${pt(P0[0], P0[1])}Q${pt(P1[0], P1[1])} ${pt(ex, ey)}"/><path d="${leaves.join('')}"/><path class="pe-eng__thin" d="${veins.join('')}"/>`;
  return `<g>${branch}</g><g transform="matrix(-1 0 0 1 200 0)">${branch}</g><path d="M86 178Q100 170 114 178M92 186L100 176L108 186"/>`;
}

const ENGRAVINGS: Record<string, string> = { sun: sun(), moon: moon(), waves: waves(), compass: compass(), laurel: laurel() };

// ---------- blocks ----------

export const masthead: CustomBlockDef = {
  name: 'prepress/paper-masthead',
  title: 'Paper masthead',
  description: 'A newspaper nameplate between double rules, with a dateline, place and issue number above and a motto below. The page’s main heading.',
  icon: 'admin-site',
  category: 'text',
  attributes: {
    name: { type: 'string', label: 'Nameplate', control: 'text', default: 'The Margin' },
    dateline: { type: 'string', label: 'Date line', control: 'text', default: 'Thursday, 15 October 2026' },
    place: { type: 'string', label: 'Place', control: 'text', default: 'Written in Trieste' },
    issue: { type: 'string', label: 'Issue', control: 'text', default: 'No. 142' },
    motto: { type: 'string', label: 'Motto', control: 'text', default: 'A weekly letter on design, slow software and the craft of making things.' },
  },
  template: `<div class="pe-mast"><p class="pe-mast__meta"><span>{{dateline}}</span><span class="pe-mast__place">{{place}}</span><span>{{issue}}</span></p><h1 class="pe-mast__name">{{name}}</h1>{{#motto}}<p class="pe-mast__motto">{{motto}}</p>{{/motto}}</div>`,
  css: `
.wp-block-prepress-paper-masthead{margin-block-end:0}
.pe-mast{border-block:6px double currentColor;text-align:center}
.pe-mast__meta{display:flex;justify-content:space-between;gap:1rem;margin:0;padding:.75em 0;border-bottom:1px solid currentColor;font-family:${MONO};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase}
.pe-mast__name{margin:0;padding:.08em 0 .02em;font-family:${HEADING};font-weight:500;font-size:var(--wp--preset--font-size--nameplate,clamp(3.2rem,10vw,8.5rem));line-height:.92;letter-spacing:-.035em;font-optical-sizing:auto;text-wrap:balance}
.pe-mast__motto{margin:0;padding:.7em 0 .8em;border-top:1px solid currentColor;font-family:${BODY};font-style:italic;font-size:1.05rem}
@media (max-width:640px){.pe-mast__place{display:none}}
@media (prefers-reduced-motion:no-preference){.pe-mast__name{animation:pe-settle 1.4s ${EASE} both}}
@keyframes pe-settle{from{opacity:0;letter-spacing:.02em}}`,
};

export const lede: CustomBlockDef = {
  name: 'prepress/paper-lede',
  title: 'Paper lede',
  description: 'The opening paragraph of an essay: a three-line drop cap in the accent colour and a run-in set in small capitals.',
  icon: 'editor-paragraph',
  category: 'text',
  attributes: {
    runin: { type: 'string', label: 'Run-in (small caps)', control: 'text', default: 'Every program I love' },
    text: { type: 'string', label: 'Text', control: 'richtext', default: 'does one thing, slowly and well. It opens without a spinner, forgets nothing I told it, and has never once asked me to rate my experience.' },
  },
  template: `<p class="pe-lede">{{#runin}}<span class="pe-lede__runin">{{runin}}</span> {{/runin}}{{text}}</p>`,
  css: `
.pe-lede{margin:0;font-size:1.14em;line-height:1.55;text-wrap:pretty}
.pe-lede::first-letter{float:left;margin:.06em .1em 0 -.02em;font-family:${HEADING};font-weight:500;font-size:4.35em;line-height:.8;color:${C('accent')}}
@supports (initial-letter:3) or (-webkit-initial-letter:3){.pe-lede::first-letter{float:none;margin:0 .12em 0 0;font-size:inherit;line-height:inherit;-webkit-initial-letter:3;initial-letter:3}}
.pe-lede__runin{font-variant-caps:all-small-caps;letter-spacing:.07em;font-weight:500}`,
};

export const pullquote: CustomBlockDef = {
  name: 'prepress/paper-pullquote',
  title: 'Paper pull quote',
  description: 'A line lifted from the text, set large in italic display type: between rules, centred under a fleuron, or hanging from an accent rule.',
  icon: 'format-quote',
  category: 'text',
  attributes: {
    quote: { type: 'string', label: 'Quote', control: 'richtext', default: 'Software should be a place you visit, not a place that visits you.' },
    cite: { type: 'string', label: 'Attribution', control: 'text', default: '' },
    look: { type: 'string', label: 'Look', control: 'select', options: ['rule', 'centred', 'hanging'], default: 'rule' },
  },
  template: `<figure class="pe-pq" data-look="{{look}}"><blockquote class="pe-pq__q"><p>{{quote}}</p></blockquote>{{#cite}}<figcaption class="pe-pq__cite">{{cite}}</figcaption>{{/cite}}</figure>`,
  css: `
.pe-pq{margin:0}
.pe-pq__q{margin:0;padding:0;border:0}
.pe-pq__q p{margin:0;font-family:${HEADING};font-style:italic;font-weight:300;font-size:clamp(1.6rem,3.1vw,2.55rem);line-height:1.14;letter-spacing:-.012em;text-wrap:balance}
.pe-pq__cite{margin-top:1.1em;font-family:${MONO};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase}
.pe-pq__cite::before{content:"— "}
.pe-pq[data-look=rule]{padding:1.3em 0 1.4em;border-block:1px solid currentColor}
.pe-pq[data-look=rule] .pe-pq__q p::before{content:"“";margin-left:-.42em;color:${C('accent')}}
.pe-pq[data-look=centred]{text-align:center;padding-block:.4em}
.pe-pq[data-look=centred]::before{content:"❦";display:block;margin-bottom:.6em;font-size:1.5rem;color:${C('accent')}}
.pe-pq[data-look=hanging]{padding-left:1.4em;border-left:2px solid ${C('accent')}}
:where(.has-accent-background-color) .pe-pq[data-look] .pe-pq__q p::before,:where(.has-accent-background-color) .pe-pq[data-look]::before{color:inherit}
:where(.has-accent-background-color) .pe-pq[data-look=hanging]{border-left-color:currentColor}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.pe-pq__q p{animation:pe-rise linear both;animation-timeline:view();animation-range:entry 0% entry 70%}}}
@keyframes pe-rise{from{opacity:0;transform:translateY(.4em)}}`,
};

export const note: CustomBlockDef = {
  name: 'prepress/paper-note',
  title: 'Paper sidenote',
  description: 'A numbered note: put it right after the paragraph it belongs to (mark the spot there with a superscript number). On wide screens it hangs in the margin beside that paragraph; on phones it follows it inline.',
  icon: 'editor-ol',
  category: 'text',
  attributes: {
    number: { type: 'string', label: 'Number', control: 'text', default: '1' },
    text: { type: 'string', label: 'Note', control: 'richtext', default: 'The first version of the program fitted on a floppy disk. The current one ships its own browser.' },
    side: { type: 'string', label: 'Margin', control: 'select', options: ['right', 'left'], default: 'right' },
  },
  template: `<aside class="pe-note" data-side="{{side}}"><span class="pe-note__num">{{number}}</span><span class="pe-note__text">{{text}}</span></aside>`,
  css: `
.pe-note{display:flex;gap:.7em;padding:.85em 0 .9em;border-block:1px solid ${HAIR};font-size:.86rem;line-height:1.5}
.pe-note__num{flex:none;font-family:${MONO};font-size:.72rem;line-height:1.9;color:${C('accent')}}
.pe-note__text{font-style:italic}
@media (min-width:1180px){
.wp-block-prepress-paper-note{position:relative;height:0;margin-block:0!important}
.pe-note{position:absolute;bottom:0;left:calc(100% + 2.75rem);width:13.5rem;border-block:0;border-top:1px solid ${HAIR};padding:.6em 0 .2em}
.pe-note[data-side=left]{left:auto;right:calc(100% + 2.75rem)}}`,
};

export const byline: CustomBlockDef = {
  name: 'prepress/paper-byline',
  title: 'Paper byline',
  description: 'Author, role, date and reading time between hairlines, set in the mono face.',
  icon: 'admin-users',
  category: 'text',
  attributes: {
    author: { type: 'string', label: 'Author', control: 'text', default: 'Ana Novak' },
    role: { type: 'string', label: 'Role', control: 'text', default: 'Editor' },
    date: { type: 'string', label: 'Date', control: 'text', default: '15 October 2026' },
    read: { type: 'string', label: 'Reading time', control: 'text', default: '9 min read' },
  },
  template: `<p class="pe-by"><span>By <b>{{author}}</b>{{#role}}, {{role}}{{/role}}</span><span>{{date}}{{#read}} · {{read}}{{/read}}</span></p>`,
  css: `
.pe-by{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4em 1.5em;margin:0;padding:.8em 0;border-block:1px solid currentColor;font-family:${MONO};font-size:.72rem;letter-spacing:.12em;text-transform:uppercase}
.pe-by b{font-weight:600}`,
};

export const ornament: CustomBlockDef = {
  name: 'prepress/paper-ornament',
  title: 'Paper ornament',
  description: 'A section break: an asterism ⁂ or fleuron ❦ between short rules, a double rule or a dotted rule. The rules draw in as it scrolls into view.',
  icon: 'minus',
  category: 'design',
  attributes: {
    kind: { type: 'string', label: 'Ornament', control: 'select', options: ['asterism', 'fleuron', 'double', 'dots'], default: 'asterism' },
  },
  template: `<div class="pe-orn" data-kind="{{kind}}" role="separator"><span class="pe-orn__glyph" aria-hidden="true"></span></div>`,
  css: `
.pe-orn{display:flex;align-items:center;justify-content:center;gap:1.1em;min-height:1.5em}
.pe-orn::before,.pe-orn::after{content:"";flex:0 1 7rem;border-top:1px solid currentColor;transform-origin:var(--o,right)}
.pe-orn::after{--o:left}
.pe-orn__glyph{font-family:${HEADING};font-size:1.75rem;line-height:1;color:${C('accent')}}
.pe-orn[data-kind=asterism] .pe-orn__glyph::before{content:"⁂";font-size:1.15em}
.pe-orn[data-kind=fleuron] .pe-orn__glyph::before{content:"❦"}
.pe-orn[data-kind=double]::before,.pe-orn[data-kind=double]::after{flex:1 1 auto;border-top:4px double currentColor}
.pe-orn[data-kind=double]{gap:0}
.pe-orn[data-kind=dots]::before,.pe-orn[data-kind=dots]::after{flex:1 1 auto;border-top:2px dotted currentColor}
.pe-orn[data-kind=dots] .pe-orn__glyph::before{content:"◆";font-size:.55rem}
:where(.has-accent-background-color) .pe-orn__glyph{color:inherit}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.pe-orn::before,.pe-orn::after{animation:pe-draw linear both;animation-timeline:view();animation-range:entry 10% cover 35%}}}
@keyframes pe-draw{from{transform:scaleX(0)}}`,
};

export const indexRow: CustomBlockDef = {
  name: 'prepress/paper-index-row',
  title: 'Paper index row',
  description: 'One entry of an archive or table of contents: number, kicker, title and date joined by a dot leader. On hover the title turns italic and takes the accent colour.',
  icon: 'list-view',
  category: 'text',
  attributes: {
    number: { type: 'string', label: 'Number', control: 'text', default: '142' },
    kicker: { type: 'string', label: 'Kicker', control: 'text', default: 'Essay' },
    title: { type: 'string', label: 'Title', control: 'text', default: 'On slow software' },
    date: { type: 'string', label: 'Date', control: 'text', default: '15 Oct' },
    url: { type: 'string', label: 'Link', control: 'url', default: '' },
  },
  template: `{{#url}}<a class="pe-row" href="{{url}}">{{/url}}{{^url}}<div class="pe-row">{{/url}}<span class="pe-row__num">{{number}}</span><span class="pe-row__body">{{#kicker}}<span class="pe-row__kicker">{{kicker}}</span>{{/kicker}}<span class="pe-row__line"><span class="pe-row__title">{{title}}</span><span class="pe-row__leader" aria-hidden="true"></span><span class="pe-row__date">{{date}}</span></span></span>{{#url}}</a>{{/url}}{{^url}}</div>{{/url}}`,
  css: `
.wp-block-prepress-paper-index-row{margin-block:0!important}
.pe-row{display:grid;grid-template-columns:3.4rem 1fr;align-items:baseline;padding:.95em 0 1em;border-top:1px solid ${HAIR};color:inherit;text-decoration:none}
.wp-block-prepress-paper-index-row:last-child .pe-row{border-bottom:1px solid ${HAIR}}
.pe-row__num{font-family:${MONO};font-size:.75rem;letter-spacing:.06em;color:${C('accent')}}
.pe-row__kicker{display:block;margin-bottom:.3em;font-family:${MONO};font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
.pe-row__line{display:flex;align-items:baseline;gap:.6em}
.pe-row__title{font-family:${HEADING};font-weight:400;font-size:clamp(1.3rem,2.3vw,1.85rem);line-height:1.15;letter-spacing:-.01em;text-wrap:balance;transition:color .3s}
.pe-row__leader{flex:1 1 2rem;min-width:1.5rem;border-bottom:2px dotted currentColor;opacity:.35;transform:translateY(-.28em);transition:opacity .3s}
.pe-row__date{flex:none;font-family:${MONO};font-size:.75rem;letter-spacing:.06em;white-space:nowrap}
a.pe-row:hover .pe-row__title,a.pe-row:focus-visible .pe-row__title{font-style:italic;color:${C('accent')}}
a.pe-row:hover .pe-row__leader,a.pe-row:focus-visible .pe-row__leader{opacity:.9}
:where(.has-accent-background-color,.has-contrast-background-color) .pe-row__num,:where(.has-accent-background-color,.has-contrast-background-color) a.pe-row:hover .pe-row__title{color:inherit}
@media (max-width:560px){.pe-row{grid-template-columns:2.4rem 1fr}}`,
};

export const engraving: CustomBlockDef = {
  name: 'prepress/paper-engraving',
  title: 'Paper engraving',
  description: 'Line-art in the manner of an old engraving — sun, moon, waves, compass rose or laurel — hatched in the text colour. Stands in for a photo; moves very slowly.',
  icon: 'art',
  category: 'media',
  attributes: {
    motif: { type: 'string', label: 'Motif', control: 'select', options: ['sun', 'moon', 'waves', 'compass', 'laurel'], default: 'sun' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
    position: { type: 'string', label: 'Position', control: 'select', options: ['center', 'left'], default: 'center' },
    caption: { type: 'string', label: 'Caption', control: 'text', default: '' },
  },
  template: `<figure class="pe-eng" data-motif="{{motif}}" data-size="{{size}}" data-position="{{position}}"{{^caption}} aria-hidden="true"{{/caption}}>${Object.entries(ENGRAVINGS)
    .map(([k, svg]) => `<svg class="pe-eng__${k}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">${svg}</svg>`)
    .join('')}{{#caption}}<figcaption>{{caption}}</figcaption>{{/caption}}</figure>`,
  css: `
.pe-eng{margin:0 auto;width:min(100%,var(--s,12rem));text-align:center}
.pe-eng[data-size=s]{--s:6rem}.pe-eng[data-size=l]{--s:19rem}
.pe-eng[data-position=left]{margin-left:0;text-align:left}
.pe-eng svg{display:none;width:100%;height:auto;overflow:hidden;fill:none;stroke:currentColor;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}
.pe-eng[data-motif=sun] .pe-eng__sun,.pe-eng[data-motif=moon] .pe-eng__moon,.pe-eng[data-motif=waves] .pe-eng__waves,.pe-eng[data-motif=compass] .pe-eng__compass,.pe-eng[data-motif=laurel] .pe-eng__laurel{display:block}
.pe-eng .f{fill:currentColor;stroke:none}
.pe-eng .pe-eng__paper{fill:${C('base')}}
:where(.has-contrast-background-color,.has-accent-background-color,.has-primary-background-color) .pe-eng .pe-eng__paper{fill:none}
.pe-eng .pe-eng__thin{stroke-width:.6}
.pe-eng figcaption{margin-top:.8em;font-family:${MONO};font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
@media (prefers-reduced-motion:no-preference){
.pe-eng__rays,.pe-eng__needle{transform-box:view-box;transform-origin:100px 100px}
.pe-eng__rays{animation:pe-turn 140s linear infinite}
.pe-eng__needle{animation:pe-sway 9s ease-in-out infinite alternate}
.pe-eng__sea{animation:pe-drift 14s ease-in-out infinite alternate}}
@keyframes pe-turn{to{transform:rotate(360deg)}}
@keyframes pe-sway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
@keyframes pe-drift{to{transform:translateX(-24px)}}`,
};

export const BLOCKS: CustomBlockDef[] = [masthead, lede, pullquote, note, byline, ornament, indexRow, engraving];
