import axios from 'axios';
import type { AuthorSnapshot } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Same "read the token fresh on every call" pattern as every other api/*.ts file.
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface ShareRecipient extends AuthorSnapshot {
  /** Priority tier this recipient was ranked into (see backend getShareRecipients). */
  relation?: 'mutual' | 'following' | 'follower' | 'recent';
}

/**
 * Recipient list for the Share modal's "Send to people" tab, built from
 * the existing Follow relationship data (mutual → following → followers →
 * recently-messaged). Optional `q` filters by name.
 */
export const getShareRecipients = async (q?: string): Promise<ShareRecipient[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/share-recipients`, {
    ...getAuthHeader(),
    params: { q: q || undefined },
  });
  return res.data.users as ShareRecipient[];
};

/** Sends a post into 1:1 conversations with the selected users (existing messaging system). */
export const shareToUsers = async (postId: string, userIds: string[], message?: string) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/community/posts/${postId}/share/to-users`,
    { userIds, message: message || undefined },
    getAuthHeader()
  );
  return res.data as { message: string; sentCount: number; shareCount: number };
};

export type ExternalShareChannel = 'whatsapp' | 'facebook' | 'copy_link';

/**
 * Best-effort tracking for an external share action (WhatsApp/Facebook/
 * copy-link) — call right after the external action is initiated
 * (window.open succeeded, clipboard write succeeded). Server-side
 * idempotent per (post, user, channel) within a cooldown window, so
 * re-opening the modal or double-clicking never double-counts.
 */
export const trackExternalShare = async (postId: string, channel: ExternalShareChannel) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/posts/${postId}/share/track`, { channel }, getAuthHeader());
  return res.data as { shareCount: number };
};

/** Canonical, shareable URL for a community post — matches the existing `/community/post/:postId` route. */
export function canonicalPostUrl(postId: string): string {
  return `${window.location.origin}/community/post/${postId}`;
}
