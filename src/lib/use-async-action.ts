import { useState } from 'react';

import { ApiError } from '@/lib/api/client';

/** Wraps a write action with pending/error state. Keeps the user's input on
 * failure — callers only navigate away inside the action, after the await. */
export function useAsyncAction<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(...args: A) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await action(...args);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error, clearError: () => setError(null) };
}
