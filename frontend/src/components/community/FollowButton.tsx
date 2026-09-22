import { useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, Check, UserMinus, Loader2 } from 'lucide-react';
import { toggleFollow } from '../../api/followApi';
import { useCurrentUser } from '../../utils/currentUser';
import { useFollowState } from '../../context/FollowContext';

export interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
  isCompany?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline';
  onChange?: (following: boolean) => void;
  className?: string;
}

export function FollowButton({
  userId,
  initialFollowing,
  isCompany,
  size = 'md',
  variant,
  onChange,
  className = '',
}: FollowButtonProps) {
  const { isAuthenticated, userId: viewerId } = useCurrentUser();
  const [following, setFollowing] = useFollowState(userId, initialFollowing);
  const [busy, setBusy] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);

  if (!isAuthenticated || viewerId === userId) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setIsHovered(false);
    const previous = following;
    setFollowing(!previous); // optimistic update
    if (!previous) {
      setJustFollowed(true);
    }
    try {
      const { following: nowFollowing } = await toggleFollow(userId);
      setFollowing(nowFollowing);
      onChange?.(nowFollowing);
      if (nowFollowing) {
        toast.success(`You are now following this ${isCompany ? 'company' : 'profile'}.`, { autoClose: 2000 });
      }
    } catch (err: any) {
      setFollowing(previous);
      setJustFollowed(false);
      const message = err?.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-1.5 text-sm gap-1.5',
    lg: 'px-5 py-2.5 text-sm gap-2',
  }[size];

  const iconSize = size === 'xs' ? 12 : size === 'sm' ? 13 : 15;
  const showUnfollow = following && isHovered && !justFollowed && size !== 'xs';

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setJustFollowed(false);
      }}
      disabled={busy}
      aria-pressed={following}
      title={following ? (showUnfollow ? 'Unfollow' : 'Following — click to unfollow') : isCompany ? 'Follow company' : 'Follow'}
      className={`inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 shadow-sm active:scale-95 ${sizeStyles} ${
        following
          ? showUnfollow
            ? 'border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-400'
            : isHovered && size === 'xs'
            ? 'border border-rose-300 bg-rose-50/60 text-rose-600'
            : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
          : variant === 'outline'
          ? 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
          : 'bg-primary text-white hover:bg-primary/90 border border-primary hover:shadow-md'
      } ${className}`}
    >
      {busy ? (
        <>
          <Loader2 size={iconSize} className="animate-spin" />
          <span>{following ? 'Updating…' : 'Following…'}</span>
        </>
      ) : following ? (
        showUnfollow ? (
          <>
            <UserMinus size={iconSize} className="stroke-[2.5]" />
            <span>Unfollow</span>
          </>
        ) : (
          <>
            <Check size={iconSize} className="stroke-[2.5] text-emerald-600" />
            <span>{isHovered && size === 'xs' ? 'Unfollow' : 'Following'}</span>
          </>
        )
      ) : (
        <>
          <Plus size={iconSize} className="stroke-[2.5]" />
          <span>{isCompany ? 'Follow company' : 'Follow'}</span>
        </>
      )}
    </button>
  );
}

