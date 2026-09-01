import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Briefcase,
  DollarSign,
  Globe2,
  Laptop,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import { KpiCard } from '../../ui/KpiCard';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { StatusBadge, statusToTone } from '../../ui/StatusBadge';
import { getAnalyticsOverview } from '../adminApi/api';

type TabId = 'overview' | 'users' | 'jobs' | 'revenue' | 'devices';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'devices', label: 'Devices' },
];

const CHART_COLORS = ['#7C3AED', '#2563EB', '#16A34A', '#D97706', '#DC2626', '#0EA5E9'];

function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const DEVICE_ICON: Record<string, React.ReactNode> = {
  Desktop: <Laptop size={14} />,
  Mobile: <Smartphone size={14} />,
  Tablet: <Tablet size={14} />,
};

export const AnalyticsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: getAnalyticsOverview,
    retry: false,
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
          <BarChart3 size={16} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Real platform data — Users, Jobs, Revenue and Devices.
          </p>
        </div>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load analytics. Make sure the backend is running and you're signed in as an
          admin or superadmin.
        </div>
      )}

      {/* Tab bar — horizontally scrollable on narrow screens so it never wraps or overflows */}
      <div className="mb-6 -mx-1 overflow-x-auto px-1">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60 sm:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {/* Country analytics: intentionally not shown yet — see note in the Devices tab. */}
          <span
            title="Coming soon — needs IP-geolocation, not collected yet"
            className="hidden cursor-not-allowed items-center gap-1 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium text-slate-400 sm:inline-flex dark:text-slate-500"
          >
            <Globe2 size={13} /> Country
            <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">
              Soon
            </span>
          </span>
        </div>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab data={data} isLoading={isLoading} />
      )}
      {activeTab === 'users' && <UsersTab data={data} isLoading={isLoading} />}
      {activeTab === 'jobs' && <JobsTab data={data} isLoading={isLoading} />}
      {activeTab === 'revenue' && <RevenueTab data={data} isLoading={isLoading} />}
      {activeTab === 'devices' && <DevicesTab data={data} isLoading={isLoading} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function OverviewTab({ data, isLoading }: { data?: any; isLoading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Job Seekers"
          value={data?.users.totalJobseekers?.toLocaleString() ?? '—'}
          icon={<Users size={16} />}
          loading={isLoading}
        />
        <KpiCard
          label="Employers"
          value={data?.users.totalEmployers?.toLocaleString() ?? '—'}
          icon={<Briefcase size={16} />}
          loading={isLoading}
        />
        <KpiCard
          label="Total Jobs Posted"
          value={data?.jobs.totalJobs?.toLocaleString() ?? '—'}
          icon={<BarChart3 size={16} />}
          loading={isLoading}
        />
        <KpiCard
          label="Total Revenue Recorded"
          value={data ? data.revenue.totalRevenue.toLocaleString() : '—'}
          icon={<DollarSign size={16} />}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="User growth — last 90 days">
          {isLoading ? (
            <SkeletonCard className="h-56 border-0 p-0" />
          ) : !data?.users.growth?.some((d: any) => d.jobseeker || d.employer) ? (
            <EmptyState title="No signups yet" className="border-0 py-10" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.users.growth}>
                <defs>
                  <linearGradient id="jobseekerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="employerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="jobseeker" name="Job seekers" stroke="#7C3AED" fill="url(#jobseekerGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="employer" name="Employers" stroke="#2563EB" fill="url(#employerGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Job postings — last 90 days">
          {isLoading ? (
            <SkeletonCard className="h-56 border-0 p-0" />
          ) : !data?.jobs.growth?.some((d: any) => d.count) ? (
            <EmptyState title="No jobs posted yet" className="border-0 py-10" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.jobs.growth}>
                <defs>
                  <linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Jobs posted" stroke="#16A34A" fill="url(#jobsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
function UsersTab({ data, isLoading }: { data?: any; isLoading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Job Seekers" value={data?.users.totalJobseekers?.toLocaleString() ?? '—'} icon={<Users size={16} />} loading={isLoading} />
        <KpiCard label="Employers" value={data?.users.totalEmployers?.toLocaleString() ?? '—'} icon={<Briefcase size={16} />} loading={isLoading} />
      </div>

      <ChartCard title="Signups by role — last 90 days">
        {isLoading ? (
          <SkeletonCard className="h-64 border-0 p-0" />
        ) : !data?.users.growth?.some((d: any) => d.jobseeker || d.employer) ? (
          <EmptyState title="No signups yet" description="New jobseeker and employer accounts will chart here." className="border-0 py-12" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.users.growth}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="jobseeker" name="Job seekers" stackId="a" fill="#7C3AED" radius={[3, 3, 0, 0]} />
              <Bar dataKey="employer" name="Employers" stackId="a" fill="#2563EB" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
function JobsTab({ data, isLoading }: { data?: any; isLoading: boolean }) {
  const maxCategoryCount = data?.jobs.topCategories?.[0]?.count || 1;

  return (
    <div className="space-y-6">
      <div className="sm:max-w-xs">
        <KpiCard label="Total Jobs Posted" value={data?.jobs.totalJobs?.toLocaleString() ?? '—'} icon={<BarChart3 size={16} />} loading={isLoading} />
      </div>

      <ChartCard title="Job postings — last 90 days">
        {isLoading ? (
          <SkeletonCard className="h-56 border-0 p-0" />
        ) : !data?.jobs.growth?.some((d: any) => d.count) ? (
          <EmptyState title="No jobs posted yet" className="border-0 py-10" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.jobs.growth}>
              <defs>
                <linearGradient id="jobsGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Area type="monotone" dataKey="count" name="Jobs posted" stroke="#16A34A" fill="url(#jobsGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Jobs by status">
          {isLoading ? (
            <SkeletonCard className="h-40 border-0 p-0" />
          ) : !data?.jobs.byStatus?.length ? (
            <EmptyState title="No jobs yet" className="border-0 py-8" />
          ) : (
            <ul className="space-y-3">
              {data.jobs.byStatus.map((s: any) => (
                <li key={s.status} className="flex items-center justify-between">
                  <StatusBadge label={s.status} tone={statusToTone(s.status)} />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {s.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Top categories">
          {isLoading ? (
            <SkeletonCard className="h-40 border-0 p-0" />
          ) : !data?.jobs.topCategories?.length ? (
            <EmptyState title="No categories yet" className="border-0 py-8" />
          ) : (
            <ul className="space-y-3">
              {data.jobs.topCategories.map((c: any) => (
                <li key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{c.category}</span>
                    <span className="text-slate-500 dark:text-slate-400">{c.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-violet-500"
                      style={{ width: `${Math.round((c.count / maxCategoryCount) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue
// ---------------------------------------------------------------------------
function RevenueTab({ data, isLoading }: { data?: any; isLoading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="sm:max-w-xs">
        <KpiCard label="Total Revenue Recorded" value={data ? data.revenue.totalRevenue.toLocaleString() : '—'} icon={<DollarSign size={16} />} loading={isLoading} />
      </div>

      <ChartCard title="Monthly revenue — last 12 months">
        {isLoading ? (
          <SkeletonCard className="h-64 border-0 p-0" />
        ) : !data?.revenue.monthlyTrend?.some((m: any) => m.total) ? (
          <EmptyState title="No revenue recorded yet" description="Payments logged in Revenue Management will chart here." className="border-0 py-12" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.revenue.monthlyTrend}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip />
              <Bar dataKey="total" name="Revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Top employers by revenue">
        {isLoading ? (
          <SkeletonCard className="h-40 border-0 p-0" />
        ) : !data?.revenue.topEmployers?.length ? (
          <EmptyState title="No revenue yet" className="border-0 py-8" />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.revenue.topEmployers.map((e: any, i: number) => (
              <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{e.name}</span>
                <span className="text-slate-500 dark:text-slate-400">{e.total.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------
function DevicesTab({ data, isLoading }: { data?: any; isLoading: boolean }) {
  const breakdown = data?.devices.breakdown ?? [];

  return (
    <div className="space-y-6">
      <div className="sm:max-w-xs">
        <KpiCard label="Tracked Sessions" value={data?.devices.total?.toLocaleString() ?? '—'} icon={<Laptop size={16} />} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Device breakdown">
          {isLoading ? (
            <SkeletonCard className="h-56 border-0 p-0" />
          ) : breakdown.length === 0 ? (
            <EmptyState title="No login data yet" description="This fills in as users log in — based on their browser's device type." className="border-0 py-10" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="count"
                  nameKey="device"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {breakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="By device">
          {isLoading ? (
            <SkeletonCard className="h-40 border-0 p-0" />
          ) : breakdown.length === 0 ? (
            <EmptyState title="Nothing yet" className="border-0 py-8" />
          ) : (
            <ul className="space-y-3">
              {breakdown.map((d: any) => (
                <li key={d.device} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {DEVICE_ICON[d.device] ?? <Globe2 size={14} />}
                    {d.device}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{d.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-300">Country analytics</span> isn't
        included yet — the app doesn't currently collect reliable location data (that needs
        IP-geolocation, which isn't wired up). Rather than show a made-up breakdown, this section
        is left out until real geo data is available.
      </div>
    </div>
  );
}

export default AnalyticsHub;