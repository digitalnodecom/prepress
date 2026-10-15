import { useEffect, useState } from 'react';
import { deployNow, loadDeploy, saveDeployTargets, testDeployTarget, type DeployTarget, type DeployTargetView } from '../lib/backend';

const EMPTY: DeployTarget = { id: '', name: '', type: 'sftp', path: '', host: '', user: '', auto: true };

function dest(t: DeployTarget) {
  if (t.type === 'folder') return t.path;
  return `${t.user ? `${t.user}@` : ''}${t.host}${t.port ? `:${t.port}` : ''}:${t.path}`;
}

function when(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
}

/** Where the published static site is copied to: other folders on this machine or SFTP servers. */
export function DeployPanel({ published }: { published: boolean }) {
  const [targets, setTargets] = useState<DeployTargetView[] | null>(null);
  const [outDir, setOutDir] = useState('');
  const [edit, setEdit] = useState<DeployTarget | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = () =>
    loadDeploy()
      .then((r) => {
        setTargets(r.targets);
        setOutDir(r.outDir);
      })
      .catch(() => setTargets([]));
  useEffect(() => {
    void load();
    const on = () => void load();
    window.addEventListener('pp:deployed', on);
    return () => window.removeEventListener('pp:deployed', on);
  }, []);

  const strip = ({ last, ...t }: DeployTargetView) => t;

  const save = async (next: DeployTarget[]) => {
    const r = await saveDeployTargets(next);
    setTargets(r.targets);
  };

  const onSave = async () => {
    if (!edit || !targets) return;
    setBusy('save');
    setMsg(null);
    try {
      const rest = targets.map(strip).filter((t) => t.id !== edit.id);
      await save(edit.id ? targets.map((t) => (t.id === edit.id ? edit : strip(t))) : [...rest, edit]);
      setEdit(null);
    } catch (e: any) {
      setMsg({ ok: false, text: String(e?.message ?? e) });
    } finally {
      setBusy(null);
    }
  };

  const onTest = async () => {
    if (!edit) return;
    setBusy('test');
    setMsg(null);
    try {
      const r = await testDeployTarget(edit);
      setMsg({ ok: r.ok, text: r.message });
    } finally {
      setBusy(null);
    }
  };

  const onDeploy = async (id: string) => {
    setBusy(id);
    try {
      await deployNow(id);
    } catch (e: any) {
      setMsg({ ok: false, text: String(e?.message ?? e) });
    } finally {
      await load();
      setBusy(null);
    }
  };

  const onRemove = async (id: string) => {
    setConfirm(null);
    await save(targets!.filter((t) => t.id !== id).map(strip));
  };

  const set = (patch: Partial<DeployTarget>) => setEdit((e) => (e ? { ...e, ...patch } : e));

  return (
    <>
      <span className="eyebrow">Deploy</span>
      <p className="hint">
        Publish writes the static site to <span className="mono">{outDir || '…'}</span> (previewed at this server's <a href="/" target="_blank" rel="noreferrer">/</a>). Deploy targets get a copy: another folder your web server serves, or a remote server over SFTP. Only files Prepress uploaded are ever removed.
      </p>
      {targets?.length ? (
        <div className="pages-list">
          {targets.map((t) => (
            <div key={t.id} className="deploy-row">
              <div className="deploy-head">
                <span className="section-name">{t.name}</span>
                <span className={`pill ${t.auto ? 'accent' : 'neutral'}`}>{t.auto ? 'on publish' : 'manual'}</span>
              </div>
              <span className="mono deploy-dest" title={dest(t)}>{t.type === 'sftp' ? 'sftp ' : ''}{dest(t)}</span>
              {t.last && (
                <span className={`deploy-status ${t.last.ok ? 'ok' : 'bad'}`} title={t.last.backup ? `Replaced files were backed up to ${t.last.backup}` : undefined}>
                  {t.last.ok
                    ? `Deployed ${when(t.last.at)} · ${t.last.uploaded} uploaded${t.last.removed ? ` · ${t.last.removed} removed` : ''}${t.last.unchanged ? ` · ${t.last.unchanged} unchanged` : ''}${t.last.backup ? ' · backup kept' : ''}`
                    : `Failed ${when(t.last.at)}: ${t.last.error}`}
                </span>
              )}
              <div className="row">
                <button className="btn small" disabled={!published || !!busy} onClick={() => onDeploy(t.id)} title={published ? 'Push the last published version' : 'Publish first'}>
                  {busy === t.id ? 'Deploying…' : 'Deploy now'}
                </button>
                {t.url && <a className="btn small ghost" href={t.url} target="_blank" rel="noreferrer">Open ↗</a>}
                <button className="btn small ghost" disabled={!!busy} onClick={() => { setEdit(strip(t)); setMsg(null); }}>Edit</button>
                {confirm === t.id ? (
                  <button className="btn small danger" onClick={() => onRemove(t.id)}>Remove target</button>
                ) : (
                  <button className="btn small ghost danger" onClick={() => setConfirm(t.id)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : targets && !edit ? (
        <p className="hint">No deploy targets. The site is only in the publish folder above.</p>
      ) : null}

      {edit ? (
        <div className="add-box">
          <div className="row">
            <button className={`btn small ${edit.type === 'sftp' ? 'primary' : 'ghost'}`} onClick={() => set({ type: 'sftp' })}>Remote (SFTP)</button>
            <button className={`btn small ${edit.type === 'folder' ? 'primary' : 'ghost'}`} onClick={() => set({ type: 'folder' })}>Local folder</button>
          </div>
          <input className="input" placeholder="Name, e.g. Production" value={edit.name} onChange={(e) => set({ name: e.target.value })} />
          {edit.type === 'sftp' && (
            <>
              <div className="row nowrap">
                <input className="input grow" placeholder="user" value={edit.user ?? ''} onChange={(e) => set({ user: e.target.value })} aria-label="User" />
                <input className="input grow2" placeholder="host or ~/.ssh/config alias" value={edit.host ?? ''} onChange={(e) => set({ host: e.target.value })} aria-label="Host" />
                <input className="input port" placeholder="22" value={edit.port ?? ''} onChange={(e) => set({ port: e.target.value ? Number(e.target.value) || (e.target.value as any) : undefined })} aria-label="Port" />
              </div>
              <input className="input" placeholder="Remote folder, e.g. /var/www/example.com or public_html" value={edit.path} onChange={(e) => set({ path: e.target.value })} />
              <input className="input" placeholder="Key file (optional; default: ssh-agent / ~/.ssh keys)" value={edit.identityFile ?? ''} onChange={(e) => set({ identityFile: e.target.value || undefined })} />
              <p className="hint">Uses this machine's SSH keys (no passwords). Add the key to the server once with <span className="mono">ssh-copy-id user@host</span>.</p>
            </>
          )}
          {edit.type === 'folder' && (
            <input className="input" placeholder="Folder on this machine, e.g. /var/www/example.com" value={edit.path} onChange={(e) => set({ path: e.target.value })} />
          )}
          <input className="input" placeholder="Public URL (optional), e.g. https://example.com" value={edit.url ?? ''} onChange={(e) => set({ url: e.target.value || undefined })} />
          <label className="check">
            <input type="checkbox" checked={edit.auto} onChange={(e) => set({ auto: e.target.checked })} /> Deploy automatically on Publish
          </label>
          {msg && <p className={`deploy-status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
          <div className="row end">
            <button className="btn small ghost" onClick={() => { setEdit(null); setMsg(null); }}>Cancel</button>
            <button className="btn small" disabled={!!busy || !edit.path.trim() || (edit.type === 'sftp' && !edit.host?.trim())} onClick={onTest}>{busy === 'test' ? 'Testing…' : 'Test'}</button>
            <button className="btn small primary" disabled={!!busy || !edit.path.trim()} onClick={onSave}>Save</button>
          </div>
        </div>
      ) : (
        <>
          {msg && <p className={`deploy-status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
          <div className="row">
            <button className="btn small" onClick={() => { setEdit({ ...EMPTY }); setMsg(null); }}>Add deploy target</button>
          </div>
        </>
      )}
    </>
  );
}
