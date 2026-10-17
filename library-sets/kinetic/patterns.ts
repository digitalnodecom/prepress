/**
 * Kinetic Grotesk — patterns: whole sections made of core blocks and the
 * kinetic blocks. Each is a library item of its own; the template is composed
 * from them. Copy is written for "Kinetic", a small independent studio.
 */
import type { BlockNode } from '../../src/lib/types';
import { b, button, buttons, h, is, p, section as kitSection, SP, type SetPattern } from '../kit';

export { b, h, p, SP };
type Tone = 'paper' | 'ink' | 'acid';
const TONE: Record<Tone, { bg: string; text: string }> = {
  paper: { bg: 'base', text: 'contrast' },
  ink: { bg: 'contrast', text: 'base' },
  acid: { bg: 'accent', text: 'contrast' },
};

export const k = (slug: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []) => b(`prepress/kinetic-${slug}`, attributes, innerBlocks);

/** A full-width section in one of the three tones. */
export function section(name: string, tone: Tone, children: BlockNode[], pad: { top?: number; bottom?: number } = {}): BlockNode {
  return kitSection(name, TONE[tone], children, { ...pad, gap: 60 });
}

/** A section whose padded content is followed by a full-bleed marquee at its bottom edge. */
function band(name: string, tone: Tone, children: BlockNode[], ticker: BlockNode, pad: { top?: number; bottom?: number } = {}): BlockNode {
  const node = kitSection(name, TONE[tone], [
    b('core/group', { align: 'full', style: { spacing: { padding: { top: SP(pad.top ?? 80), bottom: SP(pad.bottom ?? 80), left: SP(50), right: SP(50) }, blockGap: SP(60) } }, layout: { type: 'constrained' } }, children),
    ticker,
  ], { top: 0, bottom: 0, side: 0, flow: true });
  (node.attributes!.style as any).spacing.blockGap = '0'; // the marquee sits right under the content
  return node;
}

// ---------- records: core blocks + the set's block styles (style.ts) ----------

/** An endless ticker; its words are one paragraph inside. */
export const marquee = (words: string, attributes: Record<string, unknown>) => k('marquee', { align: 'full', ...attributes }, [p(words)]);

/** Screen-wide headline (h1 on a page's opener) under an eyebrow line; the accent dot comes with the style. */
export const display = (eyebrow: string, text: string, level = 1) =>
  b('core/group', { align: 'wide', style: { spacing: { blockGap: SP(50) } }, layout: { type: 'default' } }, [
    p(eyebrow, { className: is('kinetic-eyebrow') }),
    h(text, level, { className: is('kinetic-display') }),
  ]);

/** A pill button: ink (floods acid), acid (floods ink) or outline. */
export const pill = (label: string, url: string, look: 'ink' | 'acid' | 'outline' = 'ink') =>
  button(label, url, { className: is(look === 'ink' ? 'kinetic-pill' : `kinetic-pill-${look}`) });
const pills = (...items: BlockNode[]) => buttons(items, { style: { spacing: { blockGap: SP(30) } } });

/** “(02) Services”: a small numbered label that sticks while its section scrolls. */
const label = (num: string, text: string) => p(`<strong>(${num})</strong> ${text}`, { className: is('kinetic-label') });

/** Label column (sticky) + content column, wide. */
function split(num: string, text: string, content: BlockNode[]): BlockNode {
  return b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: SP(60) } } } }, [
    b('core/column', { width: '22%' }, [label(num, text)]),
    b('core/column', { width: '78%' }, content),
  ]);
}

/** One numbered row of the project index: number, title (the link), tags, year; the arrow comes with the style. */
const row = (n: string, title: string, meta: string, year: string, url = '/work/') =>
  b('core/group', { className: is('kinetic-index-row'), layout: { type: 'default' } }, [p(n), p(`<a href="${url}">${title.replace(/&/g, '&amp;')}</a>`), p(meta), p(year)]);

