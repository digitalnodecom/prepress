/**
 * Switchback — patterns. Copy is written for "Switchback", a fictional
 * experimentation and content workbench dressed as an outdoor brand (a
 * switchback is a mountain trail's hairpin, and a kind of A/B test). The
 * company, its customers, people, numbers and integrations are samples; the
 * photographs are generated samples, to be replaced with the product's own.
 *
 * Every headline is two lines: the first plain, the second highlighted
 * (<mark>), which the "Extruded line" block style pushes back through four
 * greens. Every section after the first is an overlapping sheet (block style
 * "Overlapping band").
 */
import type { BlockNode } from '../../src/lib/types';
import { b, button, buttons, cols, details, group, h, img as kitImg, is, p, row, section as kitSection, SP, type SetPattern } from '../kit';
import { sphereWith } from './blocks';

export { b, h, p, SP };
const PICS = 'https://prepress.s3.fr-par.scw.cloud/_library/switchback';
const img = (file: string, alt: string, attributes: Record<string, unknown> = {}) => kitImg(`${PICS}/${file}.jpg`, alt, attributes);
export const START = '/pricing/';
export const MAIL = 'mailto:hello@switchback.example';

type Ground = 'base' | 'secondary' | 'contrast' | 'muted';
/** An overlapping sheet on one of the set's grounds. */
export function section(name: string, ground: Ground, children: BlockNode[], o: Parameters<typeof kitSection>[3] = {}): BlockNode {
  return kitSection(name, { bg: ground, text: ground === 'contrast' ? 'base' : 'contrast' }, children, { style: 'switchback-band', side: 30, gap: 60, ...o });
}

/** A two-line headline, the second line extruded. */
export const headline = (plain: string, extruded: string, level = 2, attributes: Record<string, unknown> = {}) =>
  h(`${plain}<br><mark>${extruded}</mark>`, level, { className: is('switchback-extrude'), style: { typography: { textAlign: 'center' } }, ...attributes });
export const eyebrow = (text: string, attributes: Record<string, unknown> = {}) => p(text, { className: is('switchback-eyebrow'), ...attributes });
const lead = (text: string, a: Record<string, any> = {}) => p(text, { fontSize: 'large', ...a, style: { ...a.style, typography: { fontWeight: '500', ...a.style?.typography } } });
const CENTER = { style: { typography: { textAlign: 'center' } } };
const centred = (children: BlockNode[]) => group({ layout: { type: 'flex', orientation: 'vertical', justifyContent: 'center' }, style: { spacing: { blockGap: SP(40) } } }, children);
const dark = (text: string, url: string) => button(text, url, { className: is('switchback-dark') });

// ---------- records: core blocks + the set's block styles (style.ts) ----------

const stat = (figure: string, label: string) => group({}, [p(figure), p(label)]);
const card = (file: string, alt: string, chip: string, label: string, title: string, text: string, action: string) =>
  group({}, [img(file, alt, { caption: chip }), p(label), h(title, 3), p(text), buttons([dark(action, '/product/')])]);
const path = (title: string, text: string, motif: string) => group({}, [group({}, [h(title, 3), p(text)]), b('prepress/switchback-trinkets', { motif })]);
const story = (company: string, result: string, quote: string, name: string, role: string) => group({}, [p(company), h(result, 3), p(quote), p(`<strong>${name}</strong>${role}`)]);
const plan = (name: string, price: string, per: string, text: string, action: BlockNode, featured = false) =>
  group(featured ? { backgroundColor: 'secondary', textColor: 'contrast' } : { backgroundColor: 'primary', textColor: 'secondary' }, [p(name), p(`${price}<small>/${per}</small>`), p(text), buttons([action])]);
const pill = (name: string) => p(`<a href="/product/#integrations">${name}</a>`);

