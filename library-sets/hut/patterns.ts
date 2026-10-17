/**
 * Passport — patterns. Copy is written for "Sedmera", a fictional walk-in
 * hut above the Seven Lakes Valley in Slovenia's Julian Alps (real valley,
 * real trails; the hut, prices, phone and email are samples). Pictures are
 * public-domain postcards and a CC0 panorama from Wikimedia Commons, hosted
 * by Prepress and credited in the footer.
 */
import type { BlockNode } from '../../src/lib/types';

export const SP = (n: number) => `var:preset|spacing|${n}`;
export const b = (name: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []): BlockNode => ({ name, attributes, ...(innerBlocks.length ? { innerBlocks } : {}) });
export const hp = (slug: string, attributes: Record<string, unknown> = {}) => b(`prepress/hut-${slug}`, attributes);
export const p = (content: string, attributes: Record<string, any> = {}) => b('core/paragraph', { content, ...attributes });
export const h = (content: string, level: number, attributes: Record<string, unknown> = {}) => b('core/heading', { content, level, ...attributes });
const img = (file: string, alt: string, attributes: Record<string, unknown> = {}) => b('core/image', { url: `${PICS}/${file}.jpg`, alt, ...attributes });
const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/sedmera';
export const BOOK = 'mailto:book@sedmera.example?subject=Bunk%20request&body=Dates%3A%0ANumber%20of%20people%3A%0AHalf%20board%3A%20yes%20%2F%20no';
const button = (text: string, url = BOOK, attrs: Record<string, unknown> = {}) => b('core/buttons', {}, [b('core/button', { text, url, ...attrs })]);
const details = (summary: string, ...paras: string[]) => b('core/details', { summary }, paras.map((t) => p(t)));

type Ground = 'base' | 'secondary' | 'accent' | 'muted';
export function section(name: string, ground: Ground, children: BlockNode[], o: { top?: number; bottom?: number; gap?: number; anchor?: string; className?: string } = {}): BlockNode {
  return b(
    'core/group',
    {
      metadata: { name },
      ...(o.anchor ? { anchor: o.anchor } : {}),
      ...(o.className ? { className: o.className } : {}),
      align: 'full',
      backgroundColor: ground,
      textColor: ground === 'accent' ? 'muted' : 'contrast',
      style: { spacing: { padding: { top: SP(o.top ?? 80), bottom: SP(o.bottom ?? 80), left: SP(50), right: SP(50) }, margin: { top: '0', bottom: '0' }, blockGap: SP(o.gap ?? 50) } },
      layout: { type: 'constrained' },
    },
    children,
  );
}

const moment = (caption: string, text: string, picture: BlockNode) => b('core/group', { layout: { type: 'default' }, style: { spacing: { blockGap: SP(20) } } }, [p(caption), p(text), picture]);

export interface SetPattern {
  key: string;
  title: string;
  description: string;
  tags: string[];
  sections: BlockNode[];
}

