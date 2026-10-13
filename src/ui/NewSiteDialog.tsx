import { useEffect, useRef, useState } from 'react';

const EXAMPLES = [
  'A physiotherapy practice in Leeds specialising in running injuries. Calm, clinical but friendly. Online booking, pricing, meet the team.',
  'Open-source CLI tool that turns Figma variables into design tokens. Developer audience, docs-forward, dark and precise.',
  'Family-run olive oil farm in Crete selling direct to customers in the EU. Story of the groves, products, visit the farm, wholesale.',
  'Freelance wedding photographer in Lisbon. Editorial, romantic, lots of whitespace. Packages, portfolio highlights, enquiries.',
];

interface Props {
  aiReady: boolean;
  initial: string;
  onClose(): void;
  onGenerate(brief: string): void;
}

export function NewSiteDialog({ aiReady, initial, onClose, onGenerate }: Props) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-site-title">
        <h2 id="new-site-title">Describe the site you need</h2>
        <p>Who it’s for, what you offer, the tone, and what visitors should do. Claude plans the pages and styles, then writes each page as WordPress blocks.</p>
        <div className="field">
          <label htmlFor="brief">Brief</label>
          <textarea id="brief" ref={ref} className="textarea" rows={6} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim() && aiReady) onGenerate(text.trim()); }}
            placeholder="e.g. A neighbourhood bike repair shop in Utrecht…" />
        </div>
        <div className="field">
          <span className="eyebrow">Try one</span>
          <div className="chips">
            {EXAMPLES.map((x) => (
              <button key={x} className="chip" onClick={() => setText(x)} title={x}>{x.split(/[.,]/)[0]}</button>
            ))}
          </div>
        </div>
        {!aiReady && (
          <div className="banner warn"><div><strong>No AI connected</strong>Open this builder as a Claude artifact, or run it locally with an Anthropic API key, to generate sites.</div></div>
        )}
        <div className="row end">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!aiReady || !text.trim()} onClick={() => onGenerate(text.trim())}>Generate site</button>
        </div>
        <p className="hint">Takes about a minute. This replaces the site on screen; export first if you want to keep it.</p>
      </div>
    </div>
  );
}
