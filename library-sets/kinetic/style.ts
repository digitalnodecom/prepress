/**
 * Kinetic Grotesk — style: design tokens + theme.json patch.
 *
 * Paper, ink and one acid accent. The accent is only ever a *background* under
 * ink text (acid on paper fails contrast), never text on paper.
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color, font } from '../kit';

export const DESIGN: Design = {
  palette: {
    base: '#f2f0ea', // paper
    contrast: '#0e0e0e', // ink
    primary: '#0e0e0e',
    secondary: '#e2dfd5',
    accent: '#d7ff3a', // acid
    muted: '#e9e6de',
  },
  headingFont: 'syne',
  bodyFont: 'inter',
  radius: 'none',
  stickyHeader: true,
  contentSize: '760px',
  wideSize: '1440px',
};

/** Paper grain: an SVG turbulence tile, very faint. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .055 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const THEME_JSON = {
  settings: {
    typography: {
      // A patched list replaces the generated one: keep the six base sizes, add display + mega.
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.875rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Medium', size: '1.0625rem', fluid: { min: '1rem', max: '1.0625rem' } },
        { slug: 'large', name: 'Large', size: '1.5rem', fluid: { min: '1.25rem', max: '1.5rem' } },
        { slug: 'x-large', name: 'Extra Large', size: '2.25rem', fluid: { min: '1.75rem', max: '2.5rem' } },
        { slug: 'xx-large', name: 'Huge', size: '3.5rem', fluid: { min: '2.5rem', max: '4rem' } },
        { slug: 'xxx-large', name: 'Gigantic', size: '5rem', fluid: { min: '3rem', max: '6rem' } },
        { slug: 'statement', name: 'Statement', size: '3.5rem', fluid: { min: '1.7rem', max: '4.25rem' } },
        { slug: 'display', name: 'Display', size: '7rem', fluid: { min: '3rem', max: '8.5rem' } },
        { slug: 'mega', name: 'Mega', size: '12rem', fluid: { min: '3.6rem', max: '14rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.55' },
    elements: {
      heading: { typography: { fontWeight: '800', lineHeight: '0.95', letterSpacing: '-0.035em' } },
      h1: { typography: { textTransform: 'uppercase', letterSpacing: '-0.05em', lineHeight: '0.86' } },
      h2: { typography: { textTransform: 'uppercase', letterSpacing: '-0.045em', lineHeight: '0.9' } },
      link: { typography: { textDecoration: 'underline' } },
      button: {
        border: { radius: '999px', width: '1.5px', style: 'solid', color: 'var(--wp--preset--color--contrast)' },
        color: { background: 'var(--wp--preset--color--contrast)', text: 'var(--wp--preset--color--base)' },
        typography: { fontWeight: '600', letterSpacing: '0.01em' },
        ':hover': { color: { background: 'var(--wp--preset--color--accent)', text: 'var(--wp--preset--color--contrast)' } },
      },
    },
    css: [
      // Turning stickers and marquees may poke past the edge; never scroll sideways (clip keeps sticky working).
      '.wp-site-blocks{overflow-x:clip}',
      `body{background-image:${GRAIN};background-attachment:fixed;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}`,
      '::selection{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--contrast)}',
      ':where(a,button,summary,[tabindex]):focus-visible{outline:3px solid var(--wp--preset--color--accent);outline-offset:3px;box-shadow:0 0 0 6px var(--wp--preset--color--contrast)}',
      'a{text-underline-offset:.18em;text-decoration-thickness:1px}',
      'a:hover{text-decoration-thickness:2px}',
      '.kx-hl{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--contrast);padding:0 .12em;box-decoration-break:clone;-webkit-box-decoration-break:clone}',
      '.kx-outline{-webkit-text-fill-color:transparent;-webkit-text-stroke:.03em currentColor}',
      ':where(.has-background) a:where(:not([class*=kx-]):not(.wp-block-button__link)){color:inherit}',
      '.has-accent-background-color .kx-hl{background:var(--wp--preset--color--contrast);color:var(--wp--preset--color--accent)}',
      ':where(h1,h2,h3,h4,.has-statement-font-size,.has-xx-large-font-size,.has-xxx-large-font-size,.has-display-font-size,.has-mega-font-size){overflow-wrap:normal;word-break:normal;hyphens:manual}',
      '.wp-block-separator.is-style-wide{border-top-width:1px}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
    ].join('\n'),
  },
};

const HEADING = font('heading');
const BODY = font('body');
const EASE = 'cubic-bezier(.2,.7,.1,1)';
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('kinetic', slug, label, types, { css });

/** Shared by the three pill looks: a fill slides in from the left on hover, the arrow slips through. */
const PILL = (bg: string, text: string, fill: string, hover: string, border = color('contrast')) => `position:relative;display:inline-flex;align-items:center;gap:.8em;padding:.95em 1.5em;border:1.5px solid ${border};border-radius:999px;background:${bg};color:${text};font-family:${BODY};font-size:.95rem;font-weight:600;letter-spacing:.01em;line-height:1;text-decoration:none;overflow:hidden;isolation:isolate;transition:color .45s ${EASE};
&::before{content:"";position:absolute;inset:0;z-index:-1;background:${fill};transform:translateX(-101%);transition:transform .55s ${EASE}}
&::after{content:"→";display:inline-block;width:1em;height:1em;overflow:hidden;white-space:nowrap;line-height:1;text-shadow:-1.2em 0 currentColor;transition:text-indent .45s ${EASE}}
&:hover,&:focus-visible{background:${bg};color:${hover}}
&:hover::before,&:focus-visible::before{transform:none}
&:hover::after,&:focus-visible::after{text-indent:1.2em}`;

