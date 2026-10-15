import { describe, expect, test } from 'vitest';
import { parse, serialize } from '@wordpress/blocks';
import { generateSite } from '../src/lib/ai/generate';
import { DEMO_BRIEF } from '../src/lib/ai/demo';
import type { Site } from '../src/lib/types';
import { setPageContent } from '../src/lib/site';
import { ensureBlocks } from '../src/lib/wp/registry';
import { AREA_BLOCK, areaBlocks, registerAreaBlock, splitAreas } from '../src/ui/editor/templateAreas';

async function demoSite(): Promise<Site> {
  let site!: Site;
  await generateSite({ kind: 'demo', json: async () => { throw new Error('x'); } }, DEMO_BRIEF, {
    onPlan: (s) => { site = s; },
    onPage: (id, markup) => { site = setPageContent(site, id, markup); },
  });
  return site;
}

describe('page editor with header/footer (template areas)', () => {
  test('areas round-trip each part unchanged and never leak the wrapper block', async () => {
    ensureBlocks();
    registerAreaBlock();
    const site = await demoSite();
    for (const page of site.pages) {
      const blocks = areaBlocks({ header: site.header, content: page.content, footer: site.footer });
      expect(blocks.map((b) => [b.name, b.attributes.area, b.attributes.lock])).toEqual([
        [AREA_BLOCK, 'header', { move: true, remove: true }],
        [AREA_BLOCK, 'content', { move: true, remove: true }],
        [AREA_BLOCK, 'footer', { move: true, remove: true }],
      ]);
      const out = splitAreas(blocks);
      // Same as what the editor emits without the template shown (serialize(parse(x))).
      expect(out.header).toBe(serialize(parse(site.header)));
      expect(out.footer).toBe(serialize(parse(site.footer)));
      expect(out.content).toBe(serialize(parse(page.content)));
      for (const m of Object.values(out)) expect(m).not.toContain('prepress-editor');
    }
  });
});
