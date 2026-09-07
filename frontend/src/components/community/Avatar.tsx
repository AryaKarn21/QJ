import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import type { AuthorSnapshot } from '../../types/community';

interface AvatarProps {
  user: Pick<AuthorSnapshot, '_id' | 'name' | 'avatar' | 'role'>;
  size?: number;
  linkToProfile?: boolean;
}

const SIZE_CLASSES: Record<number, string> = {
  7: 'h-7 w-7 text-xs',
  9: 'h-9 w-9 text-sm',
  10: 'h-10 w-10 text-sm',
  12: 'h-12 w-12 text-base',
  16: 'h-16 w-16 text-xl',
  // ProfileFeed.tsx's main profile-card avatar already requested size=20
  // (LinkedIn-scale, meant to prominently overlap the cover banner) — but
  // 20 was never a key here, so it silently fell through to the size=10
  // default (40px) instead, rendering a tiny avatar under a -48px negative
  // margin clearly designed for something much bigger.
  20: 'h-20 w-20 text-2xl',
};

export function Avatar({ user, size = 10, linkToProfile = false }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES[10];
  const isCompany = user.role === 'employer';
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const resolvedSrc = user.avatar ? resolveMediaUrl(user.avatar) : '';
  // A broken/stale image URL (a since-deleted file, an expired reference
  // from before a storage migration, etc.) used to fall through to the
  // browser's native broken-image behavior — showing the full `alt` text
  // (the user's name) wrapped inside the circular, object-cover-clipped
  // frame instead of a photo, which reads as a rendering bug rather than
  // "no photo set". Tracking the failure by the URL itself (not just a
  // bare boolean) means switching to a different user/avatar always gets
  // a fresh attempt instead of staying stuck on a previous failure.
  const showImage = Boolean(resolvedSrc) && resolvedSrc !== failedSrc;

  const inner = showImage ? (
    <img
      src={resolvedSrc}
      alt={user.name}
      className={`${sizeClass} ${isCompany ? 'rounded-md' : 'rounded-full'} object-cover`}
      onError={() => setFailedSrc(resolvedSrc)}
    />
  ) : (
    <span
      className={`flex ${sizeClass} items-center justify-center ${isCompany ? 'rounded-md' : 'rounded-full'} bg-primary/10 font-semibold text-primary`}
    >
      {user.name?.[0]?.toUpperCase() || '?'}
    </span>
  );

  if (!linkToProfile) return inner;

  const to = isCompany ? `/community/company/${user._id}` : `/community/profile/${user._id}`;
  return (
    <Link to={to} className="flex-shrink-0">
      {inner}
    </Link>
  );
}
