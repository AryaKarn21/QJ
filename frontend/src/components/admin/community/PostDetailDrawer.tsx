import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, Check, FileText, RotateCcw, Trash2 } from 'lucide-react';
import { Drawer } from '../../ui/Drawer';
import { StatusBadge } from '../../ui/StatusBadge';
import { EmptyState } from '../../ui/EmptyState';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { getCommunityPostDetailAdmin, updateCommunityPostStatusAdmin } from '../adminApi/api';

const REACTION_EMOJI: Record<string, string> = {
  like: '👍',
  celebrate: '🎉',
  support: '🤝',
  insightful: '💡',
};

/**
 * The "Manage" post viewer — full post content/media, its reaction
 * breakdown, its comments, and every report filed against it, plus the
 * same moderate/hide/restore/delete actions the list rows have. Shared by
 * CommunityManagement.tsx (posts/flagged tabs) and ReportManagement.tsx
 * (so a report can actually be inspected against the real post instead of
 * just its truncated targetPreview snippet).
 */
export function PostDetailDrawer({
  postId,
  onClose,
  onChanged,
}: {
  postId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminCommunityPostDetail', postId],
    queryFn: () => getCommunityPostDetailAdmin(postId as string),
    enabled: !!postId,
    retry: false,
  });

  const handleAction = async (action: 'approve' | 'flag' | 'delete' | 'restore') => {
    if (!postId) return;
    if (action === 'delete' && !window.confirm('Delete this post? It will be removed from the community feed — this can be undone with Restore.')) {
      return;
    }
    setActing(true);
    try {
      await updateCommunityPostStatusAdmin(postId, action, `Admin action: ${action}`);
      toast.success(action === 'delete' ? 'Post removed from the community feed.' : `Post ${action}d successfully.`);
      queryClient.invalidateQueries({ queryKey: ['adminCommunityPostDetail', postId] });
      onChanged?.();
    } catch (err) {
      console.error('Error updating post status:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to update post. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const post = data?.post;
  const status = post?.moderation?.status || 'approved';

  return (
    <Drawer open={!!postId} onClose={onClose} title="Post Details" widthClassName="max-w-xl">
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : isError || !post ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load this post. It may have been permanently deleted.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Author + meta */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-50">{post.author?.name || 'Unknown Author'}</span>
              <span className="text-xs text-slate-400">{post.author?.email}</span>
              <StatusBadge
                label={status}
                tone={status === 'flagged' ? 'warning' : status === 'removed' ? 'neutral' : 'success'}
              />
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {post.type || 'post'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Posted {new Date(post.createdAt).toLocaleString()}
              {post.isEdited && post.editedBy?.name && ` · Edited by ${post.editedBy.name}`}
            </p>
          </div>

          {/* Content */}
          <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            {post.content || <span className="italic text-slate-400">No text content.</span>}
          </div>

          {/* Media */}
          {post.media?.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Media ({post.media.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {post.media.map((m: { url: string; mimeType?: string; fileName?: string }, i: number) => (
                  <a
                    key={i}
                    href={resolveMediaUrl(m.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    {m.mimeType?.startsWith('image/') ? (
                      <img src={resolveMediaUrl(m.url)} alt={m.fileName || ''} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="flex h-20 w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <FileText size={18} />
                        <span className="px-1 text-center text-[10px] truncate w-full">{m.fileName || m.mimeType || 'File'}</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reactions */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Reactions ({post.likeCount || 0})
            </h3>
            {Object.keys(data.reactions || {}).length === 0 ? (
              <p className="text-sm text-slate-400">No reactions yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.reactions).map(([type, count]) => (
                  <span key={type} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {REACTION_EMOJI[type] || '👍'} {count} {type}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Comments ({data.commentTotal})
            </h3>
            {data.comments.length === 0 ? (
              <EmptyState title="No comments" description="Nobody has commented on this post yet." className="border-0 py-6" />
            ) : (
              <div className="space-y-2">
                {data.comments.map((c: { _id: string; author?: { name?: string }; createdAt: string; content: string }) => (
                  <div key={c._id} className="rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{c.author?.name || 'Anonymous'}</span>
                      <span className="text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">{c.content}</p>
                  </div>
                ))}
                {data.commentTotal > data.commentLimit && (
                  <p className="text-xs text-slate-400">Showing the latest {data.commentLimit} of {data.commentTotal} comments.</p>
                )}
              </div>
            )}
          </div>

          {/* Reports */}
          {data.reports.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-500">
                <AlertTriangle size={13} /> Reports ({data.reports.length})
              </h3>
              <div className="space-y-2">
                {data.reports.map((r: { _id: string; reason: string; description?: string; reporter?: { name?: string }; status: string; createdAt: string }) => (
                  <div key={r._id} className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 text-sm dark:border-rose-900/40 dark:bg-rose-950/10">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-rose-700 dark:text-rose-400">{r.reason}</span>
                      <StatusBadge label={r.status} tone={r.status === 'resolved' ? 'success' : r.status === 'dismissed' ? 'neutral' : 'warning'} />
                    </div>
                    {r.description && <p className="mt-0.5 text-slate-600 dark:text-slate-300">{r.description}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      Reported by {r.reporter?.name || 'Unknown'} on {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moderation actions */}
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            {status !== 'approved' && (
              <button
                onClick={() => handleAction('approve')}
                disabled={acting}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-600 disabled:opacity-50"
              >
                <Check size={13} /> Approve
              </button>
            )}
            {status !== 'flagged' && (
              <button
                onClick={() => handleAction('flag')}
                disabled={acting}
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400"
              >
                <AlertTriangle size={13} /> Flag
              </button>
            )}
            {status === 'removed' ? (
              <button
                onClick={() => handleAction('restore')}
                disabled={acting}
                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400"
              >
                <RotateCcw size={13} /> Restore
              </button>
            ) : (
              <button
                onClick={() => handleAction('delete')}
                disabled={acting}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
