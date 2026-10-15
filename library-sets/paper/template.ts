/** Paper Edition — the full-site template "The Margin", composed from the set's patterns. */
import type { BlockNode } from '../../src/lib/types';
import { h, label, p, pe, section } from './patterns';

export type PageSpec = { title: string; slug: string; sections: (string | BlockNode)[] };

const title = (kicker: string, text: string, deck: string) =>
  section('Page title', 'paper', [
    label(kicker, { textColor: 'accent' }),
    h(text, 1),
    p(deck, { fontSize: 'large', style: { typography: { fontStyle: 'italic', lineHeight: '1.45' } } }),
    pe('ornament', { kind: 'double' }),
  ], { top: 80, bottom: 30, gap: 40 });

const faq = section('Questions', 'paper', [
  h('Before you subscribe', 2, { fontSize: 'xx-large' }),
  h('What arrives, and when?', 3, { fontSize: 'large' }),
  p('One letter every Thursday at seven in the morning, Central European Time: an essay, a few notes and the best replies. Nothing else, ever.'),
  h('Does it cost anything?', 3, { fontSize: 'large' }),
  p('No. Readers who want to support it can buy the yearly printed edition, which is the same letters on good paper.'),
  h('What do you do with my address?', 3, { fontSize: 'large' }),
  p('Send you the letter. There are no tracking pixels, no link redirects and no third parties. Reply to any letter and Ana reads it.'),
  pe('ornament', { kind: 'asterism' }),
], { top: 70, bottom: 80, gap: 40 });

export const TEMPLATE = {
  key: 'template',
  title: 'The Margin',
  description: 'A complete newsletter and essay site in Paper Edition: a newspaper front page, contents with dot leaders, briefs, a full sample essay with margin notes, archive, letters, about and subscribe pages.',
  tags: ['newsletter', 'blog', 'editorial', 'writer'],
  name: 'The Margin',
  tagline: 'A weekly letter on design and slow software',
  brief:
    'The Margin: a weekly email letter and essay site by one writer (Ana Novak, a software designer in Trieste) about design, slow software and the craft of making things. Editorial and calm: warm paper, ink and an oxblood accent, Fraunces headlines, Newsreader text, IBM Plex Mono for datelines and numbers. Visitors should read an essay, browse the archive and subscribe. Write in a warm, precise first person; long-form pages use the drop-cap lede, margin sidenotes (with a matching <sup> number in the text) and pull quotes.',
  pages: [
    { title: 'Home', slug: 'home', sections: ['front-page', 'contents', 'briefs', 'pull-spread', 'letters', 'subscribe'] },
    { title: 'Essays', slug: 'essays', sections: ['page-title', 'archive', 'subscribe'] },
    { title: 'On slow software', slug: 'on-slow-software', sections: ['essay', 'subscribe'] },
    { title: 'About', slug: 'about', sections: [title('About', 'Written in the margin', 'One writer, one letter a week, no hurry. How The Margin is made, and why.'), 'about', 'letters', 'subscribe'] },
    { title: 'Subscribe', slug: 'subscribe', sections: [title('Subscribe', 'Thursdays, by letter', 'One careful essay a week, in your inbox at seven in the morning. Free, quiet and easy to leave.'), 'subscribe', faq] },
  ] as PageSpec[],
};
