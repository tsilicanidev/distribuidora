import { useState, useCallback } from 'react';
import { ErrorHandler } from '../utils/testUtils';
import { aiService } from '../services/ai';

export function useGlobalError() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback(async (operation: () => Promise<void>) => {
    setLoading(true);
    setError(null);

    try {
      // Try to predict if operation might fail
      const anomalyData = await aiService.detectAnomalies([
        { type: operation.name, timestamp: Date.now() }
      ]);

      if (anomalyData.confidence < 0.8) {
        console.warn('Operation may be risky, proceeding with caution');
      }

      // Execute operation with retry logic
      await ErrorHandler.retry(
        async () => {
          await operation();
          setRetryCount(0); // Reset retry count on success
        },
        3, // Max retries
        1000 * Math.pow(2, retryCount) // Exponential backoff
      );
    } catch (err) {
      setRetryCount(prev => prev + 1);
      setError(ErrorHandler.handle(err));

      // Log error for analysis
      await aiService.detectAnomalies([
        { type: 'error', operation: operation.name, error: err.message }
      ]);
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    error,
    loading,
    retryCount,
    handleError,
    clearError
  };
}