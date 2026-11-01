import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReviewDecision } from '../types/task';
import { fetchReview, completeReview, ApiError, type Review } from '../services/api';

interface UseReviewReturn {
  review: Review | null;
  loading: boolean;
  complete: (decisions: ReviewDecision[], note: string) => Promise<void>;
}

/** Loads the Monday review once. A load error never blocks the board. */
export function useReview(onUnauthorized?: () => void): UseReviewReturn {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchReview();
        if (!cancelled) setReview(r);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) onUnauthorizedRef.current?.();
        else console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const complete = useCallback(async (decisions: ReviewDecision[], note: string) => {
    try {
      await completeReview(decisions, note);
    } catch (e) {
      // 409: another tab already finished this review
      if (!(e instanceof ApiError && e.status === 409)) throw e;
    }
    setReview((r) => (r ? { ...r, needsReview: false, cards: [] } : r));
  }, []);

  return { review, loading, complete };
}
