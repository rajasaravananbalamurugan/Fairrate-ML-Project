import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass rounded-2xl p-8 max-w-xl mx-auto border border-red-500/30 text-center space-y-4 fade-in-up">
          <div className="text-4xl">⚠️</div>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            Something went wrong in this section
          </h3>
          <p className="text-xs text-slate-400">
            {this.state.error?.message || "An unexpected error occurred while rendering this module."}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-primary !w-auto px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              🔄 Reload Section
            </button>
            {this.props.fallbackToProfile && (
              <button
                type="button"
                onClick={this.props.fallbackToProfile}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              >
                📋 Return to Profile
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