export const PATTERNS: SetPattern[] = [
  {
    key: 'hero',
    title: 'Passport page hero',
    description: 'The first screen as a page of a walker’s mountain passport on a sand field: the name in two staggered lines of condensed capitals, one sentence, three facts between diamonds and the hut’s stamp pressed at an angle. The card runs off the bottom of the screen.',
    tags: ['hero', 'hospitality', 'outdoor'],
    sections: [section('Passport', 'base', [hp('pass')], { top: 20, bottom: 0 })],
  },
  {
    key: 'walk',
    title: 'The walk up, as a row of moments',
    description: 'A row of moments told left to right and dragged sideways: a caption, three lines, a varying gap and a 4:5 picture each, with a progress bar that fills as the row scrolls. The last moment is the passport stamp.',
    tags: ['how-it-works', 'story', 'carousel'],
    sections: [
      section('The walk', 'base', [
        b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', verticalAlignment: 'bottom', flexWrap: 'wrap' } }, [
          h('Four and a half hours up', 2),
          p('The Bohinj trail, the way most people walk it. Drag the row.', { fontSize: 'large', style: { typography: { fontStyle: 'italic' } } }),
        ]),
        b('core/group', { align: 'wide', layout: { type: 'default' } }, [b('core/spacer', { height: '6px', className: 'hp-bar' })]),
        b('core/group', { align: 'full', className: 'hp-row', layout: { type: 'flex', flexWrap: 'nowrap', verticalAlignment: 'stretch' } }, [
          moment('Seven in the morning, Bohinj', 'Leave the car at the Savica car park, 653 m. Fill your bottles: there is no water for three hours.', img('sedmera-bohinj-1960s', 'Lake Bohinj from above with the mountains behind, mid-century postcard')),
          moment('The wall', 'Forty zigzags up a limestone face. Cables on the steep parts; take them slowly in the wet.', img('sedmera-ridge-climb', 'Walkers roped together on a rocky ridge in the Julian Alps, early twentieth-century postcard')),
          moment('Black Lake, 1,294 m', 'The first of the seven, dark under larches. Most people stop here for bread and cheese.', img('sedmera-pines-1930', 'Pines in front of the Julian Alps above a valley, 1930 postcard')),
          moment('The plateau', 'Snow lies here into late June. Follow the red and white marks on the rocks, not the footprints.', img('sedmera-ski-1912', 'Two figures crossing deep snow below a row of peaks, 1912 postcard')),
          moment('Double Lake', 'Two pools joined by a gravel bar. The roof of the hut shows above them.', img('sedmera-cliffs-1966', 'Limestone peaks above larches, 1966 postcard')),
          moment('Half past twelve, Sedmera', 'Boots off at the door. Soup is on from noon, and the stamp is on the counter.', hp('stamp', { size: 'm' })),
        ]),
      ], { anchor: 'walk', top: 80, bottom: 80, gap: 40, className: 'hp-walk' }),
    ],
  },
  {
    key: 'lakes',
    title: 'The seven lakes, as a giant word over bars',
    description: 'One word in condensed capitals filling the column from edge to edge, then seven filled bars that open in place — one per lake, with its height and what to know.',
    tags: ['list', 'accordion', 'outdoor'],
    sections: [
      section('Lakes', 'muted', [
        b('core/group', { className: 'hp-lakes', layout: { type: 'default' }, style: { spacing: { blockGap: '0' } } }, [
          h('Lakes', 2, { className: 'hp-giant' }),
          p('The hut is named after them: sedmera means the seven. You pass them in this order on the way up from Bohinj, and swimming is not allowed in any of them — this is a national park.', { fontSize: 'large', style: { spacing: { margin: { top: SP(30), bottom: SP(40) } } } }),
          b('core/details', { summary: 'Black Lake · 1,294 m', showContent: true }, [p('Lowest and warmest, in a bowl of larches. The water is dark from the forest floor; the marmots are not.')]),
          details('Lower Double Lake · 1,685 m', 'Right below the hut. In a dry August it splits from its twin and the gravel bar between them becomes the path to the door.'),
          details('Upper Double Lake · 1,685 m', 'Shallow and clear. The hut takes its drinking water from the spring above it, not from the lake.'),
          details('Kidney Lake · 1,830 m', 'The largest of the seven, shaped like its name. Ice can last into July.'),
          details('Green Lake · 1,980 m', 'Coloured by algae in late summer. A good turnaround point for an evening walk from the hut: forty minutes up.'),
          details('Brown Lake · 1,995 m', 'Small and peaty, under the scree of the Hribarice pass. The trail from Trenta comes down past it.'),
          details('Upper Lake · 2,002 m', 'The highest, often still frozen in June. From its rim you see all the others in a line.'),
        ]),
      ], { anchor: 'lakes', top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'kitchen',
    title: 'The hut kitchen, as a printed menu',
    description: 'A paper menu with scalloped top and bottom edges on a deep green field: grouped dishes and drinks, each name joined to its price by a leader of round dots, with a note beneath.',
    tags: ['menu', 'food', 'prices'],
    sections: [
      section('Kitchen', 'accent', [
        b('core/group', { className: 'hp-sheet', backgroundColor: 'muted', textColor: 'contrast', layout: { type: 'default' }, style: { spacing: { blockGap: '0' } } }, [
          h('From the hut kitchen', 2, { fontSize: 'x-large', style: { typography: { textAlign: 'center' } } }),
          p('Served from noon to eight. Everything is carried up twice a season or cooked here.', { style: { typography: { textAlign: 'center', fontStyle: 'italic' } } }),
          h('Hot', 3),
          hp('menu-item', { name: 'Jota', price: '€8.50', note: 'Sauerkraut and bean soup with smoked pork.' }),
          hp('menu-item', { name: 'Ričet', price: '€9.00', note: 'Barley stew, with or without sausage.' }),
          hp('menu-item', { name: 'Mushroom soup', price: '€7.50', note: 'With yesterday’s bread, toasted.' }),
          hp('menu-item', { name: 'Polenta with mountain cheese', price: '€9.50', note: '' }),
          h('Sweet', 3),
          hp('menu-item', { name: 'Walnut štruklji', price: '€6.00', note: 'Rolled dumplings, butter and breadcrumbs.' }),
          hp('menu-item', { name: 'Pancakes with blueberry jam', price: '€5.50', note: '' }),
          h('To drink', 3),
          hp('menu-item', { name: 'Mountain tea, a litre', price: '€3.50', note: 'With lemon and honey; we fill your bottle.' }),
          hp('menu-item', { name: 'Beer or radler', price: '€4.50', note: '' }),
          hp('menu-item', { name: 'Blueberry schnapps', price: '€3.00', note: '' }),
          p('Cash only. The tap water is not for drinking; bottled water is €3.', { fontSize: 'small', style: { typography: { textAlign: 'center' }, spacing: { margin: { top: SP(50) } } } }),
        ]),
      ], { anchor: 'kitchen', top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'prices',
    title: 'A night at the hut, as an itemised receipt',
    description: 'Prices: a heading, one paragraph and the booking button on the left; on the right a paper receipt with a zigzag foot that rises out of the top of the section, itemised down to the tourist tax, with the total set largest.',
    tags: ['pricing', 'receipt', 'booking'],
    sections: [
      section('Prices', 'base', [
        b('core/columns', { align: 'wide', verticalAlignment: 'top', style: { spacing: { blockGap: { left: SP(80), top: SP(60) } } } }, [
          b('core/column', { width: '50%' }, [
            h('A night at 1,685 metres', 2),
            p('Bunks are in rooms of six to twelve, under wool blankets. Half board is dinner at seven, breakfast at six and a litre of tea for the trail. Bring your own sheet liner or borrow ours.', { fontSize: 'large' }),
            button('Book a bunk'),
          ]),
          b('core/column', { width: '50%', className: 'hp-slipcol' }, [hp('receipt')]),
        ]),
      ], { anchor: 'prices', top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'questions',
    title: 'Before you walk up, beside a tall picture',
    description: 'Questions on a surface band: a heading, the three facts people ask first and an accordion with no lines, a button and a link — beside a tall picture with a small square one overlapping its corner.',
    tags: ['faq', 'practical', 'details'],
    sections: [
      section('Questions', 'secondary', [
        b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: SP(80), top: SP(60) } } } }, [
          b('core/column', { width: '42%', className: 'hp-faq' }, [
            h('Before you walk up', 2, { fontSize: 'x-large' }),
            p('Open 15 June to 30 September. Outside the season the winter room sleeps eight, unheated.'),
            p('Telephone <a href="tel:+38640000000">+386 4 000 00 00</a> between six and eight in the evening, when the generator runs.'),
            p('Cash only. The nearest cash machine is down in Bohinj.'),
            details('Can I come without booking?', 'Yes, and nobody is turned away after dark. In July and August the bunks fill; without a booking you may sleep on a bench in the dining room.'),
            details('Is there a shower?', 'No. There is a cold tap in the washroom and seven lakes you may not swim in.'),
            details('Can I bring my dog?', 'Dogs sleep in the porch, not in the rooms. In the national park they stay on a lead.'),
            details('What if the weather turns?', 'Storms build most afternoons in July. Leave Bohinj by eight, and if you hear thunder below the wall, turn back: the cables conduct.'),
            details('Do you take cards?', 'No: there is no line up here. Bring cash for the night and the kitchen.'),
            button('Book a bunk'),
            p('<a href="mailto:book@sedmera.example">Ask us anything else</a>'),
          ]),
          b('core/column', { width: '58%' }, [
            img('sedmera-valley-winter', 'The Seven Lakes valley under snow, with peaks on both sides', { className: 'hp-tall' }),
            img('sedmera-ski-1912', 'Two figures crossing snow below the peaks, 1912 postcard', { className: 'hp-overlap' }),
          ]),
        ]),
      ], { anchor: 'questions', top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'visit',
    title: 'Find the hut, a card on a photograph',
    description: 'A full-bleed photograph of the mountains carrying one paper card: the address, the trail picker (choose a trailhead to read its time, ascent and what you pass), the phone number and the booking button.',
    tags: ['contact', 'map', 'booking'],
    sections: [
      b('core/cover', { metadata: { name: 'Visit' }, anchor: 'visit', url: `${PICS}/sedmera-pines-1930.jpg`, alt: 'Pines in front of the Julian Alps, 1930 postcard', dimRatio: 0, isDark: false, align: 'full', className: 'hp-visit', style: { spacing: { padding: { top: SP(70), bottom: SP(70), left: SP(50), right: SP(50) } } }, layout: { type: 'constrained' } }, [
        b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'right' } }, [
          b('core/group', { className: 'hp-card', backgroundColor: 'muted', textColor: 'contrast', layout: { type: 'default' }, style: { spacing: { blockGap: SP(30) } } }, [
            h('Find the hut', 2, { fontSize: 'x-large' }),
            p('Seven Lakes Valley, 1,685 m<br>Triglav National Park, Slovenia'),
            hp('routes'),
            p('<a href="tel:+38640000000">+386 4 000 00 00</a>, six to eight in the evening'),
            button('Book a bunk', BOOK, { width: 100 }),
          ]),
        ]),
      ]),
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
      className: 'hp-header',
      style: { spacing: { padding: { top: SP(40), bottom: SP(30), left: SP(50), right: SP(50) } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        b('core/site-title', { level: 0, fontFamily: 'heading', fontSize: 'x-large', style: { typography: { textTransform: 'uppercase', lineHeight: '1' } } }),
        b('core/navigation', { fontSize: 'medium', layout: { type: 'flex', justifyContent: 'center' }, style: { spacing: { blockGap: SP(50) } } }, [
          b('core/navigation-link', { label: 'The walk', url: '#walk', kind: 'custom' }),
          b('core/navigation-link', { label: 'The lakes', url: '#lakes', kind: 'custom' }),
          b('core/navigation-link', { label: 'Kitchen', url: '#kitchen', kind: 'custom' }),
          b('core/navigation-link', { label: 'Prices', url: '#prices', kind: 'custom' }),
        ]),
        b('core/buttons', {}, [b('core/button', { text: 'Book a bunk', url: BOOK })]),
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
      backgroundColor: 'accent',
      textColor: 'muted',
      style: { spacing: { padding: { top: SP(80), bottom: SP(50), left: SP(50), right: SP(50) } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/group', { align: 'wide', className: 'hp-back', backgroundColor: 'muted', textColor: 'contrast', style: { spacing: { padding: { bottom: SP(50), left: SP(60), right: SP(60) }, blockGap: SP(50) } }, layout: { type: 'default' } }, [
        b('core/columns', { style: { spacing: { blockGap: { left: SP(80), top: SP(50) } } } }, [
          b('core/column', {}, [
            h('See you at the top', 2, { fontSize: 'x-large' }),
            p('We answer the telephone between six and eight in the evening, while the generator runs. Leave a message any other time; we listen to them at night with a cup of tea.'),
            p('— The hut crew'),
          ]),
          b('core/column', {}, [
            img('sedmera-bohinj-shore', 'Lake Bohinj and its mountains, postcard', { className: 'hp-postmark' }),
            p('<a href="mailto:book@sedmera.example">book@sedmera.example</a>', { fontSize: 'large' }),
            p('<a href="tel:+38640000000">+386 4 000 00 00</a>', { fontSize: 'large' }),
            p('Seven Lakes Valley, 1,685 m', { fontSize: 'large' }),
            p('Triglav National Park, Slovenia', { fontSize: 'large' }),
          ]),
        ]),
        p('© 2026 Koča Sedmera, a sample hut. Pictures: postcards of the Julian Alps (1912, 1930, 1966) and of Lake Bohinj (1950s–60s), public domain; Seven Lakes Valley panorama by otrow_photography, CC0; all via Wikimedia Commons. Made with <a href="https://prepress.digitalno.de">Prepress</a>.', { fontSize: 'small', style: { typography: { textAlign: 'center' } } }),
      ]),
    ],
  ),
];
