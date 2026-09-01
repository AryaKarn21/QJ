/**
 * KpiCard.tsx — premium redesign.
 *
 * Backward-compatible: the existing 4-prop signature (label, value, icon, loading)
 * still works unchanged. New props (delta, trend, sparkline, accent) are optional.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  loading?: boolean;
  /** Month-over-month delta as a signed integer percentage, e.g. 12 means +12% */
  delta?: number;
  /** Tooltip suffix for the delta, e.g. "vs last month" */
  deltaLabel?: string;
  /** 30-point sparkline data — array of numbers */
  sparkline?: number[];
  /** Accent colour for the icon bg — 'teal' (default) | 'blue' | 'green' | 'amber' | 'rose' | 'violet' */
  accent?: 'teal' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';
  /** Short supporting copy shown under the value, e.g. "Across all companies" */
  description?: string;
  onClick?: () => void;
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps['accent']>, { icon: string; spark: string }> = {
  teal: {
    icon: 'bg-adminActive text-adminAccent',
    spark: '#0D9488',
  },
  blue: {
    icon: 'bg-blue-50 text-adminBlue dark:bg-blue-500/10 dark:text-blue-400',
    spark: '#2563EB',
  },
  green: {
    icon: 'bg-emerald-50 text-adminSuccess dark:bg-emerald-500/10 dark:text-emerald-400',
    spark: '#10B981',
  },
  amber: {
    icon: 'bg-amber-50 text-adminWarning dark:bg-amber-500/10 dark:text-amber-400',
    spark: '#F59E0B',
  },
  rose: {
    icon: 'bg-rose-50 text-adminDanger dark:bg-rose-500/10 dark:text-rose-400',
    spark: '#EF4444',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    spark: '#7C3AED',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon,
  loading = false,
  delta,
  deltaLabel = 'vs last month',
  sparkline,
  accent = 'teal',
  description,
  onClick,
}) => {
  const accentStyles = ACCENT_CLASSES[accent];
  const hasDelta = typeof delta === 'number';
  const isPositive = hasDelta && delta > 0;
  const isNegative = hasDelta && delta < 0;
  const isNeutral = hasDelta && delta === 0;

  const sparkData = sparkline?.map((v) => ({ v })) ?? [];

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`group relative overflow-hidden rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-admin-card-hover' : 'hover:shadow-admin-card-hover'
      }`}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-adminTextSecondary dark:text-slate-400">{label}</p>
        {icon && (
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentStyles.icon}`}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-adminBg dark:bg-slate-800" />
        ) : (
          <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums text-adminText dark:text-slate-50">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        )}
      </div>

      {/* Delta pill + description */}
      {hasDelta && !loading && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              isPositive
                ? 'bg-emerald-50 text-adminSuccess dark:bg-emerald-500/10 dark:text-emerald-400'
                : isNegative
                ? 'bg-red-50 text-adminDanger dark:bg-red-500/10 dark:text-red-400'
                : 'bg-slate-100 text-adminTextSecondary dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isPositive && <TrendingUp size={11} />}
            {isNegative && <TrendingDown size={11} />}
            {isNeutral && <Minus size={11} />}
            {isPositive ? '+' : ''}
            {delta}%
          </span>
          <span className="text-xs text-adminTextSecondary dark:text-slate-500">{deltaLabel}</span>
        </div>
      )}
      {loading && hasDelta && (
        <div className="mt-2.5 h-5 w-28 animate-pulse rounded bg-adminBg dark:bg-slate-800" />
      )}
      {description && !hasDelta && !loading && (
        <p className="mt-2.5 text-xs text-adminTextSecondary dark:text-slate-500">{description}</p>
      )}

      {/* Sparkline — absolutely positioned at the bottom */}
      {sparkline && sparkline.length > 0 && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 opacity-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentStyles.spark} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={accentStyles.spark} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={accentStyles.spark}
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default KpiCard;