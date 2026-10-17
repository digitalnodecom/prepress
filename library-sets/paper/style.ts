/**
 * Paper Edition — style: design tokens + theme.json patch.
 *
 * Warm paper, ink and one oxblood accent (7.9:1 on paper, so it works as text:
 * links, numbers, drop caps). Fraunces for display, Newsreader for reading,
 * IBM Plex Mono for datelines and numerals. A 680px measure (~68 characters).
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color, font } from '../kit';

export const DESIGN: Design = {
  palette: {
    base: '#f4efe4', // paper
    contrast: '#1c1a16', // ink
    primary: '#1c1a16',
    secondary: '#e7dfcd', // rules, tints
    accent: '#8a2b22', // oxblood
    muted: '#ece5d4',
  },
  headingFont: 'fraunces',
  bodyFont: 'newsreader',
  monoFont: 'ibm-plex-mono',
  radius: 'none',
  stickyHeader: true,
  contentSize: '680px',
  wideSize: '1240px',
};

/** Paper fibre: a warm, very faint turbulence tile. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .1 0 0 0 .05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const THEME_JSON = {
  settings: {
    typography: {
      // A patched list replaces the generated one: the six base sizes on a reading scale, plus headline + nameplate.
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Medium', size: '1.1875rem', fluid: { min: '1.0625rem', max: '1.1875rem' } },
        { slug: 'large', name: 'Large', size: '1.45rem', fluid: { min: '1.25rem', max: '1.45rem' } },
        { slug: 'x-large', name: 'Extra Large', size: '1.9rem', fluid: { min: '1.5rem', max: '2rem' } },
        { slug: 'xx-large', name: 'Huge', size: '2.75rem', fluid: { min: '2rem', max: '2.9rem' } },
        { slug: 'xxx-large', name: 'Gigantic', size: '3.75rem', fluid: { min: '2.5rem', max: '4rem' } },
        { slug: 'headline', name: 'Headline', size: '4.75rem', fluid: { min: '2.6rem', max: '5.5rem' } },
        { slug: 'nameplate', name: 'Nameplate', size: '8rem', fluid: { min: '3.2rem', max: '9rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.62' },
    elements: {
      heading: { typography: { fontWeight: '400', lineHeight: '1.08', letterSpacing: '-0.015em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|headline', lineHeight: '1', letterSpacing: '-0.03em' } },
      h2: { typography: { lineHeight: '1.04', letterSpacing: '-0.022em' } },
      h3: { typography: { lineHeight: '1.12' } },
      link: { color: { text: 'var:preset|color|accent' } },
      button: {
        color: { background: 'var:preset|color|contrast', text: 'var:preset|color|base' },
        typography: { fontFamily: 'var:preset|font-family|mono', fontSize: 'var:preset|font-size|small', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase' },
        spacing: { padding: { top: '.95em', bottom: '.95em', left: '1.6em', right: '1.6em' } },
        ':hover': { color: { background: 'var:preset|color|accent', text: 'var:preset|color|base' } },
      },
    },
    css: [
      `body{background-image:${GRAIN};background-attachment:fixed;font-feature-settings:"kern","liga","onum";font-optical-sizing:auto;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}`,
      'h1,h2,h3,h4{text-wrap:balance;font-feature-settings:"kern","liga","lnum"}',
      'p{text-wrap:pretty;hanging-punctuation:first allow-end last}',
      'sup{font-family:var(--wp--preset--font-family--mono);font-size:.62em;line-height:0;color:var(--wp--preset--color--accent);padding-left:.1em}',
      ':where(.has-background) sup{color:inherit}',
      'a{text-decoration-thickness:1px;text-underline-offset:.2em}',
      'a:hover{text-decoration-thickness:2px}',
      ':where(.has-background:not(.has-base-background-color,.has-muted-background-color,.has-secondary-background-color)) a:where(:not(.wp-element-button,.wp-block-button__link)){color:inherit}',
      '::selection{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--base)}',
      ':where(a,button,summary,[tabindex]):focus-visible{outline:2px solid var(--wp--preset--color--accent);outline-offset:3px}',
      '.wp-block-button.is-style-outline>.wp-block-button__link{border-width:1px}',
      '.wp-block-separator{border:0;border-top:1px solid currentColor;opacity:1}',
      '.wp-block-site-title a{font-style:normal}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
    ].join('\n'),
  },
};

const MONO = font('mono');
const HAIR = 'color-mix(in srgb, currentColor 22%, transparent)';
const EASE = 'cubic-bezier(.25,.6,.2,1)';
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('paper', slug, label, types, { css });
/** Shared by the two pull-quote looks: italic display type, cite in mono. */
const PULL = `margin:var(--wp--preset--spacing--40) 0 0;padding:0;text-align:left;
& blockquote{margin:0}
& p{margin:0;font-family:var(--wp--preset--font-family--heading);font-style:italic;font-weight:300;font-size:clamp(1.6rem,3.1vw,2.55rem);line-height:1.14;letter-spacing:-.012em;text-wrap:balance}
& cite{display:block;margin-top:1.1em;font-family:${MONO};font-size:.72rem;font-style:normal;letter-spacing:.14em;text-transform:uppercase}
& cite::before{content:"— "}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){& p{animation:pe-rise linear both;animation-timeline:view();animation-range:entry 0% entry 70%}}}
@keyframes pe-rise{from{opacity:0;transform:translateY(.4em)}}`;
/** A separator drawn as two short rules around a glyph; the rules grow out from the glyph as it scrolls in. */
const GLYPH = (glyph: string, size: string) => `color:inherit;border:0;height:auto;min-height:1.75rem;display:flex;align-items:center;justify-content:center;opacity:1;
background:linear-gradient(90deg,transparent calc(50% - 1.7em - 7rem),currentColor 0 calc(50% - 1.7em),transparent 0 calc(50% + 1.7em),currentColor 0 calc(50% + 1.7em + 7rem),transparent 0) center/100% 1px no-repeat;
&::before{content:"${glyph}";font-family:var(--wp--preset--font-family--heading);font-size:${size};line-height:1;color:${color('accent')}}
:where(.has-accent-background-color) &::before{color:inherit}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){&{animation:pe-draw linear both;animation-timeline:view();animation-range:entry 10% cover 35%}}}
@keyframes pe-draw{from{background-size:0% 1px}}`;

