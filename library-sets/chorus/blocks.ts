/**
 * Chorus — blocks for a mobile-app landing page where the product performs:
 * every block is a working fragment of the app (marked data-ui), not a
 * picture of one. All interaction is CSS state (radio buttons, checkboxes,
 * :has), so it works in a static site and in WordPress with no script:
 *
 *   chorus-hero    split headline around a live frame: pick a recording, the
 *                  spectrogram draws itself and the bird is named
 *   chorus-row     one life-list row in three states; the middle one is live
 *   chorus-stages  four stops (listen, see, name, keep) driving clause + screen
 *   chorus-notes   a pinned field-note card that the controls beside it change
 *   chorus-plans   plan names; the selected one's price fills the stage
 *
 * Interface conventions (1px control borders, small radii) apply only inside
 * [data-ui]. Colours come from the palette presets; CSS is namespaced `.ch-*`.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const MIX = (a: string, pct: number, b = 'transparent') => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
const FONT = 'var(--wp--preset--font-family--body)';
const EASE = 'cubic-bezier(.2,.7,.2,1)';
const R = (size: 'sm' | 'md' | 'lg') => `var(--wp--custom--radius--${size})`;
const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/chorus';

// ---------- spectrograms (generated at authoring time: time → x, pitch → y) ----------

const n = (v: number) => (Math.round(v * 10) / 10).toString();
function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
type Song = 'blackbird' | 'robin' | 'great-tit' | 'chiffchaff';
const SONGS: Record<Song, () => string> = {
  // Fluty low phrases, each ending in a thin high squeak.
  blackbird: () => {
    const d: string[] = [];
    for (const x0 of [16, 112, 206]) {
      for (let i = 0; i < 5; i++) {
        const x = x0 + i * 11, y = 74 + Math.sin(i * 1.7 + x0) * 6;
        d.push(`M${n(x)} ${n(y + 4)}Q${n(x + 4)} ${n(y - 8)} ${n(x + 8)} ${n(y + 2)}`);
      }
      d.push(`M${n(x0 + 60)} 30L${n(x0 + 66)} 22M${n(x0 + 70)} 34L${n(x0 + 76)} 26`);
    }
    return d.join('');
  },
  // A thin, high, tumbling cascade of short notes.
  robin: () => {
    const r = rand(7);
    const d: string[] = [];
    for (let i = 0; i < 30; i++) {
      const x = 12 + i * 9.2 + r() * 4, y = 18 + r() * 58, len = 3 + r() * 5, slope = (r() - 0.5) * 14;
      d.push(`M${n(x)} ${n(y)}L${n(x + len)} ${n(y + slope)}`);
    }
    return d.join('');
  },
  // Tea-cher, tea-cher: a high flat note then a falling one, repeated.
  'great-tit': () => {
    const d: string[] = [];
    for (let i = 0; i < 5; i++) {
      const x = 18 + i * 56;
      d.push(`M${x} 34L${x + 13} 33M${x + 20} 46L${x + 31} 62`);
    }
    return d.join('');
  },
  // Chiff, chaff: even, alternating notes on two pitches.
  chiffchaff: () => {
    const d: string[] = [];
    for (let i = 0; i < 12; i++) {
      const x = 16 + i * 23.5, y = i % 2 ? 44 : 32;
      d.push(`M${n(x)} ${y - 13}L${n(x + 4)} ${y + 13}`);
    }
    return d.join('');
  },
};

/** A spectrogram fragment: kHz grid, the song (with a faint harmonic) and a sweeping playhead. */
const spectrogram = (song: Song, cls = '') =>
  `<svg class="ch-spec ${cls}" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g class="ch-spec__grid"><path d="M0 20H300M0 40H300M0 60H300M0 80H300"/></g><g class="ch-spec__song"><path class="ch-spec__harm" transform="translate(0 -14)" d="${SONGS[song]()}"/><path d="${SONGS[song]()}"/></g><path class="ch-spec__head" d="M0 0V100"/></svg>`;

/** Interface CSS shared by every fragment (each block carries it: block CSS loads per block). */
const UI = `
[data-ui].ch-ui{--ui-bg:${C('contrast')};--ui-ink:${C('base')};--ui-soft:${MIX(C('base'), 62, C('contrast'))};--ui-line:${MIX(C('base'), 14, C('contrast'))};--ui-hi:${MIX(C('primary'), 70, 'white')};box-sizing:border-box;font-family:${FONT};font-size:.875rem;line-height:1.35;color:var(--ui-ink);background:var(--ui-bg);border-radius:${R('lg')};overflow:hidden;text-align:left}
.ch-ui *{box-sizing:border-box}
.ch-ui p{margin:0}
.ch-spec{display:block;width:100%;height:100%}
.ch-spec__grid path{stroke:var(--ui-line);stroke-width:1;vector-effect:non-scaling-stroke}
.ch-spec__song path{fill:none;stroke:var(--ui-hi);stroke-width:3.2;stroke-linecap:round;vector-effect:non-scaling-stroke}
.ch-spec__song .ch-spec__harm{stroke-width:2;opacity:.28}
.ch-spec__head{stroke:${C('base')};stroke-width:1.5;vector-effect:non-scaling-stroke;opacity:0}
.ch-plate{display:block;object-fit:cover;border-radius:${R('md')};background:${MIX(C('base'), 85, C('contrast'))}}
.ch-name{font-weight:600;font-size:1rem}
.ch-latin{font-style:italic;color:var(--ui-soft)}
.ch-pill{display:inline-flex;align-items:center;gap:.35em;padding:.3em .7em;border-radius:999px;background:var(--ui-line);color:var(--ui-ink);font-size:.8125rem;white-space:nowrap}
.ch-pill--hi{background:${C('primary')};color:${C('base')}}
@media (prefers-reduced-motion:no-preference){
.ch-draw .ch-spec__song{animation:ch-draw 2.6s linear both}
.ch-draw .ch-spec__head{animation:ch-head 2.6s linear both}}
@keyframes ch-draw{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes ch-head{0%{opacity:1;transform:translateX(0)}96%{opacity:1}100%{opacity:0;transform:translateX(300px)}}`;

