/**
 * Programme — patterns. Copy is written for "Pomol", a fictional three-day
 * festival of talks, film and late music on the harbour of Piran, Slovenia
 * (real town; the festival, people, prices and addresses are samples). The
 * photographs are generated samples, to be replaced with the event's own.
 */
import type { BlockNode } from '../../src/lib/types';
import { b, button, buttons, group, h, img as kitImg, is, p, row, section as kitSection, SP, type SetPattern } from '../kit';
import { programmeDays } from './blocks';
import { details } from '../kit';

export { b, h, p, SP };
const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/pomol';
const img = (file: string, alt: string, attributes: Record<string, unknown> = {}) => kitImg(`${PICS}/${file}.jpg`, alt, attributes);
export const TICKETS = '/tickets/';

type Ground = 'base' | 'secondary' | 'accent' | 'contrast' | 'primary';
/** A full-width section on one of the set's grounds (stone, crimson and ink fields carry black text). */
export function section(name: string, ground: Ground, children: BlockNode[], o: Parameters<typeof kitSection>[3] = {}): BlockNode {
  return kitSection(name, { bg: ground, text: ground === 'base' || ground === 'secondary' ? 'contrast' : 'base' }, children, o);
}

// ---------- records: core blocks + the set's block styles (style.ts) ----------

/** One timetable row: time · what (and who) · where. */
export const slot = (time: string, what: string, who: string, where: string) =>
  group({ className: is('programme-slot') }, [p(time), group({}, [p(what), p(who)]), p(where)]);
/** One day of the programme: its name, then its rows. */
export const day = (name: string, rows: BlockNode[]) => group({ className: is('programme-day') }, [h(name, 3), ...rows]);
/** A speaker: portrait, name, what they do, when and where they speak. */
const person = (file: string, name: string, what: string, when: string, alt: string) =>
  group({}, [img(file, alt), p(name), p(what), p(when)]);
/** A numbered place on the map: number, name, what happens there, how to find it. */
const place = (n: number, name: string, what: string, where: string) => group({ className: is('programme-place') }, [p(String(n)), h(name, 3), p(what), p(where)]);
/** A heading with a line of text beside it, sitting on one baseline. */
const intro = (title: string, text: string) =>
  row({ align: 'wide', className: is('programme-lead-row'), layout: { flexWrap: 'wrap' } }, [h(title, 2), p(text, { textColor: 'muted' })]);

