import { useRef, useEffect, useCallback } from 'react';

interface DwellResult {
  dwellMs: number;
  interactionType: 'glance' | 'linger' | 'study' | 'return';
}

const classify = (ms: number, revisits: number): DwellResult['interactionType'] => {
  if (revisits > 0) return 'return';
  if (ms > 30000) return 'study';
  if (ms > 2000) return 'linger';
  return 'glance';
};

export const useDwellTracking = (
  onDwell: (itemId: string, result: DwellResult) => void
) => {
  const timers = useRef<Map<string, number>>(new Map());
  const visits = useRef<Map<string, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.itemId;
          if (!id) return;

          if (entry.isIntersecting) {
            timers.current.set(id, Date.now());
          } else if (timers.current.has(id)) {
            const start = timers.current.get(id)!;
            const dwellMs = Date.now() - start;
            const revisitCount = visits.current.get(id) || 0;
            visits.current.set(id, revisitCount + 1);
            timers.current.delete(id);

            onDwell(id, {
              dwellMs,
              interactionType: classify(dwellMs, revisitCount),
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => observerRef.current?.disconnect();
  }, [onDwell]);

  const trackRef = useCallback((el: HTMLElement | null) => {
    if (el && observerRef.current) {
      observerRef.current.observe(el);
    }
  }, []);

  return { trackRef };
};
