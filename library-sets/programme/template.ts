/** Programme — the template "Pomol", a site for a three-day festival on a harbour. */
import type { BlockNode } from '../../src/lib/types';
import type { PageSpec } from '../kit';
import { group } from '../kit';
import { h, p, section, SP } from './patterns';

/** A page's opening: its name at display size and one line under it. */
const title = (name: string, line: string): BlockNode =>
  section('Page title', 'base', [group({ align: 'wide', style: { spacing: { blockGap: SP(40) } } }, [h(name, 1), p(line, { fontSize: 'large', textColor: 'muted' })])], { side: 30, top: 80, bottom: 40 });

export const TEMPLATE = {
  key: 'template',
  title: 'Pomol',
  description: 'A site for a three-day festival of talks, film and late music, built like a printed programme on black: the name pinned edge to edge over a column of photographs, the timetable by day with day tabs, speakers in black and white, prints dropped on a crimson headline, a drawn harbour map with numbered places, questions, past years, and the weekend pass as one line with its price on a crimson block.',
  tags: ['event', 'festival', 'conference', 'programme'],
  name: 'Pomol',
  tagline: 'Talks, film and late music on the harbour',
  brief:
    'Pomol: a three-day festival of talks, film and late music on the old harbour of Piran, Slovenia, 3–5 September 2027, at five places a few minutes apart (the quay, the salt store, Tartini Square, the harbour wall for films, Punta by the lighthouse for late music). Black ground, off-white text, one crimson for the price and the one action; Hanken Grotesk, the name set huge. Visitors should see when and where at once, find a session by day, and buy a weekend pass. Write plainly, in short lines, every time and place real. The template fits any event with a timetable (a conference, a season, a course): keep the structure, change the days. The festival, its people and prices are samples; the photographs are generated samples: replace them with your own.',
  pages: [
    { title: 'Pomol', slug: 'home', sections: ['hero', 'intro', 'programme', 'gallery', 'speakers', 'tickets', 'contact'] },
    { title: 'Programme', slug: 'programme', sections: [title('Programme', 'Friday 3 to Sunday 5 September, at five places around the harbour.'), 'programme', 'venue'] },
    { title: 'Speakers', slug: 'speakers', sections: [title('Speakers', 'Six people who know this coast, and the films and nights around them.'), 'speakers', 'gallery', 'contact'] },
    { title: 'Tickets', slug: 'tickets', sections: [title('Tickets', 'One pass for the weekend, or a day at a time. Some of it is free.'), 'tickets', 'faq'] },
    { title: 'Visit', slug: 'visit', sections: [title('Visit', 'Getting here, finding your way round, and how it all started.'), 'venue', 'past', 'faq'] },
  ] as PageSpec[],
};
