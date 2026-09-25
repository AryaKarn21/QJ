import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Heart, MessageCircle, Eye, Calendar, User, Edit, Trash2, Send, Pencil, Reply, Loader2, RefreshCw, ThumbsUp } from 'lucide-react';
import { handleImageFallback } from '../../utils/imageFallback';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { SkeletonText, SkeletonBlock, SkeletonAvatarLine, SkeletonParagraph } from '../ui/Skeleton';
import { BlogShareMenu } from './BlogShareMenu';
import {
  getBlogComments,
  addBlogComment,
  updateBlogComment,
  deleteBlogComment,
  toggleBlogCommentLike,
  type BlogComment,
} from '../../api/blogCommentsApi';
// Matches the backend's actual default port (server.js: PORT || 3000) —
// see BlogCreate.tsx for why the previous :8000 fallback was wrong.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

interface Blog {
  _id: string;
  slug?: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  featuredImage?: string;
  tags?: string[];
  isPublished: boolean;
  // Nullable: populated from the author's User account, which the backend
  // returns as null once that account has been deleted.
  author: {
    _id: string;
    name: string;
    role: string;
  } | null;
  authorImage: string;
  images: Array<{ url: string; caption?: string }>;
  likes: string[];
  // The full comments array is no longer embedded in this response — see
  // blogController.js's getBlogById. The comments panel below fetches its
  // own paginated data from GET /api/blogs/:id/comments.
  commentCount: number;
  views: any[];
  publishedAt: string;
  isAIGenerated: boolean;
}

