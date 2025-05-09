import { useState, useCallback } from 'react';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export function useRetry<T>({ maxRetries = 3, baseDelay = 1000, maxDelay = 10000 }: RetryConfig = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    let lastError: Error | null = null;
    let delay = baseDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation();
        setLoading(false);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, maxDelay);
        }
      }
    }

    setError(lastError);
    setLoading(false);
    return null;
  }, [maxRetries, baseDelay, maxDelay]);

  return { execute, loading, error };
}