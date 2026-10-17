/**
 * FX — a collection of standalone effect blocks: departure-board text, a
 * typewriter, a CRT terminal, a starfield, an aurora, frosted glass, a pattern
 * field, an orbit, a ring gauge, a count-up number and a mini bar chart.
 *
 * Written from scratch for Prepress: pure HTML + CSS (no scripts), colours
 * only from the palette presets (so every block restyles with the site), all
 * motion off under prefers-reduced-motion, scroll-driven parts behind
 * @supports. Custom-block CSS is global, so every rule is namespaced
 * `.wp-block-prepress-fx-*` / `.fx-*`.
 *
 * Kinds (docs/THEME-SYSTEM.md): the starfield, aurora and glass panels are
 * effects around inner core blocks; the rest are art, where the short text
 * settings (board lines, typed words, terminal output, numbers) are the artwork.
 */
import type { BlockNode, CustomBlockDef } from '../../src/lib/types';
import { button, buttons, h, p } from '../kit';

const R = (size: 'sm' | 'md' | 'lg') => `var(--wp--custom--radius--${size})`;
const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const MIX = (a: string, pct: number, b = 'transparent') => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
const HEADING = 'var(--wp--preset--font-family--heading)';
const BODY = 'var(--wp--preset--font-family--body)';
const MONO = 'var(--wp--preset--font-family--mono, ui-monospace, Menlo, monospace)';
/** Dark surfaces anchor to black (tinted by the brand), so they stay dark on light and dark palettes alike. */
const NIGHT = MIX(C('primary'), 9, 'black');
const DEEP = MIX(C('primary'), 5, 'black');
const MOTION = (css: string) => `@media (prefers-reduced-motion:no-preference){${css}}`;
const ON_VIEW = (sel: string, anim: string, range = 'entry 10% cover 40%') =>
  `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){${sel}{animation:${anim} both;animation-timeline:view();animation-range:${range}}}}`;

// ---------- type ----------

