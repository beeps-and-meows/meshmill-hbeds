import { useEffect, useState } from 'react';
import { type ApiData, fetchAll } from '../lib/api';

export type ApiLoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: ApiData }
  | { status: 'error'; message: string };

export function useApiData(dataset: number): ApiLoadState {
  const [state, setState] = useState<ApiLoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchAll(dataset)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: 'error', message: err.message });
      });
    return () => { cancelled = true; };
  }, [dataset]);

  return state;
}
