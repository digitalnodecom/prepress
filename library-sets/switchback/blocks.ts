/**
 * Switchback — blocks. Four, each for a reason core blocks can't cover:
 *  - arch (art): the first screen's headline bent over an arch (SVG textPath)
 *    and extruded through four stepped greens; static layers in the markup,
 *    so it's complete without a script;
 *  - sphere (effect): a holographic sphere rising out of the bottom of a dark
 *    sheet, the inner paragraphs floating round it as glass pills;
 *  - stickers (art): four die-cut stickers with hard offset shadows;
 *  - trinkets (art): drawn things beside a text card (a laptop and a notebook,
 *    a heart and a basket, or three holographic orbs).
 *
 * House rules: colours only from the palette presets and the set tokens
 * (var(--wp--custom--switchback--*)); every drawn thing has a 4px fir outline
 * and a hard 7px offset shadow; CSS namespaced `.wp-block-prepress-switchback-*` / `.sb-*`.
 */
import type { BlockNode, CustomBlockDef } from '../../src/lib/types';
import { b, color as C, p } from '../kit';

const t = (k: string) => `var(--wp--custom--switchback--${k})`;
const EASE_OUT = 'cubic-bezier(0,0,.2,1)';
const HOLO = `conic-gradient(from 140deg,${t('holo--green')},${t('holo--cyan')},${t('holo--violet')},${t('holo--lime')},${t('holo--rose')},${t('holo--cyan')},${t('holo--green')})`;
const fir = (pct: number) => `color-mix(in srgb,${C('contrast')} ${pct}%,transparent)`;
const SHADOW = `7px 7px 0 ${C('contrast')}`;
const LAYERS = [4, 3, 2, 1];

export const arch: CustomBlockDef = {
  name: 'prepress/switchback-arch',
  title: 'Arched headline',
  description: 'The page’s main headline bent over an arch and extruded: a lime face outlined in dark fir with four stepped greens behind it, like a sticker. Short lines (three or four words) read best.',
  kind: 'art',
  icon: 'editor-textcolor',
  category: 'design',
  attributes: {
    text: { type: 'string', label: 'Headline', control: 'text', default: 'Ship what wins' },
    uid: { type: 'string', label: 'Unique name (if used twice on a page)', control: 'text', default: 'sb-arch' },
  },
  template: `<h1 class="sb-arch"><svg viewBox="0 0 1000 330" role="img" aria-label="{{text}}"><defs><path id="{{uid}}" d="M30 300 Q500 110 970 300" fill="none"/></defs>
${LAYERS.map((i) => `<text class="sb-arch__l sb-arch__l--${i}" aria-hidden="true"><textPath href="#{{uid}}" startOffset="50%" text-anchor="middle">{{text}}</textPath></text>`).join('\n')}
<text class="sb-arch__face"><textPath href="#{{uid}}" startOffset="50%" text-anchor="middle">{{text}}</textPath></text></svg></h1>`,
  css: `
.sb-arch{margin:0;line-height:0}
.sb-arch svg{display:block;width:min(100%,940px);margin:0 auto;overflow:visible}
.sb-arch text{font-family:var(--wp--preset--font-family--heading);font-size:150px;font-weight:900;letter-spacing:-.02em;word-spacing:.1em;fill:${C('accent')};stroke:${C('contrast')};stroke-width:.025em;stroke-linejoin:round;paint-order:stroke fill}
${LAYERS.map((i) => `.sb-arch .sb-arch__l--${i}{fill:${t(`ex${i + 1}`)};transform:translate(${(-0.062 * i).toFixed(3)}em,${(0.062 * i).toFixed(3)}em)}`).join('\n')}
@media (prefers-reduced-motion:no-preference){.sb-arch__l{animation:sb-fan .62s ${EASE_OUT} both}
${LAYERS.map((i) => `.sb-arch__l--${i}{animation-delay:${160 + i * 55}ms}`).join('')}}
@media (max-width:720px){.sb-arch{margin-top:14vh}}
@keyframes sb-fan{from{transform:translate(0,0);opacity:0}}`,
};

