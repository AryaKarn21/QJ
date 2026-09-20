import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { getMyProfileViewers, type ProfileViewer } from '../../api/profileViewApi';
import { PersonCard } from './FollowersPage';

// "Who viewed my profile" — /community/profile-views. Own-data-only (the
// API is always scoped to the authenticated caller, see
// profileViewController.js's getMyProfileViewers), so there's no :userId
// param — this page only ever shows the current user's own viewers, same
// convention as MyConnectionsPage.tsx.
export function ProfileViewsPage() {
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getMyProfileViewers(page)
      .then((res) => {
        setViewers(res.viewers);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, reloadTick]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-dark">
          <Eye size={20} className="text-primary" /> Profile Views
          {total > 0 && <span className="text-sm font-normal text-gray-400">({total})</span>}
        </h1>
        <p className="mt-1 text-sm text-gray-500">People who've viewed your profile recently.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-danger/40 bg-danger/5 py-14 text-center">
          <p className="text-sm font-medium text-danger">Couldn't load your profile views.</p>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            className="mt-3 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-dark hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      ) : viewers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-14 text-center">
          <p className="text-sm font-medium text-gray-600">No profile views yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            When someone visits your profile, they'll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {viewers.map((viewer) => (
            <PersonCard
              key={viewer._id}
              person={viewer}
              meta={
                <span className="text-xs text-gray-400">
                  Viewed {new Date(viewer.lastViewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {viewer.viewCount > 1 ? ` · ${viewer.viewCount} times` : ''}
                </span>
              }
            />
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
