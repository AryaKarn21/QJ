import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FileText, Sparkles, TrendingUp } from 'lucide-react';
import { KpiCard } from '../../ui/KpiCard';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { getAiUsageStats } from '../adminApi/api';

const TEMPLATE_LABELS: Record<string, string> = {
  'green-simple': 'Science & Engineering',
  'white-sales': 'Sales Representative',
  'blue-professional': 'Professional CV',
};

/**
 * AI Center — Intelligence group, Phase 3 in the Architecture doc.
 * Starts with Resume Builder usage (real data, tracked via
 * /api/ai-usage/log-resume-build every time a user downloads a resume).
 * Additional AI features (ATS score, candidate ranking, job matching, spam
 * detection) log into the same AiUsageLog collection and slot in here as
 * more KpiCards/ChartCards once those features exist.
 */
export const AiCenterDashboard: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['aiUsageStats'],
    queryFn: getAiUsageStats,
    retry: false,
  });

  const topTemplate = data?.byTemplate?.[0];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
            <Sparkles size={16} />
          </span>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">AI Center</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real usage of QuickJob's AI-assisted features, starting with the Resume Builder.
        </p>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load AI usage stats. Make sure the backend is running and you're signed in as
          an admin or superadmin.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Resumes Built"
          value={data ? data.totalResumeBuilds.toLocaleString() : '—'}
          icon={<FileText size={16} />}
          loading={isLoading}
        />
        <KpiCard
          label="Builds — Last 30 Days"
          value={data ? data.buildsLast30Days.toLocaleString() : '—'}
          icon={<TrendingUp size={16} />}
          loading={isLoading}
        />
        <KpiCard
          label="Most Popular Template"
          value={topTemplate ? TEMPLATE_LABELS[topTemplate.templateId] ?? topTemplate.templateId : '—'}
          icon={<Sparkles size={16} />}
          loading={isLoading}
        />
      </div>

      {/* Daily trend chart */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Resume builds — last 30 days
        </h2>

        {isLoading && <SkeletonCard className="h-56 border-0 p-0" />}

        {!isLoading && (!data?.dailyTrend || data.dailyTrend.length === 0) && (
          <EmptyState
            title="No activity yet"
            description="Once users start building resumes, daily activity will show up here."
            className="border-0 py-10"
          />
        )}

        {!isLoading && data?.dailyTrend && data.dailyTrend.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.dailyTrend}>
              <defs>
                <linearGradient id="resumeBuildsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                name="Resumes built"
                stroke="#7C3AED"
                fill="url(#resumeBuildsGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Template breakdown + recent activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Builds by template
          </h2>
          {isLoading && <SkeletonCard className="h-40 border-0 p-0" />}
          {!isLoading && (!data?.byTemplate || data.byTemplate.length === 0) && (
            <EmptyState title="No builds yet" className="border-0 py-8" />
          )}
          {!isLoading && data?.byTemplate && data.byTemplate.length > 0 && (
            <ul className="space-y-3">
              {data.byTemplate.map((t) => {
                const max = data.byTemplate[0]?.count || 1;
                const pct = Math.round((t.count / max) * 100);
                return (
                  <li key={t.templateId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {TEMPLATE_LABELS[t.templateId] ?? t.templateId}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {t.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-violet-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Recent activity
          </h2>
          {isLoading && <SkeletonCard className="h-40 border-0 p-0" />}
          {!isLoading && (!data?.recentBuilds || data.recentBuilds.length === 0) && (
            <EmptyState title="Nothing yet" className="border-0 py-8" />
          )}
          {!isLoading && data?.recentBuilds && data.recentBuilds.length > 0 && (
            <ul className="space-y-2 text-sm">
              {data.recentBuilds.map((b, i) => (
                <li key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-200">
                    {b.templateName ?? TEMPLATE_LABELS[b.templateId] ?? b.templateId}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        This tracks real usage — every resume download in the app calls{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
          POST /api/ai-usage/log-resume-build
        </code>
        . ATS Score, Candidate Ranking, Job Matching, and Cost Analytics widgets slot in below
        once those AI features exist — they log into the same collection, filtered by{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">feature</code>.
      </div>
    </div>
  );
};

export default AiCenterDashboard;