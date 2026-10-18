/**
 * Showroom — patterns: sections made of core blocks, the set's block styles
 * (style.ts) and the device drawing. Copy is written for "Norde", a fictional
 * hardware maker launching the Fold 2 foldable phone.
 */
import type { BlockNode } from '../../src/lib/types';
import { b, cols as kitCols, h, img, is, p, section as kitSection, SP, type SetPattern, logo } from '../kit';

export { b, h, p, SP };
type Tone = 'white' | 'mist';
const TONE: Record<Tone, { bg: string; text: string }> = {
  white: { bg: 'base', text: 'contrast' },
  mist: { bg: 'muted', text: 'contrast' },
};
export const sr = (slug: string, attributes: Record<string, unknown> = {}) => b(`prepress/showroom-${slug}`, attributes);
const align = (a: Record<string, any>, textAlign?: string) => (textAlign ? { ...a, style: { ...a.style, typography: { ...a.style?.typography, textAlign } } } : a);
/** The product kicker: SF-style 21px semibold above a headline. */
export const kicker = (content: string, textAlign?: string) => p(content, align({ fontSize: 'large', style: { typography: { fontWeight: '600', letterSpacing: '0.011em' } } }, textAlign));
const lead = (content: string, textAlign?: string) => p(content, align({ fontSize: 'large', style: { typography: { lineHeight: '1.38' } } }, textAlign));
const link = (content: string, url: string, textAlign?: string) => p(`<a href="${url}">${content} ›</a>`, align({ fontSize: 'large' }, textAlign));
const buttons = (items: { text: string; url: string; outline?: boolean; pill?: boolean }[], justify = 'center') =>
  b('core/buttons', { layout: { type: 'flex', justifyContent: justify } }, items.map((i) => b('core/button', { text: i.text, url: i.url, ...(i.outline ? { className: 'is-style-outline' } : i.pill ? { className: is('showroom-pill') } : {}) })));
const cols = (children: BlockNode[][], gap = 40, attrs: Record<string, unknown> = {}, widths: string[] = []) =>
  kitCols(widths, children, { style: { spacing: { blockGap: { left: SP(gap), top: SP(gap) } } }, ...attrs });
/** A white rounded card on a mist band. */
const card = (children: BlockNode[], extra: Record<string, unknown> = {}) =>
  b('core/group', { backgroundColor: 'base', textColor: 'contrast', style: { border: { radius: 'var(--wp--custom--radius--lg)' }, spacing: { padding: { top: SP(60), bottom: SP(50), left: SP(50), right: SP(50) }, blockGap: SP(40) } }, layout: { type: 'constrained' }, ...extra }, children);

/** A full-width section on white or mist. */
export function section(name: string, tone: Tone, children: BlockNode[], pad: { top?: number; bottom?: number; gap?: number; anchor?: string } = {}): BlockNode {
  return kitSection(name, TONE[tone], children, { ...pad, gap: pad.gap ?? 40 });
}

// ---------- records: core blocks + the set's block styles (style.ts) ----------

/** The floating pricing capsule: price (bold) and a line of financing, then a compact pill. */
const capsule = (price = 'From €1,799', note = 'or €74.95/mo. for 24 mo.', label = 'Pre-order', url = '/buy/') =>
  b('core/group', { className: is('showroom-capsule'), backgroundColor: 'base', textColor: 'contrast', layout: { type: 'flex', flexWrap: 'wrap', justifyContent: 'center' } }, [
    p(`<strong>${price}</strong> ${note}`),
    buttons([{ text: label, url, pill: true }]),
  ]);