// ---------- hero ----------

const REC = (i: number, label: string, song: Song, name: string, latin: string, pct: string, img: string) => ({
  [`rec${i}`]: { type: 'string', label: `Recording ${i}`, control: 'text', default: label },
  [`bird${i}`]: { type: 'string', label: `Recording ${i}: bird`, control: 'text', default: name },
  [`latin${i}`]: { type: 'string', label: `Recording ${i}: Latin name`, control: 'text', default: latin },
  [`pct${i}`]: { type: 'string', label: `Recording ${i}: confidence`, control: 'text', default: pct },
  [`img${i}`]: { type: 'string', label: `Recording ${i}: picture`, control: 'image', default: `${PICS}/chorus-${img}.jpg` },
});
const RECS: [string, Song, string, string, string, string][] = [
  ['Garden, 05:12', 'blackbird', 'Blackbird', 'Turdus merula', '97%', 'blackbird'],
  ['Hedge, 06:40', 'robin', 'Robin', 'Erithacus rubecula', '94%', 'robin'],
  ['Park, 07:15', 'great-tit', 'Great tit', 'Parus major', '99%', 'great-tit'],
  ['Woods, 08:02', 'chiffchaff', 'Chiffchaff', 'Phylloscopus collybita', '92%', 'chiffchaff'],
];

