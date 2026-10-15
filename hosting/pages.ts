/**
 * Public pages of prepress.digitalno.de: the homepage, the library browser
 * and library item pages. Server-rendered, no build step; every value from a
 * library item is HTML-escaped, and previews are framed sandboxed.
 */
import type { ItemMeta, Library } from './library.ts';

export interface PageConfig {
  domain: string;
  /** Desktop app download (macOS), if published. */
  downloadMac?: string;
  /** Hosted web version, once it exists. */
  webUrl?: string;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const LOGO = `<svg width="40" height="40" viewBox="0 0 22 22" aria-hidden="true"><rect x="2" y="2" width="18" height="5" rx="1.5" fill="var(--accent)"/><rect x="6" y="8.5" width="14" height="5" rx="1.5" fill="var(--fg)" opacity=".85"/><rect x="2" y="15" width="11" height="5" rx="1.5" fill="var(--fg)" opacity=".5"/></svg>`;

/** Lucide icons (ISC), inlined. */
const ICON = {
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  badge: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
};
const icon = (k: keyof typeof ICON, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const CSS = `
:root{--bg:#f6f6f4;--card:#fff;--fg:#16191d;--fg2:#4d5560;--fg3:#7b838e;--line:#e3e3df;--accent:#11706b;--accent-soft:#dcefed;--accent-fg:#fff;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#15171a;--card:#1d2024;--fg:#eceef0;--fg2:#b4bac2;--fg3:#858c96;--line:#2e3238;--accent:#3fb3ab;--accent-soft:#163a37;--accent-fg:#0b1514;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}main{max-width:1080px;margin:0 auto;padding:56px 20px 40px}
.hero{text-align:center;max-width:640px;margin:0 auto 40px}.hero svg{margin-bottom:12px}.hero h1{font-size:34px;letter-spacing:-.02em;margin:0 0 10px}.hero p{color:var(--fg2);margin:0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.card{display:flex;flex-direction:column;gap:8px;padding:22px;border:1px solid var(--line);border-radius:14px;background:var(--card);text-decoration:none}
a.card:hover{border-color:var(--accent)}.card .ic{color:var(--accent)}.card h2{font-size:18px;margin:4px 0 0}.card p{margin:0;color:var(--fg2);font-size:15px;flex:1}
.card .go{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--accent);font-size:15px}.card .soon{color:var(--fg3);font-weight:500;font-size:14px}
.note{margin:40px auto 0;max-width:640px;text-align:center;color:var(--fg3);font-size:14px}
.top{display:flex;align-items:center;gap:8px;margin-bottom:24px}.top>a{text-decoration:none;display:flex;align-items:center;gap:10px;font-weight:700}.top .meta a{text-decoration:none}.top svg{width:26px;height:26px}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 20px}.bar a{padding:6px 12px;border-radius:999px;border:1px solid var(--line);text-decoration:none;font-size:14px;color:var(--fg2);background:var(--card)}.bar a.on{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
.bar form{margin-left:auto;display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:4px 12px;background:var(--card)}.bar input{border:0;background:none;color:inherit;font:inherit;font-size:14px;width:180px;outline:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.item{display:flex;flex-direction:column;gap:4px;padding:8px 8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card);text-decoration:none}.item:hover{border-color:var(--accent)}
.thumb{position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:var(--line);margin-bottom:6px}.thumb iframe{position:absolute;top:0;left:0;width:500%;height:500%;transform:scale(.2);transform-origin:0 0;border:0;pointer-events:none;background:#fff}
.item b{padding:0 4px}.meta{padding:0 4px;font-size:13px;color:var(--fg3)}.pill{display:inline-block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--accent)}
.detail{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px}.detail iframe{width:100%;height:72vh;border:1px solid var(--line);border-radius:12px;background:#fff}
.side{display:flex;flex-direction:column;gap:12px}.side h1{font-size:24px;margin:0}.side p{margin:0;color:var(--fg2)}.side code{font:14px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:2px 6px}
.box{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:14px;font-size:14px;color:var(--fg2)}.box b{color:var(--fg)}
.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--accent-fg);background:var(--accent);border-radius:999px;padding:2px 8px;margin-left:6px;vertical-align:middle}.badge .ic{color:inherit}
.links{display:flex;flex-direction:column;gap:6px;margin:6px 0 0;padding:0;list-style:none}.links a{text-decoration:none;color:var(--fg)}.links a:hover{text-decoration:underline}.links .pill{margin-right:6px}
.empty{color:var(--fg3);padding:40px 0;text-align:center}
@media (max-width:800px){.detail{grid-template-columns:1fr}.bar form{margin-left:0;width:100%}.bar input{flex:1}}`;

const page = (title: string, body: string, description = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${description ? `<meta name="description" content="${esc(description)}">` : ''}<style>${CSS}</style></head><body>${body}</body></html>`;

export const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

export function homePage(cfg: PageConfig, libraryCount: number): string {
  const web = cfg.webUrl
    ? `<a class="card" href="${esc(cfg.webUrl)}">${icon('globe')}<h2>Web version</h2><p>Open Prepress in your browser. Nothing to install.</p><span class="go">Open ${icon('arrow', 16)}</span></a>`
    : `<div class="card">${icon('globe')}<h2>Web version</h2><p>Prepress in your browser, nothing to install.</p><span class="soon">Coming soon</span></div>`;
  const desktop = cfg.downloadMac
    ? `<a class="card" href="${esc(cfg.downloadMac)}">${icon('download')}<h2>Desktop app</h2><p>Prepress for macOS (Apple silicon). Sites are folders on your computer; publish when you're ready.</p><span class="go">Download for Mac ${icon('arrow', 16)}</span></a>`
    : `<div class="card">${icon('download')}<h2>Desktop app</h2><p>Prepress for your computer.</p><span class="soon">Coming soon</span></div>`;
  return page(
    'Prepress — build websites with the WordPress block editor',
    `<main><section class="hero">${LOGO}<h1>Prepress</h1><p>Build a website with the real WordPress block editor, on your own computer. Start from a template, edit visually or let an AI do it over MCP, then publish plain, fast HTML anywhere — or export it to WordPress at any time.</p></section>
<section class="cards">${web}${desktop}<a class="card" href="/library">${icon('library')}<h2>Library</h2><p>Templates, patterns, blocks and styles shared by Prepress users. Import any of them into your site${libraryCount ? ` — ${libraryCount} so far` : ''}.</p><span class="go">Browse ${icon('arrow', 16)}</span></a></section>
<p class="note">Sites published with Prepress's free hosting live at <b>your-name.${esc(cfg.domain)}</b>. Pick a name when you publish; it stays yours for as long as you publish from the same site.</p></main>`,
    'Build websites with the WordPress block editor on your computer, publish plain HTML anywhere.',
  );
}

const TYPE_LABEL: Record<string, string> = { template: 'Template', pattern: 'Pattern', block: 'Block', style: 'Style' };
const TYPE_PLURAL: Record<string, string> = { template: 'Templates', pattern: 'Patterns', block: 'Blocks', style: 'Styles' };

const badge = (on?: boolean) => (on ? `<span class="badge" title="Published by Prepress">${icon('badge', 12)}By Prepress</span>` : '');

const top = `<div class="top"><a href="/">${LOGO}<span>Prepress</span></a><span class="meta">/ <a href="/library">Library</a></span></div>`;

export function libraryPage(lib: Library, q: URLSearchParams): string {
  const type = q.get('type') ?? '';
  const text = q.get('q') ?? '';
  const official = q.get('official') === '1';
  const { items, total } = lib.list(new URLSearchParams({ type, q: text, limit: '60', sort: q.get('sort') ?? '', official: official ? '1' : '' }));
  const link = (t: string, label: string) => `<a class="${type === t && !official ? 'on' : ''}" href="/library${t ? `?type=${t}` : ''}">${label}</a>`;
  const cards = items
    .map(
      (m) =>
        `<a class="item" href="/library/${m.id}"><div class="thumb"><iframe src="/library/preview/${m.id}" sandbox loading="lazy" tabindex="-1" title=""></iframe></div><span class="meta"><span class="pill">${esc(TYPE_LABEL[m.type])}</span>${badge(m.official)}</span><b>${esc(m.title)}</b><span class="meta">${esc(m.description).slice(0, 120)}</span></a>`,
    )
    .join('');
  return page(
    'Library — Prepress',
    `<main>${top}<div class="bar">${link('', 'All')}${['template', 'pattern', 'block', 'style'].map((t) => link(t, TYPE_PLURAL[t])).join('')}<a class="${official ? 'on' : ''}" href="/library?official=1">By Prepress</a><form action="/library">${type ? `<input type="hidden" name="type" value="${esc(type)}">` : ''}${icon('search', 16)}<input name="q" value="${esc(text)}" placeholder="Search" aria-label="Search"></form></div>
${items.length ? `<div class="grid">${cards}</div>` : `<p class="empty">${total ? '' : 'Nothing here yet. Share something from Prepress: Library → Share.'}</p>`}</main>`,
    'Templates, patterns, blocks and styles for Prepress.',
  );
}

type Brief = { id: string; type: string; title: string; official: boolean };
const linkList = (heading: string, items: Brief[]) =>
  items.length ? `<div class="box"><b>${heading}</b><ul class="links">${items.map((r) => `<li><a href="/library/${esc(r.id)}"><span class="pill">${esc(TYPE_LABEL[r.type])}</span>${esc(r.title)}</a></li>`).join('')}</ul></div>` : '';

export function itemPage(m: Omit<ItemMeta, 'ownerHash' | 'reports' | 'hidden'>, rel: { uses: Brief[]; usedIn: Brief[] } = { uses: [], usedIn: [] }): string {
  return page(
    `${m.title} — Prepress library`,
    `<main>${top}<div class="detail"><iframe src="/library/preview/${m.id}" sandbox title="Preview of ${esc(m.title)}"></iframe>
<aside class="side"><span><span class="pill">${esc(TYPE_LABEL[m.type])}</span>${badge(m.official)}</span><h1>${esc(m.title)}</h1>${m.description ? `<p>${esc(m.description)}</p>` : ''}
${m.tags.length ? `<p class="meta">${m.tags.map((t) => `#${esc(t)}`).join(' ')}</p>` : ''}
<p class="meta">Updated ${esc(m.updatedAt.slice(0, 10))} · ${m.imports} import${m.imports === 1 ? '' : 's'}</p>
${linkList('Built with', rel.uses)}${linkList('Used in', rel.usedIn)}
<div class="box"><b>Use it in Prepress</b><br>Library (toolbar) → search for it, or paste <code>${esc(m.id)}</code>.<br><br><b>With an AI (MCP)</b><br>“Import library item <code>${esc(m.id)}</code> into my site.”</div>
<form method="post" action="/library/${m.id}/report"><button class="meta" style="background:none;border:0;padding:0;cursor:pointer;text-decoration:underline" type="submit">Report this item</button></form>
</aside></div></main>`,
    m.description,
  );
}

export function reportedPage(): string {
  return page('Reported — Prepress library', `<main>${top}<p>Thanks — the item was reported and will be reviewed.</p><p><a href="/library">Back to the library</a></p></main>`);
}
