import axios from 'axios';
import type { CommunityPost, FeedFilter, PostType, PostTopic } from '../types/community';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Same "read the token fresh on every call" pattern as api/supportApi.ts.
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface FeedPage {
  posts: CommunityPost[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreatePostInput {
  type: PostType;
  content: string;
  topics?: PostTopic[];
  visibility?: 'public' | 'followers' | 'connections' | 'private';
  company?: string;
  files?: File[];
  pollData?: { options: string[]; allowMultiple?: boolean; expiresAt?: string };
  jobData?: { title: string; companyName?: string; location?: string; jobType?: string; salary?: string; applyUrl?: string; job?: string };
  hiringData?: { roles: string[]; openings?: number; location?: string; urgency?: 'normal' | 'urgent'; applyUrl?: string; contactEmail?: string };
}

function buildPostFormData(input: CreatePostInput): FormData {
  const form = new FormData();
  form.append('type', input.type);
  form.append('content', input.content);
  if (input.visibility) form.append('visibility', input.visibility);
  if (input.company) form.append('company', input.company);
  if (input.topics?.length) form.append('topics', JSON.stringify(input.topics));
  if (input.pollData) form.append('pollData', JSON.stringify(input.pollData));
  if (input.jobData) form.append('jobData', JSON.stringify(input.jobData));
  if (input.hiringData) form.append('hiringData', JSON.stringify(input.hiringData));
  (input.files || []).forEach((file) => form.append('media', file));
  return form;
}

export const createPost = async (input: CreatePostInput) => {
  const form = buildPostFormData(input);
  const res = await axios.post(`${API_BASE_URL}/api/community/posts`, form, {
    ...getAuthHeader(),
    // Deliberately no explicit Content-Type — see advertisementApi.ts's
    // toFormData call sites for why hand-setting 'multipart/form-data'
    // breaks the upload (busboy/multer needs the boundary the browser
    // computes automatically, which an explicit header suppresses).
  });
  return res.data as { message: string; post: CommunityPost; hiringIntentDetected: boolean };
};

export const fetchFeed = async (filter: FeedFilter, page = 1, limit = 10): Promise<FeedPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/posts/feed`, {
    ...getAuthHeader(),
    params: { filter, page, limit },
  });
  return res.data;
};

export const fetchCompanyFeed = async (companyId: string, filter: FeedFilter = 'latest', page = 1): Promise<FeedPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/posts/feed/company/${companyId}`, {
    ...getAuthHeader(),
    params: { filter, page },
  });
  return res.data;
};

export const fetchUserFeed = async (userId: string, page = 1): Promise<FeedPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/posts/feed/user/${userId}`, {
    ...getAuthHeader(),
    params: { page },
  });
  return res.data;
};

export const fetchHashtagFeed = async (tag: string, page = 1): Promise<FeedPage & { tag: string }> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/posts/hashtags/${encodeURIComponent(tag)}`, {
    ...getAuthHeader(),
    params: { page },
  });
  return res.data;
};

export const fetchTrendingHashtags = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/community/posts/hashtags/trending`);
  return res.data.hashtags as { tag: string; postCount: number }[];
};

export const fetchMyBookmarks = async (page = 1): Promise<FeedPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/posts/bookmarks`, { ...getAuthHeader(), params: { page } });
  return res.data;
};

export const fetchPostById = async (postId: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/community/posts/${postId}`, getAuthHeader());
  return res.data.post as CommunityPost;
};

export const updatePost = async (postId: string, content: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/community/posts/${postId}`, { content }, getAuthHeader());
  return res.data;
};

export const deletePost = async (postId: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/community/posts/${postId}`, getAuthHeader());
  return res.data;
};

export const toggleLikePost = async (postId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/posts/${postId}/like`, {}, getAuthHeader());
  return res.data as { liked: boolean; likeCount: number };
};

export const toggleBookmarkPost = async (postId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/posts/${postId}/bookmark`, {}, getAuthHeader());
  return res.data as { bookmarked: boolean; bookmarkCount: number };
};

export const sharePost = async (postId: string, content = '') => {
  const res = await axios.post(`${API_BASE_URL}/api/community/posts/${postId}/share`, { content }, getAuthHeader());
  return res.data;
};

export const votePoll = async (postId: string, optionId: string) => {
  const res = await axios.post(`${API_BASE_URL}/api/community/posts/${postId}/vote`, { optionId }, getAuthHeader());
  return res.data.pollData;
};

// --- Company page: About + Jobs tabs ---
export interface CompanyJob {
  _id: string;
  title: string;
  location: string;
  jobtype: string;
  salary: string;
  createdAt: string;
  deadline: string;
}

export const fetchCompanyJobs = async (companyId: string): Promise<CompanyJob[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/jobs`, {
    params: { employer: companyId, limit: 20 },
  });
  return res.data.jobs;
};

export interface CompanyAbout {
  name: string;
  description?: string;
  website?: string;
  industryType?: string;
  companySize?: string;
  address?: string;
  establishedDate?: string;
  companyLogo?: string;
}

export const fetchCompanyAbout = async (companyId: string): Promise<CompanyAbout> => {
  const res = await axios.get(`${API_BASE_URL}/api/community/follow/${companyId}/profile`);
  return res.data.profile;
};

// --- Admin moderation ---
export const fetchFlaggedPosts = async (page = 1): Promise<FeedPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/admin/community/flagged-posts`, { ...getAuthHeader(), params: { page } });
  return res.data;
};

export const moderatePost = async (postId: string, decision: 'approve' | 'remove', note?: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/admin/community/posts/${postId}/moderate`, { decision, note }, getAuthHeader());
  return res.data;
};