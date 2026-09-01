import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchFeed } from '../../api/communityApi';
import { useCurrentUser } from '../../utils/currentUser';
import { FeedFilters } from './FeedFilters';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { TrendingSidebar } from './TrendingSidebar';
import type { CommunityPost, FeedFilter } from '../../types/community';

export function HomeFeed() {
  const { isAuthenticated } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FeedFilter) || 'latest';

  const [filter, setFilter] = useState<FeedFilter>(initialFilter);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <h1 className="text-xl font-bold text-dark">Community</h1>
          <FeedFilters active={filter} onChange={handleFilterChange} />
          {isAuthenticated && <PostComposer onPosted={(post) => setPosts((prev) => [post, ...prev])} />}

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading posts…</p>
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
