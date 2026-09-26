import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// Public, unauthenticated read of every sitewide key/value content string
// (backend/models/SiteContent.js) — footer copy, misc microcopy, Resume
// Builder marketing/instructional headings. One request returns the whole
// map so every consuming component doesn't fire its own fetch; see
// src/context/SiteContentContext.tsx for the shared cached consumption.
export type SiteContentMap = Record<string, string>;

export const getSiteContentMap = async (): Promise<SiteContentMap> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/site-content`);
  return res.data;
};
