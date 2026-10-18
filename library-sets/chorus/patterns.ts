/**
 * Chorus — patterns for a mobile-app landing page. Copy is written for
 * "Chorus", a fictional app that names the bird singing from a ten-second
 * recording. Bird pictures are public-domain plates (Nozeman & Sepp,
 * Grönvold) from Wikimedia Commons, hosted by Prepress and credited in the
 * footer; the nature photographs are generated samples; prices, figures and
 * contacts are samples.
 */
import type { BlockNode } from '../../src/lib/types';
import { b, h, img as kitImg, is, p, section as kitSection, SP, type SetPattern, logo } from '../kit';

export { b, h, p, SP };
export const ch = (slug: string, attributes: Record<string, unknown> = {}) => b(`prepress/chorus-${slug}`, attributes);
const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/chorus';
const img = (file: string, alt: string, attributes: Record<string, unknown> = {}) => kitImg(`${PICS}/${file}.jpg`, alt, attributes);
const details = (summary: string, text: string) => b('core/details', { summary }, [p(text)]);

type Ground = 'base' | 'secondary' | 'muted' | 'contrast' | 'primary';
const ink = (ground: Ground) => (ground === 'contrast' || ground === 'primary' ? 'base' : 'contrast');
/** A full-width section on one ground; `pad: false` drops the side padding. */
export function section(name: string, ground: Ground, children: BlockNode[], o: { top?: number; bottom?: number; gap?: number; anchor?: string; pad?: boolean; flow?: boolean } = {}): BlockNode {
  return kitSection(name, { bg: ground, text: ink(ground) }, children, { top: o.top, bottom: o.bottom, gap: o.gap, anchor: o.anchor, flow: o.flow, ...(o.pad === false ? { side: 0 } : {}) });
}

