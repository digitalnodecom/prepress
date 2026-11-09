/**
 * What a published page carries besides its content: search & sharing tags,
 * verification and analytics by provider (an id each; Prepress writes the
 * snippet), a cookie banner for the ones that need consent, and the owner's
 * own code. Shared by the static render (render.ts), publish (sitemap, robots),
 * the WordPress export (inc/site-code.php), the settings UI and MCP.
 *
 * Trust: provider ids are validated against strict patterns here and escaped
 * again when rendered, so AI clients may set them. `site.code` is raw HTML by
 * design: only the editor's settings write it, MCP can't, the library never
 * carries it, and the local preview serves published pages sandboxed (an
 * opaque origin, cut off from the editor's API).
 */
import type { ConsentSettings, Integrations, Page, Site, SiteCode, SiteSeo } from './types';
import { HOME_SLUG } from './wp/templates';

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s: unknown, max: number) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const pagePath = (slug: string) => (slug === HOME_SLUG || !slug ? '/' : `/${slug}/`);

export type IntegrationId = keyof Integrations;

export interface IntegrationDef {
  id: IntegrationId;
  label: string;
  kind: 'verification' | 'analytics';
  /** Shown next to the field. */
  hint: string;
  placeholder: string;
  pattern: RegExp;
  /** Sets cookies or tracks across sites: waits for the visitor's consent (EU ePrivacy / GDPR). */
  consent: boolean;
  /** Pull the id out of a pasted snippet, normalize case. */
  extract?: (raw: string) => string;
  /** The tags for <head>; `v` is already validated, and escaped here again anyway. */
  head(v: string): string;
}

const contentAttr = (raw: string) => raw.match(/content\s*=\s*["']([^"']+)["']/i)?.[1] ?? raw;
const js = (v: string) => JSON.stringify(v).replace(/</g, '\\u003c');

