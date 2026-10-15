import { useEffect, useState } from 'react';
import { CloudUpload, ExternalLink, Plus } from 'lucide-react';
import { deployNow, loadDeploy, saveDeployTargets, testDeployTarget, type DeployTarget, type DeployTargetView } from '../lib/backend';

const EMPTY: DeployTarget = { id: '', name: '', connection: '', auto: true };

/** Starting points for the connection field; the user replaces the <…> parts. */
const TEMPLATES: { label: string; value: string; hint: string }[] = [
  { label: 'SFTP', value: 'sftp://user:password@example.com/var/www/example.com', hint: 'SSH hosting. Leave out ":password" to log in with your SSH key or ssh-agent; /~/public_html = inside your home folder.' },
  { label: 'FTPS', value: 'ftps://user:password@ftp.example.com/public_html', hint: 'Shared hosting with FTP over TLS. Paths are relative to the FTP login folder.' },
  { label: 'S3', value: 's3://ACCESS_KEY:SECRET_KEY@my-bucket/site?region=eu-central-1', hint: 'Amazon S3 (enable static website hosting on the bucket, or put CloudFront in front).' },
  { label: 'R2 / MinIO', value: 's3://ACCESS_KEY:SECRET_KEY@my-bucket?endpoint=https://ACCOUNT_ID.r2.cloudflarestorage.com', hint: 'Any S3-compatible storage: set endpoint= to the provider’s S3 API URL.' },
  { label: 'Folder', value: '~/Sites/example.com', hint: 'A folder on this computer, e.g. a local web server, or a synced folder (Dropbox, iCloud).' },
];

const TYPE_LABEL: Record<DeployTargetView['type'], string> = { sftp: 'SFTP', ftp: 'FTP', s3: 'S3', folder: 'Folder' };

function when(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
}