export const PATTERNS: SetPattern[] = [
  {
    key: 'hero',
    role: 'hero',
    title: 'Chorus hero, a sentence split by the app',
    description: 'The headline split in two and pushed to the edges, with a live frame of the app between them: pick a recording, watch its spectrogram draw and the bird get named. A supporting sentence sits bottom-left.',
    tags: ['hero', 'app', 'interactive'],
    sections: [section('Hero', 'base', [ch('hero', { align: 'wide' })], { top: 30, bottom: 30 })],
  },
  {
    key: 'showcase',
    role: 'showcase',
    title: 'One row, three states',
    description: 'The app’s central row — a sighting — shown three times: heard, checked and kept, each state named beside it. The middle copy is live: tick it to keep the bird.',
    tags: ['showcase', 'app', 'states'],
    sections: [
      section('A song, saved', 'base', [
        h('A song, saved', 2, { fontSize: 'x-large', align: 'wide', style: { typography: { letterSpacing: '-0.02em' } } }),
        ch('row', { align: 'wide' }),
      ], { top: 80, bottom: 80, gap: 70 }),
    ],
  },
  {
    key: 'dawn',
    role: 'story',
    title: 'Dawn in the wood, a full-bleed photograph',
    description: 'A screen-wide photograph of a wood at first light with one line set large in its lower corner and one sentence under it.',
    tags: ['story', 'photograph', 'mood'],
    sections: [
      b('core/cover', { metadata: { name: 'Dawn' }, url: `${PICS}/chorus-dawn-wood.jpg`, alt: 'A beech wood at dawn, mist between the trunks, a blackbird singing on a low branch', dimRatio: 40, overlayColor: 'contrast', isDark: true, minHeight: 86, minHeightUnit: 'vh', contentPosition: 'bottom left', align: 'full', className: is('chorus-dawn'), style: { spacing: { padding: { top: SP(70), bottom: SP(70), left: SP(50), right: SP(50) } } }, layout: { type: 'constrained' } }, [
        h('The wood at 05:12', 2, { textColor: 'base', align: 'wide' }),
        p('The first blackbird starts before the light. In the next half hour a dozen more join in, and Chorus names each one as it does.', { textColor: 'base', fontSize: 'large', className: is('chorus-aside') }),
      ]),
    ],
  },
  {
    key: 'how',
    role: 'features',
    title: 'How it works, four stops',
    description: 'A split of two flat fields driven by one four-stop track: the clause on the left and the matching screen of the app on the right change together.',
    tags: ['how-it-works', 'steps', 'interactive'],
    sections: [section('How it works', 'base', [ch('stages')], { top: 0, bottom: 0, pad: false, anchor: 'how', flow: true })],
  },
  {
    key: 'places',
    role: 'gallery',
    title: 'Where it listens, four places',
    description: 'Four photographs of the places people listen — a wood, a park, a marsh, a garden — each with the birds you hear there first.',
    tags: ['gallery', 'photographs', 'use-cases'],
    sections: [
      section('Where it listens', 'base', [
        h('Wherever something sings', 2, { fontSize: 'x-large', align: 'wide', style: { typography: { letterSpacing: '-0.02em' } } }),
        b('core/columns', { align: 'wide', className: is('chorus-places'), style: { spacing: { blockGap: { left: SP(30), top: SP(40) } } } }, [
          b('core/column', {}, [img('chorus-wood', 'A wren singing on a mossy log in a beech wood', { caption: '<strong>Beech wood</strong> wren · blackbird · chiffchaff' })]),
          b('core/column', {}, [img('chorus-park', 'A robin singing from a park railing on an early spring morning', { caption: '<strong>City park</strong> robin · great tit · blackcap' })]),
          b('core/column', {}, [img('chorus-marsh', 'A reed warbler singing from a reed stem over a misty marsh', { caption: '<strong>Reed marsh</strong> reed warbler · sedge warbler' })]),
          b('core/column', {}, [img('chorus-garden', 'A dunnock singing on top of a garden hedge at dawn', { caption: '<strong>Garden hedge</strong> dunnock · house sparrow · wren' })]),
        ]),
      ], { top: 80, bottom: 80, gap: 50 }),
    ],
  },
  {
    key: 'notes',
    role: 'features',
    title: 'Features as live controls',
    description: 'One field note the app makes, pinned on the left, and five capabilities on the right — each with a real control that changes the note: language, Latin names, offline, night palette, postcard.',
    tags: ['features', 'interactive', 'pinned'],
    sections: [section('Field notes', 'base', [ch('notes')], { top: 0, bottom: 0, flow: true })],
  },
  {
    key: 'birds',
    role: 'gallery',
    title: 'The birds, from the old plates',
    description: 'A strip of three hand-coloured plates from an eighteenth-century field guide with one line on what the app knows.',
    tags: ['gallery', 'pictures', 'heritage'],
    sections: [
      section('The birds', 'secondary', [
        b('core/columns', { align: 'wide', className: is('chorus-plates'), style: { spacing: { blockGap: { left: SP(30), top: SP(30) } } } }, [
          b('core/column', {}, [img('chorus-plate-blackbird', 'Hand-coloured plate of a male and female blackbird with their nest, Nozeman and Sepp, Nederlandsche vogelen')]),
          b('core/column', {}, [img('chorus-plate-robin', 'Hand-coloured plate of two robins and a nest on a branch, Nozeman and Sepp, Nederlandsche vogelen')]),
          b('core/column', {}, [img('chorus-plate-great-tit', 'Hand-coloured plate of a pair of great tits and their nest, Nozeman and Sepp, Nederlandsche vogelen')]),
        ]),
        p('Chorus knows the 236 birds that sing in Europe, each with its song, its calls and the names people give it in nine languages.', { fontSize: 'large', align: 'wide', style: { typography: { lineHeight: '1.3' } } }),
      ], { top: 80, bottom: 80, gap: 50 }),
    ],
  },
  {
    key: 'plans',
    role: 'pricing',
    title: 'Plans, one live figure',
    description: 'Plan names set large on the left; the selected plan’s price, what it includes and its button fill a stage on the right that never moves.',
    tags: ['pricing', 'plans', 'interactive'],
    sections: [section('Plans', 'base', [ch('plans', { align: 'wide' })], { top: 80, bottom: 80, anchor: 'plans' })],
  },
  {
    key: 'questions',
    role: 'faq',
    title: 'Questions as filled tiles',
    description: 'A sticky heading beside an accordion of filled tiles; the open one turns teal. No lines anywhere.',
    tags: ['faq', 'accordion'],
    sections: [
      section('Questions', 'base', [
        b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: SP(70), top: SP(50) } } } }, [
          b('core/column', { width: '33%' }, [h('Questions', 2, { className: is('chorus-sticky') })]),
          b('core/column', { width: '67%', className: is('chorus-tiles') }, [
            details('Does it work without a signal?', 'Yes. The whole European catalogue is on the phone, about 380 MB. Notes are saved on the phone and sync when you are back in range.'),
            details('How sure is it?', 'It shows how sure it is with every answer. In our tests on clear recordings it names the right bird nine times in ten; in wind, traffic or a crowded dawn chorus it says when it isn’t sure.'),
            details('Which birds does it know?', 'The 236 species that breed or winter in Europe, with their songs and their calls. Birds from further away are coming, continent by continent.'),
            details('Does it record people?', 'It keeps ten seconds and only when you press the button. Voices are cut out of the recording before it is saved.'),
            details('What happens to my recordings?', 'They stay on your phone unless you share them. If you choose, they can help train the next version — anonymously, and you can take them back.'),
            details('Can I export my life list?', 'With Field or Family: as a spreadsheet, or straight to the national bird records where they accept it.'),
            details('Is there a one-off price?', 'Not yet. Field costs €29 a year if you pay yearly, and the free plan never runs out.'),
          ]),
        ]),
      ], { top: 80, bottom: 80, anchor: 'questions' }),
    ],
  },
  {
    key: 'get',
    role: 'cta',
    title: 'A sentence that ends in the buttons',
    description: 'The closing sentence set at display size, ending in two buttons set at the same size, and one line saying what happens next.',
    tags: ['cta', 'download'],
    sections: [
      section('Get the app', 'base', [
        img('chorus-listening', 'A woman in a green rain jacket standing still on a misty forest path at dawn, eyes closed, listening', { align: 'wide', className: is('chorus-wide-photo') }),
        h('Open it tomorrow at dawn', 2, { align: 'wide' }),
        b('core/buttons', { align: 'wide', className: is('chorus-sentence') }, [b('core/button', { text: 'iPhone', url: '#iphone' }), b('core/button', { text: 'Android', url: '#android' })]),
        p('Free to download. Five songs a day cost nothing, for ever.', { align: 'wide', textColor: 'accent' }),
      ], { top: 80, bottom: 80, gap: 40, anchor: 'get' }),
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
      className: is('chorus-header'),
      style: { spacing: { padding: { top: SP(40), bottom: SP(30), left: SP(50), right: SP(50) } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        logo(`${PICS}/logo-chorus-2.png`, 'Chorus', [768, 200], 36),
        b('core/group', { layout: { type: 'flex', flexWrap: 'nowrap' }, style: { spacing: { blockGap: SP(50) } } }, [
          b('core/navigation', { fontSize: 'small', layout: { type: 'flex' }, style: { spacing: { blockGap: SP(50) } } }, [
            b('core/navigation-link', { label: 'How it works', url: '#how', kind: 'custom' }),
            b('core/navigation-link', { label: 'Plans', url: '#plans', kind: 'custom' }),
            b('core/navigation-link', { label: 'Questions', url: '#questions', kind: 'custom' }),
          ]),
          b('core/buttons', {}, [b('core/button', { text: 'Get the app', url: '#get', fontSize: 'small' })]),
        ]),
      ]),
    ],
  ),
];

