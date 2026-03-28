import React from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc`;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Nudge ErrorBoundary] Caught error:', error, errorInfo);
    // Report to server error log
    fetch(`${SERVER_URL}/api/error-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
      body: JSON.stringify({
        error: `[CRASH] ${error.message}\n${error.stack || ''}`,
        context: `componentStack: ${errorInfo.componentStack?.slice(0, 500) || 'unknown'}`,
        sessionId: 'error-boundary',
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7FAFA] px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#163B42]">Something went wrong</h1>
              <p className="text-sm text-[#5A7A80] mt-2 leading-relaxed">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            {this.state.error && (
              <details className="text-left bg-red-50 border border-red-100 rounded-xl p-4">
                <summary className="text-xs font-semibold text-red-700 cursor-pointer">Error details</summary>
                <pre className="mt-2 text-[11px] text-red-600 whitespace-pre-wrap break-words font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#1D4E56] text-white text-sm font-semibold hover:bg-[#163B42] transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="inline-flex items-center justify-center h-11 px-6 rounded-full border border-[#C8E4E9] bg-white text-[#1D4E56] text-sm font-semibold hover:bg-[#F2F9FA] transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}