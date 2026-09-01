import { useState } from 'react';
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
  FileText,
  Pencil,
  X,
} from 'lucide-react';
import { toggleLikePost, toggleBookmarkPost, deletePost, updatePost } from '../../api/communityApi';
import { summarizePost } from '../../api/communityAiApi';
import { useCurrentUser } from '../../utils/currentUser';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { Avatar } from './Avatar';
import { RichText } from './RichText';
import { PollWidget } from './PollWidget';
import { CommentSection } from './CommentSection';
import { ShareModal } from './ShareModal';
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
  const { userId, isAuthenticated } = useCurrentUser();
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
  const [isEdited, setIsEdited] = useState(post.isEdited);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content);
  const [saving, setSaving] = useState(false);

  const isOwner = userId === post.author._id;
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
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await deletePost(post._id);
      setDeleted(true);
      onDeleted?.(post._id);
      toast.success('Post deleted.');
    } catch {
      toast.error('Could not delete post.');
    }
  };

  const startEditing = () => {
    setEditDraft(content);
    setEditing(true);
    setMenuOpen(false);
  };

  const cancelEditing = () => {
    setEditDraft(content);
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      toast.error("Post can't be empty.");
      return;
    }
    if (trimmed === content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updatePost(post._id, trimmed);
      setContent(trimmed);
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

        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-1.5 text-gray-400 hover:bg-secondary hover:text-dark"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-light py-1 shadow-card-hover">
                <button
                  onClick={startEditing}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-dark hover:bg-secondary"
                >
                  <Pencil size={14} /> Edit post
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-secondary"
                >
                  <Trash2 size={14} /> Delete post
                </button>
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
        <div className="mt-3">
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={4}
            autoFocus
            className="w-full resize-none rounded-lg border border-gray-300 p-2.5 text-sm leading-relaxed text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
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
        content && (
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-dark">
            <RichText text={content} />
          </div>
        )
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
      {post.media?.length > 0 && (
        <div className={`mt-3 grid gap-1 overflow-hidden rounded-lg ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.media.map((m, i) =>
            m.mimeType?.startsWith('video/') ? (
              <video key={i} src={resolveMediaUrl(m.url)} controls className="max-h-96 w-full bg-black object-contain" />
            ) : m.mimeType === 'application/pdf' ? (
              <a key={i} href={resolveMediaUrl(m.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-secondary p-3 text-sm text-dark hover:bg-gray-200"><FileText size={18} className="text-primary" />{m.fileName || 'View PDF'}<ExternalLink size={13} className="ml-auto" /></a>
            ) : (
              <img key={i} src={resolveMediaUrl(m.url)} alt="" className="max-h-96 w-full object-cover" />
            )
          )}
        </div>
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

      {/* Action bar */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-2 text-sm text-gray-500">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-secondary ${liked ? 'text-danger' : ''}`}
        >
          <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 && likeCount}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-secondary"
        >
          <MessageCircle size={17} />
          {commentCount > 0 && commentCount}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-secondary"
        >
          <Share2 size={17} />
          {shareCount > 0 && shareCount}
        </button>
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-secondary ${bookmarked ? 'text-primary' : ''}`}
        >
          <Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} />
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