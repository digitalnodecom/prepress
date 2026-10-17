// Block styles (is-style-*), CSS layers, the plugin export and the theme-system lint.
import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { cleanBlockStyle, compileBlockStyles, blockStylesUsedIn, blockStylesPhp } from '../src/lib/wp/blockStyles';
import { nestCss, styleSelector, wpBlockCss, isWpBlockCss } from '../src/lib/wp/css';
import { buildThemeJson, compileGlobalStyles, sanitizeDesign } from '../src/lib/wp/design';
import { ensureBlocks } from '../src/lib/wp/registry';
import { exportSite } from '../src/lib/wp/export';
import { patternPhp } from '../src/lib/wp/wpBlocks';
import { defineBlock, defineBlockStyle, deleteBlockStyle, blockStyleUsage, setPageContent } from '../src/lib/site';
import { importLibraryItem, sharePattern, shareStyle } from '../src/lib/library';
import { lintSite } from '../src/lib/setLint';
import { markupToNodes, validateMarkup } from '../src/lib/wp/markup';
import { renderPage } from '../src/lib/wp/render';
import { buildStarter } from '../src/lib/starters';
import { createPattern } from '../src/lib/site';
import type { Site } from '../src/lib/types';

ensureBlocks();

const plate = cleanBlockStyle({
  name: 'paper-plate',
  label: 'Plate',
  blockTypes: ['core/image'],
  styles: { border: { radius: 'var(--wp--custom--radius--sm)' } },
  css: '& img{filter:grayscale(1);mix-blend-mode:multiply} & figcaption{font-family:var(--wp--preset--font-family--mono)} @media (max-width:600px){& img{filter:none}}',
});

describe('selectors and nesting', () => {
  test('block style selectors follow block.json root selectors', () => {
    expect(styleSelector('pill', 'core/button')).toBe('.wp-block-button.is-style-pill .wp-block-button__link');
    expect(styleSelector('lede', 'core/paragraph')).toBe('p.is-style-lede');
    expect(styleSelector('plate', 'core/image')).toBe('.wp-block-image.is-style-plate');
    expect(styleSelector('stripe', 'core/table')).toBe('.wp-block-table.is-style-stripe > table');
    expect(styleSelector('x', 'prepress/hut-stamp')).toBe('.wp-block-prepress-hut-stamp.is-style-x');
  });

  test('nestCss flattens &, descendants, selector lists and @media', () => {
    expect(nestCss('color:red; & img{a:b} .x,.y{c:d} &:hover{e:f}', '.s')).toBe('.s{color:red;}\n.s img{a:b}\n.s .x, .s .y{c:d}\n.s:hover{e:f}');
    expect(nestCss('@media (max-width:600px){& img{a:b}}', '.s, .t')).toBe('@media (max-width:600px){.s img, .t img{a:b}}');
    expect(nestCss('@keyframes k{from{opacity:0}}', '.s')).toBe('@keyframes k{from{opacity:0}}');
  });

  test('theme.json per-block css is processed like WordPress', () => {
    expect(wpBlockCss('color:red; & img{a:b} &:hover{c:d} & ::before{e:f}', '.wp-block-image')).toBe(
      ':root :where(.wp-block-image){color:red;}:root :where(.wp-block-image img){a:b}:root :where(.wp-block-image:hover){c:d}:root :where(.wp-block-image) ::before{e:f}',
    );
    expect(isWpBlockCss('color:red; & img{a:b}')).toBe(true);
    expect(isWpBlockCss('@media (x){& img{a:b}}')).toBe(false);
    expect(isWpBlockCss('& img{ & b{c:d} }')).toBe(false);
  });
});

