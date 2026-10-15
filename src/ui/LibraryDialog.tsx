import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Library as LibraryIcon, Search, Share2, Trash2, X } from 'lucide-react';
import type { Site } from '../lib/types';
import { getSections, sectionLabel } from '../lib/site';
import { shareBlock, sharePattern, shareSections, shareStyle, shareTemplate, type LibraryDraft } from '../lib/library';
import { libraryDelete, libraryGet, libraryList, libraryMine, libraryShare, type LibraryMeta } from '../lib/backend';

type Tab = 'browse' | 'share' | 'mine';
type Kind = 'all' | LibraryMeta['type'];
export type ImportMode = 'replace' | 'insert' | 'add' | 'apply';

const KIND_LABEL: Record<Kind, string> = { all: 'All', template: 'Templates', pattern: 'Patterns', block: 'Blocks', style: 'Styles' };
const TYPE_LABEL: Record<LibraryMeta['type'], string> = { template: 'Template', pattern: 'Pattern', block: 'Block', style: 'Style' };
const ID = /(?:^|\/library\/)([a-z0-9]{10})(?:[/?#].*)?$/;

interface Props {
  site: Site;
  pageId: string;
  brief: string;
  onImport(item: LibraryMeta & { payload: any }, mode: ImportMode): void;
  onClose(): void;
}

/** Browse, import and share library items (prepress.digitalno.de/library). */
export function LibraryDialog({ site, pageId, brief, onImport, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('browse');
  const [kind, setKind] = useState<Kind>('all');
  const [query, setQuery] = useState('');
  const [list, setList] = useState<{ base: string; items: LibraryMeta[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Browse: search (a pasted id or link opens that item directly).
  useEffect(() => {
    if (tab !== 'browse') return;
    setError(null);
    const t = window.setTimeout(async () => {
      try {
        const direct = query.trim().match(ID);
        if (direct) {
          const item = await libraryGet(direct[1]);
          const base = (await libraryList({ type: 'template' })).base;
          setList({ base, items: [item] });
        } else {
          setList(await libraryList({ type: kind === 'all' ? undefined : kind, q: query.trim() || undefined }));
        }
      } catch (e: any) {
        setList((l) => l ?? { base: '', items: [] });
        setError(String(e?.message ?? e));
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [tab, kind, query]);

  const use = async (m: LibraryMeta, mode: ImportMode) => {
    setBusy(m.id);
    setError(null);
    try {
      const item = await libraryGet(m.id, true);
      onImport(item, mode);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const actions = (m: LibraryMeta) => {
    const b = (mode: ImportMode, label: string, primary = false) => (
      <button key={mode} className={`btn small ${primary ? 'primary' : ''}`} disabled={!!busy} onClick={() => use(m, mode)}>{busy === m.id ? 'Importing…' : label}</button>
    );
    if (m.type === 'template')
      return confirmReplace === m.id ? (
        <>
          <span className="hint">Replaces your site (undo brings it back).</span>
          {b('replace', 'Use it', true)}
        </>
      ) : (
        <button className="btn small primary" onClick={() => setConfirmReplace(m.id)}>Start from this</button>
      );
    if (m.type === 'pattern') return [b('insert', 'Insert in page', true), b('add', 'Add to patterns')];
    if (m.type === 'block') return b('add', 'Add block', true);
    return b('apply', 'Apply style', true);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog wide library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-title">
        <div className="dialog-head">
          <h2 id="library-title"><LibraryIcon size={22} /> Library</h2>
          <div className="seg" role="tablist">
            {(['browse', 'share', 'mine'] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-pressed={tab === t} aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === 'browse' ? 'Browse' : t === 'share' ? 'Share' : 'Yours'}
              </button>
            ))}
          </div>
          <button className="btn ghost small icon-only" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        {tab === 'browse' && (
          <>
            <div className="row library-filters">
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
              ))}
              <label className="library-search">
                <Search size={15} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, or paste an item link / id" aria-label="Search the library" />
              </label>
            </div>
            {error && <p className="deploy-status bad">{error}</p>}
            {!list ? (
              <p className="hint">Loading…</p>
            ) : !list.items.length ? (
              <p className="hint">Nothing found. {kind !== 'all' || query ? 'Try another search.' : 'Be the first: share something from the Share tab.'}</p>
            ) : (
              <div className="starter-grid library-grid">
                {list.items.map((m) => (
                  <div key={m.id} className="starter-card library-card">
                    <div className="starter-thumb">
                      <iframe src={`${list.base}/library/preview/${m.id}`} sandbox="" loading="lazy" tabIndex={-1} title="" />
                    </div>
                    <span className="pill neutral">{TYPE_LABEL[m.type]}</span>
                    <span className="starter-title">{m.title}</span>
                    {m.description && <span className="starter-desc">{m.description}</span>}
                    <span className="hint">{m.imports} import{m.imports === 1 ? '' : 's'} · <a href={`${list.base}/library/${m.id}`} target="_blank" rel="noreferrer">Details <ExternalLink size={12} /></a></span>
                    <div className="row library-actions">{actions(m)}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="hint">Library items are shared by other people. Importing cleans them like AI output: only standard and site-defined blocks, no scripts.</p>
          </>
        )}

        {tab === 'share' && <ShareTab site={site} pageId={pageId} brief={brief} />}
        {tab === 'mine' && <MineTab />}
      </div>
    </div>
  );
}

function ShareTab({ site, pageId, brief }: { site: Site; pageId: string; brief: string }) {
  const page = site.pages.find((p) => p.id === pageId) ?? site.pages[0];
  const sections = useMemo(() => getSections(page), [page]);
  const [what, setWhat] = useState<LibraryMeta['type']>('pattern');
  const [picked, setPicked] = useState<number[]>([]);
  const [patternId, setPatternId] = useState<number | null>(site.patterns?.[0]?.id ?? null);
  const [blockName, setBlockName] = useState<string>(site.blocks?.[0]?.name ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [usePattern, setUsePattern] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(null);

  const titleFor = what === 'template' ? site.name : what === 'style' ? `${site.name} style` : '';
  const build = (): LibraryDraft => {
    const meta = { title: title.trim() || titleFor, description, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) };
    if (what === 'template') return shareTemplate(site, { ...meta, brief });
    if (what === 'style') return shareStyle(site, meta);
    if (what === 'block') return shareBlock(site, blockName, meta);
    if (usePattern && patternId !== null) return sharePattern(site, patternId, meta);
    return shareSections(site, page.id, picked, meta);
  };

  const ready =
    (title.trim() || titleFor).length >= 3 &&
    (what !== 'pattern' || (usePattern ? patternId !== null : picked.length > 0)) &&
    (what !== 'block' || !!blockName);

  const publish = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await libraryShare(build());
      setMsg({ ok: true, text: 'Published to the library.', url: r.url });
    } catch (e: any) {
      setMsg({ ok: false, text: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="library-share">
      <div className="row">
        {(['pattern', 'template', 'block', 'style'] as const).map((t) => (
          <button key={t} className={`chip ${what === t ? 'on' : ''}`} onClick={() => { setWhat(t); setMsg(null); }} disabled={t === 'block' && !site.blocks?.length}>
            {t === 'pattern' ? 'Sections / pattern' : t === 'template' ? 'Whole site (template)' : t === 'block' ? 'Custom block' : 'Style'}
          </button>
        ))}
      </div>

      {what === 'pattern' && (
        <div className="field">
          {(site.patterns?.length ?? 0) > 0 && (
            <label className="check">
              <input type="checkbox" checked={usePattern} onChange={(e) => setUsePattern(e.target.checked)} /> Share one of this site’s saved patterns
            </label>
          )}
          {usePattern ? (
            <select className="input" value={patternId ?? ''} onChange={(e) => setPatternId(Number(e.target.value))}>
              {(site.patterns ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          ) : (
            <>
              <label>Sections of “{page.title}”</label>
              <div className="library-sections">
                {sections.map((s, i) => (
                  <label key={i} className="check">
                    <input type="checkbox" checked={picked.includes(i)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i].sort((a, b) => a - b) : p.filter((x) => x !== i)))} /> {i + 1}. {sectionLabel(s)}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {what === 'block' && (
        <select className="input" value={blockName} onChange={(e) => setBlockName(e.target.value)} aria-label="Block">
          {(site.blocks ?? []).map((b) => <option key={b.name} value={b.name}>{b.title} ({b.name})</option>)}
        </select>
      )}

      <div className="row nowrap">
        <input className="input grow" placeholder={titleFor || 'Title'} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <input className="input grow" placeholder="Tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Tags" />
      </div>
      <textarea className="textarea" rows={2} placeholder="What is it, when is it useful?" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />
      <p className="hint">Shared publicly at prepress.digitalno.de/library. Images from your media library become placeholders. Only this site can update or delete it later (Yours tab).</p>
      {msg && (
        <p className={`deploy-status ${msg.ok ? 'ok' : 'bad'}`}>
          {msg.text} {msg.url && <a href={msg.url} target="_blank" rel="noreferrer">Open <ExternalLink size={12} /></a>}
        </p>
      )}
      <div className="row end">
        <button className="btn primary" disabled={busy || !ready} onClick={publish}><Share2 size={16} /> {busy ? 'Publishing…' : 'Publish to library'}</button>
      </div>
    </div>
  );
}

function MineTab() {
  const [list, setList] = useState<{ base: string; items: LibraryMeta[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const load = () => libraryMine().then(setList).catch((e) => setError(String(e?.message ?? e)));
  useEffect(() => {
    void load();
  }, []);
  if (error) return <p className="deploy-status bad">{error}</p>;
  if (!list) return <p className="hint">Loading…</p>;
  if (!list.items.length) return <p className="hint">This site hasn’t shared anything yet.</p>;
  return (
    <div className="pages-list">
      {list.items.map((m) => (
        <div key={m.id} className="page-row">
          <span className="section-name">{m.title}</span>
          <span className="mono">{TYPE_LABEL[m.type]}{m.hidden ? ' · hidden (reported)' : ''} · {m.imports} imports</span>
          <span className="row" style={{ gap: 4 }}>
            <a className="btn ghost small" href={`${list.base}/library/${m.id}`} target="_blank" rel="noreferrer">Open <ExternalLink size={12} /></a>
            {confirm === m.id ? (
              <button className="btn small danger" onClick={async () => { await libraryDelete(m.id); setConfirm(null); void load(); }}>Delete</button>
            ) : (
              <button className="btn ghost small danger" onClick={() => setConfirm(m.id)} aria-label="Delete"><Trash2 size={14} /></button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
