import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Hash, TrendingUp, Users2, Eye, ArrowRight, Sparkles } from 'lucide-react';
import { fetchTrendingHashtags } from '../../api/communityApi';
import { fetchFollowSuggestions } from '../../api/followApi';
import { getConnectionSuggestions, sendConnectionRequest, type ConnectionSuggestion } from '../../api/connectionApi';
import { getMyProfileViewers, type ProfileViewer } from '../../api/profileViewApi';
import { useCurrentUser } from '../../utils/currentUser';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import type { AuthorSnapshot } from '../../types/community';

export function TrendingSidebar() {
  const { isAuthenticated } = useCurrentUser();
  const [hashtags, setHashtags] = useState<{ tag: string; postCount: number }[]>([]);
  const [suggestions, setSuggestions] = useState<AuthorSnapshot[]>([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [recentViewers, setRecentViewers] = useState<ProfileViewer[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingHashtags().then(setHashtags).catch(() => {});
    if (isAuthenticated) {
      fetchFollowSuggestions().then(setSuggestions).catch(() => {});
      getConnectionSuggestions().then(setConnectionSuggestions).catch(() => {});
      getMyProfileViewers(1).then((res) => {
        setRecentViewers(res.viewers || []);
        setTotalViews(res.total || 0);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleConnect = async (person: ConnectionSuggestion) => {
    setConnectingId(person._id);
    try {
      await sendConnectionRequest(person._id);
      setConnectionSuggestions((prev) => prev.filter((p) => p._id !== person._id));
      toast.success(`Connection request sent to ${person.name}.`);
    } catch {
      toast.error('Could not send connection request. Please try again.');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* LinkedIn-style: "Who viewed your profile" (Private to you) */}
      {isAuthenticated && recentViewers.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Eye size={15} className="text-primary" /> Who viewed your profile
              </h3>
              <span className="text-[11px] text-gray-400 font-medium">Private to you</span>
            </div>
            <Link
              to="/community/profile-views"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              {totalViews} view{totalViews === 1 ? '' : 's'}
            </Link>
          </div>
          <ul className="mt-3 space-y-3">
            {recentViewers.slice(0, 4).map((viewer) => (
              <li key={viewer._id} className="flex items-center gap-2.5">
                <Avatar user={viewer} size={9} linkToProfile />
                <div className="min-w-0 flex-1">
                  <Link
                    to={viewer.role === 'employer' ? `/community/company/${viewer._id}` : `/community/profile/${viewer._id}`}
                    className="block truncate text-xs font-semibold text-gray-900 hover:text-primary hover:underline"
                  >
                    {viewer.name}
                  </Link>
                  <p className="truncate text-[11px] text-gray-500">{viewer.headline || viewer.role}</p>
                </div>
                <Link
                  to={viewer.role === 'employer' ? `/community/company/${viewer._id}` : `/community/profile/${viewer._id}`}
                  className="shrink-0 rounded-full border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2.5 border-t border-gray-100 text-center">
            <Link
              to="/community/profile-views"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              See all profile analytics <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* People & companies to follow (LinkedIn-style with + Follow) */}
      {isAuthenticated && suggestions.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" /> People &amp; companies to follow
            </h3>
          </div>
          <ul className="space-y-3">
            {suggestions.slice(0, 5).map((u) => (
              <li key={u._id} className="flex items-center gap-2.5">
                <Avatar user={u} size={9} linkToProfile />
                <div className="min-w-0 flex-1">
                  <Link
                    to={u.role === 'employer' ? `/community/company/${u._id}` : `/community/profile/${u._id}`}
                    className="block truncate text-xs font-semibold text-gray-900 hover:text-primary hover:underline"
                  >
                    {u.name}
                  </Link>
                  <p className="truncate text-[11px] text-gray-400">{u.headline || (u.role === 'employer' ? 'Company' : 'Professional')}</p>
                </div>
                <FollowButton
                  userId={u._id}
                  initialFollowing={u.isFollowing ?? false}
                  isCompany={u.role === 'employer'}
                  size="xs"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* People you may know */}
      {isAuthenticated && connectionSuggestions.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <Users2 size={15} className="text-primary" /> People you may know
            </h3>
            <Link to="/community/network" className="text-xs font-semibold text-primary hover:underline">
              See all
            </Link>
          </div>
          <ul className="space-y-3">
            {connectionSuggestions.slice(0, 5).map((p) => (
              <li key={p._id} className="flex items-center gap-2.5">
                <Avatar user={p} size={9} linkToProfile />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/community/profile/${p._id}`}
                    className="block truncate text-xs font-semibold text-gray-900 hover:text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="truncate text-[11px] text-gray-400">{p.headline || p.role}</p>
                  {p.mutualCount > 0 && (
                    <p className="truncate text-[10px] text-gray-500 font-medium">
                      {p.mutualCount} mutual connection{p.mutualCount === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleConnect(p)}
                    disabled={connectingId === p._id}
                    className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                  >
                    Connect
                  </button>
                  <FollowButton
                    userId={p._id}
                    initialFollowing={p.isFollowing ?? false}
                    size="xs"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trending on QuickJobs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <TrendingUp size={15} className="text-primary" /> Trending on QuickJobs
        </h3>
        {hashtags.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">Nothing trending yet — be the first to post.</p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {hashtags.slice(0, 8).map((h) => (
              <li key={h.tag}>
                <Link
                  to={`/community/hashtag/${h.tag}`}
                  className="flex items-center justify-between text-xs hover:text-primary group py-0.5"
                >
                  <span className="flex items-center gap-1 font-medium text-gray-700 group-hover:text-primary">
                    <Hash size={12} className="text-gray-400 group-hover:text-primary" /> {h.tag}
                  </span>
                  <span className="text-[11px] text-gray-400">{h.postCount} post{h.postCount === 1 ? '' : 's'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

