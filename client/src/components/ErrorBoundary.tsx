import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-slate-900 text-white p-8">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <details className="bg-slate-800 p-4 rounded">
            <summary className="cursor-pointer mb-2">Error Details</summary>
            <pre className="text-sm text-red-300 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo && (
              <pre className="text-sm text-slate-400 whitespace-pre-wrap mt-2">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </details>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-orange-600 rounded"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}