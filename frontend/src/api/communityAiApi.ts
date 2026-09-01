import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// Every call here can 503 with "AI features aren't configured yet..." if
// the backend has no GEMINI_API_KEY set — callers should surface
// error.response?.data?.message to the user rather than a generic failure.

export const generateCaption = async (topic: string, tone = 'professional', postType = 'text') => {
  const res = await axios.post(`${API_BASE_URL}/api/community/ai/caption`, { topic, tone, postType }, getAuthHeader());
  return res.data.caption as string;
};

export const correctGrammar = async (text: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/ai/grammar`, { text }, getAuthHeader());
  return res.data as { corrected: string; changed: boolean };
};

export const summarizePost = async (postId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/ai/summarize`, { postId }, getAuthHeader());
  return res.data as { summary: string; cached: boolean };
};

export const detectHiringIntent = async (text: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/ai/hiring-detect`, { text }, getAuthHeader());
  return res.data as { isHiring: boolean; confidence: number; suggestedRoles: string[] };
};

export const fetchJobRecommendations = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/community/ai/job-recommendations`, getAuthHeader());
  return res.data.recommendations as { job: any; reason: string }[];
};
