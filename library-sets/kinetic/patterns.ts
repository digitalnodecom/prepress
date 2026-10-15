/**
 * Kinetic Grotesk — patterns: whole sections made of core blocks and the
 * kinetic blocks. Each is a library item of its own; the template is composed
 * from them. Copy is written for "Kinetic", a small independent studio.
 */
import type { BlockNode } from '../../src/lib/types';

type Tone = 'paper' | 'ink' | 'acid';
const TONE: Record<Tone, { backgroundColor: string; textColor: string }> = {
  paper: { backgroundColor: 'base', textColor: 'contrast' },
  ink: { backgroundColor: 'contrast', textColor: 'base' },
  acid: { backgroundColor: 'accent', textColor: 'contrast' },
};
const SP = (n: number) => `var:preset|spacing|${n}`;

export const b = (name: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []): BlockNode => ({ name, attributes, ...(innerBlocks.length ? { innerBlocks } : {}) });
export const k = (slug: string, attributes: Record<string, unknown> = {}) => b(`prepress/kinetic-${slug}`, attributes);
export const p = (content: string, attributes: Record<string, unknown> = {}) => b('core/paragraph', { content, ...attributes });
const h = (content: string, level: number, attributes: Record<string, unknown> = {}) => b('core/heading', { content, level, ...attributes });

/** A full-width section in one of the three tones. */
export function section(name: string, tone: Tone, children: BlockNode[], pad: { top?: number; bottom?: number } = {}): BlockNode {
  return b(
    'core/group',
    {
      metadata: { name },
      align: 'full',
      ...TONE[tone],
      style: { spacing: { padding: { top: SP(pad.top ?? 80), bottom: SP(pad.bottom ?? 80), left: SP(50), right: SP(50) }, margin: { top: '0', bottom: '0' }, blockGap: SP(60) } },
      layout: { type: 'constrained' },
    },
    children,
  );
}

/** Label column (sticky) + content column, wide. */
function split(num: string, label: string, content: BlockNode[]): BlockNode {
  return b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: SP(60) } } } }, [
    b('core/column', { width: '22%' }, [k('label', { number: num, text: label })]),
    b('core/column', { width: '78%' }, content),
  ]);
}

