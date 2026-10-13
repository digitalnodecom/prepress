/**
 * Orchestration: plan → site shell → pages (two at a time) → sections.
 */
import type { BlockNode, Site, SitePlan } from '../types';
import { siteFromPlan, sectionsToMarkup, sectionForAI, sectionLabel, getSections } from '../site';
import type { AI } from './client';
import { AIError } from './client';
import { DEMO_PAGES, DEMO_PLAN } from './demo';
import { addSectionPrompt, editSectionPrompt, pagePrompt, planPrompt } from './prompts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GenerateCallbacks {
  onPlan(site: Site, plan: SitePlan): void;
  onPageStart?(pageId: string): void;
  onPage(pageId: string, markup: string, notes: string[]): void;
  onPageError?(pageId: string, error: unknown): void;
  signal?: AbortSignal;
}

function checkPlan(p: any): SitePlan {
  if (!p || typeof p !== 'object' || !Array.isArray(p.pages) || !p.pages.length) {
    throw new AIError('invalid_json', 'The plan was missing pages');
  }
  return p as SitePlan;
}

export async function generateSite(ai: AI, brief: string, cb: GenerateCallbacks): Promise<void> {
  const demo = ai.kind === 'demo';
  const plan = demo ? DEMO_PLAN : checkPlan(await ai.json(planPrompt(brief), { signal: cb.signal, fresh: true }));
  const site = siteFromPlan(plan);
  cb.onPlan(site, plan);

  const queue = site.pages.map((page, i) => ({ page, spec: plan.pages[i] }));
  const worker = async () => {
    while (queue.length) {
      if (cb.signal?.aborted) return;
      const { page, spec } = queue.shift()!;
      cb.onPageStart?.(page.id);
      try {
        let sections: unknown;
        if (demo) {
          await sleep(350);
          sections = DEMO_PAGES[page.slug] ?? [];
        } else {
          const res = await ai.json<{ sections: unknown }>(pagePrompt(site, brief, spec), { signal: cb.signal, fresh: true });
          sections = (res as any)?.sections ?? res;
        }
        const { markup, report } = sectionsToMarkup(sections, site.design);
        cb.onPage(page.id, markup, [...report.repaired, ...report.dropped.map((d) => `dropped ${d}`)]);
      } catch (e) {
        if ((e as any)?.code === 'cancelled') return;
        cb.onPageError?.(page.id, e);
      }
    }
  };
  await Promise.all([worker(), worker()]);
}

export async function editSection(ai: AI, site: Site, brief: string, pageId: string, index: number, instruction: string, signal?: AbortSignal) {
  const page = site.pages.find((p) => p.id === pageId)!;
  const current = sectionForAI(getSections(page)[index]);
  const res = await ai.json<{ section: unknown }>(editSectionPrompt(site, brief, page.title, current as BlockNode[], instruction), { signal, fresh: true });
  const spec = (res as any)?.section ?? res;
  return sectionsToMarkup([spec], site.design);
}

export async function newSection(ai: AI, site: Site, brief: string, pageId: string, instruction: string, signal?: AbortSignal) {
  const page = site.pages.find((p) => p.id === pageId)!;
  const labels = getSections(page).map(sectionLabel);
  const res = await ai.json<{ section: unknown }>(addSectionPrompt(site, brief, page.title, labels, instruction), { signal, fresh: true });
  const spec = (res as any)?.section ?? res;
  return sectionsToMarkup([spec], site.design);
}

export async function writePage(ai: AI, site: Site, brief: string, pageId: string, purpose: string, signal?: AbortSignal) {
  const page = site.pages.find((p) => p.id === pageId)!;
  const res = await ai.json<{ sections: unknown }>(pagePrompt(site, brief, { title: page.title, purpose }), { signal, fresh: true });
  return sectionsToMarkup((res as any)?.sections ?? res, site.design);
}
