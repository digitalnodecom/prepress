/**
 * Our section patterns, filled with neutral sample copy, as block-editor
 * patterns for the inserter's "Patterns" tab. Built through the same
 * normalize → serialize path as AI output, so they are valid by construction.
 */
import type { Design } from '../types';
import { PATTERNS } from './patterns';
import { normalizeSections } from './normalize';
import { toMarkup } from './markup';

const cta = (label: string, url = '/') => ({ label, url });

export const PATTERN_SAMPLE_PROPS: Record<string, Record<string, unknown>> = {
  'hero-centered': { eyebrow: 'Welcome', heading: 'A headline that says what you do', text: 'One or two sentences about who this is for and why it matters.', primaryCta: cta('Get started'), secondaryCta: cta('Learn more') },
  'hero-cover': { heading: 'Make a big first impression', text: 'A short line that sets the mood.', primaryCta: cta('Book now'), imageLabel: 'Wide atmospheric photo' },
  'hero-split': { eyebrow: 'New', heading: 'Explain your offer in one line', text: 'Supporting copy that adds detail and builds trust.', primaryCta: cta('Start now'), secondaryCta: cta('See how it works'), imageLabel: 'Product photo' },
  'features-grid': { eyebrow: 'Why us', heading: 'Everything you need', intro: 'A short introduction to what follows.', items: [{ title: 'First benefit', text: 'Describe it in a sentence.', icon: '01' }, { title: 'Second benefit', text: 'Describe it in a sentence.', icon: '02' }, { title: 'Third benefit', text: 'Describe it in a sentence.', icon: '03' }] },
  'media-text': { heading: 'Tell your story', text: 'A paragraph about how you work and what makes it different.', bullets: ['A key point', 'Another key point', 'One more'], cta: cta('About us'), imageLabel: 'Team at work' },
  stats: { heading: 'By the numbers', items: [{ value: '12k+', label: 'Happy customers' }, { value: '98%', label: 'Would recommend' }, { value: '24/7', label: 'Support' }] },
  testimonials: { heading: 'What people say', items: [{ quote: 'A short, specific quote from a happy customer.', name: 'Alex Morgan', role: 'Customer' }, { quote: 'Another quote that speaks to a different benefit.', name: 'Sam Lee', role: 'Client' }] },
  pricing: { heading: 'Simple pricing', intro: 'Pick the plan that fits.', plans: [{ name: 'Starter', price: '$9', period: '/mo', features: ['One project', 'Email support'], cta: cta('Choose Starter') }, { name: 'Pro', price: '$29', period: '/mo', features: ['Unlimited projects', 'Priority support'], cta: cta('Choose Pro'), featured: true }] },
  faq: { heading: 'Questions & answers', items: [{ question: 'How does it work?', answer: 'Answer the question in a sentence or two.' }, { question: 'What does it cost?', answer: 'Answer the question in a sentence or two.' }] },
  'cta-band': { heading: 'Ready to start?', text: 'One line that removes the last doubt.', primaryCta: cta('Get in touch') },
  contact: { heading: 'Get in touch', text: 'We usually reply within a day.', email: 'hello@example.com', phone: '+1 555 0100', address: '1 Main Street, Springfield', hours: 'Mon–Fri, 9–5' },
  'rich-text': { heading: 'Our story', paragraphs: ['Start with where it began.', 'Then explain where you are going.'] },
  team: { heading: 'The team', members: [{ name: 'Jordan Ellis', role: 'Founder' }, { name: 'Riley Chen', role: 'Design' }, { name: 'Casey Park', role: 'Operations' }] },
  steps: { heading: 'How it works', items: [{ title: 'Tell us', text: 'What you need.' }, { title: 'We plan', text: 'A clear proposal.' }, { title: 'We deliver', text: 'On time.' }] },
  'logo-cloud': { label: 'Trusted by', names: ['Northwind', 'Contoso', 'Fabrikam', 'Globex'] },
};

const title = (name: string) => name.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const PATTERN_CATEGORY = { name: 'prepress', label: 'Sections' };

export function inserterPatterns(design: Design) {
  return Object.entries(PATTERNS).map(([name, def]) => ({
    name: `prepress/${name}`,
    title: title(name),
    description: def.description,
    categories: [PATTERN_CATEGORY.name],
    content: toMarkup(normalizeSections([{ pattern: name, props: PATTERN_SAMPLE_PROPS[name] ?? {} }], { design })),
  }));
}
