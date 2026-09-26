import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// Read the token fresh on every call instead of once at module load —
// this module is imported once and kept alive for the lifetime of the SPA
// session, so a module-level `const token = localStorage.getItem(...)`
// would silently freeze whatever token happened to be in localStorage the
// first time this module was imported. Any later login/logout/role change
// (e.g. logging out of one role and into an admin account without a full
// page reload) then keeps sending that stale-but-still-valid token, which
// passes `authenticate` but fails `authorizeAdmin` — a real, valid token
// for the wrong account, producing 403s that look like a permissions bug.
const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
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
    _id?: string;
    name: string;
    email?: string;
    companyLogo?: string;
  };
  country?: string;
  department?: string;
  workMode?: string;
  minExperience?: number;
  maxExperience?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: string;
  currency?: string;
  overview?: string;
  responsibilities?: string[];
  requirements?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  education?: string;
  benefits?: string[];
  perks?: string;
  workingHours?: string;
  companyOverride?: { name?: string; logo?: string; website?: string };
}

export const getAdminProfile = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/profile`, getAuthConfig());
  return res.data;
};

export const getAdminStats = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/admin-stats`, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/ai-usage/stats`, getAuthConfig());
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
  notifications?: {
    totalNotifications: number;
    unreadCount: number;
    growth: { date: string; count: number }[];
    byType: { type: string; count: number }[];
  };
  emails?: {
    totalEmails: number;
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    failureRate: string;
    growth: { date: string; count: number }[];
  };
  assessments?: {
    totalAssessments: number;
    totalAttempts: number;
    avgScorePercent: number;
    passRate: string;
    byStatus: { status: string; count: number }[];
    growth: { date: string; count: number }[];
  };
  interviews?: {
    totalInterviews: number;
    avgDuration: number;
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    growth: { date: string; count: number }[];
  };
}

export const getAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/analytics`, getAuthConfig());
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

  const res = await axios.get(`${API_BASE_URL}/api/admin/applications?${query.toString()}`, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/cms/blogs?${query.toString()}`, getAuthConfig());
  return res.data as { blogs: AdminBlog[]; total: number; page: number; totalPages: number };
};

export const toggleBlogPublish = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/cms/blogs/${id}/publish`, {}, getAuthConfig());
  return res.data;
};

export const adminDeleteBlog = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/blogs/${id}`, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/cms/faqs${all ? '?all=true' : ''}`, getAuthConfig());
  return res.data as Faq[];
};

export const createFaq = async (data: Partial<Faq>) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/faqs`, data, getAuthConfig());
  return res.data as Faq;
};

export const updateFaq = async (id: string, data: Partial<Faq>) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/faqs/${id}`, data, getAuthConfig());
  return res.data as Faq;
};

export const deleteFaq = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/faqs/${id}`, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/cms/career-tips${all ? '?all=true' : ''}`, getAuthConfig());
  return res.data as CareerTip[];
};

export const createCareerTip = async (data: Partial<CareerTip>) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/career-tips`, data, getAuthConfig());
  return res.data as CareerTip;
};

export const updateCareerTip = async (id: string, data: Partial<CareerTip>) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/career-tips/${id}`, data, getAuthConfig());
  return res.data as CareerTip;
};

export const deleteCareerTip = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/career-tips/${id}`, getAuthConfig());
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
  const res = await axios.post(`${API_BASE_URL}/api/cms/upload-image`, formData, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages/${slug}`, getAuthConfig());
  return res.data as CmsPage;
};

export const saveCmsPage = async (slug: string, data: { title: string; content: string }) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/pages/${slug}`, data, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages?${query.toString()}`, getAuthConfig());
  return res.data as { pages: CmsGenericPage[]; total: number; page: number; totalPages: number };
};

export const getCmsPageById = async (id: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages/id/${id}`, getAuthConfig());
  return res.data as CmsGenericPage;
};

export const createCmsGenericPage = async (data: { title: string; content: string; featuredImage?: string; status?: 'draft' | 'published' }) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/pages`, data, getAuthConfig());
  return res.data as CmsGenericPage;
};

export const updateCmsGenericPage = async (id: string, data: Partial<{ title: string; content: string; featuredImage: string; status: 'draft' | 'published'; shortDescription: string }>) => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/pages/id/${id}`, data, getAuthConfig());
  return res.data as CmsGenericPage;
};

export const toggleCmsPagePublish = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/cms/pages/id/${id}/publish`, {}, getAuthConfig());
  return res.data as { message: string; status: 'draft' | 'published' };
};