export const hero: CustomBlockDef = {
  name: 'prepress/chorus-hero',
  kind: 'interactive',
  title: 'Chorus hero',
  description: 'A headline split in two around a live frame of the app: pick one of four recordings and its spectrogram draws itself while the singer is named, with a picture and the confidence. Works without scripts.',
  icon: 'format-audio',
  category: 'design',
  attributes: {
    first: { type: 'string', label: 'Headline, first half', control: 'text', default: 'Hear a bird.' },
    second: { type: 'string', label: 'Headline, second half', control: 'text', default: 'Know its name.' },
    support: { type: 'string', label: 'Supporting sentence', control: 'text', default: 'Chorus listens for ten seconds, draws the song and names the singer — even where there is no signal.' },
    group: { type: 'string', label: 'Unique name (if used twice on a page)', control: 'text', default: 'chorus' },
    ...Object.assign({}, ...RECS.map((r, i) => REC(i + 1, r[0], r[1], r[2], r[3], r[4], r[5]))),
  },
  template: `<div class="ch-hero"><h1 class="ch-hero__h"><span class="ch-hero__a">{{first}}</span> <span class="ch-hero__b">{{second}}</span></h1>
<div class="ch-reel"><div class="ch-reel__sliver ch-reel__sliver--top" aria-hidden="true"><div class="ch-ui ch-sliver" data-ui><span class="ch-pill">Life list · 34 species</span><span class="ch-pill">This morning · 6</span></div></div>
<div class="ch-ui ch-frame" data-ui><div class="ch-frame__bar"><span class="ch-frame__live">Listening</span><span class="ch-frame__time">0:10</span></div>
<div class="ch-frame__chips" role="radiogroup" aria-label="Pick a recording">${RECS.map((_, i) => `<label class="ch-chip"><input type="radio" class="ch-frame__in ch-frame__in--${i + 1}" name="{{group}}"${i === 0 ? ' checked' : ''}>{{rec${i + 1}}}</label>`).join('')}</div>
${RECS.map((r, i) => `<div class="ch-frame__view ch-frame__view--${i + 1}"><div class="ch-frame__spec ch-draw">${spectrogram(r[1])}</div><div class="ch-match"><img class="ch-plate" src="{{img${i + 1}}}" alt="" width="64" height="64"><p><span class="ch-name">{{bird${i + 1}}}</span><br><span class="ch-latin">{{latin${i + 1}}}</span></p><span class="ch-pill ch-pill--hi">{{pct${i + 1}}}</span></div></div>`).join('')}
</div>
<div class="ch-reel__sliver ch-reel__sliver--bottom" aria-hidden="true"><div class="ch-ui ch-sliver" data-ui><span class="ch-pill">Field note saved offline</span><span class="ch-pill">Ljubljana · 46.05° N</span></div></div></div>
<p class="ch-hero__support">{{support}}</p></div>`,
  css: `${UI}
.ch-hero{display:grid;grid-template-columns:1fr minmax(0,35vw) 1fr;grid-template-rows:1fr auto;align-items:center;min-height:min(calc(100svh - 6rem),56rem);gap:1.5rem 1.5rem}
.ch-hero__h{display:contents;margin:0}
.ch-hero__a,.ch-hero__b{grid-row:1;font-family:${FONT};font-weight:600;font-size:clamp(2.5rem,1.3rem + 3.2vw,4rem);line-height:.92;letter-spacing:-.04em;color:${C('contrast')}}
.ch-hero__a{grid-column:1;justify-self:start}
.ch-hero__b{grid-column:3;justify-self:end;text-align:right}
.ch-reel{grid-column:2;grid-row:1;display:flex;flex-direction:column;gap:1.5rem;align-self:stretch;justify-content:center;overflow:hidden;margin-block:-1rem}
.ch-reel__sliver{height:3.75rem;overflow:hidden;flex:none;display:flex}
.ch-reel__sliver--top{align-items:flex-end}.ch-reel__sliver--bottom{align-items:flex-start}
.ch-sliver{width:100%;height:9rem;padding:1rem;display:flex;flex-wrap:wrap;gap:.5rem;align-content:flex-end}
.ch-reel__sliver--bottom .ch-sliver{align-content:flex-start}
.ch-frame{position:relative;width:100%;aspect-ratio:16/10;padding:1rem;display:flex;flex-direction:column;gap:.75rem;flex:none}
.ch-frame__bar{display:flex;justify-content:space-between;align-items:center;color:var(--ui-soft)}
.ch-frame__live::before{content:"";display:inline-block;width:.55rem;height:.55rem;margin-right:.45rem;border-radius:50%;background:${C('primary')};vertical-align:.05em}
.ch-frame__in{position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}
.ch-frame__chips{display:flex;flex-wrap:wrap;gap:.375rem;order:3}
.ch-chip{position:relative;padding:.4em .75em;border-radius:999px;border:1px solid var(--ui-line);color:var(--ui-soft);cursor:pointer;transition:background-color .2s,color .2s} /* taste-skill-ignore: control border inside data-ui */
.ch-chip:hover{color:var(--ui-ink);border-color:var(--ui-soft)}
.ch-frame__view{display:none;flex:1;min-height:0;flex-direction:column;gap:.75rem}
.ch-frame__spec{flex:1;min-height:3rem;border-radius:${R('md')};background:${MIX(C('contrast'), 80, 'black')};padding:.25rem 0}
.ch-match{display:flex;align-items:center;gap:.75rem}
.ch-match p{flex:1}
.ch-match .ch-plate{width:3.25rem;height:3.25rem}
${RECS.map((_, i) => `.ch-frame:has(.ch-frame__in--${i + 1}:checked) .ch-frame__view--${i + 1}{display:flex}`).join('\n')}
.ch-chip:has(:checked){background:${C('base')};color:${C('contrast')};border-color:${C('base')}}
.ch-chip:has(:focus-visible){outline:2px solid ${C('primary')};outline-offset:3px}
@media (prefers-reduced-motion:no-preference){.ch-match{animation:ch-pop .4s ${EASE} 2.4s both}.ch-frame__live::before{animation:ch-pulse 1.2s ease-in-out infinite}}
@keyframes ch-pop{from{opacity:0;transform:translateY(.5rem)}}
@keyframes ch-pulse{50%{opacity:.25}}
.ch-hero__support{grid-column:1;grid-row:2;align-self:end;max-width:26rem;margin:0 0 2rem;font-family:${FONT};font-size:1.125rem;line-height:1.5;color:${C('contrast')}}
@media (max-width:860px){.ch-hero{grid-template-columns:1fr;grid-template-rows:auto;min-height:0;gap:1rem}
.ch-hero__h{display:block}.ch-hero__a,.ch-hero__b{display:block;grid-row:auto;font-size:9vw}.ch-hero__b{text-align:right}
.ch-reel{grid-column:1;grid-row:auto;order:0;margin:0}.ch-hero__h{order:-1}
.ch-reel__sliver{height:1.75rem}.ch-frame{aspect-ratio:auto;min-height:20rem}
.ch-hero__support{grid-column:1;grid-row:auto;font-size:1rem;margin:0}}`,
};

// ---------- showcase: one row, three states ----------

