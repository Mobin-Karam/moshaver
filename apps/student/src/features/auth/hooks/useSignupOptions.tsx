import { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api-client';
import type { SignupOptions } from '../model/types';

type Status = 'loading' | 'ready' | 'error';

export function useSignupOptions() {
  const [options, setOptions] = useState<SignupOptions | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient
      .request<SignupOptions>('GET', '/education-catalog/signup-options')
      .then((value) => {
        if (cancelled) return;
        setOptions(value);
        setStatus('ready');
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'دریافت پایه‌ها ناموفق بود.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, status, error, setError };
}