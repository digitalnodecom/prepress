/**
 * Showroom — patterns for a product launch. Copy is written for "Norde", a
 * fictional hardware maker launching the Fold 2 foldable phone.
 */
import type { BlockNode } from '../../src/lib/types';

type Tone = 'white' | 'mist';
const TONE: Record<Tone, { backgroundColor: string; textColor: string }> = {
  white: { backgroundColor: 'base', textColor: 'contrast' },
  mist: { backgroundColor: 'muted', textColor: 'contrast' },
};
export const SP = (n: number) => `var:preset|spacing|${n}`;

export const b = (name: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []): BlockNode => ({ name, attributes, ...(innerBlocks.length ? { innerBlocks } : {}) });
export const sr = (slug: string, attributes: Record<string, unknown> = {}) => b(`prepress/showroom-${slug}`, attributes);
export const p = (content: string, attributes: Record<string, any> = {}) => b('core/paragraph', { content, ...attributes });
export const h = (content: string, level: number, attributes: Record<string, unknown> = {}) => b('core/heading', { content, level, ...attributes });
const align = (a: Record<string, any>, textAlign?: string) => (textAlign ? { ...a, style: { ...a.style, typography: { ...a.style?.typography, textAlign } } } : a);
/** The product kicker: SF-style 21px semibold above a headline. */
export const kicker = (content: string, textAlign?: string) => p(content, align({ fontSize: 'large', style: { typography: { fontWeight: '600', letterSpacing: '0.011em' } } }, textAlign));
const lead = (content: string, textAlign?: string) => p(content, align({ fontSize: 'large', style: { typography: { lineHeight: '1.38' } } }, textAlign));
const link = (content: string, url: string, textAlign?: string) => p(`<a href="${url}">${content} ›</a>`, align({ fontSize: 'large' }, textAlign));
const buttons = (items: { text: string; url: string; outline?: boolean }[], justify = 'center') =>
  b('core/buttons', { layout: { type: 'flex', justifyContent: justify } }, items.map((i) => b('core/button', { text: i.text, url: i.url, ...(i.outline ? { className: 'is-style-outline' } : {}) })));
const cols = (children: BlockNode[][], gap = 40, attrs: Record<string, unknown> = {}, widths: string[] = []) =>
  b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: SP(gap), top: SP(gap) } } }, ...attrs }, children.map((c, i) => b('core/column', widths[i] ? { width: widths[i] } : {}, c)));
/** A white 28px card on a mist band. */
const card = (children: BlockNode[], extra: Record<string, unknown> = {}) =>
  b('core/group', { backgroundColor: 'base', textColor: 'contrast', style: { border: { radius: '28px' }, spacing: { padding: { top: SP(60), bottom: SP(50), left: SP(50), right: SP(50) }, blockGap: SP(40) } }, layout: { type: 'constrained' }, ...extra }, children);

export function section(name: string, tone: Tone, children: BlockNode[], pad: { top?: number; bottom?: number; gap?: number; anchor?: string } = {}): BlockNode {
  return b(
    'core/group',
    {
      metadata: { name },
      ...(pad.anchor ? { anchor: pad.anchor } : {}),
      align: 'full',
      ...TONE[tone],
      style: { spacing: { padding: { top: SP(pad.top ?? 80), bottom: SP(pad.bottom ?? 80), left: SP(50), right: SP(50) }, margin: { top: '0', bottom: '0' }, blockGap: SP(pad.gap ?? 40) } },
      layout: { type: 'constrained' },
    },
    children,
  );
}

const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/norde';
const pic = (file: string, alt: string, attributes: Record<string, unknown> = {}) => b('core/image', { url: `${PICS}/norde-${file}.jpg`, alt, ...attributes });

export interface SetPattern {
  key: string;
  title: string;
  description: string;
  tags: string[];
  sections: BlockNode[];
}

