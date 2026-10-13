/**
 * Curated pattern library.
 *
 * The AI is much better at choosing a well-designed section and writing its copy
 * than at laying out raw columns/groups. Each pattern is a pure function:
 * (props, design) → BlockNode tree built only from core blocks + theme presets.
 * The output is plain core blocks: once inserted, a section is ordinary
 * Gutenberg content with no runtime dependency on this library.
 */
import type { BlockNode, Design, PaletteSlug } from '../types';
import { radiusValue, textOn } from './design';
import { placeholderImage } from './placeholders';

export type Tone = 'base' | 'muted' | 'primary' | 'contrast' | 'secondary';
const TONES: Tone[] = ['base', 'muted', 'primary', 'contrast', 'secondary'];

type Props = Record<string, any>;
interface Ctx {
  design: Design;
}

// ---------- tiny builders ----------

const b = (name: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockNode[] = []): BlockNode => ({
  name,
  attributes,
  innerBlocks,
});

const str = (v: unknown, fb = '') => (typeof v === 'string' ? v : v == null ? fb : String(v));
const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const tone = (v: unknown, fb: Tone = 'base'): Tone => (TONES.includes(v as Tone) ? (v as Tone) : fb);

const heading = (text: string, level = 2, extra: Record<string, unknown> = {}) =>
  b('core/heading', { level, content: text, ...extra });

const para = (text: string, extra: Record<string, unknown> = {}) => b('core/paragraph', { content: text, ...extra });

const centered = { style: { typography: { textAlign: 'center' } } };

function merge(a: Record<string, any>, c: Record<string, any>): Record<string, any> {
  const out = { ...a };
  for (const [k, v] of Object.entries(c)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' ? merge(out[k], v) : v;
  }
  return out;
}

interface Cta {
  label?: string;
  url?: string;
}

function buttons(ctas: (Cta | undefined)[], opts: { center?: boolean; onTone?: Tone; design: Design }) {
  const list = ctas.filter((c): c is Cta => !!c && !!str(c.label));
  if (!list.length) return null;
  const dark = opts.onTone && textOn(opts.design, opts.onTone as PaletteSlug) === 'base';
  return b(
    'core/buttons',
    { layout: { type: 'flex', justifyContent: opts.center ? 'center' : 'left' } },
    list.map((c, i) => {
      const attrs: Record<string, unknown> = { text: str(c.label), url: str(c.url, '#') };
      if (i === 0 && dark) {
        // Primary button on a dark/colored band: invert to stay visible.
        attrs.backgroundColor = opts.onTone === 'primary' ? 'base' : 'accent';
        attrs.textColor = opts.onTone === 'primary' ? 'primary' : textOn(opts.design, 'accent');
      }
      if (i > 0) {
        attrs.className = 'is-style-outline';
        if (dark) attrs.textColor = 'base';
      }
      return b('core/button', attrs);
    }),
  );
}

/** Full-width section band with constrained inner layout. */
function section(t: Tone, children: (BlockNode | null)[], ctx: Ctx, opts: { pad?: '60' | '70' | '80'; gap?: string; name?: string } = {}) {
  const pad = `var:preset|spacing|${opts.pad ?? '70'}`;
  const attrs: Record<string, any> = {
    align: 'full',
    layout: { type: 'constrained' },
    style: { spacing: { padding: { top: pad, bottom: pad }, blockGap: opts.gap ?? 'var:preset|spacing|50', margin: { top: '0', bottom: '0' } } },
    metadata: opts.name ? { name: opts.name } : undefined,
  };
  if (t !== 'base') {
    attrs.backgroundColor = t;
    attrs.textColor = textOn(ctx.design, t);
  }
  if (!attrs.metadata) delete attrs.metadata;
  return b('core/group', attrs, children.filter(Boolean) as BlockNode[]);
}

function cardTone(t: Tone): Tone {
  return t === 'base' ? 'muted' : t === 'muted' ? 'base' : t === 'secondary' ? 'base' : 'base';
}

