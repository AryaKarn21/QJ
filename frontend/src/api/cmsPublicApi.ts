import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// Public, unauthenticated reads of admin-authored FAQ / Career Tip content
// (backend/controllers/cmsController.js, backend/models/Faq.js /
// CareerTip.js). Both endpoints were already fully built and used by the
// admin CMS authoring UI — nothing on the live site ever called them
// before this; no backend changes needed here.

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  audience: 'all' | 'jobseeker' | 'employer';
  order: number;
  isActive: boolean;
}

export const getFaqs = async (): Promise<Faq[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/faqs`);
  return res.data;
};

export interface CareerTip {
  _id: string;
  title: string;
  content: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export const getCareerTips = async (): Promise<CareerTip[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/career-tips`);
  return res.data;
};

export const getCareerTipById = async (id: string): Promise<CareerTip> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/career-tips/${id}`);
  return res.data;
};

// Homepage Hero + closing-CTA copy (backend/models/HomepageContent.js) —
// see that file for exactly what this does and doesn't cover. Unpublished
// (or never configured) returns { isPublished: false } with no hero/cta
// fields — callers must treat that as "render your own hardcoded copy,"
// not as an error.
export interface HomepageHeroContent {
  badgeText: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  popularSearches: string[];
}

export interface HomepageCtaContent {
  badgeText: string;
  heading: string;
  headingAccent: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

export type HomepageContent =
  | { isPublished: false }
  | { isPublished: true; hero: HomepageHeroContent; cta: HomepageCtaContent };

export const getHomepageContent = async (): Promise<HomepageContent> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/homepage`);
  return res.data;
};

// Generic admin-authored CMS page (backend/models/Page.js's "Pages" tab —
// distinct from the fixed-slug legal pages above). Only ever returns a
// published page; a draft or unknown slug is a 404, which the caller
// should render as "not found," not "not published yet."
export interface CmsGenericPage {
  _id: string;
  slug: string;
  title: string;
  content: string;
  featuredImage?: string;
  createdAt: string;
  updatedAt: string;
}

export const getPublicCmsPage = async (slug: string): Promise<CmsGenericPage> => {
  const res = await axios.get(`${API_BASE_URL}/api/cms/pages/view/${slug}`);
  return res.data;
};
