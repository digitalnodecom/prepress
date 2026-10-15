import { useState } from 'react';
import { login } from '../lib/backend';
import { Logo } from './icons';

export function Login({ onDone }: { onDone(): void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (await login(password)) onDone();
      else setError('Wrong password.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="wordmark">
          <Logo />
          <span>Prepress</span>
        </div>
        <div className="field">
          <label htmlFor="pw">Admin password</label>
          <input id="pw" className="input" type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="hint" style={{ color: 'var(--bad)' }} role="alert">{error}</p>}
        <button className="btn primary" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="hint">The password was printed when Prepress started, and is saved in <span className="mono">admin-password.txt</span> in the data folder.</p>
      </form>
    </div>
  );
}