function card(t: Tone, children: (BlockNode | null)[], ctx: Ctx, extra: Record<string, any> = {}) {
  const r = radiusValue(ctx.design.radius).card;
  return b(
    'core/group',
    merge(
      {
        backgroundColor: t,
        textColor: textOn(ctx.design, t),
        style: {
          spacing: { padding: { top: 'var:preset|spacing|50', bottom: 'var:preset|spacing|50', left: 'var:preset|spacing|50', right: 'var:preset|spacing|50' }, blockGap: 'var:preset|spacing|30' },
          border: { radius: r },
          dimensions: { minHeight: '100%' },
        },
        layout: { type: 'default' },
      },
      extra,
    ),
    children.filter(Boolean) as BlockNode[],
  );
}

function grid(items: BlockNode[][], perRow = 3): BlockNode[] {
  const rows: BlockNode[] = [];
  for (let i = 0; i < items.length; i += perRow) {
    const slice = items.slice(i, i + perRow);
    rows.push(
      b(
        'core/columns',
        { align: 'wide', style: { spacing: { blockGap: { top: 'var:preset|spacing|50', left: 'var:preset|spacing|50' } } } },
        slice.map((children) => b('core/column', {}, children)),
      ),
    );
  }
  return rows;
}

function image(label: string, ctx: Ctx, opts: { aspect?: string; w?: number; h?: number; align?: string } = {}) {
  return b('core/image', {
    url: placeholderImage(label, ctx.design, opts.w ?? 1200, opts.h ?? 900),
    alt: label,
    aspectRatio: opts.aspect ?? '4/3',
    scale: 'cover',
    sizeSlug: 'large',
    ...(opts.align ? { align: opts.align } : {}),
    style: { border: { radius: radiusValue(ctx.design.radius).card } },
  });
}

function intro(p: Props, center = true): BlockNode[] {
  const out: BlockNode[] = [];
  if (str(p.eyebrow))
    out.push(
      para(str(p.eyebrow), {
        fontSize: 'small',
        style: merge(center ? centered.style : {}, { typography: { textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '600' } }),
      }),
    );
  if (str(p.heading)) out.push(heading(str(p.heading), 2, center ? centered : {}));
  if (str(p.intro)) out.push(para(str(p.intro), { fontSize: 'large', ...(center ? centered : {}) }));
  return out;
}

// ---------- patterns ----------

export interface PatternDef {
  description: string;
  props: string; // compact prop schema shown to the AI
  build: (p: Props, ctx: Ctx) => BlockNode;
}

