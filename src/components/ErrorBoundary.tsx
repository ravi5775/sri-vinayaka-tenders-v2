import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    const { children } = this.props;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-card p-8 rounded-xl shadow-lg max-w-md w-full border">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Application Error</h2>
            <p className="text-muted-foreground mb-6">Something went wrong while loading the application.</p>
            {this.state.error && (
              <div className="mb-6 p-4 bg-destructive/5 rounded-lg text-left border border-destructive/20 overflow-auto max-h-48 shadow-inner">
                <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-1">Error Details</p>
                <pre className="text-xs font-mono text-destructive break-words whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
