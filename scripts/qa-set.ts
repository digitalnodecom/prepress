// Visual QA for a library set, with the production renderer (dist/engine) and headless Chrome.
//   npm run build && npx bun scripts/qa-set.ts <set> <out-dir> [page:home,pattern:hero,...] [--motion]
// Screenshots are taken with reduced motion (the settled state) unless --motion.
import '../server/dom.ts';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-ignore -- build artifact
import * as engine from '../dist/engine/engine.js';
import { screenshot } from '../server/screenshot.ts';
import { SETS as ALL } from '../library-sets/index.ts';

const SETS: Record<string, unknown> = ALL;
const [name, out, onlyArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const motion = process.argv.includes('--motion');
const only = onlyArg ? onlyArg.split(',') : null;
mkdirSync(out, { recursive: true });
const built = engine.buildLibrarySet(SETS[name]);
if (built.report.length) console.log('normalizer notes:', built.report);
const uploads = mkdtempSync(join(tmpdir(), 'qa-up-'));
const shoot = async (file: string, html: string, device: 'desktop' | 'phone', fullPage = true) => {
  const s = await screenshot({ html, uploadsDir: uploads, device, fullPage, reducedMotion: !motion });
  writeFileSync(join(out, file), Buffer.from(s.data, 'base64'));
  console.log(file, `${s.width}×${s.height}`, s.scale < 1 ? `(scaled ${s.scale})` : '');
};
for (const page of built.site.pages) {
  if (only && !only.includes(`page:${page.slug}`)) continue;
  const html = engine.renderPage(built.site, page, {});
  await shoot(`page-${page.slug}-desktop.jpg`, html, 'desktop');
  await shoot(`page-${page.slug}-phone.jpg`, html, 'phone');
}
for (const item of built.items) {
  if (item.draft.type === 'template' || (only && !only.includes(item.key))) continue;
  await shoot(`${item.key.replace(':', '-')}.jpg`, item.draft.preview, 'desktop');
}
