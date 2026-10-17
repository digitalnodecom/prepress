/** Passport — the template "Sedmera", a one-page site for a walk-in mountain hut. */
import type { PageSpec } from '../kit';

export const TEMPLATE = {
  key: 'template',
  title: 'Sedmera',
  description: 'A one-page site for a walk-in mountain hut, built as a walker’s mountain passport: passport-page hero with the hut stamp, the walk up as a draggable row, seven lakes as a giant word over bars, the hut in four photographs, a printed menu, an itemised receipt, questions beside a tall picture, a trail picker on a photograph and a curtain-revealed postcard footer.',
  tags: ['hospitality', 'outdoor', 'hut', 'one-page'],
  name: 'Sedmera',
  tagline: 'Mountain hut, 1,685 m',
  brief:
    'Sedmera: a walk-in stone mountain hut at 1,685 m above the Seven Lakes Valley in Slovenia’s Julian Alps. 46 bunks, open 15 June to 30 September, no road (4½ h on foot from Bohinj), cash only, generator off at ten. The site is built as the hut’s own stationery — the walker’s mountain passport, its round stamp, a printed menu, a receipt, a postcard — in sand, paper, charcoal and moss, Bebas Neue over EB Garamond. Visitors should understand how far it is and what it costs, then book a bunk by email. Write plainly and warmly, like the person behind the counter; every number real. Mountain pictures are public-domain postcards of the surrounding valley — never present one as the hut itself; the photographs of the hut, its rooms and its food are generated samples to replace with the hut’s own.',
  pages: [{ title: 'Sedmera', slug: 'home', sections: ['hero', 'walk', 'lakes', 'hut', 'kitchen', 'prices', 'questions', 'visit'] }] as PageSpec[],
};
