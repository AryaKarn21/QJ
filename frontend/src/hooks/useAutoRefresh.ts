import { useEffect, useRef } from 'react';

/**
 * Silently re-runs `callback` on an interval, plus immediately whenever the
 * tab regains focus/visibility (e.g. switching back from another app) —
 * covers the common "I came back and the list is stale" case without
 * waiting for the next tick. Paused entirely while the tab is hidden so
 * background tabs don't keep polling the API.
 *
 * `callback` itself decides how to update state (e.g. skip the loading
 * spinner on background refreshes) — this hook only decides *when* to call
 * it. Pass `enabled: false` to turn polling off conditionally (e.g. while a
 * modal/form on the same page is mid-edit).
 */
export function useAutoRefresh(callback: () => void, intervalMs = 30000, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState === 'visible') callbackRef.current();
    };
    const interval = setInterval(tick, intervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') callbackRef.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled]);
}