export const deleteCmsGenericPage = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/pages/id/${id}`, getAuthConfig());
  return res.data;
};

export interface PageRevision {
  revNumber: number;
  title: string;
  content: string;
  status: 'draft' | 'published';
  version: number;
  updatedBy: { _id: string; name: string; email: string; role: string } | null;
  updatedAt: string;
}

// Takes the page's Mongo _id (NOT its slug) — the backend route is id-based
// (`/api/cms/pages/id/:id/revisions`), so passing a slug like
// "privacy-policy" here 404s/500s with a Mongoose CastError.
export const getCmsPageRevisions = async (pageId: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages/id/${pageId}/revisions`, getAuthConfig());
  return (res.data as { revisions: PageRevision[] }).revisions;
};

export const restoreCmsPageRevision = async (pageId: string, revNumber: number) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/pages/id/${pageId}/revisions/${revNumber}/restore`, {}, getAuthConfig());
  return res.data as { message: string; page: CmsGenericPage };
};

// ---------------------------------------------------------------------------
// Legal & Policies — a policy is a CmsGenericPage (same Page model/collection)
// with `policyType` set. Get-by-id/update/publish-toggle/delete/revisions
// reuse the generic Pages functions above; only listing and creation (which
// need the policy-specific fields) get their own endpoints.
// ---------------------------------------------------------------------------

export type PolicyType =
  | 'privacy-policy'
  | 'terms-conditions'
  | 'community-guidelines'
  | 'job-seeker-rules'
  | 'job-provider-rules'
  | 'job-posting-guidelines'
  | 'prohibited-content'
  | 'refund-cancellation'
  | 'cookie-policy'
  | 'disclaimer'
  | 'code-of-conduct';

export interface PolicyTypeOption {
  value: PolicyType;
  label: string;
  defaultSlug: string;
}

export interface PolicyPage extends CmsGenericPage {
  policyType: PolicyType;
  shortDescription?: string;
  version: number;
  updatedBy: { _id: string; name: string; email: string; role: string } | null;
}

export const getPolicyTypes = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/policies/types`, getAuthConfig());
  return res.data as PolicyTypeOption[];
};

export const getPolicies = async (params: { page?: number; limit?: number; search?: string; policyType?: string; status?: string; sort?: 'newest' | 'oldest' }) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.policyType) query.set('policyType', params.policyType);
  if (params.status) query.set('status', params.status);
  if (params.sort) query.set('sort', params.sort);
  const res = await axios.get(`${API_BASE_URL}/api/cms/policies?${query.toString()}`, getAuthConfig());
  return res.data as { policies: PolicyPage[]; total: number; page: number; totalPages: number };
};

export const createPolicy = async (data: { policyType: PolicyType; title: string; content: string; shortDescription?: string; status?: 'draft' | 'published' }) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/policies`, data, getAuthConfig());
  return res.data as PolicyPage;
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

export interface HomepageSectionContent {
  key: string;
  badgeText: string;
  heading: string;
  highlightedText: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
}

export interface HomepageContentAdmin {
  isPublished: boolean;
  hero?: HomepageHeroContent;
  cta?: HomepageCtaContent;
  sections?: HomepageSectionContent[];
}

// A dedicated admin endpoint, not the public one (cmsPublicApi.ts's
// getHomepageContent) — the public GET always hides an unpublished draft
// (returns isPublished:false with no fields), which would make it
// impossible for the admin form to resume editing a draft or see what's
// live right after unpublishing.
export const getHomepageContentAdmin = async (): Promise<HomepageContentAdmin> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/homepage/admin`, getAuthConfig());
  return res.data;
};

export const saveHomepageContent = async (
  data: Partial<HomepageContentAdmin>
): Promise<HomepageContentAdmin> => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/homepage`, data, getAuthConfig());
  return res.data;
};

// ----- Homepage revisions — mirrors getCmsPageRevisions/restoreCmsPageRevision
// exactly, just pointed at the homepage singleton (no pageId needed). -----
export interface HomepageRevision {
  revNumber: number;
  version: number;
  isPublished: boolean;
  updatedBy: { _id: string; name: string; email: string; role: string } | null;
  updatedAt: string;
}

export const getHomepageRevisions = async (): Promise<HomepageRevision[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/homepage/revisions`, getAuthConfig());
  return (res.data as { revisions: HomepageRevision[] }).revisions;
};

export const restoreHomepageRevision = async (revNumber: number) => {
  const res = await axios.post(`${API_BASE_URL}/api/cms/homepage/revisions/${revNumber}/restore`, {}, getAuthConfig());
  return res.data;
};

