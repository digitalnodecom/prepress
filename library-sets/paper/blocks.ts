/**
 * Paper Edition — blocks. One custom block: engraved line-art (generated SVG,
 * no ids, so any number of them can share a page). Everything else in the set
 * — masthead, lede, pull quotes, sidenotes, bylines, ornaments, index rows — is
 * core blocks with the set's block styles (style.ts), so its text stays
 * editable inline (docs/THEME-SYSTEM.md).
 *
 * Custom-block CSS is global, so every rule is namespaced under
 * `.wp-block-prepress-paper-<slug>` / `.pe-*`. Colours and faces come only from
 * presets (heading, body, mono), so the block restyles with any Style.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const MONO = 'var(--wp--preset--font-family--mono, ui-monospace, Menlo, monospace)';

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

export const engraving: CustomBlockDef = {
  name: 'prepress/paper-engraving',
  title: 'Paper engraving',
  description: 'Line-art in the manner of an old engraving — sun, moon, waves, compass rose or laurel — hatched in the text colour. Stands in for a photo; moves very slowly.',
  icon: 'art',
  category: 'media',
  kind: 'art',
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

export const BLOCKS: CustomBlockDef[] = [engraving];
