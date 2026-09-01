import axios from 'axios';
import type { AuthorSnapshot } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const toggleFollow = async (userId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/follow/${userId}/toggle`, {}, getAuthHeader());
  return res.data as { following: boolean };
};

export const fetchFollowCounts = async (userId: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/${userId}/counts`, getAuthHeader());
  return res.data as { followers: number; following: number; isFollowing: boolean };
};

export interface PaginatedPeople {
  people: AuthorSnapshot[];
  page: number;
  totalPages: number;
  total: number;
}

export const fetchFollowers = async (userId: string, opts?: { page?: number; q?: string }): Promise<PaginatedPeople> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/${userId}/followers`, {
    ...getAuthHeader(),
    params: { page: opts?.page || 1, q: opts?.q || undefined },
  });
  return {
    people: res.data.followers as AuthorSnapshot[],
    page: res.data.page,
    totalPages: res.data.totalPages,
    total: res.data.total,
  };
};

export const fetchFollowing = async (userId: string, opts?: { page?: number; q?: string }): Promise<PaginatedPeople> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/${userId}/following`, {
    ...getAuthHeader(),
    params: { page: opts?.page || 1, q: opts?.q || undefined },
  });
  return {
    people: res.data.following as AuthorSnapshot[],
    page: res.data.page,
    totalPages: res.data.totalPages,
    total: res.data.total,
  };
};

export const fetchFollowSuggestions = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/suggestions`, getAuthHeader());
  return res.data.suggestions as AuthorSnapshot[];
};

export const searchMentionableUsers = async (q: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/search`, { ...getAuthHeader(), params: { q } });
  return res.data.users as AuthorSnapshot[];
};

export const fetchPublicProfile = async (userId: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/${userId}/profile`);
  return res.data.profile as AuthorSnapshot;
};