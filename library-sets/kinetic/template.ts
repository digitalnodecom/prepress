/** Kinetic Grotesk — the full-site template, composed from the set's patterns. */
import type { PageSpec } from '../kit';
import { display, p, section } from './patterns';

const title = (eyebrow: string, text: string, lead: string) =>
  section('Page title', 'paper', [
    display(eyebrow, text),
    p(lead, { align: 'wide', fontSize: 'large' }),
  ], { top: 70, bottom: 50 });

export const TEMPLATE = {
  key: 'template',
  title: 'Kinetic Studio',
  description: 'A complete four-page studio site in Kinetic Grotesk: kinetic hero, case-study pictures, work index, manifesto, services, stats, client marquee, testimonial and a giant wordmark footer.',
  tags: ['studio', 'agency', 'portfolio', 'brutalist'],
  name: 'Kinetic',
  tagline: 'Brand & digital studio',
  brief:
    'Kinetic: a small independent brand and digital studio. Swiss-brutalist, confident, a little loud: paper, ink and one acid accent, oversized grotesk type, motion everywhere it helps. Visitors should see the work, understand the services, and start a project (email or book a call). Keep copy short and punchy; uppercase display headlines. The project and studio photographs are generated samples: replace them with the real work.',
  pages: [
    { title: 'Home', slug: 'home', sections: ['hero', 'case-studies', 'work-index', 'manifesto', 'stats', 'clients', 'testimonial', 'cta'] },
    { title: 'Work', slug: 'work', sections: ['page-title', 'case-studies', 'work-index', 'clients', 'cta'] },
    {
      title: 'Studio',
      slug: 'studio',
      sections: [
        title('The studio — Ljubljana', 'Studio', 'Eleven people, one floor, no account managers. The people you meet are the people who make the work.'),
        'studio-floor',
        'manifesto',
        'services',
        'stats',
        'testimonial',
        'cta',
      ],
    },
    {
      title: 'Contact',
      slug: 'contact',
      sections: [
        title('New projects, spring 2027', 'Say hello', 'Tell us what you’re making, when it needs to ship and roughly what you’d like to spend. We reply within two working days.'),
        'contact',
        'cta',
      ],
    },
  ] as PageSpec[],
};
