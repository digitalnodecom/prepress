/**
 * Built-in sample so the builder is testable without any AI backend.
 * It goes through exactly the same normalize → serialize path as AI output.
 */
import type { SectionSpec, SitePlan } from '../types';

export const DEMO_BRIEF =
  'Fern & Ember — a neighbourhood bakery-café in Ljubljana. Sourdough, seasonal pastries, specialty coffee, weekend brunch. Warm, crafty, unpretentious. Wants people to visit, pre-order celebration cakes and book the back room for small events.';

export const DEMO_PLAN: SitePlan = {
  name: 'Fern & Ember',
  tagline: 'Slow bread, good coffee, open doors',
  design: {
    palette: { base: '#fbf7f0', contrast: '#2a211b', primary: '#7a3e1d', secondary: '#eadcc8', accent: '#c8742c', muted: '#f3ebdf' },
    headingFont: 'fraunces',
    bodyFont: 'dm-sans',
    radius: 'soft',
  },
  pages: [
    { title: 'Home', slug: 'home', purpose: 'Invite people in', sections: [] },
    { title: 'Menu', slug: 'menu', purpose: 'What we bake and brew', sections: [] },
    { title: 'Cakes & Events', slug: 'cakes-events', purpose: 'Celebration cakes and the back room', sections: [] },
    { title: 'Visit', slug: 'visit', purpose: 'Find us', sections: [] },
  ],
};

