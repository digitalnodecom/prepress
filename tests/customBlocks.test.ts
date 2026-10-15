import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { cleanBlockDef, fillTemplate, registerCustomBlocks, sanitizeTemplate, safeUrl, escHtml } from '../src/lib/wp/customBlocks';
import { compileTemplateToPhp, HELPERS_PHP, RUNTIME, editorScript } from '../src/lib/wp/wpBlocks';
import { normalizeSections } from '../src/lib/wp/normalize';
import { toMarkup, validateMarkup, markupToNodes } from '../src/lib/wp/markup';
import { renderPage } from '../src/lib/wp/render';
import { sanitizeDesign } from '../src/lib/wp/design';
import { defineBlock, createPattern, setPageContent } from '../src/lib/site';
import type { Site } from '../src/lib/types';

const card = cleanBlockDef({
  name: 'pricing-card',
  title: 'Pricing card',
  category: 'design',
  attributes: {
    plan: { type: 'string', default: 'Starter' },
    price: { type: 'string' },
    featured: { type: 'boolean', control: 'toggle' },
    link: { type: 'string', control: 'url' },
    photo: { type: 'string', control: 'image' },
    seats: { type: 'number' },
    note: { type: 'string', control: 'richtext' },
  },
  template:
    '<div class="card{{#featured}} is-featured{{/featured}}"><h3>{{plan}}</h3>{{#price}}<p class="price">{{price}}</p>{{/price}}{{^price}}<p>Free</p>{{/price}}<a href="{{link}}">Buy</a>{{#photo}}<img src="{{photo}}" alt="">{{/photo}}<span>{{seats}}</span><div class="note">{{note}}</div>{{{content}}}</div>',
  css: '.wp-block-prepress-pricing-card .card{border:1px solid var(--wp--preset--color--secondary)} </style><script>x</script>',
});

const CASES: Record<string, unknown>[] = [
  {},
  { plan: 'Pro & Co <b>', price: '$9 "monthly"', featured: true, link: 'https://example.com/buy?a=1&b=2', seats: 5 },
  { plan: "O'Brien &amp; sons", link: 'javascript:alert(1)', photo: 'data:image/svg+xml;charset=utf-8,%3Csvg%3E', seats: '1.50' },
  { link: 'example.com/path with space', photo: 'ftp://files.example.com/a.png', featured: false, price: '' },
  { link: '/visit/#map', seats: 'abc', featured: 0 },
];

