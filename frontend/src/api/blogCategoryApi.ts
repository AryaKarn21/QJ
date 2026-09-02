import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface BlogCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
  blogCount?: number;
  createdBy?: { _id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBlogCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  blogCount: number;
}

export interface BlogCategoryFormPayload {
  name: string;
  description?: string;
  isActive?: boolean;
  icon?: File | null;
}

const toFormData = (payload: BlogCategoryFormPayload) => {
  const fd = new FormData();
  fd.append('name', payload.name);
  if (payload.description !== undefined) fd.append('description', payload.description);
  if (payload.isActive !== undefined) fd.append('isActive', String(payload.isActive));
  if (payload.icon) fd.append('icon', payload.icon);
  return fd;
};

// ── Admin ──────────────────────────────────────────────────────────────

export const adminGetBlogCategories = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/blog-categories/admin`, getAuthHeader());
  return res.data as BlogCategory[];
};

export const adminCreateBlogCategory = async (payload: BlogCategoryFormPayload) => {
  const res = await axios.post(`${API_BASE_URL}/api/blog-categories/admin`, toFormData(payload), {
    ...getAuthHeader(),
    // No explicit multipart Content-Type on purpose — see the same fix
    // applied across every other FormData upload call in this codebase
    // (advertisementApi.ts, testimonialApi.ts, adminApi/api.ts, ...).
  });
  return res.data as BlogCategory;
};

export const adminUpdateBlogCategory = async (id: string, payload: BlogCategoryFormPayload) => {
  const res = await axios.put(`${API_BASE_URL}/api/blog-categories/admin/${id}`, toFormData(payload), {
    ...getAuthHeader(),
  });
  return res.data as BlogCategory;
};

export const adminDeleteBlogCategory = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/blog-categories/admin/${id}`, getAuthHeader());
  return res.data as { message: string };
};

// ── Public ─────────────────────────────────────────────────────────────

export const getActiveBlogCategories = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/blog-categories/active`);
  return res.data as PublicBlogCategory[];
};

export const getBlogCategoryBySlug = async (slug: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/blog-categories/slug/${slug}`);
  return res.data as PublicBlogCategory;
};
