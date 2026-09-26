import { useQuery } from '@tanstack/react-query';
import { getSiteContentMap } from '../api/siteContentApi';

// Shared across every call site via react-query's cache (same queryKey) —
// the whole sitewide content map is fetched once and reused, not
// refetched per component. See main.tsx for the app-wide QueryClient's
// staleTime (Phase 4 caching pass).
export function useSiteContentMap() {
  return useQuery({
    queryKey: ['site-content'],
    queryFn: getSiteContentMap,
    retry: false,
  });
}

/**
 * Reads one sitewide content key, following the same "CMS overrides a
 * hardcoded default" pattern Hero.tsx/CallToAction.tsx already use for
 * homepage copy — a missing/unset key (or the request still loading)
 * always falls back to `fallback`, so no page ever renders blank text
 * waiting on this fetch.
 */
export function useSiteContent(key: string, fallback: string): string {
  const { data } = useSiteContentMap();
  return data?.[key] ?? fallback;
}
