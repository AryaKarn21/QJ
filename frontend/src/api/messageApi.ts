import axios from 'axios';
import type { ConversationSummary, DirectMessage, AuthorSnapshot } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// The backend builds each conversation's `otherUser` from a live User
// lookup (messageController.js's getConversations) and returns null when
// that account has since been deleted — MessagesPage.tsx (and everything
// else that reads `conv.otherUser.*`) assumes it's always present, so an
// old conversation with a deleted participant crashed the whole page on
// load. Normalized here, at the API boundary, so every current and future
// caller of fetchConversations gets safe data without re-deriving this.
const DELETED_USER: AuthorSnapshot = {
  _id: 'deleted',
  name: 'Deleted user',
  role: 'jobseeker',
  avatar: null,
};

export const fetchConversations = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/community/messages`, getAuthHeader());
  const conversations = res.data.conversations as ConversationSummary[];
  return conversations.map((c) => (c.otherUser ? c : { ...c, otherUser: DELETED_USER }));
};

export const openConversationWith = async (userId: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/messages/with/${userId}`, getAuthHeader());
  return res.data.conversation as { _id: string; otherUser: AuthorSnapshot; lastMessageAt: string };
};

export const fetchMessages = async (conversationId: string, page = 1) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/messages/${conversationId}/messages`, {
    ...getAuthHeader(),
    params: { page },
  });
  return res.data as { messages: DirectMessage[]; hasMore: boolean };
};

export const sendMessage = async (conversationId: string, text: string, files?: File[]) => {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('text', text);
    files.forEach((f) => form.append('attachments', f));
    // No explicit Content-Type — axios/the browser must generate it so it
    // includes the required `boundary=...` parameter; a hand-set
    // 'multipart/form-data' (no boundary) makes busboy/multer throw
    // "Multipart: Boundary not found" on every attachment send.
    const res = await axios.post(
      `${API_BASE_URL}/api/community/messages/${conversationId}/messages`,
      form,
      getAuthHeader()
    );
    return res.data.message as DirectMessage;
  }
  const res = await axios.post(
    `${API_BASE_URL}/api/community/messages/${conversationId}/messages`,
    { text },
    getAuthHeader()
  );
  return res.data.message as DirectMessage;
};

// Logs a finished voice/video call as an inline message bubble — see
// backend/controllers/messageController.js's logCall and useWebRTC's
// onCallEnded (only the caller's side calls this, per that comment).
export const logCall = async (
  conversationId: string,
  info: { callType: 'audio' | 'video'; status: 'completed' | 'missed' | 'declined'; duration: number }
) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/community/messages/${conversationId}/messages/call-log`,
    info,
    getAuthHeader()
  );
  return res.data.message as DirectMessage;
};

export const deleteMessage = async (conversationId: string, messageId: string) => {
  await axios.delete(
    `${API_BASE_URL}/api/community/messages/${conversationId}/messages/${messageId}`,
    getAuthHeader()
  );
};