export const PATTERNS: SetPattern[] = [
  {
    key: 'hero',
    role: 'hero',
    title: 'The name pinned over pictures',
    description: 'The event’s name set edge to edge in crimson and pinned to the top of the screen, while a column of tall photographs scrolls up under it; the dates and the one action stay pinned at the foot.',
    tags: ['hero', 'event', 'festival'],
    sections: [
      section('Name', 'base', [
        h('Pomol', 1, { align: 'full' }),
        img('pomol-harbour', 'A stone pier running out into the sea at dusk, string lights over moored boats'),
        img('pomol-talk', 'A woman speaking into a microphone on a low stage in a stone square at night'),
        img('pomol-film', 'An open-air film projected on the old harbour wall, the audience on folding chairs'),
        img('pomol-night', 'People dancing by the lighthouse in red light, spray coming over the sea wall'),
        img('pomol-morning', 'A swimmer diving off the end of the pier at sunrise, chairs stacked on the quay'),
        row({ align: 'wide', className: is('programme-lead-row'), layout: { flexWrap: 'wrap' } }, [
          p('Talks, film and late music on the harbour of Piran. <strong>3—5 September 2027.</strong>', { fontSize: 'large' }),
          buttons([button('Weekend pass, €95', TICKETS)]),
        ]),
      ], { top: 0, bottom: 0, side: 30, gap: 0, style: 'programme-pinned' }),
    ],
  },
  {
    key: 'programme',
    role: 'list',
    title: 'Programme by day',
    description: 'The timetable as filled bars on black: time, what and who, and where, one row each. Tabs pick a day (or all three); the tabs stay at the top while the day scrolls.',
    tags: ['schedule', 'programme', 'event'],
    sections: [
      section('Programme', 'base', [
        intro('Programme', 'Five places around the harbour, a few minutes apart on foot. Everything is in English or Slovenian with English subtitles.'),
        programmeDays({ align: 'wide', group: 'day', label: 'Day', day1: 'Fri 3', day2: 'Sat 4', day3: 'Sun 5', all: 'All days' }, [
          day('Friday 3 September', [
            slot('17:00', 'Opening walk along the harbour', 'With Nika Brenko, who keeps the town’s boat registers', 'The quay'),
            slot('18:30', 'Building on salt', 'Jurij Lah, architect of the salt store’s new roof', 'Salt store'),
            slot('20:00', 'Fish, by law', 'Elena Russo, marine biologist, on the quotas nobody reads', 'Tartini Square'),
            slot('21:30', 'Six short films from the Adriatic', 'Programme of shorts, 84 minutes, subtitled', 'Harbour wall'),
            slot('23:30', 'Records from the boat club', 'Late music until two', 'Punta'),
          ]),
          day('Saturday 4 September', [
            slot('10:00', 'Knots and nets', 'A morning with the fishermen’s co-op; free, bring gloves', 'The quay'),
            slot('15:00', 'A town without cars', 'Mateo Kralj, planner, on forty years of a closed centre', 'Salt store'),
            slot('17:00', 'Who gets the coast?', 'Panel: Sara Pertot, Jurij Lah, Elena Russo', 'Tartini Square'),
            slot('21:00', 'The Night Ferry', 'Feature film, 102 minutes, subtitled', 'Harbour wall'),
            slot('23:30', 'Brass band, then records', 'Late music until three', 'Punta'),
          ]),
          day('Sunday 5 September', [
            slot('07:00', 'Morning swim off the pier', 'Free for everyone; towels at the lighthouse', 'Punta'),
            slot('11:00', 'Salt, light and time', 'Ivo Zorn, photographer, on forty summers of the pans', 'Salt store'),
            slot('16:00', 'Readings on the steps', 'Six writers, ten minutes each; free', 'Tartini Square'),
            slot('20:00', 'The harbour, 1960—2027', 'Closing film from the town’s archive, with live piano', 'Harbour wall'),
          ]),
        ]),
      ], { anchor: 'programme', side: 30, gap: 60 }),
    ],
  },
  {
    key: 'intro',
    role: 'intro',
    title: 'Statement right, one picture hanging left',
    description: 'No heading: one statement paragraph in the right half of the page, a square photograph hanging from its last line on the left and a small note under the picture.',
    tags: ['intro', 'about', 'event'],
    sections: [
      section('Intro', 'base', [
        group({ align: 'wide', className: is('programme-split') }, [
          p('Pomol is three days on one small harbour. Talks in an old salt store, films on the harbour wall, records at the lighthouse until the boats go out. Everything is a few minutes apart on foot, and the town keeps living around it: the fish market opens at six, the ferry leaves at eight.'),
          img('pomol-salt', 'A talk in the old salt store: rows of wooden chairs, a speaker at a table under one lamp'),
          p('The salt store holds 140 people. Talks there fill up; come ten minutes early.'),
        ]),
      ], { side: 30, top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'speakers',
    role: 'showcase',
    title: 'Speakers in black and white',
    description: 'A grid of tall portraits in black and white that take their colour when pointed at; name, what they do, and when and where they speak under each. The middle column sits lower.',
    tags: ['team', 'speakers', 'people'],
    sections: [
      section('Speakers', 'secondary', [
        intro('Who speaks', 'Six people who know this coast from the water, the archive and the drawing board. All talks are 40 minutes with time for questions.'),
        group({ align: 'wide', className: is('programme-people') }, [
          person('pomol-nika', 'Nika Brenko', 'Keeps the town’s boat registers', 'Fri 17:00 · The quay', 'Nika Brenko, a woman in her sixties in a navy sweater, holding an old ledger on the quay'),
          person('pomol-jurij', 'Jurij Lah', 'Architect of the salt store’s new roof', 'Fri 18:30 · Salt store', 'Jurij Lah, an architect with glasses and a beard, on the harbour at evening'),
          person('pomol-elena', 'Elena Russo', 'Marine biologist', 'Fri 20:00 · Tartini Square', 'Elena Russo, a marine biologist with curly hair, smiling on the quay'),
          person('pomol-mateo', 'Mateo Kralj', 'Town planner', 'Sat 15:00 · Salt store', 'Mateo Kralj, a town planner in a denim jacket, holding a paper map'),
          person('pomol-sara', 'Sara Pertot', 'Writer', 'Sat 17:00 · Tartini Square', 'Sara Pertot, a writer in a black turtleneck, with a notebook under her arm'),
          person('pomol-ivo', 'Ivo Zorn', 'Photographer of the salt pans', 'Sun 11:00 · Salt store', 'Ivo Zorn, a photographer in his seventies in a flat cap, an old camera round his neck'),
        ]),
      ], { anchor: 'speakers', side: 30, gap: 70 }),
    ],
  },
  {
    key: 'gallery',
    role: 'gallery',
    title: 'Prints dropped on the headline',
    description: 'A crimson field with a two-line word set huge, and photographs printed on paper dropped across it, tilted and overlapping, hiding half the letters. Pointing at a print straightens it.',
    tags: ['gallery', 'photos', 'event'],
    sections: [
      section('Last year', 'primary', [
        group({ align: 'wide', className: is('programme-prints') }, [
          h('Last<br>September', 2),
          img('pomol-steps', 'People listening to a reading on the stone steps by the harbour'),
          img('pomol-film', 'The open-air film on the harbour wall, seen from the back rows'),
          img('pomol-night', 'Dancing by the lighthouse in red light'),
          p('Six thousand people, four nights, one harbour. This year runs the same way.'),
        ]),
      ], { side: 30, top: 60, bottom: 60 }),
    ],
  },
  {
    key: 'venue',
    role: 'contact',
    title: 'Harbour map with numbered places',
    description: 'A drawn map of the harbour with five numbered places beside the list that names them: what happens at each and how to find it. The dots land one by one as the map comes into view.',
    tags: ['map', 'location', 'venue'],
    sections: [
      section('Places', 'base', [
        intro('Five places', 'All of it fits in a ten-minute walk. The town centre has no cars; leave yours at the garage above the town and take the free bus down.'),
        b('core/columns', { align: 'wide', verticalAlignment: 'center', style: { spacing: { blockGap: { left: SP(70), top: SP(50) } } } }, [
          b('core/column', { width: '55%' }, [b('prepress/programme-map', {})]),
          b('core/column', { width: '45%' }, [
            place(1, 'The quay', 'The opening walk and the morning knots.', 'Where the fishing boats tie up, below the square.'),
            place(2, 'Salt store', 'Talks, the day-pass desk from noon.', 'The long stone building east of the harbour, 140 seats.'),
            place(3, 'Tartini Square', 'Evening talks, the panel and the readings.', 'At the head of the harbour; you can’t miss it.'),
            place(4, 'Harbour wall', 'Films after dark. Chairs provided, bring a sweater.', 'The breakwater at the harbour mouth.'),
            place(5, 'Punta', 'Late music, and the Sunday swim.', 'The point, by the lighthouse, eight minutes along the sea front.'),
          ]),
        ]),
      ], { anchor: 'places', side: 30, gap: 70 }),
    ],
  },
  {
    key: 'faq',
    role: 'faq',
    title: 'Wide heading, indented questions',
    description: 'A wide heading, and under it six questions indented to the right two-thirds; an open question lays a filled tile behind itself and its answer.',
    tags: ['faq', 'questions', 'event'],
    sections: [
      section('Questions', 'base', [
        h('Before you come', 2, { align: 'wide' }),
        group({ align: 'wide', className: is('programme-questions') }, [
          details('What if it rains?', ['Talks stay in the salt store. Films move into the town theatre on the square (180 seats, first come). Late music goes on; Punta has an awning.']),
          details('Is it in English?', ['Every talk is in English or in Slovenian with live English interpretation through headsets, free at the door. Films are subtitled in English.']),
          details('Can I bring children?', ['Yes. Under 12 come free with an adult, and Saturday morning at the quay is for them. Late music is over 16.']),
          details('Where do I stay?', ['Piran is small and books up: look early, or stay in Portorož, twenty minutes away on the free seaside bus that runs until two in the morning during the festival.']),
          details('Is it accessible?', ['The salt store, the square and the harbour wall are flat and step-free; Punta has one ramp. Write to us and we keep a seat for you at the front.']),
          details('Can I get my money back?', ['Up to 1 August, all of it. After that we can move your pass to someone else’s name for free.']),
        ]),
      ], { anchor: 'questions', side: 30, gap: 70 }),
    ],
  },
  {
    key: 'past',
    role: 'story',
    title: 'Facts beside a paragraph, past years',
    description: 'Three short facts in a narrow column beside a wide paragraph about the event, then the record of past years as a two-column list beside its one-word label.',
    tags: ['about', 'history', 'event'],
    sections: [
      section('About', 'base', [
        b('core/columns', { align: 'wide', className: is('programme-facts'), style: { spacing: { blockGap: { left: SP(60), top: SP(40) } } } }, [
          b('core/column', {}, [p('First held'), p('September 2019'), p('Run by'), p('Eleven volunteers and the harbour club'), p('Paid for by'), p('Passes, the town and two local banks')]),
          b('core/column', {}, [
            p('It began as one evening of talks in the salt store, the week the fishing boats came back for the autumn. The town asked for a film the year after, and the boat club for a party. It has stayed small on purpose: one harbour, one weekend, nothing you need a car for.'),
            h('Past years', 3, { style: { spacing: { margin: { top: SP(60) } } } }),
            b('core/list', {}, [
              ['2026 · Water', '2025 · Work', '2024 · Light', '2023 · Neighbours', '2022 · Salt', '2021 · Back outside', '2020 · On the radio only', '2019 · One evening'].map((t) => b('core/list-item', { content: t })),
            ].flat()),
          ]),
        ]),
      ], { anchor: 'about', side: 30 }),
    ],
  },
  {
    key: 'contact',
    role: 'contact',
    title: 'The address as display type',
    description: 'One line saying what to write about, then the email address set as display type from margin to margin; telephone and place in small type underneath.',
    tags: ['contact', 'email', 'event'],
    sections: [
      section('Write to us', 'base', [
        group({ align: 'wide', style: { spacing: { blockGap: SP(50) } } }, [
          p('Questions, press, volunteering, or a boat we should know about:', { fontSize: 'large' }),
          p('<a href="mailto:hello@pomol.example">hello@pomol.example</a>', { className: is('programme-email') }),
        ]),
        row({ align: 'wide', layout: { justifyContent: 'space-between', flexWrap: 'wrap' } }, [p('+386 5 600 00 00 · Piran, Slovenia', { textColor: 'muted' }), p('Answers within two days, except during the festival.', { textColor: 'muted' })]),
      ], { anchor: 'contact', side: 30, top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'tickets',
    role: 'pricing',
    title: 'One pass, the price on a block',
    description: 'The whole offer in one line at display size, its price sitting on a crimson block; what the pass includes beside the one button, and the cheaper option as a plain line under it.',
    tags: ['pricing', 'tickets', 'event'],
    sections: [
      section('Tickets', 'accent', [
        h('Three days on the harbour, <mark>€95</mark>', 2, { align: 'wide', fontSize: 'xx-large', className: is('programme-price') }),
        row({ align: 'wide', className: is('programme-lead-row'), layout: { flexWrap: 'wrap' } }, [
          p('Every talk, film and late night, Friday to Sunday. Under 26 and over 65 pay €60. The swim, the walk and the readings are free for everyone, pass or not.', { fontSize: 'large' }),
          buttons([button('Buy a weekend pass', 'mailto:tickets@pomol.example?subject=Weekend%20pass')]),
        ]),
        group({ align: 'wide' }, [p('Only one evening? <a href="mailto:tickets@pomol.example?subject=Day%20pass">A day pass is €40</a>, sold at the salt store from noon.')]),
      ], { anchor: 'tickets', side: 30, gap: 60, top: 80, bottom: 80 }),
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
      className: is('programme-header'),
      style: { spacing: { padding: { top: SP(30), bottom: SP(30), left: SP(30), right: SP(30) } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'nowrap' } }, [
        b('core/site-title', { level: 0, fontSize: 'medium', style: { typography: { fontWeight: '700', letterSpacing: '-0.02em' } } }),
        b('core/navigation', { fontSize: 'medium', layout: { type: 'flex', justifyContent: 'center' }, style: { spacing: { blockGap: SP(40) } } }, [
          b('core/navigation-link', { label: 'Programme', url: '/programme/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Speakers', url: '/speakers/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Tickets', url: '/tickets/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Visit', url: '/visit/', kind: 'custom' }),
        ]),
        buttons([button('Tickets', TICKETS, { className: 'is-style-outline' })]),
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
      backgroundColor: 'contrast',
      textColor: 'base',
      style: { spacing: { padding: { top: SP(60), bottom: '0', left: SP(30), right: SP(30) }, blockGap: SP(50) } },
      layout: { type: 'constrained' },
    },
    [
      b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: SP(50), top: SP(40) } } } }, [
        b('core/column', {}, [p('3—5 September 2027<br>The harbour, Piran, Slovenia')]),
        b('core/column', {}, [p('<a href="mailto:hello@pomol.example">hello@pomol.example</a><br><a href="tel:+38656000000">+386 5 600 00 00</a>')]),
        b('core/column', {}, [p('© 2027 Pomol, a sample festival. Photographs are generated samples. Made with <a href="https://prepress.digitalno.de">Prepress</a>.', { fontSize: 'small' })]),
      ]),
      group({ align: 'full' }, [p('Pomol', { className: is('programme-monument') })]),
    ],
  ),
];
