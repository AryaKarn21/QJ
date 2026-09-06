/**
 * Client-side "recent" history for the header search's LinkedIn-style
 * empty-state dropdown (Recent people / Recent searches). Deliberately
 * NOT a backend feature — this is per-browser, ephemeral, and built only
 * from things the user actually did (profiles they opened, searches they
 * ran), never fabricated or shared across devices.
 */

const RECENT_SEARCHES_KEY = 'quickjobs:recentSearchQueries';
const RECENT_PROFILES_KEY = 'quickjobs:recentlyViewedProfileIds';
const MAX_ITEMS = 5;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // Storage full/unavailable (private browsing) — recent history is a
    // nice-to-have, never worth breaking search over.
  }
}

function pushUnique(key: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  const existing = readList(key).filter((v) => v.toLowerCase() !== trimmed.toLowerCase());
  writeList(key, [trimmed, ...existing]);
}

export const getRecentSearchQueries = (): string[] => readList(RECENT_SEARCHES_KEY);
export const addRecentSearchQuery = (query: string): void => pushUnique(RECENT_SEARCHES_KEY, query);

export const getRecentlyViewedProfileIds = (): string[] => readList(RECENT_PROFILES_KEY);
export const addRecentlyViewedProfile = (userId: string): void => pushUnique(RECENT_PROFILES_KEY, userId);
