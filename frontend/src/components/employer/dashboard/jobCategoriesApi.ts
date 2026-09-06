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

export interface EmployerJobCategory {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  status: 'active' | 'inactive';
  scope: 'employer';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Only this employer's own created categories (any status) — for the management page. */
export const getMyJobCategories = async (): Promise<EmployerJobCategory[]> => {
  const res = await api.get('/api/jobcategories/employer/mine');
  return res.data;
};

export const createEmployerJobCategory = async (payload: {
  name: string;
  description?: string;
  icon?: File | null;
}): Promise<EmployerJobCategory> => {
  const fd = new FormData();
  fd.append('name', payload.name);
  if (payload.description) fd.append('description', payload.description);
  if (payload.icon) fd.append('icon', payload.icon);
  const res = await api.post('/api/jobcategories/employer', fd);
  return res.data;
};

export const updateEmployerJobCategory = async (
  id: string,
  payload: { name?: string; description?: string; icon?: File | null }
): Promise<EmployerJobCategory> => {
  const fd = new FormData();
  if (payload.name !== undefined) fd.append('name', payload.name);
  if (payload.description !== undefined) fd.append('description', payload.description);
  if (payload.icon) fd.append('icon', payload.icon);
  const res = await api.put(`/api/jobcategories/employer/${id}`, fd);
  return res.data;
};

export const setEmployerJobCategoryStatus = async (
  id: string,
  status: 'active' | 'inactive'
): Promise<EmployerJobCategory> => {
  const res = await api.patch(`/api/jobcategories/employer/${id}/status`, { status });
  return res.data;
};

export const deleteEmployerJobCategory = async (id: string, force = false): Promise<void> => {
  await api.delete(`/api/jobcategories/employer/${id}${force ? '?force=true' : ''}`);
};
