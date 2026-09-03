import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// Public, read-only view of the admin-managed JobCategory collection
// (backend/controllers/jobCategoryController.js's getJobCategories — no
// auth required, same GET /api/jobcategories the admin panel itself
// reads from). Shared by every place that needs the *real*, currently-
// configured list of categories — the employer "Post a Job" form, the
// admin "Edit Job" form, and the navbar's "Explore Job Categories"
// dropdown all used to hard-code their own copy of this list, so a
// category created in the admin panel could never actually be selected
// anywhere a job gets categorized.
export interface PublicJobCategory {
  _id: string;
  name: string;
  icon?: string;
  isTrending?: boolean;
}

export const fetchJobCategories = async (): Promise<PublicJobCategory[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/jobcategories`);
  return res.data;
};