// ---------------------------------------------------------------------------
// Generic sitewide key/value content — footer copy, misc microcopy, Resume
// Builder marketing/instructional headings. Superadmin write, public read
// (see frontend/src/api/siteContentApi.ts for the public whole-map fetch).
// ---------------------------------------------------------------------------
export interface SiteContentItem {
  _id: string;
  key: string;
  value: string;
  section: string;
  description: string;
  updatedAt: string;
}

export const adminListSiteContent = async (): Promise<SiteContentItem[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/site-content/admin`, getAuthConfig());
  return (res.data as { items: SiteContentItem[] }).items;
};

export const adminUpsertSiteContent = async (
  key: string,
  data: { value: string; section?: string; description?: string }
): Promise<SiteContentItem> => {
  const res = await axios.put(`${API_BASE_URL}/api/cms/site-content/${encodeURIComponent(key)}`, data, getAuthConfig());
  return res.data;
};

export const adminDeleteSiteContent = async (key: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/cms/site-content/${encodeURIComponent(key)}`, getAuthConfig());
  return res.data;
};


export const getDailyLoggedInUsers = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/daily-logins`, getAuthConfig());
  return res.data;
};

export const getAllJobStatsByDate = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/insights/all-job-stats`, getAuthConfig());
  return res.data;
};

export const getAllUsers = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/users`, getAuthConfig());
  return res.data;
};

export const updateUser = async (userId: string, data: FormData) => {
  const res = await axios.put(`${API_BASE_URL}/api/admin/user/${userId}`, data, getAuthConfig());
  return res.data;
};

export const deleteUser = async (userId: any) => {
  const res = await axios.delete(`${API_BASE_URL}/api/admin/user/${userId}`, getAuthConfig());
  return res.data;
};

// Roles & Permissions — superadmin only. Promotes a user to admin, or
// demotes an admin back down (see backend/controllers/adminController.js
// for the exact rules: superadmin accounts and self can't be touched here).
export const updateUserRole = async (userId: string, action: 'promote' | 'demote') => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/users/${userId}/role`,
    { action },
    getAuthConfig()
  );
  return res.data;
};

export const verifyEmployer = async (userId: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/verify-employer/${userId}`, {}, getAuthConfig());
  return res.data;
};

export const getAllApplicantsForEmployerJobs = async (employerId: string) => {
  const res = await axios.get(
    `${API_BASE_URL}/api/admin/employer/${employerId}/applicants`,
    getAuthConfig()
  );
  return res.data;
};


export const updateApplicationStatus = async (applicationId: string, status: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/applications/${applicationId}/status`,
    { status },
    getAuthConfig()
  );
  return res.data;
};


export const fetchJobs = async (page = 1, limit = 6, search = "", status = "all") => {
  const res = await axios.get(
    `${API_BASE_URL}/api/admin/jobs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`,
    getAuthConfig()
  );
  return res.data;
};


export const createAdminJob = async (jobData: any) => {
  const res = await axios.post(`${API_BASE_URL}/api/admin/jobs`, jobData, getAuthConfig());
  return res.data;
};

export const updateJobStatus = async (jobId: string, status: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/jobs/${jobId}/status`, { status }, getAuthConfig());
  return res.data;
};

export const updateJob = async (jobId: string, updatedData: any) => {
  const res = await axios.put(
    `${API_BASE_URL}/api/admin/job/${jobId}`,
    updatedData,
    getAuthConfig()
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
    getAuthConfig()
  );
  return res.data;
};

export const toggleTrendingStatus = async (jobId: string, istrending: boolean) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/jobs/${jobId}/trending`,
    { istrending },
    getAuthConfig()
  );
  return res.data;
};



export const deleteJob = async (jobId: any) => {
  const res = await axios.delete(`${API_BASE_URL}/api/admin/job/${jobId}`, getAuthConfig());
  return res.data;
};


export const fetchRevenues = () =>
  axios.get(`${API_BASE_URL}/api/revenue`, getAuthConfig()).then(res => res.data);

export const fetchEmployers = () =>
  axios.get(`${API_BASE_URL}/api/revenue/allemployers`, getAuthConfig()).then(res => res.data);

export const fetchJobsByEmployer = (employerId: string) =>
  axios.get(`${API_BASE_URL}/api/revenue/employer/${employerId}/jobs`, getAuthConfig()).then(res => res.data);

