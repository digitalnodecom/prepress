import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CloudUpload, Download, Eye, EyeOff, FilePlus2, ListTree, Monitor, Plus, Redo2, Settings, Smartphone, Tablet, Undo2, X } from 'lucide-react';
import type { Design, PartSlug, Site } from '../lib/types';
import { TARGET_WP_VERSION } from '../lib/types';
import { friendlyError } from '../lib/ai/client';
import { generateSite } from '../lib/ai/generate';
import { DEMO_BRIEF } from '../lib/ai/demo';
import {
  addPage, applyDesign, rebuildParts, removePage, resetPart, setPageContent, setPart, updatePage, updatePattern, deletePattern, deleteBlock,
} from '../lib/site';
import { validateMarkup } from '../lib/wp/markup';
import { pageUrl, renderPage } from '../lib/wp/render';
import { exportSite } from '../lib/wp/export';
import { connectBackend, loadDraft, publish, saveDraft, siteHash, subscribeChanges, type Backend, type Draft } from '../lib/backend';
import { registerCustomBlocks } from '../lib/wp/customBlocks';
import { Preview, type Device } from './Preview';
import { DesignPanel } from './DesignPanel';
import { SitePanel } from './SitePanel';
import { PagePanel } from './PagePanel';
import { PartPanel } from './PartPanel';
import { MarkupView } from './MarkupView';
import { NewSiteDialog } from './NewSiteDialog';
import { buildStarter, starterById } from '../lib/starters';
import { Logo } from './icons';
import { Breadcrumb, Canvas, EditorProvider, Inserter, Inspector, Outline, SelectionSync, useEditorHistoryShortcuts } from './editor/Editor';

type Mode = 'edit' | 'preview' | 'code';
type Tab = 'page' | 'block' | 'styles' | 'site';
type Left = 'inserter' | 'outline' | null;
type SaveState = 'saved' | 'saving' | 'error' | 'idle';

const TAB_LABEL: Record<Tab, string> = { page: 'Page', block: 'Block', styles: 'Styles', site: 'Site' };
/** Stable empty list: a fresh `[]` per render would rebuild the editor settings and reload the canvas. */
const NONE: never[] = [];
const PART_LABEL: Record<PartSlug, string> = { header: 'Header', footer: 'Footer' };

