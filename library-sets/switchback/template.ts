/** Switchback — the template "Switchback", a product site for a software tool dressed as an outdoor brand. */
import type { BlockNode } from '../../src/lib/types';
import type { PageSpec } from '../kit';
import { group, is } from '../kit';
import { eyebrow, headline, p, section, SP } from './patterns';

/** A page's own first sheet: a mono label, a two-line extruded title, one line under it. */
const title = (label: string, plain: string, extruded: string, line: string): BlockNode =>
  section('Page title', 'secondary', [
    group({ layout: { type: 'flex', orientation: 'vertical', justifyContent: 'center' }, style: { spacing: { blockGap: SP(40) } } }, [
      eyebrow(label),
      headline(plain, extruded, 1),
      p(line, { fontSize: 'large', style: { typography: { textAlign: 'center' } } }),
    ]),
  ], { style: 'switchback-title', top: 80, bottom: 80 });

export const TEMPLATE = {
  key: 'template',
  title: 'Switchback',
  description: 'A product site for a software tool, dressed as a summer-camp poster: a sunset seascape with the headline bent over an arch and extruded in stepped greens, overlapping sheets with rounded shoulders, product cards with drawn app panels, a holographic sphere on a dark sheet, die-cut stickers, candy-coloured stories, plans, questions and a pill wall of integrations on green hills.',
  tags: ['saas', 'product', 'startup', 'software'],
  name: 'Switchback',
  tagline: 'Ship what wins',
  brief:
    'Switchback: a fictional experimentation and content workbench for growth teams (it writes the variants, runs the A/B tests and reports which one made money), dressed as an outdoor brand: pale sage paper, dark fir ink, lime buttons, condensed Archivo headlines with the second line extruded through four greens, sheets with rounded shoulders, candy cards in pink and light blue, die-cut stickers with hard shadows. Loud, friendly and confident; never grey. Visitors should understand what it does on the first screen, see proof, compare three plans and start free. The template fits any software product or startup: keep the structure, change the product. The company, customers, people, figures and integrations are samples; the photographs are generated samples: replace them with your own.',
  pages: [
    { title: 'Switchback', slug: 'home', sections: ['hero', 'proof', 'products', 'agents', 'workflow', 'paths', 'plans', 'stories', 'faq', 'integrations', 'contact'] },
    { title: 'Product', slug: 'product', sections: [title('Product', 'Three tools,', 'one workbench', 'Write it, test it, ship the winner: Content Studio, Experiment Engine and Agent Runway.'), 'products', 'agents', 'paths', 'integrations', 'contact'] },
    { title: 'Pricing', slug: 'pricing', sections: [title('Pricing', 'Start free,', 'grow from there', 'Every plan has the visual editor and unlimited variants. Pay for seats and scale, never for tests.'), 'plans', 'faq', 'contact'] },
    { title: 'Customers', slug: 'customers', sections: [title('Customers', '4,300 teams', 'testing right now', 'From a bakery in Ghent to multi-brand retailers: what they tested, and what it made.'), 'stories', 'proof', 'workflow', 'contact'] },
  ] as PageSpec[],
};