export const splitflap: CustomBlockDef = {
  name: 'prepress/fx-splitflap',
  kind: 'art',
  title: 'Split-flap board',
  description: 'A railway departure board: each letter on its own flap with a hinge line, flipping into place as it scrolls into view. Short uppercase lines work best.',
  icon: 'editor-textcolor',
  category: 'text',
  attributes: {
    line1: { type: 'string', label: 'Line 1', control: 'text', default: 'NOW BOARDING' },
    line2: { type: 'string', label: 'Line 2', control: 'text', default: 'GATE 7  21:40' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
  },
  template: `<div class="fx-flap" data-size="{{size}}" role="img" aria-label="{{line1}} {{line2}}"><span class="fx-flap__row" aria-hidden="true">{{line1}}</span>{{#line2}}<span class="fx-flap__row fx-flap__row--2" aria-hidden="true">{{line2}}</span>{{/line2}}</div>`,
  css: `
.fx-flap{--tile:${MIX('white', 17, DEEP)};--gap:.14em;display:flex;flex-direction:column;align-items:flex-start;gap:.22em;width:fit-content;max-width:100%;box-sizing:border-box;margin-inline:auto;padding:.5em;border-radius:${R('sm')};background:${DEEP};font-family:${MONO};font-weight:600;font-size:clamp(1.1rem,3.6vw,2.4rem);line-height:1.5;text-transform:uppercase;overflow:hidden}
.fx-flap[data-size=s]{font-size:clamp(.9rem,2.2vw,1.4rem)}.fx-flap[data-size=l]{font-size:clamp(1.4rem,5.4vw,3.6rem)}
.fx-flap__row{display:block;max-width:100%;white-space:pre;padding-left:.2em;letter-spacing:calc(.4em + var(--gap));color:${MIX('white', 92, C('accent'))};background:repeating-linear-gradient(90deg,${MIX('black', 80)} 0 1em,transparent 1em calc(1em + var(--gap))) 0 50%/100% 2px no-repeat,repeating-linear-gradient(90deg,var(--tile) 0 1em,transparent 1em calc(1em + var(--gap))),repeating-linear-gradient(90deg,${MIX('white', 7)} 0 1em,transparent 1em calc(1em + var(--gap))) 0 0/100% 50% no-repeat;transform-origin:50% 50%}
.fx-flap__row--2{color:${C('accent')}}
${ON_VIEW('.fx-flap__row', 'fx-flip 1s steps(5, end)', 'entry 20% cover 35%')}
${ON_VIEW('.fx-flap__row--2', 'fx-flip 1.3s steps(7, end)', 'entry 30% cover 42%')}
@keyframes fx-flip{0%{transform:scaleY(.08);filter:blur(1px)}60%{transform:scaleY(.6)}100%{transform:none}}`,
};

export const typewriter: CustomBlockDef = {
  name: 'prepress/fx-typewriter',
  kind: 'art',
  title: 'Typewriter headline',
  description: 'A headline whose last words type themselves out behind a blinking caret, hold, then erase and type again. Keep the typed part to one short line.',
  icon: 'editor-code',
  category: 'text',
  attributes: {
    prefix: { type: 'string', label: 'Fixed text', control: 'text', default: 'We build websites for' },
    text: { type: 'string', label: 'Typed text', control: 'text', default: 'bakers.' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['m', 'l', 'xl'], default: 'l' },
    loop: { type: 'boolean', label: 'Type again and again', control: 'toggle', default: true },
  },
  template: `<p class="fx-type" data-size="{{size}}"{{#loop}} data-loop="true"{{/loop}}>{{#prefix}}<span class="fx-type__pre">{{prefix}}</span> {{/prefix}}<span class="fx-type__txt">{{text}}</span><span class="fx-type__caret" aria-hidden="true"></span></p>`,
  css: `
.fx-type{margin:0;font-family:${HEADING};font-weight:600;font-size:clamp(1.8rem,4.5vw,3.4rem);line-height:1.1;letter-spacing:-.02em;text-wrap:balance}
.fx-type[data-size=m]{font-size:clamp(1.4rem,3vw,2.2rem)}.fx-type[data-size=xl]{font-size:clamp(2.4rem,7vw,5.5rem)}
.fx-type__txt{display:inline-block;white-space:nowrap;color:${C('primary')}}
.fx-type__caret{display:inline-block;width:.08em;height:.95em;margin-left:.06em;vertical-align:-.1em;background:currentColor}
${MOTION(`.fx-type__caret{animation:fx-blink 1s steps(1) infinite}
.fx-type__txt{animation:fx-typing 2.2s steps(14,end) .3s both}
.fx-type[data-loop=true] .fx-type__txt{animation:fx-typing-loop 6s steps(14,end) .3s infinite}`)}
@keyframes fx-blink{50%{opacity:0}}
@keyframes fx-typing{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes fx-typing-loop{0%{clip-path:inset(0 100% 0 0)}35%,80%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 100% 0 0)}}`,
};

export const terminal: CustomBlockDef = {
  name: 'prepress/fx-terminal',
  kind: 'art',
  title: 'CRT terminal',
  description: 'An old phosphor terminal: a window bar, glowing monospace output over scanlines with a faint flicker, and a command that types itself after the prompt.',
  icon: 'editor-code',
  category: 'widgets',
  attributes: {
    title: { type: 'string', label: 'Window title', control: 'text', default: 'prepress — publish' },
    output: { type: 'string', label: 'Output (one line per row)', control: 'textarea', default: 'Rendering 4 pages… done\nUploading 12 files… done\nhttps://your-name.prepress.digitalno.de is live' },
    prompt: { type: 'string', label: 'Prompt', control: 'text', default: '~/site $' },
    command: { type: 'string', label: 'Command', control: 'text', default: 'prepress publish' },
    glow: { type: 'string', label: 'Phosphor', control: 'select', options: ['brand', 'accent'], default: 'brand' },
  },
  template: `<div class="fx-crt" data-glow="{{glow}}"><div class="fx-crt__bar" aria-hidden="true"><i></i><i></i><i></i><span>{{title}}</span></div><div class="fx-crt__screen"><p class="fx-crt__cmd"><span class="fx-crt__prompt">{{prompt}}</span> <span class="fx-crt__typed">{{command}}</span><span class="fx-crt__caret" aria-hidden="true"></span></p><p class="fx-crt__out">{{output}}</p></div></div>`,
  css: `
.fx-crt{--ph:${MIX(C('primary'), 45, 'white')};overflow:hidden;border-radius:${R('md')};background:${NIGHT};box-shadow:0 0 0 1px ${MIX('white', 10, DEEP)},0 24px 60px -24px ${MIX('black', 60)};font-family:${MONO};font-size:clamp(.85rem,1.6vw,1rem);line-height:1.65;text-align:left}
.fx-crt[data-glow=accent]{--ph:${MIX(C('accent'), 55, 'white')}}
.fx-crt__bar{display:flex;align-items:center;gap:.45rem;padding:.6rem .9rem;background:${MIX('white', 9, DEEP)};color:${MIX('white', 55)};font-size:.72rem}
.fx-crt__bar i{width:.7rem;height:.7rem;border-radius:50%;background:${MIX('white', 18)}}
.fx-crt__bar span{flex:1;text-align:center;margin-right:2.5rem}
.fx-crt__screen{position:relative;padding:1.2rem 1.4rem 1.5rem;color:var(--ph);text-shadow:0 0 6px ${MIX('currentColor', 55)};background:radial-gradient(ellipse at 50% 40%,${MIX(C('primary'), 10, NIGHT)},${NIGHT} 75%)}
.fx-crt__screen::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,${MIX('black', 28)} 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
.fx-crt p{margin:0}
.fx-crt__out{margin-top:.5rem!important;white-space:pre-wrap;opacity:.9}
.fx-crt__prompt{color:${MIX('white', 70)}}
.fx-crt__typed{display:inline-block;white-space:nowrap}
.fx-crt__caret{display:inline-block;width:.6em;height:1.1em;vertical-align:-.2em;margin-left:.15em;background:currentColor;box-shadow:0 0 8px currentColor}
${MOTION(`.fx-crt__caret{animation:fx-blink 1.05s steps(1) infinite}.fx-crt__typed{animation:fx-typing 1.6s steps(16,end) .4s both}.fx-crt__out{animation:fx-print .01s 2.1s both}.fx-crt__screen{animation:fx-flicker 6s infinite}`)}
@keyframes fx-print{from{opacity:0}}
@keyframes fx-flicker{0%,100%{opacity:1}48%{opacity:1}50%{opacity:.92}52%{opacity:1}}
@keyframes fx-blink{50%{opacity:0}}
@keyframes fx-typing{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}`,
};

// ---------- backgrounds & panels ----------

// The panels below are effect wrappers: their words are inner core blocks
// (eyebrow paragraph, heading, text, button), styled here by position, so a
// panel looks right in any site without the set's block styles. A paragraph
// right above the heading is the eyebrow.
const HX = ':is(h1,h2,h3,h4,h5,h6)';
/** Selectors for a content slot: every heading, every paragraph, the eyebrow, the buttons. */
const SLOT = (s: string) => ({
  all: `${s} :is(p,h1,h2,h3,h4,h5,h6,.wp-block-buttons)`,
  hx: `${s} ${HX}`,
  p: `${s} p`,
  eyebrow: `${s} p:has(+ ${HX})`,
  afterEyebrow: `${s} p + ${HX}`,
  text: `${s} ${HX} + p,${s} p + p`,
  buttons: `${s} .wp-block-buttons`,
});
const btn = (text: string, url: string): BlockNode => buttons([button(text, url)], { layout: { type: 'flex', justifyContent: 'center' } });
const TEXT_BLOCKS = ['core/paragraph', 'core/heading', 'core/buttons', 'core/list'];

const STARS = (size: number, x: number, y: number, a: number, r = 1.6) => `radial-gradient(${r}px ${r}px at ${x}px ${y}px,${MIX('white', a)},transparent) 0 0/${size}px ${size}px`;

const S_STARS = SLOT('.fx-stars__in');
export const starfield: CustomBlockDef = {
  name: 'prepress/fx-starfield',
  kind: 'effect',
  title: 'Starfield panel',
  description: 'A deep-night panel of twinkling stars in three layers, with the occasional shooting star, around an eyebrow, a headline and a line of text.',
  icon: 'star-filled',
  category: 'design',
  attributes: {
    height: { type: 'string', label: 'Height', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
  },
  innerBlocks: {
    allowed: TEXT_BLOCKS,
    template: [p('After dark'), h('Look up more often.', 2), p('A panel for launches, events and anything that happens at night.')],
  },
  template: `<div class="fx-stars" data-height="{{height}}"><span class="fx-stars__l fx-stars__l--1" aria-hidden="true"></span><span class="fx-stars__l fx-stars__l--2" aria-hidden="true"></span><span class="fx-stars__shoot" aria-hidden="true"></span><div class="fx-stars__in">{{{content}}}</div></div>`,
  css: `
.fx-stars{position:relative;overflow:hidden;isolation:isolate;display:grid;place-items:center;min-height:var(--h,26rem);padding:3rem 1.5rem;border-radius:${R('lg')};color:white;text-align:center;background:${STARS(61, 13, 41, 75, 1.2)},${STARS(97, 50, 70, 85)},${STARS(151, 77, 9, 90, 2)},radial-gradient(120% 80% at 50% 125%,${MIX(C('primary'), 75, NIGHT)},${MIX(C('primary'), 22, NIGHT)} 45%,${NIGHT} 75%)}
.fx-stars[data-height=s]{--h:18rem}.fx-stars[data-height=l]{--h:36rem}
.fx-stars__l{position:absolute;inset:0;z-index:-1}
.fx-stars__l--1{background:${STARS(73, 30, 50, 95, 2)},${STARS(211, 140, 33, 100, 2.6)}}
.fx-stars__l--2{background:${STARS(127, 60, 90, 90, 1.8)},${STARS(263, 200, 170, 100, 3)}}
.fx-stars__shoot{position:absolute;top:18%;left:-20%;width:9rem;height:1px;z-index:-1;background:linear-gradient(90deg,transparent,white);opacity:0;transform:rotate(-18deg)}
.fx-stars__in{max-width:38rem}
${S_STARS.all}{margin:0}
${S_STARS.p}{font-family:${BODY};color:${MIX('white', 72)};text-wrap:pretty}
${S_STARS.hx}{font-family:${HEADING};font-weight:600;font-size:clamp(2.2rem,6vw,4.4rem);line-height:1;letter-spacing:-.03em;text-wrap:balance;color:inherit}
${S_STARS.eyebrow}{font-family:${MONO};font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;color:${MIX(C('accent'), 60, 'white')}}
${S_STARS.afterEyebrow}{margin-top:.5rem!important}
${S_STARS.text}{margin-top:1rem!important}
${S_STARS.buttons}{margin-top:1.6rem!important}
${MOTION(`.fx-stars__l--1{animation:fx-twinkle 4.5s ease-in-out infinite alternate}.fx-stars__l--2{animation:fx-twinkle 6.5s ease-in-out -2s infinite alternate}.fx-stars__shoot{animation:fx-shoot 9s ease-in 2s infinite}`)}
@keyframes fx-twinkle{from{opacity:.25}to{opacity:1}}
@keyframes fx-shoot{0%{opacity:0;transform:translate(0,0) rotate(-18deg)}2%{opacity:1}9%{opacity:0;transform:translate(120vw,-38vw) rotate(-18deg)}100%{opacity:0}}`,
};

const S_AUR = SLOT('.fx-aurora__in');
export const aurora: CustomBlockDef = {
  name: 'prepress/fx-aurora',
  kind: 'effect',
  title: 'Aurora panel',
  description: 'Soft bands of light in the brand and accent colours drifting behind a headline, a line of text and a button — on night or on paper.',
  icon: 'cloud',
  category: 'design',
  attributes: {
    sky: { type: 'string', label: 'Background', control: 'select', options: ['night', 'paper'], default: 'night' },
  },
  innerBlocks: {
    allowed: TEXT_BLOCKS,
    template: [p('New'), h('Light that moves slowly.', 2), p('Three blurred bands of colour drift behind the words. No video, no scripts.'), btn('Get started', '#')],
  },
  template: `<div class="fx-aurora" data-sky="{{sky}}"><span class="fx-aurora__band fx-aurora__band--1" aria-hidden="true"></span><span class="fx-aurora__band fx-aurora__band--2" aria-hidden="true"></span><span class="fx-aurora__band fx-aurora__band--3" aria-hidden="true"></span><div class="fx-aurora__in">{{{content}}}</div></div>`,
  css: `
.fx-aurora{position:relative;overflow:hidden;isolation:isolate;display:grid;place-items:center;min-height:26rem;padding:3.5rem 1.5rem;border-radius:${R('lg')};text-align:center;background:${NIGHT};color:white}
.fx-aurora[data-sky=paper]{background:${C('base')};color:${C('contrast')};box-shadow:inset 0 0 0 1px ${MIX(C('contrast'), 10)}}
.fx-aurora__band{position:absolute;z-index:-1;width:70%;height:55%;border-radius:50%;filter:blur(60px);opacity:.75;mix-blend-mode:screen}
.fx-aurora[data-sky=paper] .fx-aurora__band{mix-blend-mode:multiply;opacity:.45}
.fx-aurora__band--1{left:-10%;top:-10%;background:${C('primary')}}
.fx-aurora__band--2{right:-15%;top:10%;background:${C('accent')}}
.fx-aurora__band--3{left:20%;bottom:-25%;background:${MIX(C('primary'), 50, C('accent'))}}
.fx-aurora__in{max-width:38rem}
${S_AUR.all}{margin:0}
${S_AUR.p}{font-family:${BODY};opacity:.75;text-wrap:pretty}
${S_AUR.hx}{font-family:${HEADING};font-weight:600;font-size:clamp(2.2rem,6vw,4.4rem);line-height:1;letter-spacing:-.03em;text-wrap:balance;color:inherit}
${S_AUR.eyebrow}{display:inline-block;padding:.3em .8em;border-radius:999px;background:${MIX('white', 14)};font-size:.8rem;font-weight:600;opacity:1;backdrop-filter:blur(6px)}
.fx-aurora[data-sky=paper] .fx-aurora__in p:has(+ ${HX}){background:${MIX(C('contrast'), 7)}}
${S_AUR.afterEyebrow},${S_AUR.text}{margin-top:1rem!important}
${S_AUR.buttons}{margin-top:1.6rem!important;justify-content:center}
.fx-aurora__in .wp-block-button__link{padding:.8em 1.6em;border:0;border-radius:999px;background:white;color:${NIGHT};font-family:${BODY};font-size:inherit;font-weight:600;line-height:inherit;text-decoration:none}
.fx-aurora[data-sky=paper] .fx-aurora__in .wp-block-button__link{background:${C('contrast')};color:${C('base')}}
${MOTION(`.fx-aurora__band--1{animation:fx-drift-a 16s ease-in-out infinite alternate}.fx-aurora__band--2{animation:fx-drift-b 19s ease-in-out infinite alternate}.fx-aurora__band--3{animation:fx-drift-c 23s ease-in-out infinite alternate}`)}
@keyframes fx-drift-a{to{transform:translate(25%,20%) rotate(25deg) scale(1.15)}}
@keyframes fx-drift-b{to{transform:translate(-30%,25%) rotate(-20deg)}}
@keyframes fx-drift-c{to{transform:translate(15%,-35%) scale(1.25)}}`,
};

const S_GLASS = SLOT('.fx-glass__card');
export const glass: CustomBlockDef = {
  name: 'prepress/fx-glass',
  kind: 'effect',
  title: 'Frosted glass card',
  description: 'A translucent card with a frosted blur, floating over slowly moving blobs of the brand colours, around an eyebrow, a title, text and a link.',
  icon: 'id-alt',
  category: 'design',
  attributes: {},
  innerBlocks: {
    allowed: TEXT_BLOCKS,
    template: [p('Membership'), h('Everything, in one quiet place.', 3), p('Frosted glass over colour gives a card depth without a single shadow.'), p('<a href="#">Learn more →</a>')],
  },
  template: `<div class="fx-glass"><span class="fx-glass__blob fx-glass__blob--1" aria-hidden="true"></span><span class="fx-glass__blob fx-glass__blob--2" aria-hidden="true"></span><span class="fx-glass__blob fx-glass__blob--3" aria-hidden="true"></span><div class="fx-glass__card">{{{content}}}</div></div>`,
  css: `
.fx-glass{position:relative;overflow:hidden;isolation:isolate;display:grid;place-items:center;min-height:24rem;padding:3rem 1.5rem;border-radius:${R('lg')};background:${MIX(C('muted'), 80, C('base'))}}
.fx-glass__blob{position:absolute;z-index:-1;border-radius:50%}
.fx-glass__blob--1{width:16rem;aspect-ratio:1;left:12%;top:8%;background:${C('primary')}}
.fx-glass__blob--2{width:12rem;aspect-ratio:1;right:14%;bottom:6%;background:${C('accent')}}
.fx-glass__blob--3{width:8rem;aspect-ratio:1;right:30%;top:14%;background:${MIX(C('primary'), 45, C('accent'))}}
.fx-glass__card{max-width:26rem;padding:2rem 2.2rem;border-radius:${R('lg')};background:${MIX(C('base'), 42)};box-shadow:inset 0 0 0 1px ${MIX('white', 55)},inset 0 1px 0 ${MIX('white', 80)};backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);color:${C('contrast')};text-align:left}
${S_GLASS.all}{margin:0}
${S_GLASS.p}{font-family:${BODY};opacity:.8}
${S_GLASS.hx}{font-family:${HEADING};font-weight:600;font-size:1.75rem;line-height:1.1;letter-spacing:-.02em;color:inherit}
${S_GLASS.eyebrow}{font-family:${MONO};font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;opacity:.7}
${S_GLASS.afterEyebrow}{margin-top:.5rem!important}
${S_GLASS.text}{margin-top:.75rem!important}
.fx-glass__card p:has(> a:only-child){margin-top:1.1rem!important;opacity:1}
.fx-glass__card a{font-weight:600;color:inherit}
${S_GLASS.buttons}{margin-top:1.1rem!important}
${MOTION(`.fx-glass__blob--1{animation:fx-drift-a 14s ease-in-out infinite alternate}.fx-glass__blob--2{animation:fx-drift-b 17s ease-in-out infinite alternate}.fx-glass__blob--3{animation:fx-drift-c 11s ease-in-out infinite alternate}`)}
@keyframes fx-drift-a{to{transform:translate(25%,20%) rotate(25deg) scale(1.15)}}
@keyframes fx-drift-b{to{transform:translate(-30%,25%) rotate(-20deg)}}
@keyframes fx-drift-c{to{transform:translate(15%,-35%) scale(1.25)}}`,
};

const PATTERNS: Record<string, string> = {
  truchet: `radial-gradient(circle at 0 0,transparent calc(var(--s) / 2 - 4px),var(--ink) calc(var(--s) / 2 - 4px) calc(var(--s) / 2 + 4px),transparent calc(var(--s) / 2 + 4px)) 0 0/var(--s) var(--s),radial-gradient(circle at 100% 100%,transparent calc(var(--s) / 2 - 4px),var(--ink) calc(var(--s) / 2 - 4px) calc(var(--s) / 2 + 4px),transparent calc(var(--s) / 2 + 4px)) 0 0/var(--s) var(--s)`,
  moire: `repeating-radial-gradient(circle at 30% 40%,var(--ink) 0 1.5px,transparent 2px 9px),repeating-radial-gradient(circle at 70% 60%,var(--ink) 0 1.5px,transparent 2px 9px)`,
  dots: `radial-gradient(circle,var(--ink) 0 22%,transparent 24%) 0 0/var(--s) var(--s),radial-gradient(circle,var(--ink) 0 10%,transparent 12%) calc(var(--s) / 2) calc(var(--s) / 2)/var(--s) var(--s)`,
  scales: `radial-gradient(circle at 50% 0,transparent 44%,var(--ink) 46% 52%,transparent 54%) 0 0/var(--s) calc(var(--s) / 2),radial-gradient(circle at 50% 0,transparent 44%,var(--ink) 46% 52%,transparent 54%) calc(var(--s) / 2) calc(var(--s) / 4)/var(--s) calc(var(--s) / 2)`,
};

export const pattern: CustomBlockDef = {
  name: 'prepress/fx-pattern',
  kind: 'art',
  title: 'Pattern field',
  description: 'A field of generative-looking pattern — Truchet arcs, op-art moiré rings, halftone dots or fish scales — drifting very slowly, with an optional label on top.',
  icon: 'grid-view',
  category: 'design',
  attributes: {
    pattern: { type: 'string', label: 'Pattern', control: 'select', options: Object.keys(PATTERNS), default: 'truchet' },
    tone: { type: 'string', label: 'Colour', control: 'select', options: ['brand', 'accent', 'ink'], default: 'brand' },
    height: { type: 'string', label: 'Height', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
    label: { type: 'string', label: 'Label', control: 'text', default: '' },
  },
  template: `<div class="fx-pat" data-pattern="{{pattern}}" data-tone="{{tone}}" data-height="{{height}}"{{^label}} aria-hidden="true"{{/label}}><span class="fx-pat__field"></span>{{#label}}<p class="fx-pat__label">{{label}}</p>{{/label}}</div>`,
  css: `
.fx-pat{--ink:${C('primary')};--s:56px;position:relative;overflow:hidden;display:grid;place-items:center;min-height:var(--h,20rem);border-radius:${R('lg')};background:${MIX(C('primary'), 8, C('base'))}}
.fx-pat[data-tone=accent]{--ink:${C('accent')};background:${MIX(C('accent'), 8, C('base'))}}
.fx-pat[data-tone=ink]{--ink:${C('contrast')};background:${C('base')}}
.fx-pat[data-height=s]{--h:12rem}.fx-pat[data-height=l]{--h:30rem}
.fx-pat__field{position:absolute;inset:-60px}
${Object.entries(PATTERNS).map(([k, v]) => `.fx-pat[data-pattern=${k}] .fx-pat__field{background:${v}}`).join('\n')}
.fx-pat[data-pattern=dots]{--s:28px}.fx-pat[data-pattern=scales]{--s:48px}
.fx-pat__label{position:relative;margin:0;padding:.6em 1.2em;border-radius:999px;background:${C('base')};color:${C('contrast')};font-family:${HEADING};font-weight:600;font-size:clamp(1.1rem,2.4vw,1.6rem);letter-spacing:-.01em;box-shadow:0 0 0 1px ${MIX(C('contrast'), 10)}}
${MOTION(`.fx-pat__field{animation:fx-pan 30s linear infinite}.fx-pat[data-pattern=moire] .fx-pat__field{animation:fx-moire 18s ease-in-out infinite alternate}`)}
@keyframes fx-pan{to{transform:translate(56px,56px)}}
@keyframes fx-moire{to{transform:scale(1.08) rotate(3deg)}}`,
};

export const orbit: CustomBlockDef = {
  name: 'prepress/fx-orbit',
  kind: 'art',
  title: 'Orbit',
  description: 'A small solar system: a glowing centre and three planets on hairline orbits, each at its own speed. Decorative; pair it with a headline.',
  icon: 'admin-site-alt3',
  category: 'design',
  attributes: {
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
  },
  template: `<div class="fx-orbit" data-size="{{size}}" aria-hidden="true"><span class="fx-orbit__sun"></span><span class="fx-orbit__ring fx-orbit__ring--1"></span><span class="fx-orbit__ring fx-orbit__ring--2"></span><span class="fx-orbit__ring fx-orbit__ring--3"></span></div>`,
  css: `
.fx-orbit{position:relative;width:min(100%,var(--w,20rem));aspect-ratio:1;margin-inline:auto;overflow:clip;overflow-clip-margin:1rem}
.fx-orbit[data-size=s]{--w:12rem}.fx-orbit[data-size=l]{--w:30rem}
.fx-orbit__sun{position:absolute;inset:40%;border-radius:50%;background:radial-gradient(circle at 35% 35%,${MIX(C('accent'), 40, 'white')},${C('accent')} 55%,${MIX(C('accent'), 70, 'black')});box-shadow:0 0 30px 6px ${MIX(C('accent'), 40)}}
.fx-orbit__ring{position:absolute;inset:var(--i);border-radius:50%;border:1px solid ${MIX(C('contrast'), 18)}}
.fx-orbit__ring::before{content:"";position:absolute;top:50%;left:calc(var(--d) / -2);width:var(--d);height:var(--d);margin-top:calc(var(--d) / -2);border-radius:50%;background:var(--c)}
.fx-orbit__ring--1{--i:26%;--d:7%;--c:${C('primary')}}
.fx-orbit__ring--2{--i:12%;--d:5.5%;--c:${MIX(C('primary'), 50, C('accent'))}}
.fx-orbit__ring--3{--i:0%;--d:4%;--c:${C('contrast')}}
.fx-orbit__ring--1{transform:rotate(40deg)}.fx-orbit__ring--2{transform:rotate(160deg)}.fx-orbit__ring--3{transform:rotate(280deg)}
${MOTION(`.fx-orbit__ring--1{animation:fx-spin 9s linear infinite}.fx-orbit__ring--2{animation:fx-spin 16s linear -4s infinite}.fx-orbit__ring--3{animation:fx-spin 28s linear -11s infinite}`)}
@keyframes fx-spin{to{transform:rotate(360deg)}}`,
};

// ---------- numbers ----------

const PROPS = `@property --fx-n{syntax:'<integer>';inherits:true;initial-value:0}
@property --fx-p{syntax:'<number>';inherits:true;initial-value:0}`;

export const ring: CustomBlockDef = {
  name: 'prepress/fx-ring',
  kind: 'art',
  title: 'Ring gauge',
  description: 'A percentage as a ring that fills and counts up as it scrolls into view, with a label underneath.',
  icon: 'chart-pie',
  category: 'widgets',
  attributes: {
    value: { type: 'number', label: 'Percent', control: 'number', default: 72 },
    label: { type: 'string', label: 'Label', control: 'text', default: 'of visitors come back' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
  },
  template: `<figure class="fx-ring" data-size="{{size}}" style="--fx-to:{{value}}"><div class="fx-ring__dial" role="img" aria-label="{{value}}%"><span class="fx-ring__num" aria-hidden="true"></span></div>{{#label}}<figcaption>{{label}}</figcaption>{{/label}}</figure>`,
  css: `
${PROPS}
.fx-ring{--w:11rem;margin:0 auto;width:fit-content;text-align:center;--fx-p:var(--fx-to);--fx-n:var(--fx-to)}
.fx-ring[data-size=s]{--w:7rem}.fx-ring[data-size=l]{--w:15rem}
.fx-ring__dial{position:relative;width:var(--w);aspect-ratio:1;margin-inline:auto;border-radius:50%;background:conic-gradient(${C('primary')} calc(var(--fx-p) * 1%),${MIX(C('contrast'), 9)} 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - .9rem),#000 calc(100% - .9rem + 1px));mask:radial-gradient(farthest-side,transparent calc(100% - .9rem),#000 calc(100% - .9rem + 1px))}
.fx-ring__num{position:absolute;inset:0;display:grid;place-items:center}
.fx-ring{position:relative}
.fx-ring::before{counter-reset:fx var(--fx-n);content:counter(fx) "%";position:absolute;left:0;right:0;top:calc(var(--w) / 2);transform:translateY(-50%);font-family:${HEADING};font-weight:600;font-size:calc(var(--w) * .22);letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:${C('contrast')}}
.fx-ring figcaption{margin-top:.9rem;max-width:14rem;font-family:${BODY};font-size:.95rem;color:${MIX(C('contrast'), 70, C('base'))}}
${ON_VIEW('.fx-ring', 'fx-fill linear', 'entry 20% cover 45%')}
@keyframes fx-fill{from{--fx-p:0;--fx-n:0}}`,
};

export const counter: CustomBlockDef = {
  name: 'prepress/fx-counter',
  kind: 'art',
  title: 'Count-up number',
  description: 'A big number that counts up from zero as it scrolls into view, with a prefix, suffix and a label. Shows the final number where animations are off.',
  icon: 'performance',
  category: 'widgets',
  attributes: {
    value: { type: 'number', label: 'Number', control: 'number', default: 1280 },
    prefix: { type: 'string', label: 'Before', control: 'text', default: '' },
    suffix: { type: 'string', label: 'After', control: 'text', default: '+' },
    label: { type: 'string', label: 'Label', control: 'text', default: 'sites published this month' },
  },
  template: `<div class="fx-count" style="--fx-to:{{value}}"><p class="fx-count__num" role="img" aria-label="{{prefix}}{{value}}{{suffix}}"><span aria-hidden="true">{{prefix}}</span><span class="fx-count__n" aria-hidden="true"></span><span aria-hidden="true">{{suffix}}</span></p>{{#label}}<p class="fx-count__label">{{label}}</p>{{/label}}</div>`,
  css: `
${PROPS}
.fx-count{--fx-n:var(--fx-to)}
.fx-count p{margin:0}
.fx-count__num{font-family:${HEADING};font-weight:600;font-size:clamp(3rem,8vw,6rem);line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:${C('contrast')}}
.fx-count__n::after{counter-reset:fx var(--fx-n);content:counter(fx)}
.fx-count__num span:first-child,.fx-count__num span:last-child{color:${C('primary')}}
.fx-count__label{margin-top:.6rem!important;font-family:${BODY};color:${MIX(C('contrast'), 70, C('base'))}}
${ON_VIEW('.fx-count', 'fx-count cubic-bezier(.2,.7,.2,1)', 'entry 20% cover 45%')}
@keyframes fx-count{from{--fx-n:0}}`,
};

export const bars: CustomBlockDef = {
  name: 'prepress/fx-bars',
  kind: 'art',
  title: 'Mini bar chart',
  description: 'Seven bars (values 0–100) that grow into place as they scroll into view, the last one in the accent colour, with a title and start/end labels.',
  icon: 'chart-bar',
  category: 'widgets',
  attributes: {
    title: { type: 'string', label: 'Title', control: 'text', default: 'Visitors this week' },
    v1: { type: 'number', label: 'Bar 1', control: 'number', default: 32 },
    v2: { type: 'number', label: 'Bar 2', control: 'number', default: 45 },
    v3: { type: 'number', label: 'Bar 3', control: 'number', default: 38 },
    v4: { type: 'number', label: 'Bar 4', control: 'number', default: 60 },
    v5: { type: 'number', label: 'Bar 5', control: 'number', default: 52 },
    v6: { type: 'number', label: 'Bar 6', control: 'number', default: 74 },
    v7: { type: 'number', label: 'Bar 7', control: 'number', default: 96 },
    start: { type: 'string', label: 'Start label', control: 'text', default: 'Mon' },
    end: { type: 'string', label: 'End label', control: 'text', default: 'Sun' },
  },
  template: `<figure class="fx-bars"><figcaption class="fx-bars__title">{{title}}</figcaption><div class="fx-bars__plot" role="img" aria-label="{{title}}: {{v1}}, {{v2}}, {{v3}}, {{v4}}, {{v5}}, {{v6}}, {{v7}}"><i style="--v:{{v1}}"></i><i style="--v:{{v2}}"></i><i style="--v:{{v3}}"></i><i style="--v:{{v4}}"></i><i style="--v:{{v5}}"></i><i style="--v:{{v6}}"></i><i style="--v:{{v7}}"></i></div><p class="fx-bars__axis" aria-hidden="true"><span>{{start}}</span><span>{{end}}</span></p></figure>`,
  css: `
.fx-bars{margin:0;padding:1.4rem 1.5rem 1.1rem;border-radius:${R('lg')};background:${C('base')};box-shadow:0 0 0 1px ${MIX(C('contrast'), 10)}}
.fx-bars__title{font-family:${BODY};font-weight:600;font-size:.95rem}
.fx-bars__plot{display:flex;align-items:flex-end;gap:7%;height:9rem;margin-top:1rem;padding-bottom:1px;border-bottom:1px solid ${MIX(C('contrast'), 14)}}
.fx-bars__plot i{flex:1;height:calc(var(--v) * 1%);min-height:2px;border-radius:${R('sm')} ${R('sm')} 0 0;background:${MIX(C('primary'), 75, C('base'))};transform-origin:bottom}
.fx-bars__plot i:last-child{background:${C('accent')}}
.fx-bars__axis{display:flex;justify-content:space-between;margin:.5rem 0 0;font-family:${MONO};font-size:.72rem;color:${MIX(C('contrast'), 60, C('base'))}}
${[1, 2, 3, 4, 5, 6, 7].map((i) => ON_VIEW(`.fx-bars__plot i:nth-child(${i})`, `fx-grow ${0.5 + i * 0.05}s cubic-bezier(.2,.7,.2,1)`, `entry ${10 + i * 3}% cover ${32 + i * 3}%`)).join('\n')}
@keyframes fx-grow{from{transform:scaleY(0)}}`,
};

export const BLOCKS: CustomBlockDef[] = [splitflap, typewriter, terminal, starfield, aurora, glass, pattern, orbit, ring, counter, bars];