export const row: CustomBlockDef = {
  name: 'prepress/chorus-row',
  kind: 'interactive',
  title: 'Chorus life-list row',
  description: 'One sighting row of the app shown three times — heard, checked (actions showing) and kept — with the state named beside each. The middle row is live: tick it and it becomes kept.',
  icon: 'list-view',
  category: 'widgets',
  attributes: {
    bird: { type: 'string', label: 'Bird', control: 'text', default: 'Blackbird' },
    latin: { type: 'string', label: 'Latin name', control: 'text', default: 'Turdus merula' },
    when: { type: 'string', label: 'When and where', control: 'text', default: '05:12 · Garden, Trnovo' },
    image: { type: 'string', label: 'Picture', control: 'image', default: `${PICS}/chorus-blackbird.jpg` },
    count: { type: 'string', label: 'Life-list number', control: 'text', default: '35' },
    group: { type: 'string', label: 'Unique name', control: 'text', default: 'keep' },
  },
  template: `<div class="ch-rows">
<p class="ch-rows__state">Heard</p><div class="ch-ui ch-row" data-ui><div class="ch-row__spec">${spectrogram('blackbird')}</div><p class="ch-row__txt"><span class="ch-name">Identifying…</span><br><span class="ch-latin">{{when}}</span></p><span class="ch-pill">0:10</span></div>
<p class="ch-rows__state">Checked</p><div class="ch-ui ch-row ch-row--live" data-ui><img class="ch-plate" src="{{image}}" alt="" width="56" height="56"><p class="ch-row__txt"><span class="ch-name">{{bird}}</span><br><span class="ch-latin">{{latin}} · {{when}}</span></p><label class="ch-row__act"><input type="checkbox" class="ch-row__in"><span class="ch-row__add">Add to life list</span><span class="ch-row__done">Kept · number {{count}}</span></label></div>
<p class="ch-rows__state">Kept</p><div class="ch-ui ch-row" data-ui><img class="ch-plate" src="{{image}}" alt="" width="56" height="56"><p class="ch-row__txt"><span class="ch-name">{{bird}}</span><br><span class="ch-latin">{{latin}} · {{when}}</span></p><span class="ch-pill ch-pill--hi">Number {{count}}</span></div>
</div>`,
  css: `${UI}
.ch-rows{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,40rem) minmax(0,1fr);gap:3.5rem 2rem;align-items:center}
.ch-rows__state{grid-column:1;margin:0;text-align:right;font-family:${FONT};font-size:1.625rem;color:${C('accent')}}
.ch-row{grid-column:2;display:flex;align-items:center;gap:.9rem;padding:.75rem .9rem;min-height:4.5rem}
.ch-row .ch-plate{width:3.5rem;height:3.5rem;flex:none}
.ch-row__spec{width:3.5rem;height:3.5rem;flex:none;border-radius:${R('md')};background:${MIX(C('contrast'), 80, 'black')};overflow:hidden}
.ch-row__txt{flex:1;min-width:0}
.ch-row__in{position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}
.ch-row__act{position:relative;flex:none;padding:.55em 1em;border-radius:999px;background:${C('primary')};color:${C('base')};cursor:pointer;transition:background-color .2s,transform .15s}
.ch-row__act:hover{background:${MIX(C('primary'), 85, 'white')}}
.ch-row__act:active{transform:scale(.97)}
.ch-row__done{display:none}
.ch-row__act:has(:checked){background:${C('base')};color:${C('contrast')}}
.ch-row__act:has(:checked) .ch-row__add{display:none}
.ch-row__act:has(:checked) .ch-row__done{display:inline}
.ch-row__act:has(:focus-visible){outline:2px solid ${C('primary')};outline-offset:3px}
.ch-row--live{outline:2px solid ${MIX(C('primary'), 60, C('contrast'))}}
@media (max-width:900px){.ch-rows{grid-template-columns:1fr;gap:.6rem}.ch-rows__state{grid-column:1;text-align:left;font-size:1.125rem}.ch-row{grid-column:1}
.ch-rows__state{margin-bottom:2rem}.ch-rows>:nth-child(1){order:2}.ch-rows>:nth-child(2){order:1}.ch-rows>:nth-child(3){order:4}.ch-rows>:nth-child(4){order:3}.ch-rows>:nth-child(5){order:6}.ch-rows>:nth-child(6){order:5}}`,
};

// ---------- how it works: four stops ----------

const STAGE = (i: number, word: string, clause: string) => ({
  [`stop${i}`]: { type: 'string', label: `Stop ${i}`, control: 'text', default: word },
  [`clause${i}`]: { type: 'string', label: `Stop ${i} sentence`, control: 'text', default: clause },
});

