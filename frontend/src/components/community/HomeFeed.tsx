import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchFeed } from '../../api/communityApi';
import { fetchPublicProfile } from '../../api/followApi';
import { useCurrentUser } from '../../utils/currentUser';
import { FeedFilters } from './FeedFilters';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { TrendingSidebar } from './TrendingSidebar';
import { MiniProfileCard } from './MiniProfileCard';
import type { CommunityPost, FeedFilter } from '../../types/community';

export function HomeFeed() {
  const { isAuthenticated, userId } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FeedFilter) || 'latest';

  const [filter, setFilter] = useState<FeedFilter>(initialFilter);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  // PostComposer's collapsed "Start a post" trigger needs this to show
  // your own avatar next to it (matching LinkedIn) — it was previously
  // only ever passed by CompanyFeed.tsx, so the feed's own composer
  // trigger silently rendered with no avatar at all.
  const [ownSnapshot, setOwnSnapshot] = useState<{ name: string; avatar?: string | null; role: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchPublicProfile(userId).then(setOwnSnapshot).catch(() => {});
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchFeed(filter, 1)
      .then((res) => {
        setPosts(res.posts);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleFilterChange = (f: FeedFilter) => {
    setFilter(f);
    setSearchParams(f === 'latest' ? {} : { filter: f });
  };

  const loadMore = async () => {
    const next = page + 1;
    const res = await fetchFeed(filter, next);
    setPosts((prev) => [...prev, ...res.posts]);
    setHasMore(res.hasMore);
    setPage(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* LinkedIn's classic 3-column feed layout: your own identity
          anchored on the left (MiniProfileCard), the feed itself in the
          center, discovery (trending/who-to-follow) on the right. Both
          side columns collapse away below lg — on a phone/tablet the
          feed is the only thing that matters, same as LinkedIn's mobile
          app dropping the side rails entirely rather than squeezing them in. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        {isAuthenticated ? (
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <MiniProfileCard />
            </div>
          </aside>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-dark">Community</h1>
            <Link
              to="/community/search"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-400 shadow-sm transition-colors hover:border-primary/40 hover:text-primary sm:max-w-xs"
            >
              <Search size={15} className="shrink-0" />
              <span className="truncate">Search people, companies, skills…</span>
            </Link>
          </div>
          <FeedFilters active={filter} onChange={handleFilterChange} />
          {isAuthenticated && (
            <PostComposer
              onPosted={(post) => setPosts((prev) => [post, ...prev])}
              currentUserSnapshot={ownSnapshot || undefined}
            />
          )}

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 rounded bg-gray-200" />
                      <div className="h-2.5 w-20 rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-4/5 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
              <p className="text-sm text-gray-500">
                {filter === 'following' ? "Follow people and companies to see their posts here." : 'No posts yet — be the first to share something.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))} />
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <button onClick={loadMore} className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-primary hover:bg-secondary">
              Load more
            </button>
          )}
        </div>

        <aside className="hidden lg:block">
          <TrendingSidebar />
        </aside>
      </div>
    </div>
  );
}
