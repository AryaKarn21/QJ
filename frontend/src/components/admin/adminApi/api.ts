import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-server.rupeshkumar.com.np';

const token = localStorage.getItem("token");

const authHeader = {
  headers: {
    Authorization: `Bearer ${token}`,
  },
};

export interface JobCategory {
  _id: string;
  name: string;
  icon: string;
  isTrending: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  deadline: Date | string;
  location: string;
  jobtype: string;
  salary: string;
  experience: string;
  level: string;
  jobcategory: string;
  openings: number;
  istrending: boolean;
  status: string;
  createdAt?: string;
  views?: { ip: string; date: string; _id: string }[];
  jobseekers?: string[];
  likes?: string[];
  dislikes?: string[];
  employer: {
    name: string;
    email?: string;
    companyLogo?: string;
  };
}

export const getAdminProfile = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/profile`, authHeader);
  return res.data;
};

export const getAdminStats = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/admin-stats`, authHeader);
  return res.data;
};

export interface AiUsageStats {
  totalResumeBuilds: number;
  buildsLast30Days: number;
  byTemplate: { templateId: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
  recentBuilds: {
    templateId: string;
    templateName?: string;
    action: string;
    createdAt: string;
  }[];
}

// Mounted separately at /api/ai-usage (not under /api/admin) — see backend/server.js.
export const getAiUsageStats = async (): Promise<AiUsageStats> => {
  const res = await axios.get(`${API_BASE_URL}/api/ai-usage/stats`, authHeader);
  return res.data;
};

export interface AnalyticsOverview {
  users: {
    totalJobseekers: number;
    totalEmployers: number;
    growth: { date: string; jobseeker: number; employer: number }[];
  };
  jobs: {
    totalJobs: number;
    growth: { date: string; count: number }[];
    byStatus: { status: string; count: number }[];
    topCategories: { category: string; count: number }[];
  };
  revenue: {
    totalRevenue: number;
    monthlyTrend: { month: string; total: number }[];
    topEmployers: { name: string; total: number }[];
  };
  devices: {
    total: number;
    breakdown: { device: string; count: number }[];
  };
}

export const getAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/analytics`, authHeader);
  return res.data;
};

export interface AdminApplication {
  _id: string;
  status: 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected';
  coverLetter: string;
  resume: string;
  howDidYouHear?: string;
  createdAt: string;
  applicant: {
    _id: string;
    name: string;
    email: string;
    profilePic?: string;
  } | null;
  job: {
    _id: string;
    title: string;
    employer?: {
      _id: string;
      name: string;
      companyLogo?: string;
    };
  } | null;
}

export interface AdminApplicationsResponse {
  applications: AdminApplication[];
  total: number;
  page: number;
  totalPages: number;
  statusCounts: { Pending: number; Reviewed: number; Accepted: number; Rejected: number };
}

export const getAllApplications = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<AdminApplicationsResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const res = await axios.get(`${API_BASE_URL}/api/admin/applications?${query.toString()}`, authHeader);
  return res.data;
};

// ---------------------------------------------------------------------------
// CMS — Blog moderation, FAQs, Career Tips, Legal pages
// Mounted separately at /api/cms (not under /api/admin) — see backend/server.js.
// ---------------------------------------------------------------------------

export interface AdminBlog {
  _id: string;
  title: string;
  content: string;
  isPublished: boolean;
  isAIGenerated: boolean;
  createdAt: string;
  author: { _id: string; name: string; email: string; role: string } | null;
}

export const getAdminBlogs = async (params: { page?: number; limit?: number; search?: string }) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  const res = await axios.get(`${API_BASE_URL}/api/cms/blogs?${query.toString()}`, authHeader);
  return res.data as { blogs: AdminBlog[]; total: number; page: number; totalPages: number };
};

export const toggleBlogPublish = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/cms/blogs/${id}/publish`, {}, authHeader);
  return res.data;
};

export const adminDeleteBlog = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/blogs/${id}`, authHeader);
  return res.data;
};

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  audience: 'all' | 'jobseeker' | 'employer';
  order: number;
  isActive: boolean;
}

export const getFaqs = async (all = true) => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/faqs${all ? '?all=true' : ''}`, authHeader);
  return res.data as Faq[];
};

export const createFaq = async (data: Partial<Faq>) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/faqs`, data, authHeader);
  return res.data as Faq;
};

export const updateFaq = async (id: string, data: Partial<Faq>) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/faqs/${id}`, data, authHeader);
  return res.data as Faq;
};

