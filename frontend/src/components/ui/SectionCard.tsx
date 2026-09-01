// 📁 Destination path: frontend/src/components/ui/SectionCard.tsx
import React from 'react';
import { LoadingState } from './LoadingState';

interface SectionCardProps {
  /** Section heading, e.g. "Quick Actions", "Recent Activity", "Top Companies" */
  title?: string;
  subtitle?: string;
  /** Right-aligned slot next to the title — typically a "View all" link or a small control */
  action?: React.ReactNode;
  /** Set to 'none' when the content manages its own padding (e.g. a table) */
  padding?: 'default' | 'none';
  loading?: boolean;
  loadingMessage?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * The generic "white rounded card with a title" building block used all
 * over the dashboard — Quick Actions, System Alerts, Recent Activity, Top
 * Job Categories, Top Companies, etc. Use `ChartCard` instead when the
 * content is a recharts chart (it adds a timeframe switcher + chart-shaped
 * skeleton); use `SectionCard` for everything else so that boilerplate
 * (`rounded-admin-card border border-adminBorder bg-white shadow-admin-card`)
 * isn't repeated by hand in every page.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  action,
  padding = 'default',
  loading = false,
  loadingMessage,
  className = '',
  children,
}) => {
  const hasHeader = title || action;

  return (
    <div
      className={`rounded-admin-card border border-adminBorder bg-adminCard shadow-admin-card transition-shadow duration-200 hover:shadow-admin-card-hover dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {hasHeader && (
        <div className={`flex items-start justify-between gap-3 ${padding === 'none' ? 'p-5 pb-0' : 'px-5 pt-5'}`}>
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-adminText dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-adminTextSecondary dark:text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={padding === 'none' ? '' : 'p-5'}>
        {loading ? <LoadingState message={loadingMessage} /> : children}
      </div>
    </div>
  );
};

export default SectionCard;