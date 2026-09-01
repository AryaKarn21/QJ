import { useState } from 'react';
import { toast } from 'react-toastify';
import { toggleFollow } from '../../api/followApi';
import { useCurrentUser } from '../../utils/currentUser';
import { useFollowState } from '../../context/FollowContext';

interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
  isCompany?: boolean;
  onChange?: (following: boolean) => void;
  className?: string;
}

export function FollowButton({ userId, initialFollowing, isCompany, onChange, className = '' }: FollowButtonProps) {
  const { isAuthenticated, userId: viewerId } = useCurrentUser();
  // Shared across every FollowButton/list/suggestion rendered for this
  // same userId (see FollowContext) — toggling here updates all of them
  // immediately, not just this instance.
  const [following, setFollowing] = useFollowState(userId, initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated || viewerId === userId) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    const previous = following;
    setFollowing(!previous); // optimistic, visible everywhere at once
    try {
      const { following: nowFollowing } = await toggleFollow(userId);
      setFollowing(nowFollowing);
      onChange?.(nowFollowing);
    } catch (err: any) {
      setFollowing(previous);
      const message = err?.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-pressed={following}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        following ? 'border border-gray-300 text-dark hover:border-danger hover:text-danger' : 'bg-primary text-light hover:bg-primary/90'
      } ${className}`}
    >
      {following ? 'Following' : isCompany ? 'Follow company' : 'Follow'}
    </button>
  );
}
