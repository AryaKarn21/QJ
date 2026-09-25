import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Share2, Linkedin, Instagram, Twitter, Mail, Link2, Check } from 'lucide-react';

// lucide-react has no WhatsApp glyph — small inline brand SVGs, same
// pattern Footer.tsx and community/ShareModal.tsx already use.
const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.64-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.37-.44.5-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.7-.17 1.38z" />
  </svg>
);
const FacebookIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.5 17.52 2 11.94 2S1.88 6.5 1.88 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.42V9.9c0-2.39 1.42-3.71 3.6-3.71 1.04 0 2.13.19 2.13.19v2.35h-1.2c-1.18 0-1.55.74-1.55 1.49v1.79h2.64l-.42 2.91h-2.22V22c4.78-.79 8.44-4.94 8.44-9.94z" />
  </svg>
);

interface BlogShareMenuProps {
  title: string;
  description?: string;
}

/**
 * Share menu for a single blog post — Facebook, LinkedIn, Instagram,
 * WhatsApp, X/Twitter, Email, Copy Link, and native Web Share where
 * supported. The URL is always read live from window.location (origin +
 * pathname of whatever page this is rendered on) — never hardcoded, so it
 * works identically in dev/staging/prod without configuration.
 */
export const BlogShareMenu: React.FC<BlogShareMenuProps> = ({ title, description }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const url = `${window.location.origin}${window.location.pathname}`;
  const shareText = title || 'Check out this article on QuickJobs';

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openWindow = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: shareText, text: description, url });
      setOpen(false);
    } catch {
      // AbortError when the user cancels the native sheet — nothing to do.
    }
  };

  const handleInstagram = () => {
    // Instagram has no equivalent of Facebook/LinkedIn's "share via URL"
    // endpoint — the only reliable flow is: copy the link, then hand the
    // person off to Instagram to paste it themselves (story/bio/DM).
    handleCopyLink();
    toast.info('Link copied — paste it into your Instagram story, bio, or a DM.');
    openWindow('https://www.instagram.com/');
    setOpen(false);
  };

  const handleEmail = () => {
    const subject = `QuickJobs Blog — ${title}`;
    const body = [title, '', description || '', '', url].filter((l) => l !== undefined).join('\n');
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpen(false);
  };

  const items: { key: string; label: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <span className="text-[#1877F2]"><FacebookIcon /></span>,
      onClick: () => { openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`); setOpen(false); },
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <Linkedin size={16} className="text-[#0A66C2]" />,
      onClick: () => { openWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`); setOpen(false); },
    },
    {
      key: 'instagram',
      label: 'Instagram',
      icon: <Instagram size={16} className="text-[#E4405F]" />,
      onClick: handleInstagram,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <span className="text-[#25D366]"><WhatsAppIcon /></span>,
      onClick: () => { openWindow(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`); setOpen(false); },
    },
    {
      key: 'twitter',
      label: 'X / Twitter',
      icon: <Twitter size={16} className="text-slate-900 dark:text-slate-100" />,
      onClick: () => { openWindow(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`); setOpen(false); },
    },
    {
      key: 'email',
      label: 'Email',
      icon: <Mail size={16} className="text-slate-500" />,
      onClick: handleEmail,
    },
    {
      key: 'copy',
      label: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} className="text-slate-500" />,
      onClick: handleCopyLink,
    },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary"
      >
        <Share2 size={16} /> Share
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
        >
          {typeof navigator.share === 'function' && (
            <>
              <button
                role="menuitem"
                onClick={handleNativeShare}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Share2 size={16} className="text-primary" /> Share via…
              </button>
              <div className="my-1 h-px bg-gray-100" />
            </>
          )}
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitem"
              onClick={item.onClick}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogShareMenu;
