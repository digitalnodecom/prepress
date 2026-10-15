import { useEffect, useState } from 'react';
import type { Site } from '../lib/types';
import { HOME_SLUG } from '../lib/wp/templates';
import { pageUrl } from '../lib/wp/render';
import { blockUsage } from '../lib/site';
import { McpPanel } from './McpPanel';
import { DeployPanel } from './DeployPanel';

interface Props {
  site: Site;
  brief: string;
  aiReady: boolean;
  busy: string | null;
  validation: { blocks: number; invalid: number; byName: Record<string, number> } | null;
  onRename(name: string, tagline: string): void;
  onAddPage(title: string, purpose: string): void;
  onRemovePage(id: string): void;
  onImport(data: unknown): void;
  onLoadSample(): void;
  onSignOut?(): void;
  serverMode?: boolean;
  /** Something has been published (deploy needs it). */
  published?: boolean;
  onEditPattern?(id: number): void;
  onDeletePattern?(id: number): void;
  onDeleteBlock?(name: string): void;
}

export function SitePanel(p: Props) {
  const [name, setName] = useState(p.site.name);
  const [tagline, setTagline] = useState(p.site.tagline);
  const [newTitle, setNewTitle] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    setName(p.site.name);
    setTagline(p.site.tagline);
  }, [p.site.name, p.site.tagline]);

  const commit = () => {
    if (name.trim() && (name !== p.site.name || tagline !== p.site.tagline)) p.onRename(name.trim(), tagline.trim());
  };

  const byName = Object.entries(p.validation?.byName ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="field">
        <label htmlFor="site-name">Site title</label>
        <input id="site-name" className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
      </div>
      <div className="field">
        <label htmlFor="site-tagline">Tagline</label>
        <input id="site-tagline" className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
      </div>
      <p className="hint">Rendered by the dynamic <span className="mono">core/site-title</span> and <span className="mono">core/site-tagline</span> blocks, so they follow your WordPress settings after export.</p>

      <hr className="sep" />
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
        <input id="new-page-purpose" className="input" placeholder={p.aiReady ? 'What should it cover? (optional)' : 'Without AI the page starts empty'} value={newPurpose} disabled={!p.aiReady} onChange={(e) => setNewPurpose(e.target.value)} />
        <div className="row end">
          <button
            className="btn small"
            disabled={!newTitle.trim() || !!p.busy}
            onClick={() => {
              p.onAddPage(newTitle.trim(), newPurpose.trim());
              setNewTitle('');
              setNewPurpose('');
            }}
          >
            {p.aiReady ? 'Add & write page' : 'Add page'}
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

      {p.serverMode && (
        <>
          <hr className="sep" />
          <DeployPanel published={!!p.published} />
          <hr className="sep" />
          <McpPanel />
        </>
      )}

      <hr className="sep" />
      <span className="eyebrow">Blocks used</span>
      <div className="stats">
        {byName.map(([n, c]) => (
          <span key={n} className="pill neutral">{n.replace('core/', '')} ×{c}</span>
        ))}
      </div>
      <p className="hint">
        {p.validation?.invalid
          ? `${p.validation.invalid} blocks fail WordPress validation.`
          : `All ${p.validation?.blocks ?? 0} blocks pass the same validator the WordPress editor runs on load.`}
      </p>

      <hr className="sep" />
      <span className="eyebrow">Project</span>
      <div className="row">
        <label className="btn small" htmlFor="import-site" style={{ cursor: 'pointer' }}>
          Open site.json…
        </label>
        <input
          id="import-site"
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              p.onImport(JSON.parse(await f.text()));
            } catch {
              p.onImport(null);
            }
          }}
        />
        <button className="btn small ghost" onClick={p.onLoadSample} disabled={!!p.busy}>Reload sample site</button>
        {p.onSignOut && <button className="btn small ghost" onClick={p.onSignOut}>Sign out</button>}
      </div>
      <p className="hint">The export includes <span className="mono">site.json</span>, so you can reopen a site here later.</p>
      {p.brief && (
        <details>
          <summary className="hint" style={{ cursor: 'pointer' }}>Brief used for AI</summary>
          <p className="hint" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.brief}</p>
        </details>
      )}
    </>
  );
}
