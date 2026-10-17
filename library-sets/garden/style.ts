/**
 * Night Garden — style: design tokens + theme.json patch. The first dark style:
 * base is the night, contrast the moonlight. Lantern amber is the only accent
 * (≈8:1 on base, so it works as text and as a button with dark text).
 */
import type { BlockStyleDef, Design } from '../../src/lib/types';
import { blockStyle, color, font, radius } from '../kit';

export const DESIGN: Design = {
  palette: {
    base: '#0e1411', // night
    contrast: '#ece5d3', // moonlight
    primary: '#ece5d3',
    secondary: '#1d2a22', // leaf shadow
    accent: '#d9a35f', // lantern
    muted: '#141c17',
  },
  headingFont: 'cormorant',
  bodyFont: 'dm-sans',
  monoFont: 'dm-mono',
  radius: 'round',
  stickyHeader: true,
  contentSize: '720px',
  wideSize: '1280px',
};

/** Film grain for dark surfaces: light specks, very faint. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .85 0 0 0 .045 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export const THEME_JSON = {
  settings: {
    typography: {
      fontSizes: [
        { slug: 'small', name: 'Small', size: '0.875rem', fluid: { min: '0.8125rem', max: '0.875rem' } },
        { slug: 'medium', name: 'Medium', size: '1.0625rem', fluid: { min: '1rem', max: '1.0625rem' } },
        { slug: 'large', name: 'Large', size: '1.375rem', fluid: { min: '1.2rem', max: '1.375rem' } },
        { slug: 'x-large', name: 'Extra Large', size: '2rem', fluid: { min: '1.6rem', max: '2.1rem' } },
        { slug: 'xx-large', name: 'Huge', size: '3rem', fluid: { min: '2.2rem', max: '3.2rem' } },
        { slug: 'xxx-large', name: 'Gigantic', size: '4.25rem', fluid: { min: '2.8rem', max: '4.6rem' } },
        { slug: 'display', name: 'Display', size: '6rem', fluid: { min: '3.2rem', max: '6.5rem' } },
        { slug: 'grand', name: 'Grand', size: '8rem', fluid: { min: '3.6rem', max: '8.75rem' } },
      ],
    },
  },
  styles: {
    typography: { lineHeight: '1.65' },
    elements: {
      heading: { typography: { fontWeight: '400', lineHeight: '1.02', letterSpacing: '-0.01em' } },
      h1: { typography: { fontSize: 'var:preset|font-size|display', fontWeight: '300', lineHeight: '0.95' } },
      h2: { typography: { fontWeight: '300', lineHeight: '1' } },
      h3: { typography: { fontWeight: '500', lineHeight: '1.1' } },
      link: { color: { text: 'var:preset|color|accent' } },
      button: {
        color: { background: 'var:preset|color|accent', text: 'var:preset|color|base' },
        typography: { fontFamily: 'var:preset|font-family|mono', fontSize: 'var:preset|font-size|small', fontWeight: '500', letterSpacing: '0.14em', textTransform: 'uppercase' },
        ':hover': { color: { background: 'var:preset|color|contrast', text: 'var:preset|color|base' } },
      },
    },
    css: [
      ':root{color-scheme:dark}',
      // The hero glow bleeds past the column on purpose; never scroll sideways (clip keeps sticky working).
      '.wp-site-blocks{overflow-x:clip}',
      'body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}',
      `:where(.has-base-background-color,.has-muted-background-color,.has-secondary-background-color){background-image:${GRAIN}}`,
      'h1,h2{font-style:italic}',
      'h1,h2,h3{text-wrap:balance}',
      'p{text-wrap:pretty}',
      'h1 em,h2 em,h3 em{color:var(--wp--preset--color--accent)}',
      'a{text-decoration-thickness:1px;text-underline-offset:.22em}',
      ':where(.has-accent-background-color) a:where(:not(.wp-element-button,.wp-block-button__link)){color:inherit}',
      '::selection{background:var(--wp--preset--color--accent);color:var(--wp--preset--color--base)}',
      ':where(a,button,summary,[tabindex]):focus-visible{outline:2px solid var(--wp--preset--color--accent);outline-offset:3px}',
      '.wp-element-button,.wp-block-button__link{padding:1em 1.9em;transition:background-color .25s,color .25s}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:not(.has-background){border:1px solid currentColor;padding:calc(1em - 1px) calc(1.9em - 1px)}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:not(.has-text-color){color:var(--wp--preset--color--contrast)}',
      '.wp-block-button.is-style-outline>.wp-block-button__link:hover{background:var(--wp--preset--color--contrast);color:var(--wp--preset--color--base)}',
      '.wp-block-separator{border:0;border-top:1px solid color-mix(in srgb,currentColor 22%,transparent);opacity:1}',
      '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}',
    ].join('\n'),
  },
};

const MONO = font('mono');
const MIX = (slug: string, pct: number, other = 'transparent') => `color-mix(in srgb, ${color(slug)} ${pct}%, ${other})`;
const S = (slug: string, label: string, types: string[], css: string) => blockStyle('garden', slug, label, types, { css });
/** One line of opening hours: days — dotted leader — time, an optional note underneath. */
const HOURS = `display:flex;flex-wrap:wrap;align-items:baseline;gap:0 .6em;margin-block-start:.2rem!important;margin-block-end:0;padding:.55em 0;border-bottom:1px solid ${MIX('contrast', 14)};
&::after{content:"";order:1;flex:1 1 1rem;border-bottom:1px dotted ${MIX('contrast', 35)};transform:translateY(-.3em)}
& > p{margin:0!important}
& > p:first-child{font-family:${font('heading')};font-style:italic;font-size:1.3rem}
& > p:nth-child(2){order:2;font-family:${MONO};font-size:.85rem;letter-spacing:.04em;font-variant-numeric:tabular-nums}
& > p:nth-child(3){order:3;flex-basis:100%;font-family:${MONO};font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:${color('accent')}}`;

