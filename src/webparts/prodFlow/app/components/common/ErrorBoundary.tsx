import * as React from "react";
import { TelemetryService } from "../../services/TelemetryService";
import styles from "./ErrorBoundary.module.scss";

interface IState {
  error?: Error;
}

// Keeps a render crash from blanking the whole web part, and reports it to App Insights.
export class ErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  IState
> {
  public state: IState = {};

  public static getDerivedStateFromError(error: Error): IState {
    return { error };
  }

  public componentDidCatch(error: Error): void {
    TelemetryService.trackError(error);
  }

  public render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.fallback} role="alert">
        <h2 className={styles.title}>Algo deu errado</h2>
        <p className={styles.message}>{this.state.error.message}</p>
        <button
          type="button"
          className={styles.retry}
          onClick={() => this.setState({ error: undefined })}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
