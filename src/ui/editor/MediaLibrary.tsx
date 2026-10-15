/**
 * A small media library for the block editor's "Media Library" buttons
 * (the `editor.MediaUpload` filter WordPress itself uses), backed by the
 * Prepress server's /api/media.
 */
import { useEffect, useState } from 'react';
import { addFilter } from '@wordpress/hooks';
import { Button, FormFileUpload, Modal, Spinner } from '@wordpress/components';
import { listMedia, uploadMedia, type MediaItem } from '../../lib/backend';

interface MediaUploadProps {
  onSelect(media: any): void;
  allowedTypes?: string[];
  multiple?: boolean | 'add';
  value?: unknown;
  title?: string;
  render(args: { open(): void }): any;
}

const toMedia = (m: MediaItem) => ({ id: undefined, url: m.url, alt: '', type: m.mime?.split('/')[0], mime: m.mime });

function accepts(m: MediaItem, allowed?: string[]) {
  if (!allowed?.length) return true;
  return allowed.some((t) => m.mime === t || m.mime?.startsWith(`${t}/`));
}

function MediaUpload({ onSelect, allowedTypes, multiple, title, render }: MediaUploadProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked([]);
    listMedia()
      .then((all) => setItems(all.filter((m) => accepts(m, allowedTypes))))
      .catch((e) => setError(String(e?.message ?? e)));
  }, [open, allowedTypes]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const added: MediaItem[] = [];
      for (const f of Array.from(files)) added.push(await uploadMedia(f));
      setItems((cur) => [...added, ...(cur ?? [])]);
      setPicked(added.map((a) => a.id));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setUploading(false);
    }
  };

  const choose = () => {
    const chosen = (items ?? []).filter((m) => picked.includes(m.id)).map(toMedia);
    if (!chosen.length) return;
    onSelect(multiple ? chosen : chosen[0]);
    setOpen(false);
  };

  return (
    <>
      {render({ open: () => setOpen(true) })}
      {open && (
        <Modal title={title ?? 'Media library'} onRequestClose={() => setOpen(false)} size="large">
          <div className="pp-media-bar">
            <FormFileUpload multiple accept={allowedTypes?.map((t) => (t.includes('/') ? t : `${t}/*`)).join(',')} onChange={(e: any) => upload(e.target.files)} render={({ openFileDialog }: any) => (
              <Button variant="secondary" onClick={openFileDialog} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload files'}
              </Button>
            )} />
            {error && <span className="pp-media-error">{error}</span>}
          </div>
          {items === null ? (
            <Spinner />
          ) : items.length === 0 ? (
            <p>No media yet. Upload a file to get started.</p>
          ) : (
            <ul className="pp-media-grid">
              {items.map((m) => {
                const on = picked.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="pp-media-item"
                      aria-pressed={on}
                      onClick={() => setPicked((p) => (on ? p.filter((x) => x !== m.id) : multiple ? [...p, m.id] : [m.id]))}
                      onDoubleClick={() => {
                        onSelect(multiple ? [toMedia(m)] : toMedia(m));
                        setOpen(false);
                      }}
                    >
                      {m.mime?.startsWith('image/') ? <img src={m.url} alt="" loading="lazy" /> : <span>{m.id}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="pp-media-foot">
            <Button variant="primary" disabled={!picked.length} onClick={choose}>
              Select
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

let installed = false;
export function installMediaLibrary() {
  if (installed) return;
  installed = true;
  addFilter('editor.MediaUpload', 'prepress/media-library', () => MediaUpload);
}
