import { expect, test } from 'vitest';
import { generateSite, editSection } from '../src/lib/ai/generate';
import { planPrompt, pagePrompt } from '../src/lib/ai/prompts';
import { extractJson, type AI } from '../src/lib/ai/client';
import { setPageContent, getSections } from '../src/lib/site';
import { validateMarkup } from '../src/lib/wp/markup';
import type { Site } from '../src/lib/types';

/** A fake model that answers like Claude would (fenced JSON, some sloppiness). */
function fakeAI(): AI & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    kind: 'proxy',
    prompts,
    async json(prompt: string) {
      prompts.push(prompt);
      if (prompt.includes('Plan a small website')) {
        return extractJson('Here you go:\n```json\n' + JSON.stringify({
          name: 'Ridge Physio', tagline: 'Run further, hurt less',
          design: { palette: { base: '#ffffff', contrast: '#0d1b1e', primary: '#0f5c63', secondary: '#d7e7e5', accent: '#e07a3f', muted: '#f2f7f6' }, headingFont: 'manrope', bodyFont: 'inter', radius: 'round' },
          pages: [
            { title: 'Home', slug: 'home', purpose: 'x', sections: ['hero-split: ...', 'features-grid: ...'] },
            { title: 'Book a session', slug: 'book', purpose: 'x', sections: ['contact: ...'] },
          ],
        }) + '\n```') as any;
      }
      if (prompt.includes('You are editing one section')) {
        return { section: { pattern: 'cta-band', props: { heading: 'Edited', primaryCta: { label: 'Book', url: '/book/' }, tone: 'contrast' } } } as any;
      }
      return {
        sections: [
          { pattern: 'hero-split', props: { heading: 'Run pain-free', text: 'Sports physio for runners.', primaryCta: { label: 'Book', url: '/book/' }, imageLabel: 'Runner stretching' } },
          { name: 'core/group', attributes: { align: 'full', layout: { type: 'constrained' }, backgroundColor: 'muted' }, innerBlocks: [
            { name: 'core/heading', attributes: { content: 'Raw block section', textAlign: 'center' } },
            { name: 'core/columns', innerBlocks: [{ name: 'core/column', innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'One' } }] }, { name: 'core/column', innerBlocks: [{ name: 'core/image', attributes: { alt: 'Clinic' } }] }] },
          ] },
          { pattern: 'not-a-pattern', props: {} },
        ],
      } as any;
    },
  };
}

test('prompts mention patterns and pages', () => {
  expect(planPrompt('A bakery')).toContain('hero-split');
});

test('AI generation path: plan → pages → edit, all valid', async () => {
  const ai = fakeAI();
  let site!: Site;
  const notes: string[] = [];
  await generateSite(ai, 'Physio for runners in Leeds', {
    onPlan: (s) => (site = s),
    onPage: (id, m, n) => { site = setPageContent(site, id, m); notes.push(...n); },
    onPageError: (_id, e) => { throw e; },
  });
  expect(site.name).toBe('Ridge Physio');
  expect(site.design.headingFont).toBe('manrope');
  expect(site.pages.map((p) => p.slug)).toEqual(['home', 'book']);
  expect(ai.prompts.some((p) => p.includes('/book/'))).toBe(true);
  for (const p of site.pages) expect(validateMarkup(p.content).invalid).toEqual([]);
  expect(notes).toContain('dropped pattern:not-a-pattern');
  expect(getSections(site.pages[0]).length).toBe(2);
  // header gets a CTA button for the booking page
  expect(site.header).toContain('Book a session');

  const { markup } = await editSection(ai, site, 'brief', site.pages[0].id, 1, 'make it a CTA');
  expect(markup).toContain('Edited');
  expect(validateMarkup(markup).invalid).toEqual([]);
  expect(ai.prompts.at(-1)).toContain('Raw block section'); // current section was sent as context
});