export const sphere: CustomBlockDef = {
  name: 'prepress/switchback-sphere',
  title: 'Holographic sphere',
  description: 'A big holographic sphere rising out of the bottom of a dark section, with the paragraphs inside floating around it as frosted glass pills (five read best; on phones three show). Put it last in its section, with no bottom padding, so the next section cuts across it.',
  kind: 'effect',
  icon: 'marker',
  category: 'design',
  attributes: {},
  innerBlocks: {
    allowed: ['core/paragraph'],
    template: [p('Writing variant 3 of 40'), p('Calling that test at 96%'), p('Rolling out to 100%')],
  },
  template: `<div class="sb-sphere"><div class="sb-sphere__orb" aria-hidden="true"></div><div class="sb-sphere__pills">{{{content}}}</div></div>`,
  css: `
.sb-sphere{position:relative;height:360px;max-width:1000px;margin:0 auto;overflow:visible}
.sb-sphere__orb{position:absolute;left:50%;top:20px;width:820px;height:820px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle at 34% 26%,color-mix(in srgb,${C('secondary')} 80%,transparent),transparent 32%),${HOLO};box-shadow:inset -40px -50px 90px ${fir(50)};filter:saturate(1.5) contrast(1.1)}
.sb-sphere__pills > p{position:absolute;display:inline-flex;align-items:center;gap:10px;margin:0;padding:8px 20px 8px 8px;border-radius:var(--wp--custom--radius--lg);background:color-mix(in srgb,${C('secondary')} 45%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:${C('contrast')};font-weight:500;font-size:1rem;white-space:nowrap}
.sb-sphere__pills > p::before{content:"↯";display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:color-mix(in srgb,${C('secondary')} 75%,transparent);font-weight:900}
.sb-sphere__pills > p:nth-child(1){left:3%;top:20%}
.sb-sphere__pills > p:nth-child(2){right:4%;top:8%}
.sb-sphere__pills > p:nth-child(3){left:16%;top:62%}
.sb-sphere__pills > p:nth-child(4){right:10%;top:50%}
.sb-sphere__pills > p:nth-child(5){left:40%;top:88%}
.sb-sphere__pills > p:nth-child(n+6){display:none}
@media (prefers-reduced-motion:no-preference){.sb-sphere__pills > p{animation:sb-float 6s ease-in-out infinite}.sb-sphere__pills > p:nth-child(2n){animation-delay:-2.2s}.sb-sphere__pills > p:nth-child(3n){animation-delay:-4s}}
@keyframes sb-float{50%{translate:0 -8px}}
@media (max-width:720px){.sb-sphere{height:250px}.sb-sphere__orb{width:360px;height:360px}.sb-sphere__pills > p{padding:6px 14px 6px 6px;font-size:.875rem}.sb-sphere__pills > p:nth-child(1){left:8px;top:2%}.sb-sphere__pills > p:nth-child(2){right:8px;top:30%}.sb-sphere__pills > p:nth-child(4){right:4%;top:64%;left:auto}.sb-sphere__pills > p:nth-child(3),.sb-sphere__pills > p:nth-child(5){display:none}}`,
};

/** The sphere with its pills. */
export const sphereWith = (pills: string[]): BlockNode => b('prepress/switchback-sphere', {}, pills.map((x) => p(x)));

