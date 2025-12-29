import { Component, ErrorInfo, ReactNode, useCallback, useState } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/modules';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-xl" data-testid="error-title">Ops! Algo deu errado</CardTitle>
                  <CardDescription>
                    Encontramos um erro inesperado. Nossa equipe foi notificada.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detalhes técnicos:
                </p>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto" data-testid="error-message">
                  {this.state.error?.toString()}
                </pre>
              </div>

              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md">
                  <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer mb-2">
                    Stack Trace (apenas em desenvolvimento)
                  </summary>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Dica:</strong> Tente recarregar a página ou voltar para a página inicial.
                  Se o problema persistir, entre em contato com o suporte.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2"
                data-testid="button-go-home"
              >
                <Home className="h-4 w-4" />
                Ir para Início
              </Button>
              <Button
                onClick={this.handleReload}
                className="gap-2"
                data-testid="button-reload"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar Página
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export const useErrorHandler = () => {
  const [, setError] = useState();
  
  return useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
};
