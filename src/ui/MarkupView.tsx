import { useEffect, useMemo, useState } from 'react';
import { parse, serialize } from '@wordpress/blocks';
import { ensureBlocks } from '../lib/wp/registry';
import type { Page, Site } from '../lib/types';
import { buildThemeJson } from '../lib/wp/design';
import { templates } from '../lib/wp/templates';

type Source = 'page' | 'header' | 'footer' | 'template' | 'theme';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** Highlight block delimiters: <!-- wp:name {json} /--> */
function highlight(markup: string) {
  return esc(markup).replace(/&lt;!-- (\/?)wp:([\w/-]+)( \{[\s\S]*?\})?( \/)?--&gt;/g, (_m, close, name, json, self) =>
    `<span class="c">&lt;!-- ${close}wp:${name}</span>${json ? `<span class="j">${json}</span>` : ''}<span class="c">${self ?? ''} --&gt;</span>`,
  );
}

const shorten = (s: string) => s.replace(/data:image\/svg\+xml[^"\\]*/g, (m) => `data:image/svg+xml…(${Math.round(m.length / 1024)} KB placeholder)`);

/**
 * Code editor: the page's post_content is editable (like the WordPress code
 * editor; applied markup is re-parsed and re-serialized by Gutenberg). Theme
 * files are shown read-only.
 */
export function MarkupView({ site, page, onApply }: { site: Site; page: Page; onApply?(markup: string): void }) {
  const [src, setSrc] = useState<Source>('page');
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(page.content);
  useEffect(() => setDraft(page.content), [page.content]);
  const dirty = src === 'page' && draft !== page.content;
  const apply = () => {
    ensureBlocks();
    onApply?.(serialize(parse(draft)));
  };

  const raw = useMemo(() => {
    switch (src) {
      case 'header': return site.header;
      case 'footer': return site.footer;
      case 'template': return templates().page;
      case 'theme': return JSON.stringify(buildThemeJson(site.design, site.themeJson), null, 2);
      default: return page.content;
    }
  }, [src, site, page]);

  const file = { page: `post_content of “${page.title}”`, header: 'parts/header.html', footer: 'parts/footer.html', template: 'templates/page.html', theme: 'theme.json' }[src];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(src === 'page' ? draft : raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const sel = window.getSelection();
      const el = document.getElementById('markup-code');
      if (sel && el) {
        const r = document.createRange();
        r.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  };

  return (
    <div className="code-wrap">
      <div className="code-head">
        <select className="select" style={{ width: 'auto' }} value={src} onChange={(e) => setSrc(e.target.value as Source)} aria-label="Source">
          <option value="page">This page</option>
          <option value="header">Header part</option>
          <option value="footer">Footer part</option>
          <option value="template">Page template</option>
          <option value="theme">theme.json</option>
        </select>
        <span className="mono grow" style={{ color: 'var(--fg-3)' }}>{file}</span>
        {dirty && <button className="btn small ghost" onClick={() => setDraft(page.content)}>Discard</button>}
        {dirty && onApply && <button className="btn small primary" onClick={apply}>Apply</button>}
        <button className="btn small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      {src === 'page' && onApply ? (
        <textarea id="markup-code" className="code code-edit" spellCheck={false} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Page block markup" />
      ) : (
        <pre id="markup-code" className="code" dangerouslySetInnerHTML={{ __html: src === 'theme' ? esc(raw) : highlight(shorten(raw)) }} />
      )}
    </div>
  );
}
