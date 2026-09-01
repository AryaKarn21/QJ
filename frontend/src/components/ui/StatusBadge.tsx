import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' | 'brand';

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-adminSuccess dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-adminWarning dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-50 text-adminDanger dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-blue-50 text-adminBlue dark:bg-blue-500/10 dark:text-blue-400',
  accent: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  neutral: 'bg-slate-100 text-adminTextSecondary dark:bg-slate-500/10 dark:text-slate-400',
  // NEW — matches the sidebar's active-menu mint used across the redesign.
  brand: 'bg-adminActive text-adminAccent',
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

/**
 * Small pill for anything with a "status" — job status, KYC state, ticket
 * state, application stage. Pass `tone` explicitly, or use `statusToTone`
 * below to derive it from common string values.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone = 'neutral', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

/**
 * Best-effort mapping from common backend status strings to a visual tone.
 * Extend this as new statuses are introduced (e.g. KYC "pending_review").
 */
export function statusToTone(status: string): StatusTone {
  const normalized = status.toLowerCase();
  if (['approved', 'active', 'verified', 'success', 'paid', 'resolved', 'accepted'].includes(normalized)) return 'success';
  if (['pending', 'in_review', 'awaiting', 'processing', 'reviewed'].includes(normalized)) return 'warning';
  if (['rejected', 'suspended', 'failed', 'closed', 'expired', 'locked'].includes(normalized)) return 'danger';
  if (['draft', 'new', 'open'].includes(normalized)) return 'info';
  if (['featured', 'pinned', 'trending'].includes(normalized)) return 'brand';
  return 'neutral';
}

export default StatusBadge;