/**
 * MCP server (Streamable HTTP, stateless) — lets an AI read and change the
 * whole site: pages, sections, header/footer, design, theme.json, custom
 * blocks, patterns; then publish or export it.
 *
 * Every write goes through the draft store (rev bump + live update in open
 * editors) and the same normalize → serialize path as the editor's AI, so
 * the stored content is always valid WordPress block markup.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Engine } from './app.ts';
import type { DraftStore, StoredDraft } from './store.ts';

export interface McpContext {
  store: DraftStore;
  engine: Engine;
  publishSite(by: string, opt?: { deploy?: boolean }): Promise<unknown>;
  exportWordPress(): Promise<{ file: string; path: string; stats: unknown }>;
  /** Push the published files to deploy targets (server/deploy.ts). */
  deploy(which?: string, full?: boolean): Promise<unknown[]>;
  deployTargets(): { id: string; name: string; type: string; url?: string; auto: boolean; last: unknown }[];
  siteUrl?: string;
}

type Site = any;

const INSTRUCTIONS = `Prepress edits a website whose content is WordPress block markup (Gutenberg). You never write HTML for content: send JSON block trees or pattern calls and Prepress serializes them with WordPress's own code.

Workflow: get_site → get_block_catalog (blocks, attribute names, preset slugs, built-in section patterns, custom blocks) → edit with the tools → validate_site → publish_site (renders the static site and deploys it to the auto deploy targets) or export_wordpress. deploy_site re-pushes the last publish to a target.

Content shape: a page is a list of sections. Each section is either
  - a pattern call: {"pattern":"hero-split","props":{...}}  (see get_block_catalog.patterns), or
  - a block tree:   {"name":"core/group","attributes":{...},"innerBlocks":[...]}.
Use preset slugs, never raw values: "backgroundColor":"primary", "fontSize":"large", spacing "var:preset|spacing|50".
Unknown blocks/attributes are dropped and reported back in "report" — read it and fix your input.

Custom blocks (define_block) are site-defined block types "prepress/<slug>" with typed attributes and an HTML template:
  {{key}} escaped value · {{#key}}…{{/key}} if truthy · {{^key}}…{{/key}} if falsy · {{{content}}} inner blocks.
Use them in sections like any block: {"name":"prepress/pricing-card","attributes":{"price":"$9"}}. They render on the published site, in the editor, and ship inside the exported WordPress theme.
Patterns (create_pattern): reusable sections. Synced ones are inserted with {"name":"core/block","attributes":{"ref":<id>}} and update everywhere.
theme.json (patch_theme_json): deep-merged over the generated theme.json (objects merge, arrays replace, null deletes).`;

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: String((e as any)?.message ?? e) }] });

const sectionSchema = z.any().describe('A pattern call {"pattern","props"} or a block tree {"name","attributes","innerBlocks"}');
const sectionsSchema = z.array(sectionSchema).describe('Sections, top to bottom');
const pageRef = z.string().describe('Page id, slug ("home" = front page) or title');

