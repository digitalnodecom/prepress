/**
 * The real Gutenberg block editor (@wordpress/block-editor) editing one page's
 * post_content. The value goes in as parsed blocks and comes out through
 * serialize(), so stored content is always what WordPress itself would save.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parse, serialize } from '@wordpress/blocks';
import {
  BlockBreadcrumb,
  BlockCanvas,
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
  BlockInspector,
  BlockList,
  __experimentalLibrary as InserterLibrary,
  __experimentalListView as ListView,
  store as blockEditorStore,
} from '@wordpress/block-editor';
import { Popover, SlotFillProvider } from '@wordpress/components';
import { ShortcutProvider } from '@wordpress/keyboard-shortcuts';
import { useDispatch, useSelect } from '@wordpress/data';
import '@wordpress/format-library';
import blockLibraryStyle from '@wordpress/block-library/build-style/style.css?inline';
import blockLibraryEditor from '@wordpress/block-library/build-style/editor.css?inline';
import blockLibraryTheme from '@wordpress/block-library/build-style/theme.css?inline';
import blockEditorContent from '@wordpress/block-editor/build-style/content.css?inline';
import componentsStyle from '@wordpress/components/build-style/style.css?inline';
import type { Design } from '../../lib/types';
import { buildThemeJson, compileGlobalStyles, googleFontsUrl } from '../../lib/wp/design';
import { ensureBlocks } from '../../lib/wp/registry';
import { inserterPatterns, PATTERN_CATEGORY } from '../../lib/wp/inserterPatterns';
import { uploadMedia } from '../../lib/backend';
import { installMediaLibrary } from './MediaLibrary';
import { installDynamicBlockEdits, linkSuggestions, type PrepressEditorInfo } from './dynamicBlocks';
import { installCustomBlockEdit } from './customBlockEdit';
import { AREA_BLOCK, areaBlocks, registerAreaBlock, splitAreas, type AreaMarkup } from './templateAreas';
import { sanitizeCss } from '../../lib/wp/customBlocks';
import type { CustomBlockDef, PatternDef, ThemeJsonPatch } from '../../lib/types';

ensureBlocks();
installDynamicBlockEdits();
installCustomBlockEdit();
registerAreaBlock();

/** theme.json settings → block-editor `__experimentalFeatures` (presets keyed by origin). */
function features(design: Design, patch?: ThemeJsonPatch) {
  const s = buildThemeJson(design, patch).settings as any;
  // WordPress core's base theme.json defaults plus what `appearanceTools: true`
  // expands to (PHP resolves both server-side; the editor package does not).
  return {
    ...s,
    appearanceTools: true,
    border: { color: true, radius: true, style: true, width: true },
    dimensions: { aspectRatio: true, minHeight: true },
    position: { sticky: true },
    shadow: { defaultPresets: true },
    background: { backgroundImage: true, backgroundSize: true },
    color: {
      ...s.color,
      background: true, text: true, link: true, button: true, heading: true, caption: true,
      custom: true, customGradient: true, customDuotone: true, defaultDuotone: false,
      palette: { theme: s.color.palette },
      gradients: { theme: s.color.gradients },
    },
    typography: {
      ...s.typography,
      customFontSize: true, lineHeight: true, fontStyle: true, fontWeight: true, letterSpacing: true,
      textDecoration: true, textTransform: true, writingMode: true, dropCap: true, textAlign: true,
      fontSizes: { theme: s.typography.fontSizes },
      fontFamilies: { theme: s.typography.fontFamilies },
    },
    spacing: { ...s.spacing, padding: true, margin: true, blockGap: true, spacingSizes: { theme: s.spacing.spacingSizes } },
  };
}

const EDITOR_CANVAS_CSS = `
html{background:#fff}
body{min-height:100vh;padding-bottom:40vh}
body:has(.pp-area-footer){padding-bottom:0}
.is-root-container{padding-top:0}
img{max-width:100%;height:auto}
.pp-area{position:relative;margin:0!important}
.pp-area>*{margin-block-start:0;margin-block-end:0}
.pp-area-header,.pp-area-footer{transition:outline-color .15s;outline:1px dashed transparent;outline-offset:-1px}
.pp-area-header:hover,.pp-area-footer:hover{outline-color:rgba(30,30,30,.28)}
.pp-area[data-pp-label]::before{content:attr(data-pp-label);position:absolute;top:6px;right:8px;z-index:20;font:500 11px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0;text-transform:none;padding:1px 7px;border-radius:2px;background:#1e1e1e;color:#fff;opacity:0;pointer-events:none;transition:opacity .15s}
.pp-area[data-pp-label]:hover::before{opacity:1}
`;

export interface EditorProps {
  content: string;
  design: Design;
  canUpload: boolean;
  /** Site name, tagline and page links for the header/footer block editors. */
  info: PrepressEditorInfo;
  /** Site-defined blocks (their CSS goes into the canvas). */
  blocks: CustomBlockDef[];
  /** Site patterns for the inserter. */
  patterns: PatternDef[];
  themeJson?: ThemeJsonPatch;
  /** `record` = persistent change worth an undo step. */
  onChange(markup: string, record: boolean): void;
  /**
   * Show the header and footer around the page (site-editor style). Edits to
   * them come back through onPartChange and apply to every page.
   */
  template?: { header: string; footer: string; onPartChange(part: 'header' | 'footer', markup: string, record: boolean): void };
  children: ReactNode;
}

