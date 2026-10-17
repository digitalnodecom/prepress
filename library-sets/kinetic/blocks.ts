/**
 * Kinetic Grotesk — blocks. Two custom blocks: the marquee (an effect around
 * its words, which are an inner paragraph) and generated shapes (art).
 * Everything else in the set — display headlines, eyebrows, section labels,
 * index rows, stats, the wordmark, pills, case pictures — is core blocks with
 * the set's block styles (style.ts), so its text stays editable inline
 * (docs/THEME-SYSTEM.md). Colours come only from the palette variables, motion
 * is pure CSS and switches off under prefers-reduced-motion.
 *
 * Custom-block CSS is global (not scoped by Prepress), so every rule here is
 * namespaced under `.wp-block-prepress-kinetic-<slug>` / `.kx-*`.
 */
import type { CustomBlockDef } from '../../src/lib/types';

const C = (slug: string) => `var(--wp--preset--color--${slug})`;
const HEADING = 'var(--wp--preset--font-family--heading)';
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
  description: 'An endless ticker of words in big grotesk type (the words are the paragraph inside). Pauses on hover; still under reduced motion.',
  icon: 'leftright',
  category: 'design',
  kind: 'effect',
  innerBlocks: { allowed: ['core/paragraph'], template: [{ name: 'core/paragraph', attributes: { content: 'Brand identity ✶ Motion ✶ Websites ✶ Art direction' } }] },
  attributes: {
    size: { type: 'string', label: 'Size', control: 'select', options: ['s', 'm', 'l'], default: 'l' },
    tone: { type: 'string', label: 'Colours', control: 'select', options: ['ink', 'acid', 'paper'], default: 'ink' },
    speed: { type: 'string', label: 'Speed', control: 'select', options: ['slow', 'normal', 'fast'], default: 'normal' },
    reverse: { type: 'boolean', label: 'Run right to left → left to right', control: 'toggle', default: false },
  },
  template: `<div class="kx-marquee" data-size="{{size}}" data-tone="{{tone}}" data-speed="{{speed}}"{{#reverse}} data-reverse="true"{{/reverse}}><div class="kx-marquee__track"><div class="kx-marquee__item">{{{content}}}<b aria-hidden="true">✶</b></div><div class="kx-marquee__item" aria-hidden="true">{{{content}}}<b aria-hidden="true">✶</b></div><div class="kx-marquee__item" aria-hidden="true">{{{content}}}<b aria-hidden="true">✶</b></div><div class="kx-marquee__item" aria-hidden="true">{{{content}}}<b aria-hidden="true">✶</b></div></div></div>`,
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
.kx-marquee__item p,.kx-marquee__item .prepress-inner{margin:0;font:inherit;letter-spacing:inherit;color:inherit}
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

export const shape: CustomBlockDef = {
  name: 'prepress/kinetic-shape',
  title: 'Kinetic shape',
  description: 'A bold generated graphic — orb, starburst, stripes or dot grid — in the palette, slowly turning.',
  icon: 'star-filled',
  category: 'design',
  kind: 'art',
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

export const BLOCKS: CustomBlockDef[] = [marquee, shape];
