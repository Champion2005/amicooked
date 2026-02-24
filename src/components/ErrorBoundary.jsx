import { Component } from 'react';
import logo from '@/assets/amicooked_logo.png';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unexpected error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <img
              src={logo}
              alt="AmICooked"
              className="w-16 h-16 rounded-full object-cover mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              An unexpected error occurred. Don't worry — your data is safe. Try
              refreshing, or head back to the home page.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 text-left bg-surface border border-border rounded-lg p-4 overflow-auto max-h-40">
                <p className="text-red-400 text-xs font-mono break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2.5 rounded-md border border-border text-gray-300 hover:bg-surface hover:text-foreground text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-foreground text-sm transition-colors"
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
