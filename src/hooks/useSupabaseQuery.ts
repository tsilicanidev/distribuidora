import { useState, useCallback } from 'react';
import { supabase, handleSupabaseError, retryRequest } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface UseSupabaseQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  execute: () => Promise<void>;
}

export function useSupabaseQuery<T>(
  query: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    retries?: number;
  } = {}
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await retryRequest(
        async () => {
          const response = await query();
          if (response.error) {
            throw response.error;
          }
          return response.data;
        },
        options.retries || 3
      );

      if (result) {
        setData(result);
        options.onSuccess?.(result);
      }
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      options.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [query, options]);

  return { data, error, loading, execute };
}