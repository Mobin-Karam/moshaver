import { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api-client';
import type { Book } from '../model/types';

type Params = {
  grade: string;
  educationTypeId: string;
  trackId: string;
};

/**
 * Fetches the books matching the currently selected grade/type/track.
 * Re-runs whenever any of the params change. Cancels stale requests.
 */
export function useSignupBooks({ grade, educationTypeId, trackId }: Params) {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    if (!grade) {
      setBooks([]);
      return;
    }

    const query = new URLSearchParams({ grade });
    if (educationTypeId) query.set('educationTypeId', educationTypeId);
    if (trackId) query.set('trackId', trackId);

    let cancelled = false;
    apiClient
      .request<Book[]>('GET', `/education-catalog/books?${query}`)
      .then((value) => {
        if (!cancelled) setBooks(value);
      })
      .catch(() => {
        if (!cancelled) setBooks([]);
      });

    return () => {
      cancelled = true;
    };
  }, [grade, educationTypeId, trackId]);

  return books;
}