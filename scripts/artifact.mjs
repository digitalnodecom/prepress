// Turns the single-file Vite build into an Artifact page body:
// strips the <!doctype>/<html>/<head>/<body> skeleton (the host adds its own)
// and keeps <title>, font links, styles and the inlined app script.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
// Inline scripts may contain the strings "</head>" or "<body>", so anchor on the outermost tags.
const headStart = html.indexOf('<head>') + '<head>'.length;
const headEnd = html.lastIndexOf('</head>');
const head = html.slice(headStart, headEnd);
const bodyStart = html.indexOf('<body>', headEnd) + '<body>'.length;
const body = html.slice(bodyStart, html.lastIndexOf('</body>'));
const keepHead = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .trim();
// Move the title first so the host finds it in the first 8 KB.
const title = keepHead.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>Prepress</title>';
const rest = keepHead.replace(title, '');
// Literal U+FFFD characters (from bundled libraries) are escaped; they only occur in JS strings/regexes.
const out = `${title}\n${rest}\n${body}`.replace(/\uFFFD/g, '\\uFFFD');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/prepress.html', out);
console.log(`dist/prepress.html ${(out.length / 1024 / 1024).toFixed(2)} MB`);
