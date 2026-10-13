import { useEffect, useState } from 'react';
import { sectionLabel } from '../lib/site';

interface Props {
  sections: string[];
  selected: number | null;
  aiReady: boolean;
  busy: string | null;
  pageStatus: 'writing' | 'error' | undefined;
  onSelect(i: number | null): void;
  onEdit(i: number, instruction: string): void;
  onAdd(after: number, instruction: string): void;
  onMove(i: number, dir: -1 | 1): void;
  onRemove(i: number): void;
  onRetry(): void;
}

const EDIT_IDEAS = ['Make the copy shorter and punchier', 'Use a dark background', 'Add a fourth item', 'Switch to a split layout with an image'];
const ADD_IDEAS = ['FAQ about pricing', 'Testimonials from customers', 'Newsletter call to action', 'How it works in 3 steps'];

function blockCount(markup: string) {
  return (markup.match(/<!-- wp:/g) ?? []).length;
}

export function SectionsPanel(p: Props) {
  const [instruction, setInstruction] = useState('');
  const [addText, setAddText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setInstruction('');
    setConfirmDelete(false);
  }, [p.selected]);

  if (p.pageStatus === 'error' && !p.sections.length) {
    return (
      <div className="banner warn">
        <div className="grow">
          <strong>This page wasn’t written</strong>
          Claude didn’t finish this page.
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small" onClick={p.onRetry} disabled={!p.aiReady || !!p.busy}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const last = p.sections.length - 1;
  return (
    <>
      <div className="row">
        <span className="eyebrow grow">Sections on this page</span>
        <span className="mono" style={{ color: 'var(--fg-3)' }}>{p.sections.length}</span>
      </div>
      {!p.sections.length && <p className="hint">{p.pageStatus === 'writing' ? 'Writing this page…' : 'This page is empty. Add a section below.'}</p>}
      <div className="sections">
        {p.sections.map((s, i) => {
          const open = p.selected === i;
          return (
            <div key={i + s.slice(0, 40)} className="section-item" aria-current={open}>
              <button className="section-head" onClick={() => p.onSelect(open ? null : i)} aria-expanded={open}>
                <span className="section-idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="section-name">{sectionLabel(s)}</span>
                <span className="section-meta">{blockCount(s)} blocks</span>
              </button>
              {open && (
                <div className="section-body">
                  <div className="field">
                    <label htmlFor="edit-instruction">Change this section</label>
                    <textarea
                      id="edit-instruction"
                      className="textarea"
                      placeholder={p.aiReady ? 'e.g. Make it about our new spring menu' : 'AI editing needs Claude'}
                      value={instruction}
                      disabled={!p.aiReady}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && instruction.trim()) p.onEdit(i, instruction.trim());
                      }}
                    />
                  </div>
                  {p.aiReady && (
                    <div className="chips">
                      {EDIT_IDEAS.map((x) => (
                        <button key={x} className="chip" onClick={() => setInstruction(x)}>{x}</button>
                      ))}
                    </div>
                  )}
                  <div className="row">
                    <button className="btn primary small" disabled={!p.aiReady || !!p.busy || !instruction.trim()} onClick={() => p.onEdit(i, instruction.trim())}>
                      Apply change
                    </button>
                    <div className="grow" />
                    <button className="btn ghost small" onClick={() => p.onMove(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button className="btn ghost small" onClick={() => p.onMove(i, 1)} disabled={i === last} aria-label="Move down">↓</button>
                    {confirmDelete ? (
                      <button className="btn small danger" onClick={() => p.onRemove(i)}>Confirm delete</button>
                    ) : (
                      <button className="btn ghost small danger" onClick={() => setConfirmDelete(true)}>Delete</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="add-box">
        <label htmlFor="add-section" className="eyebrow">
          {p.selected != null ? `Add a section after ${String(p.selected + 1).padStart(2, '0')}` : 'Add a section at the end'}
        </label>
        <input
          id="add-section"
          className="input"
          placeholder={p.aiReady ? 'Describe the section' : 'Adding sections needs Claude'}
          disabled={!p.aiReady}
          value={addText}
          onChange={(e) => setAddText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && addText.trim()) {
              p.onAdd(p.selected ?? last, addText.trim());
              setAddText('');
            }
          }}
        />
        {p.aiReady && (
          <div className="chips">
            {ADD_IDEAS.map((x) => (
              <button key={x} className="chip" onClick={() => setAddText(x)}>{x}</button>
            ))}
          </div>
        )}
        <div className="row end">
          <button
            className="btn small"
            disabled={!p.aiReady || !!p.busy || !addText.trim()}
            onClick={() => {
              p.onAdd(p.selected ?? last, addText.trim());
              setAddText('');
            }}
          >
            Add section
          </button>
        </div>
      </div>
      <p className="hint">Click a section in the preview to select it. Every section is plain WordPress core blocks.</p>
    </>
  );
}
