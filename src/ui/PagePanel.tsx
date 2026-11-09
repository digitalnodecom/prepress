import { useEffect, useState } from 'react';
import type { Page } from '../lib/types';
import { HOME_SLUG } from '../lib/wp/templates';
import { pageUrl } from '../lib/wp/render';

interface Props {
  page: Page;
  /** Base URL of the published site ('' = this server), null when there is no server. */
  siteUrl: string | null;
  onUpdate(patch: { title?: string; slug?: string; description?: string }): void;
  /** The site-wide description used when this page has none. */
  fallbackDescription?: string;
}

/** Page settings: title and URL, like the Page tab of the WordPress editor sidebar. */
export function PagePanel({ page, siteUrl, onUpdate, fallbackDescription }: Props) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [description, setDescription] = useState(page.description ?? '');
  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug);
    setDescription(page.description ?? '');
  }, [page.id, page.title, page.slug, page.description]);

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