/** Night Garden's named looks for core blocks: picked (or removed) in each block's Styles panel. */
export const BLOCK_STYLES: BlockStyleDef[] = [
  S('dish', 'Menu item (dot leader)', ['core/group'], `margin-block-start:1.4rem;
& > .wp-block-group{display:flex;flex-wrap:nowrap;align-items:baseline;gap:.55em;margin:0!important}
& > .wp-block-group::after{content:"";order:1;flex:1 1 1.5rem;min-width:1rem;border-bottom:1px dotted ${MIX('contrast', 40)};transform:translateY(-.3em)}
& > .wp-block-group > p{margin:0!important}
& > .wp-block-group > p:first-child{font-family:${font('heading')};font-weight:500;font-size:1.45rem;line-height:1.15;text-wrap:balance}
& > .wp-block-group > p:not(:first-child,:last-child){flex:none;font-family:${MONO};font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:${color('accent')}}
& > .wp-block-group > p:last-child:not(:first-child){order:2;flex:none;font-family:${MONO};font-size:.95rem;font-variant-numeric:tabular-nums}
& > p{margin:.3em 0 0!important;max-width:34em;font-family:${font('body')};font-size:.92rem;line-height:1.5;color:${MIX('contrast', 74, color('base'))}}`),
  S('hours', 'Opening hours (dot leader)', ['core/group'], HOURS),
  S('hours-closed', 'Opening hours, closed (dimmed)', ['core/group'], `${HOURS}
opacity:.5;`),
  S('reserve', 'Reservation card (glowing)', ['core/group'], `position:relative;isolation:isolate;padding:clamp(2rem,5vw,3.75rem) clamp(1.5rem,5vw,4rem)!important;border:1px solid ${MIX('accent', 45)};border-radius:${radius('lg')};background:${color('muted')};text-align:center;box-shadow:0 0 0 6px ${MIX('accent', 6)},0 30px 120px -20px ${MIX('accent', 30)};
& > p:first-child{margin:0;font-family:${MONO};font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:${color('accent')}}
& > h2{margin:.4em 0 0!important;font-family:${font('heading')};font-style:italic;font-weight:300;font-size:clamp(2.2rem,5vw,3.6rem);line-height:1;letter-spacing:0}
& > h2 + p{margin:1em auto 0!important;max-width:34em;color:${MIX('contrast', 80, color('base'))}}
& > .wp-block-group{gap:1rem 1.5rem;margin:1.8em 0 0!important;align-items:center}
& > .wp-block-group > .wp-block-buttons{margin:0}
& > .wp-block-group > p{margin:0;font-family:${MONO};font-size:.8rem;letter-spacing:.06em}
& > .wp-block-group > p a{color:inherit}`),
  S('desktop-only', 'Hidden on phones', ['core/buttons', 'core/group'], '@media (max-width:640px){&{display:none!important}}'),
];

export const STYLE = {
  key: 'style',
  title: 'Night Garden',
  description: 'Dark hospitality style: night green, moonlight cream and lantern amber; italic Cormorant Garamond over DM Sans, DM Mono for prices and hours, round pills and arches.',
  tags: ['dark', 'restaurant', 'hospitality', 'elegant'],
};
