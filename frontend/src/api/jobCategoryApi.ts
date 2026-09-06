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
  description?: string;
  scope?: 'system' | 'employer';
}

// `activeOnly=true` — categories an employer has deactivated (or an admin
// has turned off) shouldn't appear as selectable here, even though the
// admin management panel (which calls this same endpoint with no query
// param) still needs to see them to reactivate them. See
// jobCategoryController.js's getJobCategories.
export const fetchJobCategories = async (): Promise<PublicJobCategory[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/jobcategories`, { params: { activeOnly: 'true' } });
  return res.data;
};
