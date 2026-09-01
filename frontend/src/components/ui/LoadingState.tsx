// 📁 Destination path: frontend/src/components/ui/LoadingState.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  /** Use for whole-page loading (adds generous vertical padding); omit for compact, in-card loading. */
  fullHeight?: boolean;
  className?: string;
}

/**
 * Generic loading placeholder for a section or page that's still fetching —
 * distinct from `Skeleton`'s `SkeletonRow` (table rows) and `EmptyState`
 * (finished loading, no data). Used e.g. while a dashboard's KPIs/charts are
 * still in flight, or before a role-specific shell has enough data to render.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading…',
  fullHeight = false,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center gap-2.5 text-adminTextSecondary dark:text-slate-500 ${
      fullHeight ? 'min-h-[360px]' : 'py-10'
    } ${className}`}
  >
    <Loader2 size={22} className="animate-spin text-adminAccent" />
    {message && <p className="text-sm">{message}</p>}
  </div>
);

export default LoadingState;