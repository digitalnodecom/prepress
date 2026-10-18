/**
 * Night Garden — patterns: sections made of core blocks, the set's block
 * styles (style.ts) and the garden blocks. Copy is written for "Nocturne", an
 * evening garden restaurant and wine bar in a Ljubljana courtyard.
 */
import type { BlockNode } from '../../src/lib/types';
import { b, cols as kitCols, group, h, is, p, row, section as kitSection, SP, type SetPattern, logo } from '../kit';

export { b, h, p, SP };
type Tone = 'night' | 'dusk' | 'leaf';
const TONE: Record<Tone, { bg: string; text: string }> = {
  night: { bg: 'base', text: 'contrast' },
  dusk: { bg: 'muted', text: 'contrast' },
  leaf: { bg: 'secondary', text: 'contrast' },
};

export const ng = (slug: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []) => b(`prepress/garden-${slug}`, attributes, innerBlocks);
/** Small mono label in lantern amber. */
export const label = (content: string, attributes: Record<string, any> = {}) =>
  p(content, { fontFamily: 'mono', fontSize: 'small', textColor: 'accent', ...attributes, style: { ...attributes.style, typography: { letterSpacing: '0.2em', textTransform: 'uppercase', ...attributes.style?.typography } } });
const center = { style: { typography: { textAlign: 'center' } } };
const buttons = (items: { text: string; url: string; outline?: boolean }[], attrs: Record<string, unknown> = {}) =>
  b('core/buttons', attrs, items.map((i) => b('core/button', { text: i.text, url: i.url, ...(i.outline ? { className: 'is-style-outline' } : {}) })));
const cols = (widths: string[], children: BlockNode[][], gap = 70, attrs: Record<string, unknown> = {}) =>
  kitCols(widths, children, { style: { spacing: { blockGap: { left: SP(gap), top: SP(60) } } }, ...attrs });

/** A full-width section in one of the three tones. */
export function section(name: string, tone: Tone, children: BlockNode[], pad: { top?: number; bottom?: number; gap?: number; anchor?: string } = {}): BlockNode {
  return kitSection(name, TONE[tone], children, pad);
}

// ---------- records: core blocks + the set's block styles (style.ts) ----------

/** One dish: name, dietary marks — dotted leader — price, and a line of description. */
const dish = (name: string, price: string, description: string, marks = '') =>
  group({ className: is('garden-dish') }, [row({}, [p(name), ...(marks ? [p(marks)] : []), p(price)]), p(description)]);
/** One line of opening hours; "closed" dims it. */
const hoursRow = (days: string, time: string, note = '', closed = false) =>
  row({ className: is(closed ? 'garden-hours-closed' : 'garden-hours'), layout: { flexWrap: 'wrap' } }, [p(days), p(time), ...(note ? [p(note)] : [])]);
const hoursList = (list: BlockNode[]) => group({ style: { spacing: { blockGap: '0' } } }, list);
/** The reservation card: a link to the booking page and a phone number. No form. */
const reserveCard = (o: { eyebrow?: string; title?: string; detail?: string; label?: string; url?: string; phone?: string; tel?: string } = {}) =>
  group({ className: is('garden-reserve') }, [
    p(o.eyebrow ?? 'Reservations'),
    h(o.title ?? 'Keep a table in the garden', 2),
    p(o.detail ?? 'Wednesday to Saturday from five. Walk-ins welcome at the bar; the garden is best booked.'),
    row({ layout: { flexWrap: 'wrap', justifyContent: 'center' } }, [
      buttons([{ text: `${o.label ?? 'Book a table'} →`, url: o.url ?? 'https://example.com/book' }]),
      p(`or call <a href="tel:${o.tel ?? '+38612345678'}">${o.phone ?? '+386 1 234 5678'}</a>`),
    ]),
  ]);

const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/nocturne';
/** An arch holding one of the set's photographs. */
const photo = (file: string, alt: string, attributes: Record<string, unknown>) => ng('arch', { ...attributes, photo: `${PICS}/nocturne-${file}.jpg`, alt });

