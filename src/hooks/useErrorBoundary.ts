import { useState, useCallback } from 'react';
import { ErrorHandler } from '../utils/testUtils';
import { aiService } from '../services/ai';

export function useErrorBoundary() {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback(async (error: Error) => {
    setError(error);
    setHasError(true);

    // Log error for analysis
    await aiService.detectAnomalies([{
      type: 'error_boundary',
      error: error.message,
      retryCount
    }]);

    // Try to recover automatically
    try {
      await ErrorHandler.retry(
        async () => {
          // Attempt recovery actions
          setHasError(false);
          setError(null);
        },
        3, // Max retries
        1000 * Math.pow(2, retryCount) // Exponential backoff
      );
    } catch (err) {
      console.error('Error recovery failed:', err);
      setRetryCount(prev => prev + 1);
    }
  }, [retryCount]);

  const reset = useCallback(() => {
    setHasError(false);
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    hasError,
    error,
    retryCount,
    handleError,
    reset
  };
}