export const PATTERNS: Record<string, PatternDef> = {
  'hero-centered': {
    description: 'Big centered headline hero. Good default home hero.',
    props: '{eyebrow?, heading, text, primaryCta:{label,url}, secondaryCta?:{label,url}, tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      return section(
        t,
        [
          b('core/group', { layout: { type: 'constrained', contentSize: '820px' }, style: { spacing: { blockGap: 'var:preset|spacing|40' } } }, [
            ...intro({ eyebrow: p.eyebrow }),
            heading(str(p.heading), 1, centered),
            para(str(p.text), { fontSize: 'large', ...centered }),
            buttons([p.primaryCta, p.secondaryCta], { center: true, onTone: t, design: ctx.design })!,
          ].filter(Boolean)),
        ],
        ctx,
        { pad: '80', name: 'Hero' },
      );
    },
  },

  'hero-cover': {
    description: 'Full-bleed cover hero with an image (or gradient) behind white text. Dramatic, good for hospitality, events, creative.',
    props: '{heading, text, primaryCta:{label,url}, secondaryCta?, imageLabel?: "what the background photo shows", useGradient?: boolean}',
    build: (p, ctx) => {
      const useImage = !p.useGradient && str(p.imageLabel);
      const attrs: Record<string, any> = {
        align: 'full',
        minHeight: 78,
        minHeightUnit: 'vh',
        contentPosition: 'center center',
        isDark: true,
        layout: { type: 'constrained', contentSize: '820px' },
        style: { spacing: { padding: { top: 'var:preset|spacing|80', bottom: 'var:preset|spacing|80' }, margin: { top: '0', bottom: '0' } } },
        metadata: { name: 'Hero' },
      };
      if (useImage) {
        Object.assign(attrs, { url: placeholderImage(str(p.imageLabel), ctx.design, 1800, 1100), alt: str(p.imageLabel), dimRatio: 50, overlayColor: 'contrast' });
      } else {
        Object.assign(attrs, { gradient: 'primary-to-contrast', dimRatio: 100 });
      }
      return b('core/cover', attrs, [
        heading(str(p.heading), 1, { ...centered, textColor: 'base' }),
        para(str(p.text), { fontSize: 'large', textColor: 'base', ...centered }),
        buttons([p.primaryCta, p.secondaryCta], { center: true, onTone: 'contrast', design: ctx.design })!,
      ].filter(Boolean));
    },
  },

  'hero-split': {
    description: 'Two-column hero: copy + CTA on one side, image on the other. Good for products, services, SaaS.',
    props: '{eyebrow?, heading, text, primaryCta, secondaryCta?, imageLabel, tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      return section(
        t,
        [
          b('core/columns', { align: 'wide', verticalAlignment: 'center', style: { spacing: { blockGap: { left: 'var:preset|spacing|70' } } } }, [
            b('core/column', { verticalAlignment: 'center', width: '52%' }, [
              ...intro({ eyebrow: p.eyebrow }, false),
              heading(str(p.heading), 1),
              para(str(p.text), { fontSize: 'large' }),
              buttons([p.primaryCta, p.secondaryCta], { onTone: t, design: ctx.design })!,
            ].filter(Boolean)),
            b('core/column', { verticalAlignment: 'center' }, [image(str(p.imageLabel, 'Hero image'), ctx, { aspect: '4/5', w: 960, h: 1200 })]),
          ]),
        ],
        ctx,
        { pad: '80', name: 'Hero' },
      );
    },
  },

  'features-grid': {
    description: 'Heading + grid of 3–6 feature/service cards.',
    props: '{eyebrow?, heading, intro?, items:[{title, text, icon?: one emoji or short label like "01"}], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      const ct = cardTone(t);
      const cards = arr<Props>(p.items).slice(0, 9).map((it) => [
        card(ct, [
          str(it.icon) ? para(str(it.icon), { fontSize: 'x-large', textColor: ct === 'base' || ct === 'muted' ? 'primary' : undefined }) : null,
          heading(str(it.title), 3, { fontSize: 'large' }),
          para(str(it.text)),
        ], ctx),
      ]);
      return section(t, [...intro(p), ...grid(cards, cards.length === 4 ? 2 : 3)], ctx, { name: 'Features' });
    },
  },

  'media-text': {
    description: 'Image beside text with optional bullet list and CTA. Good for "about", "how we work", product detail.',
    props: '{heading, text, bullets?: string[], cta?:{label,url}, imageLabel, imageSide?: "left"|"right", tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      const bullets = arr<string>(p.bullets);
      return section(
        t,
        [
          b(
            'core/media-text',
            {
              align: 'wide',
              mediaUrl: placeholderImage(str(p.imageLabel, 'Image'), ctx.design, 1200, 1000),
              mediaAlt: str(p.imageLabel),
              mediaType: 'image',
              mediaPosition: p.imageSide === 'right' ? 'right' : 'left',
              verticalAlignment: 'center',
              imageFill: false,
              mediaWidth: 50,
              style: { spacing: { blockGap: 'var:preset|spacing|40' } },
            },
            [
              heading(str(p.heading), 2),
              para(str(p.text)),
              bullets.length ? b('core/list', {}, bullets.map((x) => b('core/list-item', { content: str(x) }))) : null,
              buttons([p.cta], { onTone: t, design: ctx.design }),
            ].filter(Boolean) as BlockNode[],
          ),
        ],
        ctx,
        { name: 'Media & text' },
      );
    },
  },

  stats: {
    description: 'Row of 3–4 big numbers with labels (social proof, impact).',
    props: '{heading?, items:[{value:"12k+", label}], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone, 'primary');
      const items = arr<Props>(p.items).slice(0, 4);
      return section(
        t,
        [
          str(p.heading) ? heading(str(p.heading), 2, centered) : null,
          b(
            'core/columns',
            { align: 'wide' },
            items.map((it) =>
              b('core/column', {}, [
                para(str(it.value), { fontSize: 'xx-large', style: { typography: { textAlign: 'center', fontWeight: '700', lineHeight: '1.1' } }, fontFamily: 'heading' }),
                para(str(it.label), { ...centered, style: { typography: { textAlign: 'center' }, spacing: { margin: { top: 'var:preset|spacing|20' } } } }),
              ]),
            ),
          ),
        ],
        ctx,
        { pad: '60', name: 'Stats' },
      );
    },
  },

  testimonials: {
    description: '2–3 customer quotes as cards.',
    props: '{heading, items:[{quote, name, role?}], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone, 'muted');
      const ct = cardTone(t);
      const cards = arr<Props>(p.items).slice(0, 6).map((it) => [
        card(ct, [
          para('“' + str(it.quote).replace(/^["“]|["”]$/g, '') + '”', { fontSize: 'large', fontFamily: 'heading' }),
          para(`<strong>${str(it.name)}</strong>${str(it.role) ? '<br>' + str(it.role) : ''}`, { fontSize: 'small' }),
        ], ctx),
      ]);
      return section(t, [...intro(p), ...grid(cards, 3)], ctx, { name: 'Testimonials' });
    },
  },

  pricing: {
    description: '2–3 pricing plans as cards; one can be featured.',
    props: '{heading, intro?, plans:[{name, price, period?, description?, features: string[], cta:{label,url}, featured?: boolean}], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      const plans = arr<Props>(p.plans).slice(0, 4);
      const cols = plans.map((pl) => {
        const ct: Tone = pl.featured ? 'primary' : cardTone(t);
        return [
          card(ct, [
            heading(str(pl.name), 3, { fontSize: 'large' }),
            para(`<strong>${str(pl.price)}</strong>${str(pl.period) ? ' <span style="font-size:1rem;font-weight:400">' + str(pl.period) + '</span>' : ''}`, { fontSize: 'xx-large', fontFamily: 'heading' }),
            str(pl.description) ? para(str(pl.description)) : null,
            b('core/list', {}, arr<string>(pl.features).map((f) => b('core/list-item', { content: str(f) }))),
            buttons([pl.cta], { onTone: ct, design: ctx.design }),
          ], ctx),
        ];
      });
      return section(t, [...intro(p), ...grid(cols, Math.max(1, cols.length))], ctx, { name: 'Pricing' });
    },
  },

  faq: {
    description: 'Accordion of questions and answers (core/details).',
    props: '{heading, intro?, items:[{question, answer}], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      return section(
        t,
        [
          ...intro(p),
          b(
            'core/group',
            { layout: { type: 'default' }, style: { spacing: { blockGap: '0' } } },
            arr<Props>(p.items).slice(0, 12).map((it) => b('core/details', { summary: str(it.question) }, [para(str(it.answer))])),
          ),
        ],
        ctx,
        { name: 'FAQ' },
      );
    },
  },

  'cta-band': {
    description: 'Short closing call-to-action band. Usually last section on a page.',
    props: '{heading, text?, primaryCta, secondaryCta?, tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone, 'primary');
      return section(
        t,
        [
          heading(str(p.heading), 2, centered),
          str(p.text) ? para(str(p.text), { fontSize: 'large', ...centered }) : null,
          buttons([p.primaryCta, p.secondaryCta], { center: true, onTone: t, design: ctx.design }),
        ],
        ctx,
        { pad: '70', gap: 'var:preset|spacing|40', name: 'Call to action' },
      );
    },
  },

  contact: {
    description: 'Contact details: intro text + card with email, phone, address, hours. (No form – WordPress core has no form block yet.)',
    props: '{heading, text, email?, phone?, address?, hours?, tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      const lines: BlockNode[] = [];
      if (str(p.email)) lines.push(para(`<strong>Email</strong><br><a href="mailto:${str(p.email)}">${str(p.email)}</a>`));
      if (str(p.phone)) lines.push(para(`<strong>Phone</strong><br><a href="tel:${str(p.phone).replace(/[^+\d]/g, '')}">${str(p.phone)}</a>`));
      if (str(p.address)) lines.push(para(`<strong>Address</strong><br>${str(p.address)}`));
      if (str(p.hours)) lines.push(para(`<strong>Hours</strong><br>${str(p.hours)}`));
      return section(
        t,
        [
          b('core/columns', { align: 'wide', style: { spacing: { blockGap: { left: 'var:preset|spacing|70' } } } }, [
            b('core/column', { width: '55%' }, [
              heading(str(p.heading), 2),
              para(str(p.text), { fontSize: 'large' }),
              str(p.email) ? buttons([{ label: 'Send us an email', url: `mailto:${str(p.email)}` }], { onTone: t, design: ctx.design }) : null,
            ].filter(Boolean) as BlockNode[]),
            b('core/column', {}, [card(cardTone(t), lines, ctx)]),
          ]),
        ],
        ctx,
        { name: 'Contact' },
      );
    },
  },

  'rich-text': {
    description: 'Readable long-form text section: heading + paragraphs (+ optional bullet list). Good for about/story/policy pages.',
    props: '{eyebrow?, heading, paragraphs: string[], bullets?: string[], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      const bullets = arr<string>(p.bullets);
      return section(
        t,
        [
          ...intro({ eyebrow: p.eyebrow }, false),
          heading(str(p.heading), 2),
          ...arr<string>(p.paragraphs).map((x) => para(str(x))),
          bullets.length ? b('core/list', {}, bullets.map((x) => b('core/list-item', { content: str(x) }))) : null,
        ],
        ctx,
        { gap: 'var:preset|spacing|40', name: 'Text' },
      );
    },
  },

  team: {
    description: 'Grid of people with photo placeholder, name, role.',
    props: '{heading, intro?, members:[{name, role, bio?}], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      const people = arr<Props>(p.members).slice(0, 8).map((m) => [
        image(`Portrait of ${str(m.name)}`, ctx, { aspect: '1', w: 800, h: 800 }),
        heading(str(m.name), 3, { fontSize: 'large', style: { spacing: { margin: { top: 'var:preset|spacing|40' } } } }),
        para(str(m.role), { textColor: t === 'base' || t === 'muted' ? 'primary' : undefined, style: { spacing: { margin: { top: 'var:preset|spacing|20' } } } }),
        str(m.bio) ? para(str(m.bio), { fontSize: 'small' }) : null,
      ].filter(Boolean) as BlockNode[]);
      return section(t, [...intro(p), ...grid(people, people.length === 4 ? 4 : 3)], ctx, { name: 'Team' });
    },
  },

  steps: {
    description: 'Numbered process / how-it-works steps (3–4).',
    props: '{heading, intro?, items:[{title, text}], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      const items = arr<Props>(p.items).slice(0, 4);
      const cols = items.map((it, i) => [
        para(String(i + 1).padStart(2, '0'), { fontSize: 'xx-large', fontFamily: 'heading', textColor: t === 'base' || t === 'muted' ? 'accent' : undefined, style: { typography: { fontWeight: '700', lineHeight: '1' } } }),
        b('core/separator', { className: 'is-style-wide', style: { spacing: { margin: { top: 'var:preset|spacing|30', bottom: 'var:preset|spacing|30' } } } }),
        heading(str(it.title), 3, { fontSize: 'large' }),
        para(str(it.text), { style: { spacing: { margin: { top: 'var:preset|spacing|20' } } } }),
      ]);
      return section(t, [...intro(p), ...grid(cols, Math.max(1, cols.length))], ctx, { name: 'Steps' });
    },
  },

  'logo-cloud': {
    description: 'Small "trusted by / featured in" strip of names.',
    props: '{label, names: string[], tone?}',
    build: (p, ctx) => {
      const t = tone(p.tone);
      return section(
        t,
        [
          para(str(p.label), { fontSize: 'small', style: { typography: { textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.12em' } } }),
          b(
            'core/group',
            { align: 'wide', layout: { type: 'flex', justifyContent: 'center', flexWrap: 'wrap' }, style: { spacing: { blockGap: 'var:preset|spacing|60' } } },
            arr<string>(p.names).slice(0, 8).map((n) => para(str(n), { fontSize: 'large', fontFamily: 'heading', style: { typography: { fontWeight: '700' }, color: {} }, className: 'is-logo' })),
          ),
        ],
        ctx,
        { pad: '60', gap: 'var:preset|spacing|40', name: 'Logos' },
      );
    },
  },
};

export function expandPattern(name: string, props: Props, design: Design): BlockNode | null {
  const def = PATTERNS[name];
  if (!def) return null;
  return def.build(props ?? {}, { design });
}

export function patternCatalogForPrompt(): string {
  return Object.entries(PATTERNS)
    .map(([k, d]) => `- "${k}": ${d.description}\n  props: ${d.props}`)
    .join('\n');
}

// ---------- header & footer template parts ----------

export function buildHeader(siteName: string, nav: { label: string; url: string }[], ctaLabel?: string, ctaUrl?: string): BlockNode[] {
  return [
    b(
      'core/group',
      {
        align: 'full',
        layout: { type: 'constrained' },
        style: { spacing: { padding: { top: 'var:preset|spacing|40', bottom: 'var:preset|spacing|40' } } },
        metadata: { name: 'Header' },
      },
      [
        b('core/group', { align: 'wide', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
          b('core/site-title', { level: 0 }),
          b('core/group', { layout: { type: 'flex', flexWrap: 'wrap' }, style: { spacing: { blockGap: 'var:preset|spacing|50' } } }, [
            b('core/navigation', { overlayMenu: 'mobile', layout: { type: 'flex', justifyContent: 'right' } }, nav.map((n) => b('core/navigation-link', { label: n.label, url: n.url, kind: 'custom' }))),
            ...(ctaLabel
              ? [b('core/buttons', {}, [b('core/button', { text: ctaLabel, url: ctaUrl ?? '#', style: { spacing: { padding: { top: '0.55rem', bottom: '0.55rem', left: '1.1rem', right: '1.1rem' } } } })])]
              : []),
          ]),
        ]),
      ],
    ),
  ];
}

export function buildFooter(siteName: string, tagline: string, nav: { label: string; url: string }[], design: Design): BlockNode[] {
  const year = new Date().getFullYear();
  return [
    b(
      'core/group',
      {
        align: 'full',
        backgroundColor: 'contrast',
        textColor: textOn(design, 'contrast'),
        layout: { type: 'constrained' },
        style: {
          spacing: { padding: { top: 'var:preset|spacing|70', bottom: 'var:preset|spacing|60' }, margin: { top: '0' } },
          elements: { link: { color: { text: 'var:preset|color|' + textOn(design, 'contrast') } } },
        },
        metadata: { name: 'Footer' },
      },
      [
        b('core/columns', { align: 'wide' }, [
          b('core/column', { width: '50%' }, [
            b('core/site-title', { level: 0 }),
            b('core/site-tagline', { fontSize: 'small' }),
          ]),
          b('core/column', {}, [
            b('core/navigation', { overlayMenu: 'never', layout: { type: 'flex', orientation: 'vertical' }, style: { spacing: { blockGap: 'var:preset|spacing|20' } } }, nav.map((n) => b('core/navigation-link', { label: n.label, url: n.url, kind: 'custom' }))),
          ]),
        ]),
        b('core/separator', { align: 'wide', className: 'is-style-wide', style: { color: { background: 'rgba(127,127,127,.35)' } } }),
        b('core/paragraph', { align: 'wide', fontSize: 'small', content: `© ${year} ${siteName}. ${tagline ? '' : ''}Built with WordPress blocks.` }),
      ],
    ),
  ];
}
