import { useEffect, useState } from 'react';
import type { Page } from '../lib/types';
import { HOME_SLUG } from '../lib/wp/templates';
import { pageUrl } from '../lib/wp/render';

interface Props {
  page: Page;
  /** Base URL of the published site ('' = this server), null when there is no server. */
  siteUrl: string | null;
  onUpdate(patch: { title?: string; slug?: string }): void;
}

/** Page settings: title and URL, like the Page tab of the WordPress editor sidebar. */
export function PagePanel({ page, siteUrl, onUpdate }: Props) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug);
  }, [page.id, page.title, page.slug]);

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
