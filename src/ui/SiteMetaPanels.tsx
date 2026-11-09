import { useEffect, useState } from 'react';
import { TriangleAlert, Upload } from 'lucide-react';
import type { Site } from '../lib/types';
import { uploadMedia } from '../lib/backend';
import { CODE_MAX, INTEGRATIONS, cleanCode, cleanIntegration, consentNeeded, mergeConsent, mergeIntegrations, mergeSeo, type IntegrationDef } from '../lib/siteMeta';

type Update = (f: (s: Site) => Site) => void;

/** A text field that is checked and saved when it loses focus; shows the problem instead of saving a bad value. */
function CommitField({ id, label, value, placeholder, hint, mono, onCommit }: { id: string; label: string; value: string; placeholder?: string; hint?: string; mono?: boolean; onCommit(v: string): void }) {
  const [v, setV] = useState(value);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    if (v === value) return setError(null);
    try {
      onCommit(v);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className={`input${mono ? ' mono' : ''}`} value={v} placeholder={placeholder} spellCheck={false} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
      {error ? <p className="deploy-status bad">{error}</p> : hint && <p className="hint">{hint}</p>}
    </div>
  );
}

/** An image setting: a media-library file or an https URL, with an upload button on the server. */
function MediaField({ id, label, value, hint, accept, serverMode, onCommit }: { id: string; label: string; value: string; hint: string; accept: string; serverMode: boolean; onCommit(v: string): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="media-field">
      {value && <img src={value} alt="" className="media-field-thumb" />}
      <div className="grow">
        <CommitField id={id} label={label} value={value} placeholder="/uploads/… or https://…" hint={hint} mono onCommit={onCommit} />
        {serverMode && (
          <label className="btn small ghost" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> {busy ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept={accept}
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setBusy(true);
                setError(null);
                try {
                  onCommit((await uploadMedia(f)).url);
                } catch (err: any) {
                  setError(String(err?.message ?? err));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        )}
        {error && <p className="deploy-status bad">{error}</p>}
      </div>
    </div>
  );
}

function IntegrationField({ def, site, onSite }: { def: IntegrationDef; site: Site; onSite: Update }) {
  return (
    <CommitField
      id={`int-${def.id}`}
      label={def.label}
      value={site.integrations?.[def.id] ?? ''}
      placeholder={def.placeholder}
      hint={def.hint}
      mono
      onCommit={(v) => {
        cleanIntegration(def.id, v); // throws a readable message for a bad value
        onSite((s) => ({ ...s, integrations: mergeIntegrations(s.integrations, { [def.id]: v }) }));
      }}
    />
  );
}

/** Settings → Search & sharing. */
export function SearchPanel({ site, serverMode, onSite }: { site: Site; serverMode: boolean; onSite: Update }) {
  const seo = site.seo ?? {};
  const setSeo = (patch: Parameters<typeof mergeSeo>[1]) => {
    const next = mergeSeo(site.seo, patch); // validate before handing the update over
    onSite((s) => ({ ...s, seo: next }));
  };
  return (
    <>
      <h3>Search & sharing</h3>
      <CommitField
        id="seo-url"
        label="Site address"
        value={seo.url ?? ''}
        placeholder="https://example.com"
        hint="Where the site is live. Used for canonical links, sitemap.xml and link previews. Empty: the first publish target's address."
        mono
        onCommit={(v) => setSeo({ url: v })}
      />
      <div className="field">
        <label htmlFor="seo-description">Description</label>
        <textarea
          id="seo-description"
          className="textarea"
          rows={3}
          maxLength={300}
          defaultValue={seo.description ?? ''}
          key={seo.description ?? ''}
          placeholder={site.tagline || 'What the site is, in one or two sentences.'}
          onBlur={(e) => e.target.value !== (seo.description ?? '') && setSeo({ description: e.target.value })}
        />
        <p className="hint">For search results and link previews. Each page can have its own (Page tab).</p>
      </div>
      <MediaField id="seo-image" label="Social image" value={seo.image ?? ''} accept="image/png,image/jpeg,image/webp" serverMode={serverMode} hint="Shown when a link to the site is shared. 1200 × 630 works everywhere." onCommit={(v) => setSeo({ image: v })} />
      <MediaField id="seo-favicon" label="Favicon" value={seo.favicon ?? ''} accept="image/png,image/x-icon,image/vnd.microsoft.icon" serverMode={serverMode} hint="The browser tab icon: a square PNG (at least 48 × 48) or an .ico file." onCommit={(v) => setSeo({ favicon: v })} />
      <label className="check">
        <input type="checkbox" checked={!!seo.noindex} onChange={(e) => setSeo({ noindex: e.target.checked })} /> Ask search engines not to index this site
      </label>
      <hr className="sep" />
      <span className="eyebrow">Verify ownership</span>
      {INTEGRATIONS.filter((d) => d.kind === 'verification').map((d) => <IntegrationField key={d.id} def={d} site={site} onSite={onSite} />)}
      <p className="hint">Publish adds <span className="mono">robots.txt</span> and, once the site address is known, <span className="mono">sitemap.xml</span>: submit <span className="mono">{(seo.url || 'https://your-site')}/sitemap.xml</span> in Search Console.</p>
    </>
  );
}

/** Settings → Analytics & code. */
export function TrackingPanel({ site, onSite }: { site: Site; onSite: Update }) {
  const consent = site.consent ?? {};
  const code = site.code ?? {};
  const [head, setHead] = useState(code.head ?? '');
  const [body, setBody] = useState(code.bodyEnd ?? '');
  useEffect(() => {
    setHead(code.head ?? '');
    setBody(code.bodyEnd ?? '');
  }, [code.head, code.bodyEnd]);
  const setCode = (patch: Partial<NonNullable<Site['code']>>) => onSite((s) => ({ ...s, code: cleanCode({ ...s.code, ...patch }) }));
  const setConsent = (patch: Parameters<typeof mergeConsent>[1]) => onSite((s) => ({ ...s, consent: mergeConsent(s.consent, patch) }));
  const banner = consentNeeded(site);
  const waits = INTEGRATIONS.filter((d) => d.consent && site.integrations?.[d.id]);

  return (
    <>
      <h3>Analytics & code</h3>
      <span className="eyebrow">Analytics</span>
      <p className="hint">Paste the id (or the provider's whole snippet); Prepress adds the tracking code to every published page. Not in the editor or previews.</p>
      {INTEGRATIONS.filter((d) => d.kind === 'analytics').map((d) => <IntegrationField key={d.id} def={d} site={site} onSite={onSite} />)}

      <hr className="sep" />
      <span className="eyebrow">Cookie banner</span>
      <label className="check">
        <input type="checkbox" checked={consent.mode !== 'off'} onChange={(e) => setConsent({ mode: e.target.checked ? 'auto' : 'off' })} /> Ask visitors before loading anything that uses cookies
      </label>
      <p className="hint">
        {consent.mode === 'off'
          ? 'Everything loads right away. In the EU and UK, analytics that set cookies need the visitor’s consent first.'
          : banner
            ? `The banner is shown until a visitor answers; ${[...waits.map((d) => d.label), ...(code.needsConsent && (code.head || code.bodyEnd) ? ['your code'] : [])].join(', ')} load only after “Accept”. A link to #cookie-settings (e.g. in the footer) reopens it.`
            : 'Nothing needs consent right now (Plausible, Fathom and Umami don’t use cookies), so no banner is shown.'}
      </p>
      {consent.mode !== 'off' && banner && (
        <>
          <CommitField id="consent-text" label="Banner text" value={consent.text ?? ''} placeholder="This site would like to use cookies to understand how it is used. Is that all right?" onCommit={(v) => setConsent({ text: v })} />
          <div className="row nowrap">
            <div className="grow"><CommitField id="consent-accept" label="Accept button" value={consent.accept ?? ''} placeholder="Accept" onCommit={(v) => setConsent({ accept: v })} /></div>
            <div className="grow"><CommitField id="consent-reject" label="Reject button" value={consent.reject ?? ''} placeholder="No, thanks" onCommit={(v) => setConsent({ reject: v })} /></div>
          </div>
        </>
      )}

      <hr className="sep" />
      <span className="eyebrow">Custom code</span>
      <p className="deploy-status bad code-warning">
        <TriangleAlert size={14} /> Runs on every published page, for every visitor, exactly as written. Only paste code from a source you trust. AI clients can’t read or change it.
      </p>
      <div className="field">
        <label htmlFor="code-head">Before &lt;/head&gt;</label>
        <textarea id="code-head" className="textarea mono" rows={5} maxLength={CODE_MAX} spellCheck={false} value={head} placeholder={'<script src="https://…"></script>'} onChange={(e) => setHead(e.target.value)} onBlur={() => head !== (code.head ?? '') && setCode({ head })} />
      </div>
      <div className="field">
        <label htmlFor="code-body">Before &lt;/body&gt;</label>
        <textarea id="code-body" className="textarea mono" rows={5} maxLength={CODE_MAX} spellCheck={false} value={body} placeholder="<!-- chat widget, embeds … -->" onChange={(e) => setBody(e.target.value)} onBlur={() => body !== (code.bodyEnd ?? '') && setCode({ bodyEnd: body })} />
      </div>
      <label className="check">
        <input type="checkbox" checked={!!code.needsConsent} disabled={!code.head && !code.bodyEnd} onChange={(e) => setCode({ needsConsent: e.target.checked })} /> This code uses cookies: load it only after the visitor accepts
      </label>
      <p className="hint">Never runs inside the editor. The local preview of the published site runs it sandboxed, away from the editor. Exported to WordPress in <span className="mono">inc/site-code.php</span>.</p>
    </>
  );
}