export const deleteFaq = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/faqs/${id}`, authHeader);
  return res.data;
};

export interface CareerTip {
  _id: string;
  title: string;
  content: string;
  category: string;
  order: number;
  isActive: boolean;
}

export const getCareerTips = async (all = true) => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/career-tips${all ? '?all=true' : ''}`, authHeader);
  return res.data as CareerTip[];
};

export const createCareerTip = async (data: Partial<CareerTip>) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/career-tips`, data, authHeader);
  return res.data as CareerTip;
};

export const updateCareerTip = async (id: string, data: Partial<CareerTip>) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/career-tips/${id}`, data, authHeader);
  return res.data as CareerTip;
};

export const deleteCareerTip = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/career-tips/${id}`, authHeader);
  return res.data;
};

// Shared by every rich-text field in the CMS hub (Pages, Career Tips,
// Legal) for the toolbar's "attachment" (image) button — see CmsHub.tsx's
// RichTextEditor component. The backend returns a path relative to its own
// origin (e.g. "/uploads/cms/xxx.jpg"); everywhere else in this app that's
// resolved at *render* time against a structured field (icon, resume…),
// but a rich-text <img> tag gets baked verbatim into the saved HTML with
// no later render-time rewrite step, so it has to be made absolute here,
// at upload time, or it would 404 on any page served from a different
// origin than the API.
export const uploadCmsImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  // No explicit Content-Type: setting 'multipart/form-data' by hand
  // strips the `boundary=...` parameter the browser would otherwise
  // generate, which makes busboy/multer throw "Multipart: Boundary not
  // found" — an uncaught error the backend's generic handler turns into
  // an opaque 500 (this is what was breaking every FormData upload in
  // this file: uploadCmsImage, updateUser, createJobCategory,
  // updateJobCategory).
  const res = await axios.post(`${API_BASE_URL}/api/cms/upload-image`, formData, authHeader);
  const relativeUrl = (res.data as { url: string }).url;
  return { url: `${API_BASE_URL}${relativeUrl}` };
};

export interface CmsPage {
  slug: string;
  title: string;
  content: string;
  isDraftPlaceholder?: boolean;
}

export const getCmsPage = async (slug: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages/${slug}`, authHeader);
  return res.data as CmsPage;
};

export const saveCmsPage = async (slug: string, data: { title: string; content: string }) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/pages/${slug}`, data, authHeader);
  return res.data as CmsPage;
};

// ---------------------------------------------------------------------------
// Generic CMS Pages — arbitrary admin-authored pages (distinct from the
// three fixed legal-page slugs above, which use CmsPage/getCmsPage/
// saveCmsPage and are untouched by this).
// ---------------------------------------------------------------------------

export interface CmsGenericPage {
  _id: string;
  slug: string;
  title: string;
  content: string;
  featuredImage?: string;
  status: 'draft' | 'published';
  author: { _id: string; name: string; email: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const getCmsPages = async (params: { page?: number; limit?: number; search?: string }) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages?${query.toString()}`, authHeader);
  return res.data as { pages: CmsGenericPage[]; total: number; page: number; totalPages: number };
};

export const getCmsPageById = async (id: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages/id/${id}`, authHeader);
  return res.data as CmsGenericPage;
};

export const createCmsGenericPage = async (data: { title: string; content: string; featuredImage?: string; status?: 'draft' | 'published' }) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/pages`, data, authHeader);
  return res.data as CmsGenericPage;
};

export const updateCmsGenericPage = async (id: string, data: Partial<{ title: string; content: string; featuredImage: string; status: 'draft' | 'published' }>) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/pages/id/${id}`, data, authHeader);
  return res.data as CmsGenericPage;
};

export const toggleCmsPagePublish = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/cms/pages/id/${id}/publish`, {}, authHeader);
  return res.data as { message: string; status: 'draft' | 'published' };
};

export const deleteCmsGenericPage = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/pages/id/${id}`, authHeader);
  return res.data;
};

export interface HomepageHeroContent {
  badgeText: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  popularSearches: string[];
}

export interface HomepageCtaContent {
  badgeText: string;
  heading: string;
  headingAccent: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

export interface HomepageContentAdmin {
  isPublished: boolean;
  hero?: HomepageHeroContent;
  cta?: HomepageCtaContent;
}

// A dedicated admin endpoint, not the public one (cmsPublicApi.ts's
// getHomepageContent) — the public GET always hides an unpublished draft
// (returns isPublished:false with no fields), which would make it
// impossible for the admin form to resume editing a draft or see what's
// live right after unpublishing.
export const getHomepageContentAdmin = async (): Promise<HomepageContentAdmin> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/homepage/admin`, authHeader);
  return res.data;
};

