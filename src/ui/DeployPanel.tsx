import { useEffect, useRef, useState } from 'react';
import { CloudUpload, Copy, ExternalLink, Plus } from 'lucide-react';
import {
  connectAccount,
  deployNow,
  disconnectAccount,
  loadAccounts,
  loadDeploy,
  pollAccount,
  saveDeployTargets,
  testDeployTarget,
  type AccountProvider,
  type AccountView,
  type DeployResult,
  type DeployTarget,
  type DeployTargetView,
  type DeviceStart,
} from '../lib/backend';

export const EMPTY_TARGET: DeployTarget = { id: '', name: '', connection: '', auto: true };

/** Starting points for the connection field; the user replaces the placeholder parts. */
const TEMPLATES: { label: string; value: string; hint: string }[] = [
  { label: 'Prepress (free)', value: 'prepress://my-site', hint: 'Free hosting at https://my-site.prepress.digitalno.de. Names are first come, first served; this site keeps its name for as long as you publish from this site folder.' },
  { label: 'Cloudflare Pages', value: 'cfpages://ACCOUNT_ID/my-site', hint: 'Free hosting on Cloudflare at https://my-site.pages.dev (add your own domain in the Cloudflare dashboard). The project is created on the first publish; every publish is a deployment you can roll back to.' },
  { label: 'GitHub Pages', value: 'github://OWNER/my-site', hint: 'Free hosting at https://OWNER.github.io/my-site. The repository is created (public) on the first publish; each publish is a commit on its gh-pages branch. Name the repository OWNER.github.io to serve it at the root.' },
  { label: 'SFTP', value: 'sftp://user:password@example.com/var/www/example.com', hint: 'SSH hosting. Leave out ":password" to log in with your SSH key or ssh-agent; /~/public_html = inside your home folder.' },
  { label: 'FTPS', value: 'ftps://user:password@ftp.example.com/public_html', hint: 'Shared hosting with FTP over TLS. Paths are relative to the FTP login folder.' },
  { label: 'S3', value: 's3://ACCESS_KEY:SECRET_KEY@my-bucket/site?region=eu-central-1', hint: 'Amazon S3 (enable static website hosting on the bucket, or put CloudFront in front).' },
  { label: 'R2 / MinIO', value: 's3://ACCESS_KEY:SECRET_KEY@my-bucket?endpoint=https://ACCOUNT_ID.r2.cloudflarestorage.com', hint: 'Any S3-compatible storage: set endpoint= to the provider’s S3 API URL.' },
  { label: 'Folder', value: '~/Sites/example.com', hint: 'A folder on this computer, e.g. a local web server, or a synced folder (Dropbox, iCloud).' },
];

export const TYPE_LABEL: Record<DeployTargetView['type'], string> = { sftp: 'SFTP', ftp: 'FTP', s3: 'S3', folder: 'Folder', prepress: 'Free hosting', cfpages: 'Cloudflare Pages', github: 'GitHub Pages' };