/** Where Publish uploads the site: SFTP / FTP(S) / S3 connections or local folders. */
export function DeployPanel({ published }: { published: boolean }) {
  const [targets, setTargets] = useState<DeployTargetView[] | null>(null);
  const [edit, setEdit] = useState<DeployTarget | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = () =>
    loadDeploy()
      .then((r) => setTargets(r.targets))
      .catch(() => setTargets([]));
  useEffect(() => {
    void load();
    const on = () => void load();
    window.addEventListener('pp:deployed', on);
    return () => window.removeEventListener('pp:deployed', on);
  }, []);

  const strip = ({ id, name, connection, url, auto }: DeployTargetView): DeployTarget => ({ id, name, connection, url, auto });

  const onSave = async () => {
    if (!edit || !targets) return;
    setBusy('save');
    setMsg(null);
    try {
      const next = edit.id ? targets.map((t) => (t.id === edit.id ? edit : strip(t))) : [...targets.map(strip), edit];
      const r = await saveDeployTargets(next);
      setTargets(r.targets);
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
    } catch (e: any) {
      setMsg({ ok: false, text: String(e?.message ?? e) });
    } finally {
      setBusy(null);
    }
  };

  const onDeploy = async (id: string) => {
    setBusy(id);
    setMsg(null);
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
    const r = await saveDeployTargets(targets!.filter((t) => t.id !== id).map(strip));
    setTargets(r.targets);
  };

  const set = (patch: Partial<DeployTarget>) => setEdit((e) => (e ? { ...e, ...patch } : e));
  const insecure = !!edit && /^ftp:\/\//i.test(edit.connection.trim());

  return (
    <>
      <span className="eyebrow">Publish to</span>
      <p className="hint">Publish renders the site to plain HTML on this computer, then uploads it to these targets. Only changed files are sent, and only files Prepress uploaded are ever deleted.</p>
      {targets?.length ? (
        <div className="pages-list">
          {targets.map((t) => (
            <div key={t.id} className="deploy-row">
              <div className="deploy-head">
                <span className="section-name">{t.name}</span>
                <span className="pill neutral">{TYPE_LABEL[t.type]}</span>
                <span className={`pill ${t.auto ? 'accent' : 'neutral'}`}>{t.auto ? 'on publish' : 'manual'}</span>
              </div>
              <span className="mono deploy-dest" title={t.connection}>{t.connection}</span>
              {t.insecure && <span className="deploy-status bad">Plain FTP: the password is sent unencrypted. Use ftps:// if your host supports it.</span>}
              {t.last && (
                <span className={`deploy-status ${t.last.ok ? 'ok' : 'bad'}`} title={t.last.backup ? `Replaced files were backed up to ${t.last.backup}` : undefined}>
                  {t.last.ok
                    ? `Uploaded ${when(t.last.at)} · ${t.last.uploaded} sent${t.last.removed ? ` · ${t.last.removed} removed` : ''}${t.last.unchanged ? ` · ${t.last.unchanged} unchanged` : ''}${t.last.backup ? ' · backup kept' : ''}`
                    : `Failed ${when(t.last.at)}: ${t.last.error}`}
                </span>
              )}
              <div className="row">
                <button className="btn small" disabled={!published || !!busy} onClick={() => onDeploy(t.id)} title={published ? 'Upload the last published version' : 'Publish first'}>
                  <CloudUpload size={14} /> {busy === t.id ? 'Uploading…' : 'Upload now'}
                </button>
                {t.url && <a className="btn small ghost" href={t.url} target="_blank" rel="noreferrer">Open <ExternalLink size={14} /></a>}
                <button className="btn small ghost" disabled={!!busy} onClick={() => { setEdit(strip(t)); setHint(null); setMsg(null); }}>Edit</button>
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
        <p className="hint">No targets yet. Add your host to publish the site there; until then Publish only renders it on this computer.</p>
      ) : null}

      {edit ? (
        <div className="add-box">
          <input className="input" placeholder="Name, e.g. Production" value={edit.name} onChange={(e) => set({ name: e.target.value })} />
          <div className="row">
            {TEMPLATES.map((tp) => (
              <button key={tp.label} className="btn small ghost" onClick={() => { set({ connection: tp.value }); setHint(tp.hint); setMsg(null); }}>{tp.label}</button>
            ))}
          </div>
          <input
            className="input mono"
            placeholder="sftp://user:password@host/path · ftps://… · s3://KEY:SECRET@bucket/prefix · /folder"
            value={edit.connection}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(e) => set({ connection: e.target.value })}
            aria-label="Connection"
          />
          {hint && <p className="hint">{hint}</p>}
          {insecure && <p className="deploy-status bad">ftp:// sends the password unencrypted. Prefer ftps:// or sftp://.</p>}
          <input className="input" placeholder="Public URL (optional), e.g. https://example.com" value={edit.url ?? ''} onChange={(e) => set({ url: e.target.value || undefined })} />
          <label className="check">
            <input type="checkbox" checked={edit.auto} onChange={(e) => set({ auto: e.target.checked })} /> Upload automatically on Publish
          </label>
          <p className="hint">Passwords and keys are saved only in this site’s folder on this computer, and are never shown again here (••••••).</p>
          {msg && <p className={`deploy-status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
          <div className="row end">
            <button className="btn small ghost" onClick={() => { setEdit(null); setMsg(null); }}>Cancel</button>
            <button className="btn small" disabled={!!busy || !edit.connection.trim()} onClick={onTest}>{busy === 'test' ? 'Testing…' : 'Test'}</button>
            <button className="btn small primary" disabled={!!busy || !edit.connection.trim()} onClick={onSave}>Save</button>
          </div>
        </div>
      ) : (
        <>
          {msg && <p className={`deploy-status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
          <div className="row">
            <button className="btn small" onClick={() => { setEdit({ ...EMPTY }); setHint(null); setMsg(null); }}><Plus size={14} /> Add publish target</button>
          </div>
        </>
      )}
    </>
  );
}
