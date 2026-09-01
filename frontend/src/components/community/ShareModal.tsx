import React, { useEffect, useMemo, useState } from 'react';
import { X, Link2, Send, Loader2, Check, Search, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { sharePost } from '../../api/communityApi';
import { getShareRecipients, shareToUsers, trackExternalShare, canonicalPostUrl, type ShareRecipient } from '../../api/shareApi';
import { useCurrentUser } from '../../utils/currentUser';
import { Avatar } from './Avatar';
import type { CommunityPost } from '../../types/community';

// Inline SVG brand marks — no extra dependency for two icons.
const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.7-.17 1.38z"/>
  </svg>
);
const FacebookIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.5 17.52 2 11.94 2S1.88 6.5 1.88 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.42V9.9c0-2.39 1.42-3.71 3.6-3.71 1.04 0 2.13.19 2.13.19v2.35h-1.2c-1.18 0-1.55.74-1.55 1.49v1.79h2.64l-.42 2.91h-2.22V22c4.78-.79 8.44-4.94 8.44-9.94z"/>
  </svg>
);

type RelationTab = 'all' | 'mutual' | 'following' | 'follower';
const RELATION_TABS: { value: RelationTab; label: string }[] = [
  { value: 'all', label: 'Suggested' },
  { value: 'mutual', label: 'Mutual' },
  { value: 'following', label: 'Following' },
  { value: 'follower', label: 'Followers' },
];

