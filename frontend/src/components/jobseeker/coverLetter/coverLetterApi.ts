import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CoverLetterSummary {
  _id: string;
  title: string;
  templateId: string;
  job?: string | null;
  isDefault: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface CoverLetter extends CoverLetterSummary {
  user: string;
  content: string;
}

/** For the "reuse a previous cover letter" picker. */
export const getMyCoverLetters = async (): Promise<CoverLetterSummary[]> => {
  const res = await api.get('/api/jobseeker/cover-letters');
  return res.data;
};

export const getCoverLetterById = async (id: string): Promise<CoverLetter> => {
  const res = await api.get(`/api/jobseeker/cover-letters/${id}`);
  return res.data;
};

export const createCoverLetter = async (payload: {
  title?: string;
  content: string;
  templateId?: string;
  job?: string | null;
  isDefault?: boolean;
}): Promise<CoverLetter> => {
  const res = await api.post('/api/jobseeker/cover-letters', payload);
  return res.data;
};

export const updateCoverLetter = async (
  id: string,
  payload: Partial<{ title: string; content: string; templateId: string; job: string | null; isDefault: boolean }>
): Promise<CoverLetter> => {
  const res = await api.patch(`/api/jobseeker/cover-letters/${id}`, payload);
  return res.data;
};

export const deleteCoverLetter = async (id: string): Promise<void> => {
  await api.delete(`/api/jobseeker/cover-letters/${id}`);
};
