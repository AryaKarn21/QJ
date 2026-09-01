import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Wraps the admin <Outlet /> so a render crash in a single admin page
 * (a bad icon import, a null-deref on unexpected API data, etc.) shows a
 * recoverable error panel instead of silently blanking the whole screen
 * with the sidebar/topbar still gone. Without this, any uncaught render
 * error in a child route unmounts the entire React tree and the admin
 * sees nothing — no error, no way back, just a white page.
 */
class AdminErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Admin page crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertTriangle className="text-rose-500" size={32} />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            This page hit an error
          </h2>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            {this.state.error.message || 'Something went wrong while rendering this page.'}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.assign('/admin/dashboard')}
              className="rounded-xl bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;