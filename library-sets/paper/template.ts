/** Paper Edition — the full-site template "The Margin", composed from the set's patterns. */
import type { PageSpec } from '../kit';
import { h, label, ornament, p, section } from './patterns';

const title = (kicker: string, text: string, deck: string) =>
  section('Page title', 'paper', [
    label(kicker, { textColor: 'accent' }),
    h(text, 1),
    p(deck, { fontSize: 'large', style: { typography: { fontStyle: 'italic', lineHeight: '1.45' } } }),
    ornament('double'),
  ], { top: 80, bottom: 30, gap: 40 });

export const TEMPLATE = {
  key: 'template',
  title: 'The Margin',
  description: 'A complete newsletter and essay site in Paper Edition: a newspaper front page, contents with dot leaders, briefs, black-and-white photo plates, a full sample essay with margin notes, archive, letters, about and subscribe pages.',
  tags: ['newsletter', 'blog', 'editorial', 'writer'],
  name: 'The Margin',
  tagline: 'A weekly letter on design and slow software',
  brief:
    'The Margin: a weekly email letter and essay site by one writer (Ana Novak, a software designer in Trieste) about design, slow software and the craft of making things. Editorial and calm: warm paper, ink and an oxblood accent, Fraunces headlines, Newsreader text, IBM Plex Mono for datelines and numbers. Visitors should read an essay, browse the archive and subscribe. Write in a warm, precise first person; long-form pages use the drop-cap lede, margin sidenotes (with a matching <sup> number in the text) and pull quotes. The black-and-white photo plates (desk, print shop, timer, the editor) are generated samples: replace them with your own photographs.',
  pages: [
    { title: 'Home', slug: 'home', sections: ['front-page', 'contents', 'briefs', 'plate', 'pull-spread', 'letters', 'subscribe'] },
    { title: 'Essays', slug: 'essays', sections: ['page-title', 'archive', 'subscribe'] },
    { title: 'On slow software', slug: 'on-slow-software', sections: ['essay', 'subscribe'] },
    { title: 'About', slug: 'about', sections: [title('About', 'Written in the margin', 'One writer, one letter a week, no hurry. How The Margin is made, and why.'), 'about', 'letters', 'subscribe'] },
    { title: 'Subscribe', slug: 'subscribe', sections: [title('Subscribe', 'Thursdays, by letter', 'One careful essay a week, in your inbox at seven in the morning. Free, quiet and easy to leave.'), 'subscribe', 'questions'] },
  ] as PageSpec[],
};
