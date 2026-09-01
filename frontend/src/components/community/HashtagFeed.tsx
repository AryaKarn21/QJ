import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { fetchHashtagFeed } from '../../api/communityApi';
import { PostCard } from './PostCard';
import { TrendingSidebar } from './TrendingSidebar';
import type { CommunityPost } from '../../types/community';

export function HashtagFeed() {
  const { tag } = useParams<{ tag: string }>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tag) return;
    setLoading(true);
    fetchHashtagFeed(tag, 1)
      .then((res) => {
        setPosts(res.posts);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [tag]);

  const loadMore = async () => {
    if (!tag) return;
    const next = page + 1;
    const res = await fetchHashtagFeed(tag, next);
    setPosts((prev) => [...prev, ...res.posts]);
    setHasMore(res.hasMore);
    setPage(next);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <h1 className="flex items-center gap-1.5 text-xl font-bold text-dark">
            <Hash size={19} className="text-primary" /> {tag}
          </h1>
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading posts…</p>
          ) : posts.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No posts with #{tag} yet.</p>
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
