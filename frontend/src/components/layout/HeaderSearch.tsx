import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Clock } from 'lucide-react';
import { Avatar } from '../community/Avatar';
import { fetchPublicProfile } from '../../api/followApi';
import { searchCommunity, type SearchResult } from '../../api/searchApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  addRecentSearchQuery,
  getRecentSearchQueries,
  getRecentlyViewedProfileIds,
} from '../../utils/recentSearches';
import type { AuthorSnapshot } from '../../types/community';

interface HeaderSearchProps {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  /** Real category names (already fetched by Header.tsx) — seeds "Try searching for", never fabricated. */
  suggestionSeeds?: string[];
}

/**
 * The persistent, LinkedIn-style top-nav search. Two states:
 *  - Empty query, focused: "Recent" (people you've actually viewed +
 *    searches you've actually run — both real, from
 *    utils/recentSearches.ts's localStorage history) and "Try searching
 *    for" (built from real job category names, not invented trends).
 *  - 2+ characters typed: a live, debounced preview of matching people —
 *    the original behavior.
 */
const HeaderSearch: React.FC<HeaderSearchProps> = ({ className = '', autoFocus, onNavigate, suggestionSeeds = [] }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<AuthorSnapshot[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchCommunity({ q: trimmed, type: 'people', limit: 5 })
      .then((res) => {
        if (cancelled) return;
        setResults(res.results);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    setOpen(true);
    if (query.trim()) return;
    setRecentQueries(getRecentSearchQueries());
    // Hydrate the last few actually-viewed profile ids into displayable
    // cards — a stale/deleted id just silently drops out of the row
    // rather than showing a broken card.
    const ids = getRecentlyViewedProfileIds();
    Promise.allSettled(ids.map((id) => fetchPublicProfile(id))).then((settled) => {
      const people = settled
        .filter((r): r is PromiseFulfilledResult<AuthorSnapshot> => r.status === 'fulfilled' && Boolean(r.value))
        .map((r) => r.value);
      setRecentProfiles(people);
    });
  };

  const goToFullResults = (q: string) => {
    setOpen(false);
    if (q.trim()) addRecentSearchQuery(q);
    onNavigate?.();
    navigate(`/community/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  const goToProfile = (person: Pick<AuthorSnapshot, '_id' | 'role'>) => {
    setOpen(false);
    onNavigate?.();
    navigate(person.role === 'employer' ? `/community/company/${person._id}` : `/community/profile/${person._id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToFullResults(query);
  };

  const trimmedQuery = query.trim();
  const showLiveResults = open && trimmedQuery.length >= 2;
  const showEmptyState = open && trimmedQuery.length === 0 && (recentQueries.length > 0 || recentProfiles.length > 0 || suggestionSeeds.length > 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="quickjobs-header-search" className="sr-only">
          Search people, companies, skills
        </label>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="quickjobs-header-search"
            type="search"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder="Search"
            className="w-full rounded-xl border border-slate-200/80 bg-slate-100/60 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </form>

      {(showLiveResults || showEmptyState) && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 max-h-[28rem] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl">
          {showLiveResults ? (
            loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
                <Loader2 size={15} className="animate-spin" /> Searching…
              </div>
            ) : results.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">No matches yet — try a different name, skill, or company.</p>
            ) : (
              <>
                <ul>
                  {results.map((r) => (
                    <li key={r._id}>
                      <button
                        type="button"
                        onClick={() => goToProfile(r)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <Avatar user={r} size={9} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">{r.name}</span>
                          {r.headline && <span className="block truncate text-xs text-slate-500">{r.headline}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => goToFullResults(query)}
                  className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary/5"
                >
                  See all results for "{trimmedQuery}"
                </button>
              </>
            )
          ) : (
            <div className="space-y-4">
              {recentProfiles.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-semibold text-slate-500">Recent</p>
                    <button
                      type="button"
                      onClick={() => goToFullResults('')}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Show all
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto px-1 pb-1">
                    {recentProfiles.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => goToProfile(p)}
                        className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg p-1 text-center hover:bg-slate-50"
                      >
                        <Avatar user={p} size={12} />
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-700">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recentQueries.length > 0 && (
                <div>
                  <ul>
                    {recentQueries.map((q) => (
                      <li key={q}>
                        <button
                          type="button"
                          onClick={() => goToFullResults(q)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Clock size={15} className="shrink-0 text-slate-400" />
                          <span className="truncate">{q}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {suggestionSeeds.length > 0 && (
                <div>
                  <p className="mb-1 px-1 text-xs font-semibold text-slate-500">Try searching for</p>
                  <ul>
                    {suggestionSeeds.slice(0, 6).map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => goToFullResults(s)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Search size={14} className="shrink-0 text-slate-400" />
                          <span className="truncate">{s}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderSearch;