export const addRevenue = (payload: any) =>
  axios.post(`${API_BASE_URL}/api/revenue`, payload, getAuthConfig()).then(res => res.data);

export const updateRevenue = (id: string, payload: any) =>
  axios.put(`${API_BASE_URL}/api/revenue/${id}`, payload, getAuthConfig()).then(res => res.data);

export const deleteRevenue = (id: string) =>
  axios.delete(`${API_BASE_URL}/api/revenue/${id}`, getAuthConfig()).then(res => res.data);


export const approveJob = async (jobId: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/jobs/${jobId}/approve`, {}, getAuthConfig());
  return res.data;
};

export const rejectJob = async (jobId: string, reason: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/jobs/${jobId}/reject`, { reason }, getAuthConfig());
  return res.data;
};

// Job Category APIs
export const getJobCategories = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/jobcategories`);
  return res.data;
};

export const createJobCategory = async (formData: FormData) => {
  const res = await axios.post(`${API_BASE_URL}/api/jobcategories`, formData, getAuthConfig());
  return res.data;
};

export const updateJobCategory = async (id: string, formData: FormData) => {
  const res = await axios.put(`${API_BASE_URL}/api/jobcategories/${id}`, formData, getAuthConfig());
  return res.data;
};

export const deleteJobCategory = async (id: string, force = false) => {
  const res = await axios.delete(
    `${API_BASE_URL}/api/jobcategories/${id}${force ? '?force=true' : ''}`,
    getAuthConfig()
  );
  return res.data;
};

export const toggleJobCategoryTrending = async (id: string, isTrending: boolean) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/jobcategories/${id}/trending`,
    { isTrending },
    getAuthConfig()
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
    getAuthConfig()
  );
  return res.data;
};

export const verifyCompany = async (companyId: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/companies/${companyId}/verify`, {}, getAuthConfig());
  return res.data;
};

export const rejectCompany = async (companyId: string, reason: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/companies/${companyId}/reject`, { reason }, getAuthConfig());
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
    getAuthConfig()
  );
  return res.data;
};

export const replyToTicket = async (ticketId: string, reply: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/reply`,
    { reply },
    getAuthConfig()
  );
  return res.data;
};

export const updateTicketStatus = async (ticketId: string, status: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/support/admin/tickets/${ticketId}/status`,
    { status },
    getAuthConfig()
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

  const res = await axios.get(`${API_BASE_URL}/api/admin/audit-logs?${query.toString()}`, getAuthConfig());
  return res.data;
};

export interface AuditLogStats {
  totalLast24h: number;
  failuresLast24h: number;
  activeActorsLast24h: number;
  totalAllTime: number;
}

export const getAuditLogStats = async (): Promise<AuditLogStats> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/audit-logs/stats`, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/admin/security/overview`, getAuthConfig());
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
  const res = await axios.get(`${API_BASE_URL}/api/admin/security/locked-accounts`, getAuthConfig());
  return res.data;
};

