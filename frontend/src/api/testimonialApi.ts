import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export interface Testimonial {
  _id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  avatarUrl: string;
  rating: number;
  isActive: boolean;
  createdBy?: { _id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTestimonial {
  _id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  avatarUrl: string;
  rating: number;
}

export interface TestimonialFormPayload {
  name: string;
  role?: string;
  company?: string;
  quote: string;
  rating?: number;
  isActive?: boolean;
  avatar?: File | null;
}

const toFormData = (payload: TestimonialFormPayload) => {
  const fd = new FormData();
  fd.append('name', payload.name);
  if (payload.role !== undefined) fd.append('role', payload.role);
  if (payload.company !== undefined) fd.append('company', payload.company);
  fd.append('quote', payload.quote);
  if (payload.rating !== undefined) fd.append('rating', String(payload.rating));
  if (payload.isActive !== undefined) fd.append('isActive', String(payload.isActive));
  if (payload.avatar) fd.append('avatar', payload.avatar);
  return fd;
};

// ── Admin ──────────────────────────────────────────────────────────────

export const adminGetTestimonials = async (params: { page?: number; limit?: number; search?: string }) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  const res = await axios.get(`${API_BASE_URL}/api/testimonials/admin?${query.toString()}`, getAuthHeader());
  return res.data as { testimonials: Testimonial[]; total: number; page: number; totalPages: number };
};

export const adminGetTestimonialById = async (id: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/testimonials/admin/${id}`, getAuthHeader());
  return res.data as Testimonial;
};

export const adminCreateTestimonial = async (payload: TestimonialFormPayload) => {
  const res = await axios.post(`${API_BASE_URL}/api/testimonials/admin`, toFormData(payload), {
    ...getAuthHeader(),
    // No explicit multipart Content-Type here on purpose: axios/the browser
    // must generate it itself so it includes the required `boundary=...`
    // parameter — see the same fix applied across every other FormData
    // upload call in this codebase (advertisementApi.ts and friends).
  });
  return res.data as Testimonial;
};

export const adminUpdateTestimonial = async (id: string, payload: TestimonialFormPayload) => {
  const res = await axios.put(`${API_BASE_URL}/api/testimonials/admin/${id}`, toFormData(payload), {
    ...getAuthHeader(),
  });
  return res.data as Testimonial;
};

export const adminToggleTestimonial = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/testimonials/admin/${id}/toggle`, {}, getAuthHeader());
  return res.data as { message: string; isActive: boolean };
};

export const adminDeleteTestimonial = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/testimonials/admin/${id}`, getAuthHeader());
  return res.data as { message: string };
};

// ── Public ─────────────────────────────────────────────────────────────

export const getActiveTestimonials = async (limit?: number) => {
  const res = await axios.get(`${API_BASE_URL}/api/testimonials/active`, { params: limit ? { limit } : {} });
  return res.data as PublicTestimonial[];
};
