import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus } from 'lucide-react';
import { Avatar } from './Avatar';
import { fetchPublicProfile, fetchFollowCounts } from '../../api/followApi';
import { getMyConnections } from '../../api/connectionApi';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { useCurrentUser } from '../../utils/currentUser';
import type { AuthorSnapshot } from '../../types/community';

/**
 * The left-rail "mini profile" card — LinkedIn's feed layout always has
 * your own identity anchored on the left (banner, avatar, headline,
 * Connections/Followers counts) so the feed reads as "your" feed, not a
 * generic list. Every number here is real (fetched, not estimated) —
 * same endpoints ProfileFeed.tsx already uses for the full profile page.
 */
export function MiniProfileCard() {
  const { userId, isAuthenticated } = useCurrentUser();
  const [profile, setProfile] = useState<AuthorSnapshot | null>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [connectionsTotal, setConnectionsTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchPublicProfile(userId).then(setProfile).catch(() => setProfile(null));
    fetchFollowCounts(userId).then(setCounts).catch(() => {});
    getMyConnections({ page: 1 }).then((res) => setConnectionsTotal(res.total)).catch(() => {});
  }, [userId]);

  if (!isAuthenticated || !userId) return null;

  const isCompany = profile?.role === 'employer';
  const profilePath = isCompany ? `/community/company/${userId}` : `/community/profile/${userId}`;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Banner — reuses the same cover photo the full profile page shows,
          falling back to the brand gradient when none is set. */}
      <Link to={profilePath} className="block h-14 w-full bg-gradient-to-r from-primary/70 to-orange-400">
        {profile?.coverPhoto && (
          <img src={resolveMediaUrl(profile.coverPhoto)} alt="" className="h-full w-full object-cover" />
        )}
      </Link>

      <div className="px-4 pb-4">
        <Link to={profilePath} className="-mt-7 mb-2 block w-fit">
          {profile ? (
            <Avatar user={profile} size={16} />
          ) : (
            <div className="h-16 w-16 rounded-full border-4 border-white bg-gray-200" />
          )}
        </Link>

        <Link to={profilePath} className="block font-semibold text-gray-900 hover:underline">
          {profile?.name || '…'}
        </Link>
        {profile?.headline && <p className="mt-0.5 text-xs text-gray-500">{profile.headline}</p>}

        <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-xs">
          <Link to="/community/connections" className="flex items-center justify-between text-gray-500 hover:text-primary">
            <span className="flex items-center gap-1.5">
              <UserPlus size={13} /> Connections
            </span>
            <span className="font-semibold text-gray-700">{connectionsTotal ?? '—'}</span>
          </Link>
          <Link to={`/community/profile/${userId}/followers`} className="flex items-center justify-between text-gray-500 hover:text-primary">
            <span className="flex items-center gap-1.5">
              <Users size={13} /> Followers
            </span>
            <span className="font-semibold text-gray-700">{counts.followers}</span>
          </Link>
        </div>

        <Link
          to="/community/network"
          className="mt-3 block rounded-lg border border-gray-200 py-1.5 text-center text-xs font-semibold text-primary hover:bg-primary/5"
        >
          My Network
        </Link>
      </div>
    </div>
  );
}

export default MiniProfileCard;