const CommentAvatar: React.FC<{ author: BlogComment['author']; size?: number }> = ({ author, size = 8 }) => {
  const sizeClass = size === 8 ? 'h-8 w-8 text-xs' : 'h-6 w-6 text-[10px]';
  if (author?.profilePic) {
    return (
      <img
        src={resolveMediaUrl(author.profilePic)}
        alt={author.name}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}>
      {author?.name?.[0]?.toUpperCase() || <User size={size === 8 ? 16 : 12} />}
    </span>
  );
};

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Comments panel state — separate from the blog's own loading state so
  // the comment list has its own loading/error/retry/pagination.
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsHasNext, setCommentsHasNext] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [commentsError, setCommentsError] = useState(false);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlog();
    checkUser();
  }, [id]);

  const checkUser = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  };

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Include the token (when present) so the author viewing their own
      // draft — or an admin — is recognized server-side (see
      // blogController.getBlogById's isOwner/isPrivileged check);
      // anonymous/other-user requests still only ever see published posts.
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setBlog(data.blog);
        setLikesCount(data.blog.likes.length);

        // Check if current user has liked the blog
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsLiked(data.blog.likes.includes(payload.id));
        }
      } else {
        navigate('/blog');
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = useCallback(
    async (page: number, append: boolean) => {
      if (!id) return;
      if (append) setLoadingMoreComments(true);
      else setLoadingComments(true);
      setCommentsError(false);
      try {
        const data = await getBlogComments(id, page, 10);
        setComments((prev) => (append ? [...prev, ...data.comments] : data.comments));
        setCommentsPage(data.page);
        setCommentsTotal(data.total);
        setCommentsHasNext(data.hasNext);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setCommentsError(true);
      } finally {
        setLoadingComments(false);
        setLoadingMoreComments(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchComments(1, false);
  }, [fetchComments]);

  // ------------------------------------------------------------
  // Blog like — optimistic: flip the UI immediately, roll back on failure.
  // ------------------------------------------------------------
  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const previousLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);

    try {
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Request failed');
      const data = await response.json();
      setIsLiked(data.isLiked);
      setLikesCount(data.likesCount);
    } catch (error) {
      console.error('Error toggling like:', error);
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error('Could not update your reaction. Please try again.');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    if (!comment.trim() || !id) return;

    try {
      setSubmittingComment(true);
      await addBlogComment(id, comment.trim());
      setComment('');
      setBlog((b) => (b ? { ...b, commentCount: b.commentCount + 1 } : b));
      fetchComments(1, false);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Could not post your comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!id || !replyDraft.trim()) return;
    setSubmittingReply(true);
    try {
      await addBlogComment(id, replyDraft.trim(), parentId);
      setReplyDraft('');
      setReplyingTo(null);
      setBlog((b) => (b ? { ...b, commentCount: b.commentCount + 1 } : b));
      fetchComments(1, false);
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Could not post your reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const startEdit = (c: BlogComment) => {
    setEditingCommentId(c._id);
    setEditDraft(c.content);
  };

  const saveEdit = async (commentId: string) => {
    if (!id || !editDraft.trim()) return;
    setSavingEditId(commentId);
    try {
      await updateBlogComment(id, commentId, editDraft.trim());
      setEditingCommentId(null);
      fetchComments(1, false);
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Could not update your comment. Please try again.');
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id || !window.confirm('Delete this comment? This cannot be undone.')) return;
    setDeletingId(commentId);
    try {
      await deleteBlogComment(id, commentId);
      setBlog((b) => (b ? { ...b, commentCount: Math.max(0, b.commentCount - 1) } : b));
      fetchComments(1, false);
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Could not delete this comment. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Comment-level like: optimistic, scoped to whichever top-level comment
  // or reply was clicked (rolled back on failure).
  const handleToggleCommentLike = async (targetId: string, isReply: boolean, parentId?: string) => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    if (!id) return;

    const applyDelta = (list: BlogComment[]): BlogComment[] =>
      list.map((c) => {
        if (isReply) {
          if (c._id !== parentId) return c;
          return {
            ...c,
            replies: c.replies.map((r) =>
              r._id === targetId ? { ...r, isLiked: !r.isLiked, likeCount: r.likeCount + (r.isLiked ? -1 : 1) } : r
            ),
          };
        }
        return c._id === targetId ? { ...c, isLiked: !c.isLiked, likeCount: c.likeCount + (c.isLiked ? -1 : 1) } : c;
      });

    setComments((prev) => applyDelta(prev));
    try {
      await toggleBlogCommentLike(id, targetId);
    } catch (error) {
      console.error('Error toggling comment like:', error);
      setComments((prev) => applyDelta(prev)); // toggle back
      toast.error('Could not update your reaction. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate('/blog');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5" aria-busy="true" aria-label="Loading blog post">
        <SkeletonText width="w-2/3" height="h-9" />
        <SkeletonAvatarLine />
        <SkeletonBlock className="w-full h-72" />
        <SkeletonParagraph lines={6} />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Blog not found.</p>
        <Link to="/blog" className="text-blue-600 hover:underline">
          Back to Blogs
        </Link>
      </div>
    );
  }

  const isAuthor = user && blog.author?._id === user.id;
  const isAdminViewer = user && ['admin', 'superadmin'].includes(user.role);

  const renderCommentBody = (c: BlogComment, isReply: boolean, parentId?: string) => {
    const canEdit = user && c.author?._id === user.id && !c.isDeleted;
    const canDelete = user && !c.isDeleted && (c.author?._id === user.id || isAdminViewer);
    const isEditing = editingCommentId === c._id;

    return (
      <div className={`flex items-start gap-3 ${isReply ? 'mt-3' : ''}`}>
        <CommentAvatar author={c.author} size={isReply ? 6 : 8} />
        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-gray-900">{c.isDeleted ? 'Deleted comment' : c.author?.name || 'Deleted user'}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {formatDate(c.createdAt)}
                  {c.editedAt && !c.isDeleted && ' (edited)'}
                </span>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(c._id)}
                    disabled={savingEditId === c._id || !editDraft.trim()}
                    className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {savingEditId === c._id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingCommentId(null)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className={c.isDeleted ? 'italic text-gray-400' : 'text-gray-800'}>
                {c.isDeleted ? 'This comment was deleted.' : c.content}
              </p>
            )}
          </div>

          {!c.isDeleted && !isEditing && (
            <div className="mt-1.5 flex items-center gap-4 pl-1 text-xs text-gray-500">
              <button
                onClick={() => handleToggleCommentLike(c._id, isReply, parentId)}
                className={`flex items-center gap-1 hover:text-primary ${c.isLiked ? 'font-medium text-primary' : ''}`}
              >
                <ThumbsUp size={13} className={c.isLiked ? 'fill-current' : ''} /> {c.likeCount > 0 ? c.likeCount : 'Like'}
              </button>
              {!isReply && (
                <button
                  onClick={() => { setReplyingTo(replyingTo === c._id ? null : c._id); setReplyDraft(''); }}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Reply size={13} /> Reply
                </button>
              )}
              {canEdit && (
                <button onClick={() => startEdit(c)} className="flex items-center gap-1 hover:text-primary">
                  <Pencil size={12} /> Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDeleteComment(c._id)}
                  disabled={deletingId === c._id}
                  className="flex items-center gap-1 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={12} /> {deletingId === c._id ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          )}

          {!isReply && replyingTo === c._id && (
            <div className="mt-2 flex items-start gap-2">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={`Reply to ${c.author?.name || 'this comment'}…`}
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => handleReply(c._id)}
                disabled={submittingReply || !replyDraft.trim()}
                className="mt-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {submittingReply ? '…' : 'Post'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link to="/blog" className="text-blue-600 hover:underline">
            ← Back to Blogs
          </Link>

          <div className="flex items-center gap-2">
            <BlogShareMenu title={blog.title} description={blog.excerpt} />
            {isAuthor && (
              <>
                <Link
                  to={`/blog/edit/${blog._id}`}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {blog.category && (
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-medium">
              {blog.category}
            </span>
          )}
          {!blog.isPublished && (
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
              Draft — only visible to you
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 break-words [overflow-wrap:anywhere]">{blog.title}</h1>

        {blog.featuredImage && (
          <img
            src={resolveMediaUrl(blog.featuredImage)}
            alt={blog.title}
            className="w-full h-48 sm:h-64 md:h-96 object-cover bg-gray-100 rounded-lg shadow-md mb-6"
            onError={handleImageFallback}
          />
        )}

        <div className="flex items-center mb-6">
          {blog.authorImage && (
            <img
              src={resolveMediaUrl(blog.authorImage)}
              alt={blog.author?.name || 'Deleted user'}
              className="w-12 h-12 rounded-full mr-4 object-cover"
            />
          )}
          <div className="flex-1">
            <p className="text-lg font-medium text-gray-900">{blog.author?.name || 'Deleted user'}</p>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(blog.publishedAt)}
              {blog.isAIGenerated && (
                <span className="ml-3 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                  AI Generated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 text-sm text-gray-500 border-b border-gray-200 pb-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
              isLiked ? 'text-red-500' : ''
            }`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{isLiked ? `You${likesCount > 1 ? ` + ${likesCount - 1}` : ''}` : likesCount}</span>
          </button>
          <span className="flex items-center space-x-1">
            <MessageCircle className="h-5 w-5" />
            <span>{blog.commentCount}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Eye className="h-5 w-5" />
            <span>{blog.views.length}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none mb-8">
        {blog.images.map((image, index) => (
          <div key={index} className="mb-6">
            <img
              src={resolveMediaUrl(image.url)}
              alt={image.caption || `Blog image ${index + 1}`}
              className="w-full rounded-lg shadow-md object-cover max-h-[500px]"
              onError={handleImageFallback}
            />
            {image.caption && (
              <p className="text-sm text-gray-600 text-center mt-2 italic">
                {image.caption}
              </p>
            )}
          </div>
        ))}

        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
          {blog.content}
        </div>

        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {blog.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Comments ({blog.commentCount})
        </h3>

        {/* Add Comment Form */}
        {user ? (
          <form onSubmit={handleComment} className="mb-8">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!comment.trim() || submittingComment}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4 mr-2" />
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">
              <Link to="/login" className="text-blue-600 hover:underline">
                Login
              </Link>{' '}
              to post a comment
            </p>
          </div>
        )}

        {/* Comments List */}
        {loadingComments ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading comments">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-12 w-full animate-pulse rounded-lg bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : commentsError ? (
          <div className="rounded-lg border border-dashed border-red-200 bg-red-50 p-6 text-center">
            <p className="mb-3 text-sm text-red-600">Couldn't load comments right now.</p>
            <button
              onClick={() => fetchComments(1, false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-6">
            {comments.map((c) => (
              <div key={c._id}>
                {renderCommentBody(c, false)}
                {c.replies.length > 0 && (
                  <div className="ml-6 border-l-2 border-gray-100 pl-4 sm:ml-11">
                    {c.replies.map((r) => (
                      <div key={r._id}>{renderCommentBody(r, true, c._id)}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {commentsHasNext && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchComments(commentsPage + 1, true)}
                  disabled={loadingMoreComments}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMoreComments ? <Loader2 size={14} className="animate-spin" /> : null}
                  {loadingMoreComments ? 'Loading…' : `Load more comments (${commentsTotal - comments.length} more)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogDetail;
