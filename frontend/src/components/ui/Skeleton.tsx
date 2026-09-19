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

// ── Generic primitives ──────────────────────────────────────────────────
// Composable building blocks for page-specific skeletons below, so a new
// page's loading state is a few lines of layout instead of a bespoke
// pulse-div component every time.

/** A single line of placeholder text. `width` accepts any Tailwind width
 * class (e.g. "w-1/2", "w-32", "w-full"). */
export const SkeletonText: React.FC<{ width?: string; height?: string; className?: string }> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
}) => <div className={`${height} ${width} ${pulse} ${className}`} />;

/** Circular placeholder for an avatar/logo/icon. `size` is a Tailwind
 * size pair, e.g. "h-10 w-10". */
export const SkeletonCircle: React.FC<{ size?: string; className?: string }> = ({
  size = 'h-10 w-10',
  className = '',
}) => <div className={`${size} shrink-0 rounded-full ${pulse} ${className}`} />;

/** Rectangular placeholder for an image/banner/media block. */
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-xl ${pulse} ${className}`} />
);

/** Avatar + two lines of text — the "name/subtitle" row used across
 * profile headers, comment authors, list items, message threads, etc. */
export const SkeletonAvatarLine: React.FC<{ avatarSize?: string; className?: string }> = ({
  avatarSize = 'h-10 w-10',
  className = '',
}) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <SkeletonCircle size={avatarSize} />
    <div className="min-w-0 flex-1 space-y-2">
      <SkeletonText width="w-1/3" />
      <SkeletonText width="w-1/2" height="h-3" />
    </div>
  </div>
);

/** A handful of full-width text lines, e.g. for a paragraph/description
 * placeholder. Each line after the first is progressively shorter so it
 * doesn't read as a suspiciously perfect rectangle. */
export const SkeletonParagraph: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonText key={i} width={i === lines - 1 ? 'w-2/3' : 'w-full'} />
    ))}
  </div>
);

export default SkeletonRow;