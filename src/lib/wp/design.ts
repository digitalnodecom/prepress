/**
 * Design tokens → theme.json, and theme.json → the CSS WordPress would generate.
 *
 * The AI and the patterns never write raw colors or sizes into blocks. They
 * reference preset slugs (backgroundColor: "primary", fontSize: "x-large",
 * padding: "var:preset|spacing|70"), so a restyle is a single theme.json edit,
 * in this builder and later in the WordPress Site Editor.
 */
import type { Design, PaletteSlug, ThemeJsonPatch } from '../types';
import { PALETTE_SLUGS } from '../types';

export interface FontDef {
  name: string;
  stack: string;
  google?: string; // Google Fonts family spec
}

export const FONTS: Record<string, FontDef> = {
  inter: { name: 'Inter', stack: '"Inter", system-ui, sans-serif', google: 'Inter:wght@400;500;600;700' },
  'dm-sans': { name: 'DM Sans', stack: '"DM Sans", system-ui, sans-serif', google: 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700' },
  manrope: { name: 'Manrope', stack: '"Manrope", system-ui, sans-serif', google: 'Manrope:wght@400;500;600;700;800' },
  'space-grotesk': { name: 'Space Grotesk', stack: '"Space Grotesk", system-ui, sans-serif', google: 'Space+Grotesk:wght@400;500;600;700' },
  outfit: { name: 'Outfit', stack: '"Outfit", system-ui, sans-serif', google: 'Outfit:wght@400;500;600;700' },
  'ibm-plex-sans': { name: 'IBM Plex Sans', stack: '"IBM Plex Sans", system-ui, sans-serif', google: 'IBM+Plex+Sans:wght@400;500;600;700' },
  syne: { name: 'Syne', stack: '"Syne", system-ui, sans-serif', google: 'Syne:wght@500;600;700;800' },
  fraunces: { name: 'Fraunces', stack: '"Fraunces", Georgia, serif', google: 'Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700' },
  'playfair-display': { name: 'Playfair Display', stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@400;600;700' },
  lora: { name: 'Lora', stack: '"Lora", Georgia, serif', google: 'Lora:wght@400;500;600;700' },
  'source-serif': { name: 'Source Serif 4', stack: '"Source Serif 4", Georgia, serif', google: 'Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700' },
  'instrument-serif': { name: 'Instrument Serif', stack: '"Instrument Serif", Georgia, serif', google: 'Instrument+Serif' },
  system: { name: 'System Sans', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
};

export const DEFAULT_DESIGN: Design = {
  palette: {
    base: '#fbfaf7',
    contrast: '#1b1a17',
    primary: '#2f5d50',
    secondary: '#e8e1d3',
    accent: '#d9822b',
    muted: '#f1ede4',
  },
  headingFont: 'fraunces',
  bodyFont: 'dm-sans',
  radius: 'soft',
  contentSize: '720px',
  wideSize: '1200px',
};

export const PALETTE_NAMES: Record<PaletteSlug, string> = {
  base: 'Base',
  contrast: 'Contrast',
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  muted: 'Muted',
};

// ---------- color helpers ----------

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (!HEX.test(s)) return fallback;
  if (s.length === 4) return '#' + [...s.slice(1)].map((c) => c + c).join('').toLowerCase();
  return s.toLowerCase();
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Which palette slug reads best as text on the given background slug. */
export function textOn(design: Design, bg: PaletteSlug): PaletteSlug {
  const p = design.palette;
  return contrastRatio(p[bg], p.base) >= contrastRatio(p[bg], p.contrast) ? 'base' : 'contrast';
}

export function sanitizeDesign(input: Partial<Design> | undefined): Design {
  const d = input ?? {};
  const palette = {} as Record<PaletteSlug, string>;
  for (const slug of PALETTE_SLUGS) {
    palette[slug] = normalizeHex(d.palette?.[slug], DEFAULT_DESIGN.palette[slug]);
  }
  const font = (k: unknown, fb: string) => (typeof k === 'string' && FONTS[k] ? k : fb);
  return {
    palette,
    headingFont: font(d.headingFont, DEFAULT_DESIGN.headingFont),
    bodyFont: font(d.bodyFont, DEFAULT_DESIGN.bodyFont),
    radius: d.radius === 'none' || d.radius === 'round' ? d.radius : 'soft',
    contentSize: typeof d.contentSize === 'string' ? d.contentSize : DEFAULT_DESIGN.contentSize,
    wideSize: typeof d.wideSize === 'string' ? d.wideSize : DEFAULT_DESIGN.wideSize,
  };
}

export function radiusValue(r: Design['radius']): { button: string; card: string } {
  if (r === 'none') return { button: '0px', card: '0px' };
  if (r === 'round') return { button: '999px', card: '24px' };
  return { button: '8px', card: '12px' };
}

export function googleFontsUrl(design: Design): string | null {
  const families = [...new Set([design.headingFont, design.bodyFont])]
    .map((k) => FONTS[k]?.google)
    .filter(Boolean);
  if (!families.length) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => 'family=' + f).join('&')}&display=swap`;
}

// ---------- presets ----------

export const FONT_SIZES = [
  { slug: 'small', name: 'Small', size: '0.875rem', min: '0.875rem', max: '0.875rem' },
  { slug: 'medium', name: 'Medium', size: '1.0625rem', min: '1rem', max: '1.0625rem' },
  { slug: 'large', name: 'Large', size: '1.375rem', min: '1.2rem', max: '1.375rem' },
  { slug: 'x-large', name: 'Extra Large', size: '2rem', min: '1.6rem', max: '2.25rem' },
  { slug: 'xx-large', name: 'Huge', size: '3.25rem', min: '2.4rem', max: '3.75rem' },
  { slug: 'xxx-large', name: 'Gigantic', size: '4.5rem', min: '2.9rem', max: '5.25rem' },
];

export const SPACING_SIZES = [
  { slug: '20', name: '2X-Small', size: '0.5rem' },
  { slug: '30', name: 'X-Small', size: '0.75rem' },
  { slug: '40', name: 'Small', size: '1rem' },
  { slug: '50', name: 'Medium', size: 'clamp(1.25rem, 2.5vw, 2rem)' },
  { slug: '60', name: 'Large', size: 'clamp(1.75rem, 4vw, 3rem)' },
  { slug: '70', name: 'X-Large', size: 'clamp(2.5rem, 6vw, 4.5rem)' },
  { slug: '80', name: '2X-Large', size: 'clamp(3.5rem, 9vw, 7rem)' },
];

export function gradients(design: Design) {
  const p = design.palette;
  return [
    { slug: 'primary-to-accent', name: 'Primary to accent', gradient: `linear-gradient(135deg, ${p.primary} 0%, ${p.accent} 100%)` },
    { slug: 'primary-to-contrast', name: 'Primary to contrast', gradient: `linear-gradient(160deg, ${p.primary} 0%, ${p.contrast} 100%)` },
    { slug: 'muted-to-base', name: 'Muted to base', gradient: `linear-gradient(180deg, ${p.muted} 0%, ${p.base} 100%)` },
  ];
}

// ---------- theme.json ----------

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Deep merge for theme.json: objects merge, arrays and scalars replace, null deletes. */
export function mergeThemeJson<T extends Record<string, any>>(base: T, patch: Record<string, any> | undefined): T {
  if (!patch) return base;
  const out: Record<string, any> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else if (isObj(v) && isObj(out[k])) out[k] = mergeThemeJson(out[k], v);
    else out[k] = v;
  }
  return out as T;
}

const MAX_THEME_PATCH = 256 * 1024;

/** Validate an untrusted theme.json patch (from the AI/MCP). Throws with an actionable message. */
export function cleanThemeJsonPatch(input: unknown): ThemeJsonPatch {
  if (!isObj(input)) throw new Error('theme.json patch must be an object, e.g. { "settings": {…}, "styles": {…} }');
  const json = JSON.stringify(input);
  if (json.length > MAX_THEME_PATCH) throw new Error('theme.json patch is too large (max 256 KB)');
  if (/<\/?style|<script/i.test(json)) throw new Error('theme.json may not contain HTML tags');
  const { version, $schema, ...rest } = input as Record<string, any>;
  void version;
  void $schema;
  return rest;
}

export function buildThemeJson(design: Design, patch?: ThemeJsonPatch) {
  const tj = baseThemeJson(design);
  if (!patch) return tj;
  return { ...mergeThemeJson(tj, patch as Record<string, any>), $schema: tj.$schema, version: 3 } as typeof tj;
}

function baseThemeJson(design: Design) {
  const p = design.palette;
  const r = radiusValue(design.radius);
  return {
    $schema: 'https://schemas.wp.org/wp/7.0/theme.json',
    version: 3,
    settings: {
      appearanceTools: true,
      useRootPaddingAwareAlignments: true,
      layout: { contentSize: design.contentSize, wideSize: design.wideSize },
      color: {
        defaultPalette: false,
        defaultGradients: false,
        palette: PALETTE_SLUGS.map((slug) => ({ slug, name: PALETTE_NAMES[slug], color: p[slug] })),
        gradients: gradients(design),
      },
      typography: {
        fluid: true,
        defaultFontSizes: false,
        fontFamilies: [...new Set([design.headingFont, design.bodyFont])].map((k) => ({
          slug: k === design.headingFont ? 'heading' : 'body',
          name: FONTS[k].name,
          fontFamily: FONTS[k].stack,
        })).concat(
          design.headingFont === design.bodyFont
            ? [{ slug: 'body', name: FONTS[design.bodyFont].name, fontFamily: FONTS[design.bodyFont].stack }]
            : [],
        ),
        fontSizes: FONT_SIZES.map((f) => ({
          slug: f.slug,
          name: f.name,
          size: f.size,
          fluid: f.min === f.max ? false : { min: f.min, max: f.max },
        })),
      },
      spacing: {
        defaultSpacingSizes: false,
        spacingSizes: SPACING_SIZES,
        units: ['px', 'em', 'rem', 'vh', 'vw', '%'],
      },
    },
    styles: {
      color: { background: 'var:preset|color|base', text: 'var:preset|color|contrast' },
      typography: {
        fontFamily: 'var:preset|font-family|body',
        fontSize: 'var:preset|font-size|medium',
        lineHeight: '1.6',
      },
      spacing: {
        blockGap: '1.5rem',
        padding: {
          left: 'var:preset|spacing|50',
          right: 'var:preset|spacing|50',
        },
      },
      elements: {
        heading: {
          typography: { fontFamily: 'var:preset|font-family|heading', fontWeight: '600', lineHeight: '1.15' },
        },
        h1: { typography: { fontSize: 'var:preset|font-size|xxx-large', letterSpacing: '-0.02em' } },
        h2: { typography: { fontSize: 'var:preset|font-size|xx-large', letterSpacing: '-0.015em' } },
        h3: { typography: { fontSize: 'var:preset|font-size|x-large' } },
        h4: { typography: { fontSize: 'var:preset|font-size|large' } },
        link: {
          color: { text: 'var:preset|color|primary' },
          ':hover': { typography: { textDecoration: 'none' } },
        },
        button: {
          color: { background: 'var:preset|color|primary', text: 'var:preset|color|base' },
          border: { radius: r.button },
          spacing: { padding: { top: '0.8rem', bottom: '0.8rem', left: '1.5rem', right: '1.5rem' } },
          typography: { fontWeight: '600', fontSize: 'var:preset|font-size|medium' },
          ':hover': { color: { background: 'var:preset|color|contrast' } },
        },
      },
      blocks: {
        'core/navigation': { typography: { fontSize: 'var:preset|font-size|medium', fontWeight: '500' } },
        'core/site-title': {
          typography: { fontFamily: 'var:preset|font-family|heading', fontSize: 'var:preset|font-size|large', fontWeight: '700' },
          elements: { link: { color: { text: 'currentColor' }, typography: { textDecoration: 'none' } } },
        },
        'core/quote': { border: { width: '0 0 0 3px', style: 'solid', color: 'var:preset|color|accent' }, spacing: { padding: { left: '1.5rem' } } },
        'core/details': { border: { bottom: { width: '1px', style: 'solid', color: 'var:preset|color|secondary' } }, spacing: { padding: { top: '1rem', bottom: '1rem' } } },
        'core/separator': { color: { text: 'var:preset|color|secondary' } },
      },
      // Sections butt up against each other; spacing lives inside each section.
      css: '.wp-site-blocks > * { margin-block-start: 0; }',
    },
    templateParts: [
      { name: 'header', title: 'Header', area: 'header' },
      { name: 'footer', title: 'Footer', area: 'footer' },
    ],
  };
}

// ---------- CSS compiler (a small subset of wp_get_global_stylesheet) ----------

/** "var:preset|color|primary" → "var(--wp--preset--color--primary)" */
export function presetToCss(v: unknown): string {
  if (typeof v !== 'string') return String(v ?? '');
  if (v.startsWith('var:')) return `var(--wp--${v.slice(4).split('|').join('--')})`;
  return v;
}

function fluid(min: string, max: string) {
  // Linear between a 320px (20rem) and a 1200px (75rem) viewport, rem based.
  const a = parseFloat(min);
  const b = parseFloat(max);
  return `clamp(${min}, calc(${a}rem + ${(b - a).toFixed(4)} * ((100vw - 20rem) / 55)), ${max})`;
}

function decls(obj: Record<string, unknown> | undefined): string {
  if (!obj) return '';
  const out: string[] = [];
  const t = obj.typography as Record<string, string> | undefined;
  const c = obj.color as Record<string, string> | undefined;
  const s = obj.spacing as Record<string, any> | undefined;
  const b = obj.border as Record<string, any> | undefined;
  if (c?.background) out.push(`background-color:${presetToCss(c.background)}`);
  if (c?.text) out.push(`color:${presetToCss(c.text)}`);
  if (t) {
    const map: Record<string, string> = {
      fontFamily: 'font-family', fontSize: 'font-size', fontWeight: 'font-weight', lineHeight: 'line-height',
      letterSpacing: 'letter-spacing', textDecoration: 'text-decoration', textTransform: 'text-transform',
    };
    for (const [k, v] of Object.entries(t)) if (map[k]) out.push(`${map[k]}:${presetToCss(v)}`);
  }
  if (s?.padding) {
    for (const side of ['top', 'right', 'bottom', 'left']) if (s.padding[side]) out.push(`padding-${side}:${presetToCss(s.padding[side])}`);
  }
  if (b) {
    if (b.radius) out.push(`border-radius:${b.radius}`);
    if (b.width) out.push(`border-width:${b.width}`);
    if (b.style) out.push(`border-style:${b.style}`);
    if (b.color) out.push(`border-color:${presetToCss(b.color)}`);
    if (b.bottom) out.push(`border-bottom:${b.bottom.width} ${b.bottom.style} ${presetToCss(b.bottom.color)}`);
  }
  return out.join(';');
}

/** Generates the global-styles CSS for the preview from the same theme.json we export. */
export function compileGlobalStyles(design: Design, patch?: ThemeJsonPatch): string {
  const tj: any = buildThemeJson(design, patch);
  tj.settings ??= {};
  tj.styles ??= {};
  const palette: any[] = tj.settings.color?.palette ?? [];
  const gradientsList: any[] = tj.settings.color?.gradients ?? [];
  const fontSizes: any[] = tj.settings.typography?.fontSizes ?? [];
  const families: any[] = tj.settings.typography?.fontFamilies ?? [];
  const spacingSizes: any[] = tj.settings.spacing?.spacingSizes ?? [];
  const layout = tj.settings.layout ?? {};
  const vars: string[] = [];
  const classes: string[] = [];

  for (const { slug, color } of palette) {
    vars.push(`--wp--preset--color--${slug}:${color}`);
    classes.push(
      `.has-${slug}-color{color:var(--wp--preset--color--${slug}) !important}`,
      `.has-${slug}-background-color{background-color:var(--wp--preset--color--${slug}) !important}`,
      `.has-${slug}-border-color{border-color:var(--wp--preset--color--${slug}) !important}`,
    );
  }
  for (const { slug, gradient } of gradientsList) {
    vars.push(`--wp--preset--gradient--${slug}:${gradient}`);
    classes.push(`.has-${slug}-gradient-background{background:var(--wp--preset--gradient--${slug}) !important}`);
  }
  for (const f of fontSizes) {
    const fl = f.fluid;
    vars.push(`--wp--preset--font-size--${f.slug}:${fl && typeof fl === 'object' && fl.min && fl.max ? fluid(fl.min, fl.max) : f.size}`);
    classes.push(`.has-${f.slug}-font-size{font-size:var(--wp--preset--font-size--${f.slug}) !important}`);
  }
  for (const ff of families) {
    vars.push(`--wp--preset--font-family--${ff.slug}:${ff.fontFamily}`);
    classes.push(`.has-${ff.slug}-font-family{font-family:var(--wp--preset--font-family--${ff.slug}) !important}`);
  }
  for (const sp of spacingSizes) vars.push(`--wp--preset--spacing--${sp.slug}:${sp.size}`);

  const st = tj.styles;
  vars.push(
    `--wp--style--global--content-size:${layout.contentSize ?? design.contentSize}`,
    `--wp--style--global--wide-size:${layout.wideSize ?? design.wideSize}`,
    `--wp--style--block-gap:${presetToCss(st.spacing?.blockGap ?? '1.5rem')}`,
    `--wp--style--root--padding-left:${presetToCss(st.spacing?.padding?.left ?? '0px')}`,
    `--wp--style--root--padding-right:${presetToCss(st.spacing?.padding?.right ?? '0px')}`,
    `--wp--style--root--padding-top:0px`,
    `--wp--style--root--padding-bottom:0px`,
  );

  const gap = 'var(--wp--style--block-gap)';
  const el = st.elements ?? {};
  const blocks = (st.blocks ?? {}) as Record<string, any>;
  const css = [
    `:root{${vars.join(';')}}`,
    // Base layout rules WordPress emits for every block theme.
    `:where(body){margin:0}`,
    `.has-global-padding{padding-right:var(--wp--style--root--padding-right);padding-left:var(--wp--style--root--padding-left)}`,
    `.has-global-padding > .alignfull{margin-right:calc(var(--wp--style--root--padding-right) * -1);margin-left:calc(var(--wp--style--root--padding-left) * -1)}`,
    `.has-global-padding :where(:not(.alignfull.is-layout-flow) > .has-global-padding:not(.wp-block-block, .alignfull)){padding-right:0;padding-left:0}`,
    `.has-global-padding :where(:not(.alignfull.is-layout-flow) > .has-global-padding:not(.wp-block-block, .alignfull)) > .alignfull{margin-left:0;margin-right:0}`,
    `:where(.wp-site-blocks) > *{margin-block-start:${gap};margin-block-end:0}`,
    `:where(.wp-site-blocks) > :first-child{margin-block-start:0}`,
    `:root :where(.is-layout-flow) > :first-child, :root :where(.is-layout-constrained) > :first-child{margin-block-start:0}`,
    `:root :where(.is-layout-flow) > :last-child, :root :where(.is-layout-constrained) > :last-child{margin-block-end:0}`,
    `:root :where(.is-layout-flow) > *, :root :where(.is-layout-constrained) > *{margin-block-start:${gap};margin-block-end:0}`,
    `:root :where(.is-layout-flex){gap:${gap}}`,
    `:root :where(.is-layout-grid){gap:${gap}}`,
    `.is-layout-constrained > :where(:not(.alignleft):not(.alignright):not(.alignfull)){max-width:var(--wp--style--global--content-size);margin-left:auto !important;margin-right:auto !important}`,
    `.is-layout-constrained > .alignwide{max-width:var(--wp--style--global--wide-size)}`,
    `body .is-layout-flex{display:flex}`,
    `.is-layout-flex{flex-wrap:wrap;align-items:center}`,
    `.is-layout-flex > :is(*, div){margin:0}`,
    `body .is-layout-grid{display:grid}`,
    `.is-layout-grid > :is(*, div){margin:0}`,
    `.aligncenter{margin-left:auto;margin-right:auto}`,
    // Root styles
    // With useRootPaddingAwareAlignments the root padding becomes CSS vars, not body padding.
    `body{${decls({ ...st, spacing: undefined } as any)}}`,
    `a:where(:not(.wp-element-button)){${decls(el.link as any)};text-decoration:underline;text-underline-offset:.15em}`,
    `a:where(:not(.wp-element-button)):hover{text-decoration:none}`,
    `h1,h2,h3,h4,h5,h6{${decls(el.heading as any)};margin-block-end:0}`,
    ...(['h1', 'h2', 'h3', 'h4'] as const).map((h) => `${h}{${decls((el as any)[h])}}`),
    `.wp-element-button, .wp-block-button__link{${decls(el.button as any)};border-width:0;cursor:pointer;display:inline-block;text-decoration:none;transition:background-color .15s}`,
    `.wp-element-button:hover, .wp-block-button__link:hover{${decls((el.button as any)[':hover'])}}`,
    `.wp-block-button.is-style-outline > .wp-block-button__link:not(.has-background){background:transparent;border:2px solid currentColor;padding:calc(0.8rem - 2px) calc(1.5rem - 2px)}`,
    `.wp-block-button.is-style-outline > .wp-block-button__link:not(.has-text-color){color:var(--wp--preset--color--contrast)}`,
    ...Object.entries(blocks).map(([name, s]) => {
      const cls = `.wp-block-${name.replace('core/', '')}`;
      const linkRule = s.elements?.link ? `${cls} a{${decls(s.elements.link)}}` : '';
      return `${cls}{${decls(s)}}${linkRule}`;
    }),
    `.wp-block-navigation a{text-decoration:none}`,
    `.wp-block-navigation a:hover{text-decoration:underline}`,
    `.wp-block-details summary{cursor:pointer;font-weight:600}`,
    `p{margin-block-start:0}`,
    st.css,
    ...classes,
  ];
  return css.join('\n');
}
