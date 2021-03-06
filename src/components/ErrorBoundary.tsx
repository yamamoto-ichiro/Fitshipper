import React from "react";
import { Button } from "antd";

const changedArray = (a: Array<unknown> = [], b: Array<unknown> = []) =>
  a.length !== b.length || a.some((item, index) => !Object.is(item, b[index]));

interface FallbackProps {
  error: Error;
  resetErrorBoundary: (...args: Array<unknown>) => void;
}

const ErrorFallback = ({ resetErrorBoundary, error }: FallbackProps) => (
  <div className="w-full h-screen p-50">
    <h1>Something went wrong.</h1>
    <p>{error && error.toString()}</p>
    <Button onClick={resetErrorBoundary}>Try again</Button>
  </div>
);

interface ErrorBoundaryBaseProps {
  onResetKeysChange?: (
    prevResetKeys: Array<unknown> | undefined,
    resetKeys: Array<unknown> | undefined
  ) => void;
  onReset?: (...args: Array<unknown>) => void;
  onError?: (error: Error, info: { componentStack: string }) => void;
  resetKeys?: Array<unknown>;
}

interface ErrorBoundaryPropsWithComponent extends ErrorBoundaryBaseProps {
  FallbackComponent?: React.ComponentType<FallbackProps>;
}

declare function FallbackRender(
  props: FallbackProps
): React.ReactElement<
  unknown,
  string | React.FunctionComponent | typeof React.Component
> | null;

interface ErrorBoundaryPropsWithRender extends ErrorBoundaryBaseProps {
  fallbackRender?: typeof FallbackRender;
}

interface ErrorBoundaryPropsWithFallback extends ErrorBoundaryBaseProps {
  fallback?: React.ReactElement<
    unknown,
    string | React.FunctionComponent | typeof React.Component
  > | null;
}

type ErrorBoundaryProps =
  | ErrorBoundaryPropsWithFallback
  | ErrorBoundaryPropsWithComponent
  | ErrorBoundaryPropsWithRender;

type ErrorBoundaryState = { error: Error | null };

const initialState: ErrorBoundaryState = { error: null };

class ErrorBoundary extends React.Component<
  React.PropsWithRef<React.PropsWithChildren<ErrorBoundaryProps>>,
  ErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  state = initialState;
  updatedWithError = false;
  resetErrorBoundary = (...args: Array<unknown>) => {
    this.props.onReset?.(...args);
    this.reset();
  };

  reset() {
    this.updatedWithError = false;
    this.setState(initialState);
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidMount() {
    const { error } = this.state;

    if (error !== null) {
      this.updatedWithError = true;
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { error } = this.state;
    const { resetKeys } = this.props;

    // There's an edge case where if the thing that triggered the error
    // happens to *also* be in the resetKeys array, we'd end up resetting
    // the error boundary immediately. This would likely trigger a second
    // error to be thrown.
    // So we make sure that we don't check the resetKeys on the first call
    // of cDU after the error is set
    if (error !== null && !this.updatedWithError) {
      this.updatedWithError = true;
      return;
    }

    if (error !== null && changedArray(prevProps.resetKeys, resetKeys)) {
      this.props.onResetKeysChange?.(prevProps.resetKeys, resetKeys);
      this.reset();
    }
  }

  render() {
    const { error } = this.state;
    const {
      // @ts-expect-error ts(2339) (at least one of these will be defined though, and we check for their existence)
      fallbackRender,
      // @ts-expect-error ts(2339) (at least one of these will be defined though, and we check for their existence)
      FallbackComponent,
      // @ts-expect-error ts(2339) (at least one of these will be defined though, and we check for their existence)
      fallback = <ErrorFallback />,
    } = this.props;

    if (error !== null) {
      const props = {
        error,
        resetErrorBoundary: this.resetErrorBoundary,
      };
      if (React.isValidElement(fallback)) {
        return fallback;
      } else if (typeof fallbackRender === "function") {
        return (fallbackRender as typeof FallbackRender)(props);
      } else if (FallbackComponent) {
        return <FallbackComponent {...props} />;
      } else {
        throw new Error(
          "react-error-boundary requires either a fallback, fallbackRender, or FallbackComponent prop"
        );
      }
    }

    return this.props.children;
  }
}

function withErrorBoundary<P>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: ErrorBoundaryProps
): React.ComponentType<P> {
  const Wrapped: React.ComponentType<P> = (props) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  // Format for display in DevTools
  const name = Component.displayName || Component.name || "Unknown";
  Wrapped.displayName = `withErrorBoundary(${name})`;

  return Wrapped;
}

function useErrorHandler<P = Error>(
  givenError?: P | null | undefined
): React.Dispatch<React.SetStateAction<P | null>> {
  const [error, setError] = React.useState<P | null>(null);
  if (givenError) throw givenError;
  if (error) throw error;
  return setError;
}

export { ErrorBoundary, ErrorFallback, withErrorBoundary, useErrorHandler };
export type {
  FallbackProps,
  ErrorBoundaryPropsWithComponent,
  ErrorBoundaryPropsWithRender,
  ErrorBoundaryPropsWithFallback,
  ErrorBoundaryProps,
};
export default ErrorBoundary;

/*
eslint
  @typescript-eslint/no-throw-literal: "off",
  @typescript-eslint/prefer-nullish-coalescing: "off"
*/
