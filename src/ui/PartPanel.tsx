import { useState } from 'react';
import type { PartSlug } from '../lib/types';

interface Props {
  slug: PartSlug;
  custom: boolean;
  onReset(): void;
}

/** Template part settings: what this part is, and going back to the generated version. */
export function PartPanel({ slug, custom, onReset }: Props) {
  const [confirm, setConfirm] = useState(false);
  const file = `parts/${slug}.html`;
  return (
    <>
      <p className="hint">
        The {slug} appears on every page. It exports to WordPress as the <span className="mono">{file}</span> template part, editable in the Site Editor.
      </p>
      {custom ? (
        <>
          <div className="banner">
            <div>
              <strong>Edited by hand</strong>
              Your changes are kept when you restyle or rename the site. Menu links follow when pages are added, renamed or removed.
            </div>
          </div>
          <div className="row">
            {confirm ? (
              <>
                <button className="btn small danger" onClick={() => { onReset(); setConfirm(false); }}>Discard my changes</button>
                <button className="btn small ghost" onClick={() => setConfirm(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn small" onClick={() => setConfirm(true)}>Reset to automatic</button>
            )}
          </div>
        </>
      ) : (
        <p className="hint">Generated automatically from your site title, pages and styles. Edit it here and it becomes yours to change.</p>
      )}
      <p className="hint">The site title and tagline blocks show the values from the Site tab. Menu items link to your pages; click one, then the link button, to change where it goes.</p>
    </>
  );
}
