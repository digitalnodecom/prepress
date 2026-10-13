import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Design, Site } from '../lib/types';
import { TARGET_WP_VERSION } from '../lib/types';
import { detectAI, friendlyError, type AI } from '../lib/ai/client';
import { generateSite, editSection, newSection, writePage } from '../lib/ai/generate';
import { DEMO_BRIEF } from '../lib/ai/demo';
import {
  addPage, applyDesign, getSections, insertSection, moveSection, rebuildParts, removePage, removeSection,
  replaceSection, setPageContent,
} from '../lib/site';
import { validateMarkup } from '../lib/wp/markup';
import { renderPage } from '../lib/wp/render';
import { exportSite } from '../lib/wp/export';
import { Preview, type Device } from './Preview';
import { SectionsPanel } from './SectionsPanel';
import { DesignPanel } from './DesignPanel';
import { SitePanel } from './SitePanel';
import { MarkupView } from './MarkupView';
import { NewSiteDialog } from './NewSiteDialog';
import { Logo } from './icons';

type View = 'preview' | 'markup';
type Tab = 'sections' | 'design' | 'site';
type PageStatus = 'writing' | 'error' | undefined;

const STORAGE_KEY = 'blockwright:draft:v1';

function loadDraft(): { site: Site; brief: string; isSample: boolean } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d?.site?.pages ? d : null;
  } catch {
    return null;
  }
}

function saveDraft(d: { site: Site; brief: string; isSample: boolean }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable: the session still works */
  }
}