interface ShareModalProps {
  post: CommunityPost;
  onClose: () => void;
  /** Fired once, only after a share action actually succeeds — this is what the parent uses to bump shareCount exactly once per successful action. */
  onShared: (kind: 'feed' | 'users' | 'external') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ post, onClose, onShared }) => {
  const { userId } = useCurrentUser();
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [recipientsError, setRecipientsError] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<RelationTab>('all');
  const [selected, setSelected] = useState<Map<string, ShareRecipient>>(new Map());
  const [message, setMessage] = useState('');
  const [sendingToUsers, setSendingToUsers] = useState(false);

  const [feedCaption, setFeedCaption] = useState('');
  const [sharingToFeed, setSharingToFeed] = useState(false);

  const [externalBusy, setExternalBusy] = useState<'whatsapp' | 'facebook' | 'copy_link' | null>(null);
  const [copied, setCopied] = useState(false);

  const url = canonicalPostUrl(post._id);
  const shareText = post.content ? post.content.slice(0, 140) : 'Check out this post on QuickJobs';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRecipients(true);
    setRecipientsError('');
    const timer = setTimeout(() => {
      getShareRecipients(query.trim() || undefined)
        .then((users) => {
          if (cancelled) return;
          // Defensive: never allow the current user to appear as a recipient,
          // and drop any duplicate ids the backend might return.
          const seen = new Set<string>();
          const clean = users.filter((u) => {
            if (u._id === userId) return false;
            if (seen.has(u._id)) return false;
            seen.add(u._id);
            return true;
          });
          setRecipients(clean);
        })
        .catch(() => {
          if (!cancelled) setRecipientsError('Could not load people to share with.');
        })
        .finally(() => {
          if (!cancelled) setLoadingRecipients(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, userId]);

  const visibleRecipients = useMemo(
    () => (tab === 'all' ? recipients : recipients.filter((r) => r.relation === tab)),
    [recipients, tab]
  );

  const toggleRecipient = (person: ShareRecipient) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(person._id)) next.delete(person._id);
      else next.set(person._id, person);
      return next;
    });
  };

  const handleSendToUsers = async () => {
    if (selected.size === 0 || sendingToUsers) return;
    setSendingToUsers(true);
    try {
      const res = await shareToUsers(post._id, Array.from(selected.keys()), message.trim() || undefined);
      toast.success(res.sentCount > 1 ? `Sent to ${res.sentCount} people.` : 'Sent.');
      onShared('users');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not send this post. Please try again.');
    } finally {
      setSendingToUsers(false);
    }
  };

  const handleShareToFeed = async () => {
    if (sharingToFeed) return;
    setSharingToFeed(true);
    try {
      await sharePost(post._id, feedCaption.trim());
      toast.success('Shared to your feed.');
      onShared('feed');
      onClose();
    } catch {
      toast.error('Could not share this post.');
    } finally {
      setSharingToFeed(false);
    }
  };

  const handleWhatsApp = () => {
    if (externalBusy) return;
    setExternalBusy('whatsapp');
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`, '_blank', 'noopener,noreferrer');
    trackExternalShare(post._id, 'whatsapp')
      .then(() => onShared('external'))
      .catch(() => {})
      .finally(() => setExternalBusy(null));
  };

  const handleFacebook = () => {
    if (externalBusy) return;
    setExternalBusy('facebook');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    trackExternalShare(post._id, 'facebook')
      .then(() => onShared('external'))
      .catch(() => {})
      .finally(() => setExternalBusy(null));
  };

  const handleCopyLink = async () => {
    if (externalBusy) return;
    setExternalBusy('copy_link');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      await trackExternalShare(post._id, 'copy_link').catch(() => {});
      onShared('external');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link.');
    } finally {
      setExternalBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Share post">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />

      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-light shadow-card-hover sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-dark">Share post</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-secondary hover:text-dark" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              disabled={externalBusy === 'whatsapp'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-dark hover:bg-secondary disabled:opacity-60"
            >
              <span className="text-[#25D366]"><WhatsAppIcon size={16} /></span> WhatsApp
            </button>
            <button
              onClick={handleFacebook}
              disabled={externalBusy === 'facebook'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-dark hover:bg-secondary disabled:opacity-60"
            >
              <span className="text-[#1877F2]"><FacebookIcon size={16} /></span> Facebook
            </button>
            <button
              onClick={handleCopyLink}
              disabled={externalBusy === 'copy_link'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-dark hover:bg-secondary disabled:opacity-60"
            >
              {copied ? <Check size={15} className="text-success" /> : <Link2 size={15} />} {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <div className="my-4 h-px bg-gray-100" />

          {/* Send to people */}
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Users size={13} /> Share with QuickJobs members
          </p>

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people by name…"
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {RELATION_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  tab === t.value ? 'bg-primary text-light' : 'bg-secondary text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
            {loadingRecipients && (
              <div className="flex items-center justify-center py-6 text-gray-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
            {!loadingRecipients && recipientsError && (
              <p className="py-4 text-center text-xs text-danger">{recipientsError}</p>
            )}
            {!loadingRecipients && !recipientsError && visibleRecipients.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">No one to show here yet.</p>
            )}
            {!loadingRecipients &&
              visibleRecipients.map((person) => {
                const isSelected = selected.has(person._id);
                return (
                  <button
                    key={person._id}
                    onClick={() => toggleRecipient(person)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-secondary'
                    }`}
                  >
                    <Avatar user={person} size={9} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-dark">{person.name}</p>
                      {person.headline && <p className="truncate text-[11px] text-gray-500">{person.headline}</p>}
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-primary bg-primary text-light' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </span>
                  </button>
                );
              })}
          </div>

          {selected.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(selected.values()).map((p) => (
                <span key={p._id} className="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-[11px] font-medium text-primary">
                  {p.name}
                  <button onClick={() => toggleRecipient(p)} className="rounded-full p-0.5 hover:bg-primary/20">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />

          <button
            onClick={handleSendToUsers}
            disabled={selected.size === 0 || sendingToUsers}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-light hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendingToUsers ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sendingToUsers ? 'Sending…' : selected.size > 0 ? `Send to ${selected.size} ${selected.size === 1 ? 'person' : 'people'}` : 'Send'}
          </button>

          <div className="my-4 h-px bg-gray-100" />

          {/* Share to own feed */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Share to your feed</p>
          <textarea
            value={feedCaption}
            onChange={(e) => setFeedCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <button
            onClick={handleShareToFeed}
            disabled={sharingToFeed}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-dark hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sharingToFeed ? <Loader2 size={15} className="animate-spin" /> : null}
            {sharingToFeed ? 'Sharing…' : 'Share to my feed'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
