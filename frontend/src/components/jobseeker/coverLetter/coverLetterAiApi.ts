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

export type CoverLetterAiAction =
  | 'generate'
  | 'improve'
  | 'rewrite'
  | 'concise'
  | 'professional'
  | 'persuasive'
  | 'grammar'
  | 'customize';

export type CoverLetterTone = 'professional' | 'friendly' | 'confident' | 'enthusiastic';

export interface CoverLetterAiRequest {
  action: CoverLetterAiAction;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  candidateName?: string;
  candidateProfile?: string;
  candidateSkills?: string[];
  candidateExperience?: string;
  resumeText?: string;
  tone?: CoverLetterTone;
  existingCoverLetter?: string;
}

/**
 * Calls the Gemini-backed cover-letter assistant (backend/routes/coverLetterAiRoutes.js).
 * The API key never touches the browser — this only ever talks to our own
 * backend, which holds GEMINI_API_KEY server-side.
 */
export const runCoverLetterAi = async (payload: CoverLetterAiRequest): Promise<string> => {
  const res = await api.post('/api/ai/cover-letter', payload);
  return res.data.content;
};
