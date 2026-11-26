import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /**
   * Called after a crash when the children were mounted again (the editor rebuilds from the
   * site state above it). Without it, a crash shows the fallback straight away.
   */
  onRecover?(error: Error): void;
}

interface State {
  error: Error | null;
  /** Remount counter: a new key gives the children fresh state. */
  n: number;
}

/**
 * Keeps one bad render (e.g. a WordPress component tripping over a block that an AI edit just
 * removed) from unmounting the whole app. React leaves an empty window otherwise, and the desktop
 * app has no reload button. Remounts a few times, then shows a fallback with Reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, n: 0 };
  private recoveries: number[] = [];

  /** Remounts in the last 10 s. */
  private recent() {
    const now = Date.now();
    this.recoveries = this.recoveries.filter((t) => now - t < 10_000);
    return this.recoveries.length;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Prepress recovered from an error', error, info.componentStack);
  }

  componentDidUpdate() {
    const { error } = this.state;
    if (!error || !this.props.onRecover) return;
    // A crash that keeps coming back right away isn't fixed by remounting: stop and show the fallback.
    if (this.recent() >= 3) return;
    this.recoveries.push(Date.now());
    this.setState((s) => ({ error: null, n: s.n + 1 }));
    this.props.onRecover(error);
  }

  render() {
    const { error, n } = this.state;
    if (error && (!this.props.onRecover || this.recent() >= 3)) {
      return (
        <div className="crash" role="alert">
          <h1>Something went wrong</h1>
          <p>Prepress hit an error it couldn’t recover from. Your saved draft is safe; reload to carry on.</p>
          <pre>{String(error.message || error)}</pre>
          <button className="btn primary" onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }
    if (error) return null; // remounting on the next update
    return <Fragment key={n}>{this.props.children}</Fragment>;
  }
}
