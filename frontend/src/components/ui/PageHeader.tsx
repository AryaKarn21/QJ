// 📁 Destination path: frontend/src/components/ui/PageHeader.tsx
import React from 'react';

interface PageHeaderProps {
  /** Main heading — a page title ("User Management") or a greeting ("Welcome back, Rohit 👋") */
  title: string;
  /** One-line supporting copy under the title */
  description?: string;
  /** Small uppercase label above the title, e.g. a section/breadcrumb tag ("EMPLOYER") */
  eyebrow?: string;
  /** Right-aligned slot — buttons, a date range, an export control, etc. */
  actions?: React.ReactNode;
  /**
   * 'card'  — soft gradient card, used for top-of-dashboard greetings
   *           (Admin/Jobseeker/Employer "Welcome back" headers).
   * 'plain' — bare heading row, used at the top of regular list/management
   *           pages (Users, Jobs, Applications, Settings, ...).
   */
  variant?: 'card' | 'plain';
  className?: string;
}

/**
 * Consistent page-level header for every authenticated area of the app —
 * jobseeker, employer, admin, and superadmin all use this same component so
 * typography, spacing, and the "welcome card" treatment never drift between
 * roles. See design-system notes in AdminDashboardV2.tsx.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  eyebrow,
  actions,
  variant = 'plain',
  className = '',
}) => {
  if (variant === 'card') {
    return (
      <div
        className={`flex flex-col items-start justify-between gap-4 rounded-admin-card border border-adminBorder bg-gradient-to-br from-white to-adminActive/30 p-6 shadow-admin-card sm:flex-row sm:items-center ${className}`}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-adminTextSecondary/80">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl font-bold text-adminText sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-adminTextSecondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-adminTextSecondary/80">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-lg font-bold text-adminText sm:text-xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-adminTextSecondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
};

export default PageHeader;