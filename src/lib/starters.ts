/**
 * Starter templates: a whole site (pages, design, header/footer) to begin
 * from, or a blank one. Built from the same section patterns the AI uses
 * (wp/patterns.ts) and run through the same normalize → serialize path, so a
 * starter is ordinary block markup that people and the AI keep editing
 * section by section.
 *
 * `{name}` in any text is replaced by the site name chosen at creation.
 * Each starter's `brief` becomes the site brief: it tells the AI (editor AI
 * panel, MCP get_site) what kind of site this is, so it can continue in tone.
 */
import type { SectionSpec, Site, SitePlan } from './types';
import { setPageContent, sectionsToMarkup, siteFromPlan, slugify } from './site';

export interface Starter {
  id: string;
  title: string;
  /** One line for the picker. */
  description: string;
  /** Default site name (shown greyed in the name field). */
  sampleName: string;
  /** Default brief; `{name}` is replaced. */
  brief: string;
  plan: SitePlan;
  /** Sections per page slug. */
  pages: Record<string, SectionSpec[]>;
}

const cta = (label: string, url: string) => ({ label, url });

export const STARTERS: Starter[] = [
  {
    id: 'blank',
    title: 'Blank',
    description: 'One empty page with a header and footer. Build it yourself, or let the AI write it.',
    sampleName: 'My site',
    brief: '{name}: a new website. Purpose, audience and tone not decided yet; ask or infer from the content as it grows.',
    plan: {
      name: 'My site',
      tagline: '',
      design: {
        palette: { base: '#ffffff', contrast: '#1a1a1a', primary: '#1a1a1a', secondary: '#f0f0ee', accent: '#2f6fed', muted: '#f6f6f4' },
        headingFont: 'inter',
        bodyFont: 'inter',
        radius: 'soft',
      },
      pages: [{ title: 'Home', slug: 'home', purpose: 'Front page', sections: [] }],
    },
    pages: {
      home: [{ pattern: 'rich-text', props: { heading: '{name}', paragraphs: ['This is your front page. Click any text to edit it, or press + to add a section.'] } }],
    },
  },

  {
    id: 'local-business',
    title: 'Local business',
    description: 'Trades and local services: what you do, why you, prices, reviews, contact.',
    sampleName: 'Brightline Electrical',
    brief: '{name}: a local trade / service business (electrician, plumber, cleaner, repair). Trustworthy, clear, practical. Visitors should call or request a quote. Shows services, service area, pricing guide, reviews and contact details.',
    plan: {
      name: 'Brightline Electrical',
      tagline: 'Certified electricians, on time',
      design: {
        palette: { base: '#ffffff', contrast: '#0f1b2d', primary: '#1d4ed8', secondary: '#e8eefc', accent: '#f59e0b', muted: '#f4f6fa' },
        headingFont: 'manrope',
        bodyFont: 'inter',
        radius: 'soft',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'Win the call', sections: [] },
        { title: 'Services', slug: 'services', purpose: 'What we do and prices', sections: [] },
        { title: 'About', slug: 'about', purpose: 'Why trust us', sections: [] },
        { title: 'Contact', slug: 'contact', purpose: 'Get a quote', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-split', props: { eyebrow: 'Licensed · Insured · 24/7 emergencies', heading: 'Electrical work done right, the first time', text: '{name} handles everything from a new socket to a full rewire — with upfront prices and a tidy finish.', primaryCta: cta('Get a free quote', '/contact/'), secondaryCta: cta('Our services', '/services/'), imageLabel: 'Electrician fitting a consumer unit', tone: 'base' } },
        { pattern: 'stats', props: { items: [{ value: '15 yrs', label: 'in business' }, { value: '2,400+', label: 'jobs completed' }, { value: '4.9★', label: 'average review' }, { value: '< 2 h', label: 'emergency response' }], tone: 'muted' } },
        { pattern: 'features-grid', props: { eyebrow: 'Services', heading: 'What we can help with', items: [{ icon: '⚡', title: 'Repairs & fault finding', text: 'Tripping circuits, dead sockets, flickering lights — found and fixed.' }, { icon: '🏠', title: 'Rewiring', text: 'Full and partial rewires with minimal disruption and proper making good.' }, { icon: '🔌', title: 'EV chargers', text: 'Approved installer for home charge points, grant paperwork included.' }] } },
        { pattern: 'testimonials', props: { heading: 'What customers say', items: [{ quote: 'Turned up when they said, explained everything, left the place spotless.', name: 'Sarah M.', role: 'Kitchen rewire' }, { quote: 'Fixed a fault two other firms couldn’t find. Fair price too.', name: 'David R.', role: 'Fault finding' }] } },
        { pattern: 'cta-band', props: { heading: 'Need an electrician?', text: 'Tell us what you need and get a fixed quote within a day.', primaryCta: cta('Request a quote', '/contact/'), tone: 'primary' } },
      ],
      services: [
        { pattern: 'features-grid', props: { heading: 'Services', intro: 'Domestic and small commercial work across the city and surrounding towns.', items: [{ title: 'Repairs & fault finding', text: 'Same-day call-outs for most faults.' }, { title: 'Rewiring', text: 'Full or partial, with certification.' }, { title: 'Lighting', text: 'Indoor, outdoor and smart lighting.' }, { title: 'EV chargers', text: 'Supply and install, grant-ready.' }, { title: 'Inspections', text: 'Landlord and pre-purchase reports.' }, { title: 'Consumer units', text: 'Upgrades to current regulations.' }] } },
        { pattern: 'pricing', props: { heading: 'Price guide', intro: 'Every job gets a fixed quote before we start. Typical prices:', plans: [{ name: 'Call-out', price: '€65', period: 'first hour', features: ['Diagnosis', 'Minor repairs', 'No hidden extras'], cta: cta('Book', '/contact/') }, { name: 'EV charger', price: '€890', period: 'installed', features: ['7 kW smart charger', 'Up to 10 m cable run', 'Certification'], cta: cta('Get a quote', '/contact/'), featured: true }, { name: 'Inspection', price: '€180', period: 'per report', features: ['Full test & report', 'Photos of issues', 'Remedial quote'], cta: cta('Book', '/contact/') }], tone: 'muted' } },
        { pattern: 'faq', props: { heading: 'Questions', items: [{ question: 'Do you charge for quotes?', answer: 'No. Quotes are free and fixed — the price we quote is the price you pay.' }, { question: 'Are you insured?', answer: 'Yes, fully insured and registered with the national certification scheme.' }] } },
      ],
      about: [
        { pattern: 'media-text', props: { heading: 'A small team that cares about the details', text: '{name} started with one van and a simple rule: do the job you would want done in your own home.', bullets: ['Fully qualified electricians', 'Clean, tidy and on time', '12-month guarantee on all work'], imageLabel: 'The team next to their van', imageSide: 'right' } },
        { pattern: 'team', props: { heading: 'The team', members: [{ name: 'Mark Ellis', role: 'Founder, master electrician' }, { name: 'Priya Shah', role: 'Electrician' }, { name: 'Tom Reid', role: 'Apprentice' }] } },
      ],
      contact: [
        { pattern: 'contact', props: { heading: 'Get a free quote', text: 'Call, email or send photos of the job — we reply the same working day.', email: 'hello@example.com', phone: '+00 123 456 789', address: 'Serving the city and 20 km around', hours: 'Mon–Fri 7:30–18:00 · emergencies 24/7' } },
      ],
    },
  },

  {
    id: 'restaurant',
    title: 'Restaurant & café',
    description: 'Food, drink and hospitality: menu, story, opening hours, bookings.',
    sampleName: 'Olive & Thyme',
    brief: '{name}: a neighbourhood restaurant / café. Warm and welcoming. Visitors should look at the menu, book a table and find the place. Seasonal cooking, opening hours, private events.',
    plan: {
      name: 'Olive & Thyme',
      tagline: 'Seasonal kitchen & wine bar',
      design: {
        palette: { base: '#fbf7f0', contrast: '#2a211b', primary: '#6b3a1e', secondary: '#eadcc8', accent: '#b8643a', muted: '#f3ebdf' },
        headingFont: 'fraunces',
        bodyFont: 'dm-sans',
        radius: 'soft',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'Invite people in', sections: [] },
        { title: 'Menu', slug: 'menu', purpose: 'What we serve', sections: [] },
        { title: 'Visit', slug: 'visit', purpose: 'Hours, address, booking', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-cover', props: { heading: 'Seasonal plates, natural wine, good company', text: 'Small plates that follow the market, cooked over fire at {name}.', primaryCta: cta('Book a table', '/visit/'), secondaryCta: cta('See the menu', '/menu/'), imageLabel: 'Candle-lit dining room with a long table' } },
        { pattern: 'media-text', props: { heading: 'Cooking with the seasons', text: 'Our menu changes every week with what local farms bring us. Everything is made here, from the bread to the ice cream.', bullets: ['Vegetarian dishes every day', 'Wines from small producers', 'Private room for up to 16'], cta: cta('This week’s menu', '/menu/'), imageLabel: 'Chef plating a dish of roasted vegetables', imageSide: 'left', tone: 'muted' } },
        { pattern: 'testimonials', props: { heading: 'Guests say', items: [{ quote: 'The best meal we had all year, and the staff made it feel like a dinner party.', name: 'Anna & Ben' }, { quote: 'Come for the flatbread, stay for the wine list.', name: 'Local food guide' }] } },
        { pattern: 'cta-band', props: { heading: 'Hungry?', text: 'Open Tuesday to Sunday from 5 pm. Walk-ins welcome at the bar.', primaryCta: cta('Book a table', '/visit/'), tone: 'contrast' } },
      ],
      menu: [
        { pattern: 'rich-text', props: { eyebrow: 'This week', heading: 'Menu', paragraphs: ['Dishes are made to share — we recommend three or four per person. Ask us about allergies; most dishes can be adapted.'] } },
        { pattern: 'pricing', props: { heading: 'To share', plans: [{ name: 'Small plates', price: '€6–12', features: ['Flatbread, whipped feta, honey', 'Charred leeks, romesco', 'Crispy potatoes, aioli'], cta: cta('Book', '/visit/') }, { name: 'Tasting menu', price: '€48', period: 'per person', features: ['Six courses', 'Wine pairing +€30', 'Whole table only'], cta: cta('Book', '/visit/'), featured: true }, { name: 'Large plates', price: '€18–26', features: ['Fire-roasted fish of the day', 'Slow-cooked lamb shoulder', 'Mushroom & barley risotto'], cta: cta('Book', '/visit/') }], tone: 'muted' } },
      ],
      visit: [
        { pattern: 'contact', props: { heading: 'Visit us', text: 'Book online or call us. Groups over eight, please call.', email: 'table@example.com', phone: '+00 123 456 789', address: '12 Market Street', hours: 'Tue–Sun 17:00–23:00 · Sat–Sun lunch 12:00–15:00' } },
        { pattern: 'faq', props: { heading: 'Good to know', items: [{ question: 'Do you take walk-ins?', answer: 'Yes, the bar and terrace are kept for walk-ins.' }, { question: 'Can I book the private room?', answer: 'Yes, for up to 16 guests. Email us with your date.' }] } },
      ],
    },
  },

  {
    id: 'portfolio',
    title: 'Portfolio',
    description: 'Photographers, designers, illustrators: selected work, about, services, enquiries.',
    sampleName: 'Lena Novak',
    brief: '{name}: a creative professional’s portfolio (photographer / designer / illustrator). Editorial, lots of whitespace, work-first. Visitors should browse the work and send an enquiry. Shows selected projects, services or packages, about and contact.',
    plan: {
      name: 'Lena Novak',
      tagline: 'Photography for people and brands',
      design: {
        palette: { base: '#ffffff', contrast: '#111111', primary: '#111111', secondary: '#f2f0ec', accent: '#9a7b4f', muted: '#f7f6f3' },
        headingFont: 'instrument-serif',
        bodyFont: 'inter',
        radius: 'none',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'Show the work', sections: [] },
        { title: 'About', slug: 'about', purpose: 'Who I am and how I work', sections: [] },
        { title: 'Contact', slug: 'contact', purpose: 'Enquiries', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-centered', props: { eyebrow: 'Photographer', heading: 'Honest pictures of people and the things they make', text: 'I’m {name}. I photograph portraits, small brands and weddings that don’t want to look like weddings.', primaryCta: cta('Get in touch', '/contact/'), secondaryCta: cta('About me', '/about/') } },
        { pattern: 'media-text', props: { heading: 'Ceramics studio, spring collection', text: 'A week in a pottery studio for a product launch: process, hands, and the finished pieces in the homes of the people who bought them.', imageLabel: 'Potter shaping a bowl on a wheel', imageSide: 'left' } },
        { pattern: 'media-text', props: { heading: 'Portraits for an architecture practice', text: 'Team portraits in their own buildings, natural light only, for their website and press kit.', imageLabel: 'Architect standing in a concrete stairwell', imageSide: 'right' } },
        { pattern: 'logo-cloud', props: { label: 'Clients include', names: ['Studio Form', 'Kiln & Co', 'North Journal', 'Atlas Architects'], tone: 'muted' } },
        { pattern: 'cta-band', props: { heading: 'Have a project in mind?', primaryCta: cta('Send an enquiry', '/contact/'), tone: 'base' } },
      ],
      about: [
        { pattern: 'media-text', props: { heading: 'About', text: 'I’ve been photographing people for ten years, mostly on location and almost always in daylight. I like small crews, real places and a bit of time to talk before the camera comes out.', bullets: ['Based in the city, travels anywhere', 'Editorial, brand and portrait work', 'Weddings: a few each year'], imageLabel: 'Portrait of the photographer', imageSide: 'right' } },
        { pattern: 'pricing', props: { heading: 'Packages', plans: [{ name: 'Portrait session', price: '€350', features: ['2 hours on location', '25 edited images', 'Online gallery'], cta: cta('Enquire', '/contact/') }, { name: 'Brand day', price: '€1,200', features: ['Full day', 'Products, people and spaces', 'Usage licence included'], cta: cta('Enquire', '/contact/'), featured: true }], tone: 'muted' } },
      ],
      contact: [{ pattern: 'contact', props: { heading: 'Let’s talk', text: 'Tell me about your project, dates and where it is. I reply within two working days.', email: 'hello@example.com' } }],
    },
  },

  {
    id: 'agency',
    title: 'Studio / agency',
    description: 'Creative or digital agency: services, process, case studies, team.',
    sampleName: 'Northwind Studio',
    brief: '{name}: a small design & development studio / agency. Confident, modern, clear. Visitors (founders, marketing leads) should understand what the studio does, see proof, and start a project. Services, process, case studies, team, contact.',
    plan: {
      name: 'Northwind Studio',
      tagline: 'Brand, web and product design',
      design: {
        palette: { base: '#f7f7f5', contrast: '#141414', primary: '#141414', secondary: '#e6f04a', accent: '#5b4bff', muted: '#ececea' },
        headingFont: 'syne',
        bodyFont: 'inter',
        radius: 'round',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'What we do and proof', sections: [] },
        { title: 'Work', slug: 'work', purpose: 'Case studies', sections: [] },
        { title: 'Studio', slug: 'studio', purpose: 'Team and process', sections: [] },
        { title: 'Contact', slug: 'contact', purpose: 'Start a project', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-centered', props: { eyebrow: 'Independent design studio', heading: 'We design brands and websites people remember', text: '{name} works with ambitious teams on identity, websites and digital products — from first sketch to launch.', primaryCta: cta('Start a project', '/contact/'), secondaryCta: cta('See our work', '/work/'), tone: 'base' } },
        { pattern: 'logo-cloud', props: { label: 'Trusted by', names: ['Lumen', 'Fieldwork', 'Oakline', 'Parcel', 'Hearth'], tone: 'base' } },
        { pattern: 'features-grid', props: { eyebrow: 'Services', heading: 'What we do', items: [{ icon: '01', title: 'Brand identity', text: 'Strategy, naming, logo and visual systems that hold together everywhere.' }, { icon: '02', title: 'Websites', text: 'Fast, accessible sites your team can update themselves.' }, { icon: '03', title: 'Product design', text: 'Research, UX and UI for apps and SaaS products.' }], tone: 'muted' } },
        { pattern: 'stats', props: { heading: 'Results that matter', items: [{ value: '120+', label: 'projects shipped' }, { value: '3×', label: 'average conversion lift' }, { value: '9', label: 'design awards' }] } },
        { pattern: 'cta-band', props: { heading: 'Let’s make something good', text: 'Tell us where you are and where you want to be.', primaryCta: cta('Start a project', '/contact/'), tone: 'contrast' } },
      ],
      work: [
        { pattern: 'media-text', props: { heading: 'Lumen — rebrand and website', text: 'A new identity and website for a clean-energy startup, launched in eight weeks. Sign-ups doubled in the first month.', imageLabel: 'Lumen website on a laptop', imageSide: 'left' } },
        { pattern: 'media-text', props: { heading: 'Fieldwork — product design', text: 'Redesigned the scheduling app used by 4,000 field technicians; task time down 30%.', imageLabel: 'Mobile app screens', imageSide: 'right', tone: 'muted' } },
      ],
      studio: [
        { pattern: 'steps', props: { heading: 'How we work', items: [{ title: 'Discover', text: 'Workshops and research to find what matters.' }, { title: 'Design', text: 'Concepts, then one direction refined together.' }, { title: 'Build', text: 'Production-ready design and development.' }, { title: 'Launch & grow', text: 'We stay on to measure and improve.' }] } },
        { pattern: 'team', props: { heading: 'The studio', members: [{ name: 'Ava Lind', role: 'Creative director' }, { name: 'Jonas Berg', role: 'Lead developer' }, { name: 'Mira Okafor', role: 'Product designer' }], tone: 'muted' } },
      ],
      contact: [{ pattern: 'contact', props: { heading: 'Start a project', text: 'Send us a few lines about your project, timing and budget. We reply within two days.', email: 'hello@example.com', address: 'Studio 4, 18 Canal Road' } }],
    },
  },

  {
    id: 'saas',
    title: 'Product / SaaS',
    description: 'Software or app landing page: features, how it works, pricing, FAQ.',
    sampleName: 'Tasklane',
    brief: '{name}: a software product (SaaS / app). Clear, benefit-led, a little playful. Visitors should understand the product in seconds and start a free trial. Features, how it works, social proof, pricing, FAQ.',
    plan: {
      name: 'Tasklane',
      tagline: 'Project planning without the busywork',
      design: {
        palette: { base: '#ffffff', contrast: '#0b1220', primary: '#4f46e5', secondary: '#eef0ff', accent: '#10b981', muted: '#f5f7fb' },
        headingFont: 'space-grotesk',
        bodyFont: 'inter',
        radius: 'round',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'Explain and convert', sections: [] },
        { title: 'Pricing', slug: 'pricing', purpose: 'Plans', sections: [] },
        { title: 'About', slug: 'about', purpose: 'Company', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-split', props: { eyebrow: 'New: AI weekly summaries', heading: 'Plan projects in minutes, not meetings', text: '{name} turns your team’s tasks, docs and deadlines into one clear plan that updates itself.', primaryCta: cta('Start free trial', '/pricing/'), secondaryCta: cta('See pricing', '/pricing/'), imageLabel: 'App dashboard with a project timeline', tone: 'base' } },
        { pattern: 'logo-cloud', props: { label: 'Used by 3,000+ teams', names: ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'], tone: 'muted' } },
        { pattern: 'features-grid', props: { heading: 'Everything in one place', items: [{ icon: '🗂️', title: 'Smart boards', text: 'Lists, boards and timelines from the same tasks.' }, { icon: '🔁', title: 'Automations', text: 'Move work forward without anyone clicking.' }, { icon: '📊', title: 'Reports', text: 'Progress and workload at a glance.' }, { icon: '🔗', title: 'Integrations', text: 'Slack, GitHub, Google Drive and 50 more.' }] } },
        { pattern: 'steps', props: { heading: 'Up and running in three steps', items: [{ title: 'Import', text: 'Bring tasks from spreadsheets or other tools.' }, { title: 'Plan', text: 'Set goals and let {name} build the timeline.' }, { title: 'Ship', text: 'Track progress and share updates automatically.' }], tone: 'muted' } },
        { pattern: 'testimonials', props: { heading: 'Teams love it', items: [{ quote: 'We cut our weekly planning meeting from an hour to ten minutes.', name: 'Jordan Lee', role: 'Head of Product, Parcel' }, { quote: 'The first tool our whole company actually uses.', name: 'Sam Rivera', role: 'COO, Fieldwork' }] } },
        { pattern: 'cta-band', props: { heading: 'Try {name} free for 14 days', text: 'No credit card needed.', primaryCta: cta('Start free trial', '/pricing/'), tone: 'primary' } },
      ],
      pricing: [
        { pattern: 'pricing', props: { heading: 'Simple pricing', intro: 'Start free. Upgrade when your team grows.', plans: [{ name: 'Free', price: '€0', period: 'forever', features: ['Up to 3 users', 'Unlimited tasks', 'Basic boards'], cta: cta('Get started', '/pricing/') }, { name: 'Team', price: '€8', period: 'per user / month', features: ['Unlimited users', 'Timelines & automations', 'Integrations'], cta: cta('Start trial', '/pricing/'), featured: true }, { name: 'Business', price: '€16', period: 'per user / month', features: ['SSO & audit log', 'Advanced reports', 'Priority support'], cta: cta('Contact sales', '/about/') }] } },
        { pattern: 'faq', props: { heading: 'Pricing questions', items: [{ question: 'Is there a free trial?', answer: 'Yes, every paid plan has a 14-day free trial, no card required.' }, { question: 'Can I cancel any time?', answer: 'Yes. Plans are monthly or yearly and you can cancel whenever you like.' }, { question: 'Do you offer discounts?', answer: 'Non-profits and education get 50% off.' }], tone: 'muted' } },
      ],
      about: [
        { pattern: 'rich-text', props: { heading: 'About {name}', paragraphs: ['We started {name} because planning tools had become more work than the work itself.', 'We’re a remote team of 20 across Europe, funded by customers, not investors.'] } },
        { pattern: 'contact', props: { heading: 'Talk to us', text: 'Questions about plans, security or a demo for your team?', email: 'hello@example.com' } },
      ],
    },
  },

  {
    id: 'consultant',
    title: 'Consultant & coach',
    description: 'Personal brand for consultants, coaches and therapists: offer, approach, booking.',
    sampleName: 'Clara Weiss Coaching',
    brief: '{name}: an independent consultant / coach / therapist. Calm, credible, personal. Visitors should understand who it helps and book an intro call. Offer, approach, testimonials, packages, about, contact.',
    plan: {
      name: 'Clara Weiss Coaching',
      tagline: 'Leadership coaching for new managers',
      design: {
        palette: { base: '#fbfaf8', contrast: '#22303a', primary: '#2f5d50', secondary: '#dfeae5', accent: '#c98b5a', muted: '#f2f4f1' },
        headingFont: 'lora',
        bodyFont: 'dm-sans',
        radius: 'round',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'Who I help', sections: [] },
        { title: 'Work with me', slug: 'work-with-me', purpose: 'Packages', sections: [] },
        { title: 'About', slug: 'about', purpose: 'Background', sections: [] },
        { title: 'Contact', slug: 'contact', purpose: 'Book a call', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-split', props: { eyebrow: 'Leadership coaching', heading: 'Become the manager you wish you’d had', text: 'One-to-one coaching for people stepping into their first leadership role. Practical, confidential, and built around your real week.', primaryCta: cta('Book a free intro call', '/contact/'), secondaryCta: cta('How it works', '/work-with-me/'), imageLabel: 'Coach in conversation with a client', tone: 'base' } },
        { pattern: 'features-grid', props: { heading: 'What we work on', items: [{ title: 'Confidence', text: 'Leading people who used to be your peers.' }, { title: 'Hard conversations', text: 'Feedback, conflict and saying no.' }, { title: 'Your time', text: 'Delegating and protecting focus.' }], tone: 'muted' } },
        { pattern: 'testimonials', props: { heading: 'Clients say', items: [{ quote: 'Six sessions changed how I run my team. I finally stopped doing everyone’s work.', name: 'R. Patel', role: 'Engineering manager' }, { quote: 'Warm, direct and always practical.', name: 'L. Moreau', role: 'Head of Sales' }] } },
        { pattern: 'cta-band', props: { heading: 'Start with a free 20-minute call', primaryCta: cta('Book a call', '/contact/'), tone: 'primary' } },
      ],
      'work-with-me': [
        { pattern: 'steps', props: { heading: 'How coaching works', items: [{ title: 'Intro call', text: 'We see if we’re a good fit. Free, no pressure.' }, { title: 'Sessions', text: 'Fortnightly 60-minute video sessions.' }, { title: 'Between sessions', text: 'Short check-ins by message when you need them.' }] } },
        { pattern: 'pricing', props: { heading: 'Packages', plans: [{ name: 'Single session', price: '€150', features: ['60 minutes', 'Notes & actions'], cta: cta('Book', '/contact/') }, { name: '3-month programme', price: '€1,100', features: ['6 sessions', 'Message support', '360° feedback'], cta: cta('Book a call', '/contact/'), featured: true }], tone: 'muted' } },
        { pattern: 'faq', props: { heading: 'Questions', items: [{ question: 'Can my employer pay?', answer: 'Yes, most clients are funded by their company. I can invoice them directly.' }, { question: 'Is it confidential?', answer: 'Always. Nothing is shared with your employer without your consent.' }] } },
      ],
      about: [{ pattern: 'media-text', props: { heading: 'About me', text: 'I led product teams for twelve years before training as a coach. Now I help new managers skip the mistakes I made.', bullets: ['ICF-accredited coach', '200+ managers coached', 'Sessions in English and German'], imageLabel: 'Portrait of the coach', imageSide: 'right' } }],
      contact: [{ pattern: 'contact', props: { heading: 'Book an intro call', text: 'Email me with a few lines about your role and what you want to change. I’ll send a link to book a time.', email: 'hello@example.com' } }],
    },
  },

  {
    id: 'event',
    title: 'Event / conference',
    description: 'One-off or yearly event: programme, speakers, venue, tickets.',
    sampleName: 'Frontiers Summit',
    brief: '{name}: a conference / festival / event. Energetic, clear on dates and place. Visitors should buy tickets. Programme, speakers, venue, ticket tiers, FAQ.',
    plan: {
      name: 'Frontiers Summit',
      tagline: '2 days of talks on the future of the web',
      design: {
        palette: { base: '#0e0e16', contrast: '#f5f5fa', primary: '#ff4d6d', secondary: '#1c1c2b', accent: '#ffd166', muted: '#161622' },
        headingFont: 'outfit',
        bodyFont: 'inter',
        radius: 'soft',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'Sell the event', sections: [] },
        { title: 'Programme', slug: 'programme', purpose: 'Schedule and speakers', sections: [] },
        { title: 'Tickets', slug: 'tickets', purpose: 'Buy tickets', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-cover', props: { heading: '{name} · 14–15 May', text: 'Two days, 30 speakers, one room full of people building what’s next.', primaryCta: cta('Get tickets', '/tickets/'), secondaryCta: cta('See the programme', '/programme/'), useGradient: true } },
        { pattern: 'stats', props: { items: [{ value: '30', label: 'speakers' }, { value: '2', label: 'days' }, { value: '800', label: 'attendees' }, { value: '1', label: 'after-party' }] } },
        { pattern: 'team', props: { heading: 'Speakers', intro: 'More announced every week.', members: [{ name: 'Dr. Amara Chen', role: 'AI researcher' }, { name: 'Felix Grant', role: 'Founder, Parcel' }, { name: 'Sofia Ruiz', role: 'Design lead' }], tone: 'muted' } },
        { pattern: 'cta-band', props: { heading: 'Early-bird tickets end soon', primaryCta: cta('Get tickets', '/tickets/'), tone: 'primary' } },
      ],
      programme: [
        { pattern: 'steps', props: { heading: 'Day 1 — Build', items: [{ title: '09:00 Doors & coffee', text: 'Registration and breakfast.' }, { title: '10:00 Opening keynote', text: 'The next ten years of the web.' }, { title: '14:00 Workshops', text: 'Hands-on sessions in three tracks.' }] } },
        { pattern: 'steps', props: { heading: 'Day 2 — Ship', items: [{ title: '10:00 Talks', text: 'Case studies from teams shipping at scale.' }, { title: '16:00 Panel', text: 'Open questions, open mic.' }, { title: '19:00 After-party', text: 'Music, food and good conversation.' }], tone: 'muted' } },
        { pattern: 'contact', props: { heading: 'Venue', text: 'The Old Foundry, a converted ironworks five minutes from the central station.', address: '1 Foundry Lane', hours: '14–15 May · 09:00–18:00' } },
      ],
      tickets: [
        { pattern: 'pricing', props: { heading: 'Tickets', plans: [{ name: 'Early bird', price: '€190', features: ['Both days', 'Lunch & coffee', 'After-party'], cta: cta('Buy', '/tickets/'), featured: true }, { name: 'Standard', price: '€290', features: ['Both days', 'Lunch & coffee', 'After-party'], cta: cta('Buy', '/tickets/') }, { name: 'Team (5)', price: '€1,150', features: ['5 passes', 'Reserved seating', 'Invoice'], cta: cta('Buy', '/tickets/') }] } },
        { pattern: 'faq', props: { heading: 'FAQ', items: [{ question: 'Is there a refund policy?', answer: 'Tickets are transferable and refundable until 30 days before the event.' }, { question: 'Will talks be recorded?', answer: 'Yes, all ticket holders get the recordings.' }], tone: 'muted' } },
      ],
    },
  },

  {
    id: 'nonprofit',
    title: 'Nonprofit / community',
    description: 'Charities, clubs and community projects: mission, impact, volunteer, donate.',
    sampleName: 'Green Streets Collective',
    brief: '{name}: a nonprofit / community organisation. Hopeful, human, concrete about impact. Visitors should donate, volunteer or join. Mission, programmes, impact numbers, stories, get involved.',
    plan: {
      name: 'Green Streets Collective',
      tagline: 'Planting trees, one street at a time',
      design: {
        palette: { base: '#fbfdf9', contrast: '#17301f', primary: '#2e7d32', secondary: '#e3f1e1', accent: '#f2a541', muted: '#f1f6ee' },
        headingFont: 'outfit',
        bodyFont: 'source-serif',
        radius: 'round',
      },
      pages: [
        { title: 'Home', slug: 'home', purpose: 'Mission and action', sections: [] },
        { title: 'Our work', slug: 'our-work', purpose: 'Programmes and impact', sections: [] },
        { title: 'Get involved', slug: 'get-involved', purpose: 'Volunteer and donate', sections: [] },
      ],
    },
    pages: {
      home: [
        { pattern: 'hero-split', props: { eyebrow: 'Community-led since 2016', heading: 'Greener streets for everyone', text: '{name} brings neighbours together to plant and care for street trees in the parts of the city that need them most.', primaryCta: cta('Volunteer', '/get-involved/'), secondaryCta: cta('Donate', '/get-involved/'), imageLabel: 'Volunteers planting a tree on a city street', tone: 'base' } },
        { pattern: 'stats', props: { heading: 'Our impact so far', items: [{ value: '4,200', label: 'trees planted' }, { value: '1,100', label: 'volunteers' }, { value: '38', label: 'neighbourhoods' }], tone: 'muted' } },
        { pattern: 'features-grid', props: { heading: 'What we do', items: [{ icon: '🌳', title: 'Plant', text: 'Community planting days every spring and autumn.' }, { icon: '💧', title: 'Care', text: 'Adopt-a-tree watering through the summer.' }, { icon: '📚', title: 'Teach', text: 'School programmes on urban nature.' }] } },
        { pattern: 'testimonials', props: { heading: 'Stories', items: [{ quote: 'Our street had no shade at all. Now kids play under the trees we planted together.', name: 'Halima', role: 'Volunteer since 2019' }] } },
        { pattern: 'cta-band', props: { heading: '€25 plants and cares for one tree', primaryCta: cta('Donate now', '/get-involved/'), tone: 'primary' } },
      ],
      'our-work': [
        { pattern: 'media-text', props: { heading: 'Street planting', text: 'We work with residents and the city to choose the right tree for every spot, then plant it together.', imageLabel: 'Freshly planted young tree', imageSide: 'left' } },
        { pattern: 'media-text', props: { heading: 'Schools programme', text: 'Pupils plant and monitor trees around their school and learn why they matter.', imageLabel: 'Children measuring a tree', imageSide: 'right', tone: 'muted' } },
      ],
      'get-involved': [
        { pattern: 'features-grid', props: { heading: 'Get involved', items: [{ title: 'Volunteer', text: 'Join a planting day — no experience needed.' }, { title: 'Adopt a tree', text: 'Water a tree near you through its first summers.' }, { title: 'Donate', text: 'Every €25 plants and cares for one tree.' }] } },
        { pattern: 'contact', props: { heading: 'Contact us', text: 'Write to us to volunteer, partner or ask about donations.', email: 'hello@example.com', address: 'Community Hall, 5 Elm Road' } },
      ],
    },
  },
];

export const starterById = (id: string) => STARTERS.find((s) => s.id === id);

/** Starters as the AI sees them (MCP list_starters). */
export const starterCatalog = () =>
  STARTERS.map((s) => ({ id: s.id, title: s.title, description: s.description, pages: s.plan.pages.map((p) => p.title) }));

/** Replace {name} in every string of a JSON-like value. */
function fill<T>(value: T, name: string): T {
  if (typeof value === 'string') return value.replace(/\{name\}/g, name) as T;
  if (Array.isArray(value)) return value.map((v) => fill(v, name)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, name)])) as T;
  return value;
}