export const unlockAccount = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/security/users/${id}/unlock`, {}, getAuthConfig());
  return res.data;
};

export const getRecentFailedLogins = async (limit = 25): Promise<{ events: AuditLogEntry[] }> => {
  const res = await axios.get(
    `${API_BASE_URL}/api/admin/security/failed-logins?limit=${limit}`,
    getAuthConfig()
  );
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Trending Jobs curation (superadmin only) — see backend/routes/trendingJobsRoutes.js
// ─────────────────────────────────────────────────────────────────────────

export type TrendingState = "active" | "scheduled" | "expired" | "unpublished";

export interface TrendingJob extends Job {
  trendingOrder: number;
  trendingStartDate?: string | null;
  trendingEndDate?: string | null;
  trendingState: TrendingState;
}

export interface EligibleJob {
  _id: string;
  title: string;
  location: string;
  jobtype: string;
  status: string;
  employer?: { name: string; companyLogo?: string };
}

const TRENDING_BASE = `${API_BASE_URL}/api/admin/trending-jobs`;

export const searchEligibleTrendingJobs = async (search = ""): Promise<{ jobs: EligibleJob[] }> => {
  const res = await axios.get(`${TRENDING_BASE}/eligible`, { ...getAuthConfig(), params: { search } });
  return res.data;
};

export const getTrendingJobsAdmin = async (): Promise<{ jobs: TrendingJob[] }> => {
  const res = await axios.get(TRENDING_BASE, getAuthConfig());
  return res.data;
};

export const addTrendingJob = async (
  jobId: string,
  data: { trendingOrder?: number; trendingStartDate?: string | null; trendingEndDate?: string | null }
) => {
  const res = await axios.post(`${TRENDING_BASE}/${jobId}`, data, getAuthConfig());
  return res.data;
};

export const updateTrendingJob = async (
  jobId: string,
  data: { trendingOrder?: number; trendingStartDate?: string | null; trendingEndDate?: string | null }
) => {
  const res = await axios.patch(`${TRENDING_BASE}/${jobId}`, data, getAuthConfig());
  return res.data;
};

export const removeTrendingJob = async (jobId: string) => {
  const res = await axios.delete(`${TRENDING_BASE}/${jobId}`, getAuthConfig());
  return res.data;
};

export const reorderTrendingJobs = async (order: { jobId: string; trendingOrder: number }[]) => {
  const res = await axios.patch(`${TRENDING_BASE}/reorder`, { order }, getAuthConfig());
  return res.data;
};

export const getTrendingSettings = async (): Promise<{ maxDisplayCount: number }> => {
  const res = await axios.get(`${TRENDING_BASE}/settings`, getAuthConfig());
  return res.data;
};

export const updateTrendingSettings = async (maxDisplayCount: number) => {
  const res = await axios.put(`${TRENDING_BASE}/settings`, { maxDisplayCount }, getAuthConfig());
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Super Admin Extended Endpoints (Reports, Users, Jobs, Community, Blogs)
// ─────────────────────────────────────────────────────────────────────────

export interface ReportItem {
  _id: string;
  targetType: 'user' | 'job' | 'post' | 'comment' | 'blog';
  targetId: string;
  reporter: {
    _id: string;
    name: string;
    email: string;
    profilePic?: string;
    role?: string;
  };
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  targetPreview?: any;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  resolvedAt?: string;
  adminNotes?: string;
  adminAction?: 'none' | 'removed_content' | 'suspended_user' | 'warned_user' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export const getAllReports = async (params?: {
  targetType?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await axios.get(`${API_BASE_URL}/api/reports`, { ...getAuthConfig(), params });
  return res.data as { reports: ReportItem[]; total: number; page: number; totalPages: number };
};

export const getReportStats = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/reports/stats`, getAuthConfig());
  return res.data as {
    total: number;
    pending: number;
    resolved: number;
    dismissed: number;
    byType: Record<string, { total: number; pending: number }>;
  };
};

export const resolveReport = async (
  reportId: string,
  data: {
    action: 'none' | 'removed_content' | 'suspended_user' | 'warned_user' | 'dismissed';
    status?: 'reviewed' | 'resolved' | 'dismissed';
    adminNotes?: string;
  }
) => {
  const res = await axios.patch(`${API_BASE_URL}/api/reports/${reportId}/action`, data, getAuthConfig());
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Newsletter (CMS Newsletter tab)
// ─────────────────────────────────────────────────────────────────────────

export const getNewsletterStats = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/newsletter/stats`, getAuthConfig());
  return res.data as { total: number; active: number };
};

export const sendNewsletterBroadcast = async (data: { subject: string; message: string }) => {
  const res = await axios.post(`${API_BASE_URL}/api/newsletter/broadcast`, data, getAuthConfig());
  return res.data as { message: string; sent: number; failed: number; total: number };
};

export const updateUserStatus = async (
  userId: string,
  status: 'active' | 'deactivated' | 'suspended',
  reason?: string
) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/users/${userId}/status`,
    { status, reason },
    getAuthConfig()
  );
  return res.data;
};

export const getUserDetailsAdmin = async (userId: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/users/${userId}/details`, getAuthConfig());
  return res.data;
};

export const bulkJobAction = async (action: string, jobIds: string[]) => {
  const res = await axios.post(
    `${API_BASE_URL}/api/admin/jobs/bulk-action`,
    { action, jobIds },
    getAuthConfig()
  );
  return res.data;
};

export const updateAdminJobStatus = async (jobId: string, status: string, istrending?: boolean) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/jobs/${jobId}/status`,
    { status, istrending },
    getAuthConfig()
  );
  return res.data;
};

export const getAllCommunityPostsAdmin = async (params?: {
  status?: string;
  type?: string;
  search?: string;
  author?: string;
  sort?: 'newest' | 'oldest' | 'most-reacted' | 'most-commented';
  page?: number;
  limit?: number;
}) => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/community/posts`, { ...getAuthConfig(), params });
  return res.data;
};

export interface CommunityPostDetail {
  post: any;
  reactions: Record<string, number>;
  comments: any[];
  commentTotal: number;
  commentLimit: number;
  reports: any[];
}

// Backs the "Manage" action (view full post + reactions + comments +
// reports) — previously this button didn't exist at all in the Community
// Moderation Hub / Reports Hub, just an unused Eye icon import.
export const getCommunityPostDetailAdmin = async (postId: string): Promise<CommunityPostDetail> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/community/posts/${postId}`, getAuthConfig());
  return res.data;
};

