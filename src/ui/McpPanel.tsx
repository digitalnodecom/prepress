import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Copy, Eye, EyeOff, Plug, RefreshCw, Unplug } from 'lucide-react';

/** GET /api/mcp: how AI clients connect, depending on where Prepress runs. */
type McpInfo =
  /** Desktop app: the AI client starts `prepress mcp` itself (stdio). */
  | { mode: 'stdio'; stdio: { command: string; args: string[] } | null; name: string | null; clients: AiApp[] }
  /** Prepress on a server / standalone binary: HTTP endpoint + bearer token. */
  | { mode: 'http'; enabled: boolean; token: string | null; fixed: boolean };

/** An AI app on this computer that Prepress can add itself to (server/clients.ts). */
interface AiApp {
  id: string;
  name: string;
  installed: boolean;
  connected: boolean;
  outdated: boolean;
  file: string;
  after: string;
  problem?: string;
}

const shq = (a: string) => (/^[\w@%+=:,./~-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);

/** Connection details for AI clients (MCP). All AI editing happens through these. */
export function McpPanel() {
  const [info, setInfo] = useState<McpInfo | null>(null);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const load = () =>
    fetch('/api/mcp', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => setInfo(null));
  useEffect(() => {
    void load();
  }, []);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const setApp = async (app: AiApp, action: 'connect' | 'disconnect') => {
    setBusy(app.id);
    setNote(null);
    try {
      const r = await fetch('/api/mcp/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: app.id, action }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setNote({ id: app.id, ok: true, text: action === 'connect' ? `Added to ${app.name}. ${app.after}` : `Removed from ${app.name}.` });
      await load();
    } catch (e: any) {
      setNote({ id: app.id, ok: false, text: String(e?.message ?? e) });
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setConfirm(false);
    const r = await fetch('/api/mcp/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (r.ok) {
      await load();
      setShow(true);
    }
  };

  const intro = (
    <p className="hint">
      Connect an AI (Claude Desktop, Claude Code, any MCP client) to write and change this site: pages and sections, header/footer, styles, theme.json, custom blocks and patterns — and publish it. The editor updates live while it works.
    </p>
  );

  if (!info) {
    return (
      <>
        <p className="hint">Loading…</p>
      </>
    );
  }

  if (info.mode === 'stdio') {
    const local = info.stdio;
    const command = local ? `claude mcp add prepress -- ${[local.command, ...local.args].map(shq).join(' ')}` : '';
    const desktopJson = local ? JSON.stringify({ mcpServers: { [info.name ?? 'prepress']: { command: local.command, args: local.args } } }, null, 2) : '';
    const apps = [...info.clients].sort((x, y) => Number(y.installed || y.connected) - Number(x.installed || x.connected));
    return (
      <>
        {intro}
        {!local ? (
          <p className="hint">Not available in this build.</p>
        ) : (
          <>
            <div className="ai-apps">
              {apps.map((app) => (
                <div key={app.id} className={`ai-app${app.installed || app.connected ? '' : ' absent'}`}>
                  <div className="ai-app-main">
                    <span className="section-name">{app.name}</span>
                    <span className="hint ai-app-state">
                      {app.problem ? 'Set up by hand (see below)' : app.connected ? (app.outdated ? 'Connected to an older Prepress location' : 'Connected') : app.installed ? 'Installed' : 'Not found on this computer'}
                    </span>
                  </div>
                  {app.connected && !app.outdated && <CheckCircle2 size={16} className="ok-icon" aria-hidden="true" />}
                  {app.connected ? (
                    <>
                      {app.outdated && <button className="btn small primary" disabled={!!busy} onClick={() => setApp(app, 'connect')}><RefreshCw size={14} /> Update</button>}
                      <button className="btn small ghost" disabled={!!busy} onClick={() => setApp(app, 'disconnect')} title={`Remove this site from ${app.file}`}><Unplug size={14} /> Disconnect</button>
                    </>
                  ) : (
                    <button className={`btn small ${app.installed ? 'primary' : ''}`} disabled={!!busy || !!app.problem} onClick={() => setApp(app, 'connect')} title={`Adds “${info.name}” to ${app.file}`}>
                      <Plug size={14} /> {busy === app.id ? 'Connecting…' : 'Connect'}
                    </button>
                  )}
                  {note?.id === app.id && <p className={`deploy-status ${note.ok ? 'ok' : 'bad'} ai-app-note`}>{note.text}</p>}
                  {app.problem && <p className="deploy-status bad ai-app-note">{app.problem}</p>}
                </div>
              ))}
            </div>
            <p className="hint">Connect adds this site as <span className="mono">{info.name}</span> to the app’s MCP settings (other settings are kept; the original file is saved next to it as <span className="mono">.before-prepress</span>). The app then starts Prepress for this site itself: no port, no token, nothing leaves this computer except what you publish.</p>

            <details className="ai-manual">
              <summary>Other apps / set up by hand <ChevronRight size={14} /></summary>
              <div className="field">
                <label>MCP server (JSON, most apps)</label>
                <pre className="mcp-snippet">{desktopJson}</pre>
                <div className="row">
                  <button className="btn small" onClick={() => copy('desktop', desktopJson)}><Copy size={14} /> {copied === 'desktop' ? 'Copied' : 'Copy JSON'}</button>
                </div>
              </div>
              <div className="field">
                <label>Command line</label>
                <pre className="mcp-snippet">{command}</pre>
                <div className="row">
                  <button className="btn small" onClick={() => copy('cli', command)}><Copy size={14} /> {copied === 'cli' ? 'Copied' : 'Copy command'}</button>
                </div>
              </div>
            </details>
          </>
        )}
      </>
    );
  }

  if (!info.enabled) {
    return (
      <>
        <p className="hint">MCP is turned off on this server (started with --no-mcp).</p>
      </>
    );
  }

  const endpoint = `${location.origin}/mcp`;
  const command = info.token ? `claude mcp add --transport http prepress ${endpoint} --header "Authorization: Bearer ${info.token}"` : '';
  return (
    <>
      {intro}
      <div className="field">
        <label>Endpoint</label>
        <div className="row">
          <span className="mono grow">{endpoint}</span>
          <button className="btn small" onClick={() => copy('endpoint', endpoint)}><Copy size={14} /> {copied === 'endpoint' ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <div className="field">
        <label>Bearer token</label>
        <div className="row">
          <span className="mono grow">{show ? info.token : '•'.repeat(24)}</span>
          <button className="btn small ghost" onClick={() => setShow((x) => !x)} aria-label={show ? 'Hide token' : 'Show token'}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          <button className="btn small" onClick={() => copy('token', info.token ?? '')}><Copy size={14} /> {copied === 'token' ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <div className="field">
        <label>Claude Code</label>
        <pre className="mcp-snippet">{show ? command : command.replace(info.token ?? '', '<token>')}</pre>
        <div className="row">
          <button className="btn small" onClick={() => copy('cmd', command)}><Copy size={14} /> {copied === 'cmd' ? 'Copied' : 'Copy command'}</button>
          {!info.fixed &&
            (confirm ? (
              <button className="btn small danger" onClick={regenerate}>Revoke old token</button>
            ) : (
              <button className="btn small ghost" onClick={() => setConfirm(true)}><RefreshCw size={14} /> New token</button>
            ))}
        </div>
      </div>
      <p className="hint">Anyone with the token can change and publish the site. Reach this server through HTTPS or an SSH tunnel only.</p>
    </>
  );
}
