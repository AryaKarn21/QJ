import axios from 'axios';
import type { ProfileStatus } from '../../../types/profileStatus';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://qj.onrender.com";

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login?session_expired=true';
    }
    return Promise.reject(error);
  }
);

export interface Job {
  _id: string;
  title: string;
  country: string;
  location: string;
  jobtype: string;
  status: string;
  salary: string;
  experience: string;
  level: string;
  deadline: string;
  istrending: boolean;
  openings: number;
  description: string;
  likeCount: number;
  dislikeCount: number;
  jobseekers: any[];
  jobcategory: string;
  createdAt: string;
  updatedAt?: string;
  employer?: {
    _id: string;
    name: string;
    email?: string;
    companyLogo?: string;
  };
}


interface FetchJobsParams {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  jobType?: string;
  level?: string;
  // Phase 5 additions — all optional, all backed by real Job fields
  // (workMode/salaryMin/salaryMax/requiredSkills from Phase 1). Sorting
  // moved server-side (see jobController.js's SORT_OPTIONS) since sorting
  // only the current page client-side, after pagination, silently broke
  // "Newest"/"Salary" across more than one page.
  workMode?: string;
  minSalary?: number | string;
  maxSalary?: number | string;
  skills?: string;
  datePosted?: '24h' | '7d' | '30d' | '';
  sortBy?: 'newest' | 'oldest' | 'salaryHigh' | 'salaryLow' | 'relevance';
  // Naukri-style filter additions — company/industry resolve against the
  // Employer, education/experience against the job's own structured
  // fields (see jobController.js's getJobs for the exact match rules).
  company?: string;
  industry?: string;
  education?: string;
  minExperience?: number | string;
  maxExperience?: number | string;
}

export const getStats = async () => {
  const response = await api.get('/api/admin/admin-stats');
  return response.data;
};

// Fetch all jobs with pagination
export const fetchJobs = async ({
  page = 1,
  limit = 6,
  search = '',
  location = '',
  jobType = '',
  level = '',
  workMode = '',
  minSalary,
  maxSalary,
  skills = '',
  datePosted = '',
  sortBy = 'newest',
  company = '',
  industry = '',
  education = '',
  minExperience,
  maxExperience,
}: FetchJobsParams) => {
  const response = await api.get('/api/jobs', {
    params: {
      page,
      limit,
      search,
      location,
      jobtype: jobType,
      level,
      workMode,
      minSalary,
      maxSalary,
      skills,
      datePosted,
      sortBy,
      company,
      industry,
      education,
      minExperience,
      maxExperience,
    },
  });
  return response.data;
};

// Fetch trending jobs
export const fetchTrendingJobs = async () => {
  const response = await api.get('/api/jobs/trending');
  return response.data.jobs;
};

// Fetch trending jobs
export const fetchRecentJobs = async () => {
  const response = await api.get('/api/jobs/recent');
  return response.data.jobs;
};

// Fetch job counts by country
export const fetchJobCountsByCountry = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/jobs/counts-by-country`);
  return response.data;
};

// Fetch a specific job by ID
export const fetchJobById = async (id: string): Promise<Job> => {
  const response = await api.get(`/api/jobs/${id}`);
  return response.data;
};

// Apply to a job
export const applyToJob = async ({
  jobId,
  howDidYouHear,
  coverLetter,
  resumeFile,
}: {
  jobId: string;
  howDidYouHear: string;
  coverLetter: string;
  resumeFile: File;
}) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("jobId", jobId);
  formData.append("howDidYouHear", howDidYouHear);
  formData.append("coverLetter", coverLetter);
  formData.append("resume", resumeFile);

  // No explicit Content-Type — see authApi.ts's registerEmployer for why a
  // hand-set 'multipart/form-data' (no boundary) breaks the upload; `api`'s
  // request interceptor already attaches the Authorization header.
  const response = await api.post(`/api/jobs/apply`, formData);

  return response.data;
};

// Like a job
export const likeJob = async (jobId: string): Promise<{ message: string; likes: number; dislikes: number }> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.post(`/api/jobs/${jobId}/like`);

  return response.data;
};

// Dislike a job
export const dislikeJob = async (jobId: string): Promise<{ message: string; dislikes: number; likes: number }> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.post(`/api/jobs/${jobId}/dislike`);

  return response.data;
};

export const getJobseekerProfile = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.get('/api/jobseeker/profile');

  return response.data;
};

export const updateJobseekerProfile = async (formData: FormData) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  // No explicit Content-Type — see the comment on applyToJob above.
  const response = await api.put('/api/jobseeker/profile', formData);

  return response.data;
};

// Career status ("Open to Opportunities" etc.) — a small, focused JSON
// PUT separate from updateJobseekerProfile's multipart full-profile edit
// (see backend/controllers/jobseekerController.js's updateJobseekerStatus
// for why). `api`'s request interceptor attaches Authorization.
export const updateJobseekerCareerStatus = async (payload: {
  status: string;
  targetRoles: string[];
  preferredLocations: string[];
  employmentTypes: string[];
  visibility: string;
}) => {
  const response = await api.put('/api/jobseeker/profile/status', payload);
  return response.data as { message: string; profileStatus: ProfileStatus };
};

// Toggle save/unsave job
export const toggleSaveJob = async (jobId: string): Promise<{ message: string; saved: boolean }> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.patch(`/api/jobs/${jobId}/save`);

  return response.data;
};

// Fetch saved jobs
export const fetchSavedJobs = async (): Promise<Job[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.get('/api/jobs/saved-jobs');

  return response.data;
};

// Fetch applied jobs
export const fetchAppliedJobs = async (): Promise<Job[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.get('/api/jobseeker/applied-jobs');

  return response.data;
};

// Fetch dashboard stats
export const fetchDashboardStats = async (): Promise<{
  totalApplications: number;
  pending: number;
  reviewed: number;
  accepted: number;
  rejected: number;
}> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.get('/api/jobseeker/dashboard-stats');

  return response.data;
};

export type JobseekerNotification = {
  _id: string;
  message: string;
  createdAt: string;
  relatedJob?: string;
  relatedApplication?: string;
  relatedRevenue?: string;
};

export const getJobseekerNotifications = async (): Promise<JobseekerNotification[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await api.get<JobseekerNotification[]>('/api/notification/jobseeker');

  return response.data;
};