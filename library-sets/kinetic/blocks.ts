/**
 * Kinetic Grotesk — blocks. Site-defined `prepress/kinetic-*` types: templates
 * are plain HTML (no scripts), colours come only from the palette variables so
 * every block restyles with any Style, motion is pure CSS and switches off
 * under prefers-reduced-motion.
 *
 * Custom-block CSS is global (not scoped by Prepress), so every rule here is
 * namespaced under `.wp-block-prepress-kinetic-<slug>` / `.kx-*`.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const HEADING = 'var(--wp--preset--font-family--heading)';
const BODY = 'var(--wp--preset--font-family--body)';
const EASE = 'cubic-bezier(.2,.7,.1,1)';

/** A 16-point starburst as an SVG path (computed once, at authoring time). */
function burst(points = 16, outer = 98, inner = 62, cx = 100, cy = 100) {
  const d: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d.push(`${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `${d.join(' ')}Z`;
}

function dotGrid(n = 7) {
  const out: string[] = [];
  const step = 200 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.push(`<circle cx="${(step / 2 + x * step).toFixed(1)}" cy="${(step / 2 + y * step).toFixed(1)}" r="${(step / 4.2).toFixed(1)}"/>`);
  return out.join('');
}

export const marquee: CustomBlockDef = {
  name: 'prepress/kinetic-marquee',
  title: 'Kinetic marquee',
  description: 'An endless ticker of words in big grotesk type. Pauses on hover; still under reduced motion.',
  icon: 'leftright',
  category: 'design',
  attributes: {
    text: { type: 'string', label: 'Words', control: 'text', default: 'Brand identity ✶ Motion ✶ Websites ✶ Art direction' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'l' },
    tone: { type: 'string', label: 'Colours', control: 'select', options: ['ink', 'acid', 'paper'], default: 'ink' },
    speed: { type: 'string', label: 'Speed', control: 'select', options: ['slow', 'normal', 'fast'], default: 'normal' },
    reverse: { type: 'boolean', label: 'Run right to left → left to right', control: 'toggle', default: false },
  },
  template: `<div class="kx-marquee" data-size="{{size}}" data-tone="{{tone}}" data-speed="{{speed}}"{{#reverse}} data-reverse="true"{{/reverse}}><div class="kx-marquee__track"><span class="kx-marquee__item">{{text}}<b aria-hidden="true">✶</b></span><span class="kx-marquee__item" aria-hidden="true">{{text}}<b>✶</b></span><span class="kx-marquee__item" aria-hidden="true">{{text}}<b>✶</b></span><span class="kx-marquee__item" aria-hidden="true">{{text}}<b>✶</b></span></div></div>`,
  css: `
.wp-block-prepress-kinetic-marquee{margin-block:0}
.kx-marquee{display:flex;overflow:hidden;font-family:${HEADING};font-weight:800;text-transform:uppercase;letter-spacing:-.03em;line-height:1;padding-block:.32em;border-block:1px solid currentColor;user-select:none}
.kx-marquee[data-tone=ink]{background:${C('contrast')};color:${C('base')};border-color:${C('contrast')}}
.kx-marquee[data-tone=acid]{background:${C('accent')};color:${C('contrast')};border-color:${C('contrast')}}
.kx-marquee[data-tone=paper]{background:transparent;color:${C('contrast')}}
.kx-marquee[data-size=s]{font-size:clamp(1.1rem,2.2vw,1.75rem)}
.kx-marquee[data-size=m]{font-size:clamp(1.8rem,4.6vw,4rem)}
.kx-marquee[data-size=l]{font-size:clamp(2.6rem,8.4vw,8rem)}
.kx-marquee__track{display:flex;flex:none;white-space:nowrap;will-change:transform}
.kx-marquee__item{display:inline-flex;align-items:center;gap:.45em;padding-right:.45em}
.kx-marquee__item b{font-weight:400;color:${C('accent')};font-size:.7em;display:inline-block}
.kx-marquee[data-tone=acid] .kx-marquee__item b,.kx-marquee[data-tone=paper] .kx-marquee__item b{color:inherit}
@media (prefers-reduced-motion:no-preference){
.kx-marquee__track{animation:kx-marquee 30s linear infinite}
.kx-marquee[data-speed=slow] .kx-marquee__track{animation-duration:52s}
.kx-marquee[data-speed=fast] .kx-marquee__track{animation-duration:16s}
.kx-marquee[data-reverse=true] .kx-marquee__track{animation-direction:reverse}
.kx-marquee:hover .kx-marquee__track{animation-play-state:paused}
.kx-marquee__item b{animation:kx-spin 6s linear infinite}
}
@keyframes kx-marquee{to{transform:translateX(-50%)}}
@keyframes kx-spin{to{transform:rotate(360deg)}}`,
};

export const display: CustomBlockDef = {
  name: 'prepress/kinetic-display',
  title: 'Kinetic display',
  description: 'Screen-wide headline in heavy grotesk with an eyebrow line and a pulsing accent dot. Rises into place.',
  icon: 'editor-textcolor',
  category: 'text',
  attributes: {
    eyebrow: { type: 'string', label: 'Eyebrow', control: 'text', default: 'Independent studio — since 2014' },
    text: { type: 'string', label: 'Headline', control: 'richtext', default: 'We make<br>things move' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['display', 'mega'], default: 'mega' },
    primary: { type: 'boolean', label: 'Page title (h1)', control: 'toggle', default: true },
    dot: { type: 'boolean', label: 'Accent dot', control: 'toggle', default: true },
  },
  template: `<div class="kx-display" data-size="{{size}}">{{#eyebrow}}<p class="kx-eyebrow">{{eyebrow}}</p>{{/eyebrow}}{{#primary}}<h1 class="kx-display__title">{{text}}{{#dot}}<span class="kx-dot" aria-hidden="true"></span>{{/dot}}</h1>{{/primary}}{{^primary}}<h2 class="kx-display__title">{{text}}{{#dot}}<span class="kx-dot" aria-hidden="true"></span>{{/dot}}</h2>{{/primary}}</div>`,
  css: `
.kx-display{display:flex;flex-direction:column;gap:clamp(1rem,2.5vw,2rem)}
.kx-eyebrow{margin:0;display:flex;align-items:center;gap:.9em;font-family:${BODY};font-size:.78rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.kx-eyebrow::before{content:"";width:2.5rem;height:1px;background:currentColor}
.kx-display__title{margin:0;font-family:${HEADING};font-weight:800;text-transform:uppercase;line-height:.84;letter-spacing:-.055em;text-wrap:balance;color:inherit;overflow-wrap:normal;word-break:normal;hyphens:manual}
.kx-display[data-size=display] .kx-display__title{font-size:clamp(2.3rem,9vw,9.5rem)}
.kx-display[data-size=mega] .kx-display__title{font-size:clamp(2.4rem,13.2vw,16rem)}
.has-accent-background-color .kx-dot{background:${C('contrast')}}
.kx-dot{display:inline-block;width:.17em;height:.17em;margin-left:.05em;border-radius:50%;background:${C('accent')};box-shadow:0 0 0 .02em ${C('contrast')};vertical-align:baseline}
@media (prefers-reduced-motion:no-preference){
.kx-display__title{animation:kx-rise 1.1s ${EASE} both}
.kx-eyebrow{animation:kx-rise 1.1s ${EASE} .08s both}
.kx-dot{animation:kx-pulse 2.4s ${EASE} 1.1s infinite}
@supports (animation-timeline:view()){
.kx-display:not(:has(h1)) .kx-display__title{animation:kx-rise linear both;animation-timeline:view();animation-range:entry 0% cover 35%}
}}
@keyframes kx-rise{from{opacity:0;transform:translateY(.35em) skewY(3deg);clip-path:inset(0 0 100% 0)}to{opacity:1;transform:none;clip-path:inset(0 0 -10% 0)}}
@keyframes kx-pulse{0%,100%{transform:scale(1)}50%{transform:scale(.55)}}`,
};

export const indexRow: CustomBlockDef = {
  name: 'prepress/kinetic-index-row',
  title: 'Kinetic index row',
  description: 'One numbered row of a project or service index. The whole row floods with ink on hover and the arrow slides in.',
  icon: 'list-view',
  category: 'design',
  attributes: {
    number: { type: 'string', label: 'Number', control: 'text', default: '01' },
    title: { type: 'string', label: 'Title', control: 'text', default: 'Lumen Energy' },
    meta: { type: 'string', label: 'Tags', control: 'text', default: 'Brand · Web' },
    year: { type: 'string', label: 'Year', control: 'text', default: '2026' },
    url: { type: 'string', label: 'Link', control: 'url', default: '' },
  },
  template: `{{#url}}<a class="kx-row" href="{{url}}">{{/url}}{{^url}}<div class="kx-row">{{/url}}<span class="kx-row__num">{{number}}</span><span class="kx-row__title">{{title}}</span><span class="kx-row__meta">{{meta}}</span><span class="kx-row__year">{{year}}</span><span class="kx-row__arrow" aria-hidden="true">↗</span>{{#url}}</a>{{/url}}{{^url}}</div>{{/url}}`,
  css: `
.wp-block-prepress-kinetic-index-row{margin-block:0!important}
.kx-row{position:relative;display:grid;grid-template-columns:4rem 1fr auto 4.5rem 2.5rem;align-items:center;gap:1.25rem;padding:clamp(1rem,2.2vw,1.6rem) .75rem;border-top:1px solid currentColor;color:inherit;text-decoration:none;isolation:isolate;overflow:hidden}
.wp-block-prepress-kinetic-index-row:last-child .kx-row{border-bottom:1px solid currentColor}
.kx-row::before{content:"";position:absolute;inset:0;z-index:-1;background:${C('contrast')};transform:scaleY(0);transform-origin:bottom;transition:transform .55s ${EASE}}
.kx-row__num,.kx-row__year{font-family:${BODY};font-size:.8rem;font-weight:600;letter-spacing:.14em;font-variant-numeric:tabular-nums}
.kx-row__title{min-width:0;font-family:${HEADING};font-weight:800;text-transform:uppercase;letter-spacing:-.035em;line-height:.95;font-size:clamp(1.3rem,3.3vw,3.2rem);overflow-wrap:normal;word-break:normal;transition:transform .55s ${EASE}}
.kx-row__meta{font-family:${BODY};font-size:.9rem;opacity:.75}
.kx-row__arrow{justify-self:end;font-size:1.6rem;line-height:1;opacity:.3;transition:transform .55s ${EASE},opacity .3s}
.kx-row:hover,.kx-row:focus-visible{color:${C('base')}}
.kx-row:hover::before,.kx-row:focus-visible::before{transform:scaleY(1)}
.kx-row:hover .kx-row__title,.kx-row:focus-visible .kx-row__title{transform:translateX(.6rem);color:${C('accent')}}
.kx-row:hover .kx-row__arrow,.kx-row:focus-visible .kx-row__arrow{transform:translate(.15em,-.15em) rotate(45deg);opacity:1;color:${C('accent')}}
@media (max-width:720px){.kx-row{grid-template-columns:2.5rem 1fr 2rem}.kx-row__meta,.kx-row__year{display:none}.kx-row__arrow{opacity:1;transform:none}}`,
};

export const label: CustomBlockDef = {
  name: 'prepress/kinetic-label',
  title: 'Kinetic section label',
  description: 'A small numbered label — “(02) Services” — that sticks while its section scrolls. Put it in a narrow column.',
  icon: 'tag',
  category: 'text',
  attributes: {
    number: { type: 'string', label: 'Number', control: 'text', default: '01' },
    text: { type: 'string', label: 'Label', control: 'text', default: 'Selected work' },
  },
  template: `<p class="kx-label"><span class="kx-label__num">({{number}})</span><span class="kx-label__text">{{text}}</span></p>`,
  css: `
.wp-block-prepress-kinetic-label{position:sticky;top:calc(var(--pp-header-h, 0px) + 1.5rem);align-self:start}
.kx-label{margin:0;display:flex;flex-direction:column;gap:.35rem;font-family:${BODY};font-size:.8rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.kx-label__num{font-family:${HEADING};font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;letter-spacing:-.04em;line-height:1}`,
};

export const stat: CustomBlockDef = {
  name: 'prepress/kinetic-stat',
  title: 'Kinetic stat',
  description: 'An oversized number with a caption; an accent line sweeps under it as it scrolls into view.',
  icon: 'chart-bar',
  category: 'design',
  attributes: {
    value: { type: 'string', label: 'Number', control: 'text', default: '120' },
    suffix: { type: 'string', label: 'Suffix', control: 'text', default: '+' },
    label: { type: 'string', label: 'Caption', control: 'text', default: 'Projects shipped' },
  },
  template: `<div class="kx-stat"><p class="kx-stat__value"><span>{{value}}</span>{{#suffix}}<sup>{{suffix}}</sup>{{/suffix}}</p><p class="kx-stat__label">{{label}}</p></div>`,
  css: `
.kx-stat{display:flex;flex-direction:column;gap:.75rem}
.kx-stat__value{position:relative;margin:0;padding-bottom:.18em;font-family:${HEADING};font-weight:800;font-size:clamp(3rem,6vw,6.5rem);line-height:.82;letter-spacing:-.06em;font-variant-numeric:tabular-nums;white-space:nowrap}
.kx-stat__value sup{font-size:.36em;vertical-align:top;margin-left:.04em;letter-spacing:0}
.kx-stat__value::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:.09em;background:${C('accent')};transform-origin:left}
.kx-stat__label{margin:0;font-family:${BODY};font-size:.82rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){
.kx-stat__value::after{animation:kx-sweep linear both;animation-timeline:view();animation-range:entry 20% cover 45%}
}}
@keyframes kx-sweep{from{transform:scaleX(0)}to{transform:scaleX(1)}}`,
};

export const wordmark: CustomBlockDef = {
  name: 'prepress/kinetic-wordmark',
  title: 'Kinetic wordmark',
  description: 'A word stretched edge to edge — the giant sign-off at the bottom of a page.',
  icon: 'editor-bold',
  category: 'design',
  attributes: {
    text: { type: 'string', label: 'Word', control: 'text', default: 'KINETIC' },
  },
  template: `<div class="kx-wordmark"><svg viewBox="0 0 1000 200" role="img" aria-label="{{text}}"><text x="0" y="176" textLength="1000" lengthAdjust="spacingAndGlyphs">{{text}}</text></svg></div>`,
  css: `
.kx-wordmark{line-height:0;overflow:hidden}
.kx-wordmark svg{display:block;width:100%;height:auto;overflow:visible}
.kx-wordmark text{font-family:${HEADING};font-weight:800;font-size:232px;letter-spacing:-6px;text-transform:uppercase;fill:currentColor}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){
.kx-wordmark svg{animation:kx-wordmark linear both;animation-timeline:view();animation-range:entry 0% cover 40%}
}}
@keyframes kx-wordmark{from{transform:translateY(40%);opacity:.2}to{transform:none;opacity:1}}`,
};

export const shape: CustomBlockDef = {
  name: 'prepress/kinetic-shape',
  title: 'Kinetic shape',
  description: 'A bold generated graphic — orb, starburst, stripes or dot grid — in the palette, slowly turning.',
  icon: 'star-filled',
  category: 'design',
  attributes: {
    shape: { type: 'string', label: 'Shape', control: 'select', options: ['burst', 'orb', 'stripes', 'grid'], default: 'burst' },
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'm' },
    spin: { type: 'boolean', label: 'Turn slowly', control: 'toggle', default: true },
  },
  template: `<div class="kx-shape" data-shape="{{shape}}" data-size="{{size}}"{{#spin}} data-spin="true"{{/spin}} aria-hidden="true"><svg viewBox="0 0 200 200" class="kx-shape__burst"><path d="${burst()}"/></svg><svg viewBox="0 0 200 200" class="kx-shape__orb"><circle cx="100" cy="100" r="98"/><circle class="kx-shape__hi" cx="72" cy="66" r="26"/></svg><svg viewBox="0 0 200 200" class="kx-shape__stripes"><defs><clipPath id="kx-clip"><circle cx="100" cy="100" r="98"/></clipPath></defs><g clip-path="url(#kx-clip)">${Array.from({ length: 10 }, (_, i) => `<rect x="0" y="${i * 20}" width="200" height="10"/>`).join('')}</g></svg><svg viewBox="0 0 200 200" class="kx-shape__grid">${dotGrid()}</svg></div>`,
  css: `
.kx-shape{display:flex;justify-content:center;align-items:center}
.kx-shape svg{display:none;width:100%;height:auto}
.kx-shape[data-size=s]{width:clamp(4rem,9vw,7rem)}
.kx-shape[data-size=m]{width:clamp(7rem,16vw,13rem)}
.kx-shape[data-size=l]{width:clamp(10rem,28vw,24rem)}
.kx-shape[data-shape=burst] .kx-shape__burst,.kx-shape[data-shape=orb] .kx-shape__orb,.kx-shape[data-shape=stripes] .kx-shape__stripes,.kx-shape[data-shape=grid] .kx-shape__grid{display:block}
.kx-shape__burst path,.kx-shape__orb circle{fill:${C('accent')};stroke:${C('contrast')};stroke-width:2}
.kx-shape__orb .kx-shape__hi{fill:${C('base')};stroke:none;opacity:.55}
.kx-shape__stripes rect{fill:${C('contrast')}}
.kx-shape__grid circle{fill:currentColor}
@media (prefers-reduced-motion:no-preference){
.kx-shape[data-spin=true] svg{animation:kx-turn 24s linear infinite}
.kx-shape[data-spin=true][data-shape=orb] svg{animation:kx-drift 7s ${EASE} infinite alternate}
}
@keyframes kx-turn{to{transform:rotate(360deg)}}
@keyframes kx-drift{to{transform:translate(6%,-6%) scale(1.04)}}`,
};

export const pill: CustomBlockDef = {
  name: 'prepress/kinetic-pill',
  title: 'Kinetic pill',
  description: 'A pill-shaped call to action or tag. Fills with colour from the left on hover; the arrow slips through.',
  icon: 'button',
  category: 'design',
  attributes: {
    label: { type: 'string', label: 'Label', control: 'text', default: 'Start a project' },
    url: { type: 'string', label: 'Link', control: 'url', default: '' },
    look: { type: 'string', label: 'Look', control: 'select', options: ['ink', 'acid', 'outline'], default: 'ink' },
    arrow: { type: 'boolean', label: 'Arrow', control: 'toggle', default: true },
  },
  template: `{{#url}}<a class="kx-pill" data-look="{{look}}" href="{{url}}">{{/url}}{{^url}}<span class="kx-pill" data-look="{{look}}">{{/url}}<span class="kx-pill__label">{{label}}</span>{{#arrow}}<span class="kx-pill__arrow" aria-hidden="true"><span>→</span><span>→</span></span>{{/arrow}}{{#url}}</a>{{/url}}{{^url}}</span>{{/url}}`,
  css: `
.wp-block-prepress-kinetic-pill{display:inline-block}
.kx-pill{position:relative;display:inline-flex;align-items:center;gap:.8em;padding:.95em 1.5em;border:1.5px solid ${C('contrast')};border-radius:999px;font-family:${BODY};font-size:.95rem;font-weight:600;letter-spacing:.01em;line-height:1;text-decoration:none;overflow:hidden;isolation:isolate;transition:color .45s ${EASE}}
.kx-pill::before{content:"";position:absolute;inset:0;z-index:-1;transform:translateX(-101%);transition:transform .55s ${EASE}}
.kx-pill[data-look=ink]{background:${C('contrast')};color:${C('base')}}
.kx-pill[data-look=ink]::before{background:${C('accent')}}
.kx-pill[data-look=acid]{background:${C('accent')};color:${C('contrast')}}
.kx-pill[data-look=acid]::before{background:${C('contrast')}}
.kx-pill[data-look=outline]{background:transparent;color:inherit;border-color:currentColor}
.kx-pill[data-look=outline]::before{background:${C('contrast')}}
.kx-pill:hover::before,.kx-pill:focus-visible::before{transform:none}
.kx-pill[data-look=ink]:hover,.kx-pill[data-look=ink]:focus-visible{color:${C('contrast')}}
.kx-pill[data-look=acid]:hover,.kx-pill[data-look=acid]:focus-visible,.kx-pill[data-look=outline]:hover,.kx-pill[data-look=outline]:focus-visible{color:${C('accent')}}
.kx-pill__arrow{position:relative;display:inline-block;width:1em;height:1em;overflow:hidden}
.kx-pill__arrow span{position:absolute;inset:0;line-height:1;transition:transform .45s ${EASE}}
.kx-pill__arrow span+span{transform:translateX(-120%)}
.kx-pill:hover .kx-pill__arrow span,.kx-pill:focus-visible .kx-pill__arrow span{transform:translateX(120%)}
.kx-pill:hover .kx-pill__arrow span+span,.kx-pill:focus-visible .kx-pill__arrow span+span{transform:none}`,
};

export const BLOCKS: CustomBlockDef[] = [marquee, display, indexRow, label, stat, wordmark, shape, pill];
