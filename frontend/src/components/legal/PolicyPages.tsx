import { CmsPageView } from './CmsPageView';

// Public renderers for the Legal & Policies types added beyond the original
// three (Privacy Policy / Terms of Service / Community Guidelines, which
// keep using LegalPage.tsx's legacy fixed-slug endpoint — see
// TermsOfService.tsx / CommunityGuidelines.tsx). These read through
// CmsPageView's generic `/pages/view/:slug` endpoint (published-only, real
// 404 if missing) via a fixed slug instead of a URL param, one component
// per fixed route in App.tsx. An admin has to create+publish each of these
// from Super Admin → CMS → Legal & Policies before it shows real content;
// until then the visitor sees CmsPageView's honest "hasn't been published
// yet" state, same as every other CMS-backed page.

export const JobSeekerRules = () => <CmsPageView slugProp="job-seeker-rules" />;
export const JobProviderRules = () => <CmsPageView slugProp="job-provider-rules" />;
export const JobPostingGuidelines = () => <CmsPageView slugProp="job-posting-guidelines" />;
export const ProhibitedContentPolicy = () => <CmsPageView slugProp="prohibited-content" />;
export const RefundCancellationPolicy = () => <CmsPageView slugProp="refund-cancellation" />;
export const CookiePolicy = () => <CmsPageView slugProp="cookie-policy" />;
export const Disclaimer = () => <CmsPageView slugProp="disclaimer" />;
export const CodeOfConduct = () => <CmsPageView slugProp="code-of-conduct" />;
export const ResumeBuilderTerms = () => <CmsPageView slugProp="resume-builder-terms" />;
export const AssessmentPolicy = () => <CmsPageView slugProp="assessment-policy" />;
export const InterviewPolicy = () => <CmsPageView slugProp="interview-policy" />;
