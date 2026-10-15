/**
 * Editing UI for site-defined `prepress/*` blocks: a live preview from the
 * block's template, settings generated from its attribute schema, and inner
 * blocks rendered into the {{{content}}} slot.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InspectorControls, MediaUpload, MediaUploadCheck, useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { Button, PanelBody, SelectControl, TextareaControl, TextControl, ToggleControl } from '@wordpress/components';
import type { CustomAttrDef, CustomBlockDef } from '../../lib/types';
import { fillTemplate, hasContentSlot, setCustomBlockEdit } from '../../lib/wp/customBlocks';

const SLOT = '<div data-pp-slot></div>';

function Field({ name, def, value, onChange }: { name: string; def: CustomAttrDef; value: any; onChange(v: any): void }) {
  const label = def.label || name;
  const common = { label, __nextHasNoMarginBottom: true, __next40pxDefaultSize: true } as any;
  switch (def.control) {
    case 'toggle':
      return <ToggleControl {...common} checked={!!value} onChange={onChange} />;
    case 'textarea':
    case 'richtext':
      return <TextareaControl {...common} value={value ?? ''} onChange={onChange} help={def.control === 'richtext' ? 'Basic HTML allowed: <strong>, <em>, <a href>.' : undefined} />;
    case 'number':
      return <TextControl {...common} type="number" value={value ?? ''} onChange={(v: string) => onChange(v === '' ? undefined : Number(v))} />;
    case 'select':
      return <SelectControl {...common} value={value ?? ''} options={(def.options ?? []).map((o) => ({ label: o, value: o }))} onChange={onChange} />;
    case 'image':
      return (
        <div className="pp-field-image">
          <TextControl {...common} type="url" value={value ?? ''} onChange={onChange} placeholder="https://… or choose from media" />
          <MediaUploadCheck>
            <MediaUpload allowedTypes={['image']} onSelect={(m: any) => onChange(m?.url)} render={({ open }: any) => <Button variant="secondary" onClick={open}>Choose image</Button>} />
          </MediaUploadCheck>
        </div>
      );
    case 'url':
      return <TextControl {...common} type="url" value={value ?? ''} onChange={onChange} />;
    default:
      return <TextControl {...common} value={value ?? ''} onChange={onChange} />;
  }
}

function makeEdit(def: CustomBlockDef) {
  const content = hasContentSlot(def);
  const template = def.innerBlocks?.template ? toTemplate(def.innerBlocks.template) : undefined;

  return function Edit({ attributes, setAttributes }: any) {
    const blockProps = useBlockProps();
    const html = useMemo(() => fillTemplate(def, attributes, content ? SLOT : ''), [attributes]);
    const host = useRef<HTMLDivElement>(null);
    const [slot, setSlot] = useState<Element | null>(null);
    useLayoutEffect(() => {
      setSlot(content ? host.current?.querySelector('[data-pp-slot]') ?? null : null);
    }, [html]);

    return (
      <>
        <InspectorControls>
          <PanelBody title="Settings">
            {Object.entries(def.attributes).map(([name, a]) => (
              <Field key={name} name={name} def={a} value={attributes[name]} onChange={(v) => setAttributes({ [name]: v })} />
            ))}
            {!Object.keys(def.attributes).length && <p className="pp-inspector-note">This block has no settings.</p>}
          </PanelBody>
        </InspectorControls>
        <div {...blockProps}>
          <div ref={host} className="pp-custom-preview" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />
          {slot && createPortal(<Inner allowed={def.innerBlocks?.allowed} template={template} />, slot)}
        </div>
      </>
    );
  };
}

function Inner({ allowed, template }: { allowed?: string[]; template?: any[] }) {
  const props = useInnerBlocksProps({ className: 'pp-custom-inner' }, { allowedBlocks: allowed, template, templateLock: false });
  return <div {...props} />;
}

/** BlockNode[] → InnerBlocks template ([name, attrs, inner]). */
function toTemplate(nodes: any[]): any[] {
  return nodes.filter((n) => n && typeof n.name === 'string').map((n) => [n.name, n.attributes ?? {}, toTemplate(n.innerBlocks ?? [])]);
}

let installed = false;
export function installCustomBlockEdit() {
  if (installed) return;
  installed = true;
  setCustomBlockEdit(makeEdit);
}