export const PATTERNS: SetPattern[] = [
  {
    key: 'local-nav',
    title: 'Showroom product bar',
    description: 'The sticky product bar: product name, three page links and a compact blue Buy pill. Place it first on a product page.',
    tags: ['navigation', 'product', 'sticky'],
    sections: [sr('localnav', { align: 'full' })],
  },
  {
    key: 'hero',
    title: 'Showroom launch hero',
    description: 'A centered launch stage on white: product name, a small “New” label, a tight headline, availability, a pill and a link — then the foldable, unfolding as it comes into view, with a floating pricing capsule.',
    tags: ['hero', 'product', 'launch'],
    sections: [
      section('Hero', 'white', [
        p('New', { fontSize: 'small', textColor: 'accent', style: { typography: { fontWeight: '600', textAlign: 'center' } } }),
        kicker('Norde Fold 2', 'center'),
        h('Unfold the big picture.', 1, { style: { typography: { textAlign: 'center' } } }),
        lead('Pre-order now. Available from 30 October.', 'center'),
        buttons([{ text: 'Pre-order', url: '/buy/' }, { text: 'Learn more', url: '/design/', outline: true }]),
        sr('device', { device: 'fold', size: 'xl', align: 'wide' }),
        sr('pricing'),
      ], { top: 70, bottom: 80, gap: 40 }),
    ],
  },
  {
    key: 'chapters',
    title: 'Showroom chapter links',
    description: 'A centered row of in-page links to the chapters of a long product page, on white with a hairline below.',
    tags: ['navigation', 'anchors'],
    sections: [
      b('core/group', { metadata: { name: 'Chapters' }, align: 'full', backgroundColor: 'base', textColor: 'contrast', style: { border: { bottom: { width: '1px', style: 'solid', color: 'var:preset|color|secondary' } }, spacing: { padding: { top: '0', bottom: '0', left: SP(50), right: SP(50) }, margin: { top: '0', bottom: '0' } } }, layout: { type: 'constrained' } }, [sr('chapters')]),
    ],
  },
  {
    key: 'highlights',
    title: 'Showroom highlights',
    description: 'The highlights band: a large heading with a blue link opposite, then three white 28px cards — each a short statement over a device drawing.',
    tags: ['features', 'cards', 'product'],
    sections: [
      section('Highlights', 'mist', [
        b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', verticalAlignment: 'bottom', flexWrap: 'wrap' } }, [
          h('Get the highlights.', 2),
          link('Watch the film', '/design/'),
        ]),
        cols([
          [card([h('A 7.9″ canvas that folds into a pocket.', 3, { style: { typography: { textAlign: 'center' } } }), sr('device', { device: 'fold', size: 'm' })])],
          [card([h('48MP camera. Shoots like a flagship.', 3, { style: { typography: { textAlign: 'center' } } }), sr('device', { device: 'camera', size: 's' })])],
          [card([h('Unlocks from your wrist.', 3, { style: { typography: { textAlign: 'center' } } }), sr('device', { device: 'watch', size: 's' })])],
        ], 40),
      ], { top: 80, bottom: 80, gap: 60 }),
    ],
  },
  {
    key: 'design',
    title: 'Showroom design chapter',
    description: 'An editorial chapter on white: a small kicker, a large left-aligned statement and body copy, with the folded phone drawn large beside it.',
    tags: ['feature', 'editorial', 'product'],
    sections: [
      section('Design', 'white', [
        cols([
          [
            kicker('Design'),
            h('Thinner than ever. Folded or&nbsp;not.', 2),
            p('At 5.6 mm open and 11.2 mm closed, Fold 2 is the slimmest phone we have ever made. A new teardrop hinge closes flat without a gap, and a titanium frame keeps the whole thing lighter than most phones that don’t fold at all.'),
            p('The cover display is a full-width 6.3″ screen, so everything you do every day works without opening it. When you want more, it is one motion away.'),
            link('Explore the design', '/design/'),
          ],
          [sr('device', { device: 'closed', size: 'l' })],
        ], 80, { verticalAlignment: 'center' }, ['48%', '52%']),
      ], { anchor: 'design', top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'camera',
    title: 'Showroom camera chapter',
    description: 'The editorial chapter reversed: the camera back drawn large on the left, kicker, statement, body copy and a link on the right.',
    tags: ['feature', 'editorial', 'camera'],
    sections: [
      section('Camera', 'white', [
        cols([
          [sr('device', { device: 'camera', size: 'l' })],
          [
            kicker('Camera'),
            h('Three lenses. One very steady hand.', 2),
            p('A 48MP main camera with sensor-shift stabilisation, a 5× telephoto and an ultra-wide that doubles as a macro. Open the phone and the inner screen becomes the largest viewfinder you have ever held.'),
            p('Night mode now works on every lens, and video records in 4K at 120 fps — open, closed or half-folded on a table.'),
            link('See what it can shoot', '/specs/'),
          ],
        ], 80, { verticalAlignment: 'center' }, ['50%', '50%']),
      ], { anchor: 'camera', top: 40, bottom: 80 }),
    ],
  },
  {
    key: 'film',
    title: 'Showroom film still',
    description: 'A full-bleed photograph of the product in use, with a kicker and a short white headline in the lower left.',
    tags: ['hero', 'lifestyle', 'image'],
    sections: [
      b('core/cover', { metadata: { name: 'Film still' }, url: `${PICS}/norde-film.jpg`, alt: 'A woman on a tram at blue hour reading on an unfolded Fold 2', dimRatio: 20, overlayColor: 'contrast', isDark: true, minHeight: 88, minHeightUnit: 'vh', contentPosition: 'bottom left', align: 'full', className: 'sr-film', style: { spacing: { padding: { top: SP(70), bottom: SP(70), left: SP(60), right: SP(60) } } }, layout: { type: 'constrained' } }, [
        kicker('Fold 2 in the wild'),
        h('Made for the in&#8209;between.', 2, { textColor: 'base' }),
        p('The tram, the queue, the ten minutes before the meeting. Open it and the small moments get a big screen.', { textColor: 'base', fontSize: 'large' }),
      ]),
    ],
  },
  {
    key: 'shot-on',
    title: 'Showroom shot on',
    description: 'Sample photographs: a centered heading and line, then a full-width reel of five portrait shots that scrolls sideways and snaps, each with the lens and mode as a caption.',
    tags: ['gallery', 'camera', 'images'],
    sections: [
      section('Shot on Fold 2', 'white', [
        h('Shot on Fold 2.', 2, { style: { typography: { textAlign: 'center' } } }),
        lead('Unedited, straight from the phone. Swipe for more.', 'center'),
        b('core/group', { align: 'full', className: 'sr-reel', layout: { type: 'flex', flexWrap: 'nowrap' } }, [
          pic('shot-night', 'A wet cobbled street in Ljubljana at night, a figure with an umbrella', { caption: 'Night mode · Main camera · Ljubljana' }),
          pic('shot-portrait', 'A smiling older man in a café in soft window light', { caption: 'Portrait · 2× · Café Zvezda' }),
          pic('shot-tele', 'A jagged alpine peak above valleys of morning mist', { caption: '5× Telephoto · Julian Alps' }),
          pic('shot-macro', 'Dew drops on an unfurling fern at sunrise', { caption: 'Macro · Ultra Wide · 2 cm' }),
          pic('shot-wide', 'The coastal town of Piran and its bell tower at sunset', { caption: 'Ultra Wide · 0.5× · Piran' }),
        ]),
      ], { anchor: 'shot-on', top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'materials',
    title: 'Showroom materials',
    description: 'The finishes photographed: kicker, headline and a line, then a wide rounded photograph of the four colours side by side.',
    tags: ['feature', 'colours', 'image'],
    sections: [
      section('Materials', 'white', [
        kicker('Materials', 'center'),
        h('Titanium, four ways.', 2, { style: { typography: { textAlign: 'center' } } }),
        lead('Graphite, Silver, Deep Blue and Copper. Bead-blasted, so fingerprints have nowhere to hold on.', 'center'),
        pic('materials', 'Four closed Fold 2 phones in graphite, silver, deep blue and copper on travertine', { align: 'wide', className: 'sr-rounded' }),
      ], { top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'specs',
    title: 'Showroom specs at a glance',
    description: 'Tech specs at a glance on the mist band: a centered heading, four large figures with labels and notes, and a link to the full specifications.',
    tags: ['specs', 'numbers', 'product'],
    sections: [
      section('Specs', 'mist', [
        h('Tech specs at a glance.', 2, { style: { typography: { textAlign: 'center' } } }),
        cols([
          [sr('spec', { value: '7.9', unit: '″', label: 'Inner display', note: 'LTPO OLED, 1–120 Hz' })],
          [sr('spec', { value: '48', unit: 'MP', label: 'Main camera', note: 'Sensor-shift stabilisation' })],
          [sr('spec', { value: '2', unit: 'days', label: 'Battery life', note: 'Up to 31 hours of video' })],
          [sr('spec', { value: '219', unit: 'g', label: 'Weight', note: 'Titanium frame' })],
        ], 50),
        link('See all tech specs', '/specs/', 'center'),
      ], { anchor: 'specs', top: 80, bottom: 80, gap: 60 }),
    ],
  },
  {
    key: 'finishes',
    title: 'Showroom finishes',
    description: 'Finishes on white: a centered kicker and statement, the four finish swatches and the open foldable below.',
    tags: ['colours', 'product', 'options'],
    sections: [
      section('Finishes', 'white', [
        kicker('Finishes', 'center'),
        h('Four finishes. One you’ll keep.', 2, { style: { typography: { textAlign: 'center' } } }),
        sr('finishes'),
        sr('device', { device: 'fold', size: 'l' }),
      ], { anchor: 'finishes', top: 80, bottom: 80, gap: 50 }),
    ],
  },
  {
    key: 'buy',
    title: 'Showroom which one',
    description: 'Which one is right for you: two white cards side by side on mist, each with a device, name, price, a blue pill and an outline button.',
    tags: ['pricing', 'compare', 'cta'],
    sections: [
      section('Buy', 'mist', [
        h('Which Fold is right for you?', 2, { style: { typography: { textAlign: 'center' } } }),
        cols([
          [card([
            sr('device', { device: 'fold', size: 'm' }),
            p('New', { fontSize: 'small', textColor: 'accent', style: { typography: { fontWeight: '600', textAlign: 'center' } } }),
            h('Fold 2', 3, { style: { typography: { textAlign: 'center' } } }),
            p('7.9″ inner display, 48MP camera, titanium.', { style: { typography: { textAlign: 'center' } } }),
            p('From €1,799', { style: { typography: { fontWeight: '600', textAlign: 'center' } } }),
            buttons([{ text: 'Buy', url: '/buy/' }, { text: 'Learn more', url: '/design/', outline: true }]),
          ])],
          [card([
            sr('device', { device: 'closed', size: 's' }),
            h('Fold 2 Mini', 3, { style: { typography: { textAlign: 'center' } } }),
            p('Folds to the size of a card. 6.7″ inside.', { style: { typography: { textAlign: 'center' } } }),
            p('From €1,099', { style: { typography: { fontWeight: '600', textAlign: 'center' } } }),
            buttons([{ text: 'Buy', url: '/buy/' }, { text: 'Learn more', url: '/specs/', outline: true }]),
          ])],
        ], 40),
      ], { top: 80, bottom: 80, gap: 60 }),
    ],
  },
  {
    key: 'page-title',
    title: 'Showroom page title',
    description: 'A centered page opener on white: product kicker, a tight headline and one line of lead copy.',
    tags: ['title', 'header'],
    sections: [
      section('Page title', 'white', [
        kicker('Fold 2', 'center'),
        h('Designed to disappear in&nbsp;your&nbsp;pocket.', 1, { style: { typography: { textAlign: 'center' } } }),
        lead('Titanium, a gapless hinge and two screens that never feel like a compromise.', 'center'),
      ], { top: 80, bottom: 40, gap: 30 }),
    ],
  },
  {
    key: 'footnotes',
    title: 'Showroom footnotes',
    description: 'Numbered fine print on the mist band, the way product pages qualify their claims.',
    tags: ['legal', 'footnotes'],
    sections: [
      section('Footnotes', 'mist', [
        p('1. Battery life varies with use and configuration. Tested with pre-production units in September 2026.', { fontSize: 'fine', className: 'sr-fine' }),
        p('2. Thickness measured at the thinnest point, excluding the camera plateau. Weight varies by configuration and manufacturing process.', { fontSize: 'fine', className: 'sr-fine' }),
        p('3. Finance offer for illustration only. Norde and Fold are fictional names used in this template.', { fontSize: 'fine', className: 'sr-fine' }),
      ], { top: 50, bottom: 30, gap: 30 }),
    ],
  },
];

export const HEADER: BlockNode[] = [
  b(
    'core/group',
    {
      metadata: { name: 'Header' },
      align: 'full',
      backgroundColor: 'base',
      textColor: 'contrast',
      style: { spacing: { padding: { top: SP(30), bottom: SP(30), left: SP(50), right: SP(50) } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'nowrap' } }, [
        b('core/site-title', { level: 0, fontSize: 'medium', style: { typography: { fontWeight: '600', letterSpacing: '-0.02em' } } }),
        b('core/navigation', { fontSize: 'fine', layout: { type: 'flex', justifyContent: 'right' }, style: { typography: { fontWeight: '400', letterSpacing: '-0.01em' }, spacing: { blockGap: SP(50) } } }, [
          b('core/navigation-link', { label: 'Fold 2', url: '/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Design', url: '/design/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Tech specs', url: '/specs/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Store', url: '/buy/', kind: 'custom' }),
        ]),
      ]),
    ],
  ),
];

const footLabel = (t: string) => p(t, { fontSize: 'fine', style: { typography: { fontWeight: '600' } } });
const footNav = (links: [string, string][]) =>
  b('core/navigation', { overlayMenu: 'never', fontSize: 'fine', className: 'sr-fine', layout: { type: 'flex', orientation: 'vertical' }, style: { typography: { fontWeight: '400' }, spacing: { blockGap: SP(20) } } }, links.map(([label, url]) => b('core/navigation-link', { label, url, kind: 'custom' })));

export const FOOTER: BlockNode[] = [
  b(
    'core/group',
    {
      metadata: { name: 'Footer' },
      align: 'full',
      backgroundColor: 'muted',
      textColor: 'contrast',
      style: { spacing: { padding: { top: SP(40), bottom: SP(50), left: SP(50), right: SP(50) }, blockGap: SP(40) } },
      layout: { type: 'constrained' },
    },
    [
      b('core/separator', { align: 'wide', className: 'is-style-wide' }),
      cols([
        [footLabel('Fold 2'), footNav([['Overview', '/'], ['Design', '/design/'], ['Tech specs', '/specs/']])],
        [footLabel('Store'), footNav([['Buy Fold 2', '/buy/'], ['Compare', '/buy/']])],
        [footLabel('About Norde'), p('A small hardware studio making a few things, slowly and well.', { fontSize: 'fine', className: 'sr-fine' })],
      ], 50),
      b('core/separator', { align: 'wide', className: 'is-style-wide' }),
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        p('© 2026 Norde. A fictional company.', { fontSize: 'fine', className: 'sr-fine' }),
        p('Made with <a href="https://prepress.digitalno.de">Prepress</a>', { fontSize: 'fine', className: 'sr-fine' }),
      ]),
    ],
  ),
];
