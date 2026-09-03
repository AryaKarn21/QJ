import axios from 'axios';
import type { ConversationSummary, DirectMessage, AuthorSnapshot } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const fetchConversations = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/community/messages`, getAuthHeader());
  return res.data.conversations as ConversationSummary[];
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

export const sendMessage = async (conversationId: string, text: string) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/community/messages/${conversationId}/messages`,
    { text },
    getAuthHeader()
  );
  return res.data.message as DirectMessage;
};