describe('block styles', () => {
  test('clean rejects bad names and unknown block types, keeps only style keys', () => {
    expect(() => cleanBlockStyle({ name: 'Bad Name', label: 'x', blockTypes: ['core/image'] })).toThrow(/lowercase/);
    expect(() => cleanBlockStyle({ name: 'outline', label: 'x', blockTypes: ['core/button'] })).toThrow(/built-in/);
    expect(() => cleanBlockStyle({ name: 'ok-name', label: 'x', blockTypes: ['nope'] })).toThrow(/blockTypes/);
    const d = cleanBlockStyle({ name: 'is-style-ok-name', label: 'OK', blockTypes: ['core/group', 'evil/x'], styles: { color: { text: 'red' }, elements: { link: {} } }, css: '</style><script>x</script>a{b:c}' });
    expect(d.name).toBe('ok-name');
    expect(d.blockTypes).toEqual(['core/group']);
    expect(d.styles).toEqual({ color: { text: 'red' } });
    expect(d.css).not.toMatch(/<|script/i);
  });

  test('compile: style_data wrapped in :root :where(), css nested under the style selector', () => {
    const css = compileBlockStyles([plate]);
    expect(css).toContain(':root :where(.wp-block-image.is-style-paper-plate){border-radius:var(--wp--custom--radius--sm)}');
    expect(css).toContain('.wp-block-image.is-style-paper-plate img{filter:grayscale(1);mix-blend-mode:multiply}');
    expect(css).toContain('@media (max-width:600px){.wp-block-image.is-style-paper-plate img{filter:none}}');
  });

  test('used-in detection matches whole class names only', () => {
    expect(blockStylesUsedIn('<figure class="wp-block-image is-style-paper-plate">', [plate])).toHaveLength(1);
    expect(blockStylesUsedIn('<figure class="wp-block-image is-style-paper-plate-2">', [plate])).toHaveLength(0);
  });

  test('render, export and library carry them', async () => {
    let site: Site = buildStarter('saas', { name: 'Styled' }).site;
    site = defineBlockStyle(site, plate).site;
    const page = site.pages[0];
    site = setPageContent(site, page.id, `<!-- wp:image {"className":"is-style-paper-plate"} -->\n<figure class="wp-block-image is-style-paper-plate"><img src="https://example.com/a.jpg" alt="A"/></figure>\n<!-- /wp:image -->`);
    expect(validateMarkup(site.pages[0].content).invalid).toEqual([]);
    expect(blockStyleUsage(site, 'paper-plate')).toEqual([`page:${page.slug}`]);
    expect(renderPage(site, site.pages[0])).toContain('.wp-block-image.is-style-paper-plate img{');

    // Export: inc/block-styles.php registered from functions.php, flattened CSS + style_data.
    const zip = await JSZip.loadAsync((await exportSite(site)).bytes);
    const theme = await JSZip.loadAsync(await zip.file(/-theme\.zip$/)[0].async('uint8array'));
    const php = await theme.file(/inc\/block-styles\.php$/)[0].async('string');
    expect(php).toContain("register_block_style(\n\t\tarray( 'core/image' )");
    expect(php).toContain("'style_data' => array(");
    expect(php).toContain('.wp-block-image.is-style-paper-plate img{filter:grayscale(1)');
    expect(await theme.file(/functions\.php$/)[0].async('string')).toContain("require_once __DIR__ . '/inc/block-styles.php';");
    expect(theme.file(/patterns\/part-header\.php$/)).toHaveLength(1);

    // Library: a style carries all of them; a pattern carries the ones it uses; import brings them.
    const pat = createPattern(site, { title: 'Plate', content: site.pages[0].content, synced: false });
    const shared = sharePattern(pat.site, pat.pattern.id);
    expect(shared.payload.pattern!.blockStyles!.map((d) => d.name)).toEqual(['paper-plate']);
    const blank = buildStarter('saas', { name: 'Blank' }).site;
    expect(importLibraryItem(blank, shared).site.blockStyles!.map((d) => d.name)).toEqual(['paper-plate']);
    const style = shareStyle(site, { title: 'S' });
    expect(style.payload.style!.blockStyles).toHaveLength(1);
    expect(importLibraryItem({ ...blank, blockStyles: [cleanBlockStyle({ name: 'old-one', label: 'Old', blockTypes: ['core/group'] })] }, style).site.blockStyles!.map((d) => d.name)).toEqual(['paper-plate']);

    expect(deleteBlockStyle(site, 'paper-plate').blockStyles).toEqual([]);
  });

  test('PHP for block styles is valid-looking and escapes quotes', () => {
    const php = blockStylesPhp([cleanBlockStyle({ name: 'q-x', label: "It's", blockTypes: ['core/group'], css: "content:'\\201C'" })], 'site');
    expect(php).toContain("'label' => 'It\\'s'");
    expect(php).toContain("add_action( 'init', 'site_block_styles' );");
  });
});

describe('tokens', () => {
  test('radius scale and shadows follow the design', () => {
    const soft = buildThemeJson(sanitizeDesign({ radius: 'soft' })) as any;
    const none = buildThemeJson(sanitizeDesign({ radius: 'none' })) as any;
    expect(soft.settings.custom.radius).toEqual({ sm: '4px', md: '8px', lg: '12px', pill: '999px' });
    expect(none.settings.custom.radius.pill).toBe('0px');
    const css = compileGlobalStyles(sanitizeDesign({ radius: 'round' }));
    expect(css).toContain('--wp--custom--radius--lg:24px');
    expect(css).toContain('--wp--preset--shadow--soft:');
  });
});

