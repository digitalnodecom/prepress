/** Night Garden — the full-site template "Nocturne", composed from the set's patterns. */
import type { BlockNode } from '../../src/lib/types';
import { h, label, ng, p, section } from './patterns';

export type PageSpec = { title: string; slug: string; sections: (string | BlockNode)[] };

const center = { style: { typography: { textAlign: 'center' } } };
const title = (kicker: string, text: string, intro: string) =>
  section('Page title', 'night', [label(kicker, center), h(text, 1, center), p(intro, { fontSize: 'large', ...center }), ng('vine')], { top: 80, bottom: 40, gap: 50 });

export const TEMPLATE = {
  key: 'template',
  title: 'Nocturne',
  description: 'A complete evening restaurant and wine bar site in Night Garden: lantern-lit hero with fireflies, night photographs in arched frames, story, menu with prices, evenings, opening hours and directions, private dining and a reservation card on every page.',
  tags: ['restaurant', 'bar', 'hospitality', 'dark'],
  name: 'Nocturne',
  tagline: 'Garden restaurant & wine bar',
  brief:
    'Nocturne: an evening garden restaurant and natural-wine bar in a walled courtyard in Ljubljana’s old town, open Wednesday to Sunday from dusk. Dark, warm and romantic: night green, moonlight cream and lantern amber, italic Cormorant Garamond headlines, DM Mono for prices and hours, night photographs in arched frames (generated samples: swap in photographs of the real place and food; an arch with no photo shows a drawn plant against the sky). Visitors should see the menu, know when it is open and how to find the gate, and book a table (booking link and phone, no forms). Write warmly and briefly, like a good host.',
  pages: [
    { title: 'Home', slug: 'home', sections: ['hero', 'story', 'menu', 'evenings', 'press', 'reserve'] },
    { title: 'Menu', slug: 'menu', sections: ['page-title', 'menu', 'gallery', 'reserve'] },
    { title: 'Evenings', slug: 'evenings', sections: [title('Evenings', 'Something on <em>most nights</em>', 'Fish on Thursdays, records on Fridays and a winemakers’ supper once a month. Come for one, stay for the garden.'), 'evenings', 'press', 'reserve'] },
    { title: 'Visit', slug: 'visit', sections: [title('Visit', 'Find the <em>green gate</em>', 'Open Wednesday to Sunday from dusk, in a courtyard just off Gornji trg.'), 'visit', 'reserve'] },
    { title: 'Private dining', slug: 'private-dining', sections: [title('Private dining', 'A long table <em>under glass</em>', 'The glasshouse at the end of the garden seats twelve for birthdays, long dinners and the night before a wedding.'), 'private-dining', 'gallery', 'reserve'] },
  ] as PageSpec[],
};