export function createMcpHandler(ctx: McpContext) {
  const { store, engine: e } = ctx;

  const draft = (): StoredDraft => {
    const d = store.read();
    if (!d?.site?.pages) throw new Error('There is no site yet. Open the editor once to create it.');
    e.registerCustomBlocks(d.site.blocks ?? []);
    return d;
  };

  const findPage = (site: Site, ref: string) => {
    const r = String(ref ?? '').trim().toLowerCase();
    const p = site.pages.find((x: any) => x.id === ref || x.slug === r || x.title.toLowerCase() === r || (r === '/' && x.slug === 'home'));
    if (!p) throw new Error(`No page "${ref}". Pages: ${site.pages.map((x: any) => `${x.slug} (${x.title})`).join(', ')}`);
    return p;
  };

  const findPattern = (site: Site, ref: string | number) => {
    const p = (site.patterns ?? []).find((x: any) => x.id === Number(ref) || x.slug === String(ref));
    if (!p) throw new Error(`No pattern "${ref}"`);
    return p;
  };

  const sectionsMarkup = (site: Site, sections: unknown, allowed?: readonly string[]) => {
    const report = { dropped: [] as string[], repaired: [] as string[] };
    const nodes = e.normalizeSections(sections, { design: site.design, report, ...(allowed ? { allowed: [...allowed, ...customNames(site)] } : {}) });
    return { markup: e.toMarkup(nodes), report };
  };

  const customNames = (site: Site): string[] => (site.blocks ?? []).map((b: any) => b.name);

  function validation(site: Site) {
    const invalid: { where: string; block: string; issue: string }[] = [];
    let blocks = 0;
    const check = (where: string, markup: string) => {
      const v = e.validateMarkup(markup);
      blocks += v.blocks;
      for (const i of v.invalid) invalid.push({ where, block: i.name, issue: i.issue });
    };
    for (const p of site.pages) check(`page:${p.slug}`, p.content);
    check('part:header', site.header);
    check('part:footer', site.footer);
    for (const p of site.patterns ?? []) check(`pattern:${p.slug}`, p.content);
    const known = new Set((site.patterns ?? []).filter((p: any) => p.synced).map((p: any) => p.id));
    const brokenRefs = [...JSON.stringify(site).matchAll(/wp:block \{\\"ref\\":(\d+)/g)].map((m) => Number(m[1])).filter((id) => !known.has(id));
    return { blocks, invalid, ...(brokenRefs.length ? { brokenPatternRefs: [...new Set(brokenRefs)] } : {}) };
  }

  /** Apply a change to the draft and report the result. */
  async function change(summary: string, fn: (site: Site) => { site: Site; result?: Record<string, unknown> }) {
    let out: Record<string, unknown> = {};
    const d = await store.update('mcp', (cur) => {
      e.registerCustomBlocks(cur.site.blocks ?? []);
      const { site, result } = fn(cur.site);
      e.registerCustomBlocks(site.blocks ?? []);
      out = result ?? {};
      return { site, summary };
    });
    return ok({ ok: true, summary, rev: d.rev, ...out, validation: validation(d.site) });
  }

  const wrap =
    <A,>(fn: (args: A) => unknown | Promise<unknown>) =>
    async (args: A) => {
      try {
        const r = await fn(args);
        return (r as any)?.content ? (r as any) : ok(r);
      } catch (err) {
        return fail(err);
      }
    };

  function build() {
    const server = new McpServer({ name: 'prepress', version: '0.3.0' }, { instructions: INSTRUCTIONS });
    const tool = (name: string, description: string, inputSchema: Record<string, z.ZodTypeAny>, fn: (args: any) => unknown, readOnly = false) =>
      server.registerTool(name, { description, inputSchema, annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly && /delete|reset/.test(name) } }, wrap(fn) as any);

    // ---------- read ----------
    tool('get_site', 'Overview: name, tagline, pages, header/footer status, custom blocks, patterns, publish info, revision.', {}, () => {
      const { site, rev } = draft();
      return {
        rev,
        name: site.name,
        tagline: site.tagline,
        siteUrl: ctx.siteUrl ?? null,
        pages: site.pages.map((p: any) => ({ id: p.id, title: p.title, slug: p.slug, url: e.pageUrl(p.slug), sections: e.getSections(p).map(e.sectionLabel) })),
        parts: { header: site.custom?.header ? 'custom' : 'generated', footer: site.custom?.footer ? 'custom' : 'generated' },
        design: site.design,
        customBlocks: (site.blocks ?? []).map((b: any) => ({ name: b.name, title: b.title, attributes: Object.keys(b.attributes), usedIn: e.blockUsage(site, b.name) })),
        patterns: (site.patterns ?? []).map((p: any) => ({ id: p.id, slug: p.slug, title: p.title, synced: p.synced })),
        themeJsonPatched: !!site.themeJson,
        deployTargets: ctx.deployTargets().map((t) => ({ name: t.name, type: t.type, url: t.url ?? null, auto: t.auto, last: t.last })),
      };
    }, true);

    tool('get_page', 'A page as editable sections (compact block trees, defaults stripped). Use the section index with replace_section/insert_section.', { page: pageRef, markup: z.boolean().optional().describe('Also return the raw block markup') }, ({ page, markup }) => {
      const { site } = draft();
      const p = findPage(site, page);
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        sections: e.getSections(p).map((s: string, index: number) => ({ index, label: e.sectionLabel(s), blocks: e.markupToNodes(s, true) })),
        ...(markup ? { markup: p.content } : {}),
      };
    }, true);

    tool('get_part', 'The header or footer template part as block trees.', { part: z.enum(['header', 'footer']) }, ({ part }) => {
      const { site } = draft();
      return { part, custom: !!site.custom?.[part], blocks: e.markupToNodes(site[part], true) };
    }, true);

    tool('get_theme_json', 'The theme.json that ships with the site (generated from design + your patch), and the patch itself.', {}, () => {
      const { site } = draft();
      return { themeJson: e.themeJsonFor(site.design, site.themeJson), patch: site.themeJson ?? null };
    }, true);

    tool('get_block_catalog', 'What you can use: core blocks with their attributes, built-in section patterns, custom blocks, site patterns and preset slugs.', {}, () => {
      const { site } = draft();
      const tj: any = e.themeJsonFor(site.design, site.themeJson);
      return {
        coreBlocks: e.AI_BLOCKS.map((name: string) => ({ name, attributes: e.blockAttributeNames(name) })),
        partOnlyBlocks: e.PART_BLOCKS.filter((b: string) => !(e.AI_BLOCKS as readonly string[]).includes(b)),
        sectionPatterns: e.patternCatalogForPrompt(),
        customBlocks: site.blocks ?? [],
        sitePatterns: (site.patterns ?? []).map((p: any) => ({ id: p.id, slug: p.slug, title: p.title, synced: p.synced, insertWith: p.synced ? { name: 'core/block', attributes: { ref: p.id } } : 'use get_pattern content or create a section' })),
        presets: {
          colors: (tj.settings?.color?.palette ?? []).map((c: any) => c.slug),
          gradients: (tj.settings?.color?.gradients ?? []).map((g: any) => g.slug),
          fontSizes: (tj.settings?.typography?.fontSizes ?? []).map((f: any) => f.slug),
          fontFamilies: (tj.settings?.typography?.fontFamilies ?? []).map((f: any) => f.slug),
          spacing: (tj.settings?.spacing?.spacingSizes ?? []).map((s: any) => `var:preset|spacing|${s.slug}`),
        },
        fonts: Object.keys(e.FONTS),
      };
    }, true);

    tool('validate_site', 'Run WordPress’s block validator over every page, part and pattern.', {}, () => validation(draft().site), true);

    // ---------- pages ----------
    tool('create_page', 'Add a page (added to the menu automatically). Optionally give its sections.', { title: z.string(), slug: z.string().optional(), sections: sectionsSchema.optional() }, ({ title, slug, sections }) =>
      change(`Added page “${title}”`, (site) => {
        let { site: next, page } = e.addPage(site, title);
        if (slug) next = e.updatePage(next, page.id, { slug });
        const p = next.pages.find((x: any) => x.id === page.id)!;
        let report;
        if (sections) {
          const r = sectionsMarkup(next, sections);
          report = r.report;
          next = e.setPageContent(next, page.id, r.markup);
        }
        return { site: next, result: { page: { id: p.id, slug: p.slug, url: e.pageUrl(p.slug) }, report } };
      }),
    );

    tool('update_page', 'Rename a page or change its URL slug (menus follow).', { page: pageRef, title: z.string().optional(), slug: z.string().optional() }, ({ page, title, slug }) =>
      change(`Updated page ${page}`, (site) => {
        const p = findPage(site, page);
        const next = e.updatePage(site, p.id, { title, slug });
        const q = next.pages.find((x: any) => x.id === p.id)!;
        return { site: next, result: { page: { id: q.id, title: q.title, slug: q.slug } } };
      }),
    );

    tool('delete_page', 'Delete a page (not the front page).', { page: pageRef }, ({ page }) =>
      change(`Deleted page ${page}`, (site) => {
        const p = findPage(site, page);
        if (p.slug === 'home') throw new Error('The front page cannot be deleted');
        return { site: e.removePage(site, p.id) };
      }),
    );

    tool('set_page_content', 'Replace all sections of a page.', { page: pageRef, sections: sectionsSchema }, ({ page, sections }) =>
      change(`Rewrote ${page}`, (site) => {
        const p = findPage(site, page);
        const { markup, report } = sectionsMarkup(site, sections);
        return { site: e.setPageContent(site, p.id, markup), result: { report } };
      }),
    );

    tool('insert_section', 'Insert section(s) at an index (0 = top; omit for the end).', { page: pageRef, index: z.number().int().optional(), sections: sectionsSchema }, ({ page, index, sections }) =>
      change(`Added a section to ${page}`, (site) => {
        const p = findPage(site, page);
        const { markup, report } = sectionsMarkup(site, sections);
        const at = index ?? e.getSections(p).length;
        return { site: e.insertSection(site, p.id, at, markup), result: { report, index: at } };
      }),
    );

    tool('replace_section', 'Replace the section at an index with new section(s).', { page: pageRef, index: z.number().int(), sections: sectionsSchema }, ({ page, index, sections }) =>
      change(`Edited section ${index} of ${page}`, (site) => {
        const p = findPage(site, page);
        if (index < 0 || index >= e.getSections(p).length) throw new Error(`Section index ${index} is out of range`);
        const { markup, report } = sectionsMarkup(site, sections);
        return { site: e.replaceSection(site, p.id, index, markup), result: { report } };
      }),
    );

    tool('remove_section', 'Delete the section at an index.', { page: pageRef, index: z.number().int() }, ({ page, index }) =>
      change(`Removed section ${index} of ${page}`, (site) => {
        const p = findPage(site, page);
        if (index < 0 || index >= e.getSections(p).length) throw new Error(`Section index ${index} is out of range`);
        return { site: e.removeSection(site, p.id, index) };
      }),
    );

    tool('move_section', 'Move a section to another index.', { page: pageRef, from: z.number().int(), to: z.number().int() }, ({ page, from, to }) =>
      change(`Moved a section on ${page}`, (site) => {
        const p = findPage(site, page);
        const list = e.getSections(p);
        if (from < 0 || from >= list.length || to < 0 || to >= list.length) throw new Error('Section index out of range');
        const [s] = list.splice(from, 1);
        list.splice(to, 0, s);
        return { site: e.setPageContent(site, p.id, e.joinSections(list)) };
      }),
    );

    // ---------- header / footer ----------
    tool('set_part', 'Replace the header or footer. Can use core/site-title, core/site-tagline, core/navigation (with core/navigation-link children) besides content blocks. The part stops being auto-generated.', { part: z.enum(['header', 'footer']), blocks: sectionsSchema }, ({ part, blocks }) =>
      change(`Edited the ${part}`, (site) => {
        const { markup, report } = sectionsMarkup(site, blocks, e.PART_BLOCKS);
        return { site: e.setPart(site, part, markup), result: { report } };
      }),
    );

    tool('reset_part', 'Go back to the automatically generated header or footer.', { part: z.enum(['header', 'footer']) }, ({ part }) => change(`Reset the ${part}`, (site) => ({ site: e.resetPart(site, part) })));

    // ---------- site & design ----------
    tool('set_site_info', 'Change the site title and/or tagline.', { name: z.string().optional(), tagline: z.string().optional() }, ({ name, tagline }) =>
      change('Updated site title/tagline', (site) => ({ site: e.rebuildParts({ ...site, name: name ?? site.name, tagline: tagline ?? site.tagline }) })),
    );

    tool(
      'set_design',
      'Change design tokens: palette (base, contrast, primary, secondary, accent, muted as hex), headingFont/bodyFont (see get_block_catalog.fonts), radius (none|soft|round), contentSize/wideSize. Restyles all content.',
      { palette: z.record(z.string(), z.string()).optional(), headingFont: z.string().optional(), bodyFont: z.string().optional(), radius: z.enum(['none', 'soft', 'round']).optional(), contentSize: z.string().optional(), wideSize: z.string().optional() },
      (args) =>
        change('Changed the design', (site) => {
          const d = e.sanitizeDesign({ ...site.design, ...args, palette: { ...site.design.palette, ...(args.palette ?? {}) } });
          return { site: e.applyDesign(site, d), result: { design: d } };
        }),
    );

    tool('patch_theme_json', 'Deep-merge a patch into theme.json (settings, styles, customTemplates…). Objects merge, arrays replace, null deletes a key.', { patch: z.record(z.string(), z.any()) }, ({ patch }) =>
      change('Patched theme.json', (site) => {
        const next = e.patchThemeJson(site, patch);
        return { site: next, result: { patch: next.themeJson } };
      }),
    );

    tool('reset_theme_json', 'Remove your theme.json patch (back to the generated theme.json).', {}, () => change('Reset theme.json', (site) => ({ site: e.resetThemeJson(site) })));

    // ---------- custom blocks ----------
    tool(
      'define_block',
      'Create or replace a custom block type "prepress/<slug>". attributes: {key: {type: string|number|boolean, default?, label?, control?: text|textarea|richtext|url|image|toggle|number|select, options?}}. template: HTML with {{key}}, {{#key}}…{{/key}}, {{^key}}…{{/key}}, {{{content}}} (inner blocks). css: optional, prefer preset vars like var(--wp--preset--color--primary).',
      {
        name: z.string(),
        title: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        category: z.enum(['text', 'media', 'design', 'widgets', 'theme']).optional(),
        attributes: z.record(z.string(), z.any()).optional(),
        template: z.string(),
        css: z.string().optional(),
        innerBlocks: z.object({ allowed: z.array(z.string()).optional(), template: z.array(z.any()).optional() }).optional(),
      },
      (args) =>
        change(`Defined block ${args.name}`, (site) => {
          const { site: next, block } = e.defineBlock(site, args);
          return { site: next, result: { block } };
        }),
    );

    tool('delete_block', 'Delete a custom block type. If it is used anywhere, pass removeUses: true to also delete its instances.', { name: z.string(), removeUses: z.boolean().optional() }, ({ name, removeUses }) =>
      change(`Deleted block ${name}`, (site) => ({ site: e.deleteBlock(site, name.includes('/') ? name : `prepress/${name}`, !!removeUses) })),
    );

    // ---------- patterns ----------
    tool('create_pattern', 'Create a reusable pattern from sections. synced: true = one shared copy (insert with {"name":"core/block","attributes":{"ref":id}}); false = a starting point in the inserter.', { title: z.string(), slug: z.string().optional(), description: z.string().optional(), synced: z.boolean().optional(), sections: sectionsSchema }, ({ title, slug, description, synced, sections }) =>
      change(`Created pattern “${title}”`, (site) => {
        const { markup, report } = sectionsMarkup(site, sections);
        const { site: next, pattern } = e.createPattern(site, { title, slug, description, synced, content: markup });
        return { site: next, result: { pattern: { id: pattern.id, slug: pattern.slug, synced: pattern.synced }, report } };
      }),
    );

    tool('get_pattern', 'A pattern’s content as block trees.', { pattern: z.union([z.string(), z.number()]) }, ({ pattern }) => {
      const { site } = draft();
      const p = findPattern(site, pattern);
      return { ...p, content: undefined, blocks: e.markupToNodes(p.content, true) };
    }, true);

    tool('update_pattern', 'Change a pattern (content, title, description, synced). Synced changes show everywhere it is used.', { pattern: z.union([z.string(), z.number()]), title: z.string().optional(), description: z.string().optional(), synced: z.boolean().optional(), sections: sectionsSchema.optional() }, ({ pattern, title, description, synced, sections }) =>
      change(`Updated pattern ${pattern}`, (site) => {
        const p = findPattern(site, pattern);
        const patch: Record<string, unknown> = {};
        if (title !== undefined) patch.title = title;
        if (description !== undefined) patch.description = description;
        if (synced !== undefined) patch.synced = synced;
        let report;
        if (sections) {
          const r = sectionsMarkup(site, sections);
          patch.content = r.markup;
          report = r.report;
        }
        return { site: e.updatePattern(site, p.id, patch), result: { report } };
      }),
    );

    tool('delete_pattern', 'Delete a pattern. Pages using a synced pattern keep a copy of its content.', { pattern: z.union([z.string(), z.number()]) }, ({ pattern }) =>
      change(`Deleted pattern ${pattern}`, (site) => ({ site: e.deletePattern(site, findPattern(site, pattern).id) })),
    );

    // ---------- ship ----------
    tool(
      'publish_site',
      'Render every page to static HTML, write it to the publish folder, then deploy it to every deploy target marked auto (local folders / SFTP servers set up by the site owner). Run validate_site first. Check each entry of "deploys" for ok/error.',
      { deploy: z.boolean().optional().describe('false = only write the publish folder, skip deploy targets') },
      async ({ deploy }) => {
        draft();
        return ctx.publishSite('mcp', { deploy });
      },
    );

    tool(
      'deploy_site',
      'Push the last published version to deploy targets without re-rendering. Targets are configured by the site owner in the editor (Site tab → Deploy); see get_site.deployTargets.',
      {
        target: z.string().optional().describe('Target name or id; omit for all targets'),
        full: z.boolean().optional().describe('Re-upload every file, not only changed ones'),
      },
      async ({ target, full }) => ({ deploys: await ctx.deploy(target ?? 'all', !!full) }),
    );

    tool('export_wordpress', 'Build the WordPress export (block theme with custom blocks and patterns + content.xml + site.json). Returns a download path (send the same bearer token).', {}, async () => {
      draft();
      return ctx.exportWordPress();
    });

    return server;
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json', allow: 'POST' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed (stateless server: use POST)' }, id: null }));
      return;
    }
    const server = build();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport as any);
    await transport.handleRequest(req as any, res);
  };
}
