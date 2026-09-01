import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { UserPlus, Check, X, Clock } from 'lucide-react';
import {
  getConnectionStatus,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  removeConnection,
  type ConnectionStatus,
} from '../../api/connectionApi';
import { useCurrentUser } from '../../utils/currentUser';

interface ConnectionButtonProps {
  userId: string;
  className?: string;
  // Lets the profile page update its own "N mutual connections" display
  // without a second round-trip — getConnectionStatus already computes it.
  onStatusChange?: (status: ConnectionStatus, mutualCount: number) => void;
}

// Renders the exact button states from the request:
//   NONE               -> "Connect"
//   PENDING_SENT       -> "Pending" (hover to reveal "Cancel")
//   PENDING_RECEIVED   -> "Accept" + "Reject"
//   CONNECTED          -> "Connected" (click to remove, with confirmation)
//   BLOCKED_BY_ME      -> "Unblock" (handled by the caller's block UI, not shown here)
//   BLOCKED_BY_THEM/SELF -> nothing to show
export function ConnectionButton({ userId, className = '', onStatusChange }: ConnectionButtonProps) {
  const { isAuthenticated } = useCurrentUser();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hoveringPending, setHoveringPending] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let cancelled = false;
    getConnectionStatus(userId)
      .then((res) => {
        if (cancelled) return;
        setStatus(res.status);
        setConnectionId(res.connectionId);
        onStatusChange?.(res.status, res.mutualCount);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isAuthenticated]);

  if (!isAuthenticated || !status || status === 'SELF' || status === 'BLOCKED_BY_THEM') return null;

  const run = async (action: () => Promise<unknown>, errorMessage: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      const refreshed = await getConnectionStatus(userId);
      setStatus(refreshed.status);
      setConnectionId(refreshed.connectionId);
      onStatusChange?.(refreshed.status, refreshed.mutualCount);
    } catch (err) {
      const message = extractErrorMessage(err) || errorMessage;
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const baseClasses = 'rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60';

  if (status === 'NONE') {
    return (
      <button
        onClick={() => run(() => sendConnectionRequest(userId), 'Could not send connection request.')}
        disabled={busy}
        className={`${baseClasses} flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:border-primary hover:text-primary ${className}`}
      >
        <UserPlus size={14} /> Connect
      </button>
    );
  }

  if (status === 'PENDING_SENT') {
    return (
      <button
        onClick={() => connectionId && run(() => cancelConnectionRequest(connectionId), 'Could not cancel request.')}
        disabled={busy}
        onMouseEnter={() => setHoveringPending(true)}
        onMouseLeave={() => setHoveringPending(false)}
        className={`${baseClasses} flex items-center gap-1.5 border ${
          hoveringPending ? 'border-danger text-danger' : 'border-gray-300 text-gray-600'
        } ${className}`}
      >
        <Clock size={14} /> {hoveringPending ? 'Cancel Request' : 'Pending'}
      </button>
    );
  }

  if (status === 'PENDING_RECEIVED') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={() => connectionId && run(() => acceptConnectionRequest(connectionId), 'Could not accept request.')}
          disabled={busy}
          className={`${baseClasses} flex items-center gap-1.5 bg-primary text-light hover:bg-primary/90`}
        >
          <Check size={14} /> Accept
        </button>
        <button
          onClick={() => connectionId && run(() => rejectConnectionRequest(connectionId), 'Could not reject request.')}
          disabled={busy}
          className={`${baseClasses} flex items-center gap-1.5 border border-gray-300 text-gray-600 hover:border-danger hover:text-danger`}
        >
          <X size={14} /> Reject
        </button>
      </div>
    );
  }

  if (status === 'CONNECTED') {
    return (
      <button
        onClick={() => {
          if (!connectionId) return;
          if (!confirm('Remove this connection?')) return;
          run(() => removeConnection(connectionId), 'Could not remove connection.');
        }}
        disabled={busy}
        className={`${baseClasses} border border-gray-300 text-dark hover:border-danger hover:text-danger ${className}`}
      >
        Connected
      </button>
    );
  }

  // BLOCKED_BY_ME — unblocking lives in the profile's overflow menu, not
  // this button, since it's a rare action; just make the state visible.
  return (
    <span className={`${baseClasses} border border-gray-200 text-gray-400 ${className}`}>Blocked</span>
  );
}

// Mirrors the `err?.response?.data?.message` pattern used throughout the
// frontend (see FollowButton.tsx), just typed for a `catch` block's
// `unknown` rather than `any`.
function extractErrorMessage(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}
