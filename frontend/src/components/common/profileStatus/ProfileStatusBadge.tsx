import React from 'react';
import { Pencil } from 'lucide-react';
import type { ProfileStatus } from '../../../types/profileStatus';
import { findStatusOption } from '../../../types/profileStatus';

interface ProfileStatusBadgeProps {
  profileStatus?: ProfileStatus | null;
  /** Shows a small pencil affordance and calls onEdit when clicked — only ever passed for the profile owner's own view. */
  editable?: boolean;
  onEdit?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Compact "career status" / "hiring status" pill — QuickJobs' own take on
 * the Open-to-Work/Hiring indicator (own colors, own wording, own layout;
 * never LinkedIn's). Renders nothing when there's no status to show,
 * which happens for two legitimate reasons the caller doesn't need to
 * distinguish: the account isn't a jobseeker/employer, or the viewer isn't
 * allowed to see it (visibility gating already happened server-side —
 * see followController.js's getVisibleProfileStatus).
 */
export const ProfileStatusBadge: React.FC<ProfileStatusBadgeProps> = ({
  profileStatus,
  editable = false,
  onEdit,
  size = 'md',
  className = '',
}) => {
  if (!profileStatus) {
    // Owner viewing their own profile before ever setting a status — this
    // IS the "first-time setup" entry point (spec section 6), surfaced as
    // an inline call-to-action rather than a forced popup (section 21).
    if (editable) {
      return (
        <button
          type="button"
          onClick={onEdit}
          className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-primary hover:text-primary transition-colors dark:border-slate-600 dark:text-slate-400 ${className}`}
        >
          <Pencil size={12} />
          Set your status
        </button>
      );
    }
    return null;
  }

  const option = findStatusOption(profileStatus.statusType, profileStatus.status);
  if (!option) return null;

  const textSize = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${textSize} ${option.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${option.dotClass}`} aria-hidden="true" />
        {option.label}
      </span>
      {editable && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={
            profileStatus.statusType === 'JOB_SEEKER' ? 'Edit career status' : 'Edit hiring status'
          }
          title={profileStatus.statusType === 'JOB_SEEKER' ? 'Edit career status' : 'Edit hiring status'}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-primary transition-colors dark:hover:bg-slate-800"
        >
          <Pencil size={12} />
        </button>
      )}
    </span>
  );
};

export default ProfileStatusBadge;