/** Paper's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  S('masthead', 'Masthead', ['core/group'], `border-block:6px double currentColor;text-align:center;
& > .wp-block-group:first-child{padding-block:.75em;border-bottom:1px solid currentColor;font-family:${MONO};font-size:.72rem;letter-spacing:.14em;text-transform:uppercase}
& > .wp-block-group:first-child p{margin:0}
& h1{margin:0;padding:.08em 0 .02em;font-weight:500;line-height:.92;letter-spacing:-.035em;font-optical-sizing:auto;text-wrap:balance}
& > p:last-child{margin:0;padding:.7em 0 .8em;border-top:1px solid currentColor;font-style:italic;font-size:1.05rem}
@media (max-width:640px){& > .wp-block-group:first-child p:nth-child(2){display:none}}
@media (prefers-reduced-motion:no-preference){& h1{animation:pe-settle 1.4s ${EASE} both}}
@keyframes pe-settle{from{opacity:0;letter-spacing:.02em}}`),
  S('lede', 'Lede (drop cap)', ['core/paragraph'], `font-size:1.14em;line-height:1.55;text-wrap:pretty;
&::first-letter{float:left;margin:.06em .1em 0 -.02em;font-family:var(--wp--preset--font-family--heading);font-weight:500;font-size:4.35em;line-height:.8;color:${color('accent')}}
@supports (initial-letter:3) or (-webkit-initial-letter:3){&::first-letter{float:none;margin:0 .12em 0 0;font-size:inherit;line-height:inherit;-webkit-initial-letter:3;initial-letter:3}}
& strong:first-child{font-variant-caps:all-small-caps;letter-spacing:.07em;font-weight:500}`),
  S('rule', 'Between rules', ['core/pullquote'], `${PULL}
padding:1.3em 0 1.4em;border-block:1px solid currentColor;
& p::before{content:"“";margin-left:-.42em;color:${color('accent')}}
:where(.has-accent-background-color) & p::before{color:inherit}`),
  S('centred', 'Centred under a fleuron', ['core/pullquote'], `${PULL}
text-align:center;padding-block:.4em;
&::before{content:"❦";display:block;margin-bottom:.6em;font-size:1.5rem;color:${color('accent')}}
:where(.has-accent-background-color) &::before{color:inherit}`),
  S('sidenote', 'Margin note', ['core/group'], `& p{margin:0;padding:.85em 0 .9em;border-block:1px solid ${HAIR};font-size:.86rem;line-height:1.5;font-style:italic}
& p strong:first-child{margin-right:.7em;font-family:${MONO};font-size:.72rem;font-style:normal;font-weight:400;color:${color('accent')}}
@media (min-width:1180px){&{position:relative;height:0;margin-block:0!important}& p{position:absolute;bottom:0;left:calc(100% + 2.75rem);width:13.5rem;border-block:0;border-top:1px solid ${HAIR};padding:.6em 0 .2em}}`),
  S('byline', 'Byline', ['core/group'], `gap:.4em 1.5em;padding:.8em 0;border-block:1px solid currentColor;font-family:${MONO};font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;
& p{margin:0}
& strong{font-weight:600}`),
  S('asterism', 'Asterism ⁂', ['core/separator'], GLYPH('⁂', '2rem')),
  S('fleuron', 'Fleuron ❦', ['core/separator'], GLYPH('❦', '1.75rem')),
  S('double', 'Double rule', ['core/separator'], 'color:inherit;border:0;height:auto;min-height:1.5em;opacity:1;background:linear-gradient(currentColor 0 0) center calc(50% - 1.5px)/100% 1px no-repeat,linear-gradient(currentColor 0 0) center calc(50% + 1.5px)/100% 1px no-repeat'),
  S('index-row', 'Index row (dot leader)', ['core/group'], `display:grid;grid-template-columns:3.4rem 1fr;align-items:baseline;margin:0!important;padding:.95em 0 1em;border-top:1px solid ${HAIR};
&:last-child{border-bottom:1px solid ${HAIR}}
& > p:first-child{margin:0;font-family:${MONO};font-size:.75rem;letter-spacing:.06em;color:${color('accent')}}
& > .wp-block-group{margin:0!important}
& > .wp-block-group > p:first-child{margin:0 0 .3em!important;font-family:${MONO};font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
& .wp-block-group .wp-block-group{display:flex;align-items:baseline;gap:.6em;margin:0!important}
& .wp-block-group .wp-block-group::after{content:"";order:1;flex:1 1 2rem;min-width:1.5rem;border-bottom:2px dotted currentColor;opacity:.35;transform:translateY(-.28em);transition:opacity .3s}
& h3{flex:0 1 auto;margin:0;font-weight:400;font-size:clamp(1.3rem,2.3vw,1.85rem);line-height:1.15;letter-spacing:-.01em;text-wrap:balance;transition:color .3s}
& h3 a{color:inherit;text-decoration:none}
& h3 + p{order:2;flex:none;margin:0!important;font-family:${MONO};font-size:.75rem;letter-spacing:.06em;white-space:nowrap}
&:has(a:hover) h3,&:has(a:focus-visible) h3{font-style:italic;color:${color('accent')}}
&:has(a:hover) .wp-block-group .wp-block-group::after{opacity:.9}
:where(.has-accent-background-color,.has-contrast-background-color) & > p:first-child{color:inherit}
@media (max-width:560px){&{grid-template-columns:2.4rem 1fr}}`),
  S('plate', 'Plate (printed photo)', ['core/image'], `& img{filter:grayscale(1) contrast(1.06);mix-blend-mode:multiply}
& figcaption{margin-top:.8em;font-family:${MONO};font-size:.72rem;letter-spacing:.06em;text-align:left;color:color-mix(in srgb,currentColor 72%,transparent)}`),
  S('desktop-only', 'Hidden on phones', ['core/buttons', 'core/group'], '@media (max-width:640px){&{display:none!important}}'),
];

export const STYLE = {
  key: 'style',
  title: 'Paper Edition',
  description: 'Editorial reading style: warm paper, ink and one oxblood accent; Fraunces headlines, Newsreader text and IBM Plex Mono datelines on a 68-character measure.',
  tags: ['editorial', 'serif', 'newsletter', 'reading'],
};
