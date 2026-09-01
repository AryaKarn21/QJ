const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
import axios from 'axios';
import type { CommunityComment } from '../types/community';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const fetchComments = async (postId: string, page = 1) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/comments/post/${postId}`, { ...getAuthHeader(), params: { page } });
  return res.data as { comments: CommunityComment[]; page: number; hasMore: boolean };
};

export const fetchReplies = async (commentId: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/comments/${commentId}/replies`, getAuthHeader());
  return res.data.replies as CommunityComment[];
};

export const addComment = async (postId: string, content: string, parentCommentId?: string) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/community/comments/post/${postId}`,
    { content, parentCommentId },
    getAuthHeader()
  );
  return res.data.comment as CommunityComment;
};

export const toggleLikeComment = async (commentId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/comments/${commentId}/like`, {}, getAuthHeader());
  return res.data as { liked: boolean; likeCount: number };
};

export const deleteComment = async (commentId: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/community/comments/${commentId}`, getAuthHeader());
  return res.data;
};