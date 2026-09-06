import { Component, type ErrorInfo, type ReactNode } from "react";
import { classifyAppError } from "./error-utils";
import { ErrorFallback } from "./ErrorFallback";
import { reportAppError } from "./errorReporter";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportAppError({ error, source: "react", componentStack: info.componentStack || undefined });
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          details={classifyAppError(this.state.error)}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
