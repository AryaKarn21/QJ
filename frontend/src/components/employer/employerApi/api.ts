import axios from "axios";
import type { ProfileStatus } from "../../../types/profileStatus";

// Matches the backend's actual default port (server.js: PORT || 3000) and
// every other API file in this app — this previously fell back to a
// production URL instead of localhost:3000, so any local dev environment
// missing VITE_API_BASE_URL silently hit production instead of the local
// backend. Flagged repeatedly during the earlier production-hardening
// pass; fixing it now while already in this exact file.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// The same list models/Job.js validates `country` against — see
// backend/data/countries.js. Public, unauthenticated (it's just a lookup
// list, same as fetchJobCategories).
export const fetchCountries = async (): Promise<string[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/jobs/meta/countries`);
  return res.data;
};

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export interface CurrencyListResponse {
  currencies: CurrencyOption[];
  countryDefaults: Record<string, string>;
}

// The same list models/Job.js's `currency` field is formatted against —
// see backend/data/currencies.js. Public, unauthenticated, same as
// fetchCountries above.
export const fetchCurrencies = async (): Promise<CurrencyListResponse> => {
  const res = await axios.get(`${API_BASE_URL}/api/jobs/meta/currencies`);
  return res.data;
};

export const createJob = async (jobData: any) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await axios.post(
    `${API_BASE_URL}/api/employer/jobs`,
    jobData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
};

export const patchJob = async (jobId: string, updatedFields: Partial<any>) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.patch(
    `${API_BASE_URL}/api/employer/jobs/${jobId}`,
    updatedFields,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
};


export const getSingleJob = async (jobId: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.get(`${API_BASE_URL}/api/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const editJob = async (jobId: string, updatedData: any) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.put(
    `${API_BASE_URL}/api/employer/jobs/${jobId}`,
    updatedData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
};


export const deleteJob = async (jobId: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.delete(
    `${API_BASE_URL}/api/employer/jobs/${jobId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const getEmployerProfile = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.get(`${API_BASE_URL}/api/employer/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const updateEmployerProfile = async (formData: FormData) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  // No explicit Content-Type — see authApi.ts's registerEmployer for why a
  // hand-set 'multipart/form-data' (no boundary) breaks the upload.
  const res = await axios.put(`${API_BASE_URL}/api/employer/profile`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

// Hiring status ("Actively Hiring" etc.) — a small, focused JSON PUT
// separate from updateEmployerProfile's multipart full-profile edit (see
// backend/controllers/employerController.js's updateEmployerHiringStatus
// for why).
export const updateEmployerHiringStatusApi = async (payload: {
  status: string;
  targetRoles: string[];
  preferredLocations: string[];
  employmentTypes: string[];
  visibility: string;
}) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.put(`${API_BASE_URL}/api/employer/profile/status`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data as { message: string; profileStatus: ProfileStatus };
};

export const getEmployerJobs = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.get(`${API_BASE_URL}/api/employer/my-jobs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const getEmployerDashboardStats = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.get(`${API_BASE_URL}/api/employer/dashboard-stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const updateNotificationPreferences = async (prefs: {
  allNotifications?: boolean;
  newApplications?: boolean;
}) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.patch(
    `${API_BASE_URL}/api/employer/notification-preferences`,
    prefs,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
};

export const deactivateEmployerAccount = async (password: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.post(
    `${API_BASE_URL}/api/employer/deactivate`,
    { password },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data;
};
export const getJobApplicants = async (jobId: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.get(
    `${API_BASE_URL}/api/employer/jobs/${jobId}/jobseekers`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};



export interface ApplicationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  jobId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface EmployerApplication {
  applicationId: string;
  applicant: { _id: string; name: string; email: string; profilePic?: string; skills?: string[]; qualifications?: { degree: string; institution: string; year?: number }[]; experiences?: { jobPosition: string; institution: string; duration: string }[] } | null;
  job: { _id: string; title: string } | null;
  coverLetter: string;
  resume: string;
  howDidYouHear?: string;
  status: "Pending" | "Reviewed" | "Interview Scheduled" | "Accepted" | "Rejected";
  interview?: { scheduledAt?: string; mode?: string; meetingLink?: string; location?: string; notes?: string };
  appliedAt: string;
}

export interface ApplicationListResponse {
  applications: EmployerApplication[];
  currentPage: number;
  totalPages: number;
  totalApplications: number;
  perPage: number;
  statusCounts: Record<string, number>;
}

export const getAllApplicantsForEmployerJobs = async (
  params: ApplicationListParams = {}
): Promise<ApplicationListResponse> => {
  
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.jobId) query.set("jobId", params.jobId);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);

  const res = await axios.get(`${API_BASE_URL}/api/employer/my-jobs/applications?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};



export const updateApplicationStatus = async (
  applicationId: string,
  newStatus: string,
  interview?: { scheduledAt: string; mode?: string; meetingLink?: string; location?: string; notes?: string }
) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.patch(
    `${API_BASE_URL}/api/employer/applications/${applicationId}/status`,
    { status: newStatus, interview },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const getCandidates = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  const res = await axios.get(`${API_BASE_URL}/api/employer/candidates`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.candidates;
};

export const getSavedCandidates = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  const res = await axios.get(`${API_BASE_URL}/api/employer/candidates/saved`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.candidates;
};

export const toggleSavedCandidate = async (candidateId: string, jobId?: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  const res = await axios.post(
    `${API_BASE_URL}/api/employer/candidates/${candidateId}/save`,
    { jobId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.saved as boolean;
};

export const getScheduledInterviews = async () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  const res = await axios.get(`${API_BASE_URL}/api/employer/interviews`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.interviews;
};

export const getAllApplicantsForEmployer = async (page = 1, limit = 5) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.get(
    `${API_BASE_URL}/api/employer/my-jobs/applicants?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const getAllApplicants = async (page = 1, limit = 5) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await axios.get(
    `${API_BASE_URL}/api/employer/my-jobs/applicants?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};




export type EmployerNotification = {
  _id: string;
  message: string;
  createdAt: string;
  relatedJob?: string;
  relatedApplication?: string;
  relatedRevenue?: string;
};

export const getEmployerNotifications = async (): Promise<EmployerNotification[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await axios.get(
    `${API_BASE_URL}/api/notification/employer`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};