export function App() {
  const [ai, setAi] = useState<AI | null>(null);
  const [site, setSiteState] = useState<Site | null>(null);
  const [brief, setBrief] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [pageId, setPageId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<Record<string, PageStatus>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<View>('preview');
  const [tab, setTab] = useState<Tab>('sections');
  const [device, setDevice] = useState<Device>('desktop');
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);

  // Undo history of whole-site snapshots (markup strings are cheap to keep).
  const past = useRef<Site[]>([]);
  const future = useRef<Site[]>([]);
  const [, force] = useState(0);
  const siteRef = useRef<Site | null>(null);
  siteRef.current = site;

  const setSite = useCallback((next: Site | ((s: Site) => Site), opts: { record?: boolean } = {}) => {
    setSiteState((prev) => {
      const value = typeof next === 'function' ? (prev ? (next as (s: Site) => Site)(prev) : prev) : next;
      if (prev && value && value !== prev && opts.record !== false) {
        past.current.push(prev);
        if (past.current.length > 40) past.current.shift();
        future.current = [];
        force((n) => n + 1);
      }
      return value;
    });
  }, []);

  const undo = () => {
    const prev = past.current.pop();
    if (!prev || !site) return;
    future.current.push(site);
    setSiteState(prev);
    force((n) => n + 1);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next || !site) return;
    past.current.push(site);
    setSiteState(next);
    force((n) => n + 1);
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  };

  // ---------- boot ----------
  const loadSample = useCallback(async () => {
    const demo = { kind: 'demo' as const, json: async () => ({}) as never };
    let s: Site | null = null;
    await generateSite(demo, DEMO_BRIEF, {
      onPlan: (x) => (s = x),
      onPage: (id, markup) => (s = setPageContent(s!, id, markup)),
    });
    past.current = [];
    future.current = [];
    setSiteState(s);
    setBrief(DEMO_BRIEF);
    setIsSample(true);
    setPageId(s!.pages[0].id);
    setSelected(null);
    setStatus({});
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setSiteState(draft.site);
      setBrief(draft.brief);
      setIsSample(draft.isSample);
      setPageId(draft.site.pages[0]?.id ?? null);
    } else {
      void loadSample();
    }
    detectAI().then(setAi);
  }, [loadSample]);

  useEffect(() => {
    if (site && !busy) saveDraft({ site, brief, isSample });
  }, [site, brief, isSample, busy]);

  const page = site?.pages.find((p) => p.id === pageId) ?? site?.pages[0] ?? null;
  const sections = useMemo(() => (page ? getSections(page) : []), [page]);

  // ---------- derived ----------
  const validation = useMemo(() => {
    if (!site) return null;
    let blocks = 0;
    let invalid = 0;
    const byName: Record<string, number> = {};
    for (const m of [...site.pages.map((p) => p.content), site.header, site.footer]) {
      const v = validateMarkup(m);
      blocks += v.blocks;
      invalid += v.invalid.length;
      for (const [k, n] of Object.entries(v.byName)) byName[k] = (byName[k] ?? 0) + n;
    }
    return { blocks, invalid, byName };
  }, [site]);

  const html = useMemo(() => (site && page ? renderPage(site, page, { markSections: true, interactive: true }) : ''), [site, page]);

  // ---------- actions ----------
  const run = async (label: string, fn: (signal: AbortSignal) => Promise<void>) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setBusy(label);
    setError(null);
    try {
      await fn(c.signal);
    } catch (e) {
      if ((e as any)?.code !== 'cancelled') setError(friendlyError(e));
    } finally {
      if (ctl.current === c) {
        setBusy(null);
        ctl.current = null;
      }
    }
  };

  const stop = () => ctl.current?.abort();

  const generate = (text: string) => {
    if (!ai || ai.kind === 'demo') return;
    setDialog(false);
    setBrief(text);
    run('Planning your site', async (signal) => {
      await generateSite(ai, text, {
        signal,
        onPlan: (s) => {
          past.current = [];
          future.current = [];
          setSiteState(s);
          setIsSample(false);
          setPageId(s.pages[0].id);
          setSelected(null);
          setStatus(Object.fromEntries(s.pages.map((p) => [p.id, 'writing' as PageStatus])));
          setBusy('Writing pages');
        },
        onPage: (id, markup) => {
          setSiteState((s) => (s ? setPageContent(s, id, markup) : s));
          setStatus((st) => ({ ...st, [id]: undefined }));
        },
        onPageError: (id, e) => {
          setStatus((st) => ({ ...st, [id]: 'error' }));
          setError(friendlyError(e));
        },
      });
    });
  };

  const retryPage = (id: string) => {
    if (!ai || !site) return;
    const p = site.pages.find((x) => x.id === id)!;
    setStatus((st) => ({ ...st, [id]: 'writing' }));
    run(`Writing “${p.title}”`, async (signal) => {
      try {
        const { markup } = await writePage(ai, siteRef.current!, brief, id, '', signal);
        setSite((s) => setPageContent(s, id, markup));
        setStatus((st) => ({ ...st, [id]: undefined }));
      } catch (e) {
        setStatus((st) => ({ ...st, [id]: 'error' }));
        throw e;
      }
    });
  };

  const onEditSection = (index: number, instruction: string) => {
    if (!ai || !site || !page) return;
    run('Editing section', async (signal) => {
      const { markup } = await editSection(ai, site, brief, page.id, index, instruction, signal);
      if (!markup.trim()) throw new Error('Claude returned an empty section. Try rephrasing.');
      setSite((s) => replaceSection(s, page.id, index, markup));
      flash('Section updated');
    });
  };

  const onAddSection = (after: number, instruction: string) => {
    if (!ai || !site || !page) return;
    run('Adding section', async (signal) => {
      const { markup } = await newSection(ai, site, brief, page.id, instruction, signal);
      if (!markup.trim()) throw new Error('Claude returned an empty section. Try rephrasing.');
      setSite((s) => insertSection(s, page.id, after + 1, markup));
      setSelected(after + 1);
      flash('Section added');
    });
  };

  const onAddPage = (title: string, purpose: string) => {
    if (!site) return;
    const { site: next, page: p } = addPage(site, title);
    setSite(next);
    setPageId(p.id);
    setSelected(null);
    if (ai && ai.kind !== 'demo') {
      setStatus((st) => ({ ...st, [p.id]: 'writing' }));
      run(`Writing “${title}”`, async (signal) => {
        try {
          const { markup } = await writePage(ai, next, brief, p.id, purpose, signal);
          setSite((s) => setPageContent(s, p.id, markup));
          setStatus((st) => ({ ...st, [p.id]: undefined }));
        } catch (e) {
          setStatus((st) => ({ ...st, [p.id]: 'error' }));
          throw e;
        }
      });
    }
  };

  const designTimer = useRef<number | undefined>(undefined);
  const onDesign = (d: Design) => {
    window.clearTimeout(designTimer.current);
    designTimer.current = window.setTimeout(() => setSite((s) => applyDesign(s, d)), 120);
  };

  const onExport = async () => {
    if (!site) return;
    setBusy('Packaging export');
    try {
      const res = await exportSite(site);
      const downloads = window.claude ? await window.claude.use('downloads').catch(() => null) : null;
      if (downloads) {
        try {
          await downloads.save({ filename: res.filename, data: res.blob });
          flash(`Exported ${res.stats.pages} pages · ${res.stats.blocks} blocks · ${res.stats.invalid} invalid`);
        } catch (e: any) {
          if (e?.code !== 'declined') setError('The download could not be saved here. ' + (e?.message ?? ''));
        }
      } else {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        flash(`Exported ${res.stats.pages} pages · ${res.stats.blocks} blocks · ${res.stats.invalid} invalid`);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const onImport = (data: unknown) => {
    const s = (data as any)?.site ?? data;
    if (!s?.pages?.length || !s?.design) {
      setError('That file is not a Blockwright site.json.');
      return;
    }
    past.current = [];
    future.current = [];
    setSiteState(rebuildParts(s));
    setIsSample(false);
    setPageId(s.pages[0].id);
    setSelected(null);
    flash(`Opened ${s.name}`);
  };

  const navigate = (href: string) => {
    if (!site) return;
    const slug = href.replace(/^\/|\/$/g, '') || 'home';
    const p = site.pages.find((x) => x.slug === slug);
    if (p) {
      setPageId(p.id);
      setSelected(null);
    }
  };

  // keyboard: undo / redo
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const aiReady = !!ai && ai.kind !== 'demo';
  const pageStatus = page ? status[page.id] : undefined;

  if (!site || !page) {
    return (
      <div className="pending" style={{ height: '100%' }}>
        <div>
          <span className="spin" style={{ display: 'inline-block' }} />
          <h3>Loading the block library…</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="bar">
        <div className="wordmark">
          <Logo />
          <span>Blockwright</span>
        </div>
        <nav className="bar-pages" aria-label="Pages">
          {site.pages.map((p) => (
            <button
              key={p.id}
              className="page-tab"
              aria-current={p.id === page.id ? 'page' : undefined}
              onClick={() => {
                setPageId(p.id);
                setSelected(null);
              }}
            >
              {status[p.id] === 'writing' && <span className="spin" />}
              {status[p.id] === 'error' && <span className="dot" style={{ color: 'var(--bad)' }} />}
              {p.title}
            </button>
          ))}
        </nav>
        <div className="bar-right">
          <button className="btn ghost icon-btn hide-narrow" onClick={undo} disabled={!past.current.length} aria-label="Undo" title="Undo (⌘Z)">
            ↶
          </button>
          <button className="btn ghost icon-btn hide-narrow" onClick={redo} disabled={!future.current.length} aria-label="Redo" title="Redo (⇧⌘Z)">
            ↷
          </button>
          <button className="btn" onClick={() => setDialog(true)} disabled={!!busy}>
            New site
          </button>
          <button className="btn primary" onClick={onExport} disabled={!!busy}>
            <span>
              Export<span className="long-label"> to WordPress</span>
            </span>
          </button>
        </div>
      </header>

      <div className="main">
        <aside className="rail">
          <div className="rail-tabs" role="tablist">
            {(['sections', 'design', 'site'] as Tab[]).map((t) => (
              <button key={t} role="tab" className="rail-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === 'sections' ? 'Sections' : t === 'design' ? 'Styles' : 'Site'}
              </button>
            ))}
          </div>
          <div className="rail-body">
            {isSample && (
              <div className="banner">
                <div>
                  <strong>This is a sample site.</strong>
                  Click any section to edit it, change the styles, or export it. Describe your own business with <em>New site</em>.
                </div>
              </div>
            )}
            {ai?.kind === 'demo' && (
              <div className="banner warn">
                <div>
                  <strong>AI is off here.</strong>
                  Open this builder as a Claude artifact, or run it locally with an Anthropic API key, to generate and edit with AI. Styles, reordering and export still work.
                </div>
              </div>
            )}
            {error && (
              <div className="banner warn" role="alert">
                <div className="grow">
                  <strong>That didn’t work</strong>
                  {error}
                </div>
                <button className="btn ghost small" onClick={() => setError(null)} aria-label="Dismiss">
                  ✕
                </button>
              </div>
            )}
            {tab === 'sections' && (
              <SectionsPanel
                sections={sections}
                selected={selected}
                aiReady={aiReady}
                busy={busy}
                pageStatus={pageStatus}
                onSelect={setSelected}
                onEdit={onEditSection}
                onAdd={onAddSection}
                onMove={(i, dir) => {
                  setSite((s) => moveSection(s, page.id, i, dir));
                  setSelected(i + dir);
                }}
                onRemove={(i) => {
                  setSite((s) => removeSection(s, page.id, i));
                  setSelected(null);
                }}
                onRetry={() => retryPage(page.id)}
              />
            )}
            {tab === 'design' && <DesignPanel design={site.design} onChange={onDesign} />}
            {tab === 'site' && (
              <SitePanel
                site={site}
                brief={brief}
                aiReady={aiReady}
                busy={busy}
                onRename={(name, tagline) => setSite((s) => rebuildParts({ ...s, name, tagline }))}
                onAddPage={onAddPage}
                onRemovePage={(id) => {
                  setSite((s) => removePage(s, id));
                  if (id === page.id) setPageId(site.pages[0].id);
                }}
                onImport={onImport}
                onLoadSample={() => void loadSample()}
                validation={validation}
              />
            )}
          </div>
        </aside>

        <section className="canvas" aria-label="Canvas">
          <div className="canvas-bar">
            <div className="seg" role="group" aria-label="View">
              <button aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Preview</button>
              <button aria-pressed={view === 'markup'} onClick={() => setView('markup')}>Block markup</button>
            </div>
            {view === 'preview' && (
              <div className="seg hide-narrow" role="group" aria-label="Device">
                {(['desktop', 'tablet', 'phone'] as Device[]).map((d) => (
                  <button key={d} aria-pressed={device === d} onClick={() => setDevice(d)}>
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <div className="grow" />
            {busy && (
              <span className="pill accent" role="status">
                <span className="spin" /> {busy}…
                {ctl.current && (
                  <button className="btn ghost small" onClick={stop} style={{ marginLeft: 4, minHeight: 20, padding: '0 6px' }}>
                    Stop
                  </button>
                )}
              </span>
            )}
            {!busy && aiReady && <span className="pill neutral hide-narrow"><span className="dot" style={{ color: 'var(--ok)' }} /> {ai?.kind === 'claude' ? 'Claude connected' : 'Local AI proxy'}</span>}
            {validation && (
              <span className={`pill ${validation.invalid ? 'bad' : 'ok'}`} title="Every block parsed with WordPress’s own block validator">
                <span className="dot" />
                WP {TARGET_WP_VERSION} · {validation.blocks} blocks · {validation.invalid ? `${validation.invalid} invalid` : 'all valid'}
              </span>
            )}
          </div>
          <div className="canvas-stage">
            {view === 'preview' ? (
              pageStatus === 'writing' && !page.content ? (
                <div className="pending">
                  <div>
                    <span className="spin" style={{ display: 'inline-block', color: 'var(--accent)' }} />
                    <h3>Writing “{page.title}”</h3>
                    <p className="hint">Choosing patterns and writing copy. Other pages appear as they finish.</p>
                  </div>
                </div>
              ) : (
                <Preview html={html} device={device} selected={selected} onSelect={(i) => { setSelected(i); setTab('sections'); }} onNavigate={navigate} />
              )
            ) : (
              <MarkupView site={site} page={page} />
            )}
          </div>
        </section>
      </div>

      {dialog && <NewSiteDialog aiReady={aiReady} initial={isSample ? '' : brief} onClose={() => setDialog(false)} onGenerate={generate} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