const PROVIDER_OF: Record<string, AccountProvider> = { cfpages: 'cloudflare', github: 'github' };
const PROVIDER_NAME: Record<AccountProvider, string> = { github: 'GitHub', cloudflare: 'Cloudflare' };
const TOKEN_HINT: Record<AccountProvider, string> = {
  github: 'Or paste a token: github://TOKEN@owner/repository (a fine-grained token with Contents and Pages read & write).',
  cloudflare: 'Or paste an API token: cfpages://TOKEN@ACCOUNT_ID/project (permission "Cloudflare Pages: Edit").',
};
/** cfpages:// or github:// connection → its account provider. */
const providerOf = (connection: string): AccountProvider | null => PROVIDER_OF[connection.trim().match(/^([a-z]+):\/\//i)?.[1].toLowerCase() ?? ''] ?? null;
/** The connection's account part (ACCOUNT_ID / OWNER), unless it carries its own token. */
const accountPart = (connection: string) => connection.trim().match(/^[a-z]+:\/\/([^@/?]*)(?=\/)/i)?.[1] ?? null;
const withAccount = (connection: string, account: string) => connection.trim().replace(/^([a-z]+:\/\/)[^@/?]*(?=\/)/i, `$1${account}`);

/**
 * Sign in to GitHub / Cloudflare for a publish target (OAuth device flow): a
 * code to type on the provider's site, polled until approved. Tokens stay on
 * the server; this only learns who is connected.
 */
function AccountConnect({ provider, connection, onConnection }: { provider: AccountProvider; connection: string; onConnection(c: string): void }) {
  const [acc, setAcc] = useState<AccountView | null>(null);
  const [flow, setFlow] = useState<DeviceStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const live = useRef(true);
  const name = PROVIDER_NAME[provider];

  useEffect(() => {
    live.current = true;
    loadAccounts()
      .then((a) => live.current && setAcc(a[provider]))
      .catch(() => live.current && setAcc({ available: false, connected: false }));
    return () => {
      live.current = false;
    };
  }, [provider]);

  // Fill the account into a template's placeholder once we know it.
  useEffect(() => {
    if (!acc?.connected) return;
    const part = accountPart(connection);
    const mine = provider === 'github' ? acc.label : acc.accounts?.[0]?.id;
    if (mine && (part === 'OWNER' || part === 'ACCOUNT_ID' || part === '')) onConnection(withAccount(connection, mine));
  }, [acc, connection, provider, onConnection]);

  useEffect(() => {
    if (!flow) return;
    let timer = 0;
    const tick = async () => {
      try {
        const r = await pollAccount(provider, flow.id);
        if (!live.current) return;
        if (r.status === 'connected') {
          setFlow(null);
          setAcc(r.account);
          return;
        }
        if (r.status === 'failed') {
          setFlow(null);
          setError(r.error);
          return;
        }
      } catch (e: any) {
        if (!live.current) return;
        setFlow(null);
        setError(String(e?.message ?? e));
        return;
      }
      timer = window.setTimeout(tick, flow.interval * 1000);
    };
    timer = window.setTimeout(tick, flow.interval * 1000);
    return () => window.clearTimeout(timer);
  }, [flow, provider]);

  const start = async () => {
    setError(null);
    try {
      const f = await connectAccount(provider);
      setFlow(f);
      window.open(f.authorizeUrl ?? f.verificationUriComplete ?? f.verificationUri, '_blank', 'noopener');
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  if (!acc) return null;
  if (connection.includes('@')) return <p className="hint">Publishing with the token in the connection.</p>;
  return (
    <div className="account-connect">
      {acc.connected ? (
        <div className="row">
          <span className="deploy-status ok">Connected to {name}{acc.label ? ` as ${acc.label}` : ''}.</span>
          {provider === 'cloudflare' && (acc.accounts?.length ?? 0) > 1 && (
            <select className="input" value={accountPart(connection) ?? ''} onChange={(e) => onConnection(withAccount(connection, e.target.value))} aria-label="Cloudflare account">
              {acc.accounts!.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <button className="btn small ghost" onClick={async () => setAcc((await disconnectAccount(provider))[provider])}>Disconnect</button>
        </div>
      ) : flow?.authorizeUrl ? (
        <div className="device-code">
          <p className="hint">Finish signing in to {name} in your browser: pick the account(s) Prepress may publish to and authorize. This page notices when you're done.</p>
          <div className="row">
            <a className="btn small" href={flow.authorizeUrl} target="_blank" rel="noreferrer">Open the sign-in again <ExternalLink size={14} /></a>
            <button className="btn small ghost" onClick={() => setFlow(null)}>Cancel</button>
          </div>
        </div>
      ) : flow ? (
        <div className="device-code">
          <p className="hint">Enter this code on {new URL(flow.verificationUri!).host} and approve Prepress. This page notices when you're done.</p>
          <div className="row">
            <span className="mono device-code-value">{flow.userCode}</span>
            <button className="btn small ghost" onClick={() => { void navigator.clipboard?.writeText(flow.userCode ?? ""); setCopied(true); }}><Copy size={14} /> {copied ? 'Copied' : 'Copy'}</button>
            <a className="btn small" href={flow.verificationUriComplete ?? flow.verificationUri} target="_blank" rel="noreferrer">Open {new URL(flow.verificationUri!).host} <ExternalLink size={14} /></a>
            <button className="btn small ghost" onClick={() => setFlow(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          {acc.available && (
            <div className="row">
              <button className="btn small primary" onClick={start}>Connect {name}</button>
            </div>
          )}
          <p className="hint">{TOKEN_HINT[provider]}</p>
        </>
      )}
      {error && <p className="deploy-status bad">{error}</p>}
    </div>
  );
}

export function when(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
}

export const strip = ({ id, name, connection, url, auto }: DeployTargetView): DeployTarget => ({ id, name, connection, url, auto });

/** One line about the last upload to a target. */
export function TargetStatus({ last }: { last: DeployResult | null }) {
  if (!last) return null;
  return (
    <span className={`deploy-status ${last.ok ? 'ok' : 'bad'}`} title={last.backup ? `Replaced files were backed up to ${last.backup}` : undefined}>
      {last.ok
        ? `Uploaded ${when(last.at)} · ${last.uploaded} sent${last.removed ? ` · ${last.removed} removed` : ''}${last.unchanged ? ` · ${last.unchanged} unchanged` : ''}${last.backup ? ' · backup kept' : ''}`
        : `Failed ${when(last.at)}: ${last.error}`}
    </span>
  );
}

/**
 * Add or edit one publish target: name, connection string (with templates), public URL, auto.
 * Saves the whole list (the server keeps secrets that come back masked).
 */
export function TargetForm({ targets, initial, saveLabel = 'Save', cancelable = true, siteSlug, onDone }: { targets: DeployTargetView[]; initial: DeployTarget; saveLabel?: string; cancelable?: boolean; /** Fills "my-site" in templates. */ siteSlug?: string; onDone(saved: DeployTargetView[] | null): void }) {
  const [edit, setEdit] = useState<DeployTarget>(initial);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<DeployTarget>) => setEdit((e) => ({ ...e, ...patch }));
  const insecure = /^ftp:\/\//i.test(edit.connection.trim());
  const provider = providerOf(edit.connection);
  const setConnection = useRef((c: string) => setEdit((e) => ({ ...e, connection: c }))).current;
  const fill = (s: string) => (siteSlug ? s.replaceAll('my-site', siteSlug) : s);

  const onSave = async () => {
    setBusy('save');
    setMsg(null);
    try {
      const next = edit.id ? targets.map((t) => (t.id === edit.id ? edit : strip(t))) : [...targets.map(strip), edit];
      const r = await saveDeployTargets(next);
      onDone(r.targets);
    } catch (e: any) {
      setMsg({ ok: false, text: String(e?.message ?? e) });
    } finally {
      setBusy(null);
    }
  };

  const onTest = async () => {
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

  return (
    <div className="add-box target-form">
      <div className="row">
        {TEMPLATES.map((tp) => (
          <button key={tp.label} className="btn small ghost" onClick={() => { set({ connection: fill(tp.value) }); setHint(fill(tp.hint)); setMsg(null); }}>{tp.label}</button>
        ))}
      </div>
      <input
        className="input mono"
        placeholder="prepress://my-site · cfpages://… · github://… · sftp://user:password@host/path · ftps://… · s3://KEY:SECRET@bucket/prefix · /folder"
        value={edit.connection}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => set({ connection: e.target.value })}
        aria-label="Connection"
      />
      {hint && <p className="hint">{hint}</p>}
      {provider && <AccountConnect provider={provider} connection={edit.connection} onConnection={setConnection} />}
      {insecure && <p className="deploy-status bad">ftp:// sends the password unencrypted. Prefer ftps:// or sftp://.</p>}
      <div className="row nowrap">
        <input className="input grow" placeholder="Name, e.g. Production" value={edit.name} onChange={(e) => set({ name: e.target.value })} aria-label="Name" />
        <input className="input grow2" placeholder="Public URL (optional), e.g. https://example.com" value={edit.url ?? ''} onChange={(e) => set({ url: e.target.value || undefined })} aria-label="Public URL" />
      </div>
      <label className="check">
        <input type="checkbox" checked={edit.auto} onChange={(e) => set({ auto: e.target.checked })} /> Selected by default when publishing
      </label>
      <p className="hint">Passwords and keys are saved only in this site’s folder on this computer, and are never shown again here (••••••).</p>
      {msg && <p className={`deploy-status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
      <div className="row end">
        {cancelable && <button className="btn small ghost" onClick={() => onDone(null)}>Cancel</button>}
        <button className="btn small" disabled={!!busy || !edit.connection.trim()} onClick={onTest}>{busy === 'test' ? 'Testing…' : 'Test'}</button>
        <button className="btn small primary" disabled={!!busy || !edit.connection.trim()} onClick={onSave}>{busy === 'save' ? 'Saving…' : saveLabel}</button>
      </div>
    </div>
  );
}

/** Settings → Publishing: manage where Publish uploads the site. */
export function DeployPanel({ published }: { published: boolean }) {
  const [targets, setTargets] = useState<DeployTargetView[] | null>(null);
  const [edit, setEdit] = useState<DeployTarget | null>(null);
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

  return (
    <>
      <p className="hint">Publish renders the site to plain HTML on this computer, then uploads it to the targets you pick. Only changed files are sent, and only files Prepress uploaded are ever deleted.</p>
      {targets?.length ? (
        <div className="pages-list">
          {targets.map((t) =>
            edit?.id === t.id ? (
              <TargetForm key={t.id} targets={targets} initial={edit} onDone={(saved) => { if (saved) setTargets(saved); setEdit(null); }} />
            ) : (
              <div key={t.id} className="deploy-row">
                <div className="deploy-head">
                  <span className="section-name">{t.name}</span>
                  <span className="pill neutral">{TYPE_LABEL[t.type]}</span>
                  {t.auto && <span className="pill accent">default</span>}
                </div>
                <span className="mono deploy-dest" title={t.connection}>{t.connection}</span>
                {t.insecure && <span className="deploy-status bad">Plain FTP: the password is sent unencrypted. Use ftps:// if your host supports it.</span>}
                <TargetStatus last={t.last} />
                <div className="row">
                  <button className="btn small" disabled={!published || !!busy} onClick={() => onDeploy(t.id)} title={published ? 'Upload the last published version' : 'Publish first'}>
                    <CloudUpload size={14} /> {busy === t.id ? 'Uploading…' : 'Upload now'}
                  </button>
                  {t.url && <a className="btn small ghost" href={t.url} target="_blank" rel="noreferrer">Open <ExternalLink size={14} /></a>}
                  <button className="btn small ghost" disabled={!!busy} onClick={() => { setEdit(strip(t)); setMsg(null); }}>Edit</button>
                  {confirm === t.id ? (
                    <button className="btn small danger" onClick={() => onRemove(t.id)}>Remove target</button>
                  ) : (
                    <button className="btn small ghost danger" onClick={() => setConfirm(t.id)}>Remove</button>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      ) : targets && !edit ? (
        <p className="hint">No targets yet. Add your host to publish the site there; until then Publish only renders it on this computer.</p>
      ) : null}

      {edit && !edit.id && targets && <TargetForm targets={targets} initial={edit} onDone={(saved) => { if (saved) setTargets(saved); setEdit(null); }} />}
      {msg && <p className={`deploy-status ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
      {!edit && (
        <div className="row">
          <button className="btn small" onClick={() => { setEdit({ ...EMPTY_TARGET }); setMsg(null); }}><Plus size={14} /> Add publish target</button>
        </div>
      )}
    </>
  );
}
