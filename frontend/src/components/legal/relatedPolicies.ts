// The 7 core legal pages, for the "Related Policies" row shown at the
// bottom of every policy page (PolicyPageShell.tsx). Paths match the
// routes registered in App.tsx exactly. Deliberately a small, fixed list
// (not every one of the 14 policy types) — this is a navigation aid, not
// an exhaustive index; the footer's Legal column already covers the rest.
export interface RelatedPolicyLink {
  label: string;
  path: string;
}

export const RELATED_POLICIES: RelatedPolicyLink[] = [
  { label: 'Terms & Conditions', path: '/terms' },
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Community Guidelines', path: '/community-guidelines' },
  { label: 'Job Seeker Rules', path: '/job-seeker-rules' },
  { label: 'Job Provider Rules', path: '/job-provider-rules' },
  { label: 'Cookie Policy', path: '/cookie-policy' },
  { label: 'Disclaimer', path: '/disclaimer' },
];