export const updateCommunityPostStatusAdmin = async (
  postId: string,
  action: 'approve' | 'flag' | 'delete' | 'restore',
  reason?: string
) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/community/posts/${postId}/status`,
    { action, reason },
    getAuthConfig()
  );
  return res.data;
};

export const getAllCommunityCommentsAdmin = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/community/comments`, { ...getAuthConfig(), params });
  return res.data;
};

export const deleteCommunityCommentAdmin = async (commentId: string, notes?: string) => {
  const res = await axios.delete(
    `${API_BASE_URL}/api/admin/community/comments/${commentId}`,
    { ...getAuthConfig(), data: { notes } }
  );
  return res.data;
};

export const getAllBlogsAdmin = async (params?: {
  status?: 'all' | 'published' | 'drafts';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/blogs`, { ...getAuthConfig(), params });
  return res.data;
};

export const updateBlogStatusAdmin = async (blogId: string, isPublished: boolean) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/blogs/${blogId}/publish`,
    { isPublished },
    getAuthConfig()
  );
  return res.data;
};

export const createBlogAdmin = async (blogData: any) => {
  const res = await axios.post(`${API_BASE_URL}/api/blogs`, blogData, getAuthConfig());
  return res.data;
};

export const updateBlogAdmin = async (blogId: string, blogData: any) => {
  const res = await axios.put(`${API_BASE_URL}/api/blogs/${blogId}`, blogData, getAuthConfig());
  return res.data;
};

export const deleteBlogAdmin = async (blogId: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/blogs/${blogId}`, getAuthConfig());
  return res.data;
};

export const uploadBlogImageAdmin = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post(`${API_BASE_URL}/api/blogs/upload-image`, formData, {
    headers: {
      ...(getAuthConfig().headers || {}),
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const updateCompanyAdmin = async (companyId: string, data: any) => {
  const res = await axios.put(`${API_BASE_URL}/api/admin/companies/${companyId}`, data, getAuthConfig());
  return res.data;
};

export const toggleCompanySuspendAdmin = async (companyId: string, isSuspended: boolean, suspensionReason?: string) => {
  const res = await axios.patch(
    `${API_BASE_URL}/api/admin/companies/${companyId}/suspend`,
    { isSuspended, suspensionReason },
    getAuthConfig()
  );
  return res.data;
};

// ---------------------------------------------------------------------------
// Email delivery log — view + retry a failed transactional send. See
// backend/controllers/emailLogController.js.
// ---------------------------------------------------------------------------

export interface EmailLogEntry {
  _id: string;
  recipientEmail: string;
  recipientUser?: string;
  type: string;
  subject: string;
  relatedJob?: string;
  relatedApplication?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  failureReason?: string;
  attempts: number;
  sentAt?: string;
  createdAt: string;
}

export interface EmailLogsResponse {
  logs: EmailLogEntry[];
  currentPage: number;
  totalPages: number;
  totalLogs: number;
  perPage: number;
}

export const getEmailLogs = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<EmailLogsResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  const res = await axios.get(`${API_BASE_URL}/api/admin/email-logs?${query.toString()}`, getAuthConfig());
  return res.data;
};

export const getEmailLogById = async (id: string): Promise<EmailLogEntry & { textBody?: string; htmlBody?: string }> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/email-logs/${id}`, getAuthConfig());
  return res.data;
};

export const retryEmailLog = async (id: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/admin/email-logs/${id}/retry`, {}, getAuthConfig());
  return res.data;
};

// ---------------------------------------------------------------------------
// Notification targeting config (spec section 2) — Super Admin toggle for
// employerController.createJob's jobseeker-notification fan-out mode.
// ---------------------------------------------------------------------------

export interface NotificationSettings {
  jobAlertMode: 'matching' | 'following' | 'all';
  updatedBy?: string;
  updatedAt?: string;
}

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/notification-settings`, getAuthConfig());
  return res.data;
};

export const updateNotificationSettings = async (jobAlertMode: NotificationSettings['jobAlertMode']) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/notification-settings`, { jobAlertMode }, getAuthConfig());
  return res.data;
};