export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: 'googleVerification',
    label: 'Google Search Console',
    kind: 'verification',
    hint: 'Search Console → Add property → URL prefix → HTML tag. Paste the tag or just its content value.',
    placeholder: 'content value of google-site-verification',
    pattern: /^[A-Za-z0-9_-]{10,100}$/,
    consent: false,
    extract: contentAttr,
    head: (v) => `<meta name="google-site-verification" content="${esc(v)}">`,
  },
  {
    id: 'bingVerification',
    label: 'Bing Webmaster Tools',
    kind: 'verification',
    hint: 'Add your site → HTML Meta Tag. Paste the tag or its content value.',
    placeholder: 'content value of msvalidate.01',
    pattern: /^[A-Fa-f0-9]{32}$/,
    consent: false,
    extract: (raw) => contentAttr(raw).toUpperCase(),
    head: (v) => `<meta name="msvalidate.01" content="${esc(v)}">`,
  },
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    kind: 'analytics',
    hint: 'Admin → Data streams → your web stream → Measurement ID. Uses cookies: waits for consent.',
    placeholder: 'G-XXXXXXXXXX',
    pattern: /^G-[A-Z0-9]{4,20}$/,
    consent: true,
    extract: (raw) => (raw.match(/G-[A-Za-z0-9]{4,20}/)?.[0] ?? raw).toUpperCase(),
    head: (v) =>
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(v)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${js(v)});</script>`,
  },
  {
    id: 'gtm',
    label: 'Google Tag Manager',
    kind: 'analytics',
    hint: 'The container id at the top of Tag Manager. Waits for consent.',
    placeholder: 'GTM-XXXXXXX',
    pattern: /^GTM-[A-Z0-9]{4,12}$/,
    consent: true,
    extract: (raw) => (raw.match(/GTM-[A-Za-z0-9]{4,12}/)?.[0] ?? raw).toUpperCase(),
    head: (v) =>
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${js(v)});</script>`,
  },
  {
    id: 'plausible',
    label: 'Plausible',
    kind: 'analytics',
    hint: 'The domain you added in Plausible. No cookies: no banner needed.',
    placeholder: 'example.com',
    pattern: /^(?=.{3,253}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/,
    consent: false,
    extract: (raw) => (raw.match(/data-domain\s*=\s*["']([^"']+)/i)?.[1] ?? raw).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    head: (v) => `<script defer data-domain="${esc(v)}" src="https://plausible.io/js/script.js"></script>`,
  },
  {
    id: 'fathom',
    label: 'Fathom',
    kind: 'analytics',
    hint: 'Your site id in Fathom. No cookies: no banner needed.',
    placeholder: 'ABCDEFGH',
    pattern: /^[A-Z]{4,12}$/,
    consent: false,
    extract: (raw) => (raw.match(/data-site\s*=\s*["']([^"']+)/i)?.[1] ?? raw).toUpperCase(),
    head: (v) => `<script src="https://cdn.usefathom.com/script.js" data-site="${esc(v)}" defer></script>`,
  },
  {
    id: 'umami',
    label: 'Umami Cloud',
    kind: 'analytics',
    hint: 'Website id from Umami Cloud (a UUID). No cookies: no banner needed.',
    placeholder: '00000000-0000-0000-0000-000000000000',
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    consent: false,
    extract: (raw) => (raw.match(/data-website-id\s*=\s*["']([^"']+)/i)?.[1] ?? raw).toLowerCase(),
    head: (v) => `<script defer src="https://cloud.umami.is/script.js" data-website-id="${esc(v)}"></script>`,
  },
  {
    id: 'metaPixel',
    label: 'Meta Pixel',
    kind: 'analytics',
    hint: 'Events Manager → your pixel → its id. Uses cookies: waits for consent.',
    placeholder: '123456789012345',
    pattern: /^\d{8,20}$/,
    consent: true,
    extract: (raw) => raw.match(/fbq\(\s*['"]init['"]\s*,\s*['"](\d+)/)?.[1] ?? raw.replace(/\s+/g, ''),
    head: (v) =>
      `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${js(v)});fbq('track','PageView');</script>`,
  },
];

const DEF = Object.fromEntries(INTEGRATIONS.map((d) => [d.id, d])) as Record<IntegrationId, IntegrationDef>;

/** Clean one provider value: '' clears it; a bad one throws a readable message. */
export function cleanIntegration(id: string, raw: unknown): string {
  const def = DEF[id as IntegrationId];
  if (!def) throw new Error(`Unknown integration "${id}"`);
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const v = (def.extract ? def.extract(s) : s).trim();
  if (!def.pattern.test(v)) throw new Error(`${def.label}: that doesn't look like ${def.placeholder.startsWith('content') ? 'a verification code' : `"${def.placeholder}"`}`);
  return v;
}

/** Merge a patch of provider values ('' or null removes one). Throws on the first bad value. */
export function mergeIntegrations(cur: Integrations | undefined, patch: Record<string, unknown>): Integrations | undefined {
  const next: Record<string, string> = { ...(cur ?? {}) };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === undefined) continue;
    const c = cleanIntegration(k, v);
    if (c) next[k] = c;
    else delete next[k];
  }
  return Object.keys(next).length ? (next as Integrations) : undefined;
}

/** Only known providers with valid values survive (anything loaded from a file or older draft). */
export function validIntegrations(i: Integrations | undefined): [IntegrationDef, string][] {
  const out: [IntegrationDef, string][] = [];
  for (const def of INTEGRATIONS) {
    const v = i?.[def.id];
    if (typeof v === 'string' && def.pattern.test(v)) out.push([def, v]);
  }
  return out;
}

const MEDIA = /^(\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]*|https:\/\/[^\s"'<>]+)$/;

/** A public site address: http(s), no credentials, no query; trailing slash dropped. */
export function cleanSiteUrl(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    throw new Error('The site address must be a URL, e.g. https://example.com');
  }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || !u.hostname.includes('.')) throw new Error('The site address must be a public http(s) URL, e.g. https://example.com');
  return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`;
}

/** Merge a patch into the SEO settings ('' / null clears a field). Throws a readable message. */
export function mergeSeo(cur: SiteSeo | undefined, patch: Partial<Record<keyof SiteSeo, unknown>>): SiteSeo | undefined {
  const next: SiteSeo = { ...(cur ?? {}) };
  if (patch.url !== undefined) next.url = cleanSiteUrl(patch.url) || undefined;
  if (patch.description !== undefined) next.description = plain(patch.description, 300) || undefined;
  for (const k of ['image', 'favicon'] as const) {
    if (patch[k] === undefined) continue;
    const v = String(patch[k] ?? '').trim();
    if (v && !MEDIA.test(v)) throw new Error(`${k === 'image' ? 'Social image' : 'Favicon'}: use a media library file (/uploads/…) or an https:// URL`);
    next[k] = v || undefined;
  }
  if (patch.noindex !== undefined) next.noindex = patch.noindex === true || undefined;
  for (const k of Object.keys(next) as (keyof SiteSeo)[]) if (next[k] === undefined) delete next[k];
  return Object.keys(next).length ? next : undefined;
}

export const cleanPageDescription = (raw: unknown) => plain(raw, 300);

export function mergeConsent(cur: ConsentSettings | undefined, patch: Partial<Record<keyof ConsentSettings, unknown>>): ConsentSettings | undefined {
  const next: ConsentSettings = { ...(cur ?? {}) };
  if (patch.mode !== undefined) next.mode = patch.mode === 'off' ? 'off' : undefined;
  if (patch.text !== undefined) next.text = plain(patch.text, 400) || undefined;
  if (patch.accept !== undefined) next.accept = plain(patch.accept, 30) || undefined;
  if (patch.reject !== undefined) next.reject = plain(patch.reject, 30) || undefined;
  for (const k of Object.keys(next) as (keyof ConsentSettings)[]) if (next[k] === undefined) delete next[k];
  return Object.keys(next).length ? next : undefined;
}

export const CODE_MAX = 20_000;
/** The owner's code, size-capped. No other cleaning: it is theirs, and runs as written. */
export function cleanCode(raw: Partial<SiteCode> | undefined): SiteCode | undefined {
  const cut = (s: unknown) => String(s ?? '').replace(/\u0000/g, '').slice(0, CODE_MAX).trim() || undefined;
  const next: SiteCode = { head: cut(raw?.head), bodyEnd: cut(raw?.bodyEnd), needsConsent: raw?.needsConsent === true || undefined };
  for (const k of Object.keys(next) as (keyof SiteCode)[]) if (next[k] === undefined) delete next[k];
  return next.head || next.bodyEnd ? next : undefined;
}

// ---------- rendering ----------

const absolute = (u: string, base?: string) => (u.startsWith('/') && base ? base + u : u);
const iconType = (u: string) => (/\.svg$/i.test(u) ? 'image/svg+xml' : /\.ico$/i.test(u) ? 'image/x-icon' : /\.png$/i.test(u) ? 'image/png' : '');

/** Description, robots, canonical, Open Graph and favicon tags for one page (safe everywhere, preview included). */
export function headMeta(site: Site, page: Page, siteUrl?: string): string {
  const seo = site.seo ?? {};
  const base = (siteUrl ?? seo.url ?? '').replace(/\/+$/, '') || undefined;
  const desc = page.description || seo.description || site.tagline || '';
  const title = page.slug === HOME_SLUG ? site.name : `${page.title} – ${site.name}`;
  const out: string[] = [];
  if (desc) out.push(`<meta name="description" content="${esc(desc)}">`);
  if (seo.noindex) out.push('<meta name="robots" content="noindex">');
  if (base && page.id !== '404') out.push(`<link rel="canonical" href="${esc(base + pagePath(page.slug))}">`);
  out.push(`<meta property="og:type" content="website">`, `<meta property="og:site_name" content="${esc(site.name)}">`, `<meta property="og:title" content="${esc(title)}">`);
  if (desc) out.push(`<meta property="og:description" content="${esc(desc)}">`);
  if (base && page.id !== '404') out.push(`<meta property="og:url" content="${esc(base + pagePath(page.slug))}">`);
  if (seo.image && MEDIA.test(seo.image)) out.push(`<meta property="og:image" content="${esc(absolute(seo.image, base))}">`, '<meta name="twitter:card" content="summary_large_image">');
  if (seo.favicon && MEDIA.test(seo.favicon)) {
    const t = iconType(seo.favicon);
    out.push(`<link rel="icon" href="${esc(seo.favicon)}"${t ? ` type="${t}"` : ''}>`);
  }
  return out.join('\n');
}

/** Does anything on the page wait for consent (so the banner is shown)? */
export function consentNeeded(site: Site): boolean {
  if (site.consent?.mode === 'off') return false;
  return validIntegrations(site.integrations).some(([d]) => d.consent) || !!(site.code?.needsConsent && (site.code.head || site.code.bodyEnd));
}

/** Consent-gated HTML: inert in a <template> until the banner's runtime activates it. */
const gated = (html: string, gate: boolean) => (gate ? `<template data-pp-consent>${html}</template>` : html);

/** The live-only part of <head>: verification, analytics, the owner's head code. */
export function liveHead(site: Site): string {
  const banner = consentNeeded(site);
  const out = validIntegrations(site.integrations).map(([d, v]) => gated(d.head(v), banner && d.consent));
  if (site.code?.head) out.push(gated(site.code.head, banner && !!site.code.needsConsent));
  return out.join('\n');
}

const CONSENT_CSS = `.pp-consent{position:fixed;z-index:100000;left:16px;right:16px;bottom:16px;max-width:600px;margin-inline:auto;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--wp--preset--color--contrast);color:var(--wp--preset--color--base);border-radius:var(--wp--custom--radius--md);font-family:var(--wp--preset--font-family--body);font-size:.9375rem;line-height:1.45;box-shadow:0 8px 30px color-mix(in srgb,var(--wp--preset--color--contrast) 35%,transparent)}.pp-consent[hidden]{display:none}.pp-consent p{margin:0;flex:1 1 240px}.pp-consent-actions{display:flex;gap:8px}.pp-consent button{font:inherit;cursor:pointer;padding:8px 16px;border-radius:var(--wp--custom--radius--pill);border:1px solid currentColor;background:transparent;color:inherit}.pp-consent button[data-pp-choice=yes]{background:var(--wp--preset--color--base);color:var(--wp--preset--color--contrast);border-color:transparent}.pp-consent button:focus-visible{outline:2px solid currentColor;outline-offset:2px}`;

/** Activates gated templates on "yes"; any link to #cookie-settings reopens the banner. Works without storage (asks every visit). */
const CONSENT_JS = `(function(){var K='pp-consent',b=document.getElementById('pp-consent');if(!b)return;function get(){try{return localStorage.getItem(K)}catch(e){return null}}function put(v){try{localStorage.setItem(K,v)}catch(e){}}function load(){document.querySelectorAll('template[data-pp-consent]').forEach(function(t){var f=t.content.cloneNode(true);f.querySelectorAll('script').forEach(function(o){var n=document.createElement('script');for(var i=0;i<o.attributes.length;i++)n.setAttribute(o.attributes[i].name,o.attributes[i].value);n.text=o.text;o.replaceWith(n)});t.replaceWith(f)})}b.addEventListener('click',function(e){var a=e.target.closest('[data-pp-choice]');if(!a)return;var v=a.getAttribute('data-pp-choice'),was=get();put(v);b.hidden=true;if(v==='yes'&&was!=='yes')load();else if(v==='no'&&was==='yes')location.reload()});document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href="#cookie-settings"]');if(a){e.preventDefault();b.hidden=false}});var c=get();if(c==='yes')load();else if(c!=='no')b.hidden=false})();`;

/** The live-only end of <body>: the owner's body code, then the cookie banner. */
export function liveBodyEnd(site: Site): string {
  const banner = consentNeeded(site);
  const out: string[] = [];
  if (site.code?.bodyEnd) out.push(gated(site.code.bodyEnd, banner && !!site.code.needsConsent));
  if (banner) {
    const c = site.consent ?? {};
    out.push(
      `<div id="pp-consent" class="pp-consent" role="region" aria-label="Cookies" hidden><p>${esc(c.text || 'This site would like to use cookies to understand how it is used. Is that all right?')}</p><div class="pp-consent-actions"><button type="button" data-pp-choice="no">${esc(c.reject || 'No, thanks')}</button><button type="button" data-pp-choice="yes">${esc(c.accept || 'Accept')}</button></div></div>`,
      `<style id="pp-consent-css">${CONSENT_CSS}</style>`,
      `<script>${CONSENT_JS}</script>`,
    );
  }
  return out.join('\n');
}

// ---------- sitemap / robots ----------

export function sitemapXml(site: Site, siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  const urls = site.pages.map((p) => `<url><loc>${esc(base + pagePath(p.slug))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt(site: Site, siteUrl?: string): string {
  if (site.seo?.noindex) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl.replace(/\/+$/, '')}/sitemap.xml\n` : ''}`;
}
