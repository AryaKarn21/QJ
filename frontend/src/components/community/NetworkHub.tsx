import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Users2, UserCheck, Inbox, Check, X } from 'lucide-react';
import {
  getMyConnections,
  getPendingReceived,
  getConnectionSuggestions,
  acceptConnectionRequest,
  rejectConnectionRequest,
  sendConnectionRequest,
  type PendingPerson,
  type ConnectionSuggestion,
} from '../../api/connectionApi';
import { PersonCard } from './FollowersPage';
import { EmptyState } from '../ui/EmptyState';

const INVITATION_PREVIEW = 3;
const SUGGESTION_LIMIT = 12;

/**
 * "My Network" hub (LinkedIn's /mynetwork/ equivalent) — pulls Invitations
 * and People You May Know together on one page instead of the previous
 * "scattered across separate pages" experience (a 5-item sidebar preview
 * with no way to see more, plus a separate Connections page, plus a
 * separate Requests page nobody would find without already knowing the
 * URL). All three still exist and are linked from here — this doesn't
 * duplicate their logic, just gives them a front door.
 */
export function NetworkHub() {
  const [connectionsTotal, setConnectionsTotal] = useState<number | null>(null);
  const [invitations, setInvitations] = useState<PendingPerson[]>([]);
  const [invitationsTotal, setInvitationsTotal] = useState(0);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      getMyConnections({ page: 1 }),
      getPendingReceived(1),
      getConnectionSuggestions(SUGGESTION_LIMIT),
    ])
      .then(([connections, pending, people]) => {
        setConnectionsTotal(connections.total);
        setInvitations(pending.people.slice(0, INVITATION_PREVIEW));
        setInvitationsTotal(pending.total);
        setSuggestions(people);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAccept = async (person: PendingPerson) => {
    setBusyId(person.connectionId);
    try {
      await acceptConnectionRequest(person.connectionId);
      setInvitations((prev) => prev.filter((p) => p.connectionId !== person.connectionId));
      setInvitationsTotal((t) => Math.max(t - 1, 0));
      setConnectionsTotal((t) => (t === null ? t : t + 1));
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
      setInvitations((prev) => prev.filter((p) => p.connectionId !== person.connectionId));
      setInvitationsTotal((t) => Math.max(t - 1, 0));
    } catch {
      toast.error('Could not reject this request. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleConnect = async (person: ConnectionSuggestion) => {
    setBusyId(person._id);
    try {
      await sendConnectionRequest(person._id);
      setSuggestions((prev) => prev.filter((p) => p._id !== person._id));
      toast.success(`Connection request sent to ${person.name}.`);
    } catch {
      toast.error('Could not send connection request. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Manage-my-network quick links — LinkedIn's left rail on this
            page. Both destinations already exist as full pages; this is
            just giving them a discoverable entry point. */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-1 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <h2 className="px-2 pb-2 text-sm font-bold text-dark">Manage my network</h2>
            <Link
              to="/community/connections"
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <Users2 size={16} /> Connections
              </span>
              <span className="text-xs font-semibold text-gray-400">{connectionsTotal ?? '—'}</span>
            </Link>
            <Link
              to="/community/connections/requests"
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <Inbox size={16} /> Invitations
              </span>
              <span className="text-xs font-semibold text-gray-400">{invitationsTotal}</span>
            </Link>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <h1 className="text-xl font-bold text-dark">My Network</h1>

          {/* Invitations preview */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-gray-500">
                <Inbox size={14} className="text-primary" /> Invitations
                {invitationsTotal > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{invitationsTotal}</span>
                )}
              </h2>
              {invitationsTotal > INVITATION_PREVIEW && (
                <Link to="/community/connections/requests" className="text-xs font-semibold text-primary hover:underline">
                  Show all {invitationsTotal}
                </Link>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : invitations.length === 0 ? (
              <EmptyState icon={<Inbox size={20} />} title="No pending invitations" className="py-8" />
            ) : (
              <div className="space-y-3">
                {invitations.map((person) => (
                  <PersonCard
                    key={person.connectionId}
                    person={person}
                    action={
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleAccept(person)}
                          disabled={busyId === person.connectionId}
                          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Check size={13} /> Accept
                        </button>
                        <button
                          onClick={() => handleReject(person)}
                          disabled={busyId === person.connectionId}
                          className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-danger hover:text-danger disabled:opacity-50"
                        >
                          <X size={13} /> Ignore
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* People you may know */}
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-gray-500">
              <UserCheck size={14} className="text-primary" /> People you may know
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <EmptyState
                icon={<UserCheck size={20} />}
                title="No suggestions right now"
                description="As more people join and connect, we'll suggest people you may know here."
                className="py-8"
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map((person) => (
                  <PersonCard
                    key={person._id}
                    person={person}
                    meta={
                      person.mutualCount > 0 ? (
                        <p className="truncate text-[11px] text-gray-400">
                          {person.mutualCount} mutual connection{person.mutualCount === 1 ? '' : 's'}
                        </p>
                      ) : undefined
                    }
                    action={
                      <button
                        onClick={() => handleConnect(person)}
                        disabled={busyId === person._id}
                        className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50"
                      >
                        Connect
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default NetworkHub;
