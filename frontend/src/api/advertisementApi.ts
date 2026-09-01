import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export type AdPlacement = 'homepage' | 'jobs_page';

export interface Advertisement {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdPlacement;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  createdBy?: { _id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAd {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
}

export interface AdvertisementFormPayload {
  title: string;
  description?: string;
  linkUrl: string;
  placement: AdPlacement;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  image?: File | null;
}

const toFormData = (payload: AdvertisementFormPayload) => {
  const fd = new FormData();
  fd.append('title', payload.title);
  if (payload.description !== undefined) fd.append('description', payload.description);
  fd.append('linkUrl', payload.linkUrl);
  fd.append('placement', payload.placement);
  if (payload.isActive !== undefined) fd.append('isActive', String(payload.isActive));
  if (payload.startDate !== undefined) fd.append('startDate', payload.startDate || '');
  if (payload.endDate !== undefined) fd.append('endDate', payload.endDate || '');
  if (payload.image) fd.append('image', payload.image);
  return fd;
};

// ── Admin ──────────────────────────────────────────────────────────────

export const adminGetAdvertisements = async (params: { page?: number; limit?: number; search?: string; placement?: AdPlacement }) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.placement) query.set('placement', params.placement);
  const res = await axios.get(`${API_BASE_URL}/api/advertisements/admin?${query.toString()}`, getAuthHeader());
  return res.data as { ads: Advertisement[]; total: number; page: number; totalPages: number };
};

export const adminGetAdvertisementById = async (id: string) => {
  const res = await axios.get(`${API_BASE_URL}/api/advertisements/admin/${id}`, getAuthHeader());
  return res.data as Advertisement;
};

export const adminCreateAdvertisement = async (payload: AdvertisementFormPayload) => {
  const res = await axios.post(`${API_BASE_URL}/api/advertisements/admin`, toFormData(payload), {
    ...getAuthHeader(),
    // No explicit multipart Content-Type here on purpose: axios/the browser
    // must generate it itself so it includes the required `boundary=...`
    // parameter. Setting 'multipart/form-data' manually (no boundary) makes
    // busboy/multer throw "Multipart: Boundary not found" on every request,
    // which the backend's generic error handler turns into an opaque 500 —
    // see the same fix applied across every other FormData upload call in
    // this codebase (adminApi/api.ts, authApi.ts, employer/jobseeker APIs,
    // communityApi.ts).
  });
  return res.data as Advertisement;
};

export const adminUpdateAdvertisement = async (id: string, payload: AdvertisementFormPayload) => {
  const res = await axios.put(`${API_BASE_URL}/api/advertisements/admin/${id}`, toFormData(payload), {
    ...getAuthHeader(),
    // No explicit multipart Content-Type here on purpose: axios/the browser
    // must generate it itself so it includes the required `boundary=...`
    // parameter. Setting 'multipart/form-data' manually (no boundary) makes
    // busboy/multer throw "Multipart: Boundary not found" on every request,
    // which the backend's generic error handler turns into an opaque 500 —
    // see the same fix applied across every other FormData upload call in
    // this codebase (adminApi/api.ts, authApi.ts, employer/jobseeker APIs,
    // communityApi.ts).
  });
  return res.data as Advertisement;
};

export const adminToggleAdvertisement = async (id: string) => {
  const res = await axios.patch(`${API_BASE_URL}/api/advertisements/admin/${id}/toggle`, {}, getAuthHeader());
  return res.data as { message: string; isActive: boolean };
};

export const adminDeleteAdvertisement = async (id: string) => {
  const res = await axios.delete(`${API_BASE_URL}/api/advertisements/admin/${id}`, getAuthHeader());
  return res.data as { message: string };
};

// ── Public ─────────────────────────────────────────────────────────────

export const getActiveAdvertisements = async (placement: AdPlacement) => {
  const res = await axios.get(`${API_BASE_URL}/api/advertisements/active`, { params: { placement } });
  return res.data as PublicAd[];
};

export const recordAdImpression = (id: string) =>
  axios.post(`${API_BASE_URL}/api/advertisements/${id}/impression`).catch(() => {});

export const recordAdClick = (id: string) =>
  axios.post(`${API_BASE_URL}/api/advertisements/${id}/click`).catch(() => {});
