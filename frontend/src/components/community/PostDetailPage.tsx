import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchPostById } from '../../api/communityApi';
import { PostCard } from './PostCard';
import type { CommunityPost } from '../../types/community';

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!postId) return;
    fetchPostById(postId)
      .then(setPost)
      .catch(() => setNotFound(true));
  }, [postId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-dark">
        <ArrowLeft size={15} /> Back
      </button>

      {notFound ? (
        <p className="py-12 text-center text-sm text-gray-500">This post doesn't exist or was removed.</p>
      ) : !post ? (
        <p className="py-12 text-center text-sm text-gray-400">Loading…</p>
      ) : (
        <PostCard post={post} onDeleted={() => navigate('/community')} />
      )}
    </div>
  );
}