export const stages: CustomBlockDef = {
  name: 'prepress/chorus-stages',
  kind: 'interactive',
  title: 'Chorus stages',
  description: 'How it works in four stops: a track with four stops along the bottom drives a large clause on the left and the matching state of the app on the right. Works with mouse, touch and arrow keys; no script.',
  icon: 'controls-forward',
  category: 'widgets',
  attributes: {
    group: { type: 'string', label: 'Unique name', control: 'text', default: 'stage' },
    ...STAGE(1, 'Listen', 'First, it listens for ten seconds'),
    ...STAGE(2, 'See', 'Then it draws what it heard'),
    ...STAGE(3, 'Name', 'Then it names the singer'),
    ...STAGE(4, 'Keep', 'Last, it keeps the morning'),
    bird: { type: 'string', label: 'Bird', control: 'text', default: 'Great tit' },
    latin: { type: 'string', label: 'Latin name', control: 'text', default: 'Parus major' },
    image: { type: 'string', label: 'Picture', control: 'image', default: `${PICS}/chorus-great-tit.jpg` },
  },
  template: `<div class="ch-stages">
<div class="ch-stages__left">${[1, 2, 3, 4].map((i) => `<h2 class="ch-stages__clause ch-stages__clause--${i}">{{clause${i}}}</h2>`).join('')}</div>
<div class="ch-stages__right"><div class="ch-ui ch-phone" data-ui>
<div class="ch-st ch-st--1"><p class="ch-st__top"><span class="ch-frame__live">Listening</span><span>0:07</span></p><div class="ch-st__wave">${Array.from({ length: 28 }, (_, k) => `<i style="--h:${n(20 + Math.abs(Math.sin(k * 1.3)) * 70)}%"></i>`).join('')}</div><p class="ch-latin">Hold still. Point the phone at the sound.</p></div>
<div class="ch-st ch-st--2"><p class="ch-st__top"><span>Spectrogram</span><span>8 kHz</span></p><div class="ch-st__spec ch-draw">${spectrogram('great-tit')}</div><p class="ch-latin">Pitch upwards, time across. Each species draws its own shape.</p></div>
<div class="ch-st ch-st--3"><img class="ch-plate ch-st__plate" src="{{image}}" alt="" width="240" height="240"><p><span class="ch-name">{{bird}}</span><br><span class="ch-latin">{{latin}}</span></p><span class="ch-pill ch-pill--hi">99% sure</span></div>
<div class="ch-st ch-st--4"><p class="ch-st__top"><span>This morning</span><span>6 birds</span></p><ul class="ch-st__list"><li><b>Great tit</b><span>07:15</span></li><li><b>Robin</b><span>06:40</span></li><li><b>Blackbird</b><span>05:12</span></li><li><b>Wren</b><span>05:03</span></li></ul></div>
</div></div>
<div class="ch-stages__track" role="radiogroup" aria-label="Stages">${[1, 2, 3, 4].map((i) => `<label class="ch-stop ch-stop--${i}"><input type="radio" class="ch-stages__in ch-stages__in--${i}" name="{{group}}"${i === 1 ? ' checked' : ''}>{{stop${i}}}</label>`).join('')}</div></div>`,
  css: `${UI}
.wp-block-prepress-chorus-stages{max-width:100%;overflow:clip}
.ch-stages{position:relative;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr auto;min-height:min(88svh,52rem)}
.ch-stages__in{position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}
.ch-stages__left{grid-column:1;grid-row:1/3;background:${C('secondary')};padding:clamp(1.5rem,4vw,3rem) clamp(1.25rem,3vw,2.5rem) 9rem}
.ch-stages__right{grid-column:2;grid-row:1/3;background:${C('muted')};display:grid;place-items:center;padding:2rem 1.5rem 9rem}
.ch-stages__clause{display:none;margin:0;max-width:12ch;font-family:${FONT};font-weight:600;font-size:clamp(2.5rem,1.3rem + 3.2vw,4rem);line-height:.92;letter-spacing:-.04em;color:${C('contrast')}}
.ch-phone{width:min(100%,27.5rem);min-height:21rem;padding:1.25rem;display:grid}
.ch-st{display:none;grid-area:1/1;flex-direction:column;gap:1rem}
.ch-st__top{display:flex;justify-content:space-between;color:var(--ui-soft)}
.ch-st__wave{display:flex;align-items:center;gap:3px;height:10rem}
.ch-st__wave i{flex:1;height:var(--h);border-radius:${R('sm')};background:var(--ui-hi);transform-origin:center}
.ch-st__spec{height:11rem;border-radius:${R('md')};background:${MIX(C('contrast'), 80, 'black')}}
.ch-st__plate{width:100%;height:12rem}
.ch-st--3{gap:.75rem}
.ch-st__list{list-style:none;margin:0;padding:0}
.ch-st__list li{display:flex;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid var(--ui-line)} /* taste-skill-ignore: list rule inside data-ui */
.ch-st__list b{font-weight:500}
.ch-stages__track{grid-column:1/3;grid-row:2;display:grid;grid-template-columns:repeat(4,1fr);margin:0 1.75rem 1.75rem;padding-top:2.75rem;position:relative}
.ch-stages__track::before{content:"";position:absolute;left:12.5%;right:12.5%;top:calc(1rem - 2px);height:4px;border-radius:${R('sm')};background:${MIX(C('contrast'), 16, 'transparent')}}
.ch-stages__track::after{content:"";position:absolute;left:12.5%;top:calc(1rem - 2px);height:4px;border-radius:${R('sm')};width:var(--done,0%);background:${C('primary')};transition:width .35s ${EASE}}
.ch-stop{position:relative;z-index:1;font-family:${FONT};font-size:1.125rem;color:${C('accent')};cursor:pointer;text-align:center}
.ch-stop::before{content:"";position:absolute;left:50%;top:-2.75rem;width:2rem;height:2rem;margin-left:-1rem;box-sizing:border-box;border-radius:50%;border:3px solid ${MIX(C('contrast'), 28, C('base'))};background:${C('base')};transition:background-color .2s,border-color .2s,box-shadow .2s,transform .2s ${EASE}} /* taste-skill-ignore: control ring */
.ch-stop:hover::before{transform:scale(1.1)}
.ch-stop:has(:checked){color:${C('contrast')};font-weight:500}
.ch-stop:has(:checked)::before{border-color:${C('primary')};background:${C('primary')};box-shadow:0 0 0 6px ${MIX(C('primary'), 22, 'transparent')}}
.ch-stop:has(:focus-visible)::before{outline:3px solid ${C('contrast')};outline-offset:5px}
${[1, 2, 3, 4]
  .map(
    (i) => `.ch-stages:has(.ch-stages__in--${i}:checked) .ch-stages__clause--${i}{display:block}
.ch-stages:has(.ch-stages__in--${i}:checked) .ch-st--${i}{display:flex}
.ch-stages:has(.ch-stages__in--${i}:checked) .ch-stages__track{--done:${(i - 1) * 25}%}
.ch-stages:has(.ch-stages__in--${i}:checked) .ch-stop:nth-child(-n+${i - 1})::before{border-color:${C('primary')};background:${C('base')}}`,
  )
  .join('\n')}
@media (prefers-reduced-motion:no-preference){.ch-stages__clause,.ch-st{animation:ch-fade .2s linear}.ch-st__wave i{animation:ch-bar .9s ease-in-out infinite alternate}${Array.from({ length: 7 }, (_, k) => `.ch-st__wave i:nth-child(7n+${k + 1}){animation-delay:-${n(k * 0.13)}s}`).join('')}}
@keyframes ch-fade{from{opacity:0}}
@keyframes ch-bar{to{transform:scaleY(.35)}}
@media (max-width:760px){.ch-stages{grid-template-columns:1fr;grid-template-rows:auto auto auto;min-height:0}
.ch-stages__right{grid-column:1;grid-row:1;padding:1.5rem 1rem;min-height:46svh}.ch-stages__track{grid-column:1;grid-row:3;margin:0 1rem;padding:3rem 0 2rem}
.ch-stages__left{grid-column:1;grid-row:2;padding:1.5rem 1rem 1rem}.ch-stages__clause{font-size:9vw}.ch-stop::before{width:2.5rem;height:2.5rem;margin-left:-1.25rem;top:-3rem}.ch-stages__track::before,.ch-stages__track::after{top:calc(1.25rem - 2px)}}`,
};

