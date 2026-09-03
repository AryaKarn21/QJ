import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

export interface CmsLegalPage {
  slug: string;
  title: string;
  content: string;
  isDraftPlaceholder?: boolean;
}

// Public, unauthenticated read of an admin-authored legal/static page
// (Privacy Policy, Terms of Service, Community Guidelines — see
// backend/controllers/cmsController.js's ALLOWED_PAGE_SLUGS). The route
// itself requires no auth (`GET /api/cms/pages/:slug`), so this
// deliberately does NOT attach an Authorization header the way the admin
// API module does — a logged-out visitor reading Terms of Service must
// not depend on having a token.
export const getLegalPage = async (slug: string): Promise<CmsLegalPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages/${slug}`);
  return res.data;
};
