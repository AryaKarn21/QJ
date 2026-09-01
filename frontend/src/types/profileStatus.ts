// QuickJobs' career/hiring-status system — the "Open to Work"/"Hiring"
// equivalent feature, using QuickJobs' own terminology, colors, and UI
// (never LinkedIn's). Mirrors the enums in
// backend/utils/profileStatus.js exactly; keep both in sync.

export type JobseekerStatusValue =
  | 'OPEN_TO_OPPORTUNITIES'
  | 'ACTIVELY_SEEKING'
  | 'AVAILABLE_FOR_OFFERS'
  | 'NOT_CURRENTLY_LOOKING';

export type EmployerStatusValue =
  | 'ACTIVELY_HIRING'
  | 'RECRUITING_CANDIDATES'
  | 'OPEN_TO_APPLICANTS'
  | 'NOT_CURRENTLY_HIRING';

export type ProfileStatusValue = JobseekerStatusValue | EmployerStatusValue;
export type ProfileStatusType = 'JOB_SEEKER' | 'EMPLOYER';
export type ProfileVisibility = 'public' | 'network' | 'private';

export interface ProfileStatus {
  statusType: ProfileStatusType;
  status: ProfileStatusValue;
  targetRoles: string[];
  preferredLocations: string[];
  employmentTypes: string[];
  visibility: ProfileVisibility;
  updatedAt: string | null;
}

interface StatusOption<T extends string> {
  value: T;
  label: string;
  /** Tailwind classes for the badge pill — subtle, not the bright primary brand color. */
  badgeClass: string;
  /** Tailwind class for the small status dot. */
  dotClass: string;
}

export const JOBSEEKER_STATUS_OPTIONS: StatusOption<JobseekerStatusValue>[] = [
  {
    value: 'OPEN_TO_OPPORTUNITIES',
    label: 'Open to Opportunities',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'ACTIVELY_SEEKING',
    label: 'Actively Seeking',
    badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
    dotClass: 'bg-teal-500',
  },
  {
    value: 'AVAILABLE_FOR_OFFERS',
    label: 'Available for Offers',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  {
    value: 'NOT_CURRENTLY_LOOKING',
    label: 'Not Currently Looking',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    dotClass: 'bg-slate-400',
  },
];

export const EMPLOYER_STATUS_OPTIONS: StatusOption<EmployerStatusValue>[] = [
  {
    value: 'ACTIVELY_HIRING',
    label: 'Actively Hiring',
    badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    dotClass: 'bg-orange-500',
  },
  {
    value: 'RECRUITING_CANDIDATES',
    label: 'Recruiting Candidates',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  {
    value: 'OPEN_TO_APPLICANTS',
    label: 'Open to Applicants',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  {
    value: 'NOT_CURRENTLY_HIRING',
    label: 'Not Currently Hiring',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    dotClass: 'bg-slate-400',
  },
];

export const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'network', label: 'Connections / Network Only' },
  { value: 'private', label: 'Private' },
];

// Role-specific copy for the editor drawer (spec sections 7/8) — kept
// alongside the option lists so JobSeekerStatusForm/EmployerHiringStatusForm
// only ever need one `statusType` prop to render correctly.
export const STATUS_EDITOR_CONFIG: Record<
  ProfileStatusType,
  {
    title: string;
    question: string;
    options: StatusOption<ProfileStatusValue>[];
    targetRolesLabel: string;
    successMessage: string;
    networkVisibilityLabel: string;
  }
> = {
  JOB_SEEKER: {
    title: 'Update Career Status',
    question: "What's your current status?",
    options: JOBSEEKER_STATUS_OPTIONS,
    targetRolesLabel: 'Target Roles',
    successMessage: 'Career status updated successfully.',
    networkVisibilityLabel: 'Connections / Network Only',
  },
  EMPLOYER: {
    title: 'Update Hiring Status',
    question: "What's your hiring status?",
    options: EMPLOYER_STATUS_OPTIONS,
    targetRolesLabel: 'Hiring For',
    successMessage: 'Hiring status updated successfully.',
    networkVisibilityLabel: 'Partners / Network Only',
  },
};

export function findStatusOption(statusType: ProfileStatusType, value: string) {
  return STATUS_EDITOR_CONFIG[statusType].options.find((o) => o.value === value);
}
