import { useEffect, useState } from 'react';
import { Bot, CloudUpload, Code, Database, Globe, Search, X } from 'lucide-react';
import type { Site } from '../lib/types';
import { DeployPanel } from './DeployPanel';
import { McpPanel } from './McpPanel';
import { SearchPanel, TrackingPanel } from './SiteMetaPanels';

export type SettingsSection = 'general' | 'search' | 'tracking' | 'publishing' | 'ai' | 'data';

interface Props {
  site: Site;
  brief: string;
  busy: string | null;
  validation: { blocks: number; invalid: number; byName: Record<string, number> } | null;
  /** Running on the Prepress server (publishing and MCP need it). */
  serverMode: boolean;
  published: boolean;
  initial?: SettingsSection;
  onRename(name: string, tagline: string): void;
  /** Change site settings (search & sharing, analytics, cookie banner, custom code). */
  onSite(update: (s: Site) => Site): void;
  onBrief(brief: string): void;
  onImport(data: unknown): void;
  onLoadSample(): void;
  onClose(): void;
}

const SECTIONS: { id: SettingsSection; label: string; icon: typeof Globe; server?: boolean }[] = [
  { id: 'general', label: 'Site', icon: Globe },
  { id: 'search', label: 'Search & sharing', icon: Search },
  { id: 'tracking', label: 'Analytics & code', icon: Code },
  { id: 'publishing', label: 'Publishing', icon: CloudUpload, server: true },
  { id: 'ai', label: 'AI connection', icon: Bot, server: true },
  { id: 'data', label: 'Data', icon: Database },
];

/** Site-wide settings that aren't page editing: identity, where it publishes, AI access, data. */
export function SettingsDialog(p: Props) {
  const sections = SECTIONS.filter((s) => !s.server || p.serverMode);
  const [section, setSection] = useState<SettingsSection>(sections.some((s) => s.id === p.initial) ? p.initial! : 'general');
  const [name, setName] = useState(p.site.name);
  const [tagline, setTagline] = useState(p.site.tagline);

  useEffect(() => {
    setName(p.site.name);
    setTagline(p.site.tagline);
  }, [p.site.name, p.site.tagline]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && p.onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [p.onClose]);

  const commit = () => {
    if (name.trim() && (name !== p.site.name || tagline !== p.site.tagline)) p.onRename(name.trim(), tagline.trim());
  };
  const byName = Object.entries(p.validation?.byName ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && p.onClose()}>
      <div className="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <nav className="settings-nav" aria-label="Settings">
          <h2 id="settings-title">Settings</h2>
          {sections.map((s) => (
            <button key={s.id} className={`settings-tab${section === s.id ? ' on' : ''}`} aria-current={section === s.id ? 'page' : undefined} onClick={() => setSection(s.id)}>
              <s.icon size={16} /> {s.label}
            </button>
          ))}
        </nav>
        <div className="settings-body">
          <button className="btn ghost small icon-only settings-close" onClick={p.onClose} aria-label="Close settings"><X size={16} /></button>

          {section === 'general' && (
            <>
              <h3>Site</h3>
              <div className="field">
                <label htmlFor="set-site-name">Site title</label>
                <input id="set-site-name" className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
              </div>
              <div className="field">
                <label htmlFor="set-site-tagline">Tagline</label>
                <input id="set-site-tagline" className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
              </div>
              <p className="hint">Shown by the site title and tagline blocks in the header and footer; they follow your WordPress settings after export.</p>
              <div className="field">
                <label htmlFor="site-brief">Site brief</label>
                <textarea id="site-brief" className="textarea" rows={5} value={p.brief} placeholder="What the site is for, who it’s for, the tone, what visitors should do." onChange={(e) => p.onBrief(e.target.value)} />
                <p className="hint">AI clients connected over MCP read this to write in the site’s voice (and can update it).</p>
              </div>
            </>
          )}

          {section === 'search' && <SearchPanel site={p.site} serverMode={p.serverMode} onSite={p.onSite} />}
          {section === 'tracking' && <TrackingPanel site={p.site} onSite={p.onSite} />}

          {section === 'publishing' && (
            <>
              <h3>Publishing</h3>
              <DeployPanel published={p.published} />
            </>
          )}

          {section === 'ai' && (
            <>
              <h3>AI connection</h3>
              <McpPanel />
            </>
          )}

          {section === 'data' && (
            <>
              <h3>Data</h3>
              <span className="eyebrow">Open or reset</span>
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
                <button className="btn small ghost" onClick={p.onLoadSample} disabled={!!p.busy}>Load the sample site</button>
              </div>
              <p className="hint">Every WordPress export includes <span className="mono">site.json</span>, so a site can be reopened here later.</p>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
