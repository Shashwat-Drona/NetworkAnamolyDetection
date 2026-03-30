import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
          <div className="bg-gray-800 border border-red-500 rounded-lg p-6 max-w-lg w-full">
            <h1 className="text-red-400 text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-4">
              An unexpected error occurred. Please refresh the page or contact support.
            </p>
            <pre className="text-xs text-red-300 bg-gray-900 p-3 rounded overflow-auto max-h-40">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-cyan-400 text-gray-900 text-sm font-medium rounded hover:bg-cyan-300 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
