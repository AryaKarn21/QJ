import React, { useEffect, useMemo, useState } from 'react';
import { X, Link2, Send, Loader2, Check, Search, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getShareRecipients,
  shareToUsers,
  trackExternalShare,
  canonicalPostUrl,
  type ShareRecipient,
  type ExternalShareChannel,
} from '../../api/shareApi';
import { useCurrentUser } from '../../utils/currentUser';
import { Avatar } from './Avatar';
import type { CommunityPost } from '../../types/community';

// Inline SVG brand marks for social platforms
const LinkedInIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const TwitterXIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GmailIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
    <path fill="#1e88e5" d="M3,16.2l5,2.75l5,4.75L13,40H6c-1.657,0-3-1.343-3-3V16.2z" />
    <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
    <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2l-4.577-3.433C7.039,6.729,5.08,6.866,3.856,8.09 C3.32,8.627,3,9.362,3,10.161V12.298z" />
    <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l4.577-3.433c1.384-1.038,3.343-0.901,4.567,0.323 C44.68,8.627,45,9.362,45,10.161V12.298z" />
  </svg>
);

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.7-.17 1.38z" />
  </svg>
);

const FacebookIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
    <path d="M22 12.06C22 6.5 17.52 2 11.94 2S1.88 6.5 1.88 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.42V9.9c0-2.39 1.42-3.71 3.6-3.71 1.04 0 2.13.19 2.13.19v2.35h-1.2c-1.18 0-1.55.74-1.55 1.49v1.79h2.64l-.42 2.91h-2.22V22c4.78-.79 8.44-4.94 8.44-9.94z" />
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
  /** Fired once, only after a share action actually succeeds */
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

  const [externalBusy, setExternalBusy] = useState<ExternalShareChannel | null>(null);
  const [copied, setCopied] = useState(false);

  const url = canonicalPostUrl(post._id);
  const shareText = post.content ? post.content.slice(0, 160) : 'Check out this post on QuickJobs';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Load recipients for internal QuickJobs sharing
  useEffect(() => {
    let cancelled = false;
    setLoadingRecipients(true);
    setRecipientsError('');
    const timer = setTimeout(() => {
      getShareRecipients(query.trim() || undefined)
        .then((users) => {
          if (cancelled) return;
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

  const handleShareToChannel = (channel: ExternalShareChannel, targetUrl: string) => {
    if (externalBusy) return;
    setExternalBusy(channel);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    trackExternalShare(post._id, channel)
      .then(() => onShared('external'))
      .catch(() => {})
      .finally(() => setExternalBusy(null));
  };

  const handleLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    handleShareToChannel('linkedin', shareUrl);
  };

  const handleTwitter = () => {
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    handleShareToChannel('twitter', shareUrl);
  };

  const handleGmail = () => {
    const subject = `QuickJobs Post by ${post.author?.name || 'QuickJobs Member'}`;
    const body = `${shareText}\n\nRead more on QuickJobs:\n${url}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    handleShareToChannel('gmail', gmailUrl);
  };

  const handleWhatsApp = () => {
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`;
    handleShareToChannel('whatsapp', shareUrl);
  };

  const handleFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    handleShareToChannel('facebook', shareUrl);
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

  const mediaApps = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <LinkedInIcon size={18} />,
      action: handleLinkedIn,
      disabled: externalBusy === 'linkedin',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: <span className="text-slate-900 dark:text-slate-100"><TwitterXIcon size={16} /></span>,
      action: handleTwitter,
      disabled: externalBusy === 'twitter',
    },
    {
      id: 'gmail',
      name: 'Gmail',
      icon: <GmailIcon size={18} />,
      action: handleGmail,
      disabled: externalBusy === 'gmail',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <WhatsAppIcon size={18} />,
      action: handleWhatsApp,
      disabled: externalBusy === 'whatsapp',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <FacebookIcon size={18} />,
      action: handleFacebook,
      disabled: externalBusy === 'facebook',
    },
    {
      id: 'copy_link',
      name: copied ? 'Copied' : 'Copy Link',
      icon: copied ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} />,
      action: handleCopyLink,
      disabled: externalBusy === 'copy_link',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Share post"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-light shadow-card-hover sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-dark">Share post</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-secondary hover:text-dark"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {/* Social media apps row (LinkedIn, Twitter, Gmail, WhatsApp, Facebook, Copy Link) */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Share to media app
            </p>
            <div className="grid grid-cols-3 gap-2">
              {mediaApps.map((app) => (
                <button
                  key={app.id}
                  onClick={app.action}
                  disabled={app.disabled}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-dark shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-60"
                >
                  {app.icon}
                  <span className="truncate">{app.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="my-4 h-px bg-gray-100" />

          {/* Internal QuickJobs Members Selection */}
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

          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
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
                <span
                  key={p._id}
                  className="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-[11px] font-medium text-primary"
                >
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
            {sendingToUsers
              ? 'Sending…'
              : selected.size > 0
              ? `Send to ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`
              : 'Send to members'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
