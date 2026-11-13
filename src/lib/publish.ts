/**
 * Renders a whole site to static documents: { slug: html } plus a 404 page.
 * Shared by the server (headless publish) and anything else that needs the files.
 */
import type { BlockNode, Page, Site } from './types';
import { renderPage } from './wp/render';
import { toMarkup } from './wp/markup';
import { normalizeBlocks } from './wp/normalize';
import { HOME_SLUG } from './wp/templates';
import { SOURCE_FILE, robotsTxt, sitemapXml, sourceJson } from './siteMeta';

function notFoundPage(site: Site): Page {
  const nodes: BlockNode[] = [
    {
      name: 'core/group',
      attributes: {
        align: 'full',
        layout: { type: 'constrained' },
        style: { spacing: { padding: { top: 'var:preset|spacing|80', bottom: 'var:preset|spacing|80' } } },
      },
      innerBlocks: [
        { name: 'core/heading', attributes: { level: 1, content: 'Page not found' } },
        { name: 'core/paragraph', attributes: { content: 'The page you are looking for does not exist. <a href="/">Go to the home page</a>.' } },
      ],
    },
  ];
  return { id: '404', title: 'Page not found', slug: '404', content: toMarkup(normalizeBlocks(nodes, { design: site.design })) };
}

/**
 * The published files: pages, the 404 page and `files` (robots.txt, prepress.json, and
 * sitemap.xml when the site's address is known). `siteUrl` is used when
 * site.seo.url is empty (the server passes its first publish target's URL).
 */
export function publishFiles(site: Site, opts: { siteUrl?: string; generator?: string } = {}): { pages: Record<string, string>; notFound: string; files: Record<string, string> } {
  const siteUrl = site.seo?.url || opts.siteUrl || undefined;
  const pages: Record<string, string> = {};
  for (const p of site.pages) pages[p.slug || HOME_SLUG] = renderPage(site, p, { live: true, siteUrl });
  // robots.txt, sitemap.xml and prepress.json, the site's public source (siteMeta.publicSite).
  const files: Record<string, string> = { 'robots.txt': robotsTxt(site, siteUrl), [SOURCE_FILE]: sourceJson(site, opts.generator) };
  if (siteUrl) files['sitemap.xml'] = sitemapXml(site, siteUrl);
  return { pages, notFound: renderPage(site, notFoundPage(site), { live: true, siteUrl }), files };
}

/** Cheap stable hash (FNV-1a) of the site, to tell whether there are unpublished changes. */
export function siteHash(site: Site): string {
  const s = JSON.stringify(site);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

