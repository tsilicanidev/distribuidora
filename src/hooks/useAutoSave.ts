import { useState, useEffect, useCallback } from 'react';
import { ErrorHandler } from '../utils/testUtils';

export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  delay = 1000
) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!data) return;

    setSaving(true);
    setError(null);

    try {
      await ErrorHandler.retry(async () => {
        await saveFunction(data);
        setLastSaved(new Date());
      });
    } catch (err) {
      setError(ErrorHandler.handle(err));
    } finally {
      setSaving(false);
    }
  }, [data, saveFunction]);

  useEffect(() => {
    const timer = setTimeout(save, delay);
    return () => clearTimeout(timer);
  }, [save, delay]);

  return { saving, lastSaved, error };
}