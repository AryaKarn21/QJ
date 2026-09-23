import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Sparkles,
  Briefcase,
  MapPin,
  ExternalLink,
  Trash2,
  Pencil,
  X,
  Hash,
  Settings,
  AtSign,
  FileText,
  Image as ImageIcon,
  Flag,
} from 'lucide-react';
import { toggleLikePost, toggleBookmarkPost, deletePost, updatePost } from '../../api/communityApi';
import { summarizePost } from '../../api/communityAiApi';
import { useCurrentUser } from '../../utils/currentUser';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { Avatar } from './Avatar';
import { RichText } from './RichText';
import { MentionTextarea, type MentionTextareaHandle } from './MentionTextarea';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PollWidget } from './PollWidget';
import { CommentSection } from './CommentSection';
import { ShareModal } from './ShareModal';
import { ReportPostModal } from './ReportPostModal';
import type { CommunityPost } from '../../types/community';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label}`;
  }
  return 'now';
}

const TOPIC_LABELS: Record<string, string> = {
  career_tips: 'Career Tips',
  interview_experience: 'Interview Experience',
  hiring: 'Hiring',
  general: 'General',
};

interface PostCardProps {
  post: CommunityPost;
  onDeleted?: (postId: string) => void;
}

export function PostCard({ post, onDeleted }: PostCardProps) {
  const { userId, role, isAuthenticated } = useCurrentUser();
  const [liked, setLiked] = useState(post.viewer.hasLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(post.viewer.hasBookmarked);
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [summary, setSummary] = useState(post.aiSummary || '');
  const [summarizing, setSummarizing] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [content, setContent] = useState(post.content);
  const [hashtags, setHashtags] = useState<string[]>(post.hashtags || []);
  const [media, setMedia] = useState(post.media || []);
  const [isEdited, setIsEdited] = useState(post.isEdited);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content);
  const [editHashtags, setEditHashtags] = useState<string[]>(post.hashtags || []);
  const [editHashtagInput, setEditHashtagInput] = useState('');
  const [editMedia, setEditMedia] = useState(post.media || []);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const editMentionRef = useRef<MentionTextareaHandle>(null);

  const isOwner = userId === post.author._id;
  const isSuperAdmin = role === 'superadmin' || role === 'admin';
  const canManage = isOwner || isSuperAdmin;
  const canReport = isAuthenticated && !isOwner;
  const displayAs = post.company || post.author;

  const requireAuth = (fn: () => void) => {
    if (!isAuthenticated) {
      toast.info('Log in to do that.');
      return;
    }
    fn();
  };

  const handleLike = () =>
    requireAuth(async () => {
      const prevLiked = liked;
      setLiked(!prevLiked);
      setLikeCount((c) => c + (prevLiked ? -1 : 1));
      try {
        const res = await toggleLikePost(post._id);
        setLiked(res.liked);
        setLikeCount(res.likeCount);
      } catch {
        setLiked(prevLiked);
        setLikeCount((c) => c + (prevLiked ? 1 : -1));
        toast.error('Could not update like.');
      }
    });

  const handleBookmark = () =>
    requireAuth(async () => {
      const prev = bookmarked;
      setBookmarked(!prev);
      try {
        const res = await toggleBookmarkPost(post._id);
        setBookmarked(res.bookmarked);
        toast.success(res.bookmarked ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
      } catch {
        setBookmarked(prev);
        toast.error('Could not update bookmark.');
      }
    });

  const handleShare = () => requireAuth(() => setShareModalOpen(true));

  // Only fires from ShareModal after a share action actually SUCCEEDED
  // (shared to feed, sent to at least one person, or an external channel
  // was tracked) — never on the modal simply being opened or closed, so
  // the count can't be inflated by browsing the share sheet.
  const handleShared = () => setShareCount((c) => c + 1);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePost(post._id);
      setDeleted(true);
      setConfirmDeleteOpen(false);
      onDeleted?.(post._id);
      toast.success('Post deleted.');
    } catch {
      toast.error('Could not delete post.');
    } finally {
      setDeleting(false);
    }
  };

  const startEditing = () => {
    setEditDraft(content);
    setEditHashtags(hashtags);
    setEditHashtagInput('');
    setEditMedia(media);
    setEditing(true);
    setMenuOpen(false);
  };

  const cancelEditing = () => {
    setEditDraft(content);
    setEditHashtags(hashtags);
    setEditMedia(media);
    setEditing(false);
  };

  const addEditHashtag = (rawTag: string) => {
    const cleaned = rawTag.trim().toLowerCase().replace(/^#+/, '');
    if (cleaned && /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(cleaned) && !editHashtags.includes(cleaned)) {
      setEditHashtags((prev) => [...prev, cleaned]);
    }
    setEditHashtagInput('');
  };

  const removeEditHashtag = (tag: string) => {
    setEditHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const removeEditMedia = (index: number) => {
    setEditMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!trimmed && editMedia.length === 0 && post.type !== 'poll' && post.type !== 'job' && post.type !== 'hiring') {
      toast.error("Post can't be empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await updatePost(post._id, {
        content: trimmed,
        hashtags: editHashtags,
        media: editMedia,
      });
      setContent(res.post?.content !== undefined ? res.post.content : trimmed);
      setHashtags(res.post?.hashtags || editHashtags);
      setMedia(res.post?.media || editMedia);
      setIsEdited(true);
      setEditing(false);
      toast.success('Post updated.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not update post.');
    } finally {
      setSaving(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await summarizePost(post._id);
      setSummary(res.summary);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not summarize this post.');
    } finally {
      setSummarizing(false);
    }
  };

  if (deleted) return null;

  return (
    <article className="rounded-xl border border-gray-200 bg-light p-4 shadow-card">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Avatar user={displayAs} size={12} linkToProfile />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to={post.company ? `/community/company/${post.company._id}` : `/community/profile/${post.author._id}`}
                className="truncate font-semibold text-dark hover:underline"
              >
                {displayAs.name}
              </Link>
              {post.company && post.company._id !== post.author._id && (
                <span className="text-xs text-gray-500">via {post.author.name}</span>
              )}
              {post.hiringData?.urgency === 'urgent' && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                  Urgently hiring
                </span>
              )}
            </div>
            {displayAs.headline && (
              <p className="truncate text-xs text-gray-500">{displayAs.headline}</p>
            )}
            <p className="text-xs text-gray-400">
              {timeAgo(post.createdAt)} {isEdited && '· Edited'}
            </p>
          </div>
        </div>

        {(canManage || canReport) && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-1.5 text-gray-400 hover:bg-secondary hover:text-dark"
              title="Post actions"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {canManage && (
                  <>
                    <button
                      onClick={startEditing}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-dark hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Pencil size={14} className="text-primary" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmDeleteOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
                {canReport && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Flag size={14} /> Report Post
                  </button>
                )}
                {isSuperAdmin && (
                  <Link
                    to="/admin/community/flagged-posts"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Settings size={14} /> Manage
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Topics */}
      {post.topics?.filter((t) => t !== 'general').length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.topics
            .filter((t) => t !== 'general')
            .map((t) => (
              <Link
                key={t}
                to={`/community?filter=${t}`}
                className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent hover:bg-accent/20"
              >
                {TOPIC_LABELS[t] || t}
              </Link>
            ))}
        </div>
      )}

      {/* Body text */}
      {editing ? (
        <div className="mt-3 space-y-3">
          <MentionTextarea
            ref={editMentionRef}
            value={editDraft}
            onChange={setEditDraft}
            placeholder="Edit post... Type @ to tag people or companies, # for hashtags..."
            rows={4}
            autoFocus
            className="w-full"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => editMentionRef.current?.triggerMention()}
              className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-95 shadow-xs dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
              title="Tag candidates, employers, or companies"
            >
              <AtSign size={13} className="text-blue-600 dark:text-blue-400" /> Tag People / Company
            </button>
            <span className="text-[11px] text-gray-400 dark:text-slate-500">
              Tip: Type <span className="font-semibold text-blue-600 dark:text-blue-400">@</span> to tag &bull; <span className="font-semibold text-primary">#</span> for hashtags
            </span>
          </div>

          {/* Edit Hashtags */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-850">
            <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-slate-300">
              <Hash size={12} className="text-primary" /> Hashtags
            </div>
            {editHashtags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {editHashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeEditHashtag(tag)}
                      className="rounded-full hover:bg-primary/20 p-0.5 text-primary"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">#</span>
                <input
                  type="text"
                  value={editHashtagInput}
                  onChange={(e) => setEditHashtagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                      e.preventDefault();
                      addEditHashtag(editHashtagInput);
                    }
                  }}
                  placeholder="Add hashtag and press Enter…"
                  className="w-full rounded-md border border-gray-200 bg-white py-1 pl-6 pr-3 text-xs text-dark placeholder-gray-400 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              {editHashtagInput.trim() && (
                <button
                  type="button"
                  onClick={() => addEditHashtag(editHashtagInput)}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Edit Media if present */}
          {editMedia.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500">Attached Media</span>
              <div className="grid grid-cols-2 gap-2">
                {editMedia.map((m, i) => {
                  const resolved = resolveMediaUrl(m.url);
                  return (
                    <div key={i} className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                      {m.mimeType?.startsWith('video/') ? (
                        <video src={resolved} className="h-24 w-full bg-black object-cover" />
                      ) : m.mimeType === 'application/pdf' ? (
                        <div className="flex h-24 items-center justify-center bg-gray-100 p-2 text-xs text-gray-600">
                          <FileText size={18} className="mr-1 text-primary shrink-0" />
                          <span className="truncate">{m.fileName || 'PDF Document'}</span>
                        </div>
                      ) : resolved ? (
                        <>
                          <img
                            src={resolved}
                            alt=""
                            className="h-24 w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              const fb = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fb) fb.style.display = 'flex';
                            }}
                          />
                          <div className="hidden h-24 w-full items-center justify-center bg-gray-100 p-2 text-xs text-gray-500">
                            <ImageIcon size={16} className="mr-1 text-gray-400" />
                            <span className="truncate">{m.fileName || 'Image Attachment'}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center bg-gray-100 p-2 text-xs text-gray-500">
                          <ImageIcon size={16} className="mr-1 text-gray-400" />
                          <span className="truncate">{m.fileName || 'Image Attachment'}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeEditMedia(i)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                        title="Remove media"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-secondary disabled:opacity-60"
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-light hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {content && (
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-dark">
              <RichText text={content} />
            </div>
          )}

          {/* Hashtag pills under post */}
          {hashtags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <Link
                  key={tag}
                  to={`/community/hashtag/${tag}`}
                  className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
                >
                  <Hash size={11} className="shrink-0" />
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {!editing && content.length > 400 && (
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-60"
        >
          <Sparkles size={13} />
          {summarizing ? 'Summarizing…' : summary ? 'AI summary shown below' : 'AI summarize'}
        </button>
      )}

      {summary && (
        <p className="mt-1 rounded-lg bg-accent/5 p-2 text-xs italic text-gray-600">
          <Sparkles size={12} className="mr-1 inline text-accent" />
          {summary}
        </p>
      )}

      {/* Media — all anchor tags kept on ONE line to prevent tag-name drop */}
      {!editing && media?.length > 0 && (
        <div className={`mt-3 grid gap-1 overflow-hidden rounded-lg ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {media.map((m, i) => {
            const resolved = resolveMediaUrl(m.url);
            if (m.mimeType?.startsWith('video/')) {
              return <video key={i} src={resolved} controls className="max-h-96 w-full bg-black object-contain" />;
            }
            if (m.mimeType === 'application/pdf') {
              return <a key={i} href={resolved} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-secondary p-3 text-sm text-dark hover:bg-gray-200"><FileText size={18} className="text-primary" />{m.fileName || 'View PDF'}<ExternalLink size={13} className="ml-auto" /></a>;
            }
            if (!resolved) return null;
            return (
              <img
                key={i}
                src={resolved}
                alt=""
                className="max-h-96 w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            );
          })}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        description="Are you sure you want to delete this community post? This action cannot be undone."
        confirmLabel="Delete Post"
        loading={deleting}
      />

      {/* Report Post */}
      {reportModalOpen && (
        <ReportPostModal
          targetType="post"
          targetId={post._id}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      {/* Poll */}
      {post.type === 'poll' && post.pollData && (
        <PollWidget postId={post._id} pollData={post.pollData} />
      )}

      {/* Job post */}
      {post.type === 'job' && post.jobData && (
        <div className="mt-3 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-primary" />
            <p className="font-semibold text-dark">{post.jobData.title}</p>
          </div>
          <p className="mt-0.5 text-sm text-gray-600">
            {post.jobData.companyName}
            {post.jobData.location && ` · ${post.jobData.location}`}
            {post.jobData.jobType && ` · ${post.jobData.jobType}`}
          </p>
          {post.jobData.salary && (
            <p className="text-sm text-gray-600">{post.jobData.salary}</p>
          )}
          {(post.jobData.job || post.jobData.applyUrl) && (
            <a href={post.jobData.job ? `/jobs/${post.jobData.job}` : post.jobData.applyUrl} target={post.jobData.job ? undefined : '_blank'} rel="noreferrer" className="mt-2 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-light hover:bg-primary/90">Apply now</a>
          )}
        </div>
      )}

      {/* Hiring post */}
      {post.type === 'hiring' && post.hiringData && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
          <p className="font-semibold text-dark">
            We're hiring{post.hiringData.openings ? ` (${post.hiringData.openings} openings)` : ''}
          </p>
          {post.hiringData.roles?.length > 0 && (
            <p className="mt-1 text-sm text-gray-700">{post.hiringData.roles.join(' · ')}</p>
          )}
          {post.hiringData.location && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
              <MapPin size={13} /> {post.hiringData.location}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            {post.hiringData.applyUrl && (
              <a href={post.hiringData.applyUrl} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-light hover:bg-primary/90">Apply now</a>
            )}
            {post.hiringData.contactEmail && (
              <a href={`mailto:${post.hiringData.contactEmail}`} className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-dark">Contact</a>
            )}
          </div>
        </div>
      )}

      {post.sharedFrom && (
        post.sharedFrom.isDeleted ? (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-400">
            Original post is unavailable.
          </div>
        ) : (
          <Link
            to={`/community/post/${post.sharedFrom._id}`}
            className="mt-3 block rounded-lg border border-gray-200 p-3 hover:bg-secondary"
          >
            {post.sharedFrom.author && (
              <div className="flex items-center gap-2">
                <Avatar user={post.sharedFrom.author} size={7} />
                <p className="truncate text-sm font-semibold text-dark">{post.sharedFrom.author.name}</p>
              </div>
            )}
            {post.sharedFrom.content && (
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-gray-600">{post.sharedFrom.content}</p>
            )}
          </Link>
        )
      )}

      {/* Engagement summary — LinkedIn shows a one-line rollup above the
          action buttons ("❤ 24 · 5 comments · 2 reposts") rather than
          burying counts inside each button; only rendered when there's
          something to summarize. */}
      {(likeCount > 0 || commentCount > 0 || shareCount > 0) && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            {likeCount > 0 && (
              <>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white">
                  <Heart size={9} fill="currentColor" />
                </span>
                {likeCount}
              </>
            )}
          </span>
          <span className="flex items-center gap-2">
            {commentCount > 0 && <span>{commentCount} comment{commentCount === 1 ? '' : 's'}</span>}
            {shareCount > 0 && <span>{shareCount} repost{shareCount === 1 ? '' : 's'}</span>}
          </span>
        </div>
      )}

      {/* Action bar — four full-width, evenly-split buttons with icon +
          label (LinkedIn's exact pattern), rather than icon-plus-count
          buttons of varying width. */}
      <div className="mt-1 flex items-center border-t border-gray-100 pt-1 text-gray-500">
        <button
          onClick={handleLike}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium hover:bg-secondary ${liked ? 'text-danger' : ''}`}
        >
          <Heart size={17} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'Liked' : 'Like'}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium hover:bg-secondary"
        >
          <MessageCircle size={17} /> Comment
        </button>
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium hover:bg-secondary"
        >
          <Share2 size={17} /> Repost
        </button>
        <button
          onClick={handleBookmark}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium hover:bg-secondary ${bookmarked ? 'text-primary' : ''}`}
        >
          <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Save'}
        </button>
      </div>

      {showComments && (
        <CommentSection postId={post._id} onCommentCountChange={setCommentCount} />
      )}

      {shareModalOpen && (
        <ShareModal post={post} onClose={() => setShareModalOpen(false)} onShared={handleShared} />
      )}

    </article>
  );
}