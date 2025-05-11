import React, { Component, ErrorInfo } from 'react';
import { ErrorHandler } from '../utils/testUtils';
import { useErrorBoundary } from '../hooks/useErrorBoundary';
import { aiService } from '../services/ai';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error for analysis
    aiService.detectAnomalies([{
      type: 'error_boundary',
      error: error.message,
      component: errorInfo.componentStack
    }]);
  }

  private handleRetry = async () => {
    try {
      await ErrorHandler.retry(async () => {
        // Try to recover
        this.setState({ 
          hasError: false, 
          error: null,
          errorInfo: null
        });
      });
    } catch (error) {
      console.error('Error recovery failed:', error);
      
      // Log recovery failure
      aiService.detectAnomalies([{
        type: 'recovery_failure',
        error: error.message
      }]);
    }
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ops! Algo deu errado
              </h2>
              <p className="text-gray-600 mb-4">
                {ErrorHandler.handle(this.state.error)}
              </p>
              {this.state.errorInfo && (
                <pre className="mt-2 text-sm text-gray-500 overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
              <div className="space-y-2">
                <button
                  onClick={this.handleRetry}
                  className="w-full px-4 py-2 bg-[#FF8A00] text-white rounded-lg hover:bg-[#FF8A00]/90"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Recarregar Página
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}