/** An oversized number (suffix as <sup>) over its caption. */
const stat = (value: string, suffix: string, caption: string) =>
  b('core/group', { className: is('kinetic-stat'), layout: { type: 'default' } }, [p(suffix ? `${value}<sup>${suffix}</sup>` : value), p(caption)]);

const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/kinetic';
/** A project picture: caption = client — disciplines · year; links to the work unless `href` is ''. */
const shot = (file: string, alt: string, client: string, meta: string, attributes: Record<string, unknown> = {}) =>
  b('core/image', { url: `${PICS}/kinetic-${file}.jpg`, alt, href: '/work/', linkDestination: 'custom', className: is('kinetic-case'), caption: `<strong>${client}</strong> ${meta}`, ...attributes });
const still = (file: string, alt: string, title: string, text: string, attributes: Record<string, unknown> = {}) =>
  b('core/image', { url: `${PICS}/kinetic-${file}.jpg`, alt, className: is('kinetic-case'), caption: `<strong>${title}</strong> ${text}`, ...attributes });
const pair = (left: BlockNode, right: BlockNode) =>
  b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: SP(50) } } } }, [b('core/column', {}, [left]), b('core/column', {}, [right])]);

export const PATTERNS: SetPattern[] = [
  {
    key: 'hero',
    role: 'hero',
    title: 'Kinetic hero',
    description: 'Screen-wide display headline with an eyebrow, a short intro, two pills and a full-bleed ink marquee.',
    tags: ['hero', 'marquee', 'studio'],
    sections: [
      band('Hero', 'paper', [
        display('Independent studio — since 2014', 'We make<br>things move'),
        b('core/columns', { align: 'wide', verticalAlignment: 'bottom' }, [
          b('core/column', { width: '55%' }, [
            p('Kinetic is a brand and digital studio for companies that would rather be remembered than liked. We design identities, websites and motion that refuse to sit still.', { fontSize: 'large' }),
          ]),
          b('core/column', { width: '45%' }, [
            pills(pill('Start a project', '/contact/'), pill('See the work', '/work/', 'outline')),
          ]),
        ]),
      ], marquee('Brand identity ✶ Websites ✶ Motion ✶ Art direction ✶ Campaigns', { size: 'l', tone: 'ink', speed: 'normal' }), { top: 70, bottom: 70 }),
    ],
  },
  {
    key: 'work-index',
    role: 'list',
    title: 'Kinetic work index',
    description: 'A sticky section label beside a numbered project index; every row floods with ink and turns acid on hover.',
    tags: ['portfolio', 'index', 'list'],
    sections: [
      section('Work index', 'paper', [
        split('02', 'Project index', [
          row('01', 'Lumen Energy', 'Identity · Web', '2026'),
          row('02', 'Fieldwork', 'Product · App', '2025'),
          row('03', 'Atlas Architects', 'Identity · Print', '2025'),
          row('04', 'Northwind Records', 'Campaign · Motion', '2024'),
          row('05', 'Parcel & Co', 'Web · E-commerce', '2024'),
          pills(pill('All projects', '/work/', 'outline')),
        ]),
      ]),
    ],
  },
  {
    key: 'case-studies',
    role: 'gallery',
    title: 'Kinetic case studies',
    description: 'Big project pictures: a section label, one screen-wide case and two pairs below, each linked with a client and discipline caption; an acid frame snaps in on hover.',
    tags: ['portfolio', 'gallery', 'images'],
    sections: [
      section('Case studies', 'paper', [
        b('core/group', { align: 'wide', layout: { type: 'constrained' } }, [label('01', 'Selected work')]),
        shot('lumen', 'Lumen Energy posters and a billboard with the concentric sun mark on a concrete wall', 'Lumen Energy', 'Identity · Web · 2026', { align: 'wide' }),
        pair(
          shot('fieldwork', 'The Fieldwork app on a phone held up in a wheat field', 'Fieldwork', 'Product · App · 2025'),
          shot('atlas', 'A stack of Atlas Architects monographs on concrete in hard window light', 'Atlas Architects', 'Identity · Print · 2025'),
        ),
        pair(
          shot('northwind', 'Northwind Records sleeves on a record-shop wall, one held up by hand', 'Northwind Records', 'Campaign · Motion · 2024'),
          shot('parcel', 'Stacked Parcel & Co boxes with black and acid stripes and lime tape', 'Parcel & Co', 'Web · E-commerce · 2024'),
        ),
      ], { top: 70 }),
    ],
  },
  {
    key: 'studio-floor',
    role: 'story',
    title: 'Kinetic studio floor',
    description: 'A screen-wide photograph of the studio, then a smaller picture beside a short paragraph about how the team works.',
    tags: ['about', 'team', 'images'],
    sections: [
      section('Studio floor', 'paper', [
        still('studio', 'The studio floor: long tables, big factory windows and posters on a white brick wall', 'The floor', 'An old tool factory in Šiška, Ljubljana', { align: 'wide' }),
        b('core/columns', { align: 'wide', verticalAlignment: 'center', style: { spacing: { blockGap: { left: SP(60) } } } }, [
          b('core/column', { width: '40%' }, [still('proofs', 'Hands arranging printed poster proofs on a big table', 'Proofs', 'Everything gets printed before it ships')]),
          b('core/column', { width: '60%' }, [
            p('Everything starts on paper.', { fontSize: 'xx-large', fontFamily: 'heading', style: { typography: { fontWeight: '800', lineHeight: '0.95', letterSpacing: '-0.04em', textTransform: 'uppercase' } } }),
            p('Every identity, poster and screen gets printed, pinned to the wall and argued over before a client sees it. If it doesn’t hold up at arm’s length, it doesn’t ship.', { fontSize: 'large' }),
          ]),
        ]),
      ]),
    ],
  },
  {
    key: 'manifesto',
    role: 'intro',
    title: 'Kinetic manifesto',
    description: 'A huge statement in acid with highlighted words, a slowly turning starburst and a signature.',
    tags: ['statement', 'about', 'typography'],
    sections: [
      section('Manifesto', 'acid', [
        b('core/columns', { align: 'wide', verticalAlignment: 'center' }, [
          b('core/column', { width: '78%' }, [
            p('<span class="kx-outline">Loud</span> where it matters. Quiet everywhere else. We cut the noise and turn up the <span class="kx-hl">one thing</span> people remember.', {
              fontSize: 'statement',
              fontFamily: 'heading',
              style: { typography: { fontWeight: '800', lineHeight: '0.98', letterSpacing: '-0.04em', textTransform: 'uppercase' } },
            }),
            p('— Mira Okafor, founder', { fontSize: 'medium', style: { typography: { fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase' } } }),
          ]),
          b('core/column', { width: '22%' }, [k('shape', { shape: 'burst', size: 'm', spin: true })]),
        ]),
      ]),
    ],
  },
  {
    key: 'services',
    role: 'features',
    title: 'Kinetic services',
    description: 'Four numbered services in a 2×2 grid on ink, beside a sticky section label.',
    tags: ['services', 'features', 'dark'],
    sections: [
      section('Services', 'ink', [
        split('02', 'Services', [
          b('core/columns', { style: { spacing: { blockGap: { left: SP(60), top: SP(60) } } } }, [
            b('core/column', {}, [
              h('Brand<br>identity', 3, { fontSize: 'x-large' }),
              p('Names, logos, type and the rules that hold it all together, built to survive every format.'),
            ]),
            b('core/column', {}, [
              h('Websites', 3, { fontSize: 'x-large' }),
              p('Fast, accessible sites with real personality — designed and built by the same people.'),
            ]),
          ]),
          b('core/columns', { style: { spacing: { blockGap: { left: SP(60), top: SP(60) } } } }, [
            b('core/column', {}, [
              h('Motion', 3, { fontSize: 'x-large' }),
              p('Logo animations, product films and the small movements that make an interface feel alive.'),
            ]),
            b('core/column', {}, [
              h('Art<br>direction', 3, { fontSize: 'x-large' }),
              p('Campaigns and launches with one strong idea, carried all the way through.'),
            ]),
          ]),
        ]),
      ]),
    ],
  },
  {
    key: 'stats',
    role: 'stats',
    title: 'Kinetic stats',
    description: 'Three oversized numbers with captions; an acid line sweeps under each as it scrolls into view.',
    tags: ['stats', 'numbers', 'proof'],
    sections: [
      section('Stats', 'paper', [
        split('03', 'In numbers', [
          b('core/columns', { style: { spacing: { blockGap: { left: SP(50), top: SP(60) } } } }, [
            b('core/column', {}, [stat('120', '+', 'Projects shipped')]),
            b('core/column', {}, [stat('3', '×', 'Average conversion lift')]),
            b('core/column', {}, [stat('9', '', 'Design awards')]),
          ]),
        ]),
      ]),
    ],
  },
  {
    key: 'clients',
    role: 'showcase',
    title: 'Kinetic clients',
    description: 'A “trusted by” line over a reversed marquee of client names on paper.',
    tags: ['logos', 'clients', 'marquee'],
    sections: [
      band('Clients', 'paper', [
        p('Trusted by people who ship', { align: 'wide', fontSize: 'small', style: { typography: { fontWeight: '600', letterSpacing: '0.16em', textTransform: 'uppercase' } } }),
      ], marquee('Lumen ✶ Fieldwork ✶ Atlas ✶ Northwind ✶ Parcel ✶ Hearth ✶ Oakline', { size: 'm', tone: 'paper', speed: 'slow', reverse: true }), { top: 60, bottom: 40 }),
    ],
  },
  {
    key: 'testimonial',
    role: 'testimonial',
    title: 'Kinetic testimonial',
    description: 'One oversized quote on ink with an acid accent mark and the author line.',
    tags: ['testimonial', 'quote', 'dark'],
    sections: [
      section('Testimonial', 'ink', [
        p('“', { fontSize: 'mega', fontFamily: 'heading', textColor: 'accent', style: { typography: { fontWeight: '800', lineHeight: '0.6' } } }),
        p('They didn’t give us a logo. They gave us a way to talk — and people finally started listening.', {
          fontSize: 'xx-large',
          fontFamily: 'heading',
          style: { typography: { fontWeight: '700', lineHeight: '1.04', letterSpacing: '-0.03em' } },
        }),
        p('Jonas Berg — CEO, Lumen Energy', { fontSize: 'small', style: { typography: { fontWeight: '600', letterSpacing: '0.14em', textTransform: 'uppercase' } } }),
      ]),
    ],
  },
  {
    key: 'cta',
    role: 'cta',
    title: 'Kinetic call to action',
    description: 'A giant “Let’s talk” on acid with an email pill and a booking pill.',
    tags: ['cta', 'contact', 'bold'],
    sections: [
      section('Call to action', 'acid', [
        display('Have something in mind?', 'Let’s talk', 2),
        buttons([pill('hello@kinetic.studio', 'mailto:hello@kinetic.studio'), pill('Book a 20-minute call', '/contact/', 'outline')], { align: 'wide', style: { spacing: { blockGap: SP(30) } } }),
      ]),
    ],
  },
  {
    key: 'page-title',
    role: 'page-title',
    title: 'Kinetic page title',
    description: 'A page opener: eyebrow, display-size title and a short lead paragraph.',
    tags: ['title', 'header', 'typography'],
    sections: [
      section('Page title', 'paper', [
        display('Selected work 2014 — 2026', 'Work'),
        p('Identities, websites and motion for companies that wanted to be remembered.', { align: 'wide', fontSize: 'large' }),
      ], { top: 70, bottom: 50 }),
    ],
  },
  {
    key: 'contact',
    role: 'contact',
    title: 'Kinetic contact details',
    description: 'Contact block in three columns — email, studio address and socials as pills — with a slowly drifting orb.',
    tags: ['contact', 'details'],
    sections: [
      section('Contact', 'paper', [
        split('04', 'Contact', [
          b('core/columns', { style: { spacing: { blockGap: { left: SP(50), top: SP(50) } } } }, [
            b('core/column', {}, [
              p('New projects', { fontSize: 'small', style: { typography: { fontWeight: '600', letterSpacing: '0.14em', textTransform: 'uppercase' } } }),
              p('<a href="mailto:hello@kinetic.studio">hello@kinetic.studio</a>', { fontSize: 'large', fontFamily: 'heading', style: { typography: { fontWeight: '700' } } }),
            ]),
            b('core/column', {}, [
              p('Studio', { fontSize: 'small', style: { typography: { fontWeight: '600', letterSpacing: '0.14em', textTransform: 'uppercase' } } }),
              p('Canal Road 18<br>1000 Ljubljana', { fontSize: 'large', fontFamily: 'heading', style: { typography: { fontWeight: '700' } } }),
            ]),
            b('core/column', {}, [k('shape', { shape: 'orb', size: 'm', spin: true })]),
          ]),
          pills(pill('Instagram', 'https://instagram.com/', 'outline'), pill('LinkedIn', 'https://linkedin.com/', 'outline'), pill('Dribbble', 'https://dribbble.com/', 'outline')),
        ]),
      ]),
    ],
  },
];

/** Header and footer template parts. */
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
        b('core/site-title', { level: 0, fontFamily: 'heading', fontSize: 'large', style: { typography: { fontWeight: '800', letterSpacing: '-0.04em', textTransform: 'uppercase' } } }),
        b('core/group', { layout: { type: 'flex', flexWrap: 'wrap' }, style: { spacing: { blockGap: SP(50) } } }, [
          b('core/navigation', { layout: { type: 'flex', justifyContent: 'right' }, style: { typography: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' } }, fontSize: 'small' }, [
            b('core/navigation-link', { label: 'Work', url: '/work/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Studio', url: '/studio/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Contact', url: '/contact/', kind: 'custom' }),
          ]),
          buttons([pill('Start a project', '/contact/')], { className: is('kinetic-header-cta') }),
        ]),
      ]),
    ],
  ),
];

