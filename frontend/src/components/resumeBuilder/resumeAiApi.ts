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

export type SummaryAction = 'generate' | 'improve' | 'shorten' | 'expand';

export const generateResumeSummary = async (
  resumeId: string,
  action: SummaryAction,
  targetRole?: string
): Promise<string> => {
  const res = await api.post(`/api/resumes/ai/${resumeId}/summary`, { action, targetRole });
  return res.data.summary;
};

// Auto-fill an entire resume from free-form candidate text using Gemini
export const autoFillResume = async (
  resumeId: string,
  rawInput: string,
  targetRole?: string
): Promise<void> => {
  await api.post(`/api/resumes/ai/${resumeId}/autofill`, { rawInput, targetRole });
};

// ── Occupation-aware AI (manpower/recruitment resumes) ─────────────────────

export type LanguageStyle = 'professional' | 'simple';

export interface OccupationSuggestions {
  profile: string;
  skills: {
    technical: string[];
    tools: string[];
    soft: string[];
  };
  responsibilities: string[];
  keywords: string[];
  certifications: string[];
  languages: string[];
  _matchedOccupation: string | null;
  _category: string | null;
}

// Distinct job categories from the curated occupation database, for the
// Category -> Job Role selector.
export const getOccupationCategories = async (): Promise<string[]> => {
  const res = await api.get(`/api/resumes/ai/occupation-categories`);
  return res.data.categories;
};

// Generate Profile / Skills / Tools / Responsibilities / Keywords /
// optional Certifications & Languages for a target job role. Does NOT
// save anything — the caller shows these as suggestions with Add/Edit/
// Regenerate controls before writing them into the resume.
export const getOccupationSuggestions = async (
  resumeId: string,
  targetRole: string,
  languageStyle: LanguageStyle = 'professional'
): Promise<OccupationSuggestions> => {
  const res = await api.post(`/api/resumes/ai/${resumeId}/occupation-suggestions`, {
    targetRole,
    languageStyle,
  });
  return res.data.suggestions;
};

// Rewrite one existing experience entry's description into clean resume
// bullet points, using only what the user already entered (no invented
// facts). `experienceIndex` is the entry's position in resume.experience[].
export const improveExperienceEntry = async (
  resumeId: string,
  experienceIndex: number,
  languageStyle: LanguageStyle = 'professional'
): Promise<string[]> => {
  const res = await api.post(`/api/resumes/ai/${resumeId}/improve-experience`, {
    experienceIndex,
    languageStyle,
  });
  return res.data.bullets;
};

// Translate a flat set of field values (e.g. { profile: "...", skills: [...] })
// into the target language, preserving keys/structure.
export const translateResumeContent = async (
  resumeId: string,
  targetLanguage: string,
  fields: Record<string, string | string[]>
): Promise<Record<string, string | string[]>> => {
  const res = await api.post(`/api/resumes/ai/${resumeId}/translate`, {
    targetLanguage,
    fields,
  });
  return res.data.translated;
};

// ── Preview versions — usable BEFORE a resume exists yet, e.g. while the
// candidate is still filling out the intake form. ──────────────────────────

// Suggests skills/tools/responsibilities/profile for a target role, using
// whatever rough experience text the user has already typed (optional).
export const getOccupationSuggestionsPreview = async (
  targetRole: string,
  experienceText: string = '',
  languageStyle: LanguageStyle = 'professional'
): Promise<OccupationSuggestions> => {
  const res = await api.post(`/api/resumes/ai/occupation-suggestions/preview`, {
    targetRole,
    experienceText,
    languageStyle,
  });
  return res.data.suggestions;
};

// Rewrites raw, rough work-experience text (not yet saved) into clean
// resume bullet points, without inventing facts the user didn't type.
export const improveExperiencePreview = async (
  description: string,
  targetRole: string = '',
  languageStyle: LanguageStyle = 'professional'
): Promise<string[]> => {
  const res = await api.post(`/api/resumes/ai/improve-experience/preview`, {
    targetRole,
    description,
    languageStyle,
  });
  return res.data.bullets;
};

// ── ATS compatibility analysis ──────────────────────────────────────────────
// Rule-based (not Gemini-backed — see backend/services/atsAnalysis.service.js),
// so this always works even without an AI key configured.

export type AtsSeverity = 'critical' | 'warning' | 'tip';
export type AtsStatus = 'good' | 'warning' | 'critical';

export interface AtsSuggestion {
  severity: AtsSeverity;
  message: string;
  category: string;
}

export interface AtsCategory {
  key: string;
  label: string;
  weight: number;
  score: number;
  status: AtsStatus;
  findingCount: number;
}

export interface AtsAnalysis {
  overallScore: number;
  status: AtsStatus;
  disclaimer: string;
  categories: AtsCategory[];
  suggestions: AtsSuggestion[];
  jdKeywords: { matched: string[]; missing: string[] } | null;
  analyzedAt: string;
}

export const getAtsAnalysis = async (resumeId: string, jobDescription?: string): Promise<AtsAnalysis> => {
  const res = await api.get(`/api/resumes/ai/${resumeId}/ats-analysis`, {
    params: jobDescription ? { jobDescription } : undefined,
  });
  return res.data.analysis;
};