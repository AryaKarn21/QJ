import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Hash, TrendingUp, Users2 } from 'lucide-react';
import { fetchTrendingHashtags } from '../../api/communityApi';
import { fetchFollowSuggestions } from '../../api/followApi';
import { getConnectionSuggestions, sendConnectionRequest, type ConnectionSuggestion } from '../../api/connectionApi';
import { useCurrentUser } from '../../utils/currentUser';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import type { AuthorSnapshot } from '../../types/community';

export function TrendingSidebar() {
  const { isAuthenticated } = useCurrentUser();
  const [hashtags, setHashtags] = useState<{ tag: string; postCount: number }[]>([]);
  const [suggestions, setSuggestions] = useState<AuthorSnapshot[]>([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingHashtags().then(setHashtags).catch(() => {});
    if (isAuthenticated) {
      fetchFollowSuggestions().then(setSuggestions).catch(() => {});
      // getConnectionSuggestions already excludes the current user, blocked
      // users, existing connections, and pending requests server-side
      // (see connectionController.js's getSuggestions) — nothing to
      // filter again here.
      getConnectionSuggestions().then(setConnectionSuggestions).catch(() => {});
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
      <div className="rounded-xl border border-gray-200 bg-light p-4 shadow-card">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-dark">
          <TrendingUp size={15} className="text-primary" /> Trending on Quick Jobs
        </h3>
        {hashtags.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">Nothing trending yet — be the first to post.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {hashtags.slice(0, 8).map((h) => (
              <li key={h.tag}>
                <Link to={`/community/hashtag/${h.tag}`} className="flex items-center justify-between text-sm hover:text-primary">
                  <span className="flex items-center gap-1 font-medium text-dark">
                    <Hash size={12} /> {h.tag}
                  </span>
                  <span className="text-xs text-gray-400">{h.postCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAuthenticated && suggestions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-light p-4 shadow-card">
          <h3 className="text-sm font-semibold text-dark">People &amp; companies to follow</h3>
          <ul className="mt-2 space-y-3">
            {suggestions.slice(0, 5).map((u) => (
              <li key={u._id} className="flex items-center gap-2">
                <Avatar user={u} size={9} linkToProfile />
                <div className="min-w-0 flex-1">
                  <Link to={u.role === 'employer' ? `/community/company/${u._id}` : `/community/profile/${u._id}`} className="block truncate text-sm font-medium text-dark hover:underline">
                    {u.name}
                  </Link>
                  <p className="truncate text-xs text-gray-400">{u.headline || u.role}</p>
                </div>
                <FollowButton userId={u._id} initialFollowing={false} isCompany={u.role === 'employer'} className="!px-3 !py-1 !text-xs" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAuthenticated && connectionSuggestions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-light p-4 shadow-card">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-dark">
            <Users2 size={15} className="text-primary" /> People you may know
          </h3>
          <ul className="mt-2 space-y-3">
            {connectionSuggestions.slice(0, 5).map((p) => (
              <li key={p._id} className="flex items-center gap-2">
                <Avatar user={p} size={9} linkToProfile />
                <div className="min-w-0 flex-1">
                  <Link to={`/community/profile/${p._id}`} className="block truncate text-sm font-medium text-dark hover:underline">
                    {p.name}
                  </Link>
                  <p className="truncate text-xs text-gray-400">{p.headline || p.role}</p>
                  {p.mutualCount > 0 && (
                    <p className="truncate text-[11px] text-gray-400">
                      {p.mutualCount} mutual connection{p.mutualCount === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleConnect(p)}
                  disabled={connectingId === p._id}
                  className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  Connect
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
