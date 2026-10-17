/**
 * Paper Edition — patterns: sections made of core blocks and the paper
 * blocks. Copy is written for "The Margin", a weekly letter by Ana Novak on
 * design, slow software and the craft of making things.
 */
import type { BlockNode } from '../../src/lib/types';
import { b, cols as kitCols, h, is, p, section as kitSection, SP, type SetPattern } from '../kit';

export { b, h, p, SP };
type Tone = 'paper' | 'tint' | 'ink' | 'oxblood';
const TONE: Record<Tone, { bg: string; text: string }> = {
  paper: { bg: 'base', text: 'contrast' },
  tint: { bg: 'muted', text: 'contrast' },
  ink: { bg: 'contrast', text: 'base' },
  oxblood: { bg: 'accent', text: 'base' },
};

export const pe = (slug: string, attributes: Record<string, unknown> = {}) => b(`prepress/paper-${slug}`, attributes);
/** A small mono label: kicker, section name, fine print. */
export const label = (content: string, attributes: Record<string, unknown> = {}) =>
  p(content, { fontFamily: 'mono', fontSize: 'small', style: { typography: { letterSpacing: '0.14em', textTransform: 'uppercase' } }, ...attributes });
const deck = (content: string, attributes: Record<string, unknown> = {}) => p(content, { fontSize: 'large', style: { typography: { fontStyle: 'italic', lineHeight: '1.45' } }, ...attributes });
const button = (text: string, url: string, attributes: Record<string, unknown> = {}) => b('core/buttons', {}, [b('core/button', { text, url, ...attributes })]);
const cols = (widths: string[], children: BlockNode[][], gap = 70, attrs: Record<string, unknown> = {}) =>
  kitCols(widths, children, { style: { spacing: { blockGap: { left: SP(gap), top: SP(50) } } }, ...attrs });

/** A full-width section in one of the four tones. */
export function section(name: string, tone: Tone, children: BlockNode[], pad: { top?: number; bottom?: number; gap?: number } = {}): BlockNode {
  return kitSection(name, TONE[tone], children, pad);
}

// ---------- records: core blocks + the set's block styles (style.ts) ----------

/** Newspaper nameplate between double rules: date line, the name (the page's h1) and a motto. */
const masthead = (o: { name?: string; dateline?: string; place?: string; issue?: string; motto?: string } = {}) =>
  b('core/group', { align: 'wide', className: is('paper-masthead'), style: { spacing: { blockGap: '0' } }, layout: { type: 'default' } }, [
    b('core/group', { layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'nowrap' } }, [
      p(o.dateline ?? 'Thursday, 15 October 2026'),
      p(o.place ?? 'Written in Trieste'),
      p(o.issue ?? 'No. 142'),
    ]),
    h(o.name ?? 'The Margin', 1, { fontSize: 'nameplate' }),
    p(o.motto ?? 'A weekly letter on design, slow software and the craft of making things.'),
  ]);
