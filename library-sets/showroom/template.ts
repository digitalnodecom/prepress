/** Showroom — the full-site template "Norde", a product launch composed from the set's patterns. */
import type { PageSpec } from '../kit';
import { h, kicker, p, section } from './patterns';

const title = (k: string, text: string, lead: string) =>
  section('Page title', 'white', [kicker(k, 'center'), h(text, 1, { style: { typography: { textAlign: 'center' } } }), p(lead, { fontSize: 'large', style: { typography: { textAlign: 'center', lineHeight: '1.38' } } })], { top: 80, bottom: 40, gap: 30 });

export const TEMPLATE = {
  key: 'template',
  title: 'Norde',
  description: 'A complete product-launch site in Showroom: sticky product bar under the global nav, centered launch hero with a foldable that unfolds as you scroll, highlights cards, a full-bleed film still, editorial chapters, a sideways reel of sample shots, specs at a glance, finishes, a which-one comparison and footnotes.',
  tags: ['product', 'launch', 'tech', 'minimal'],
  name: 'Norde',
  tagline: 'Fold 2',
  brief:
    'Norde: a small (fictional) hardware company launching one flagship product, the Fold 2 foldable phone. A white-gallery product site: the product drawings are the visual event, type is compact and tight, one blue for links and small pills, an orange “New” label, rounded cards on mist-grey bands, no shadows. Visitors should understand the product in a few claims, see the design and specs, and pre-order. Write short, confident, concrete claims (numbers over adjectives); qualify them in footnotes. Replace “Norde” and “Fold 2” with the real brand and product. The lifestyle, finishes and “Shot on” photographs are generated samples: replace them with real product and camera photography.',
  pages: [
    { title: 'Fold 2', slug: 'home', sections: ['hero', 'chapters', 'highlights', 'film', 'design', 'camera', 'shot-on', 'specs', 'finishes', 'buy', 'footnotes'] },
    { title: 'Design', slug: 'design', sections: ['page-title', 'design', 'materials', 'finishes', 'footnotes'] },
    { title: 'Tech specs', slug: 'specs', sections: [title('Tech specs', 'Every number, in&nbsp;one&nbsp;place.', 'Display, camera, battery, materials and what’s in the box.'), 'specs', 'camera', 'shot-on', 'buy', 'footnotes'] },
    { title: 'Buy', slug: 'buy', sections: [title('Store', 'Buy Fold 2.', 'Free delivery, free returns within 14 days and two years of cover included.'), 'buy', 'footnotes'] },
  ] as PageSpec[],
};