export const PATTERNS: SetPattern[] = [
  {
    key: 'hero',
    role: 'hero',
    title: 'Night Garden hero',
    description: 'A lantern-lit italic headline with fireflies, a short welcome and two pill buttons, beside a tall arch with a photograph of the courtyard at night.',
    tags: ['hero', 'restaurant', 'dark'],
    sections: [
      section('Hero', 'night', [
        cols(['56%', '44%'], [
          [
            ng('glow', { light: 'amber', fireflies: true }, [
              label('Garden restaurant & wine bar · Ljubljana'),
              h('Dinner under<br>the <em>lanterns</em>', 1, { fontSize: 'grand', style: { typography: { lineHeight: '0.92', letterSpacing: '-0.02em' } } }),
            ]),
            p('A walled courtyard behind Gornji trg, open from dusk. Small plates from the fire, natural wine from the Karst and a garden that smells of fig leaves after rain.', { fontSize: 'large' }),
            buttons([{ text: 'Book a table', url: '#reserve' }, { text: 'See the menu', url: '/menu/', outline: true }]),
          ],
          [photo('courtyard', 'The fig tree in the courtyard at night, hung with paper lanterns over candle-lit tables', { motif: 'monstera', sky: 'moon', height: 'l' })],
        ], 80, { verticalAlignment: 'center' }),
      ], { top: 70, bottom: 80 }),
    ],
  },
  {
    key: 'story',
    role: 'story',
    title: 'Night Garden story',
    description: 'Our story: an arched photograph of the grill at dusk beside a label, heading, two paragraphs and a slowly turning seal.',
    tags: ['about', 'story', 'restaurant'],
    sections: [
      section('Story', 'dusk', [
        cols(['42%', '58%'], [
          [photo('fire', 'Leeks charring on the wood-fire grill in the garden kitchen', { motif: 'eucalyptus', sky: 'dusk', height: 'm', caption: 'The grill, late September' })],
          [
            label('Our garden'),
            h('A courtyard that wakes up <em>after dark</em>', 2, { fontSize: 'xxx-large' }),
            p('By day it is a quiet square of gravel, a fig tree and three hundred pots. At five the lanterns go on, the kitchen lights the grill and the garden fills with people who meant to stay for one glass.'),
            p('We cook what Mojca grows on the hill above the city and what the fishermen in Piran bring on Thursdays. The menu changes when the garden does.'),
            ng('seal', { text: 'Autumn menu · Open evenings · Since 2019 · ', size: 's', tone: 'accent' }),
          ],
        ], 80, { verticalAlignment: 'center' }),
      ]),
    ],
  },
  {
    key: 'menu',
    role: 'menu',
    title: 'Night Garden menu',
    description: 'A menu section: heading and vine, then two columns of courses with dishes, prices joined by dotted leaders and dietary marks, and a key in mono.',
    tags: ['menu', 'food', 'prices'],
    sections: [
      section('Menu', 'night', [
        b('core/group', { align: 'wide', layout: { type: 'constrained' }, style: { spacing: { blockGap: SP(30) } } }, [
          label('The menu · Autumn', center),
          h('Small plates for <em>long evenings</em>', 2, { fontSize: 'xxx-large', ...center }),
          ng('vine'),
        ]),
        cols(['', ''], [
          [
            h('From the garden', 3, { fontSize: 'x-large', style: { typography: { fontStyle: 'italic' } } }),
            dish('Charred leeks, hazelnut, brown butter', '14', 'Leeks from the hill, cooked in the embers until sweet.', 'v · gf'),
            dish('Figs, goat’s curd, thyme honey', '13', 'From the tree in the courtyard while it lasts.', 'v'),
            dish('Beetroot, horseradish, rye crumb', '12', 'Three colours, one very old vinegar.', 'vg'),
            dish('Bread from the wood oven', '6', 'Sourdough, cultured butter, Piran salt.', 'v'),
          ],
          [
            h('From the fire', 3, { fontSize: 'x-large', style: { typography: { fontStyle: 'italic' } } }),
            dish('Sea bream, fennel, blood orange', '26', 'Whole fish from Piran, cooked over vine cuttings.', 'gf'),
            dish('Lamb shoulder, smoked aubergine', '29', 'Slow on the grill, finished with mint and yoghurt.', 'gf'),
            dish('Pumpkin, sage, brown butter gnocchi', '21', 'Made by hand every afternoon.', 'v'),
            dish('Chocolate, olive oil, sea salt', '10', 'Dark, warm, served with a spoon and no apology.', 'v'),
          ],
        ], 80),
        p('v vegetarian · vg vegan · gf gluten-free · Ask us about allergies; the kitchen is small but listens.', { fontFamily: 'mono', fontSize: 'small', ...center }),
      ], { top: 80, bottom: 80, gap: 60 }),
    ],
  },
  {
    key: 'evenings',
    role: 'features',
    title: 'Night Garden evenings',
    description: 'Evenings and events: three arched photographs — fish, records, a long supper table — each with a mono date line, a title and one sentence.',
    tags: ['events', 'cards', 'restaurant'],
    sections: [
      section('Evenings', 'dusk', [
        label('Evenings', center),
        h('Something on most nights', 2, { fontSize: 'xxx-large', ...center }),
        cols(['', '', ''], [
          [photo('fish', 'A whole grilled sea bream with fennel and blood orange', { motif: 'poppy', sky: 'dusk', height: 's' }), label('Thursdays · 19:00'), h('Fish from Piran', 3, { fontSize: 'x-large' }), p('Whatever the boat brought in, cooked whole over the fire. Until it’s gone.')],
          [photo('records', 'A record player and a crate of vinyl on a garden table at night', { motif: 'fern', sky: 'moon', height: 's' }), label('Fridays · 21:00'), h('Records in the garden', 3, { fontSize: 'x-large' }), p('A guest brings a crate of vinyl. Quiet enough to talk, loud enough to stay.')],
          [photo('supper', 'Guests raising glasses at a long candle-lit table', { motif: 'moonflower', sky: 'amber', height: 's' }), label('Last Sunday · 18:00'), h('Winemakers’ supper', 3, { fontSize: 'x-large' }), p('Five courses, five bottles and the people who made them. Twenty-four seats.')],
        ], 60),
      ], { top: 80, bottom: 80, gap: 40 }),
    ],
  },
  {
    key: 'visit',
    role: 'contact',
    title: 'Night Garden visit',
    description: 'Hours and directions: a timetable of opening hours with dotted leaders beside the address, how to find the gate, a directions button and a line-drawn fern.',
    tags: ['hours', 'location', 'contact'],
    sections: [
      section('Visit', 'night', [
        cols(['50%', '50%'], [
          [
            label('Opening hours'),
            h('When the lanterns are on', 2, { fontSize: 'xx-large' }),
            hoursList([
              hoursRow('Monday – Tuesday', 'Closed', '', true),
              hoursRow('Wednesday – Thursday', '17:00 – 23:00', 'Kitchen until 22:00'),
              hoursRow('Friday – Saturday', '17:00 – 00:30', 'Kitchen until 22:30'),
              hoursRow('Sunday', '12:00 – 18:00', 'Long lunch only'),
            ]),
          ],
          [
            label('Find us'),
            h('Through the green gate', 2, { fontSize: 'xx-large' }),
            p('Gornji trg 17, 1000 Ljubljana. Walk past the bakery and through the archway; the gate is under the wisteria.'),
            p('Five minutes from Prešeren Square on foot. No parking in the old town — the Kongresni trg garage is ten minutes away.', { fontSize: 'small' }),
            buttons([{ text: 'Directions', url: 'https://www.openstreetmap.org/search?query=Gornji%20trg%2017%20Ljubljana', outline: true }]),
            ng('botanical', { motif: 'fern', drawing: 'line', size: 's', tone: 'accent' }),
          ],
        ], 80),
      ], { top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'reserve',
    role: 'cta',
    title: 'Night Garden reservation',
    description: 'The reservation card glowing on the night background: a title, one line about when to come, a booking button and a phone number.',
    tags: ['cta', 'booking', 'restaurant'],
    sections: [
      section('Reserve', 'night', [reserveCard()], { top: 80, bottom: 80, anchor: 'reserve' }),
    ],
  },
  {
    key: 'press',
    role: 'testimonial',
    title: 'Night Garden press',
    description: 'Kind words: three short italic quotes in large Cormorant with their sources in mono, on the leaf-green band.',
    tags: ['testimonials', 'press', 'quotes'],
    sections: [
      section('Press', 'leaf', [
        label('Kind words', center),
        cols(['', '', ''], [
          [p('“The best seat in Ljubljana is under the fig tree at about half past nine.”', { fontFamily: 'heading', fontSize: 'x-large', style: { typography: { fontStyle: 'italic', lineHeight: '1.2' } } }), label('— Delo, Food & Drink')],
          [p('“A garden that cooks. Order the bread, then order more bread.”', { fontFamily: 'heading', fontSize: 'x-large', style: { typography: { fontStyle: 'italic', lineHeight: '1.2' } } }), label('— Monocle')],
          [p('“Quietly one of the loveliest evenings in Central Europe.”', { fontFamily: 'heading', fontSize: 'x-large', style: { typography: { fontStyle: 'italic', lineHeight: '1.2' } } }), label('— Condé Nast Traveller')],
        ], 70),
      ], { top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'private-dining',
    role: 'showcase',
    title: 'Night Garden private dining',
    description: 'Private dining: a label, heading, a paragraph, the facts in mono and a button, beside a tall arched photograph of the glasshouse set for dinner.',
    tags: ['private', 'events', 'booking'],
    sections: [
      section('Private dining', 'dusk', [
        cols(['55%', '45%'], [
          [
            label('Private dining'),
            h('The glasshouse, <em>for twelve</em>', 2, { fontSize: 'xxx-large' }),
            p('At the end of the garden, under the vines, a small glasshouse with one long table. Birthdays, long dinners, the night before a wedding. We cook a set menu around the season and your guests.'),
            p('Up to 12 guests · Set menu from €85 · Wine pairing from €45 · Available every evening', { fontFamily: 'mono', fontSize: 'small', style: { typography: { letterSpacing: '0.08em', lineHeight: '1.9' } } }),
            buttons([{ text: 'Ask about a date', url: 'mailto:glasshouse@nocturne.example' }]),
          ],
          [photo('glasshouse', 'The glasshouse set for a private dinner, candles down one long table', { motif: 'moonflower', sky: 'amber', height: 'l', caption: 'The glasshouse' })],
        ], 80, { verticalAlignment: 'center' }),
      ], { top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'gallery',
    role: 'gallery',
    title: 'Night Garden arches',
    description: 'A row of three arched photographs from the garden at night — the north wall, the kitchen beds, the fig tree — with captions.',
    tags: ['gallery', 'illustration', 'decor'],
    sections: [
      section('Gallery', 'night', [
        cols(['', '', ''], [
          [photo('north-wall', 'Ferns on the old north wall under a paper lantern', { motif: 'fern', sky: 'moon', height: 'm', caption: 'The north wall' })],
          [photo('kitchen-beds', 'Raised herb beds at dusk with a lantern on a post', { motif: 'poppy', sky: 'dusk', height: 'm', caption: 'The kitchen beds' })],
          [photo('fig', 'Ripe figs on the courtyard tree, lit by a lantern', { motif: 'eucalyptus', sky: 'amber', height: 'm', caption: 'The fig tree' })],
        ], 50),
      ], { top: 60, bottom: 80 }),
    ],
  },
  {
    key: 'page-title',
    role: 'page-title',
    title: 'Night Garden page title',
    description: 'A page opener: amber mono label, a large italic headline under a soft moon glow, a line of introduction and a vine.',
    tags: ['title', 'header'],
    sections: [
      section('Page title', 'night', [
        label('The menu', center),
        h('What the garden <em>gave us</em>', 1, center),
        p('Small plates to share, a few large ones not to. Written each week around the garden, the boats and the weather.', { fontSize: 'large', ...center }),
        ng('vine'),
      ], { top: 80, bottom: 40, gap: 50 }),
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
      style: { spacing: { padding: { top: SP(40), bottom: SP(40), left: SP(50), right: SP(50) } }, border: { bottom: { width: '1px', color: 'var:preset|color|secondary', style: 'solid' } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        logo(`${PICS}/logo-nocturne-2.png`, 'Nocturne', [546, 200], 44),
        b('core/group', { layout: { type: 'flex', flexWrap: 'wrap' }, style: { spacing: { blockGap: SP(50) } } }, [
          b('core/navigation', { fontFamily: 'mono', fontSize: 'small', layout: { type: 'flex', justifyContent: 'right' }, style: { typography: { fontWeight: '400', textTransform: 'uppercase', letterSpacing: '0.16em' }, spacing: { blockGap: SP(50) } } }, [
            b('core/navigation-link', { label: 'Menu', url: '/menu/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Evenings', url: '/evenings/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Visit', url: '/visit/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Private dining', url: '/private-dining/', kind: 'custom' }),
          ]),
          b('core/buttons', { className: is('garden-desktop-only') }, [b('core/button', { text: 'Book', url: '#reserve' })]),
        ]),
      ]),
    ],
  ),
];

export const FOOTER: BlockNode[] = [
  b(
    'core/group',
    {
      metadata: { name: 'Footer' },
      align: 'full',
      backgroundColor: 'muted',
      textColor: 'contrast',
      style: { spacing: { padding: { top: SP(80), bottom: SP(50), left: SP(50), right: SP(50) }, blockGap: SP(60) } },
      layout: { type: 'constrained' },
    },
    [
      cols(['36%', '32%', '32%'], [
        [
          ng('seal', { text: 'Nocturne · Garden & wine · Ljubljana · ', size: 's', tone: 'accent' }),
          b('core/site-title', { level: 0, fontFamily: 'heading', fontSize: 'xx-large', style: { typography: { fontStyle: 'italic', fontWeight: '300' } } }),
          p('A garden restaurant and wine bar, open from dusk.', { fontSize: 'small' }),
        ],
        [
          label('Evenings'),
          hoursList([
            hoursRow('Wed – Thu', '17 – 23'),
            hoursRow('Fri – Sat', '17 – 00:30'),
            hoursRow('Sunday', '12 – 18'),
          ]),
        ],
        [
          label('Find us'),
          p('Gornji trg 17<br>1000 Ljubljana<br><a href="tel:+38612345678">+386 1 234 5678</a>'),
          b('core/navigation', { overlayMenu: 'never', fontFamily: 'mono', fontSize: 'small', layout: { type: 'flex', orientation: 'vertical' }, style: { typography: { textTransform: 'uppercase', letterSpacing: '0.14em' }, spacing: { blockGap: SP(20) } } }, [
            b('core/navigation-link', { label: 'Menu', url: '/menu/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Evenings', url: '/evenings/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Visit', url: '/visit/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Private dining', url: '/private-dining/', kind: 'custom' }),
          ]),
        ],
      ], 60),
      ng('vine', { align: 'wide' }),
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        p('© 2026 Nocturne', { fontFamily: 'mono', fontSize: 'small', style: { typography: { letterSpacing: '0.16em', textTransform: 'uppercase' } } }),
        p('Made with <a href="https://prepress.digitalno.de">Prepress</a>', { fontFamily: 'mono', fontSize: 'small', style: { typography: { letterSpacing: '0.16em', textTransform: 'uppercase' } } }),
      ]),
    ],
  ),
];
