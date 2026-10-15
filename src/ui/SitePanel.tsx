import { useState } from 'react';
import type { Site } from '../lib/types';
import { HOME_SLUG } from '../lib/wp/templates';
import { pageUrl } from '../lib/wp/render';
import { blockUsage } from '../lib/site';

interface Props {
  site: Site;
  busy: string | null;
  onAddPage(title: string): void;
  onRemovePage(id: string): void;
  onEditPattern?(id: number): void;
  onDeletePattern?(id: number): void;
  onDeleteBlock?(name: string): void;
}

/** Sidebar → Pages: the site's pages, its own block types and patterns. Settings (gear) holds the rest. */
export function SitePanel(p: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <>
      <span className="eyebrow">Pages</span>
      <div className="pages-list">
        {p.site.pages.map((pg) => (
          <div key={pg.id} className="page-row">
            <span className="section-name">{pg.title}</span>
            <span className="mono">{pageUrl(pg.slug)}</span>
            {pg.slug === HOME_SLUG ? (
              <span className="pill neutral" style={{ fontSize: 11 }}>Front page</span>
            ) : confirm === pg.id ? (
              <button className="btn small danger" onClick={() => { p.onRemovePage(pg.id); setConfirm(null); }}>Confirm</button>
            ) : (
              <button className="btn ghost small danger" onClick={() => setConfirm(pg.id)}>Remove</button>
            )}
          </div>
        ))}
      </div>
      <div className="add-box">
        <label className="eyebrow" htmlFor="new-page-title">Add a page</label>
        <input id="new-page-title" className="input" placeholder="Title, e.g. Pricing" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <div className="row end">
          <button
            className="btn small"
            disabled={!newTitle.trim() || !!p.busy}
            onClick={() => {
              p.onAddPage(newTitle.trim());
              setNewTitle('');
            }}
          >
            Add page
          </button>
        </div>
      </div>

      <hr className="sep" />
      <span className="eyebrow">Site blocks</span>
      {(p.site.blocks ?? []).length ? (
        <div className="pages-list">
          {(p.site.blocks ?? []).map((b) => {
            const used = blockUsage(p.site, b.name);
            return (
              <div key={b.name} className="page-row">
                <span className="section-name" title={b.description}>{b.title}</span>
                <span className="mono">{used.length ? `${used.length}× used` : 'unused'}</span>
                {confirm === b.name ? (
                  <button className="btn small danger" onClick={() => { p.onDeleteBlock?.(b.name); setConfirm(null); }}>{used.length ? 'Delete + uses' : 'Confirm'}</button>
                ) : (
                  <button className="btn ghost small danger" onClick={() => setConfirm(b.name)}>Delete</button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="hint">No custom blocks yet. An AI connected over MCP can create them (they appear in the inserter and ship inside the WordPress theme).</p>
      )}

      <span className="eyebrow">Patterns</span>
      {(p.site.patterns ?? []).length ? (
        <div className="pages-list">
          {(p.site.patterns ?? []).map((pt) => (
            <div key={pt.id} className="page-row">
              <span className="section-name">{pt.title}</span>
              <span className="mono">{pt.synced ? 'synced' : 'pattern'}</span>
              <span className="row" style={{ gap: 4 }}>
                <button className="btn ghost small" onClick={() => p.onEditPattern?.(pt.id)}>Edit</button>
                {confirm === `pattern:${pt.id}` ? (
                  <button className="btn small danger" onClick={() => { p.onDeletePattern?.(pt.id); setConfirm(null); }}>Confirm</button>
                ) : (
                  <button className="btn ghost small danger" onClick={() => setConfirm(`pattern:${pt.id}`)}>Delete</button>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">No patterns yet. Patterns are reusable sections; synced ones update everywhere they're used.</p>
      )}

    </>
  );
}
