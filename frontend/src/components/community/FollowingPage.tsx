import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchFollowing, fetchPublicProfile } from '../../api/followApi';
import { PersonCard } from './FollowersPage';
import type { AuthorSnapshot } from '../../types/community';

export function FollowingPage() {
  const { userId } = useParams<{ userId: string }>();
  const [profileName, setProfileName] = useState('');
  const [people, setPeople] = useState<AuthorSnapshot[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    fetchPublicProfile(userId).then((p) => setProfileName(p.name)).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    const handle = setTimeout(() => {
      fetchFollowing(userId, { page, q: query })
        .then((res) => {
          setPeople(res.people);
          setTotalPages(res.totalPages);
          setTotal(res.total);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [userId, page, query, reloadTick]);

  if (!userId) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <Link to={`/community/profile/${userId}`} className="text-sm font-medium text-primary hover:underline">
          ← Back to profile
        </Link>
        <h1 className="mt-2 text-xl font-bold text-dark">
          {profileName ? `${profileName} is Following` : 'Following'}
          {total > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>}
        </h1>
      </div>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search…"
        className="mb-5 w-full rounded-full border border-gray-200 bg-light px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-danger/40 bg-danger/5 py-14 text-center">
          <p className="text-sm font-medium text-danger">Couldn't load the following list.</p>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            className="mt-3 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-dark hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-14 text-center">
          <p className="text-sm text-gray-500">
            {query ? 'No matches found.' : 'Not following anyone yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <PersonCard key={person._id} person={person} />
          ))}
        </div>
      )}

      {!error && !loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-dark disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-dark disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}