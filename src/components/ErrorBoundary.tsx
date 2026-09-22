import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reiniciar = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo px-4 text-ink">
          <h1 className="font-display text-3xl">Algo no salió bien</h1>
          <p className="max-w-md text-center text-ink-soft">
            Ocurrió un error inesperado. Podés volver al inicio o reintentar.
          </p>

          {/* Detalle del error solo en desarrollo; en prod no se filtra. */}
          {import.meta.env.DEV && this.state.error.message && (
            <pre className="max-w-xl overflow-auto rounded-md bg-tile p-4 font-mono text-xs text-coral">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-md bg-amber px-5 py-2.5 font-semibold text-ink shadow-[3px_3px_0_0_rgba(36,28,21,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Volver al inicio
            </button>
            <button
              type="button"
              onClick={this.reiniciar}
              className="rounded-md border border-line bg-tile px-5 py-2.5 font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
