import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  Building2,
  Briefcase,
  ClipboardList,
  DollarSign,
  Download,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Tags,
  Megaphone,
  LifeBuoy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { ChartCard } from '../ui/ChartCard';
import { StatusBadge, statusToTone } from '../ui/StatusBadge';
import { DataTable, type DataTableColumn } from '../ui/DataTable';
import { useAdminAuth } from '../../context/useAdminAuth';
import {
  getAdminProfile,
  getAnalyticsOverview,
  getAllApplications,
  fetchJobs,
  getAuditLogStats,
  type Job,
} from './adminApi/api';

interface AdminProfile {
  name?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

const CHART_TEAL = '#0D9488';
const CHART_BLUE = '#2563EB';
const STATUS_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  Reviewed: '#2563EB',
  Accepted: '#10B981',
  Rejected: '#EF4444',
};

/** Quick Actions — the highest-frequency admin tasks, one click away. */
const QUICK_ACTIONS = [
  { label: 'Review Applications', icon: <ClipboardCheck size={18} />, path: '/admin/applications', accent: 'blue' },
  { label: 'Verify Companies', icon: <UserCheck size={18} />, path: '/admin/employers', accent: 'teal' },
  { label: 'Manage Categories', icon: <Tags size={18} />, path: '/admin/jobcategories', accent: 'amber' },
  { label: 'Post Announcement', icon: <Megaphone size={18} />, path: '/admin/cms', accent: 'violet' },
  { label: 'Support Tickets', icon: <LifeBuoy size={18} />, path: '/admin/support', accent: 'rose' },
  { label: 'AI Center', icon: <Sparkles size={18} />, path: '/admin/ai-center', accent: 'green' },
] as const;

const QUICK_ACTION_STYLES: Record<string, string> = {
  blue: 'bg-blue-50 text-adminBlue',
  teal: 'bg-adminActive text-adminAccent',
  amber: 'bg-amber-50 text-adminWarning',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-adminDanger',
  green: 'bg-emerald-50 text-adminSuccess',
};

