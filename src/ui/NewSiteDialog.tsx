import { useEffect, useMemo, useRef, useState } from 'react';
import { STARTERS, buildStarter } from '../lib/starters';
import { renderPage } from '../lib/wp/render';

interface Props {
  /** Suggested site name (e.g. the site folder's name). */
  defaultName?: string;
  /** True when a real site is open: starting over replaces it. */
  replaces: boolean;
  onClose(): void;
  onStarter(id: string, name: string, about: string): void;
}

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

export function NewSiteDialog({ defaultName, replaces, onClose, onStarter }: Props) {
  const [chosen, setChosen] = useState(STARTERS[0].id);
  const [name, setName] = useState(defaultName ?? '');
  const [about, setAbout] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const starter = useMemo(() => STARTERS.find((s) => s.id === chosen)!, [chosen]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const create = (id = chosen) => onStarter(id, name.trim() || STARTERS.find((s) => s.id === id)!.sampleName, about.trim());

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog wide" role="dialog" aria-modal="true" aria-labelledby="new-site-title">
        <div className="dialog-head">
          <h2 id="new-site-title">Start a new site</h2>
        </div>

        <div className="row nowrap starter-fields">
          <div className="field grow">
            <label htmlFor="site-name">Site name</label>
            <input id="site-name" ref={nameRef} className="input" value={name} placeholder={starter.sampleName} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          </div>
          <div className="field grow2">
            <label htmlFor="site-about">What is it about? <span className="hint-inline">(optional, helps the AI later)</span></label>
            <input id="site-about" className="input" value={about} placeholder="e.g. Family bakery in Ljubljana, sourdough and cakes" onChange={(e) => setAbout(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          </div>
        </div>
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
          <button className="btn primary" onClick={() => create()}>Create {starter.id === 'blank' ? 'blank site' : `from “${starter.title}”`}</button>
        </div>
        <p className="hint">Everything is ordinary WordPress blocks: edit text in place, add sections with +, restyle in Styles. An AI client connected over MCP (Site tab) can rewrite any section in your site’s voice.</p>
      </div>
    </div>
  );
}