/** Kinetic's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  S('eyebrow', 'Eyebrow (rule + caps)', ['core/paragraph'], `display:flex;align-items:center;gap:.9em;font-family:${BODY};font-size:.78rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
&::before{content:"";flex:none;width:2.5rem;height:1px;background:currentColor}
@media (prefers-reduced-motion:no-preference){&{animation:kx-rise 1.1s ${EASE} .08s both}}
@keyframes kx-rise{from{opacity:0;transform:translateY(.35em) skewY(3deg);clip-path:inset(0 0 100% 0)}to{opacity:1;transform:none;clip-path:inset(0 0 -10% 0)}}`),
  S('display', 'Display (screen-wide, accent dot)', ['core/heading'], `margin-bottom:0;font-family:${HEADING};font-weight:800;text-transform:uppercase;line-height:.84;letter-spacing:-.055em;text-wrap:balance;font-size:clamp(2.4rem,13.2vw,16rem);overflow-wrap:normal;word-break:normal;hyphens:manual;
&::after{content:"";display:inline-block;width:.17em;height:.17em;margin-left:.05em;border-radius:50%;background:${color('accent')};box-shadow:0 0 0 .02em ${color('contrast')};vertical-align:baseline}
:where(.has-accent-background-color) &::after{background:${color('contrast')}}
@media (prefers-reduced-motion:no-preference){&{animation:kx-rise 1.1s ${EASE} both}&::after{animation:kx-pulse 2.4s ${EASE} 1.1s infinite}
@supports (animation-timeline:view()){&:not(h1){animation:kx-rise linear both;animation-timeline:view();animation-range:entry 0% cover 35%}}}
@keyframes kx-rise{from{opacity:0;transform:translateY(.35em) skewY(3deg);clip-path:inset(0 0 100% 0)}to{opacity:1;transform:none;clip-path:inset(0 0 -10% 0)}}
@keyframes kx-pulse{0%,100%{transform:scale(1)}50%{transform:scale(.55)}}`),
  S('label', 'Section label (sticky)', ['core/paragraph'], `position:sticky;top:calc(var(--pp-header-h, 0px) + 1.5rem);align-self:start;display:flex;flex-direction:column;gap:.35rem;font-family:${BODY};font-size:.8rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
& strong{font-family:${HEADING};font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;letter-spacing:-.04em;line-height:1}`),
  S('index-row', 'Index row (floods on hover)', ['core/group'], `position:relative;display:grid;grid-template-columns:4rem 1fr auto 4.5rem 2.5rem;align-items:center;gap:1.25rem;margin-block:0!important;padding:clamp(1rem,2.2vw,1.6rem) .75rem;border-top:1px solid currentColor;isolation:isolate;overflow:hidden;
&:last-child{border-bottom:1px solid currentColor}
& > p{margin:0!important}
&::before{content:"";position:absolute;inset:0;z-index:-1;background:${color('contrast')};transform:scaleY(0);transform-origin:bottom;transition:transform .55s ${EASE}}
&::after{content:"↗";justify-self:end;font-size:1.6rem;line-height:1;opacity:.3;transition:transform .55s ${EASE},opacity .3s}
& > p:nth-child(1),& > p:nth-child(4){font-family:${BODY};font-size:.8rem;font-weight:600;letter-spacing:.14em;font-variant-numeric:tabular-nums}
& > p:nth-child(2){min-width:0;margin:0 -.6rem 0 0!important;font-family:${HEADING};font-weight:800;text-transform:uppercase;letter-spacing:-.035em;line-height:.95;font-size:clamp(1.3rem,3.3vw,3.2rem);overflow-wrap:normal;word-break:normal;transition:margin .55s ${EASE}}
& > p:nth-child(2) a{color:inherit;text-decoration:none}
& > p:nth-child(2) a::after{content:"";position:absolute;inset:0}
& > p:nth-child(3){font-family:${BODY};font-size:.9rem;opacity:.75}
&:has(a:hover),&:has(a:focus-visible){color:${color('base')}}
&:has(a:hover)::before,&:has(a:focus-visible)::before{transform:none}
&:has(a:hover) > p:nth-child(2),&:has(a:focus-visible) > p:nth-child(2){margin:0 -1.2rem 0 .6rem!important;color:${color('accent')}}
&:has(a:hover)::after,&:has(a:focus-visible)::after{transform:translate(.15em,-.15em) rotate(45deg);opacity:1;color:${color('accent')}}
@media (max-width:720px){&{grid-template-columns:2.5rem 1fr 2rem}& > p:nth-child(3),& > p:nth-child(4){display:none!important}&::after{opacity:1;transform:none}}`),
  S('stat', 'Stat (number + caption)', ['core/group'], `display:flex;flex-direction:column;gap:.75rem;
& > p{margin:0!important}
& > p:first-child{position:relative;padding-bottom:.18em;font-family:${HEADING};font-weight:800;font-size:clamp(3rem,6vw,6.5rem);line-height:.82;letter-spacing:-.06em;font-variant-numeric:tabular-nums;white-space:nowrap}
& > p:first-child sup{font-size:.36em;vertical-align:top;margin-left:.04em;letter-spacing:0}
& > p:first-child::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:.09em;background:${color('accent')};transform-origin:left}
& > p:last-child{font-family:${BODY};font-size:.82rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){& > p:first-child::after{animation:kx-sweep linear both;animation-timeline:view();animation-range:entry 20% cover 45%}}}
@keyframes kx-sweep{from{transform:scaleX(0)}to{transform:scaleX(1)}}`),
  // Fitted to a seven-letter word (KINETIC), like the old SVG's textLength; a longer word needs a smaller font size.
  S('wordmark', 'Wordmark (condensed, edge to edge)', ['core/group'], `container-type:inline-size;overflow:hidden;
& > p{margin:0;font-family:${HEADING};font-weight:800;font-size:22.3cqi;line-height:.9;letter-spacing:-.026em;text-transform:uppercase;white-space:nowrap;scale:.665 1;transform-origin:0 50%}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){& > p{animation:kx-wordmark linear both;animation-timeline:view();animation-range:entry 0% cover 40%}}}
@keyframes kx-wordmark{from{transform:translateY(40%);opacity:.2}to{transform:none;opacity:1}}`),
  S('case', 'Case picture (acid frame on hover)', ['core/image'], `& img{display:block;width:100%;height:auto;transition:outline-offset .25s,outline-color .25s;outline:.5rem solid transparent;outline-offset:0}
& a:hover img,& a:focus-visible img{outline-color:${color('accent')};outline-offset:-.5rem}
& figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.25rem 1rem;margin-top:.9rem;font-size:var(--wp--preset--font-size--small);font-weight:600;letter-spacing:.1em;text-transform:uppercase;text-align:left}
& figcaption strong{font-family:${HEADING};font-size:1.35rem;font-weight:800;letter-spacing:-.02em}`),
  S('pill', 'Pill (ink, floods acid)', ['core/button'], PILL(color('contrast'), color('base'), color('accent'), color('contrast'))),
  S('pill-acid', 'Pill (acid, floods ink)', ['core/button'], PILL(color('accent'), color('contrast'), color('contrast'), color('accent'))),
  S('pill-outline', 'Pill (outline)', ['core/button'], PILL('transparent', 'inherit', color('contrast'), color('accent'), 'currentColor')),
  S('header-cta', 'Hidden on phones', ['core/buttons'], '@media (max-width:640px){&{display:none!important}}'),
];

export const STYLE = {
  key: 'style',
  title: 'Kinetic Grotesk',
  description: 'Swiss-brutalist studio style: paper, ink and one acid accent; screen-wide Syne display type over Inter, pill buttons that flood acid on hover, paper grain.',
  tags: ['brutalist', 'studio', 'grotesk', 'bold'],
};