/** Provider + store. Children render the canvas and sidebars (they need the context). */
export function EditorProvider({ content, design, canUpload, info, blocks: customBlocks, patterns, themeJson, onChange, template, children }: EditorProps) {
  const header = template?.header ?? '';
  const footer = template?.footer ?? '';
  /** Build the editor value; remembers what each area serializes to, so unchanged areas are never written back. */
  const build = (m: AreaMarkup) => {
    if (!template) {
      const b = parse(m.content);
      baseline.current = { content: m.content };
      return b;
    }
    const b = areaBlocks(m);
    // parse → serialize can differ from the stored text (whitespace, defaults); compare against what the editor would emit.
    baseline.current = { ...splitAreas(b), content: m.content };
    return b;
  };
  const baseline = useRef<Partial<AreaMarkup>>({});
  const [blocks, setBlocks] = useState(() => build({ content, header, footer }));
  const last = useRef<AreaMarkup>({ content, header, footer });
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<(() => void) | null>(null);

  // Content changed from outside the editor (AI edit, undo, restyle, code editor, another page's header edit).
  useEffect(() => {
    const l = last.current;
    if (content === l.content && header === l.header && footer === l.footer) return;
    last.current = { content, header, footer };
    setBlocks(build(last.current));
  }, [content, header, footer]);

  useEffect(() => {
    if (canUpload) installMediaLibrary();
  }, [canUpload]);

  // Flush typing that is still debounced when the page switches or the editor closes.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      pending.current?.();
    },
    [],
  );

  const emit = (b: any[], record: boolean) => {
    window.clearTimeout(timer.current);
    const run = () => {
      pending.current = null;
      if (!template) {
        const markup = serialize(b);
        last.current = { ...last.current, content: markup };
        onChange(markup, record);
        return;
      }
      const areas = splitAreas(b);
      for (const area of ['content', 'header', 'footer'] as const) {
        const markup = areas[area];
        if (markup === undefined || markup === baseline.current[area]) continue;
        baseline.current[area] = markup;
        last.current = { ...last.current, [area]: markup };
        if (area === 'content') onChange(markup, record);
        else template.onPartChange(area, markup, record);
      }
    };
    if (record) run();
    else {
      pending.current = run;
      timer.current = window.setTimeout(run, 250);
    }
  };

  // A new assets object makes the canvas iframe reload its document (losing focus and keystrokes): keep it stable.
  const resolvedAssets = useMemo(() => {
    const fonts = googleFontsUrl(design);
    const styles = [componentsStyle, blockEditorContent, blockLibraryStyle, blockLibraryEditor, blockLibraryTheme, compileGlobalStyles(design, themeJson), customBlocks.map((b) => sanitizeCss(b.css)).join('\n'), EDITOR_CANVAS_CSS]
      .map((css) => `<style>${css}</style>`)
      .join('');
    return { styles: (fonts ? `<link rel="stylesheet" href="${fonts}">` : '') + styles, scripts: '' };
  }, [design, themeJson, customBlocks]);

  const settings = useMemo(() => {
    const s = features(design, themeJson);
    return {
      hasFixedToolbar: false,
      focusMode: false,
      bodyPlaceholder: 'Type / to choose a block',
      __experimentalFeatures: s,
      colors: s.color.palette.theme,
      gradients: s.color.gradients.theme,
      fontSizes: s.typography.fontSizes.theme,
      disableCustomColors: false,
      __experimentalBlockPatterns: [
        ...patterns.map((p) => ({
          name: `site/${p.slug}`,
          title: p.title,
          description: p.description,
          categories: ['site'],
          // Synced patterns are inserted as references, like WordPress's synced patterns.
          content: p.synced ? `<!-- wp:block {"ref":${p.id}} /-->` : p.content,
        })),
        ...inserterPatterns(design),
      ],
      __experimentalBlockPatternCategories: [{ name: 'site', label: 'Site patterns' }, PATTERN_CATEGORY],
      __unstableResolvedAssets: resolvedAssets,
      mediaUpload: canUpload ? mediaUpload : undefined,
      allowedMimeTypes: canUpload ? { 'jpg|jpeg': 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', pdf: 'application/pdf' } : undefined,
      canLockBlocks: true,
      // With the template shown, only the areas' contents are editable (the areas themselves are fixed).
      ...(template ? { templateLock: 'all' } : {}),
      prepress: info,
      // The block editor's own "Edit pattern" / "Edit original" buttons navigate here.
      onNavigateToEntityRecord: ({ postId, postType }: { postId: number; postType: string }) => {
        if (postType === 'wp_block') info.onEditPattern?.(Number(postId));
      },
      __experimentalFetchLinkSuggestions: linkSuggestions(info.pages),
      __experimentalCanUserUseUnfilteredHTML: true,
    };
  }, [design, canUpload, info, resolvedAssets, patterns, themeJson, !!template]);

  return (
    <ShortcutProvider className="pp-shell">
      <SlotFillProvider>
        <BlockEditorProvider
          value={blocks}
          settings={settings}
          onInput={(b: any[]) => {
            setBlocks(b);
            emit(b, false);
          }}
          onChange={(b: any[]) => {
            setBlocks(b);
            emit(b, true);
          }}
        >
          <BlockEditorKeyboardShortcuts.Register />
          {children}
          <Popover.Slot />
        </BlockEditorProvider>
      </SlotFillProvider>
    </ShortcutProvider>
  );
}