// ---------- features: a pinned field note the controls change ----------

const CAP = (i: number, title: string, text: string) => ({
  [`cap${i}`]: { type: 'string', label: `Capability ${i}`, control: 'text', default: title },
  [`text${i}`]: { type: 'string', label: `Capability ${i} text`, control: 'text', default: text },
});

export const notes: CustomBlockDef = {
  name: 'prepress/chorus-notes',
  kind: 'interactive',
  title: 'Chorus field note',
  description: 'Features as live controls: one field note the app makes stays pinned on the left while the reader works the controls on the right — language, Latin names, offline, night mode, postcard — and each one changes the note at once.',
  icon: 'admin-settings',
  category: 'widgets',
  attributes: {
    heading: { type: 'string', label: 'Heading', control: 'text', default: 'Your notes, your way' },
    group: { type: 'string', label: 'Unique name', control: 'text', default: 'note' },
    ...CAP(1, 'Names in your language.', 'Every bird in English, Slovenian or German — switch whenever you cross a border.'),
    ...CAP(2, 'Latin when you want it.', 'Scientific names under every common one, for the field guide and the arguments afterwards.'),
    ...CAP(3, 'Works where the signal doesn’t.', 'The whole European catalogue lives on the phone. Notes wait and sync when you are back in range.'),
    ...CAP(4, 'Easy on the eyes at five.', 'A night palette for the dark before dawn, so you don’t blind yourself or the birds.'),
    ...CAP(5, 'Send it as a postcard.', 'Turn any note into a card with the plate and the song, ready to share.'),
    image: { type: 'string', label: 'Picture', control: 'image', default: `${PICS}/chorus-robin.jpg` },
  },
  template: `<div class="ch-notes">
<div class="ch-notes__stage"><div class="ch-ui ch-note" data-ui><img class="ch-plate ch-note__plate" src="{{image}}" alt="" width="420" height="240"><div class="ch-note__spec">${spectrogram('robin')}</div>
<p class="ch-note__name"><span class="ch-note__en">Robin</span><span class="ch-note__sl">Taščica</span><span class="ch-note__de">Rotkehlchen</span></p><p class="ch-latin ch-note__latin">Erithacus rubecula</p>
<p class="ch-note__meta">Tuesday 6 May · 06:40 · Tivoli park, Ljubljana</p><p class="ch-note__sync"><span class="ch-note__offline">Saved on the phone · syncs later</span><span class="ch-note__online">Synced</span></p></div></div>
<div class="ch-notes__col"><h2 class="ch-notes__h">{{heading}}</h2>
<div class="ch-cap"><p class="ch-cap__t">{{cap1}}</p><p class="ch-cap__p">{{text1}}</p><p class="ch-seg" role="radiogroup" aria-label="Language"><label><input type="radio" class="ch-notes__lang--en" name="{{group}}-lang" checked>English</label><label><input type="radio" class="ch-notes__lang--sl" name="{{group}}-lang">Slovenščina</label><label><input type="radio" class="ch-notes__lang--de" name="{{group}}-lang">Deutsch</label></p></div>
<div class="ch-cap"><p class="ch-cap__t">{{cap2}}</p><p class="ch-cap__p">{{text2}}</p><label class="ch-tog"><input type="checkbox" class="ch-notes__latin" checked>Show Latin names</label></div>
<div class="ch-cap"><p class="ch-cap__t">{{cap3}}</p><p class="ch-cap__p">{{text3}}</p><label class="ch-tog"><input type="checkbox" class="ch-notes__off" checked>Offline mode</label></div>
<div class="ch-cap"><p class="ch-cap__t">{{cap4}}</p><p class="ch-cap__p">{{text4}}</p><label class="ch-tog"><input type="checkbox" class="ch-notes__night">Night palette</label></div>
<div class="ch-cap"><p class="ch-cap__t">{{cap5}}</p><p class="ch-cap__p">{{text5}}</p><label class="ch-tog"><input type="checkbox" class="ch-notes__card">Make a postcard</label></div>
</div></div>`,
  css: `${UI}
.wp-block-prepress-chorus-notes{overflow-x:clip}
.ch-notes{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(2rem,6vw,6rem)}
.ch-notes input{position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}
.ch-notes__stage{position:sticky;top:var(--pp-header-h, 0px);height:calc(100svh - var(--pp-header-h, 0px));display:grid;place-items:center;background:${C('muted')};margin-left:calc(var(--wp--preset--spacing--50) * -1)}
.ch-note{width:min(88%,26rem);padding:1rem;display:flex;flex-direction:column;gap:.6rem;transition:background-color .3s,color .3s}
.ch-note__plate{width:100%;height:12rem;object-position:50% 30%;transition:height .4s ${EASE}}
.ch-note__spec{height:4.5rem;border-radius:${R('md')};background:${MIX(C('contrast'), 80, 'black')};transition:height .4s ${EASE}}
.ch-note__name{font-size:1.5rem;font-weight:600;letter-spacing:-.02em}
.ch-note__sl,.ch-note__de,.ch-note__online{display:none}
.ch-note__meta,.ch-note__sync{color:var(--ui-soft)}
.ch-note__sync span::before{content:"";display:inline-block;width:.5rem;height:.5rem;margin-right:.4rem;border-radius:50%;background:${C('primary')}}
.ch-notes__col{padding:4.5rem 0 30vh}
.ch-notes__h{margin:0 0 3rem;font-family:${FONT};font-weight:600;font-size:clamp(2rem,1.3rem + 3.2vw,4rem);line-height:.92;letter-spacing:-.04em}
.ch-cap{min-height:50vh;max-width:44ch}
.ch-cap p{margin:0}
.ch-cap__t{font-family:${FONT};font-weight:500;font-size:2rem;line-height:1.15;letter-spacing:-.02em}
.ch-cap__p{margin-top:.6rem!important;font-family:${FONT};font-size:1.125rem;line-height:1.5}
.ch-seg{display:inline-flex;margin-top:1.1rem!important;padding:4px;background:${C('secondary')};border-radius:999px}
.ch-seg label{position:relative;padding:.5em 1em;border-radius:999px;font-family:${FONT};font-size:1.125rem;cursor:pointer;transition:background-color .2s}
.ch-tog{position:relative;display:inline-flex;align-items:center;min-height:1.75rem;margin-top:1.1rem;padding-left:3.85rem;font-family:${FONT};font-size:1.125rem;cursor:pointer}
.ch-tog::before{content:"";position:absolute;left:0;top:50%;width:3rem;height:1.75rem;margin-top:-.875rem;border-radius:999px;background:${MIX(C('contrast'), 18, C('secondary'))};transition:background-color .2s}
.ch-tog::after{content:"";position:absolute;left:.25rem;top:50%;width:1.25rem;height:1.25rem;margin-top:-.625rem;border-radius:50%;background:${C('base')};transition:transform .2s ${EASE}}
.ch-tog:hover::before{background:${MIX(C('contrast'), 30, C('secondary'))}}
.ch-tog:has(:checked)::before{background:${C('primary')}}
.ch-tog:has(:checked)::after{transform:translateX(1.25rem)}
.ch-tog:has(:focus-visible)::before{outline:2px solid ${C('contrast')};outline-offset:2px}
.ch-seg label:has(:checked){background:${C('contrast')};color:${C('base')}}
.ch-seg:has(:focus-visible){outline:2px solid ${C('contrast')};outline-offset:2px}
.ch-notes:has(.ch-notes__lang--sl:checked) .ch-note__en,.ch-notes:has(.ch-notes__lang--de:checked) .ch-note__en{display:none}
.ch-notes:has(.ch-notes__lang--sl:checked) .ch-note__sl,.ch-notes:has(.ch-notes__lang--de:checked) .ch-note__de{display:inline}
.ch-notes:has(.ch-notes__latin:not(:checked)) .ch-note__latin{display:none}
.ch-notes:has(.ch-notes__off:not(:checked)) .ch-note__offline{display:none}
.ch-notes:has(.ch-notes__off:not(:checked)) .ch-note__online{display:inline}
.ch-notes:has(.ch-notes__night:not(:checked)) .ch-note{--ui-bg:${C('base')};--ui-ink:${C('contrast')};--ui-soft:${C('accent')};--ui-line:${C('secondary')};--ui-hi:${C('primary')}}
.ch-notes:has(.ch-notes__night:not(:checked)) .ch-note__spec{background:${C('secondary')}}
.ch-notes:has(.ch-notes__card:checked) .ch-note__plate{height:17rem}
.ch-notes:has(.ch-notes__card:checked) .ch-note__spec{height:2.5rem}
@media (max-width:760px){.ch-notes{grid-template-columns:1fr}.ch-notes__stage{height:42svh;z-index:2;margin-left:calc(var(--wp--preset--spacing--50) * -1);margin-right:calc(var(--wp--preset--spacing--50) * -1);overflow:hidden;align-items:start;padding-top:1rem}
.ch-note{transform:scale(.82);transform-origin:top center}.ch-notes__col{padding:2rem 0 10vh}.ch-cap{min-height:0;margin-bottom:3rem}.ch-cap__t{font-size:1.375rem}}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){.ch-cap{animation:ch-enter linear both;animation-timeline:view();animation-range:entry 5% entry 55%}}}
@keyframes ch-enter{from{opacity:0;transform:translateY(1.5rem)}}`,
};

