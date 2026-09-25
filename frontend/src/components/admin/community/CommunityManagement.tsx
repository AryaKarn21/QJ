import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Share2,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  ShieldAlert,
  ThumbsUp,
  User,
  Filter,
  Check,
  X,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import {
  getAllCommunityPostsAdmin,
  updateCommunityPostStatusAdmin,
  getAllCommunityCommentsAdmin,
  deleteCommunityCommentAdmin,
} from '../adminApi/api';
import { updatePost as updateCommunityPost } from '../../../api/communityApi';
import { PostDetailDrawer } from './PostDetailDrawer';

export const CommunityManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'posts'; // 'posts' | 'flagged' | 'comments'

  const [activeTab, setActiveTab] = useState<'posts' | 'flagged' | 'hidden' | 'comments'>(
    initialTab === 'flagged' || initialTab === 'hidden' || initialTab === 'comments' ? initialTab : 'posts'
  );

  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'most-reacted' | 'most-commented'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [managingPostId, setManagingPostId] = useState<string | null>(null);

  // Sync tab with URL
  const handleTabChange = (tab: 'posts' | 'flagged' | 'hidden' | 'comments') => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setAuthorSearch('');
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllCommunityPostsAdmin({
        status: activeTab === 'flagged' ? 'flagged' : activeTab === 'hidden' ? 'removed' : undefined,
        search: search || undefined,
        author: authorSearch || undefined,
        sort,
        page,
        limit: 15,
      });
      setPosts(res.posts || []);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch community posts');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, authorSearch, sort, page]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllCommunityCommentsAdmin({
        search: search || undefined,
        page,
        limit: 15,
      });
      setComments(res.comments || []);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    if (activeTab === 'comments') {
      fetchComments();
    } else {
      fetchPosts();
    }
  }, [activeTab, fetchPosts, fetchComments]);

  const handleUpdatePostStatus = async (postId: string, action: 'approve' | 'flag' | 'delete' | 'restore') => {
    try {
      await updateCommunityPostStatusAdmin(postId, action, `Admin action: ${action}`);
      toast.success(
        action === 'delete' ? 'Post removed from the community feed.' : `Post ${action}d successfully.`
      );
      fetchPosts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update post status');
    }
  };

  const openEditModal = (post: any) => {
    setEditingPost(post);
    setEditDraft(post.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    setSavingEdit(true);
    try {
      // Reuses the same PATCH /api/community/posts/:postId endpoint every
      // user's own "Edit" button hits — postController.js's updatePost
      // already authorizes owner-or-superadmin server-side and stamps
      // editedBy when a superadmin edits someone else's post, so the post
      // stays attributed to its original author with a distinct
      // "Edited by <admin name>" trail, not a second admin-only endpoint.
      await updateCommunityPost(editingPost._id, editDraft);
      toast.success('Post updated.');
      setEditingPost(null);
      fetchPosts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this comment?')) return;
    try {
      await deleteCommunityCommentAdmin(commentId, 'Super Admin moderation removal');
      toast.success('Comment deleted successfully');
      fetchComments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Share2 size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Community Moderation Hub
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review live feed posts, moderate AI or user-flagged content, and manage community discussions.
          </p>
        </div>

        <button
          onClick={() => (activeTab === 'comments' ? fetchComments() : fetchPosts())}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('posts')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'posts'
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Share2 size={14} />
              All Posts
            </button>
            <button
              onClick={() => handleTabChange('flagged')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'flagged'
                  ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <AlertTriangle size={14} />
              Flagged & Reported
            </button>
            <button
              onClick={() => handleTabChange('hidden')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'hidden'
                  ? 'bg-slate-600 text-white shadow-xs shadow-slate-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <ShieldAlert size={14} />
              Hidden
            </button>
            <button
              onClick={() => handleTabChange('comments')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'comments'
                  ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <MessageSquare size={14} />
              Comments
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'comments' ? 'comments' : 'post content'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            {activeTab !== 'comments' && (
              <>
                <div className="relative w-full sm:w-44">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="By author..."
                    value={authorSearch}
                    onChange={(e) => setAuthorSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most-reacted">Most reacted</option>
                  <option value="most-commented">Most commented</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-orange-500" />
            Loading community content...
          </div>
        ) : activeTab === 'comments' ? (
          // Comments View
          comments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No comments found matching your query.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {comments.map((comment) => (
                <div key={comment._id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {comment.author?.name || 'Anonymous User'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {comment.author?.role} · {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      &ldquo;{comment.content}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={11} /> {comment.likeCount || 0}
                      </span>
                      {comment.post && (
                        <span>On Post: <strong className="text-slate-600 dark:text-slate-300">{comment.post.title || comment.post._id}</strong></span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          // Posts View
          posts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No community posts found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {posts.map((post) => {
                const status = post.moderation?.status || 'approved';
                const isFlagged = status === 'flagged';
                const isRemoved = status === 'removed';

                return (
                  <div key={post._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {post.author?.name || 'Unknown Author'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({post.author?.email}) · {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isFlagged
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                              : isRemoved
                              ? 'bg-slate-500/10 text-slate-500 border border-slate-500/30'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          }`}
                        >
                          {status}
                        </span>
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                          {post.type || 'post'}
                        </span>
                      </div>

                      {post.title && (
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {post.title}
                        </h4>
                      )}

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                        {post.content}
                      </p>

                      {post.moderation?.flags && post.moderation.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {post.moderation.flags.map((flag: string, i: number) => (
                            <span key={i} className="rounded-md bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 text-[10px] dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400">
                              Flag: {flag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span>❤️ {post.likeCount || 0} Reactions</span>
                        <span>💬 {post.commentCount || 0} Comments</span>
                        <span>🔄 {post.shareCount || 0} Shares</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => setManagingPostId(post._id)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Eye size={13} /> Manage
                      </button>
                      <button
                        onClick={() => openEditModal(post)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      {status !== 'approved' && (
                        <button
                          onClick={() => handleUpdatePostStatus(post._id, 'approve')}
                          className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-600"
                        >
                          <Check size={13} /> Approve
                        </button>
                      )}
                      {status !== 'flagged' && (
                        <button
                          onClick={() => handleUpdatePostStatus(post._id, 'flag')}
                          className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400"
                        >
                          <AlertTriangle size={13} /> Flag
                        </button>
                      )}
                      {isRemoved ? (
                        <button
                          onClick={() => handleUpdatePostStatus(post._id, 'restore')}
                          className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400"
                        >
                          <RotateCcw size={13} /> Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this post? It will be removed from the community feed — this can be undone with Restore.')) {
                              handleUpdatePostStatus(post._id, 'delete');
                            }
                          }}
                          className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Post</h3>
              <button
                onClick={() => setEditingPost(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Original author: <span className="font-semibold text-slate-700 dark:text-slate-300">{editingPost.author?.name || 'Unknown'}</span>.
              Editing as Super Admin will not change the author — it will be marked "Edited by Super Admin".
            </p>

            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={8}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="mt-4 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit || !editDraft.trim()}
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 disabled:opacity-50"
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PostDetailDrawer
        postId={managingPostId}
        onClose={() => setManagingPostId(null)}
        onChanged={fetchPosts}
      />
    </div>
  );
};

export default CommunityManagement;
