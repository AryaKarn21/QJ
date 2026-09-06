import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { Avatar } from '../community/Avatar';
import { searchCommunity, type SearchResult } from '../../api/searchApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface HeaderSearchProps {
  className?: string;
  /** Compact variant for tight spaces (mobile drawer) — full width, no dropdown positioning quirks. */
  autoFocus?: boolean;
  onNavigate?: () => void;
}

/**
 * The persistent, LinkedIn-style top-nav search: type a name/skill/company,
 * see a live preview of the top few people/company matches, hit Enter or
 * "See all results" to land on the full PeopleSearch page
 * (/community/search) for real pagination/filters. This is the box itself
 * was missing before — PeopleSearch existed but was only reachable from
 * inside the Community feed page, not from the persistent header.
 */
const HeaderSearch: React.FC<HeaderSearchProps> = ({ className = '', autoFocus, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
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

  const goToFullResults = (q: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(`/community/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToFullResults(query);
  };

  const showDropdown = open && query.trim().length >= 2;

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
            onFocus={() => setOpen(true)}
            placeholder="Search people, companies, skills…"
            className="w-full rounded-xl border border-slate-200/80 bg-slate-100/60 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 max-h-96 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl">
          {loading ? (
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
                      onClick={() => {
                        setOpen(false);
                        onNavigate?.();
                        navigate(r.role === 'employer' ? `/community/company/${r._id}` : `/community/profile/${r._id}`);
                      }}
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
                See all results for "{query.trim()}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderSearch;