export const PATTERNS: SetPattern[] = [
  {
    key: 'hero',
    role: 'hero',
    title: 'Arched headline over a sunset',
    description: 'A sunset seascape with the headline bent over an arch and extruded in stepped greens; the lead in lime, the button and a proof line bottom-left, three glass status pills floating bottom-right. Its bottom corners are rounded under the next sheet.',
    tags: ['hero', 'saas', 'product'],
    sections: [
      b(
        'core/cover',
        {
          metadata: { name: 'First screen' },
          className: is('switchback-hero'),
          align: 'full',
          url: `${PICS}/sb-sunset.jpg`,
          alt: '',
          dimRatio: 10,
          overlayColor: 'base',
          minHeight: 760,
          minHeightUnit: 'px',
          contentPosition: 'top center',
          style: { spacing: { padding: { top: SP(80), bottom: SP(50), left: SP(30), right: SP(30) }, margin: { top: '0', bottom: '0' } } },
          layout: { type: 'constrained', contentSize: '1376px' },
        },
        [
          b('prepress/switchback-arch', { text: 'Ship what wins' }),
          row({ className: is('switchback-hero-foot'), layout: { flexWrap: 'wrap', justifyContent: 'space-between' } }, [
            group({}, [
              p('The workbench that writes the variants, runs the test, and tells you which one made money. Your team just picks the winner.'),
              buttons([button('Start free', START)]),
              p('4,300 teams testing. 14 days free, no card.'),
            ]),
            group({ className: is('switchback-pills') }, [p('Calling that test at 96%'), p('Writing variant 3 of 40'), p('Rolling the winner to 100%')]),
          ]),
        ],
      ),
    ],
  },
  {
    key: 'proof',
    role: 'stats',
    title: 'Event slab, customers and figures',
    description: 'A glacier photograph slab holding a light blue event card (an outlined lime event name, mono dates, a paragraph) with the ticket line and button on the right; under it a row of customer name tiles and four figures, one on lime.',
    tags: ['event', 'customers', 'stats'],
    sections: [
      section('Proof', 'secondary', [
        b(
          'core/cover',
          { className: is('switchback-event'), align: 'wide', url: `${PICS}/sb-glacier.jpg`, alt: '', dimRatio: 0, overlayColor: 'contrast', isDark: false, layout: { type: 'default' } },
          [
            group({ backgroundColor: 'muted', textColor: 'contrast' }, [
              h('Save your spot at', 3),
              p('Switchback Live 27', { className: is('switchback-outlined') }),
              eyebrow('Denver Mar 4 &nbsp;|&nbsp; Berlin Apr 22 &nbsp;|&nbsp; Online May 6'),
              p('Two days of live teardowns, arguments about statistical significance, and 2,600 growth leads who all think their homepage is fine.'),
            ]),
            group({}, [p('Tickets from $290<br>480 seats left in Denver'), buttons([button('Register now', MAIL + '?subject=Switchback%20Live')])]),
          ],
        ),
        lead('Trusted by 4,300 growth teams', CENTER),
        row({ align: 'wide', className: is('switchback-logos'), layout: { flexWrap: 'wrap', justifyContent: 'center' } }, [
          p('<strong>N</strong>Nordhaus'),
          p('<strong>K</strong>Kettle &amp; Co'),
          p('<strong>B</strong>Basalt Group'),
          p('<strong>V</strong>Vireo'),
          p('<strong>P</strong>Peachtree'),
          p('<strong>M</strong>Mainsail'),
          p('<strong>H</strong>Halyard'),
        ]),
        group({ align: 'wide', className: is('switchback-stats') }, [
          stat('4,300', 'teams growing on Switchback'),
          stat('1.2M', 'experiments called since 2019'),
          stat('+18.4%', 'median lift on a winning test'),
          stat('11 days', 'to a team’s first winner'),
        ]),
      ]),
    ],
  },
  {
    key: 'products',
    role: 'features',
    title: 'Three product cards',
    description: 'An extruded two-line headline over three cards: each a framed landscape photograph with an app panel drawn over it and a lime chip, then a mono label, a condensed title, a paragraph and a dark button. Cards lift when pointed at.',
    tags: ['features', 'product', 'cards'],
    sections: [
      section('Products', 'base', [
        headline('Tools to get you', 'shipping again'),
        group({ align: 'wide', className: is('switchback-cards') }, [
          card('sb-lake', 'A glacial lake below grey mountains, dark firs on the shore', 'Publish', 'Let your writers write', 'Content Studio', 'Draft, review and publish a variant without opening a ticket. Every change is versioned and reversible.', 'Let’s build'),
          card('sb-coast', 'A quiet beach at dusk under a pink sky', '+18.4%', 'Turn traffic into revenue', 'Experiment Engine', 'Run forty tests at once, stop the losers automatically, and prove the lift in dollars, not impressions.', 'Let’s test'),
          card('sb-meadow', 'Green meadows rolling up to a forest', 'Agent', 'Put the busywork on rails', 'Agent Runway', 'Agents write the variants, tag the results, and file the readout in your inbox before standup.', 'Let’s automate'),
        ]),
      ], { anchor: 'products' }),
    ],
  },
  {
    key: 'agents',
    role: 'showcase',
    title: 'Holographic sphere on the dark sheet',
    description: 'The dark sheet: an extruded headline with a white first line, a lead and the one holographic button, then a huge holographic sphere rising out of the bottom with glass status pills floating round it. The next sheet’s shoulders cut across the sphere.',
    tags: ['ai', 'agents', 'showcase', 'dark'],
    sections: [
      section('Agents', 'contrast', [
        centred([
          headline('Agents to make you', 'unstoppable'),
          lead('The tireless crew your backlog has been waiting for. Here to write the variants, call the tests, and hand you the readout before standup.', CENTER),
          buttons([button('Try and stop me', START, { className: is('switchback-holo') })], { layout: { type: 'flex', justifyContent: 'center' } }),
        ]),
        sphereWith(['Writing variant 3 of 40', 'Calling that test at 96%', 'Rolling out to 100%', 'Tagging this quarter’s winners', 'Drafting the Monday readout']),
      ], { bottom: 0, anchor: 'agents' }),
    ],
  },
  {
    key: 'workflow',
    role: 'intro',
    title: 'Four jobs as stickers',
    description: 'An extruded headline, a lead and a dark button, then four die-cut stickers in a row (striped, light blue with a lime burst, pink with a cross, lime with a stamp), each tilted with a hard shadow.',
    tags: ['intro', 'workflow', 'stickers'],
    sections: [
      section('Workflow', 'base', [
        centred([
          headline('Yes, it tests.', 'And the rest.'),
          lead('Plan the quarter, draft the copy, split the traffic, ship the winner. Four jobs, one workbench, no handover email.', CENTER),
          buttons([dark('Tour the workbench', '/product/')], { layout: { type: 'flex', justifyContent: 'center' } }),
        ]),
        b('prepress/switchback-stickers', { align: 'wide' }),
      ]),
    ],
  },
  {
    key: 'paths',
    role: 'story',
    title: 'Three paths, alternating',
    description: 'An extruded headline over three rows: a sage text card beside drawn trinkets (laptop and notebook, heart and basket, holographic orbs), the sides swapping each row; the trinkets straighten when the row is pointed at.',
    tags: ['story', 'features', 'illustration'],
    sections: [
      section('Paths', 'secondary', [
        headline('One platform.', 'Three paths to growth.'),
        group({ className: is('switchback-paths'), layout: { type: 'constrained', contentSize: '1160px' } }, [
          path('Marketer experience', 'Free your team to ship more, prove impact, and spend less time on work about work. Stop surviving, start winning.', 'desk'),
          path('Customer experience', 'Give every visitor the version that was written for them. Turn moments into momentum, and momentum into revenue.', 'shop'),
          path('Agent experience', 'Measure how your content reads to your newest customer, the language models, and tune it for the answers they give.', 'orbs'),
        ]),
      ]),
    ],
  },
  {
    key: 'stories',
    role: 'testimonial',
    title: 'Stories on three candy cards',
    description: 'Three story cards in sage, pink and light blue: a mono company label, the result set large in condensed type, a quote, and the person’s name and role.',
    tags: ['testimonial', 'customers', 'cards'],
    sections: [
      section('Stories', 'secondary', [
        headline('Stories of', 'success'),
        group({ align: 'wide', className: is('switchback-stories') }, [
          story('Nordhaus', '50% more signups', '“One headline test, run on a Tuesday, beat six months of arguing about the headline.”', 'Priya Raghunathan', 'Head of Growth'),
          story('Kettle &amp; Co', '400 hours saved', '“We cut a quarter’s worth of copy-paste out of every launch and nobody has asked for it back.”', 'Travis Okonkwo', 'Director of Lifecycle'),
          story('Basalt Group', 'Six weeks to payback', '“We stopped guessing in meetings. It paid for itself before the finance review.”', 'Mara Lindqvist', 'VP Digital'),
        ]),
      ], { anchor: 'stories' }),
    ],
  },
  {
    key: 'plans',
    role: 'pricing',
    title: 'Plans on the dark sheet',
    description: 'The dark sheet with an extruded headline and a lead, then three plan cards: fir with a faint hairline, the middle one white with its name in green; a name, a condensed price, a paragraph and a full-width button each.',
    tags: ['pricing', 'plans', 'dark'],
    sections: [
      section('Plans', 'contrast', [
        centred([
          headline('Plans to make you', 'dangerous'),
          lead('Every plan includes the visual editor, unlimited variants, and a stats engine that will happily tell you that you were wrong.', CENTER),
        ]),
        group({ align: 'wide', className: is('switchback-plans') }, [
          plan('Sprout', '$0', 'forever', 'One project, five live experiments, and the full visual editor. Good for proving a point.', button('Start free', MAIL + '?subject=Sprout', { className: 'is-style-outline' })),
          plan('Canopy', '$240', 'month', 'Unlimited experiments, 20 seats, Agent Runway, and results in your inbox by 9am.', button('Start 14-day trial', MAIL + '?subject=Canopy'), true),
          plan('Old Growth', '$1,900', 'month', 'Multi-brand rollouts, single sign-on, warehouse sync, and a strategist who answers on Saturdays.', button('Talk to sales', MAIL + '?subject=Old%20Growth', { className: 'is-style-outline' })),
        ]),
      ], { anchor: 'plans' }),
    ],
  },
  {
    key: 'faq',
    role: 'faq',
    title: 'Questions as white rows',
    description: 'A centred heading over white question rows with a lime plus that turns into a cross when a row opens.',
    tags: ['faq', 'questions'],
    sections: [
      section('Questions', 'base', [
        headline('Questions,', 'answered'),
        group({ className: is('switchback-faq'), layout: { type: 'constrained', contentSize: '880px' } }, [
          details('How long until a test calls itself?', ['Eleven days is the median at 40,000 sessions a month. Switchback stops the test the moment it clears 95% and posts the number in your channel.'], { showContent: true }),
          details('Do I need a developer to install it?', ['One script tag for the web, one SDK for mobile. Most teams are live in an afternoon; the record is 19 minutes, held by a bakery in Ghent.']),
          details('What happens to a losing variant?', ['It is archived with its numbers attached, so the next person who suggests it can be shown the receipts.']),
          details('Can we bring our own warehouse?', ['Canopy and Old Growth stream raw events to Snowdrift, Bigfoot or Redcliff every 15 minutes. Your analysts keep their SQL.']),
        ]),
      ], { anchor: 'faq' }),
    ],
  },
  {
    key: 'integrations',
    role: 'list',
    title: 'Pill wall on the hills',
    description: 'A photograph of green hills with an extruded headline, a wall of white integration pills (every fifth lime) and a frosted panel with a lead and a button.',
    tags: ['integrations', 'list', 'photo'],
    sections: [
      b(
        'core/cover',
        {
          metadata: { name: 'Integrations' },
          anchor: 'integrations',
          className: is('switchback-band'),
          align: 'full',
          url: `${PICS}/sb-hills.jpg`,
          alt: '',
          dimRatio: 0,
          overlayColor: 'base',
          isDark: false,
          style: { spacing: { padding: { top: SP(80), bottom: SP(80), left: SP(30), right: SP(30) }, margin: { top: '0', bottom: '0' }, blockGap: SP(60) } },
          layout: { type: 'constrained' },
        },
        [
          headline('Slots straight into', 'your existing stack'),
          row({ align: 'wide', className: is('switchback-wall'), layout: { flexWrap: 'wrap', justifyContent: 'center' } }, [
            'Cedar CMS', 'Tidepool', 'Lantern', 'Quarry', 'Halyard', 'Mossgard', 'Bellhop', 'Thicket', 'Kelphouse', 'Ripcord', 'Sable Pay', 'Wren Mail', 'Foxglove', 'Driftline',
          ].map(pill)),
          row({ align: 'wide', className: is('switchback-glass'), layout: { flexWrap: 'wrap', justifyContent: 'space-between' } }, [
            lead('Already got your stack set? Switchback talks to the 140 tools you already pay for, so nothing has to move for you to start testing.', { style: { typography: { fontWeight: '500' }, layout: { selfStretch: 'fixed', flexSize: '34rem' } } }),
            buttons([button('Ask about yours', MAIL + '?subject=Integrations')]),
          ]),
        ],
      ),
    ],
  },
  {
    key: 'contact',
    role: 'cta',
    title: 'Dark slab with a picture',
    description: 'A dark slab inside a white sheet: a meadow photograph on one side, a condensed headline, a line, a lime button and a small promise on the other.',
    tags: ['cta', 'contact'],
    sections: [
      section('Contact', 'secondary', [
        group({ align: 'wide', className: is('switchback-cta'), backgroundColor: 'contrast', textColor: 'base' }, [
          img('sb-meadow', 'Green meadows rolling up to a forest under a hazy sky'),
          group({}, [
            h('Let’s grow', 2, { fontSize: 'xx-large' }),
            lead('Tell us what you’re testing this quarter. We’ll show you the first three experiments we’d run.'),
            buttons([button('Email the team', MAIL + '?subject=What%20we%E2%80%99re%20testing')]),
            p('One human reads this and replies within a day. No sequence, no webinar invitation, no calendar link with forty slots.'),
          ]),
        ]),
      ], { anchor: 'contact' }),
    ],
  },
];

