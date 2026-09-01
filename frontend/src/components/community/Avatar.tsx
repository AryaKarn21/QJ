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
};

export function Avatar({ user, size = 10, linkToProfile = false }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES[10];
  const isCompany = user.role === 'employer';

  const inner = user.avatar ? (
    <img
      src={resolveMediaUrl(user.avatar)}
      alt={user.name}
      className={`${sizeClass} ${isCompany ? 'rounded-md' : 'rounded-full'} object-cover`}
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
