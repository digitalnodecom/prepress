/**
 * Targets that take the whole site at once (Cloudflare Pages deployments,
 * GitHub Pages commits) instead of file-by-file writes through `Remote`.
 */

/** What a whole-site publish did. */
export interface SiteUpload {
  uploaded: number;
  unchanged: number;
  removed: number;
  /** Where the site is served, when the host decides it (e.g. <project>-x1y.pages.dev). */
  siteUrl?: string;
}

const REBASE_ATTR = /(\s(?:href|src|poster|action|content|data-[\w-]+)\s*=\s*)(["'])\/(?![/\\])/gi;
const REBASE_SRCSET = /(\ssrcset\s*=\s*)(["'])([^"']*)\2/gi;
const REBASE_CSS_URL = /url\(\s*(&quot;|&#39;|["'])?\/(?![/\\])/gi;

/**
 * Root-relative URLs ("/about/", "/uploads/x.jpg") moved under `base`
 * ("/my-site/about/"), for a site served from a sub-path such as a GitHub
 * project page (owner.github.io/my-site/). HTML and CSS only; "//host" and
 * full URLs are left alone.
 */
export function rebase(rel: string, data: Buffer, base: string): Buffer {
  const b = base.replace(/\/+$/, '');
  if (!b || !/\.(html|css)$/i.test(rel)) return data;
  const s = data
    .toString('utf8')
    .replace(REBASE_ATTR, `$1$2${b}/`)
    .replace(REBASE_SRCSET, (_, a: string, q: string, v: string) => a + q + v.replace(/(^|,\s*)\/(?![/\\])/g, `$1${b}/`) + q)
    .replace(REBASE_CSS_URL, (_, q = '') => `url(${q}${b}/`);
  return Buffer.from(s, 'utf8');
}
