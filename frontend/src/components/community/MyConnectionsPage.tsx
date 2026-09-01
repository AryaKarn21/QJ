import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Users2, MessageCircle, UserMinus } from 'lucide-react';
import { getMyConnections, getConnectionStatus, removeConnection as removeConnectionApi } from '../../api/connectionApi';
import { openConversationWith } from '../../api/messageApi';
import { PersonCard } from './FollowersPage';
import type { AuthorSnapshot } from '../../types/community';

// "My Connections" — /community/connections. Deliberately reuses
// PersonCard (from FollowersPage.tsx) for the row layout and
// getMyConnections (from connectionApi.ts, already built + tested last
// session) for data — the only new logic here is the page shell
// (search/pagination/empty/error states, mirroring FollowersPage.tsx) and
// the Message/Remove actions this list needs instead of a Follow button.
//
// Note: getMyConnections doesn't return each row's underlying Connection
// document id, only the other person (AuthorSnapshot) — Remove needs that
// id, so this page fetches it lazily via getConnectionStatus right before
// removing, rather than changing the list endpoint's response shape for
// every caller just for this one action.
export function MyConnectionsPage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<AuthorSnapshot[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const handle = setTimeout(() => {
      getMyConnections({ page, q: query })
        .then((res) => {
          setPeople(res.people);
          setTotalPages(res.totalPages);
          setTotal(res.total);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 250); // debounce search-as-you-type, same as FollowersPage
    return () => clearTimeout(handle);
  }, [page, query, reloadTick]);

  const handleMessage = (personId: string) => {
    openConversationWith(personId)
      .then((conv) => navigate(`/messages/${conv._id}`))
      .catch((err) => toast.error(err?.response?.data?.message || 'Could not open a conversation.'));
  };

  const handleRemove = async (person: AuthorSnapshot) => {
    if (!confirm(`Remove ${person.name} from your connections?`)) return;
    setBusyId(person._id);
    try {
      const status = await getConnectionStatus(person._id);
      if (!status.connectionId) throw new Error('No connection found');
      await removeConnectionApi(status.connectionId);
      setPeople((prev) => prev.filter((p) => p._id !== person._id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success(`Removed ${person.name} from your connections.`);
    } catch {
      toast.error('Could not remove this connection. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-dark">
          <Users2 size={20} className="text-primary" /> My Connections
          {total > 0 && <span className="text-sm font-normal text-gray-400">({total})</span>}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          People you're connected with on QuickJobs.{' '}
          <Link to="/community/connections/requests" className="text-primary hover:underline">
            View requests
          </Link>
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search connections…"
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
          <p className="text-sm font-medium text-danger">Couldn't load your connections.</p>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            className="mt-3 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-dark hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-14 text-center">
          {query ? (
            <p className="text-sm text-gray-500">No connections match your search.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-600">You don't have any connections yet.</p>
              <p className="mt-1 text-sm text-gray-400">
                Start connecting with professionals in the QuickJobs community.
              </p>
              <Link
                to="/community"
                className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-light hover:bg-primary/90"
              >
                Browse the community
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <PersonCard
              key={person._id}
              person={person}
              action={
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleMessage(person._id)}
                    className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <MessageCircle size={13} /> Message
                  </button>
                  <button
                    onClick={() => handleRemove(person)}
                    disabled={busyId === person._id}
                    className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    <UserMinus size={13} /> Remove
                  </button>
                </div>
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
