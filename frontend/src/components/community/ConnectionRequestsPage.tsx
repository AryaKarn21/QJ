import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Inbox, Send, Check, X, Clock } from 'lucide-react';
import {
  getPendingReceived,
  getPendingSent,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  type PendingPerson,
} from '../../api/connectionApi';
import { PersonCard } from './FollowersPage';

type Tab = 'incoming' | 'sent';

// /community/connections/requests — Incoming and Sent tabs, per the
// request. Reuses PersonCard (FollowersPage.tsx) for rows and the
// already-built/tested connectionApi.ts functions for data; the only new
// logic here is this page shell plus per-row Accept/Reject/Cancel actions.
export function ConnectionRequestsPage() {
  const [tab, setTab] = useState<Tab>('incoming');
  const [incoming, setIncoming] = useState<PendingPerson[]>([]);
  const [sent, setSent] = useState<PendingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([getPendingReceived(1), getPendingSent(1)])
      .then(([receivedRes, sentRes]) => {
        setIncoming(receivedRes.people);
        setSent(sentRes.people);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [reloadTick]);

  const handleAccept = async (person: PendingPerson) => {
    setBusyId(person.connectionId);
    try {
      await acceptConnectionRequest(person.connectionId);
      setIncoming((prev) => prev.filter((p) => p.connectionId !== person.connectionId));
      toast.success(`You're now connected with ${person.name}.`);
    } catch {
      toast.error('Could not accept this request. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (person: PendingPerson) => {
    setBusyId(person.connectionId);
    try {
      await rejectConnectionRequest(person.connectionId);
      setIncoming((prev) => prev.filter((p) => p.connectionId !== person.connectionId));
    } catch {
      toast.error('Could not reject this request. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (person: PendingPerson) => {
    setBusyId(person.connectionId);
    try {
      await cancelConnectionRequest(person.connectionId);
      setSent((prev) => prev.filter((p) => p.connectionId !== person.connectionId));
    } catch {
      toast.error('Could not cancel this request. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === 'incoming' ? incoming : sent;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <Link to="/community/connections" className="text-sm font-medium text-primary hover:underline">
          ← My Connections
        </Link>
        <h1 className="mt-2 text-xl font-bold text-dark">Connection Requests</h1>
      </div>

      {/* Tabs — a simple two-way toggle is enough here; no need for a
          full tab-router component for two panes sharing one page. */}
      <div className="mb-5 flex gap-2 rounded-full bg-secondary p-1">
        <button
          onClick={() => setTab('incoming')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
            tab === 'incoming' ? 'bg-light text-primary shadow-card' : 'text-gray-500 hover:text-dark'
          }`}
        >
          <Inbox size={15} /> Incoming
          {incoming.length > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-light">
              {incoming.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
            tab === 'sent' ? 'bg-light text-primary shadow-card' : 'text-gray-500 hover:text-dark'
          }`}
        >
          <Send size={15} /> Sent
          {sent.length > 0 && <span className="text-xs font-normal text-gray-400">({sent.length})</span>}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-danger/40 bg-danger/5 py-14 text-center">
          <p className="text-sm font-medium text-danger">Couldn't load connection requests.</p>
          <button
            onClick={() => setReloadTick((t) => t + 1)}
            className="mt-3 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-dark hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-14 text-center">
          <p className="text-sm text-gray-500">
            {tab === 'incoming' ? "You don't have any incoming requests." : "You haven't sent any requests."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((person) =>
            tab === 'incoming' ? (
              <PersonCard
                key={person.connectionId}
                person={person}
                action={
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleAccept(person)}
                      disabled={busyId === person.connectionId}
                      className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-light hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      onClick={() => handleReject(person)}
                      disabled={busyId === person.connectionId}
                      className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-danger hover:text-danger disabled:opacity-50"
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                }
              />
            ) : (
              <PersonCard
                key={person.connectionId}
                person={person}
                action={
                  <button
                    onClick={() => handleCancel(person)}
                    disabled={busyId === person.connectionId}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    <Clock size={13} /> Pending · Cancel
                  </button>
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