export const HEADER: BlockNode[] = [
  b(
    'core/group',
    {
      metadata: { name: 'Header' },
      align: 'full',
      className: is('switchback-header'),
      layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'nowrap' },
    },
    [
      b('core/site-title', { level: 0, className: is('switchback-wordmark') }),
      row({ className: is('switchback-navpill'), layout: { verticalAlignment: 'center' } }, [
        b('core/navigation', { fontSize: 'medium', layout: { type: 'flex' }, style: { typography: { fontWeight: '500' } } }, [
          b('core/navigation-link', { label: 'Product', url: '/product/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Pricing', url: '/pricing/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Customers', url: '/customers/', kind: 'custom' }),
          b('core/navigation-link', { label: 'Questions', url: '/pricing/#faq', kind: 'custom' }),
        ]),
        buttons([button('Get started', START)]),
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
      className: is('switchback-band'),
      backgroundColor: 'muted',
      textColor: 'contrast',
      style: { spacing: { padding: { top: SP(70), bottom: SP(40), left: SP(30), right: SP(30) }, blockGap: SP(60) } },
      layout: { type: 'constrained' },
    },
    [
      cols(['', '', '', '34%'], [
        [h('Product', 3), p('<a href="/product/#products">Content Studio</a><br><a href="/product/#products">Experiment Engine</a><br><a href="/product/#agents">Agent Runway</a><br><a href="/pricing/">Plans &amp; pricing</a>')],
        [h('Customers', 3), p('<a href="/customers/#stories">Stories</a><br><a href="/customers/">Switchback Live 27</a><br><a href="/pricing/#faq">Questions</a>')],
        [h('Company', 3), p(`<a href="${MAIL}">hello@switchback.example</a><br><a href="/product/#integrations">Integrations</a>`)],
        [group({ className: is('switchback-status') }, [p('All systems green.'), p('99.98% uptime over 90 days. 42 ms median SDK response.')])],
      ], { className: is('switchback-footer-cols') }),
      group({ align: 'full' }, [p('Switchback', { className: is('switchback-monument') })]),
      p('© 2027 Switchback, a sample company. Customers, people and figures are samples; photographs are generated samples. Made with <a href="https://prepress.digitalno.de">Prepress</a>.', { fontSize: 'small', style: { typography: { textAlign: 'center' } } }),
    ],
  ),
];
