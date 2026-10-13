import { useEffect, useState } from 'react';
import type { Design, PaletteSlug } from '../lib/types';
import { PALETTE_SLUGS } from '../lib/types';
import { FONTS, PALETTE_NAMES, contrastRatio, textOn } from '../lib/wp/design';

interface Props {
  design: Design;
  onChange(d: Design): void;
}

const ROLE: Record<PaletteSlug, string> = {
  base: 'Page background',
  contrast: 'Text',
  primary: 'Brand, buttons',
  secondary: 'Soft fills, lines',
  accent: 'Highlights',
  muted: 'Alt. background',
};

export function DesignPanel({ design, onChange }: Props) {
  const [d, setD] = useState(design);
  useEffect(() => setD(design), [design]);

  const update = (next: Design) => {
    setD(next);
    onChange(next);
  };
  const p = d.palette;
  const checks = [
    { label: 'Text on background', ratio: contrastRatio(p.contrast, p.base), min: 7 },
    { label: 'Brand on background', ratio: contrastRatio(p.primary, p.base), min: 4.5 },
    { label: 'Button text', ratio: contrastRatio(p.primary, p[textOn(d, 'primary')]), min: 4.5 },
  ];

  return (
    <>
      <div className="field">
        <span className="eyebrow">Palette · theme.json</span>
        <p className="hint">Blocks reference these by slug, so a change restyles every page and the exported theme.</p>
      </div>
      <div className="swatches">
        {PALETTE_SLUGS.map((slug) => (
          <label key={slug} className="swatch" htmlFor={`color-${slug}`} title={ROLE[slug]}>
            <input
              id={`color-${slug}`}
              type="color"
              value={p[slug]}
              onChange={(e) => update({ ...d, palette: { ...p, [slug]: e.target.value } })}
            />
            <span>
              {PALETTE_NAMES[slug]} <code>{p[slug]}</code>
            </span>
          </label>
        ))}
      </div>
      <div className="field" style={{ gap: 4 }}>
        {checks.map((c) => (
          <div key={c.label} className={`contrast ${c.ratio >= c.min ? 'ok' : 'warn'}`}>
            {c.label}: {c.ratio.toFixed(1)}:1 {c.ratio >= c.min ? '✓' : `· aim for ${c.min}:1`}
          </div>
        ))}
      </div>

      <hr className="sep" />
      <div className="field">
        <label htmlFor="font-heading">Heading font</label>
        <select id="font-heading" className="select" value={d.headingFont} onChange={(e) => update({ ...d, headingFont: e.target.value })}>
          {Object.entries(FONTS).map(([k, f]) => (
            <option key={k} value={k}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="font-body">Body font</label>
        <select id="font-body" className="select" value={d.bodyFont} onChange={(e) => update({ ...d, bodyFont: e.target.value })}>
          {Object.entries(FONTS).map(([k, f]) => (
            <option key={k} value={k}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="eyebrow">Corners</span>
        <div className="seg" role="group" aria-label="Corner radius">
          {(['none', 'soft', 'round'] as const).map((r) => (
            <button key={r} aria-pressed={d.radius === r} onClick={() => update({ ...d, radius: r })}>
              {r === 'none' ? 'Square' : r === 'soft' ? 'Soft' : 'Round'}
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="field grow">
          <label htmlFor="content-size">Content width</label>
          <select id="content-size" className="select" value={d.contentSize} onChange={(e) => update({ ...d, contentSize: e.target.value })}>
            {['640px', '720px', '800px', '880px'].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="wide-size">Wide width</label>
          <select id="wide-size" className="select" value={d.wideSize} onChange={(e) => update({ ...d, wideSize: e.target.value })}>
            {['1080px', '1200px', '1280px', '1400px'].map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}
