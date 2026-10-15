import { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';

/** GET /api/mcp: how AI clients connect, depending on where Prepress runs. */
type McpInfo =
  /** Desktop app: the AI client starts `prepress mcp` itself (stdio). */
  | { mode: 'stdio'; stdio: { command: string; args: string[] } | null }
  /** Prepress on a server / standalone binary: HTTP endpoint + bearer token. */
  | { mode: 'http'; enabled: boolean; token: string | null; fixed: boolean };

const shq = (a: string) => (/^[\w@%+=:,./~-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);

/** Connection details for AI clients (MCP). All AI editing happens through these. */
export function McpPanel() {
  const [info, setInfo] = useState<McpInfo | null>(null);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

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
        <span className="eyebrow">AI connection (MCP)</span>
        <p className="hint">Loading…</p>
      </>
    );
  }

  if (info.mode === 'stdio') {
    const local = info.stdio;
    const command = local ? `claude mcp add prepress -- ${[local.command, ...local.args].map(shq).join(' ')}` : '';
    const desktopJson = local ? JSON.stringify({ mcpServers: { prepress: { command: local.command, args: local.args } } }, null, 2) : '';
    return (
      <>
        <span className="eyebrow">AI connection (MCP)</span>
        {intro}
        {!local ? (
          <p className="hint">Not available in this build.</p>
        ) : (
          <>
            <div className="field">
              <label>Claude Desktop</label>
              <pre className="mcp-snippet">{desktopJson}</pre>
              <div className="row">
                <button className="btn small" onClick={() => copy('desktop', desktopJson)}><Copy size={14} /> {copied === 'desktop' ? 'Copied' : 'Copy config'}</button>
              </div>
              <p className="hint">Settings → Developer → Edit Config, paste into <span className="mono">claude_desktop_config.json</span> (merge with any servers already there), restart Claude Desktop.</p>
            </div>
            <div className="field">
              <label>Claude Code</label>
              <pre className="mcp-snippet">{command}</pre>
              <div className="row">
                <button className="btn small" onClick={() => copy('cli', command)}><Copy size={14} /> {copied === 'cli' ? 'Copied' : 'Copy command'}</button>
              </div>
            </div>
            <p className="hint">The AI app starts Prepress for this site folder by itself: no port, no token, nothing leaves this computer except what you publish.</p>
          </>
        )}
      </>
    );
  }

  if (!info.enabled) {
    return (
      <>
        <span className="eyebrow">AI connection (MCP)</span>
        <p className="hint">MCP is turned off on this server (started with --no-mcp).</p>
      </>
    );
  }

  const endpoint = `${location.origin}/mcp`;
  const command = info.token ? `claude mcp add --transport http prepress ${endpoint} --header "Authorization: Bearer ${info.token}"` : '';
  return (
    <>
      <span className="eyebrow">AI connection (MCP)</span>
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
