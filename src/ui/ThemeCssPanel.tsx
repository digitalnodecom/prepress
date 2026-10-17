import { useMemo, useState } from 'react';
import type { Site } from '../lib/types';
import { buildThemeJson, customVars } from '../lib/wp/design';
import { compileBlockStyles } from '../lib/wp/blockStyles';
import { blockStyleUsage } from '../lib/site';
import { sanitizeCss } from '../lib/wp/customBlocks';

/**
 * The style layers of a site (docs/THEME-SYSTEM.md), visible: the block styles
 * users pick in a block's Styles panel, and the CSS each layer contributes.
 */
const LAYERS = ['Tokens', 'Defaults', 'Block styles', 'Block CSS', 'Site CSS'] as const;
type Layer = (typeof LAYERS)[number];

export function ThemeCssPanel({ site, onDeleteStyle }: { site: Site; onDeleteStyle(name: string): void }) {
  const [layer, setLayer] = useState<Layer>('Tokens');
  const [confirm, setConfirm] = useState<string | null>(null);
  const styles = site.blockStyles ?? [];
  const text = useMemo(() => {
    const tj: any = buildThemeJson(site.design, site.themeJson);
    if (layer === 'Tokens') {
      const s = tj.settings ?? {};
      return [
        ...(s.color?.palette ?? []).map((c: any) => `--wp--preset--color--${c.slug}: ${c.color};`),
        ...(s.typography?.fontFamilies ?? []).map((f: any) => `--wp--preset--font-family--${f.slug}: ${f.fontFamily};`),
        ...(s.typography?.fontSizes ?? []).map((f: any) => `--wp--preset--font-size--${f.slug}: ${f.size};`),
        ...(s.spacing?.spacingSizes ?? []).map((f: any) => `--wp--preset--spacing--${f.slug}: ${f.size};`),
        ...(s.shadow?.presets ?? []).map((f: any) => `--wp--preset--shadow--${f.slug}: ${f.shadow};`),
        ...customVars(s.custom).map((v) => `${v};`),
      ].join('\n');
    }
    if (layer === 'Defaults') return JSON.stringify({ elements: tj.styles?.elements, blocks: tj.styles?.blocks }, null, 2);
    if (layer === 'Block styles') return compileBlockStyles(styles) || '/* No block styles */';
    if (layer === 'Block CSS') return (site.blocks ?? []).filter((b) => b.css).map((b) => `/* ${b.name} */\n${sanitizeCss(b.css)}`).join('\n\n') || '/* No custom blocks with CSS */';
    return tj.styles?.css || '/* No site CSS */';
  }, [layer, site.design, site.themeJson, site.blockStyles, site.blocks]);

  return (
    <>
      <hr className="sep" />
      <div className="field">
        <span className="eyebrow">Block styles</span>
        <p className="hint">Named looks for blocks. Pick or remove one in a block’s Styles panel; without it the block keeps its plain look.</p>
      </div>
      {styles.length ? (
        <div className="pages-list">
          {styles.map((s) => {
            const used = blockStyleUsage(site, s.name).length;
            return (
              <div key={s.name} className="page-row">
                <span className="section-name" title={`is-style-${s.name} · ${s.blockTypes.join(', ')}`}>{s.label}</span>
                <span className="mono">{s.blockTypes.map((t) => t.replace('core/', '')).join(', ')} · {used ? `${used}× used` : 'unused'}</span>
                {confirm === s.name ? (
                  <button className="btn small danger" onClick={() => { onDeleteStyle(s.name); setConfirm(null); }}>Confirm</button>
                ) : (
                  <button className="btn ghost small danger" onClick={() => setConfirm(s.name)}>Delete</button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="hint">None yet. AI clients add them with define_block_style; library styles bring their own.</p>
      )}

      <hr className="sep" />
      <div className="field">
        <span className="eyebrow">Theme CSS</span>
        <div className="seg wrap" role="group" aria-label="CSS layer">
          {LAYERS.map((l) => (
            <button key={l} aria-pressed={layer === l} onClick={() => setLayer(l)}>
              {l}
            </button>
          ))}
        </div>
        <pre className="code-view" aria-label={`${layer} CSS`}>{text}</pre>
      </div>
    </>
  );
}
