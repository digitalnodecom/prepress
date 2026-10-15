/**
 * Editing UI for the dynamic blocks used in the header/footer.
 *
 * Core's edit components for site-title, site-tagline, navigation and
 * navigation-link read and write WordPress entities through @wordpress/core-data
 * (REST API). There is no WordPress here, so these replace them via the
 * `editor.BlockEdit` filter. Attributes stay the same core attributes, so the
 * saved markup is unchanged and still exports to WordPress as-is.
 */
import { useMemo, useState } from 'react';
import { parse } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';
import {
  BlockControls,
  BlockPreview,
  InnerBlocks,
  InspectorControls,
  LinkControl,
  RichText,
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { Button, PanelBody, Popover, SelectControl, ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { link as linkIcon } from '@wordpress/icons';

export interface PrepressEditorInfo {
  name: string;
  tagline: string;
  pages: { title: string; url: string }[];
  /** Synced patterns, rendered in place of core/block references. */
  patterns: { id: number; title: string; content: string }[];
  onEditPattern?(id: number): void;
}

const useInfo = (): PrepressEditorInfo =>
  useSelect((select) => (select(blockEditorStore) as any).getSettings().prepress ?? { name: '', tagline: '', pages: [], patterns: [] }, []);

function SiteTitleEdit({ attributes, setAttributes }: any) {
  const { name } = useInfo();
  const level = attributes.level ?? 1;
  const Tag: any = level === 0 ? 'p' : `h${level}`;
  const ta = attributes.style?.typography?.textAlign ?? attributes.textAlign;
  const props = useBlockProps({ className: ta ? `has-text-align-${ta}` : undefined });
  return (
    <>
      <InspectorControls>
        <PanelBody title="Settings">
          <SelectControl
            label="HTML element"
            value={String(level)}
            options={[{ label: 'Paragraph', value: '0' }, ...[1, 2, 3, 4, 5, 6].map((n) => ({ label: `Heading ${n}`, value: String(n) }))]}
            onChange={(v: string) => setAttributes({ level: Number(v) })}
            __nextHasNoMarginBottom
          />
          <p className="pp-inspector-note">The title comes from Site → Site title.</p>
        </PanelBody>
      </InspectorControls>
      <Tag {...props}>
        <a href="/" onClick={(e: any) => e.preventDefault()} rel="home">
          {name || 'Site title'}
        </a>
      </Tag>
    </>
  );
}

function SiteTaglineEdit() {
  const { tagline } = useInfo();
  const props = useBlockProps();
  return (
    <>
      <InspectorControls>
        <PanelBody title="Settings">
          <p className="pp-inspector-note">The tagline comes from Site → Tagline.</p>
        </PanelBody>
      </InspectorControls>
      <p {...props}>{tagline || 'Site tagline'}</p>
    </>
  );
}

const NAV_CHILDREN = ['core/navigation-link'];

function NavigationEdit({ attributes, setAttributes, clientId, isSelected }: any) {
  const childSelected = useSelect((select) => (select(blockEditorStore) as any).hasSelectedInnerBlock(clientId, true), [clientId]);
  const vertical = attributes.layout?.orientation === 'vertical';
  const justify = attributes.layout?.justifyContent;
  const extra = ['is-responsive', vertical ? 'is-vertical' : '', justify ? `items-justified-${justify}` : ''].filter(Boolean).join(' ');
  const props = useBlockProps({ className: extra });
  const inner = useInnerBlocksProps(
    { className: `wp-block-navigation__container ${extra}` },
    {
      allowedBlocks: NAV_CHILDREN,
      defaultBlock: { name: 'core/navigation-link', attributes: { label: '', kind: 'custom' } },
      directInsert: true,
      orientation: vertical ? 'vertical' : 'horizontal',
      renderAppender: isSelected || childSelected ? InnerBlocks.ButtonBlockAppender : false,
    },
  );
  return (
    <>
      <InspectorControls>
        <PanelBody title="Settings">
          <SelectControl
            label="Mobile overlay menu"
            value={attributes.overlayMenu ?? 'mobile'}
            options={[{ label: 'On mobile', value: 'mobile' }, { label: 'Always', value: 'always' }, { label: 'Never', value: 'never' }]}
            onChange={(v: string) => setAttributes({ overlayMenu: v })}
            __nextHasNoMarginBottom
          />
          <SelectControl
            label="Orientation"
            value={vertical ? 'vertical' : 'horizontal'}
            options={[{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }]}
            onChange={(v: string) => setAttributes({ layout: { ...(attributes.layout ?? { type: 'flex' }), orientation: v } })}
            __nextHasNoMarginBottom
          />
        </PanelBody>
      </InspectorControls>
      <nav {...props} aria-label="Menu">
        <ul {...inner} />
      </nav>
    </>
  );
}

function NavigationLinkEdit({ attributes, setAttributes, isSelected }: any) {
  const [editing, setEditing] = useState(!attributes.url);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const props = useBlockProps({ className: 'wp-block-navigation-item wp-block-navigation-link', ref: setAnchor });
  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton icon={linkIcon} label="Link" onClick={() => setEditing(true)} isPressed={editing} />
        </ToolbarGroup>
      </BlockControls>
      <li {...props}>
        <a className="wp-block-navigation-item__content" href={attributes.url || '#'} onClick={(e: any) => e.preventDefault()}>
          <RichText
            tagName="span"
            className="wp-block-navigation-item__label"
            value={attributes.label ?? ''}
            onChange={(label: string) => setAttributes({ label })}
            placeholder="Add text…"
            allowedFormats={['core/bold', 'core/italic']}
            withoutInteractiveFormatting
          />
        </a>
        {isSelected && editing && anchor && (
          <Popover anchor={anchor} placement="bottom" onClose={() => setEditing(false)} focusOnMount="firstElement" shift>
            <LinkControl
              value={{ url: attributes.url ?? '', title: attributes.label, opensInNewTab: !!attributes.opensInNewTab }}
              onChange={(v: any) => {
                const next: Record<string, unknown> = { url: v.url, opensInNewTab: !!v.opensInNewTab, kind: 'custom' };
                if (!attributes.label && v.title) next.label = v.title;
                setAttributes(next);
                setEditing(false);
              }}
              onRemove={() => setAttributes({ url: undefined })}
              settings={[{ id: 'opensInNewTab', title: 'Open in new tab' }]}
            />
          </Popover>
        )}
      </li>
    </>
  );
}

/** Synced pattern (core/block): shown read-only; edited in its own editor view, like WordPress. */
function PatternRefEdit({ attributes }: any) {
  const { patterns, onEditPattern } = useInfo();
  const pattern = patterns.find((p) => p.id === Number(attributes.ref));
  const blocks = useMemo(() => (pattern ? parse(pattern.content) : []), [pattern?.content]);
  const props = useBlockProps({ className: 'pp-pattern-ref' });
  if (!pattern) return <div {...props}><p className="pp-inspector-note">This synced pattern no longer exists.</p></div>;
  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton onClick={() => onEditPattern?.(pattern.id)}>Edit original</ToolbarButton>
        </ToolbarGroup>
      </BlockControls>
      <InspectorControls>
        <PanelBody title="Synced pattern">
          <p className="pp-inspector-note">“{pattern.title}” is shared: editing it changes every page that uses it.</p>
          <Button variant="secondary" onClick={() => onEditPattern?.(pattern.id)}>Edit original</Button>
        </PanelBody>
      </InspectorControls>
      <div {...props}>
        <BlockPreview blocks={blocks} viewportWidth={1200} />
      </div>
    </>
  );
}

const EDITS: Record<string, any> = {
  'core/block': PatternRefEdit,
  'core/site-title': SiteTitleEdit,
  'core/site-tagline': SiteTaglineEdit,
  'core/navigation': NavigationEdit,
  'core/navigation-link': NavigationLinkEdit,
};

let installed = false;
export function installDynamicBlockEdits() {
  if (installed) return;
  installed = true;
  addFilter('editor.BlockEdit', 'prepress/dynamic-blocks', (BlockEdit: any) => (props: any) => {
    const Edit = EDITS[props.name];
    return Edit ? <Edit {...props} /> : <BlockEdit {...props} />;
  });
}

/** Link suggestions for LinkControl: the site's own pages. */
export function linkSuggestions(pages: PrepressEditorInfo['pages']) {
  return async (search: string) => {
    const q = search.trim().toLowerCase();
    return pages
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.url.includes(q))
      .map((p, i) => ({ id: i + 1, title: p.title, url: p.url, type: 'page', kind: 'post-type' }));
  };
}
