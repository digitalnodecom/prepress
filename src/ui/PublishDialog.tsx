import { useEffect, useState } from 'react';
import { CheckCircle2, CloudUpload, ExternalLink, Globe, Plus, XCircle } from 'lucide-react';
import { checkHostingName, loadDeploy, saveDeployTargets, type DeployResult, type DeployTargetView, type HostingCheck } from '../lib/backend';
import { EMPTY_TARGET, TYPE_LABEL, TargetForm, TargetStatus } from './DeployPanel';

interface Props {
  pages: number;
  /** Suggests the free hosting name. */
  siteName: string;
  onPublish(targets: string[]): Promise<{ deploys: DeployResult[] }>;
  onClose(): void;
}

/**
 * Publish: render the site to static HTML, then upload it to the chosen
 * targets (SFTP, FTP, S3, folders). With no targets yet, it starts with the
 * connection form so the first publish goes straight to the host.
 */
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** "Publish free at <name>.prepress.digitalno.de": live name check, then add the target and publish. */
function FreeHosting({ suggestion, busy, onUse }: { suggestion: string; busy: boolean; onUse(name: string): void }) {
  const [name, setName] = useState(suggestion);
  const [check, setCheck] = useState<HostingCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setCheck(null);
    setError(null);
    if (name.length < 3) return;
    const t = window.setTimeout(() => {
      checkHostingName(name)
        .then((c) => (c.name === name ? setCheck(c) : undefined))
        .catch((e) => setError(String(e?.message ?? e)));
    }, 300);
    return () => window.clearTimeout(t);
  }, [name]);
  const usable = !!check && check.valid && (check.available || check.owner);
  return (
    <div className="free-hosting">
      <div className="free-hosting-head">
        <Globe size={18} />
        <div>
          <strong>Free on prepress.digitalno.de</strong>
          <p className="hint">Your site at its own address, hosted by Prepress. Names are first come, first served; this site keeps its name for as long as you publish from it.</p>
        </div>
      </div>
      <div className="row nowrap free-hosting-row">
        <div className="free-name">
          <input className="input mono" value={name} onChange={(e) => setName(slug(e.target.value) || e.target.value.toLowerCase())} aria-label="Site address" spellCheck={false} autoCapitalize="off" />
          <span className="mono">.prepress.digitalno.de</span>
        </div>
        <button className="btn primary" disabled={busy || !usable} onClick={() => onUse(name)}><CloudUpload size={16} /> Publish here</button>
      </div>
      <p className={`deploy-status ${error || (check && !usable) ? 'bad' : 'ok'}`}>
        {error ?? (!check ? (name.length < 3 ? 'At least 3 characters.' : 'Checking…') : check.owner ? 'This address is already yours.' : check.available ? `${check.url.replace('https://', '')} is free.` : check.reason === 'Taken' ? 'Taken — try another name.' : check.reason)}
      </p>
    </div>
  );
}

