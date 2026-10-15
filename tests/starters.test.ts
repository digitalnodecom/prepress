import { describe, expect, test } from 'vitest';
import { STARTERS, buildStarter, starterCatalog } from '../src/lib/starters';
import { validateMarkup } from '../src/lib/wp/markup';
import { renderPage } from '../src/lib/wp/render';

describe('starter templates', () => {
  test('there is a blank starter first, and ids are unique', () => {
    expect(STARTERS[0].id).toBe('blank');
    expect(new Set(STARTERS.map((s) => s.id)).size).toBe(STARTERS.length);
    expect(starterCatalog().every((s) => s.title && s.description && s.pages.length)).toBe(true);
  });

  for (const s of STARTERS) {
    test(`${s.id}: valid blocks, name filled in, no dead links`, () => {
      const { site, brief, report } = buildStarter(s.id, { name: 'Acme Test Co', about: 'We sell anvils.' });
      expect(report).toEqual([]);
      expect(site.name).toBe('Acme Test Co');
      expect(brief).toContain('Acme Test Co');
      expect(brief).toContain('We sell anvils.');
      const all = [site.header, site.footer, ...site.pages.map((p) => p.content)];
      for (const markup of all) {
        const v = validateMarkup(markup);
        expect(v.invalid).toEqual([]);
        expect(markup).not.toContain('{name}');
        expect(markup).not.toContain(s.sampleName === 'Acme Test Co' ? '§' : s.sampleName);
      }
      expect(site.pages.every((p) => p.content.trim())).toBe(true);
      // Every internal link points at a page of this site.
      const urls = new Set(['/', ...site.pages.map((p) => `/${p.slug}/`)]);
      for (const p of site.pages) {
        const html = renderPage(site, p);
        for (const [, href] of html.matchAll(/href="(\/[^"#]*)"/g)) if (!href.startsWith('/uploads/')) expect(urls, `${p.slug} → ${href}`).toContain(href);
      }
    });
  }

  test('unknown starter is a clear error', () => {
    expect(() => buildStarter('nope')).toThrow(/Unknown starter "nope"/);
  });
});