export const DEMO_PAGES: Record<string, SectionSpec[]> = {
  home: [
    {
      pattern: 'hero-split',
      props: {
        eyebrow: 'Bakery · Café · Since 2019',
        heading: 'Bread that takes its time.',
        text: 'Naturally leavened sourdough, seasonal pastries and carefully brewed coffee — baked every morning on Trubarjeva street.',
        primaryCta: { label: 'See the menu', url: '/menu/' },
        secondaryCta: { label: 'Plan your visit', url: '/visit/' },
        imageLabel: 'Fresh sourdough loaves on a wooden counter',
        tone: 'base',
      },
    },
    { pattern: 'logo-cloud', props: { label: 'As featured in', names: ['Delo', 'Ljubljana Life', 'Time Out', 'Slovenia Eats'], tone: 'muted' } },
    {
      pattern: 'features-grid',
      props: {
        eyebrow: 'What we do',
        heading: 'Three things, done properly',
        items: [
          { icon: '🍞', title: '48-hour sourdough', text: 'Long, cold fermentation with local spelt and rye. Crackly crust, open crumb, keeps for days.' },
          { icon: '🥐', title: 'Seasonal pastries', text: 'Laminated by hand every morning. The fillings follow the market — rhubarb now, plums by August.' },
          { icon: '☕', title: 'Specialty coffee', text: 'Single-origin beans from a roaster two streets away, pulled as espresso or brewed by the cup.' },
        ],
      },
    },
    {
      pattern: 'media-text',
      props: {
        heading: 'Weekend brunch, the slow way',
        text: 'Saturdays and Sundays from 9 to 14 the ovens make room for brunch: shakshuka on toasted sourdough, buttermilk pancakes, and the best cardamom bun in town.',
        bullets: ['No booking for small tables', 'Vegetarian & vegan options every day', 'Kids eat half price'],
        cta: { label: 'Brunch menu', url: '/menu/' },
        imageLabel: 'Brunch table with eggs, bread and coffee',
        imageSide: 'right',
        tone: 'muted',
      },
    },
    {
      pattern: 'testimonials',
      props: {
        heading: 'Regulars say it best',
        items: [
          { quote: 'The sourdough is the reason I moved apartments. Not entirely joking.', name: 'Maja K.', role: 'Neighbour' },
          { quote: 'Our wedding cake was gone in ten minutes. People still ask where it was from.', name: 'Tom & Ana', role: 'Cake customers' },
          { quote: 'Quiet mornings, great flat white, nobody rushes you. Perfect.', name: 'Luka P.', role: 'Freelancer' },
        ],
        tone: 'base',
      },
    },
    {
      pattern: 'cta-band',
      props: {
        heading: 'Celebrating something?',
        text: 'Order a cake at least three days ahead, or book the back room for up to 20 guests.',
        primaryCta: { label: 'Cakes & events', url: '/cakes-events/' },
        tone: 'primary',
      },
    },
  ],
  menu: [
    {
      pattern: 'hero-centered',
      props: {
        eyebrow: 'Menu',
        heading: 'Baked this morning',
        text: 'Our counter changes through the day and the seasons. Here is what you can usually count on.',
        primaryCta: { label: 'Visit us', url: '/visit/' },
        tone: 'muted',
      },
    },
    {
      pattern: 'pricing',
      props: {
        heading: 'Breads',
        intro: 'Whole loaves from 8:00 until sold out. Reserve by phone the day before.',
        plans: [
          { name: 'Country sourdough', price: '€5.50', period: '/ 800 g', features: ['Wheat & 20% spelt', '48h cold proof', 'Our everyday loaf'], cta: { label: 'Reserve', url: '/visit/' } },
          { name: 'Dark rye', price: '€6.20', period: '/ 900 g', features: ['70% rye, seeds', 'Dense & tangy', 'Keeps a week'], cta: { label: 'Reserve', url: '/visit/' }, featured: true },
          { name: 'Weekend brioche', price: '€7.00', period: '/ loaf', features: ['Butter & local eggs', 'Saturdays only', 'French toast heaven'], cta: { label: 'Reserve', url: '/visit/' } },
        ],
        tone: 'base',
      },
    },
    {
      pattern: 'features-grid',
      props: {
        heading: 'Coffee & drinks',
        items: [
          { title: 'Espresso · €1.80', text: 'Seasonal single-origin, roasted by Kafeteria two streets away.' },
          { title: 'Flat white · €2.80', text: 'Double ristretto, silky milk. Oat at no extra cost.' },
          { title: 'Filter · €3.20', text: 'Brewed by the cup. Ask what is on the grinder today.' },
        ],
        tone: 'muted',
      },
    },
    {
      pattern: 'faq',
      props: {
        heading: 'Good to know',
        items: [
          { question: 'Do you have gluten-free options?', answer: 'We bake with wheat flour all day, so we can’t promise gluten-free. We do offer a flourless chocolate cake on weekends.' },
          { question: 'Can I reserve bread?', answer: 'Yes — call us the day before and we will keep loaves aside until 13:00.' },
          { question: 'Is there vegan food?', answer: 'Every day: our country sourdough, rye, focaccia and at least one vegan pastry.' },
        ],
      },
    },
  ],
  'cakes-events': [
    {
      pattern: 'hero-cover',
      props: {
        heading: 'Cakes for the days that matter',
        text: 'Birthdays, weddings, quiet Tuesdays. Made to order with the same patience as our bread.',
        primaryCta: { label: 'Ask about a cake', url: '/visit/' },
        imageLabel: 'Layered celebration cake with berries',
      },
    },
    {
      pattern: 'steps',
      props: {
        heading: 'How ordering works',
        items: [
          { title: 'Tell us', text: 'Email or drop by with the date, number of guests and any allergies.' },
          { title: 'Taste & choose', text: 'For weddings we offer a tasting box with four flavours.' },
          { title: 'Pick up', text: 'Collect on the day, or we deliver within Ljubljana for €10.' },
        ],
      },
    },
    {
      pattern: 'media-text',
      props: {
        heading: 'The back room',
        text: 'A bright room with one long oak table for up to 20 guests — for birthdays, workshops or team breakfasts.',
        bullets: ['Available evenings & Mondays', 'Set menus from €18 per person', 'Projector & good Wi-Fi'],
        cta: { label: 'Enquire', url: '/visit/' },
        imageLabel: 'Long wooden table set for a dinner party',
        tone: 'muted',
      },
    },
    { pattern: 'cta-band', props: { heading: 'Order at least 3 days ahead', primaryCta: { label: 'Get in touch', url: '/visit/' }, tone: 'contrast' } },
  ],
  visit: [
    {
      pattern: 'contact',
      props: {
        heading: 'Come say hello',
        text: 'We are a five-minute walk from Prešeren Square. Grab a seat by the window, or take a loaf for the road.',
        email: 'hello@fernandember.si',
        phone: '+386 1 234 5678',
        address: 'Trubarjeva cesta 21, 1000 Ljubljana',
        hours: 'Tue–Fri 7:30–18:00 · Sat–Sun 8:00–15:00 · Mon closed',
      },
    },
    {
      pattern: 'team',
      props: {
        heading: 'The people behind the counter',
        members: [
          { name: 'Eva M.', role: 'Head baker' },
          { name: 'Jure S.', role: 'Pastry & cakes' },
          { name: 'Nika R.', role: 'Coffee & front of house' },
        ],
        tone: 'muted',
      },
    },
  ],
};