export const saveHomepageContent = async (
  data: Partial<HomepageContentAdmin>
): Promise<HomepageContentAdmin> => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/homepage`, data, authHeader);
  return res.data;
};


export const getDailyLoggedInUsers = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/daily-logins`, authHeader);
  return res.data;
};

export const getAllJobStatsByDate = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/insights/all-job-stats`, authHeader);
  return res.data;
};

export const getAllUsers = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/users`, authHeader);
  return res.data;
};

export const updateUser = async (userId: string, data: FormData) => {
  const res = await axios.put(`${API_BASE_URL}/api/admin/user/${userId}`, data, authHeader);
  return res.data;
};

export const deleteUser = async (userId: any) => {
  const res = await axios.delete(`${API_BASE_URL}/api/admin/user/${userId}`, authHeader);
  return res.data;
};

// Roles & Permissions — superadmin only. Promotes a user to admin, or
// demotes an admin back down (see backend/controllers/adminController.js
// for the exact rules: superadmin accounts and self can't be touched here).
export const updateUserRole = async (userId: string, action: 'promote' | 'demote') => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/users/${userId}/role`,
    { action },
    authHeader
  );
  return res.data;
};

export const verifyEmployer = async (userId: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/verify-employer/${userId}`, {}, authHeader);
  return res.data;
};

export const getAllApplicantsForEmployerJobs = async (employerId: string) => {
  const res = await axios.get(
    `${API_BASE_URL}/api/admin/employer/${employerId}/applicants`,
    authHeader
  );
  return res.data;
};


export const updateApplicationStatus = async (applicationId: string, status: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/applications/${applicationId}/status`,
    { status },
    authHeader
  );
  return res.data;
};


export const fetchJobs = async (page = 1, limit = 6, search = "", status = "all") => {
  const res = await axios.get(
    `${API_BASE_URL}/api/admin/jobs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`,
    authHeader
  );
  return res.data;
};


export const updateJob = async (jobId: string, updatedData: Partial<Job>) => {
  const res = await axios.put(
    `${API_BASE_URL}/api/admin/job/${jobId}`,
    updatedData,
    authHeader
  );
  return res.data;
};


export const makeAnnouncement = async (data: {
  message: string;
  targetRole: "all" | "jobseeker" | "employer";
}) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/notification/announcement`,
    data,
    authHeader
  );
  return res.data;
};

export const toggleTrendingStatus = async (jobId: string, istrending: boolean) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/jobs/${jobId}/trending`,
    { istrending },
    authHeader
  );
  return res.data;
};



export const deleteJob = async (jobId: any) => {
  const res = await axios.delete(`${API_BASE_URL}/api/admin/job/${jobId}`, authHeader);
  return res.data;
};


export const fetchRevenues = () =>
  axios.get(`${API_BASE_URL}/api/revenue`, authHeader).then(res => res.data);

export const fetchEmployers = () =>
  axios.get(`${API_BASE_URL}/api/revenue/allemployers`, authHeader).then(res => res.data);

export const fetchJobsByEmployer = (employerId: string) =>
  axios.get(`${API_BASE_URL}/api/revenue/employer/${employerId}/jobs`, authHeader).then(res => res.data);

export const addRevenue = (payload: any) =>
  axios.post(`${API_BASE_URL}/api/revenue`, payload, authHeader).then(res => res.data);

export const updateRevenue = (id: string, payload: any) =>
  axios.put(`${API_BASE_URL}/api/revenue/${id}`, payload, authHeader).then(res => res.data);

export const deleteRevenue = (id: string) =>
  axios.delete(`${API_BASE_URL}/api/revenue/${id}`, authHeader).then(res => res.data);


export const approveJob = async (jobId: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/jobs/${jobId}/approve`, {}, authHeader);
  return res.data;
};

export const rejectJob = async (jobId: string, reason: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/jobs/${jobId}/reject`, { reason }, authHeader);
  return res.data;
};

// Job Category APIs
export const getJobCategories = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/jobcategories`);
  return res.data;
};

export const createJobCategory = async (formData: FormData) => {
  const res = await axios.post(`${API_BASE_URL}/api/jobcategories`, formData, authHeader);
  return res.data;
};

export const updateJobCategory = async (id: string, formData: FormData) => {
  const res = await axios.put(`${API_BASE_URL}/api/jobcategories/${id}`, formData, authHeader);
  return res.data;
};