/** A board tile: a padded group on its own ground, spanning `span` of the board's 12 columns. */
const tile = (span: number, ground: Ground, children: BlockNode[], style?: string) =>
  b('core/group', { ...(style ? { className: is(style) } : {}), backgroundColor: ground, textColor: ink(ground), style: { spacing: { padding: { top: SP(40), bottom: SP(40), left: SP(40), right: SP(40) } }, layout: { columnSpan: span } }, layout: { type: 'default' } }, children);

export const FOOTER: BlockNode[] = [
  b(
    'core/group',
    { metadata: { name: 'Footer' }, align: 'full', backgroundColor: 'base', style: { spacing: { padding: { top: SP(30), bottom: SP(30), left: SP(30), right: SP(30) } } }, layout: { type: 'default' } },
    [
      b('core/group', { className: is('chorus-board'), layout: { type: 'grid', columnCount: 12 } }, [
        tile(4, 'secondary', [
          p('Made for people who stop to listen.', { fontSize: 'large', style: { typography: { lineHeight: '1.2' } } }),
          p('© 2026 Chorus, a sample app. Bird plates: Nozeman &amp; Sepp, <em>Nederlandsche vogelen</em> (1770–1829), and H. Grönvold (c. 1907); public domain, via Wikimedia Commons. Photographs are generated samples. Made with <a href="https://prepress.digitalno.de">Prepress</a>.', { fontSize: 'small' }),
        ]),
        tile(3, 'secondary', [
          b('core/navigation', { overlayMenu: 'never', layout: { type: 'flex', orientation: 'vertical' }, style: { spacing: { blockGap: SP(20) } } }, [
            b('core/navigation-link', { label: 'How it works', url: '#how', kind: 'custom' }),
            b('core/navigation-link', { label: 'Plans', url: '#plans', kind: 'custom' }),
            b('core/navigation-link', { label: 'Questions', url: '#questions', kind: 'custom' }),
            b('core/navigation-link', { label: 'Get the app', url: '#get', kind: 'custom' }),
          ]),
        ]),
        tile(2, 'secondary', [p('Ljubljana'), p('Dawn chorus tomorrow from 05:12', { fontSize: 'small' })]),
        tile(3, 'secondary', [p('Write to us', { fontSize: 'small' }), p('<a href="mailto:hello@chorus.example">hello@chorus.example</a>', { fontSize: 'large' })]),
        tile(8, 'contrast', [p('Chorus', { className: is('chorus-wordmark'), style: { typography: { fontWeight: '600' } } })]),
        tile(4, 'primary', [p('<a href="#get">Get the app</a>', { fontSize: 'x-large', style: { typography: { fontWeight: '600', letterSpacing: '-0.02em', lineHeight: '1.1' } } }), p('→', { className: is('chorus-arrow') })], 'chorus-go'),
      ]),
    ],
  ),
];
