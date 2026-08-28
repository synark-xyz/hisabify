import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { ErrorState } from '@/components/ErrorState';
import { toErrorVariant } from '@/lib/errorState';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Cover the viewport. True for the app-root boundary, false for route-level ones. */
  fullScreen?: boolean;
  /** Offer "Go Home" alongside "Try again". Only meaningful at the app root. */
  showGoHome?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** Bumped on retry to remount the subtree — see `handleRetry`. */
  resetKey: number;
}

/**
 * Error Boundary
 *
 * Catches render/lifecycle errors in the subtree, logs them, and shows the shared
 * `ErrorState`. Mounted at the app root and again around each route-level `<Suspense>`,
 * where it also catches a failed lazy `import()` — the common offline-navigation case,
 * which would otherwise blank the entire app from the root boundary.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    resetKey: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    logger.error(error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
  }

  /**
   * Clearing `hasError` alone re-renders the *same* element tree, so a child that throws
   * during render throws again immediately and the button appears dead. Bumping `resetKey`
   * remounts the subtree, which is what actually gives a retry a chance to succeed.
   */
  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: prev.resetKey + 1,
    }));
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // A chunk that failed to download is a connectivity problem, not a crash, so classify
      // rather than always showing "Something went wrong". `navigator.onLine` is read
      // directly here because a class component cannot use the `useOnline` hook.
      const variant = toErrorVariant(this.state.error, navigator.onLine);

      return (
        <ErrorState
          variant={variant}
          fullScreen={this.props.fullScreen ?? true}
          onRetry={this.handleRetry}
          onGoHome={(this.props.showGoHome ?? true) ? this.handleGoHome : undefined}
          detail={
            this.state.error
              ? `${this.state.error.message}\n${this.state.errorInfo?.componentStack ?? ''}`.trim()
              : undefined
          }
        />
      );
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