export function PublishDialog({ pages, siteName, onPublish, onClose }: Props) {
  const [targets, setTargets] = useState<DeployTargetView[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<DeployResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (select?: (t: DeployTargetView[]) => string[]) => {
    try {
      const r = await loadDeploy();
      setTargets(r.targets);
      setChosen(new Set(select ? select(r.targets) : r.targets.filter((t) => t.auto).map((t) => t.id)));

    } catch (e: any) {
      setTargets([]);
      setError(String(e?.message ?? e));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [busy, onClose]);

  const toggle = (id: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const run = async (ids: string[]) => {
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const r = await onPublish(ids);
      setResults(r.deploys);
      await load(() => ids);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const ids = [...chosen];
  const result = (id: string) => results?.find((r) => r.id === id);
  const done = results !== null;
  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="dialog publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <h2 id="publish-title">Publish</h2>
        <p>
          Renders {pages} {pages === 1 ? 'page' : 'pages'} to plain HTML on this computer and uploads them. Only changed files are sent.{' '}
          <a href="/" target="_blank" rel="noreferrer">Preview locally <ExternalLink size={13} /></a>
        </p>

        {!targets ? (
          <p className="hint">Loading…</p>
        ) : (
          <>
            {!targets.some((t) => t.type === 'prepress') && !adding && (
              <FreeHosting
                suggestion={slug(siteName)}
                busy={busy}
                onUse={async (name) => {
                  setError(null);
                  try {
                    const strip = ({ id, name: n, connection, url, auto }: DeployTargetView) => ({ id, name: n, connection, url, auto });
                    const saved = await saveDeployTargets([...targets.map(strip), { id: '', name: 'Prepress (free)', connection: `prepress://${name}`, auto: true }]);
                    const added = saved.targets.find((t) => t.type === 'prepress');
                    setTargets(saved.targets);
                    if (added) await run([...ids, added.id]);
                  } catch (e: any) {
                    setError(String(e?.message ?? e));
                  }
                }}
              />
            )}

            {targets.length > 0 && (
              <div className="publish-targets" role="group" aria-label="Upload to">
                <span className="eyebrow">Upload to</span>
                {targets.map((t) => {
                  const r = result(t.id);
                  return (
                    <label key={t.id} className={`publish-target${chosen.has(t.id) ? ' on' : ''}`}>
                      <input type="checkbox" checked={chosen.has(t.id)} disabled={busy} onChange={() => toggle(t.id)} />
                      <span className="publish-target-body">
                        <span className="deploy-head">
                          <span className="section-name">{t.name}</span>
                          <span className="pill neutral">{TYPE_LABEL[t.type]}</span>
                          {r && (r.ok ? <CheckCircle2 size={16} className="ok-icon" aria-label="Uploaded" /> : <XCircle size={16} className="bad-icon" aria-label="Failed" />)}
                        </span>
                        <span className="mono deploy-dest" title={t.connection}>{t.connection}</span>
                        <TargetStatus last={r ?? t.last} />
                      </span>
                      {t.url && r?.ok && (
                        <a className="btn small ghost" href={t.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Open <ExternalLink size={14} /></a>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {adding ? (
              <>
                {!targets.length && (
                  <div>
                    <span className="eyebrow">Your own host</span>
                    <p className="hint">Paste the connection your host gave you, or pick a template and fill it in. You can add more targets later in Settings → Publishing.</p>
                  </div>
                )}
                <TargetForm
                  targets={targets}
                  initial={{ ...EMPTY_TARGET }}
                  saveLabel="Save target"
                  cancelable={targets.length > 0}
                  onDone={async (saved) => {
                    setAdding(false);
                    if (saved) {
                      const added = saved.find((t) => !targets.some((o) => o.id === t.id));
                      await load((all) => [...ids, ...(added ? [added.id] : [])].filter((id) => all.some((t) => t.id === id)));
                    }
                  }}
                />
              </>
            ) : (
              <div className="row">
                <button className="btn small ghost" disabled={busy} onClick={() => setAdding(true)}><Plus size={14} /> {targets.length ? 'Add target' : 'Use your own host (SFTP, FTP, S3, folder)'}</button>
              </div>
            )}

            {error && <p className="deploy-status bad">{error}</p>}
            {done && !error && (
              <p className={`deploy-status ${failed.length ? 'bad' : 'ok'}`}>
                {failed.length
                  ? `Published, but ${failed.length} upload${failed.length > 1 ? 's' : ''} failed. Fix the connection (Settings → Publishing) and publish again.`
                  : results!.length
                    ? `Published and uploaded to ${results!.map((r) => r.name).join(', ')}.`
                    : 'Rendered on this computer (nothing uploaded).'}
              </p>
            )}

            <div className="row end">
              {!targets.length && !done && (
                <button className="btn ghost grow-left" disabled={busy} onClick={() => run([])} title="Render the static site on this computer without uploading it">Only render locally</button>
              )}
              <button className="btn ghost" disabled={busy} onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
              {targets.length > 0 && (
                <button className="btn primary" disabled={busy || adding} onClick={() => run(ids)}>
                  <CloudUpload size={16} /> {busy ? 'Publishing…' : ids.length ? `Publish to ${ids.length === 1 ? targets.find((t) => t.id === ids[0])?.name : `${ids.length} targets`}` : 'Render only'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