export const deleteJobCategory = async (id: string, force = false) => {
  const res = await axios.delete(
    `${API_BASE_URL}/api/jobcategories/${id}${force ? '?force=true' : ''}`,
    authHeader
  );
  return res.data;
};

export const toggleJobCategoryTrending = async (id: string, isTrending: boolean) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/jobcategories/${id}/trending`,
    { isTrending },
    authHeader
  );
  return res.data;
};

export const getTrendingCategories = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/jobcategories/trending/all`);
  return res.data;
};

export interface Company {
  _id: string;
  name: string;
  email: string;
  companyLogo?: string;
  panNumber?: string;
  establishedDate?: string;
  industryType?: string;
  companySize?: string;
  address?: string;
  telephone?: string;
  description?: string;
  verificationStatus: string;
  verificationNote?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export const getAllCompanies = async (page = 1, limit = 10, search = "") => {
  const res = await axios.get(
    `${API_BASE_URL}/api/admin/companies?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
    authHeader
  );
  return res.data;
};

export const verifyCompany = async (companyId: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/companies/${companyId}/verify`, {}, authHeader);
  return res.data;
};

export const rejectCompany = async (companyId: string, reason: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/companies/${companyId}/reject`, { reason }, authHeader);
  return res.data;
};

export interface SupportTicket {
  _id: string;
  user?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface TicketsResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  totalPages: number;
}

export const getAllTickets = async (
  page = 1,
  limit = 15,
  status = 'all',
  category = 'all',
  search = ''
): Promise<TicketsResponse> => {
  const res = await axios.get(
    `${API_BASE_URL}/api/support/admin/tickets?page=${page}&limit=${limit}&status=${status}&category=${category}&search=${encodeURIComponent(search)}`,
    authHeader
  );
  return res.data;
};

export const replyToTicket = async (ticketId: string, reply: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/reply`,
    { reply },
    authHeader
  );
  return res.data;
};

export const updateTicketStatus = async (ticketId: string, status: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/status`,
    { status },
    authHeader
  );
  return res.data;
};

// ---------------------------------------------------------------------------
// Audit Logs — superadmin only. Records every mutating request across the
// whole platform, plus hand-written entries for auth events (see
// backend/utils/auditLogger.js).
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  _id: string;
  actor?: { id: string; name?: string; email?: string; role?: string };
  module?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  method?: string;
  path?: string;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  statusCode?: number;
  success: boolean;
  ip?: string;
  userAgent?: string;
  durationMs?: number;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
  modules: string[];
}

export const getAuditLogs = async (params: {
  page?: number;
  limit?: number;
  module?: string;
  success?: 'true' | 'false';
  search?: string;
}): Promise<AuditLogsResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.module) query.set('module', params.module);
  if (params.success) query.set('success', params.success);
  if (params.search) query.set('search', params.search);

  const res = await axios.get(`${API_BASE_URL}/api/admin/audit-logs?${query.toString()}`, authHeader);
  return res.data;
};

export interface AuditLogStats {
  totalLast24h: number;
  failuresLast24h: number;
  activeActorsLast24h: number;
  totalAllTime: number;
}

export const getAuditLogStats = async (): Promise<AuditLogStats> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/audit-logs/stats`, authHeader);
  return res.data;
};

// ---------------------------------------------------------------------------
// Security — superadmin only. Locked accounts, recent failed logins, and
// manual unlock. Backed by User.failedLoginAttempts/lockUntil and the
// "auth.*" audit events (see backend/controllers/securityController.js).
// ---------------------------------------------------------------------------

export interface SecurityOverview {
  lockedAccounts: number;
  deactivatedAccounts: number;
  adminCount: number;
  failedLogins24h: number;
}

export const getSecurityOverview = async (): Promise<SecurityOverview> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/security/overview`, authHeader);
  return res.data;
};

export interface LockedAccount {
  _id: string;
  name?: string;
  email: string;
  role: string;
  failedLoginAttempts: number;
  lockUntil: string;
  lastLoginIP?: string;
}

export const getLockedAccounts = async (): Promise<{ accounts: LockedAccount[] }> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/security/locked-accounts`, authHeader);
  return res.data;
};

export const unlockAccount = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/security/users/${id}/unlock`, {}, authHeader);
  return res.data;
};

export const getRecentFailedLogins = async (limit = 25): Promise<{ events: AuditLogEntry[] }> => {
  const res = await axios.get(
    `${API_BASE_URL}/api/admin/security/failed-logins?limit=${limit}`,
    authHeader
  );
  return res.data;
};