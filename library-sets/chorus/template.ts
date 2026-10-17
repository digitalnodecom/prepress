/** Chorus — the template "Chorus", a one-page landing site for a mobile app. */
import type { PageSpec } from '../kit';

export const TEMPLATE = {
  key: 'template',
  title: 'Chorus',
  description: 'A mobile-app landing page where the product performs: a headline split around a live frame of the app, a row in three states, a dawn wood at full bleed, a four-stop how-it-works, four places it listens, a pinned field note driven by real controls, old bird plates, plans with one live figure, filled-tile questions, a closing photograph and a footer of tiles. All interaction is CSS — no scripts.',
  tags: ['app', 'landing', 'software', 'interactive'],
  name: 'Chorus',
  tagline: 'Hear a bird. Know its name.',
  brief:
    'Chorus: a mobile app that names the bird singing from a ten-second recording, draws its spectrogram and keeps your life list; works offline; free with a paid Field plan. A landing page where the product performs: every section is a working fragment of the app (built in HTML, marked data-ui), never a screenshot or device frame. Frost ground, slate ink, one teal for actions, Bricolage Grotesque. Visitors should try the identification in the hero, understand the four steps, and download the app. Short, concrete claims; real numbers; no invented reviews or press. The nature photographs (wood, park, marsh, garden, a listener) are generated samples to replace; they never show a phone.',
  pages: [{ title: 'Chorus', slug: 'home', sections: ['hero', 'showcase', 'dawn', 'how', 'places', 'notes', 'birds', 'plans', 'questions', 'get'] }] as PageSpec[],
};
