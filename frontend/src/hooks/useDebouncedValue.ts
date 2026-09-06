import { useEffect, useState } from 'react';

/**
 * Returns `value`, but only after it's stopped changing for `delayMs`.
 * The codebase had no shared debounce hook — every search box
 * (FollowersPage.tsx, MyConnectionsPage.tsx, CompanySearchInput.tsx)
 * reimplements its own setTimeout/clearTimeout inline at the same 250ms —
 * this is the one canonical implementation going forward.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default useDebouncedValue;
