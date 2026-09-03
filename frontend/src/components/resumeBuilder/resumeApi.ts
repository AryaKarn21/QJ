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

export interface ExperienceEntry {
  _id?: string;
  role: string;
  company: string;
  companyId?: string | null;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface InternshipEntry {
  _id?: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface EducationEntry {
  _id?: string;
  degree: string;
  institution: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectEntry {
  _id?: string;
  title: string;
  description: string;
  link: string;
  technologies?: string;
}

export interface CertificationEntry {
  _id?: string;
  name: string;
  issuer: string;
  year: string;
}

export interface AchievementEntry {
  _id?: string;
  title: string;
  description: string;
  year: string;
}

export interface PublicationEntry {
  _id?: string;
  title: string;
  publisher: string;
  link: string;
  year: string;
  description: string;
}

export interface TrainingEntry {
  _id?: string;
  title: string;
  provider: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ScholarshipEntry {
  _id?: string;
  title: string;
  institution: string;
  amount: string;
  year: string;
  description: string;
}

export interface PositionEntry {
  _id?: string;
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ReferenceEntry {
  _id?: string;
  name: string;
  relationship: string;
  company: string;
  email: string;
  phone: string;
}

export interface VolunteerEntry {
  _id?: string;
  role: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface CustomSectionEntry {
  _id?: string;
  title: string;
  content: string;
}

export const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export interface LanguageEntry {
  _id?: string;
  name: string;
  level: LanguageLevel;
}



export const SKILL_CATEGORIES = [
  'Programming Languages',
  'Frameworks',
  'Databases',
  'Cloud',
  'DevOps',
  'AI/ML',
  'Soft Skills',
  'Languages',
  'Other',
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export interface SkillEntry {
  _id?: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
}

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  photo?: string;
 github?: string;
}

// A template id from the template registry (e.g. "ats-harvard"), or one of
// the 3 legacy layout ids ("modern" | "professional" | "executive") for
// resumes created before the registry existed. Intentionally a plain
// string, not a fixed union — new templates get added to the registry
// without needing a type (or database schema) change here.
export type ResumeLayout = string;

export interface Resume {
  _id: string;
  user: string;
  title: string;
  targetRole: string;
  layout: ResumeLayout;
  theme: string;
  // Independent typography/density customization — see
  // themePresets.ts (FONT_FAMILY_PRESETS) and backend/models/Resume.js.
  fontFamily: string;
  fontScale: number;
  spacing: 'compact' | 'standard' | 'relaxed';
  personalInfo: PersonalInfo;
  summary: string;
  experience: ExperienceEntry[];
  internships: InternshipEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
  publications: PublicationEntry[];
  trainings: TrainingEntry[];
  scholarships: ScholarshipEntry[];
  positionsOfResponsibility: PositionEntry[];
  hobbies: string[];
  references: ReferenceEntry[];
  languages: LanguageEntry[];
  volunteering: VolunteerEntry[];
  customSections: CustomSectionEntry[];
  // Section-wise layout system: order is this array; visibility is "not
  // present in hiddenSections". See templates/shared/sections.ts for the
  // shared helpers every template/editor should use to read these rather
  // than reading them directly.
  sectionOrder: string[];
  hiddenSections: string[];
  status: 'draft' | 'final';
  createdAt: string;
  updatedAt: string;
}

export type ResumeSummary = Pick<
  Resume,
  '_id' | 'title' | 'targetRole' | 'layout' | 'theme' | 'status' | 'updatedAt' | 'createdAt'
>;

export const getMyResumes = async (): Promise<ResumeSummary[]> => {
  const res = await api.get('/api/resumes');
  return res.data;
};

export const getResumeById = async (id: string): Promise<Resume> => {
  const res = await api.get(`/api/resumes/${id}`);
  return res.data;
};

export const createResume = async (payload: {
  layout: ResumeLayout;
  theme: string;
  title?: string;
  targetRole?: string;
}): Promise<Resume> => {
  const res = await api.post('/api/resumes', payload);
  return res.data;
};

export const updateResume = async (id: string, payload: Partial<Resume>): Promise<Resume> => {
  const res = await api.patch(`/api/resumes/${id}`, payload);
  return res.data;
};

export const deleteResume = async (id: string): Promise<void> => {
  await api.delete(`/api/resumes/${id}`);
};