const row = (n: string, title: string, meta: string, year: string, url = '/work/') => k('index-row', { number: n, title, meta, year, url });
const pills = (...items: BlockNode[]) => b('core/group', { layout: { type: 'flex', flexWrap: 'wrap' }, style: { spacing: { blockGap: SP(30) } } }, items);

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
    title: 'Kinetic hero',
    description: 'Screen-wide display headline with an eyebrow, a short intro, two pills and a full-bleed ink marquee.',
    tags: ['hero', 'marquee', 'studio'],
    sections: [
      section('Hero', 'paper', [
        k('display', { eyebrow: 'Independent studio — since 2014', text: 'We make<br>things move', size: 'mega', primary: true, dot: true, align: 'wide' }),
        b('core/columns', { align: 'wide', verticalAlignment: 'bottom' }, [
          b('core/column', { width: '55%' }, [
            p('Kinetic is a brand and digital studio for companies that would rather be remembered than liked. We design identities, websites and motion that refuse to sit still.', { fontSize: 'large' }),
          ]),
          b('core/column', { width: '45%' }, [
            pills(k('pill', { label: 'Start a project', url: '/contact/', look: 'ink' }), k('pill', { label: 'See the work', url: '/work/', look: 'outline' })),
          ]),
        ]),
      ], { top: 70, bottom: 70 }),
      k('marquee', { text: 'Brand identity ✶ Websites ✶ Motion ✶ Art direction ✶ Campaigns', size: 'l', tone: 'ink', speed: 'normal', align: 'full' }),
    ],
  },
  {
    key: 'work-index',
    title: 'Kinetic work index',
    description: 'A sticky section label beside a numbered project index; every row floods with ink and turns acid on hover.',
    tags: ['portfolio', 'index', 'list'],
    sections: [
      section('Work index', 'paper', [
        split('01', 'Selected work', [
          row('01', 'Lumen Energy', 'Identity · Web', '2026'),
          row('02', 'Fieldwork', 'Product · App', '2025'),
          row('03', 'Atlas Architects', 'Identity · Print', '2025'),
          row('04', 'Northwind Records', 'Campaign · Motion', '2024'),
          row('05', 'Parcel & Co', 'Web · E-commerce', '2024'),
          pills(k('pill', { label: 'All projects', url: '/work/', look: 'outline' })),
        ]),
      ]),
    ],
  },
  {
    key: 'manifesto',
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
    title: 'Kinetic stats',
    description: 'Three oversized numbers with captions; an acid line sweeps under each as it scrolls into view.',
    tags: ['stats', 'numbers', 'proof'],
    sections: [
      section('Stats', 'paper', [
        split('03', 'In numbers', [
          b('core/columns', { style: { spacing: { blockGap: { left: SP(50), top: SP(60) } } } }, [
            b('core/column', {}, [k('stat', { value: '120', suffix: '+', label: 'Projects shipped' })]),
            b('core/column', {}, [k('stat', { value: '3', suffix: '×', label: 'Average conversion lift' })]),
            b('core/column', {}, [k('stat', { value: '9', suffix: '', label: 'Design awards' })]),
          ]),
        ]),
      ]),
    ],
  },
  {
    key: 'clients',
    title: 'Kinetic clients',
    description: 'A “trusted by” line over a reversed marquee of client names on paper.',
    tags: ['logos', 'clients', 'marquee'],
    sections: [
      section('Clients', 'paper', [
        p('Trusted by people who ship', { align: 'wide', fontSize: 'small', style: { typography: { fontWeight: '600', letterSpacing: '0.16em', textTransform: 'uppercase' } } }),
      ], { top: 60, bottom: 40 }),
      k('marquee', { text: 'Lumen ✶ Fieldwork ✶ Atlas ✶ Northwind ✶ Parcel ✶ Hearth ✶ Oakline', size: 'm', tone: 'paper', speed: 'slow', reverse: true, align: 'full' }),
    ],
  },
  {
    key: 'testimonial',
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
    title: 'Kinetic call to action',
    description: 'A giant “Let’s talk” on acid with an email pill and a booking pill.',
    tags: ['cta', 'contact', 'bold'],
    sections: [
      section('Call to action', 'acid', [
        k('display', { eyebrow: 'Have something in mind?', text: 'Let’s talk', size: 'mega', primary: false, dot: true, align: 'wide' }),
        b('core/group', { align: 'wide', layout: { type: 'flex', flexWrap: 'wrap' }, style: { spacing: { blockGap: SP(30) } } }, [
          k('pill', { label: 'hello@kinetic.studio', url: 'mailto:hello@kinetic.studio', look: 'ink' }),
          k('pill', { label: 'Book a 20-minute call', url: '/contact/', look: 'outline' }),
        ]),
      ]),
    ],
  },
  {
    key: 'page-title',
    title: 'Kinetic page title',
    description: 'A page opener: eyebrow, display-size title and a short lead paragraph.',
    tags: ['title', 'header', 'typography'],
    sections: [
      section('Page title', 'paper', [
        k('display', { eyebrow: 'Selected work 2014 — 2026', text: 'Work', size: 'mega', primary: true, dot: true, align: 'wide' }),
        p('Identities, websites and motion for companies that wanted to be remembered.', { align: 'wide', fontSize: 'large' }),
      ], { top: 70, bottom: 50 }),
    ],
  },
  {
    key: 'contact',
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
          pills(k('pill', { label: 'Instagram', url: 'https://instagram.com/', look: 'outline' }), k('pill', { label: 'LinkedIn', url: 'https://linkedin.com/', look: 'outline' }), k('pill', { label: 'Dribbble', url: 'https://dribbble.com/', look: 'outline' })),
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
          k('pill', { label: 'Start a project', url: '/contact/', look: 'ink', arrow: true, className: 'kx-header-cta' }),
        ]),
      ]),
    ],
  ),
];

export const FOOTER: BlockNode[] = [
  k('marquee', { text: 'Available for new projects ✶ Spring 2027', size: 's', tone: 'acid', speed: 'fast', align: 'full' }),
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
          k('pill', { label: 'hello@kinetic.studio', url: 'mailto:hello@kinetic.studio', look: 'acid' }),
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
      k('wordmark', { text: 'KINETIC', align: 'wide' }),
      b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
        p('© 2026 Kinetic Studio', { fontSize: 'small' }),
        p('Made with <a href="https://prepress.digitalno.de">Prepress</a>', { fontSize: 'small' }),
      ]),
    ],
  ),
];
