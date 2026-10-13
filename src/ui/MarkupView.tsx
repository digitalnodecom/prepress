import { useMemo, useState } from 'react';
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

export function MarkupView({ site, page }: { site: Site; page: Page }) {
  const [src, setSrc] = useState<Source>('page');
  const [copied, setCopied] = useState(false);

  const raw = useMemo(() => {
    switch (src) {
      case 'header': return site.header;
      case 'footer': return site.footer;
      case 'template': return templates().page;
      case 'theme': return JSON.stringify(buildThemeJson(site.design), null, 2);
      default: return page.content;
    }
  }, [src, site, page]);

  const file = { page: `post_content of “${page.title}”`, header: 'parts/header.html', footer: 'parts/footer.html', template: 'templates/page.html', theme: 'theme.json' }[src];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
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
        <button className="btn small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre id="markup-code" className="code" dangerouslySetInnerHTML={{ __html: src === 'theme' ? esc(raw) : highlight(shorten(raw)) }} />
    </div>
  );
}
