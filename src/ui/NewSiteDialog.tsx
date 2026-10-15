import { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { STARTERS, buildStarter } from '../lib/starters';
import { renderPage } from '../lib/wp/render';
import { libraryList, type LibraryList } from '../lib/backend';

interface Props {
  /** Suggested site name (e.g. the site folder's name). */
  defaultName?: string;
  /** True when a real site is open: starting over replaces it. */
  replaces: boolean;
  onClose(): void;
  onStarter(id: string, name: string, about: string): void;
  /** Start from an official library template (fetched and imported by the caller). */
  onLibraryTemplate(id: string, title: string, name: string, about: string): void;
}

/** Choices: a built-in starter id, or `lib:<id>` for a library template. */
const LIB = 'lib:';

/** A starter's front page, rendered small. Built after the dialog opens so it appears instantly. */
function Thumb({ id }: { id: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const { site } = buildStarter(id);
        setHtml(renderPage(site, site.pages[0]).replace('</head>', '<style>html,body{overflow:hidden!important}</style></head>'));
      } catch {
        setHtml('');
      }
    }, 30);
    return () => window.clearTimeout(t);
  }, [id]);
  return (
    <div className="starter-thumb" aria-hidden="true">
      {html ? <iframe title="" srcDoc={html} tabIndex={-1} loading="lazy" sandbox="" /> : <div className="starter-thumb-empty" />}
    </div>
  );
}

export function NewSiteDialog({ defaultName, replaces, onClose, onStarter, onLibraryTemplate }: Props) {
  const [chosen, setChosen] = useState(STARTERS[0].id);
  const [name, setName] = useState(defaultName ?? '');
  const [about, setAbout] = useState('');
  // Official templates from the library; stays null (section hidden) when offline or without a server.
  const [official, setOfficial] = useState<LibraryList | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const starter = useMemo(() => STARTERS.find((s) => s.id === chosen), [chosen]);
  const libItem = useMemo(() => (chosen.startsWith(LIB) ? official?.items.find((i) => i.id === chosen.slice(LIB.length)) : undefined), [chosen, official]);

  useEffect(() => {
    let alive = true;
    libraryList({ type: 'template', official: '1' })
      .then((r) => alive && r.items.length && setOfficial(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const create = (id = chosen) => {
    if (id.startsWith(LIB)) {
      const item = official?.items.find((i) => i.id === id.slice(LIB.length));
      if (item) onLibraryTemplate(item.id, item.title, name.trim(), about.trim());
      return;
    }
    onStarter(id, name.trim() || STARTERS.find((s) => s.id === id)!.sampleName, about.trim());
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog wide" role="dialog" aria-modal="true" aria-labelledby="new-site-title">
        <div className="dialog-head">
          <h2 id="new-site-title">Start a new site</h2>
        </div>

        <div className="row nowrap starter-fields">
          <div className="field grow">
            <label htmlFor="site-name">Site name</label>
            <input id="site-name" ref={nameRef} className="input" value={name} placeholder={starter?.sampleName ?? libItem?.title ?? ''} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          </div>
          <div className="field grow2">
            <label htmlFor="site-about">What is it about? <span className="hint-inline">(optional, helps the AI later)</span></label>
            <input id="site-about" className="input" value={about} placeholder="e.g. Family bakery in Ljubljana, sourdough and cakes" onChange={(e) => setAbout(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          </div>
        </div>
        {official && (
          <>
            <h3 className="starter-section"><BadgeCheck size={15} /> By Prepress <span className="hint-inline">complete sites from the library, each with its own style and blocks</span></h3>
            <div className="starter-grid" role="listbox" aria-label="Templates by Prepress">
              {official.items.map((m) => (
                <button
                  key={m.id}
                  role="option"
                  aria-selected={chosen === LIB + m.id}
                  className={`starter-card${chosen === LIB + m.id ? ' on' : ''}`}
                  onClick={() => setChosen(LIB + m.id)}
                  onDoubleClick={() => create(LIB + m.id)}
                >
                  <div className="starter-thumb" aria-hidden="true">
                    <iframe title="" src={`${official.base}/library/preview/${m.id}`} tabIndex={-1} loading="lazy" sandbox="" />
                  </div>
                  <span className="starter-title">{m.title}</span>
                  <span className="starter-desc">{m.description}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {official && <h3 className="starter-section">Starters</h3>}
        <div className="starter-grid" role="listbox" aria-label="Templates">
          {STARTERS.map((s) => (
            <button
              key={s.id}
              role="option"
              aria-selected={s.id === chosen}
              className={`starter-card${s.id === chosen ? ' on' : ''}`}
              onClick={() => setChosen(s.id)}
              onDoubleClick={() => create(s.id)}
            >
              <Thumb id={s.id} />
              <span className="starter-title">{s.title}</span>
              <span className="starter-desc">{s.description}</span>
            </button>
          ))}
        </div>
        <div className="row end">
          {replaces && <span className="hint grow">This replaces the site on screen (undo brings it back).</span>}
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => create()}>Create {starter?.id === 'blank' ? 'blank site' : `from “${starter?.title ?? libItem?.title ?? ''}”`}</button>
        </div>
        <p className="hint">Everything is ordinary WordPress blocks: edit text in place, add sections with +, restyle in Styles. An AI client connected over MCP (Settings → AI connection) can rewrite any section in your site’s voice.</p>
      </div>
    </div>
  );
}