/** The product's own bar: name, three page links and a compact pill. It sticks to the top while the page scrolls. */
const productBar = () =>
  b('core/group', {
    metadata: { name: 'Product bar' },
    align: 'full',
    className: is('showroom-product-bar'),
    textColor: 'contrast',
    style: { spacing: { padding: { top: SP(30), bottom: SP(30), left: SP(50), right: SP(50) }, margin: { top: '0', bottom: '0' } } },
    layout: { type: 'constrained' },
  }, [
    b('core/group', { align: 'wide', layout: { type: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between' } }, [
      p('<a href="/">Fold 2</a>'),
      b('core/group', { layout: { type: 'flex', flexWrap: 'nowrap' } }, [
        p('<a href="/">Overview</a>'),
        p('<a href="/design/">Design</a>'),
        p('<a href="/specs/">Tech specs</a>'),
        buttons([{ text: 'Buy', url: '/buy/', pill: true }]),
      ]),
    ]),
  ]);
/** In-page links to the chapters of a long product page (each section carries the matching anchor). */
const chapters = (list: [string, string][]) =>
  b('core/list', { className: is('showroom-chapters') }, list.map(([label, id]) => b('core/list-item', { content: `<a href="#${id}">${label}</a>` })));
/** One headline number: figure with its unit, a label and a fine-print note. */
const spec = (value: string, unit: string, label: string, note: string) =>
  b('core/group', { className: is('showroom-spec'), layout: { type: 'default' } }, [p(`${value}<small>${unit}</small>`), p(label), p(note)]);
/** Finish swatches (dark, light, brand, accent) with their names; the first is shown selected. */
const finishes = (names: string[]) => b('core/list', { className: is('showroom-finishes') }, names.map((n) => b('core/list-item', { content: n })));
const fine = (content: string) => p(content, { fontSize: 'fine', className: is('showroom-fine') });

const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/norde';
const pic = (file: string, alt: string, attributes: Record<string, unknown> = {}) => img(`${PICS}/norde-${file}.jpg`, alt, attributes);

export const PATTERNS: SetPattern[] = [
  {
    key: 'local-nav',
    role: 'header',
    title: 'Showroom product bar',
    description: 'The sticky product bar: product name, three page links and a compact blue Buy pill. It sits in the header, under the global nav, and stays at the top while the page scrolls.',
    tags: ['navigation', 'product', 'sticky'],
    sections: [productBar()],
  },
  {
    key: 'hero',
    role: 'hero',
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
        capsule(),
      ], { top: 70, bottom: 80, gap: 40 }),
    ],
  },
  {
    key: 'chapters',
    role: 'list',
    title: 'Showroom chapter links',
    description: 'A centered row of in-page links to the chapters of a long product page, on white with a hairline below.',
    tags: ['navigation', 'anchors'],
    sections: [
      b('core/group', { metadata: { name: 'Chapters' }, tagName: 'nav', ariaLabel: 'On this page', align: 'full', backgroundColor: 'base', textColor: 'contrast', style: { border: { bottom: { width: '1px', style: 'solid', color: 'var:preset|color|secondary' } }, spacing: { padding: { top: '0', bottom: '0', left: SP(50), right: SP(50) }, margin: { top: '0', bottom: '0' } } }, layout: { type: 'constrained' } }, [
          chapters([['Design', 'design'], ['Camera', 'camera'], ['Tech specs', 'specs'], ['Finishes', 'finishes']]),
        ]),
    ],
  },
  {
    key: 'highlights',
    role: 'features',
    title: 'Showroom highlights',
    description: 'The highlights band: a large heading with a blue link opposite, then three white rounded cards — each a short statement over a device drawing.',
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
    role: 'story',
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
    role: 'story',
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
    role: 'showcase',
    title: 'Showroom film still',
    description: 'A full-bleed photograph of the product in use, with a kicker and a short white headline in the lower left.',
    tags: ['hero', 'lifestyle', 'image'],
    sections: [
      b('core/cover', { metadata: { name: 'Film still' }, url: `${PICS}/norde-film.jpg`, alt: 'A woman on a tram at blue hour reading on an unfolded Fold 2', dimRatio: 100, customGradient: 'linear-gradient(to top,color-mix(in srgb,var(--wp--preset--color--contrast) 65%,transparent),transparent 55%)', isDark: true, minHeight: 88, minHeightUnit: 'vh', contentPosition: 'bottom left', align: 'full', className: is('showroom-film'), style: { spacing: { padding: { top: SP(70), bottom: SP(70), left: SP(60), right: SP(60) } } }, layout: { type: 'constrained' } }, [
        kicker('Fold 2 in the wild'),
        h('Made for the in&#8209;between.', 2, { textColor: 'base' }),
        p('The tram, the queue, the ten minutes before the meeting. Open it and the small moments get a big screen.', { textColor: 'base', fontSize: 'large' }),
      ]),
    ],
  },
  {
    key: 'shot-on',
    role: 'gallery',
    title: 'Showroom shot on',
    description: 'Sample photographs: a centered heading and line, then a full-width reel of five portrait shots that scrolls sideways and snaps, each with the lens and mode as a caption.',
    tags: ['gallery', 'camera', 'images'],
    sections: [
      section('Shot on Fold 2', 'white', [
        h('Shot on Fold 2.', 2, { style: { typography: { textAlign: 'center' } } }),
        lead('Unedited, straight from the phone. Swipe for more.', 'center'),
        b('core/group', { align: 'full', className: is('showroom-reel'), layout: { type: 'flex', flexWrap: 'nowrap' } }, [
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
    role: 'showcase',
    title: 'Showroom materials',
    description: 'The finishes photographed: kicker, headline and a line, then a wide rounded photograph of the four colours side by side.',
    tags: ['feature', 'colours', 'image'],
    sections: [
      section('Materials', 'white', [
        kicker('Materials', 'center'),
        h('Titanium, four ways.', 2, { style: { typography: { textAlign: 'center' } } }),
        lead('Graphite, Silver, Deep Blue and Copper. Bead-blasted, so fingerprints have nowhere to hold on.', 'center'),
        pic('materials', 'Four closed Fold 2 phones in graphite, silver, deep blue and copper on travertine', { align: 'wide', className: is('showroom-rounded') }),
      ], { top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'specs',
    role: 'stats',
    title: 'Showroom specs at a glance',
    description: 'Tech specs at a glance on the mist band: a centered heading, four large figures with labels and notes, and a link to the full specifications.',
    tags: ['specs', 'numbers', 'product'],
    sections: [
      section('Specs', 'mist', [
        h('Tech specs at a glance.', 2, { style: { typography: { textAlign: 'center' } } }),
        cols([
          [spec('7.9', '″', 'Inner display', 'LTPO OLED, 1–120 Hz')],
          [spec('48', 'MP', 'Main camera', 'Sensor-shift stabilisation')],
          [spec('2', 'days', 'Battery life', 'Up to 31 hours of video')],
          [spec('219', 'g', 'Weight', 'Titanium frame')],
        ], 50),
        link('See all tech specs', '/specs/', 'center'),
      ], { anchor: 'specs', top: 80, bottom: 80, gap: 60 }),
    ],
  },
  {
    key: 'finishes',
    role: 'showcase',
    title: 'Showroom finishes',
    description: 'Finishes on white: a centered kicker and statement, the four finish swatches and the open foldable below.',
    tags: ['colours', 'product', 'options'],
    sections: [
      section('Finishes', 'white', [
        kicker('Finishes', 'center'),
        h('Four finishes. One you’ll keep.', 2, { style: { typography: { textAlign: 'center' } } }),
        finishes(['Graphite', 'Silver', 'Deep Blue', 'Copper']),
        sr('device', { device: 'fold', size: 'l' }),
      ], { anchor: 'finishes', top: 80, bottom: 80, gap: 50 }),
    ],
  },
  {
    key: 'buy',
    role: 'pricing',
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
    role: 'page-title',
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
    role: 'list',
    title: 'Showroom footnotes',
    description: 'Numbered fine print on the mist band, the way product pages qualify their claims.',
    tags: ['legal', 'footnotes'],
    sections: [
      section('Footnotes', 'mist', [
        fine('1. Battery life varies with use and configuration. Tested with pre-production units in September 2026.'),
        fine('2. Thickness measured at the thinnest point, excluding the camera plateau. Weight varies by configuration and manufacturing process.'),
        fine('3. Finance offer for illustration only. Norde and Fold are fictional names used in this template.'),
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
        logo(`${PICS}/logo-norde-2.png`, 'Norde', [666, 200], 26),
        b('core/navigation', { fontSize: 'fine', layout: { type: 'flex', justifyContent: 'right' }, style: { typography: { fontWeight: '400', letterSpacing: '-0.01em' }, spacing: { blockGap: SP(50) } } }, [
          b('core/navigation-link', { label: 'Fold 2', url: '/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Design', url: '/design/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Tech specs', url: '/specs/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Store', url: '/buy/', kind: 'custom' }),
        ]),
      ]),
    ],
  ),
  productBar(),
];

const footLabel = (t: string) => p(t, { fontSize: 'fine', style: { typography: { fontWeight: '600' } } });
const footNav = (links: [string, string][]) =>
  b('core/navigation', { overlayMenu: 'never', fontSize: 'fine', className: is('showroom-fine'), layout: { type: 'flex', orientation: 'vertical' }, style: { typography: { fontWeight: '400' }, spacing: { blockGap: SP(20) } } }, links.map(([label, url]) => b('core/navigation-link', { label, url, kind: 'custom' })));

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
        [footLabel('About Norde'), fine('A small hardware studio making a few things, slowly and well.')],
      ], 50),
      b('core/separator', { align: 'wide', className: 'is-style-wide' }),
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        fine('© 2026 Norde. A fictional company.'),
        fine('Made with <a href="https://prepress.digitalno.de">Prepress</a>'),
      ]),
    ],
  ),
];