export const stickers: CustomBlockDef = {
  name: 'prepress/switchback-stickers',
  title: 'Die-cut stickers',
  description: 'Four die-cut stickers in a row, each with a hard dark outline and offset shadow, tilted a few degrees, a one-word label at the bottom: striped, light blue with a lime burst behind it, pink with a cross, lime with a sunset and a stamp.',
  kind: 'art',
  icon: 'tag',
  category: 'design',
  attributes: {
    one: { type: 'string', label: 'Sticker 1', control: 'text', default: 'Plan' },
    two: { type: 'string', label: 'Sticker 2', control: 'text', default: 'Draft' },
    three: { type: 'string', label: 'Sticker 3', control: 'text', default: 'Test' },
    four: { type: 'string', label: 'Sticker 4', control: 'text', default: 'Ship' },
    stamp: { type: 'string', label: 'Stamp on sticker 4', control: 'text', default: 'Publish' },
  },
  template: `<div class="sb-stk" role="list">
<div class="sb-stk__i" role="listitem"><div class="sb-stk__s">{{one}}</div></div>
<div class="sb-stk__i" role="listitem"><div class="sb-stk__s">{{two}}</div></div>
<div class="sb-stk__i" role="listitem"><div class="sb-stk__s">{{three}}</div></div>
<div class="sb-stk__i" role="listitem"><div class="sb-stk__s">{{four}}<span class="sb-stk__stamp" aria-hidden="true">{{stamp}}</span></div></div>
</div>`,
  css: `
.sb-stk{--sb-tilt:5deg;display:flex;flex-wrap:wrap;justify-content:center;gap:3rem}
.sb-stk__i{position:relative;width:190px}
.sb-stk__s{position:relative;display:flex;align-items:flex-end;height:200px;padding:12px;border:3px solid ${C('contrast')};border-radius:var(--wp--custom--radius--md);background:${C('secondary')};box-shadow:${SHADOW};font-family:var(--wp--preset--font-family--heading);font-size:1.625rem;font-weight:800;line-height:.9;color:${C('contrast')};transition:transform .2s ${EASE_OUT}}
.sb-stk__s::before{content:"";position:absolute;inset:12px 12px 52px;border:3px solid ${C('contrast')};border-radius:var(--wp--custom--radius--sm);background:${C('secondary')}}
.sb-stk__i:nth-child(1) .sb-stk__s{transform:rotate(calc(var(--sb-tilt)*-1))}
.sb-stk__i:nth-child(1) .sb-stk__s::before{background:repeating-linear-gradient(${t('pink')} 0 12px,${C('secondary')} 12px 26px)}
.sb-stk__i:nth-child(2) .sb-stk__s{transform:rotate(calc(var(--sb-tilt)*.8));background:${C('muted')}}
.sb-stk__i:nth-child(2) .sb-stk__s::after{content:"";position:absolute;left:34px;right:34px;top:104px;height:16px;border:3px solid ${C('contrast')};border-radius:calc(var(--wp--custom--radius--sm)*0.75);background:${C('accent')}}
.sb-stk__i:nth-child(2)::before{content:"";position:absolute;inset:-26px;border-radius:50%;background:repeating-conic-gradient(${C('accent')} 0 13deg,transparent 0 26deg)}
.sb-stk__i:nth-child(3) .sb-stk__s{transform:rotate(calc(var(--sb-tilt)*-.6));background:${t('pink')}}
.sb-stk__i:nth-child(3) .sb-stk__s::before{background:linear-gradient(45deg,transparent 47%,${C('contrast')} 47% 53%,transparent 53%),linear-gradient(-45deg,transparent 47%,${C('contrast')} 47% 53%,transparent 53%),${C('secondary')}}
.sb-stk__i:nth-child(4) .sb-stk__s{transform:rotate(calc(var(--sb-tilt)*1.2));background:${C('accent')}}
.sb-stk__i:nth-child(4) .sb-stk__s::before{background:linear-gradient(${C('muted')},${t('pink')} 45%,${t('holo--rose')} 52%,${t('ex4')} 53%,${C('primary')})}
.sb-stk__stamp{position:absolute;left:6px;top:86px;padding:6px 14px;transform:rotate(-9deg);border:3px solid ${C('contrast')};border-radius:calc(var(--wp--custom--radius--sm)*0.75);background:${C('secondary')};font-size:1.125rem}
.sb-stk__i:hover .sb-stk__s{transform:rotate(0) translateY(-4px)}
@media (max-width:720px){.sb-stk{gap:2.75rem 1.25rem}.sb-stk__i{width:132px}.sb-stk__s{height:156px;font-size:1.375rem}.sb-stk__s::before{inset:10px 10px 44px}.sb-stk__stamp{top:58px;font-size:.875rem}}`,
};