export interface StarterResult {
  site: Site;
  brief: string;
  /** Normalizer notes (should be empty: starters are tested). */
  report: string[];
}

/**
 * Build a complete site from a starter. `name` replaces the sample name everywhere;
 * `about` (one line from the user) is added to the brief for the AI.
 */
export function buildStarter(id: string, opts: { name?: string; tagline?: string; about?: string } = {}): StarterResult {
  const s = starterById(id);
  if (!s) throw new Error(`Unknown starter "${id}". Starters: ${STARTERS.map((x) => x.id).join(', ')}`);
  const name = opts.name?.trim() || s.sampleName;
  const plan = fill(s.plan, name);
  plan.name = name;
  if (opts.tagline !== undefined) plan.tagline = opts.tagline.trim();
  let site = siteFromPlan(plan);
  const report: string[] = [];
  for (const page of site.pages) {
    const spec = s.plan.pages.find((p) => slugify(p.slug) === page.slug || (page.slug === 'home' && p === s.plan.pages[0]));
    const sections = fill(s.pages[spec?.slug ?? page.slug] ?? [], name);
    const { markup, report: r } = sectionsToMarkup(sections, site.design);
    report.push(...r.repaired, ...r.dropped.map((d) => `dropped ${d}`));
    site = setPageContent(site, page.id, markup);
  }
  const brief = [fill(s.brief, name), opts.about?.trim()].filter(Boolean).join('\n');
  return { site, brief, report };
}
