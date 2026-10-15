/**
 * Renders a whole site to static documents: { slug: html } plus a 404 page.
 * Shared by the server (headless publish) and anything else that needs the files.
 */
import type { BlockNode, Page, Site } from './types';
import { renderPage } from './wp/render';
import { toMarkup } from './wp/markup';
import { normalizeBlocks } from './wp/normalize';
import { HOME_SLUG } from './wp/templates';

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

export function publishFiles(site: Site): { pages: Record<string, string>; notFound: string } {
  const pages: Record<string, string> = {};
  for (const p of site.pages) pages[p.slug || HOME_SLUG] = renderPage(site, p);
  return { pages, notFound: renderPage(site, notFoundPage(site)) };
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