export const AdminDashboardV2: React.FC = () => {
  const { isSuperAdmin } = useAdminAuth();

  const { data: profile } = useQuery<AdminProfile>({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile,
    retry: false,
  });

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: getAnalyticsOverview,
    retry: false,
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['dashboardRecentApplications'],
    queryFn: () => getAllApplications({ page: 1, limit: 6 }),
    retry: false,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['dashboardRecentJobs'],
    queryFn: () => fetchJobs(1, 6),
    retry: false,
  });

  const { data: auditStats } = useQuery({
    queryKey: ['dashboardAuditStats'],
    queryFn: getAuditLogStats,
    enabled: isSuperAdmin,
    retry: false,
  });

  const firstName = profile?.name?.split(' ')[0];
  const isLoading = overviewLoading;

  const totalUsers = (overview?.users.totalJobseekers ?? 0) + (overview?.users.totalEmployers ?? 0);
  const totalApplications = appsData?.total ?? 0;
  const statusCounts = appsData?.statusCounts;

  const applicationStatusData = statusCounts
    ? (Object.entries(statusCounts) as [string, number][])
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({ name: status, value: count }))
    : [];

  const topCategories = overview?.jobs.topCategories?.slice(0, 6) ?? [];
  const maxCategoryCount = Math.max(1, ...topCategories.map((c) => c.count));

  const topCompanies = overview?.revenue.topEmployers?.slice(0, 5) ?? [];
  const maxCompanyRevenue = Math.max(1, ...topCompanies.map((c) => c.total));

  const jobColumns: DataTableColumn<Job>[] = [
    {
      key: 'title',
      header: 'Job Title',
      render: (job) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-adminText">{job.title}</p>
          <p className="truncate text-xs text-adminTextSecondary">{job.employer?.name || '—'}</p>
        </div>
      ),
    },
    { key: 'jobtype', header: 'Type', render: (job) => job.jobtype || '—' },
    { key: 'location', header: 'Location', render: (job) => job.location || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (job) => <StatusBadge label={job.status || 'Unknown'} tone={statusToTone(job.status || '')} />,
    },
    {
      key: 'createdAt',
      header: 'Posted',
      render: (job) => (job.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-admin-card border border-adminBorder bg-gradient-to-br from-white to-adminActive/30 p-6 shadow-admin-card sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-adminText sm:text-2xl">
            {getGreeting()}, {firstName || 'Admin'} 👋
          </h1>
          <p className="mt-1 text-sm text-adminTextSecondary">
            Here's what's happening across Quick Jobs today.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-adminBorder bg-white px-4 py-2.5 text-sm font-semibold text-adminText shadow-admin-sm hover:bg-adminHover"
        >
          <Download size={15} />
          Export report
        </button>
      </div>

      {overviewError && (
        <div className="rounded-admin-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-adminDanger">
          Couldn't load platform analytics. Check that you're signed in with an admin account and
          that the backend is reachable.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Users"
          value={totalUsers}
          icon={<Users size={18} />}
          loading={isLoading}
          accent="teal"
          description={`${overview?.users.totalJobseekers ?? 0} job seekers · ${overview?.users.totalEmployers ?? 0} employers`}
        />
        <KpiCard
          label="Companies"
          value={overview?.users.totalEmployers ?? 0}
          icon={<Building2 size={18} />}
          loading={isLoading}
          accent="blue"
          description="Registered employers"
        />
        <KpiCard
          label="Jobs"
          value={overview?.jobs.totalJobs ?? 0}
          icon={<Briefcase size={18} />}
          loading={isLoading}
          accent="violet"
          description="Live & historical postings"
        />
        <KpiCard
          label="Applications"
          value={totalApplications}
          icon={<ClipboardList size={18} />}
          loading={appsLoading}
          accent="amber"
          description="Across all open jobs"
        />
        <KpiCard
          label="Revenue"
          value={`$${(overview?.revenue.totalRevenue ?? 0).toLocaleString()}`}
          icon={<DollarSign size={18} />}
          loading={isLoading}
          accent="green"
          description="Total platform revenue"
        />
      </div>

      {/* Platform overview + Application status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Platform Overview" subtitle="Monthly revenue trend" loading={isLoading} height={260}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={overview?.revenue.monthlyTrend ?? []} margin={{ left: -12, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_TEAL} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="total" stroke={CHART_TEAL} strokeWidth={2.5} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Application Status" subtitle="Current pipeline" loading={appsLoading} height={260}>
          {applicationStatusData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-adminTextSecondary">
              No applications yet.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={applicationStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {applicationStatusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid w-full grid-cols-2 gap-2">
                {applicationStatusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[entry.name] || '#94A3B8' }}
                    />
                    <span className="text-adminTextSecondary">{entry.name}</span>
                    <span className="ml-auto font-semibold text-adminText">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Quick actions + System alerts + Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card">
          <h3 className="text-[15px] font-semibold text-adminText">Quick Actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="flex flex-col gap-2 rounded-xl border border-adminBorder p-3 transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-admin-card-hover"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${QUICK_ACTION_STYLES[action.accent]}`}>
                  {action.icon}
                </span>
                <span className="text-xs font-semibold leading-tight text-adminText">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card">
          <h3 className="text-[15px] font-semibold text-adminText">System Alerts</h3>
          <div className="mt-3 space-y-2.5">
            {isSuperAdmin && auditStats ? (
              <>
                {auditStats.failuresLast24h > 0 ? (
                  <AlertRow
                    tone="danger"
                    icon={<AlertTriangle size={15} />}
                    text={`${auditStats.failuresLast24h} failed action${auditStats.failuresLast24h === 1 ? '' : 's'} in the last 24h`}
                  />
                ) : (
                  <AlertRow tone="success" icon={<CheckCircle2 size={15} />} text="No failed actions in the last 24h" />
                )}
                <AlertRow
                  tone="info"
                  icon={<ShieldAlert size={15} />}
                  text={`${auditStats.totalLast24h} audit events logged today`}
                />
                <AlertRow
                  tone="info"
                  icon={<Users size={15} />}
                  text={`${auditStats.activeActorsLast24h} active admins today`}
                />
              </>
            ) : (
              <AlertRow tone="success" icon={<CheckCircle2 size={15} />} text="All systems operating normally" />
            )}
            {!isSuperAdmin && (
              <p className="pt-1 text-xs text-adminTextSecondary">
                Sign in as a super admin to see detailed security alerts.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-adminText">Recent Activity</h3>
            <Link to="/admin/applications" className="flex items-center text-xs font-semibold text-adminAccent hover:underline">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="mt-3 space-y-3.5">
            {appsLoading && (
              <p className="text-xs text-adminTextSecondary">Loading recent activity…</p>
            )}
            {!appsLoading && (appsData?.applications.length ?? 0) === 0 && (
              <p className="text-xs text-adminTextSecondary">No recent applications yet.</p>
            )}
            {appsData?.applications.slice(0, 5).map((app) => (
              <div key={app._id} className="flex items-start gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-adminAccent" />
                <p className="text-xs leading-snug text-adminText">
                  <span className="font-semibold">{app.applicant?.name || 'A candidate'}</span> applied to{' '}
                  <span className="font-semibold">{app.job?.title || 'a job'}</span>
                  <span className="mt-0.5 block text-[11px] text-adminTextSecondary">
                    {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top job categories + Top companies */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card">
          <h3 className="text-[15px] font-semibold text-adminText">Top Job Categories</h3>
          <div className="mt-4 space-y-3.5">
            {topCategories.length === 0 && (
              <p className="text-xs text-adminTextSecondary">No category data yet.</p>
            )}
            {topCategories.map((cat) => (
              <div key={cat.category}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-adminText">{cat.category}</span>
                  <span className="text-adminTextSecondary">{cat.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-adminBg">
                  <div
                    className="h-full rounded-full bg-adminAccent transition-all"
                    style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card">
          <h3 className="text-[15px] font-semibold text-adminText">Top Companies</h3>
          <div className="mt-4 space-y-1">
            {topCompanies.length === 0 && (
              <p className="text-xs text-adminTextSecondary">No revenue data yet.</p>
            )}
            {topCompanies.map((company, i) => (
              <div key={company.name} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-adminHover">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-adminBg text-xs font-bold text-adminTextSecondary">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-adminText">{company.name}</span>
                <div className="flex w-24 shrink-0 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-adminBg">
                    <div
                      className="h-full rounded-full bg-adminBlue"
                      style={{ width: `${(company.total / maxCompanyRevenue) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-adminText">${company.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User growth */}
      <ChartCard title="User Growth" subtitle="Job seekers vs. employers over time" loading={isLoading} height={260}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={overview?.users.growth ?? []} margin={{ left: -12, right: 12, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }} />
            <Line type="monotone" dataKey="jobseeker" name="Job Seekers" stroke={CHART_TEAL} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="employer" name="Employers" stroke={CHART_BLUE} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Recent jobs table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-adminText">Recent Jobs</h3>
          <Link to="/admin/jobs" className="flex items-center text-xs font-semibold text-adminAccent hover:underline">
            View all jobs <ChevronRight size={13} />
          </Link>
        </div>
        <DataTable
          columns={jobColumns}
          data={jobsData?.jobs ?? []}
          getRowKey={(job) => job._id}
          loading={jobsLoading}
          skeletonRows={5}
          emptyTitle="No jobs yet"
          emptyDescription="Once employers start posting, jobs will show up here."
        />
      </div>
    </div>
  );
};

const ALERT_TONE_CLASSES: Record<'danger' | 'success' | 'info', string> = {
  danger: 'bg-red-50 text-adminDanger',
  success: 'bg-emerald-50 text-adminSuccess',
  info: 'bg-blue-50 text-adminBlue',
};

const AlertRow: React.FC<{ tone: 'danger' | 'success' | 'info'; icon: React.ReactNode; text: string }> = ({
  tone,
  icon,
  text,
}) => (
  <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs">
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ALERT_TONE_CLASSES[tone]}`}>
      {icon}
    </span>
    <span className="text-adminText">{text}</span>
  </div>
);

export default AdminDashboardV2;