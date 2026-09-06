import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export type SearchResultType = 'people' | 'companies';

export interface SearchResult {
  _id: string;
  name: string;
  role: string;
  avatar: string | null;
  headline: string;
  isVerified: boolean;
  bio: string;
  company: string | null;
  skills: string[];
  location: string;
}

export interface SearchResponse {
  results: SearchResult[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchParams {
  q?: string;
  type?: SearchResultType;
  skills?: string;
  location?: string;
  page?: number;
  limit?: number;
}

/** Community-wide search (backend/controllers/searchController.js). */
export const searchCommunity = async (params: SearchParams): Promise<SearchResponse> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/search`, {
    ...getAuthHeader(),
    params,
  });
  return res.data;
};