export const FOOTER: BlockNode[] = [
  marquee('Available for new projects ✶ Spring 2027', { size: 's', tone: 'acid', speed: 'fast' }),
  b(
    'core/group',
    {
      metadata: { name: 'Footer' },
      align: 'full',
      backgroundColor: 'contrast',
      textColor: 'base',
      style: { spacing: { padding: { top: SP(70), bottom: SP(40), left: SP(50), right: SP(50) }, margin: { top: '0' }, blockGap: SP(60) }, elements: { link: { color: { text: 'var:preset|color|base' } } } },
      layout: { type: 'constrained' },
    },
    [
      b('core/columns', { align: 'wide' }, [
        b('core/column', { width: '55%' }, [
          p('Got a project that needs to move?', { fontSize: 'xx-large', fontFamily: 'heading', style: { typography: { fontWeight: '800', lineHeight: '0.95', letterSpacing: '-0.04em', textTransform: 'uppercase' } } }),
          buttons([pill('hello@kinetic.studio', 'mailto:hello@kinetic.studio', 'acid')]),
        ]),
        b('core/column', { width: '45%' }, [
          b('core/navigation', { overlayMenu: 'never', layout: { type: 'flex', orientation: 'vertical' }, fontSize: 'large', style: { typography: { fontWeight: '600' }, spacing: { blockGap: SP(20) } } }, [
            b('core/navigation-link', { label: 'Home', url: '/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Work', url: '/work/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Studio', url: '/studio/', kind: 'custom' }),
            b('core/navigation-link', { label: 'Contact', url: '/contact/', kind: 'custom' }),
          ]),
        ]),
      ]),
      b('core/group', { align: 'wide', className: is('kinetic-wordmark'), layout: { type: 'default' } }, [p('Kinetic')]),
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        p('© 2026 Kinetic Studio', { fontSize: 'small' }),
        p('Made with <a href="https://prepress.digitalno.de">Prepress</a>', { fontSize: 'small' }),
      ]),
    ],
  ),
];
