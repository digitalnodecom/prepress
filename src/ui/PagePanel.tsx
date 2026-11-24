import { useEffect, useState } from 'react';
import type { Page } from '../lib/types';
import { HOME_SLUG } from '../lib/wp/templates';
import { pageUrl } from '../lib/wp/render';

interface Props {
  page: Page;
  /** Base URL of the published site ('' = this server), null when there is no server. */
  siteUrl: string | null;
  onUpdate(patch: { title?: string; slug?: string; description?: string; seoTitle?: string }): void;
  /** The site-wide description used when this page has none. */
  fallbackDescription?: string;
  /** The document title used when this page has no SEO title of its own. */
  defaultTitle?: string;
}

/** Page settings: title and URL, like the Page tab of the WordPress editor sidebar. */
export function PagePanel({ page, siteUrl, onUpdate, fallbackDescription, defaultTitle }: Props) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [description, setDescription] = useState(page.description ?? '');
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? '');
  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug);
    setDescription(page.description ?? '');
    setSeoTitle(page.seoTitle ?? '');
  }, [page.id, page.title, page.slug, page.description, page.seoTitle]);

  const home = page.slug === HOME_SLUG;
  const commit = () => {
    if (title.trim() !== page.title || (!home && slug !== page.slug)) onUpdate({ title, slug: home ? undefined : slug });
  };

  return (
    <>
      <div className="field">
        <label htmlFor="page-title">Title</label>
        <input id="page-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
      </div>
      <div className="field">
        <label htmlFor="page-slug">URL</label>
        {home ? (
          <p className="hint">This is the front page, served at <span className="mono">/</span>.</p>
        ) : (
          <input id="page-slug" className="input mono" value={slug} onChange={(e) => setSlug(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
        )}
      </div>
      <div className="field">
        <label htmlFor="page-seo-title">Title in search results</label>
        <input
          id="page-seo-title"
          className="input"
          maxLength={120}
          value={seoTitle}
          placeholder={defaultTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          onBlur={() => seoTitle !== (page.seoTitle ?? '') && onUpdate({ seoTitle })}
          onKeyDown={(e) => e.key === 'Enter' && seoTitle !== (page.seoTitle ?? '') && onUpdate({ seoTitle })}
        />
        <p className="hint">{seoTitle.length > 60 ? `${seoTitle.length} characters: search engines usually show about 60.` : 'The browser tab, search results and link previews. Empty: the one shown.'}</p>
      </div>
      <div className="field">
        <label htmlFor="page-description">Description</label>
        <textarea
          id="page-description"
          className="textarea"
          rows={3}
          maxLength={300}
          value={description}
          placeholder={fallbackDescription || 'One or two sentences for search results and link previews.'}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (page.description ?? '') && onUpdate({ description })}
        />
        <p className="hint">{description.length > 160 ? `${description.length} characters: search engines usually show about 160.` : 'Shown in search results and link previews. Empty: the site description.'}</p>
      </div>
      {siteUrl !== null && (
        <p className="hint">
          Live at{' '}
          <a href={siteUrl + pageUrl(page.slug)} target="_blank" rel="noreferrer" className="mono">
            {(siteUrl || '') + pageUrl(page.slug)}
          </a>{' '}
          after you publish.
        </p>
      )}
      <p className="hint">The menu in the header and footer updates automatically when pages are renamed, added or removed.</p>
    </>
  );
}
