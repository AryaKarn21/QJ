import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  retryCount: number;
}

/**
 * Fallback of last resort for the Resume Builder editor route — the
 * actual crash this was written for (useDeferredValue transiently holding
 * a stale null resume, and a couple of undefined-dereference risks in the
 * skills-import logic) is fixed at the source in ResumeEditor.tsx; this
 * only catches whatever unexpected render error slips through in the
 * future so the page never goes fully blank with no way back.
 */
class ResumeEditorErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Resume Editor crashed:', error, info.componentStack);
  }

  handleRetry = () => {
    // Bump retryCount (used as the child's key below) so ResumeEditor
    // fully remounts instead of resuming whatever state it was in when it
    // threw.
    this.setState((prev) => ({ error: null, retryCount: prev.retryCount + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-10 text-center">
          <AlertTriangle className="text-rose-500" size={32} />
          <h2 className="text-lg font-semibold text-gray-800">
            Something went wrong while loading your resume.
          </h2>
          <p className="max-w-md text-sm text-gray-500">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.assign('/resume/history')}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Back to Resumes
            </button>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.retryCount}>{this.props.children}</React.Fragment>;
  }
}

export default ResumeEditorErrorBoundary;
