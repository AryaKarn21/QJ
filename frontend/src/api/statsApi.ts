import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// Real, aggregate, non-sensitive platform counts for the landing page's
// trust bar — backend/controllers/statsController.js. Public, no auth.
export interface PublicStats {
  activeJobs: number;
  companies: number;
  jobseekers: number;
  successRate: number;
}

export const getPublicStats = async (): Promise<PublicStats> => {
  const res = await axios.get(`${API_BASE_URL}/api/stats/public`);
  return res.data;
};
