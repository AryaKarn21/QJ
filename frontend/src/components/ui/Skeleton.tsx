import React from 'react';

const pulse = 'animate-pulse rounded bg-slate-200 dark:bg-slate-700';

export const SkeletonRow: React.FC<{ columns: number }> = ({ columns }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className={`h-4 w-full max-w-[160px] ${pulse}`} />
      </td>
    ))}
  </tr>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 ${className}`}
  >
    <div className={`mb-3 h-3 w-24 ${pulse}`} />
    <div className={`h-7 w-32 ${pulse}`} />
    <div className={`mt-3 h-3 w-16 ${pulse}`} />
  </div>
);

export default SkeletonRow;