const TK = (body: string) => `<svg class="sb-tk__t" viewBox="0 0 150 130" aria-hidden="true">${body}</svg>`;
export const trinkets: CustomBlockDef = {
  name: 'prepress/switchback-trinkets',
  title: 'Trinkets',
  description: 'Drawn things beside a text card, outlined in dark fir with hard offset shadows and tilted; they straighten when the row is pointed at. Pick a motif: a laptop and a notebook (work), a heart and a basket (customers), or three holographic orbs (AI).',
  kind: 'art',
  icon: 'smiley',
  category: 'design',
  attributes: {
    motif: { type: 'string', label: 'Motif', control: 'select', options: ['desk', 'shop', 'orbs'], default: 'desk' },
  },
  template: `<div class="sb-tk" data-motif="{{motif}}" aria-hidden="true">
<div class="sb-tk__set sb-tk__set--desk">${TK(`<path d="M28 18h94a8 8 0 0 1 8 8v58H20V26a8 8 0 0 1 8-8z" class="sb-tk--ex2"/><path d="M34 30h82v44H34z" class="sb-tk--lime"/><rect x="8" y="84" width="134" height="20" rx="8" class="sb-tk--base"/>`)}${TK(`<rect x="30" y="10" width="92" height="112" rx="10" class="sb-tk--pink"/><path d="M30 24h92M30 40h92M30 56h92M30 72h92" fill="none" opacity=".35"/><rect x="96" y="10" width="14" height="112" class="sb-tk--lime"/>`)}</div>
<div class="sb-tk__set sb-tk__set--shop">${TK(`<path d="M75 118 24 66A30 30 0 1 1 75 30a30 30 0 1 1 51 36z" class="sb-tk--pink"/>`)}${TK(`<path d="M18 46h114l-14 68H32z" class="sb-tk--blue"/><path d="M46 46l18-30M104 46 86 16M38 70h74M30 94h90M62 46v68M90 46v68" fill="none"/>`)}</div>
<div class="sb-tk__set sb-tk__set--orbs"><span class="sb-tk__orb"></span><span class="sb-tk__orb"></span><span class="sb-tk__orb"></span></div>
</div>`,
  css: `
.sb-tk__set{display:none;align-items:center;justify-content:center;gap:1rem;min-height:150px}
.sb-tk[data-motif="desk"] .sb-tk__set--desk,.sb-tk[data-motif="shop"] .sb-tk__set--shop,.sb-tk[data-motif="orbs"] .sb-tk__set--orbs{display:flex}
.sb-tk__t{flex:none;width:150px;height:130px;overflow:visible;filter:drop-shadow(${SHADOW});transition:transform .2s ${EASE_OUT}}
.sb-tk__t *{stroke:${C('contrast')};stroke-width:4;stroke-linejoin:round}
.sb-tk--ex2{fill:${t('ex2')}}.sb-tk--lime{fill:${C('accent')}}.sb-tk--base{fill:${C('base')}}.sb-tk--pink{fill:${t('pink')}}.sb-tk--blue{fill:${C('muted')}}
.sb-tk__t:nth-child(1){transform:rotate(-8deg)}
.sb-tk__t:nth-child(2){transform:rotate(6deg) translateY(-18px)}
.sb-tk__orb{flex:none;width:110px;height:110px;border:4px solid ${C('contrast')};border-radius:50%;background:radial-gradient(circle at 34% 26%,color-mix(in srgb,${C('secondary')} 85%,transparent),transparent 34%),${HOLO};box-shadow:${SHADOW},inset -10px -14px 24px ${fir(40)};transition:transform .2s ${EASE_OUT}}
.sb-tk__orb:nth-child(1){transform:rotate(-8deg)}
.sb-tk__orb:nth-child(2){transform:translateY(-24px)}
.sb-tk__orb:nth-child(3){transform:translateY(8px)}
.sb-tk:hover .sb-tk__t,.sb-tk:hover .sb-tk__orb{transform:rotate(0) translateY(-6px)}
@media (max-width:720px){.sb-tk__t{width:110px;height:96px}.sb-tk__orb{width:84px;height:84px}}`,
};

export const BLOCKS: CustomBlockDef[] = [arch, sphere, stickers, trinkets];
