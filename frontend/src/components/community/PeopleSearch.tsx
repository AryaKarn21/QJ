import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Building2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { ConnectionButton } from './ConnectionButton';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonCard } from '../ui/Skeleton';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { searchCommunity, type SearchResult, type SearchResultType } from '../../api/searchApi';
import { getFriendlyErrorMessage } from '../../utils/apiError';

type Status = 'idle' | 'loading' | 'error' | 'success';

const TYPE_TABS: { value: SearchResultType; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'companies', label: 'Companies' },
];

/**
 * Community-wide search — people, companies, and (via the `q` text match on
 * the backend) skills/job titles all go through the same box, since
 * backend/controllers/searchController.js already matches name, headline,
 * skills, and experience job titles in one query. Debounced (250ms via
 * useDebouncedValue) so typing doesn't fire a request per keystroke.
 */
const PeopleSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get('q') || '');
  const [type, setType] = useState<SearchResultType>((searchParams.get('type') as SearchResultType) || 'people');
  const [skills, setSkills] = useState(searchParams.get('skills') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');

  const debouncedInput = useDebouncedValue(input, 300);
  const debouncedSkills = useDebouncedValue(skills, 300);
  const debouncedLocation = useDebouncedValue(location, 300);

  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const hasQuery = useMemo(
    () => Boolean(debouncedInput.trim() || debouncedSkills.trim() || debouncedLocation.trim()),
    [debouncedInput, debouncedSkills, debouncedLocation]
  );

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        debouncedInput ? next.set('q', debouncedInput) : next.delete('q');
        next.set('type', type);
        debouncedSkills ? next.set('skills', debouncedSkills) : next.delete('skills');
        debouncedLocation ? next.set('location', debouncedLocation) : next.delete('location');
        return next;
      },
      { replace: true }
    );

    if (!hasQuery) {
      setStatus('idle');
      setResults([]);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    searchCommunity({ q: debouncedInput, type, skills: debouncedSkills, location: debouncedLocation })
      .then((res) => {
        if (cancelled) return;
        setResults(res.results);
        setStatus('success');
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(getFriendlyErrorMessage(err, 'Search failed. Please try again.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput, debouncedSkills, debouncedLocation, type, hasQuery]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-dark">Search Community</h1>

      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search people, companies, skills…"
          aria-label="Search people, companies, skills"
          className="w-full rounded-full border border-gray-200 py-3 pl-11 pr-4 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-gray-200 p-0.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === tab.value ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="Filter by skill (e.g. React)"
          className="min-w-[160px] flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Filter by location"
          className="min-w-[160px] flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      {status === 'idle' && (
        <EmptyState
          icon={<Search size={22} />}
          title="Search the QuickJobs community"
          description='Try a name, a skill like "React Developer", a job title, or a company name.'
        />
      )}

      {status === 'loading' && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<Search size={22} />}
          title="Something went wrong"
          description={errorMessage}
          action={
            <button
              onClick={() => setInput((v) => v)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Try again
            </button>
          }
        />
      )}

      {status === 'success' && results.length === 0 && (
        <EmptyState
          icon={<Search size={22} />}
          title="No results found"
          description="Try searching with a different name, skill or job title."
        />
      )}

      {status === 'success' && results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r._id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={r} size={12} linkToProfile />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-dark">
                    {r.name} {r.isVerified && <span className="text-primary">✓</span>}
                  </p>
                  {r.headline && <p className="truncate text-sm text-gray-600">{r.headline}</p>}
                  {r.skills.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-400">{r.skills.slice(0, 5).join(' • ')}</p>
                  )}
                  {r.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={11} /> {r.location}
                    </p>
                  )}
                  {r.company && r.role !== 'employer' && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <Building2 size={11} /> {r.company}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                <Link
                  to={r.role === 'employer' ? `/community/company/${r._id}` : `/community/profile/${r._id}`}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary"
                >
                  View Profile
                </Link>
                {r.role !== 'employer' && <ConnectionButton userId={r._id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PeopleSearch;
