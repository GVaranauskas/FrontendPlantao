import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for API calls with loading and error states
 */
export const useApi = <T,>(
  apiFunc: (...args: unknown[]) => Promise<{ data: T }>
): UseApiReturn<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const response = await apiFunc(...args);
        setState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        const errorMessage =
          error.response?.data?.message || 'Ocorreu um erro na requisição';
        setState({ data: null, loading: false, error: errorMessage });
        return null;
      }
    },
    [apiFunc]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};