// ---------- pricing: plan names, one live figure ----------

const PLAN = (i: number, name: string, price: string, period: string, text: string) => ({
  [`plan${i}`]: { type: 'string', label: `Plan ${i}`, control: 'text', default: name },
  [`price${i}`]: { type: 'string', label: `Plan ${i} price`, control: 'text', default: price },
  [`period${i}`]: { type: 'string', label: `Plan ${i} period`, control: 'text', default: period },
  [`about${i}`]: { type: 'string', label: `Plan ${i} includes`, control: 'text', default: text },
});

export const plans: CustomBlockDef = {
  name: 'prepress/chorus-plans',
  kind: 'interactive',
  title: 'Chorus plans',
  description: 'Pricing as a list of plan names; the price, what it includes and a button for the selected plan fill one stage that never moves. The middle plan is selected first. No script.',
  icon: 'money-alt',
  category: 'widgets',
  attributes: {
    group: { type: 'string', label: 'Unique name', control: 'text', default: 'plan' },
    url: { type: 'string', label: 'Button link', control: 'url', default: '#get' },
    ...PLAN(1, 'Free', '€0', 'for ever', 'Five songs a day, the life list and every bird’s name in three languages. No account needed.'),
    ...PLAN(2, 'Field', '€2.99', 'a month', 'Unlimited songs, the whole catalogue offline, field notes with spectrograms and export to your records.'),
    ...PLAN(3, 'Family', '€4.99', 'a month', 'Everything in Field for up to five people, with one shared list for the household’s garden.'),
  },
  template: `<div class="ch-plans">
<div class="ch-plans__names" role="radiogroup" aria-label="Plans">${[1, 2, 3].map((i) => `<label class="ch-plans__name ch-plans__name--${i}"><input type="radio" class="ch-plans__in ch-plans__in--${i}" name="{{group}}"${i === 2 ? ' checked' : ''}>{{plan${i}}}</label>`).join('')}</div>
<div class="ch-plans__stage">${[1, 2, 3].map((i) => `<div class="ch-plans__plan ch-plans__plan--${i}"><p class="ch-plans__price">{{price${i}}} <span>{{period${i}}}</span></p><p class="ch-plans__about">{{about${i}}}</p><a class="ch-plans__btn" href="{{url}}">Start {{plan${i}}}</a></div>`).join('')}</div></div>`,
  css: `
.ch-plans{display:grid;grid-template-columns:1fr 1fr;gap:2rem clamp(2rem,6vw,6rem);align-items:start}
.ch-plans__in{position:absolute;left:0;top:0;width:1px;height:1px;margin:0;opacity:0;pointer-events:none}
.ch-plans__names{display:flex;flex-direction:column}
.ch-plans__name{position:relative;display:flex;align-items:center;gap:.25em;font-family:${FONT};font-weight:600;font-size:clamp(3rem,6vw,5.5rem);line-height:1.1;letter-spacing:-.04em;color:${C('accent')};cursor:pointer;transition:color .2s}
.ch-plans__name::before{content:"";width:.3em;height:.3em;border-radius:50%;background:currentColor;opacity:0;transition:opacity .2s}
.ch-plans__name:hover{color:${C('contrast')}}
.ch-plans__plan{display:none}
.ch-plans__plan p{margin:0}
.ch-plans__price{font-family:${FONT};font-weight:600;font-size:clamp(4rem,9vw,8rem);line-height:.9;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.ch-plans__price span{font-size:1.125rem;font-weight:400;letter-spacing:0}
.ch-plans__about{max-width:32rem;margin-top:1.5rem!important;font-family:${FONT};font-size:1.125rem;line-height:1.5}
.ch-plans .ch-plans__btn{display:inline-block;margin-top:2rem;padding:1em 1.6em;border-radius:${R('md')};background:${C('primary')};color:${C('base')};font-family:${FONT};font-weight:500;text-decoration:none;transition:background-color .2s,transform .15s}
.ch-plans__btn:hover{background:${C('contrast')}}
.ch-plans__btn:active{transform:translateY(1px)}
${[1, 2, 3].map((i) => `.ch-plans:has(.ch-plans__in--${i}:checked) .ch-plans__plan--${i}{display:block}`).join('\n')}
.ch-plans__name:has(:checked){color:${C('contrast')}}.ch-plans__name:has(:checked)::before{opacity:1}
.ch-plans__name:has(:focus-visible){outline:3px solid ${C('primary')};outline-offset:4px}
@media (prefers-reduced-motion:no-preference){.ch-plans__plan{animation:ch-fade .2s linear}}
@keyframes ch-fade{from{opacity:0}}
@media (max-width:760px){.ch-plans{grid-template-columns:1fr}.ch-plans__name{font-size:10vw}.ch-plans__price{font-size:20vw}.ch-plans__btn{display:block;text-align:center}}`,
};

export const BLOCKS: CustomBlockDef[] = [hero, row, stages, notes, plans];
