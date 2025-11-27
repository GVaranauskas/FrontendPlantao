import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '2rem auto',
          }}
        >
          <h1>Algo deu errado</h1>
          <p>
            Desculpe, ocorreu um erro inesperado. Por favor, recarregue a
            página.
          </p>
          {this.state.error && (
            <details style={{ marginTop: '1rem', textAlign: 'left' }}>
              <summary>Detalhes do erro</summary>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: '1rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                }}
              >
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