async function mediaUpload({ filesList, onFileChange, onError }: { filesList: FileList | File[]; onFileChange(m: any[]): void; onError?(msg: string): void }) {
  const files = Array.from(filesList);
  const done: any[] = [];
  for (const file of files) {
    try {
      const m = await uploadMedia(file);
      done.push({ id: undefined, url: m.url, alt: '', type: m.mime.split('/')[0], mime: m.mime });
      onFileChange([...done]);
    } catch (e: any) {
      onError?.(`${file.name}: ${e?.message ?? 'upload failed'}`);
    }
  }
}

export function Canvas({ template = false }: { template?: boolean }) {
  return (
    <div className="pp-canvas">
      <BlockCanvas height="100%">
        <BlockList className="pp-root" layout={template ? { type: 'default' } : { type: 'constrained' }} />
      </BlockCanvas>
    </div>
  );
}

export function Inspector() {
  const hasSelection = useSelect((select) => !!(select(blockEditorStore) as any).getSelectedBlockClientId(), []);
  if (!hasSelection) return <p className="hint" style={{ padding: 16 }}>Select a block in the canvas to edit its settings.</p>;
  return <BlockInspector />;
}

/** The page-content area when the template is shown, else undefined (= the root). */
function useContentRoot(): string | undefined {
  return useSelect((select) => {
    const s = select(blockEditorStore) as any;
    return s.getBlocks().find((b: any) => b.name === AREA_BLOCK && b.attributes.area === 'content')?.clientId;
  }, []);
}

export function Inserter({ onClose }: { onClose(): void }) {
  const contentRoot = useContentRoot();
  // Nothing (or a whole area) selected: insert into the page content, not between the locked areas.
  const target = useSelect((select) => {
    const s = select(blockEditorStore) as any;
    const id = s.getSelectedBlockClientId();
    if (!id) return contentRoot;
    return s.getBlockName(id) === AREA_BLOCK ? id : undefined;
  }, [contentRoot]);
  return (
    <div className="pp-inserter">
      <InserterLibrary rootClientId={target} showInserterHelpPanel={false} shouldFocusBlock onClose={onClose} onSelect={() => window.innerWidth < 782 && onClose()} />
    </div>
  );
}

export function Outline() {
  return (
    <div className="pp-listview">
      <ListView />
    </div>
  );
}

export function Breadcrumb({ root = 'Page' }: { root?: string }) {
  return <BlockBreadcrumb rootLabelText={root} />;
}

/**
 * Keeps the AI panel's "selected section" (top-level block index) and the
 * editor's block selection in sync in both directions.
 */
export function SelectionSync({ selected, onSelected }: { selected: number | null; onSelected(i: number | null): void }) {
  const contentRoot = useContentRoot();
  const { topIndex, order } = useSelect((select) => {
    const s = select(blockEditorStore) as any;
    const id = s.getSelectedBlockClientId();
    // Sections are the children of the page content (the root, or the content area when the template is shown).
    const order: string[] = s.getBlockOrder(contentRoot);
    if (!id) return { topIndex: null as number | null, order };
    const chain: string[] = [...s.getBlockParents(id), id];
    const top = contentRoot ? chain[chain.indexOf(contentRoot) + 1] : chain[0];
    const i = top && (!contentRoot || chain.includes(contentRoot)) ? order.indexOf(top) : -1;
    return { topIndex: i < 0 ? null : i, order };
  }, [contentRoot]);
  const { selectBlock } = useDispatch(blockEditorStore) as any;
  const lastFromEditor = useRef<number | null>(topIndex);

  useEffect(() => {
    if (topIndex === lastFromEditor.current) return;
    lastFromEditor.current = topIndex;
    if (topIndex !== null) onSelected(topIndex);
  }, [topIndex, onSelected]);

  useEffect(() => {
    if (selected == null || selected === lastFromEditor.current || !order[selected]) return;
    lastFromEditor.current = selected;
    selectBlock(order[selected]);
  }, [selected, order, selectBlock]);

  return null;
}

/** Block editor undo/redo shortcuts live in the editor package; forward them to the app's history. */
export function useEditorHistoryShortcuts(undo: () => void, redo: () => void) {
  const ref = useRef({ undo, redo });
  ref.current = { undo, redo };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ref.current.redo();
        else ref.current.undo();
      } else if (e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        ref.current.redo();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}
