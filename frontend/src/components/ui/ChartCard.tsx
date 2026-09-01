/**
 * ChartCard.tsx — premium redesign.
 *
 * A consistent wrapper for every recharts chart in the admin dashboard.
 * Handles: title, subtitle, timeframe switcher, loading skeleton,
 * empty state, and a consistent border/padding shell.
 */

import React, { useState } from 'react';

export type TimeFrame = '7d' | '30d' | '90d';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Timeframe options to offer. Omit for a static chart. */
  timeframes?: TimeFrame[];
  defaultTimeframe?: TimeFrame;
  onTimeframeChange?: (tf: TimeFrame) => void;
  loading?: boolean;
  /** Chart height in px (default: 240) */
  height?: number;
  /** Right-side slot: e.g. a legend or export button */
  action?: React.ReactNode;
  children: React.ReactNode;
}

const LABELS: Record<TimeFrame, string> = { '7d': '7d', '30d': '30d', '90d': '90d' };

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  timeframes,
  defaultTimeframe = '30d',
  onTimeframeChange,
  loading = false,
  height = 240,
  action,
  children,
}) => {
  const [activeTf, setActiveTf] = useState<TimeFrame>(defaultTimeframe);

  const handleTf = (tf: TimeFrame) => {
    setActiveTf(tf);
    onTimeframeChange?.(tf);
  };

  return (
    <div className="rounded-admin-card border border-adminBorder bg-adminCard shadow-admin-card transition-shadow duration-200 hover:shadow-admin-card-hover dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-adminText dark:text-slate-100">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-adminTextSecondary dark:text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {timeframes && timeframes.length > 0 && (
            <div className="flex items-center rounded-lg border border-adminBorder bg-adminBg p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTf(tf)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    activeTf === tf
                      ? 'bg-white text-adminText shadow-admin-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-adminTextSecondary hover:text-adminText dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {LABELS[tf]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-adminBorder/70 dark:border-slate-800" />

      {/* Chart body */}
      <div className="px-2 py-4" style={{ minHeight: height }}>
        {loading ? (
          <div className="flex flex-col gap-3 px-3 pt-2" style={{ height }}>
            <div className="flex h-full items-end gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse rounded-sm bg-adminBg dark:bg-slate-800"
                  style={{ height: `${25 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChartCard;