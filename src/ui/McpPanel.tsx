import { useEffect, useState } from 'react';

interface McpInfo {
  enabled: boolean;
  token: string | null;
  fixed: boolean;
}

/** Connection details for AI clients (MCP over HTTP). */
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

  const endpoint = `${location.origin}/mcp`;
  const command = info?.token ? `claude mcp add --transport http prepress ${endpoint} --header "Authorization: Bearer ${info.token}"` : '';

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

  return (
    <>
      <span className="eyebrow">AI connection (MCP)</span>
      {!info ? (
        <p className="hint">Loading…</p>
      ) : !info.enabled ? (
        <p className="hint">MCP is turned off on this server (started with --no-mcp).</p>
      ) : (
        <>
          <p className="hint">
            Let an AI (Claude Code, Claude Desktop, any MCP client) read and edit this site: pages, header/footer, custom blocks, patterns, styles and theme.json, and publish it.
          </p>
          <div className="field">
            <label>Endpoint</label>
            <div className="row">
              <span className="mono grow">{endpoint}</span>
              <button className="btn small" onClick={() => copy('endpoint', endpoint)}>{copied === 'endpoint' ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
          <div className="field">
            <label>Bearer token</label>
            <div className="row">
              <span className="mono grow">{show ? info.token : '•'.repeat(24)}</span>
              <button className="btn small ghost" onClick={() => setShow((x) => !x)}>{show ? 'Hide' : 'Show'}</button>
              <button className="btn small" onClick={() => copy('token', info.token ?? '')}>{copied === 'token' ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
          <div className="field">
            <label>Claude Code</label>
            <pre className="mcp-snippet">{show ? command : command.replace(info.token ?? '', '<token>')}</pre>
            <div className="row">
              <button className="btn small" onClick={() => copy('cmd', command)}>{copied === 'cmd' ? 'Copied' : 'Copy command'}</button>
              {!info.fixed &&
                (confirm ? (
                  <button className="btn small danger" onClick={regenerate}>Revoke old token</button>
                ) : (
                  <button className="btn small ghost" onClick={() => setConfirm(true)}>New token</button>
                ))}
            </div>
          </div>
          <p className="hint">Anyone with the token can change and publish the site. For remote access use HTTPS (a TLS reverse proxy) or an SSH tunnel.</p>
        </>
      )}
    </>
  );
}