export function App() {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [site, setSiteState] = useState<Site | null>(null);
  const [brief, setBrief] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [pageId, setPageId] = useState<string | null>(null);
  /** When set, the editor edits the header or footer template part instead of the page. */
  const [part, setPartTarget] = useState<PartSlug | null>(null);
  /** When set, the editor edits this synced/unsynced pattern (takes precedence over part/page). */
  const [patternId, setPatternId] = useState<number | null>(null);
  /** Show the header and footer around the page in the editor (site-editor style). */
  const [showTemplate, setShowTemplate] = useState(() => {
    try {
      return localStorage.getItem('prepress:show-template') !== '0';
    } catch {
      return true;
    }
  });
  const toggleTemplate = () =>
    setShowTemplate((v) => {
      try {
        localStorage.setItem('prepress:show-template', v ? '0' : '1');
      } catch {}
      return !v;
    });
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const [tab, setTab] = useState<Tab>('block');
  const [left, setLeft] = useState<Left>(null);
  const [sidebar, setSidebar] = useState(() => window.innerWidth >= 960);
  const [device, setDevice] = useState<Device>('desktop');
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [publishedHash, setPublishedHash] = useState<string | undefined>(undefined);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  /** Server revision of the draft we hold; saves send it so concurrent MCP edits aren't overwritten. */
  const revRef = useRef<number | undefined>(undefined);
  /** Skip the next autosave (we just loaded this exact state from the server). */
  const skipSave = useRef(false);
  const saving = useRef(false);

  // Undo history of whole-site snapshots (markup strings are cheap to keep).
  const past = useRef<Site[]>([]);
  const future = useRef<Site[]>([]);
  const [, force] = useState(0);
  const siteRef = useRef<Site | null>(null);
  siteRef.current = site;

  // Sample / placeholder content becomes the user's own site with their first edit
  // (then an AI's create_site no longer replaces it without asking).
  const sampleBase = useRef<Site | null>(null);
  useEffect(() => {
    if (!isSample) {
      sampleBase.current = null;
      return;
    }
    if (!sampleBase.current) sampleBase.current = site;
    else if (site !== sampleBase.current) setIsSample(false);
  }, [site, isSample]);

  const setSite = useCallback((next: Site | ((s: Site) => Site), opts: { record?: boolean } = {}) => {
    setSiteState((prev) => {
      const value = typeof next === 'function' ? (prev ? (next as (s: Site) => Site)(prev) : prev) : next;
      if (prev && value && value !== prev && opts.record !== false) {
        past.current.push(prev);
        if (past.current.length > 60) past.current.shift();
        future.current = [];
        force((n) => n + 1);
      }
      return value;
    });
  }, []);

  const undo = () => {
    const prev = past.current.pop();
    const cur = siteRef.current;
    if (!prev || !cur) return;
    future.current.push(cur);
    setSiteState(prev);
    force((n) => n + 1);
  };
  const redo = () => {
    const next = future.current.pop();
    const cur = siteRef.current;
    if (!next || !cur) return;
    past.current.push(cur);
    setSiteState(next);
    force((n) => n + 1);
  };
  useEditorHistoryShortcuts(undo, redo);

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
    sampleBase.current = null;
    setSiteState(s);
    setBrief(DEMO_BRIEF);
    setIsSample(true);
    setPageId(s!.pages[0].id);
    setSelected(null);
  }, []);

  const boot = useCallback(async (b: Backend) => {
    setBackend(b);
    try {
      const { draft, publishedAt } = await loadDraft(b);
      setPublishedAt(publishedAt);
      if (draft) {
        revRef.current = draft.rev;
        skipSave.current = true;
        setSiteState(draft.site);
        setBrief(draft.brief ?? '');
        setIsSample(!!draft.isSample);
        setPublishedHash(draft.publishedHash);
        setPageId(draft.site.pages[0]?.id ?? null);
        setSaveState('saved');
      } else {
        // A new, empty site folder: start blank and offer the templates.
        startFrom('blank', '', '', true);
        setDialog(true);
      }
    } catch (e) {
      setError(friendlyError(e));
      await loadSample();
    }
  }, [loadSample]);

  useEffect(() => {
    connectBackend().then(boot);
  }, [boot]);

  /** Take a newer draft from the server (an AI changed the site over MCP). Undo can bring ours back. */
  const adoptServerDraft = useCallback((draft: Draft | null, message: string) => {
    if (!draft?.site?.pages) return;
    const cur = siteRef.current;
    if (cur) {
      past.current.push(cur);
      future.current = [];
    }
    revRef.current = draft.rev;
    skipSave.current = true;
    sampleBase.current = null;
    setSiteState(draft.site);
    setPublishedHash(draft.publishedHash);
    setIsSample(!!draft.isSample);
    setBrief(draft.brief ?? '');
    setPageId((id) => (draft.site.pages.some((p) => p.id === id) ? id : draft.site.pages[0]?.id ?? null));
    setPatternId((id) => (id !== null && (draft.site.patterns ?? []).some((p) => p.id === id) ? id : null));
    setSaveState('saved');
    flash(message);
  }, []);

  // Live updates: when another client saves, load its version (unless we're mid-save; then the 409 handles it).
  useEffect(() => {
    if (!backend || backend.kind !== 'server') return;
    return subscribeChanges((e) => {
      if (saving.current || (revRef.current !== undefined && e.rev <= revRef.current)) return;
      loadDraft(backend)
        .then(({ draft }) => {
          if (draft && (revRef.current === undefined || (draft.rev ?? 0) > revRef.current)) adoptServerDraft(draft, e.by === 'mcp' ? `Updated by AI${e.summary ? `: ${e.summary}` : ''}` : 'Site updated in another window');
        })
        .catch(() => undefined);
    });
  }, [backend, adoptServerDraft]);

  // Autosave the draft (server, or localStorage without a server).
  useEffect(() => {
    if (!site || !backend || busy?.startsWith('Planning')) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSaveState((s) => (s === 'idle' ? 'idle' : 'saving'));
    const t = window.setTimeout(() => {
      setSaveState('saving');
      saving.current = true;
      saveDraft(backend, { site, brief, isSample, publishedHash }, revRef.current)
        .then((rev) => {
          if (rev !== undefined) revRef.current = rev;
          setSaveState('saved');
        })
        .catch((e) => {
          if (e?.code === 'conflict') {
            adoptServerDraft(e.data?.draft, 'The site was changed elsewhere (AI). Loaded the latest version; undo to see yours.');
            return;
          }
          setSaveState('error');
        })
        .finally(() => {
          saving.current = false;
        });
    }, 700);
    return () => window.clearTimeout(t);
  }, [site, brief, isSample, publishedHash, backend, busy, adoptServerDraft]);

  const page = site?.pages.find((p) => p.id === pageId) ?? site?.pages[0] ?? null;

  // ---------- derived (deferred: these parse every page) ----------
  const lazySite = useDeferredValue(site);
  const validation = useMemo(() => {
    if (!lazySite) return null;
    let blocks = 0;
    let invalid = 0;
    const byName: Record<string, number> = {};
    for (const m of [...lazySite.pages.map((p) => p.content), lazySite.header, lazySite.footer]) {
      const v = validateMarkup(m);
      blocks += v.blocks;
      invalid += v.invalid.length;
      for (const [k, n] of Object.entries(v.byName)) byName[k] = (byName[k] ?? 0) + n;
    }
    return { blocks, invalid, byName };
  }, [lazySite]);

  const lazyPage = lazySite?.pages.find((p) => p.id === page?.id) ?? null;
  const html = useMemo(
    () => (mode === 'preview' && lazySite && lazyPage ? renderPage(lazySite, lazyPage, { markSections: true, interactive: true }) : ''),
    [lazySite, lazyPage, mode],
  );
  const hash = useMemo(() => (lazySite && backend?.kind === 'server' ? siteHash(lazySite) : undefined), [lazySite, backend]);
  const unpublished = backend?.kind === 'server' && hash !== publishedHash;

  // ---------- actions ----------
  /** Replace the site with a starter template (undo brings the old one back). `placeholder` = not chosen by the user yet. */
  function startFrom(id: string, name: string, about: string, placeholder = false) {
    const { site: s, brief: b } = buildStarter(id, { name, about });
    const cur = siteRef.current;
    if (cur && !placeholder) {
      past.current.push(cur);
      future.current = [];
    }
    setDialog(false);
    sampleBase.current = null;
    setSiteState(s);
    setBrief(b);
    setIsSample(placeholder);
    setPageId(s.pages[0].id);
    setPartTarget(null);
    setPatternId(null);
    setSelected(null);
    if (!placeholder) flash(id === 'blank' ? `Started ${s.name}` : `Started ${s.name} from the ${starterById(id)?.title} template`);
  }

  const onAddPage = (title: string) => {
    if (!site) return;
    const { site: next, page: p } = addPage(site, title);
    setSite(next);
    setPageId(p.id);
    setSelected(null);
  };

  const designTimer = useRef<number | undefined>(undefined);
  const onDesign = (d: Design) => {
    window.clearTimeout(designTimer.current);
    designTimer.current = window.setTimeout(() => setSite((s) => applyDesign(s, d)), 120);
  };

  const onPublish = async () => {
    if (!site) return;
    setBusy('Publishing');
    setError(null);
    try {
      // The server renders what's saved, so save first.
      if (backend) {
        saving.current = true;
        try {
          const rev = await saveDraft(backend, { site, brief, isSample, publishedHash }, revRef.current);
          if (rev !== undefined) revRef.current = rev;
        } finally {
          saving.current = false;
        }
      }
      const r = await publish();
      setPublishedHash(siteHash(site));
      setPublishedAt(r.publishedAt);
      const deploys = r.deploys ?? [];
      const failed = deploys.filter((d) => !d.ok);
      if (deploys.length) window.dispatchEvent(new Event('pp:deployed'));
      if (failed.length) setError(`Published, but deploy failed: ${failed.map((d) => `${d.name}: ${d.error}`).join('; ')}`);
      flash(`Published ${site.pages.length} pages${deploys.length ? ` · deployed to ${deploys.filter((d) => d.ok).map((d) => d.name).join(', ') || 'no targets'}` : ''}`);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
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
      setError('That file is not a Prepress site.json.');
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
    if (p) switchPage(p.id);
  };

  const switchPage = (id: string) => {
    setPageId(id);
    setPartTarget(null);
    setPatternId(null);
    setSelected(null);
  };

  const switchPart = (slug: PartSlug) => {
    setPartTarget(slug);
    setPatternId(null);
    setSelected(null);
  };

  const onEditorChange = useCallback(
    (markup: string, record: boolean) => {
      const id = pageId;
      if (patternId !== null) {
        setSite((s) => updatePattern(s, patternId, { content: markup }), { record });
        return;
      }
      if (part) {
        setSite((s) => setPart(s, part, markup), { record });
        return;
      }
      setSite((s) => {
        const target = s.pages.find((p) => p.id === id) ?? s.pages[0];
        return target.content === markup ? s : setPageContent(s, target.id, markup);
      }, { record });
    },
    [pageId, part, patternId, setSite],
  );

  const onSelectSection = useCallback((i: number | null) => setSelected(i), []);

  // Header/footer edited in place on a page: same as editing them in their own tab.
  const onPartChange = useCallback(
    (slug: PartSlug, markup: string, record: boolean) => setSite((s) => setPart(s, slug, markup), { record }),
    [setSite],
  );

  // Only titles/slugs matter here; keyed on them so typing in a page doesn't rebuild the editor settings.
  const pageLinks = JSON.stringify((site?.pages ?? []).map((p) => [p.title, p.slug]));
  const editorInfo = useMemo(
    () => ({
      name: site?.name ?? '',
      tagline: site?.tagline ?? '',
      pages: (JSON.parse(pageLinks) as [string, string][]).map(([title, slug]) => ({ title, url: pageUrl(slug) })),
      patterns: (site?.patterns ?? []).filter((p) => p.synced).map((p) => ({ id: p.id, title: p.title, content: p.content })),
      onEditPattern: (id: number) => {
        setPatternId(id);
        setSelected(null);
      },
    }),
    [site?.name, site?.tagline, pageLinks, site?.patterns],
  );

  // Site-defined block types must be registered before anything parses content that uses them.
  const blocksKey = useMemo(() => {
    registerCustomBlocks(site?.blocks ?? []);
    return siteHash({ blocks: site?.blocks ?? [] } as any);
  }, [site?.blocks]);
  const editingPattern = patternId !== null ? site?.patterns?.find((p) => p.id === patternId) ?? null : null;

  const templateMode = showTemplate && !part && !editingPattern;

  /** Where the published site lives: --site-url, else the preview on this server. */
  const siteBase = backend?.kind === 'server' ? backend.siteUrl ?? '' : null;


  if (!site || !page) {
    return (
      <div className="pending" style={{ height: '100%' }}>
        <div>
          <span className="spin" style={{ display: 'inline-block' }} />
          <h3>Loading the block editor…</h3>
        </div>
      </div>
    );
  }

  const saveLabel = backend?.kind === 'server'
    ? saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved' : saveState === 'saved' ? 'Draft saved' : ''
    : 'Saved in this browser';

  return (
    <EditorProvider
      key={`${editingPattern ? `pattern:${editingPattern.id}` : part ? `part:${part}` : page.id}:${blocksKey}:${templateMode ? 'template' : ''}`}
      content={editingPattern ? editingPattern.content : part ? site[part] : page.content}
      blocks={site.blocks ?? NONE}
      patterns={site.patterns ?? NONE}
      themeJson={site.themeJson}
      design={site.design}
      canUpload={backend?.kind === 'server'}
      info={editorInfo}
      onChange={onEditorChange}
      template={templateMode ? { header: site.header, footer: site.footer, onPartChange } : undefined}
    >
      <SelectionSync selected={selected} onSelected={onSelectSection} />
      <div className="app">
        <header className="bar">
          <a className="wordmark" href={siteBase ? siteBase + '/' : undefined} target="_blank" rel="noreferrer" title={siteBase ? 'View site' : 'Prepress'} aria-label={siteBase ? 'Prepress — view site' : 'Prepress'}>
            <Logo />
          </a>
          <div className="bar-tools">
            <button
              className={`btn icon-btn ${left === 'inserter' ? 'primary' : 'ghost'}`}
              onClick={() => { setMode('edit'); setLeft((l) => (l === 'inserter' ? null : 'inserter')); }}
              aria-pressed={left === 'inserter'}
              aria-label="Block inserter"
              title="Add block"
            >
              <Plus size={18} />
            </button>
            <button className="btn ghost icon-btn hide-narrow" onClick={undo} disabled={!past.current.length} aria-label="Undo" title="Undo (⌘Z)"><Undo2 size={18} /></button>
            <button className="btn ghost icon-btn hide-narrow" onClick={redo} disabled={!future.current.length} aria-label="Redo" title="Redo (⇧⌘Z)"><Redo2 size={18} /></button>
            <button
              className={`btn icon-btn hide-narrow ${left === 'outline' ? 'primary' : 'ghost'}`}
              onClick={() => { setMode('edit'); setLeft((l) => (l === 'outline' ? null : 'outline')); }}
              aria-pressed={left === 'outline'}
              aria-label="List view"
              title="List view"
            >
              <ListTree size={18} />
            </button>
          </div>
          <nav className="bar-pages" aria-label="Pages">
            {site.pages.map((p) => (
              <button key={p.id} className="page-tab" aria-current={!part && !editingPattern && p.id === page.id ? 'page' : undefined} onClick={() => switchPage(p.id)}>
                {p.title}
              </button>
            ))}
            <span className="bar-divider" aria-hidden />
            {(['header', 'footer'] as PartSlug[]).map((slug) => (
              <button key={slug} className="page-tab part-tab" aria-current={!editingPattern && part === slug ? 'page' : undefined} onClick={() => switchPart(slug)} title={`Edit the ${slug} on every page`}>
                {slug === 'header' ? 'Header' : 'Footer'}
                {site.custom?.[slug] && <span className="dot" title="Edited by hand" />}
              </button>
            ))}
          </nav>
          {editingPattern && (
            <span className="page-tab pattern-chip" aria-current="page" title="Editing a pattern: changes apply wherever it is used">
              Pattern: {editingPattern.title}
              <button className="linkish" onClick={() => setPatternId(null)} aria-label="Stop editing pattern"><X size={14} /></button>
            </span>
          )}
          <div className="bar-right">
            <span className="save-state hide-narrow" role="status">{saveLabel}</span>
            <div className="seg hide-narrow" role="group" aria-label="Mode">
              {(['edit', 'preview', 'code'] as Mode[]).map((m) => (
                <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m === 'edit' ? 'Edit' : m === 'preview' ? 'Preview' : 'Code'}
                </button>
              ))}
            </div>
            <button className="btn hide-narrow" onClick={() => setDialog(true)} disabled={!!busy}><FilePlus2 size={16} /> New site</button>
            <button className="btn hide-narrow" onClick={onExport} disabled={!!busy} title="Download a WordPress block theme + content import"><Download size={16} /> Export</button>
            {backend?.kind === 'server' && (
              <button className="btn primary" onClick={onPublish} disabled={!!busy || (!unpublished && !!publishedAt)} title={publishedAt ? `Last published ${new Date(publishedAt).toLocaleString()}` : 'Not published yet'}>
                {unpublished || !publishedAt ? <CloudUpload size={16} /> : <Check size={16} />}
                {unpublished || !publishedAt ? 'Publish' : 'Published'}
              </button>
            )}
            <button className={`btn icon-btn ${sidebar ? 'primary' : 'ghost'}`} onClick={() => setSidebar((x) => !x)} aria-pressed={sidebar} aria-label="Settings" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="main">
          {mode === 'edit' && left && (
            <aside className="left-panel" aria-label={left === 'inserter' ? 'Block inserter' : 'List view'}>
              {left === 'outline' && (
                <div className="left-head">
                  <strong>List view</strong>
                  <button className="btn ghost small icon-only" onClick={() => setLeft(null)} aria-label="Close"><X size={16} /></button>
                </div>
              )}
              {left === 'inserter' ? <Inserter onClose={() => setLeft(null)} /> : <Outline />}
            </aside>
          )}

          <section className="canvas" aria-label="Canvas">
            {(busy || error || isSample) && (
              <div className="canvas-bar">
                {isSample && <span className="pill neutral">Starter content — edit anything, or pick <button className="linkish" onClick={() => setDialog(true)}>another template</button></span>}
                {error && (
                  <span className="pill bad" role="alert">
                    {error}
                    <button className="linkish" onClick={() => setError(null)} aria-label="Dismiss"><X size={14} /></button>
                  </span>
                )}
                <div className="grow" />
                {busy && (
                  <span className="pill accent" role="status">
                    <span className="spin" /> {busy}…
                  </span>
                )}
              </div>
            )}
            <div className="canvas-stage">
              {mode === 'edit' ? (
                <Canvas template={templateMode} />
              ) : mode === 'preview' ? (
                <div className="preview-wrap">
                  <div className="seg device-seg" role="group" aria-label="Device">
                    {(['desktop', 'tablet', 'phone'] as Device[]).map((d) => (
                      <button key={d} aria-pressed={device === d} onClick={() => setDevice(d)}>
                        {d === 'desktop' ? <Monitor size={15} /> : d === 'tablet' ? <Tablet size={15} /> : <Smartphone size={15} />}
                        {d[0].toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                  <Preview html={html} device={device} selected={selected} onSelect={(i) => setSelected(i)} onNavigate={navigate} />
                </div>
              ) : (
                <MarkupView
                  site={site}
                  page={part ? { ...page, title: PART_LABEL[part], content: site[part] } : page}
                  onApply={(markup) => setSite((s) => (part ? setPart(s, part, markup) : setPageContent(s, page.id, markup)))}
                />
              )}
            </div>
            <footer className="status-bar">
              {mode === 'edit' ? <Breadcrumb root={editingPattern ? 'Pattern' : part ? PART_LABEL[part] : 'Page'} /> : <span />}
              <div className="grow" />
              {mode === 'edit' && !part && !editingPattern && (
                <button className="btn ghost small" aria-pressed={showTemplate} onClick={toggleTemplate} title="Show the site header and footer around the page; edits to them apply to every page">
                  {showTemplate ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showTemplate ? 'Hide header & footer' : 'Show header & footer'}
                </button>
              )}
              {validation && (
                <span className={`pill ${validation.invalid ? 'bad' : 'ok'}`} title="Every block parsed with WordPress’s own block validator">
                  <span className="dot" />
                  WP {TARGET_WP_VERSION} · {validation.blocks} blocks · {validation.invalid ? `${validation.invalid} invalid` : 'all valid'}
                </span>
              )}
            </footer>
          </section>

          {sidebar && (
            <aside className="rail" aria-label="Settings">
              <div className="rail-tabs" role="tablist">
                {(['page', 'block', 'styles', 'site'] as Tab[]).map((t) => (
                  <button key={t} role="tab" className="rail-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                    {t === 'page' && part ? PART_LABEL[part] : TAB_LABEL[t]}
                  </button>
                ))}
              </div>
              <div className={`rail-body ${tab === 'block' ? 'flush' : ''}`}>
                {tab === 'page' && part && (
                  <PartPanel
                    slug={part}
                    custom={!!site.custom?.[part]}
                    onReset={() => setSite((s) => resetPart(s, part))}
                  />
                )}
                {tab === 'page' && !part && <PagePanel page={page} siteUrl={siteBase} onUpdate={(patch) => setSite((s) => updatePage(s, page.id, patch))} />}
                {tab === 'block' && <Inspector />}
                {tab === 'styles' && <DesignPanel design={site.design} onChange={onDesign} />}
                {tab === 'site' && (
                  <SitePanel
                    site={site}
                    brief={brief}
                    onBrief={setBrief}
                    busy={busy}
                    onRename={(name, tagline) => setSite((s) => rebuildParts({ ...s, name, tagline }))}
                    onAddPage={onAddPage}
                    onRemovePage={(id) => {
                      setSite((s) => removePage(s, id));
                      if (id === page.id) switchPage(site.pages[0].id);
                    }}
                    onImport={onImport}
                    onLoadSample={() => void loadSample()}
                    validation={validation}
                    serverMode={backend?.kind === 'server'}
                    published={!!publishedAt}
                    onEditPattern={(id) => { setPatternId(id); setMode('edit'); }}
                    onDeletePattern={(id) => { setSite((s) => deletePattern(s, id)); if (patternId === id) setPatternId(null); }}
                    onDeleteBlock={(name) => setSite((s) => deleteBlock(s, name, true))}
                  />
                )}
              </div>
            </aside>
          )}
        </div>

        {dialog && (
          <NewSiteDialog
            defaultName={isSample && backend?.folder && !/^(prepress-data|data|public)$/.test(backend.folder) ? backend.folder : undefined}
            replaces={!isSample}
            onClose={() => setDialog(false)}
            onStarter={(id, name, about) => startFrom(id, name, about)}
          />
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </EditorProvider>
  );
}
