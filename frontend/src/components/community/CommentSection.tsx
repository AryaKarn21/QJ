import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Trash2, CornerDownRight } from 'lucide-react';
import { fetchComments, fetchReplies, addComment, toggleLikeComment, deleteComment } from '../../api/commentApi';
import { useCurrentUser } from '../../utils/currentUser';
import { Avatar } from './Avatar';
import { RichText } from './RichText';
import { MentionTextarea } from './MentionTextarea';
import type { CommunityComment } from '../../types/community';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label}`;
  }
  return 'now';
}

function CommentRow({
  comment,
  postId,
  onReplyPosted,
  onDeleted,
}: {
  comment: CommunityComment;
  postId: string;
  onReplyPosted: () => void;
  onDeleted: () => void;
}) {
  const { userId, isAuthenticated } = useCurrentUser();
  const [liked, setLiked] = useState(comment.hasLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<CommunityComment[] | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const handleLike = async () => {
    if (!isAuthenticated) return toast.info('Log in to like comments.');
    const prev = liked;
    setLiked(!prev);
    setLikeCount((c) => c + (prev ? -1 : 1));
    try {
      const res = await toggleLikeComment(comment._id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(prev);
      setLikeCount((c) => c + (prev ? 1 : -1));
    }
  };

  const loadReplies = async () => {
    if (replies !== null) return setReplies(null); // toggle collapse
    setLoadingReplies(true);
    try {
      setReplies(await fetchReplies(comment._id));
    } finally {
      setLoadingReplies(false);
    }
  };

    const submitReply = async () => {
    if (!replyText.trim() || submittingReply) return; // guard against double-click / double-submit
    setSubmittingReply(true);
    try {
      const newReply = await addComment(postId, replyText.trim(), comment._id);
      setReplies((prev) => [...(prev || []), newReply]);
      setReplyText('');
      setReplying(false);
      onReplyPosted();
    } catch {
      toast.error('Could not post reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(comment._id);
      onDeleted();
    } catch {
      toast.error('Could not delete comment.');
    }
  };

  return (
    <div className="flex gap-2">
      <Avatar user={comment.author} size={7} linkToProfile />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-secondary px-3 py-2">
          <p className="text-sm font-semibold text-dark">{comment.author.name}</p>
          <p className="whitespace-pre-wrap text-sm text-dark">
            <RichText text={comment.content} />
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-3 text-xs text-gray-500">
          <span>{timeAgo(comment.createdAt)}</span>
          <button onClick={handleLike} className={`font-medium hover:underline ${liked ? 'text-danger' : ''}`}>
            Like {likeCount > 0 && `(${likeCount})`}
          </button>
          <button onClick={() => setReplying((v) => !v)} className="font-medium hover:underline">
            Reply
          </button>
          {userId === comment.author._id && (
            <button onClick={handleDelete} className="text-gray-400 hover:text-danger">
              <Trash2 size={13} />
            </button>
          )}
          {comment.replyCount > 0 && (
            <button onClick={loadReplies} className="flex items-center gap-1 font-medium text-primary hover:underline">
              <CornerDownRight size={12} />
              {loadingReplies ? 'Loading…' : replies ? 'Hide replies' : `${comment.replyCount} replies`}
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-2 pl-3">
            <MentionTextarea value={replyText} onChange={setReplyText} placeholder="Write a reply…" rows={2} autoFocus />
            <button onClick={submitReply} className="mt-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-light">
              Reply
            </button>
          </div>
        )}

        {replies && replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-3">
            {replies.map((r) => (
              <CommentRow key={r._id} comment={r} postId={postId} onReplyPosted={onReplyPosted} onDeleted={loadReplies} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({ postId, onCommentCountChange }: { postId: string; onCommentCountChange?: (n: number) => void }) {
  const { isAuthenticated } = useCurrentUser();
   const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchComments(postId, 1)
      .then((res) => {
        setComments(res.comments);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const loadMore = async () => {
    const next = page + 1;
    const res = await fetchComments(postId, next);
    setComments((prev) => [...prev, ...res.comments]);
    setHasMore(res.hasMore);
    setPage(next);
  };

    const submitComment = async () => {
    if (!isAuthenticated) return toast.info('Log in to comment.');
    if (!newComment.trim() || submittingComment) return; // guard against double-click / double-submit
    setSubmittingComment(true);
    try {
      const comment = await addComment(postId, newComment.trim());
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
      onCommentCountChange?.(comments.length + 1);
    } catch {
      toast.error('Could not post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleTopLevelDelete = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    onCommentCountChange?.(Math.max(0, comments.length - 1));
  };

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      {isAuthenticated && (
        <div className="space-y-1">
          <MentionTextarea value={newComment} onChange={setNewComment} placeholder="Write a comment…" rows={2} />
                    <button
            onClick={submitComment}
            disabled={submittingComment}
            className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-light disabled:opacity-60"
          >
            {submittingComment ? 'Posting…' : 'Comment'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400">No comments yet. Be the first to say something.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentRow
              key={c._id}
              comment={c}
              postId={postId}
              onReplyPosted={() => onCommentCountChange?.(comments.length + 1)}
              onDeleted={() => handleTopLevelDelete(c._id)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button onClick={loadMore} className="text-xs font-semibold text-primary hover:underline">
          Load more comments
        </button>
      )}
    </div>
  );
}