describe('custom blocks', () => {
  test('definitions are validated and cleaned', () => {
    expect(card.name).toBe('prepress/pricing-card');
    expect(card.css).not.toMatch(/<\/style|<script/);
    expect(() => cleanBlockDef({ name: 'Bad Name', template: 'x' })).toThrow(/prepress\/my-block/);
    expect(() => cleanBlockDef({ name: 'a-b', template: '{{missing}}' })).toThrow(/no attribute "missing"/);
    expect(() => cleanBlockDef({ name: 'a-b', attributes: { style: { type: 'string' } }, template: 'x' })).toThrow(/not allowed/);
    expect(() => cleanBlockDef({ name: 'a-b', attributes: { x: { type: 'string' } }, template: '{{#x}}open' })).toThrow(/never closed/);
  });

  test('templates are sanitized', () => {
    const t = sanitizeTemplate('<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><iframe src="//evil"></iframe><img src=x onerror=alert(1)>');
    expect(t).not.toMatch(/onclick|<script|javascript:|<iframe|onerror/i);
    expect(t).toContain('<p>Hi</p>');
  });

  test('values are escaped by type', () => {
    const html = fillTemplate(card, CASES[1]);
    expect(html).toContain('Pro &amp; Co &lt;b&gt;');
    expect(html).toContain('$9 &quot;monthly&quot;');
    expect(html).toContain('href="https://example.com/buy?a=1&#038;b=2"');
    expect(html).toContain('is-featured');
    expect(fillTemplate(card, CASES[2])).toContain('href=""');
    expect(fillTemplate(card, CASES[2])).toContain('O&#039;Brien &amp; sons');
    expect(fillTemplate(card, {})).toContain('<p>Free</p>');
    expect(safeUrl('example.com')).toBe('http://example.com');
    expect(escHtml('&amp; &')).toBe('&amp; &amp;');
  });

  test('editor runtime (exported to WordPress) matches fillTemplate', () => {
    const ctx: any = {};
    vm.runInNewContext(`${RUNTIME}; result = fill`, ctx);
    for (const c of CASES) expect(ctx.result(card, c, '<p>inner</p>'), JSON.stringify(c)).toBe(fillTemplate(card, c, '<p>inner</p>'));
    expect(editorScript([card])).toContain('"prepress/pricing-card"');
  });

  test('render.php (exported to WordPress) matches fillTemplate', (ctx) => {
    let php = '';
    try {
      php = execFileSync('php', ['-r', 'echo PHP_VERSION;']).toString();
    } catch {
      ctx.skip();
    }
    expect(php).toMatch(/^\d/);
    const dir = mkdtempSync(join(tmpdir(), 'pp-php-'));
    // Minimal stand-ins for the WordPress functions render.php uses (same behavior as core for these inputs).
    const stubs = `<?php
define('ABSPATH', '/');
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8', false); }
function wp_kses_post($s) { return $s; }
function esc_url($url) {
  $url = str_replace(' ', '%20', ltrim((string)$url));
  $url = preg_replace('|[^a-z0-9-~+_.?#=!&;,/:%@$\\|*\\'()\\[\\]\\x80-\\xff]|i', '', $url);
  if ('' === $url) return $url;
  if (strpos($url, ':') === false && !in_array($url[0], array('/', '#', '?'), true) && !preg_match('/^[a-z0-9-]+?\\.php/i', $url)) $url = 'http://' . $url;
  $protocols = array('http','https','ftp','ftps','mailto','news','irc','irc6','ircs','gopher','nntp','feed','telnet','mms','rtsp','sms','svn','tel','fax','xmpp','webcal','urn');
  if (preg_match('/^([a-z][a-z0-9+.-]*):/i', $url, $m) && !in_array(strtolower($m[1]), $protocols, true)) return '';
  $url = str_replace('&amp;', '&#038;', $url); $url = preg_replace('/&(?!#038;)/', '&#038;', $url);
  return str_replace("'", '&#039;', $url);
}
?>`;
    writeFileSync(join(dir, 'helpers.php'), stubs + HELPERS_PHP);
    writeFileSync(join(dir, 'tpl.php'), compileTemplateToPhp(card));
    const plain = { ...card, attributes: { ...card.attributes, note: { type: 'string' as const } } }; // wp_kses_post differs from our inline sanitizer; compare the rest
    writeFileSync(join(dir, 'tpl-plain.php'), compileTemplateToPhp(plain));
    for (const c of CASES) {
      const attrs: Record<string, unknown> = { plan: 'Starter', ...c };
      const runner = `<?php require '${dir}/helpers.php'; $attributes = json_decode(${JSON.stringify(JSON.stringify(attrs))}, true); $content = '<p>inner</p>'; include '${dir}/tpl-plain.php';`;
      writeFileSync(join(dir, 'run.php'), runner);
      const out = execFileSync('php', [join(dir, 'run.php')]).toString();
      expect(out, JSON.stringify(c)).toBe(fillTemplate(plain, attrs, '<p>inner</p>'));
    }
  });

  test('registered custom blocks serialize, validate, normalize and render', () => {
    const design = sanitizeDesign({});
    registerCustomBlocks([card]);
    const report = { dropped: [] as string[], repaired: [] as string[] };
    const nodes = normalizeSections(
      [{ name: 'prepress/pricing-card', attributes: { plan: 'Pro', price: '$9', bogus: 1, backgroundColor: 'muted' }, innerBlocks: [{ name: 'core/paragraph', attributes: { content: 'Inside' } }] }],
      { design, report },
    );
    expect(report.dropped).toEqual(['prepress/pricing-card.bogus']);
    const markup = toMarkup(nodes);
    expect(markup).toMatch(/<!-- wp:prepress\/pricing-card \{"plan":"Pro","price":"\$9","backgroundColor":"muted"\} -->/);
    expect(validateMarkup(markup).invalid).toEqual([]);
    expect(markupToNodes(markup)[0].innerBlocks?.[0].name).toBe('core/paragraph');

    let site: Site = { name: 'S', tagline: '', design, header: '', footer: '', pages: [{ id: 'h', title: 'Home', slug: 'home', content: markup }] };
    site = defineBlock(site, card).site;
    const html = renderPage(site, site.pages[0]);
    expect(html).toContain('class="wp-block-prepress-pricing-card has-muted-background-color has-background"');
    expect(html).toContain('<p class="price">$9</p>');
    expect(html).toContain('<p>Inside</p>');
    expect(html).toContain('border:1px solid var(--wp--preset--color--secondary)');
  });

  test('synced patterns render in place and survive serialization', () => {
    const design = sanitizeDesign({});
    let site: Site = { name: 'S', tagline: '', design, header: '', footer: '', pages: [{ id: 'h', title: 'Home', slug: 'home', content: '' }] };
    const content = toMarkup(normalizeSections([{ pattern: 'cta-band', props: { heading: 'Book a table', primaryCta: { label: 'Go', url: '/' } } }], { design }));
    const { site: s2, pattern } = createPattern(site, { title: 'Booking CTA', content, synced: true });
    const ref = toMarkup(normalizeSections([{ name: 'core/block', attributes: { ref: pattern.id } }], { design }));
    expect(ref).toBe(`<!-- wp:block {"ref":${pattern.id}} /-->`);
    expect(validateMarkup(ref).invalid).toEqual([]);
    site = setPageContent(s2, 'h', ref);
    expect(renderPage(site, site.pages[0])).toContain('Book a table');
  });
});
