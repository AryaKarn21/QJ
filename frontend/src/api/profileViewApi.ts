import axios from 'axios';
import type { AuthorSnapshot } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface ProfileViewer extends AuthorSnapshot {
  lastViewedAt: string;
  viewCount: number;
}

export interface PaginatedProfileViewers {
  viewers: ProfileViewer[];
  page: number;
  totalPages: number;
  total: number;
}

// Fire-and-forget from the caller's side — a failed view record (network
// blip, not authenticated, etc.) shouldn't block or error out the profile
// page itself, so this never throws; callers just don't await it.
export const recordProfileView = async (userId: string): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/api/community/profile-views/${userId}`, {}, getAuthHeader());
  } catch {
    // Intentionally silent — see comment above.
  }
};

export const getMyProfileViewers = async (page = 1): Promise<PaginatedProfileViewers> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/profile-views/mine`, {
    ...getAuthHeader(),
    params: { page },
  });
  return res.data;
};

export const getMyProfileViewCount = async (): Promise<number> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/profile-views/count`, getAuthHeader());
  return res.data.total;
};