/** The opening paragraph: accent drop cap, the first <strong> words set as a small-caps run-in. */
const lede = (runin: string, text: string) => p(`<strong>${runin}</strong> ${text}`, { className: is('paper-lede') });
/** A line lifted from the text: "rule" (between rules) or "centred" (under a fleuron). */
export const pullquote = (quote: string, look: 'rule' | 'centred', citation = '') => b('core/pullquote', { value: quote, ...(citation ? { citation } : {}), className: is(`paper-${look}`) });
/** A numbered margin note: put it right after its paragraph (which carries the matching <sup>). */
const note = (number: string, text: string) => b('core/group', { className: is('paper-sidenote'), layout: { type: 'default' } }, [p(`<strong>${number}</strong>${text}`)]);
const byline = (author = 'Ana Novak', role = 'Editor', date = '15 October 2026', read = '9 min read') =>
  b('core/group', { className: is('paper-byline'), layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [p(`By <strong>${author}</strong>, ${role}`), p(`${date} · ${read}`)]);
/** A section break: asterism ⁂, fleuron ❦ or a double rule. */
export const ornament = (kind: 'asterism' | 'fleuron' | 'double', attributes: Record<string, unknown> = {}) => b('core/separator', { className: is(`paper-${kind}`), ...attributes });
/** One archive / contents entry: number, kicker, title (linked) — dot leader — date. */
const row = (number: string, kicker: string, title: string, date: string, url = '/essays/') =>
  b('core/group', { className: is('paper-index-row'), layout: { type: 'default' } }, [
    p(number),
    b('core/group', { layout: { type: 'default' } }, [
      p(kicker),
      b('core/group', { layout: { type: 'flex', flexWrap: 'nowrap' } }, [h(url ? `<a href="${url}">${title}</a>` : title, 3), p(date)]),
    ]),
  ]);
const rows = (list: BlockNode[]) => b('core/group', { layout: { type: 'default' }, style: { spacing: { blockGap: '0' } } }, list);

const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/the-margin';
/** A photograph printed like a plate in the letter: black and white, multiplied into the paper, caption in mono. */
const plate = (file: string, alt: string, caption: string, attributes: Record<string, unknown> = {}) =>
  b('core/image', { url: `${PICS}/the-margin-${file}.jpg`, alt, caption, className: is('paper-plate'), ...attributes });

export const PATTERNS: SetPattern[] = [
  {
    key: 'front-page',
    role: 'hero',
    title: 'Paper front page',
    description: 'A newspaper front page: masthead between double rules, then the lead story — kicker, headline, italic deck, byline and a link — beside an engraved sun.',
    tags: ['hero', 'masthead', 'editorial'],
    sections: [
      section('Front page', 'paper', [
        masthead(),
        cols(['60%', '40%'], [
          [
            label('This week’s essay', { textColor: 'accent' }),
            h('On slow software', 2, { fontSize: 'xxx-large' }),
            deck('The programs we keep for decades are quiet, a little stubborn and never in a hurry. What they know that the rest of our tools forgot.'),
            byline(),
            button('Read the essay →', '/on-slow-software/'),
          ],
          [pe('engraving', { motif: 'sun', size: 'l', caption: 'Fig. 1 — The patient sun' })],
        ], 80, { verticalAlignment: 'center' }),
      ], { top: 50, bottom: 80, gap: 70 }),
    ],
  },
  {
    key: 'contents',
    role: 'list',
    title: 'Paper contents',
    description: 'An issue’s table of contents: a mono label and numbered entries joined to their page by dot leaders.',
    tags: ['contents', 'index', 'list'],
    sections: [
      section('In this issue', 'paper', [
        ornament('double'),
        label('In this issue — No. 142', { style: { typography: { letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center' } } }),
        rows([
          row('I', 'Essay', 'On slow software', 'p. 1', '/on-slow-software/'),
          row('II', 'Notebook', 'Seven tools I have used for ten years', 'p. 4'),
          row('III', 'Letters', 'You wrote back about kitchen timers', 'p. 6', '/#letters'),
          row('IV', 'Colophon', 'How this letter is made, and by whom', 'p. 8', '/about/'),
        ]),
      ], { top: 30, bottom: 70, gap: 40 }),
    ],
  },
  {
    key: 'briefs',
    role: 'features',
    title: 'Paper briefs',
    description: 'Three short pieces side by side on a tinted band — a small engraving, mono kicker, headline, a two-line deck and a read link — under a fleuron.',
    tags: ['columns', 'teasers', 'editorial'],
    sections: [
      section('Briefs', 'tint', [
        ornament('fleuron', { align: 'wide' }),
        cols(['', '', ''], [
          [pe('engraving', { motif: 'compass', size: 's', position: 'left' }), label('Notebook', { textColor: 'accent' }), h('Seven tools I have used for ten years', 3, { fontSize: 'x-large' }), p('A text editor, a notebook, a calendar on paper and four small programs that never changed their minds.'), p('<a href="/essays/">Read →</a>', { fontFamily: 'mono', fontSize: 'small' })],
          [pe('engraving', { motif: 'sun', size: 's', position: 'left' }), label('Workshop', { textColor: 'accent' }), h('The case for a boring settings page', 3, { fontSize: 'x-large' }), p('Every toggle is a question you didn’t answer. A short defence of software with opinions.'), p('<a href="/essays/">Read →</a>', { fontFamily: 'mono', fontSize: 'small' })],
          [pe('engraving', { motif: 'waves', size: 's', position: 'left' }), label('Field notes', { textColor: 'accent' }), h('What the print shop taught me about deadlines', 3, { fontSize: 'x-large' }), p('Ink dries at its own speed. Notes from a week beside a Heidelberg press in Trieste.'), p('<a href="/essays/">Read →</a>', { fontFamily: 'mono', fontSize: 'small' })],
        ], 60),
      ], { top: 70, bottom: 80, gap: 60 }),
    ],
  },
  {
    key: 'plate',
    role: 'gallery',
    title: 'Paper photo plate',
    description: 'One documentary photograph printed across the wide measure like a plate in a book, with a numbered figure caption in mono.',
    tags: ['image', 'photo', 'editorial'],
    sections: [
      section('Plate', 'paper', [
        plate('press', 'An old printer inking a Heidelberg platen press, type cases on the wall behind him', 'Fig. 2 — The Heidelberg at Tipografia Lloyd, Trieste. Ink dries at its own speed.', { align: 'wide' }),
      ], { top: 70, bottom: 70 }),
    ],
  },
  {
    key: 'essay',
    role: 'article',
    title: 'Paper essay',
    description: 'A complete essay opening on the reading measure: kicker, headline, deck, byline, a drop-cap lede, body text with a margin sidenote, a subhead, a pull quote and an asterism to close.',
    tags: ['article', 'longform', 'blog'],
    sections: [
      section('Essay', 'paper', [
        label('Essay — No. 142', { textColor: 'accent' }),
        h('On slow software', 1),
        deck('The programs we keep for decades are quiet, a little stubborn and never in a hurry. What they know that the rest of our tools forgot.'),
        byline(),
        plate('desk', 'A writer’s desk at night: an open notebook, a fountain pen, a lamp and an old computer', 'Fig. 1 — Where the letter is written, Wednesday nights.', { align: 'wide' }),
        lede('Every program I love', 'does one thing, slowly and well. It opens without a spinner, forgets nothing I told it, and has never once asked me to rate my experience.'),
        p('I have been thinking about why. The calendar I use was written in 1998 by one person in Graz.<sup>1</sup> It has had four updates since I installed it. None of them moved a button.'),
        note('1', 'He still answers email, usually within a week, always in full sentences.'),
        p('Most of what lives on my phone is the opposite. It is fast in the way a waiter is fast when he wants the table back: attentive, eager, and gone the moment you need him.'),
        h('Patience is a feature', 2, { fontSize: 'xx-large' }),
        p('Slow software is not slow to use. It is slow to change. It treats the habits you built around it as something worth protecting, and it assumes you will still be here next year.'),
        pullquote('Software should be a place you visit, not a place that visits you.', 'rule'),
        plate('timer', 'An old mechanical kitchen timer on a marble counter beside half a lemon', 'Fig. 3 — Forty years, one dial, no updates.', { align: 'center', width: '320px' }),
        p('That is the whole argument, really. The rest of this letter is examples — seven of them, from a text editor to a kitchen timer — and one confession about a to-do app I abandoned three times.<sup>2</sup>'),
        note('2', 'It is now on its eleventh redesign. I wish it well, from a distance.'),
        p('If there is a lesson, it is an old one from the print shop: make the thing well, then leave it alone long enough for people to love it.'),
        ornament('asterism'),
      ], { top: 80, bottom: 80, gap: 40 }),
    ],
  },
  {
    key: 'pull-spread',
    role: 'showcase',
    title: 'Paper pull-quote spread',
    description: 'One sentence given a whole oxblood spread: a centred italic pull quote under a fleuron, with its source in mono.',
    tags: ['quote', 'statement', 'editorial'],
    sections: [
      section('Pull quote', 'oxblood', [
        pullquote('Make the thing well, then leave it alone long enough for people to love it.', 'centred', 'From “On slow software”'),
      ], { top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'archive',
    role: 'list',
    title: 'Paper archive',
    description: 'The archive: a heading and a short note in a narrow column beside a numbered list of past letters with kickers, dot leaders and dates.',
    tags: ['archive', 'blog', 'index'],
    sections: [
      section('Archive', 'paper', [
        cols(['30%', '70%'], [
          [label('The archive', { textColor: 'accent' }), h('Every letter, newest first', 2, { fontSize: 'xx-large' }), p('One hundred and forty-two Thursdays so far. The early ones are shorter and more certain.', { fontSize: 'small' })],
          [
            rows([
              row('142', 'Essay', 'On slow software', '15 Oct 2026', '/on-slow-software/'),
              row('141', 'Notebook', 'Seven tools I have used for ten years', '8 Oct 2026'),
              row('140', 'Workshop', 'The case for a boring settings page', '1 Oct 2026'),
              row('139', 'Field notes', 'What the print shop taught me about deadlines', '24 Sep 2026'),
              row('138', 'Essay', 'Against the infinite scroll', '17 Sep 2026'),
              row('137', 'Letters', 'Your favourite tools, ranked by nobody', '10 Sep 2026'),
              row('136', 'Essay', 'A defence of the footnote', '3 Sep 2026'),
            ]),
          ],
        ], 80),
      ], { top: 70, bottom: 80 }),
    ],
  },
  {
    key: 'letters',
    role: 'testimonial',
    title: 'Paper letters',
    description: 'Letters to the editor: three short reader letters in columns, each in italic with the writer’s name and town in mono, on a tinted band.',
    tags: ['testimonials', 'quotes', 'community'],
    sections: [
      section('Letters', 'tint', [
        b('core/group', { align: 'wide', layout: { type: 'default' }, style: { spacing: { blockGap: SP(30) } } }, [
          label('Letters to the editor', { textColor: 'accent' }),
          h('You wrote back', 2, { fontSize: 'xx-large', anchor: 'letters' }),
        ]),
        cols(['', '', ''], [
          [p('“I read it on Thursday mornings before I open anything with a notification badge. It has become the quietest ten minutes of my week.”', { style: { typography: { fontStyle: 'italic' } } }), label('— Marta K., Zagreb')],
          [p('“My kitchen timer is forty years old and has never needed an update. Thank you for finally giving me words for why I love it.”', { style: { typography: { fontStyle: 'italic' } } }), label('— Owen P., Cardiff')],
          [p('“Forwarded the settings-page essay to my whole team. We removed nine toggles. Nobody has noticed, which I think was your point.”', { style: { typography: { fontStyle: 'italic' } } }), label('— Ines R., Porto')],
        ], 60),
      ], { top: 80, bottom: 80, gap: 50 }),
    ],
  },
  {
    key: 'subscribe',
    role: 'cta',
    title: 'Paper subscribe',
    description: 'A subscription card on ink: an engraved moon, a headline, one paragraph, a button to the newsletter page and fine print in mono. No form — it links where the list lives.',
    tags: ['newsletter', 'cta', 'subscribe'],
    sections: [
      section('Subscribe', 'ink', [
        pe('engraving', { motif: 'moon', size: 's' }),
        h('Letters, once a week', 2, { fontSize: 'xxx-large', style: { typography: { textAlign: 'center' } } }),
        p('A single essay every Thursday morning, a few notes from the workshop and the best letters from readers. Free, and easy to leave.', { fontSize: 'large', style: { typography: { textAlign: 'center' } } }),
        b('core/buttons', { layout: { type: 'flex', justifyContent: 'center' } }, [b('core/button', { text: 'Subscribe — it’s free', url: '/subscribe/', backgroundColor: 'base', textColor: 'contrast' })]),
        label('No tracking · Plain text · Leave in one click', { style: { typography: { letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center' } } }),
      ], { top: 80, bottom: 80, gap: 40 }),
    ],
  },
  {
    key: 'about',
    role: 'story',
    title: 'Paper about the editor',
    description: 'About the editor: a black-and-white portrait beside a mono label, a heading, three paragraphs and a handwritten-feeling italic signature.',
    tags: ['about', 'bio', 'editorial'],
    sections: [
      section('About the editor', 'paper', [
        cols(['36%', '64%'], [
          [plate('ana', 'Ana Novak by the window of her flat, bookshelves behind her', 'Ana, at home in Trieste.')],
          [
            label('The editor', { textColor: 'accent' }),
            h('Hello, I’m Ana', 2, { fontSize: 'xx-large' }),
            p('I design software for a living and have spent twenty years watching good tools disappear. The Margin is where I write down what the survivors have in common.'),
            p('It started in 2023 as a letter to eleven friends. It now reaches a few thousand people who would rather read one careful essay than forty hurried posts.'),
            p('I write from a small flat in Trieste, usually on Wednesday nights, with a fountain pen first and a very old text editor second.'),
            p('— Ana', { fontFamily: 'heading', fontSize: 'x-large', style: { typography: { fontStyle: 'italic' } } }),
          ],
        ], 80, { verticalAlignment: 'center' }),
      ], { top: 80, bottom: 80 }),
    ],
  },
  {
    key: 'questions',
    role: 'faq',
    title: 'Paper questions',
    description: 'Questions before subscribing on the reading measure: a heading, each question as a small heading with its answer, an asterism to close.',
    tags: ['faq', 'questions', 'editorial'],
    sections: [
      section('Questions', 'paper', [
        h('Before you subscribe', 2, { fontSize: 'xx-large' }),
        h('What arrives, and when?', 3, { fontSize: 'large' }),
        p('One letter every Thursday at seven in the morning, Central European Time: an essay, a few notes and the best replies. Nothing else, ever.'),
        h('Does it cost anything?', 3, { fontSize: 'large' }),
        p('No. Readers who want to support it can buy the yearly printed edition, which is the same letters on good paper.'),
        h('What do you do with my address?', 3, { fontSize: 'large' }),
        p('Send you the letter. There are no tracking pixels, no link redirects and no third parties. Reply to any letter and Ana reads it.'),
        ornament('asterism'),
      ], { top: 70, bottom: 80, gap: 40 }),
    ],
  },
  {
    key: 'page-title',
    role: 'page-title',
    title: 'Paper page title',
    description: 'A page opener on the reading measure: mono kicker in the accent colour, a headline, an italic deck and a double rule.',
    tags: ['title', 'header', 'editorial'],
    sections: [
      section('Page title', 'paper', [
        label('The archive', { textColor: 'accent' }),
        h('Essays', 1),
        deck('Every Thursday since 2023: essays on design, slow software and the craft of making things, newest first.'),
        ornament('double'),
      ], { top: 80, bottom: 30, gap: 40 }),
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
      style: { spacing: { padding: { top: SP(40), bottom: SP(40), left: SP(50), right: SP(50) } }, border: { bottom: { width: '1px', color: 'var:preset|color|contrast', style: 'solid' } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        b('core/site-title', { level: 0, fontFamily: 'heading', fontSize: 'x-large', style: { typography: { fontWeight: '500', letterSpacing: '-0.02em' } } }),
        b('core/group', { layout: { type: 'flex', flexWrap: 'wrap' }, style: { spacing: { blockGap: SP(50) } } }, [
          b('core/navigation', { fontFamily: 'mono', fontSize: 'small', layout: { type: 'flex', justifyContent: 'right' }, style: { typography: { fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.12em' }, spacing: { blockGap: SP(50) } } }, [
            b('core/navigation-link', { label: 'Essays', url: '/essays/', kind: 'custom' }),
            b('core/navigation-link', { label: 'About', url: '/about/', kind: 'custom' }),
          ]),
          b('core/buttons', { className: is('paper-desktop-only') }, [b('core/button', { text: 'Subscribe', url: '/subscribe/' })]),
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
      style: { spacing: { padding: { top: SP(70), bottom: SP(50), left: SP(50), right: SP(50) }, blockGap: SP(60) } },
      layout: { type: 'constrained' },
    },
    [
      ornament('fleuron', { align: 'wide' }),
      cols(['44%', '22%', '34%'], [
        [
          b('core/site-title', { level: 0, fontFamily: 'heading', fontSize: 'xx-large', style: { typography: { fontWeight: '500', letterSpacing: '-0.025em' } } }),
          p('A weekly letter on design, slow software and the craft of making things. Thursdays, since 2023.', { style: { typography: { fontStyle: 'italic' } } }),
        ],
        [
          label('Sections'),
          b('core/navigation', { overlayMenu: 'never', layout: { type: 'flex', orientation: 'vertical' }, style: { spacing: { blockGap: SP(20) } } }, [
            b('core/navigation-link', { label: 'Home', url: '/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Essays', url: '/essays/', kind: 'custom' }),
            b('core/navigation-link', { label: 'About', url: '/about/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Subscribe', url: '/subscribe/', kind: 'custom' }),
          ]),
        ],
        [label('Colophon'), p('Set in Fraunces, Newsreader and IBM Plex Mono. Written by hand, published as plain HTML, read without trackers.', { fontSize: 'small' })],
      ], 60),
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }, style: { border: { top: { width: '1px', color: 'var:preset|color|contrast', style: 'solid' } }, spacing: { padding: { top: SP(30) } } } }, [
        label('© 2026 The Margin · Trieste'),
        label('Made with <a href="https://prepress.digitalno.de">Prepress</a>'),
      ]),
    ],
  ),
];