describe('export', () => {
  const blockSite = () => {
    let site: Site = buildStarter('saas', { name: 'Plug Me' }).site;
    site = defineBlock(site, { name: 'note', title: 'Note', kind: 'art', attributes: { text: { type: 'string' } }, template: '<p>{{text}}</p>', css: '.wp-block-prepress-note p{margin:0}' }).site;
    return site;
  };

  test('blocks inside the theme by default', async () => {
    const zip = await JSZip.loadAsync((await exportSite(blockSite())).bytes);
    expect(zip.file(/-blocks\.zip$/)).toHaveLength(0);
    const theme = await JSZip.loadAsync(await zip.file(/-theme\.zip$/)[0].async('uint8array'));
    expect(theme.file(/blocks\/note\/block\.json$/)).toHaveLength(1);
    expect(await theme.file(/functions\.php$/)[0].async('string')).toContain("get_theme_file_uri( '/' ) . 'assets/prepress-blocks.js'");
  });

  test('blocks as a companion plugin: theme has no block code, plugin registers every block', async () => {
    const zip = await JSZip.loadAsync((await exportSite(blockSite(), { blocks: 'plugin' })).bytes);
    const theme = await JSZip.loadAsync(await zip.file(/-theme\.zip$/)[0].async('uint8array'));
    expect(theme.file(/blocks\//)).toHaveLength(0);
    expect(theme.file(/prepress-blocks/)).toHaveLength(0);
    expect(await theme.file(/functions\.php$/)[0].async('string')).not.toContain('register_block_type');
    const plugin = await JSZip.loadAsync(await zip.file(/plug-me-blocks\.zip$/)[0].async('uint8array'));
    const main = await plugin.file('plug-me-blocks/plug-me-blocks.php')!.async('string');
    expect(main).toContain('Plugin Name:       Plug Me Blocks');
    expect(main).toContain("plugin_dir_url( __FILE__ ) . 'assets/prepress-blocks.js'");
    expect(main).toContain("array( 'note' )");
    expect(JSON.parse(await plugin.file('plug-me-blocks/blocks/note/block.json')!.async('string')).textdomain).toBe('plug-me-blocks');
    expect(plugin.file('plug-me-blocks/inc/prepress-blocks.php')).not.toBeNull();
    expect(await zip.file(/README\.md$/)[0].async('string')).toContain('plug-me-blocks.zip');
  });

  test('pattern headers: role → WordPress category, keywords, block types, viewport', () => {
    const php = patternPhp({ slug: 'hero', title: 'Hero', content: '<!-- wp:paragraph --><p>x</p><!-- /wp:paragraph -->', role: 'hero', keywords: ['hero', 'big'], categories: ['kinetic'] }, 'my-site');
    expect(php).toContain(' * Categories: my-site, banner, kinetic');
    expect(php).toContain(' * Keywords: hero, big');
    expect(php).toContain(' * Viewport Width: 1400');
    const part = patternPhp({ slug: 'part-footer', title: 'Footer', content: '', role: 'footer', blockTypes: ['core/template-part/footer'] }, 'my-site');
    expect(part).toContain(' * Block Types: core/template-part/footer');
  });
});

describe('lintSite', () => {
  test('flags stray classes, raw colours, radii and font families', () => {
    let site: Site = buildStarter('saas', { name: 'Lint' }).site;
    site = { ...site, themeJson: { styles: { css: '.wp-block-group.is-style-x-card{color:#f00}' } } };
    site = defineBlockStyle(site, { name: 'x-card', label: 'Card', blockTypes: ['core/group'], css: 'border-radius:14px;font-family:Inter;color:rgb(1 2 3)' }).site;
    site = setPageContent(site, site.pages[0].id, '<!-- wp:group {"className":"my-hook"} -->\n<div class="wp-block-group my-hook"></div>\n<!-- /wp:group -->');
    const w = lintSite(site, markupToNodes).join('\n');
    expect(w).toMatch(/styles a block style from site CSS/);
    expect(w).toMatch(/raw colour/);
    expect(w).toMatch(/radius "14px"/);
    expect(w).toMatch(/raw font family "Inter"/);
    expect(w).toMatch(/className "my-hook"/);
  });
});
