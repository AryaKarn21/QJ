/**
 * PATH: src/components/employer/dashboard/Dashboard.tsx
 *
 * Quick Jobs — Employer Dashboard
 * Recolored to #F97316 (confirmed the real Admin Sidebar accent — see
 * components/layout/Sidebar.tsx — and already used in Profile.tsx/
 * Settings.tsx). All business logic & API calls preserved.
 *
 * Two KPI cards changed from the original paste: "Shortlisted" and
 * "Interviews Scheduled" referenced stats.shortlistedCount /
 * stats.interviewCount, which don't exist anywhere in the Application
 * model (status enum is only Pending/Reviewed/Accepted/Rejected — see
 * backend/models/Application.js) or in getEmployerDashboardStats's
 * response. Rather than ship two KPI cards that always show 0, they're
 * replaced with "Pending Applications" and "Profile Views" — both real,
 * already-computed fields from the same stats endpoint.
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Briefcase, FileText, Eye, TrendingUp, TrendingDown,
  Clock, ArrowRight, Layers, Users,
} from 'lucide-react';
import {
  getAllApplicants,
  getEmployerDashboardStats,
  getEmployerNotifications,
} from '../employerApi/api';
import { CommunityPostsPreview } from '../../community/CommunityPostsPreview';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';
const MEDIA_URL    = import.meta.env.VITE_MEDIA_URL    || API_BASE_URL;

const T = {
  bg:      '#FFF8F3',
  card:    '#FFFFFF',
  border:  '#E5E7EB',
  active:  '#FFEDD5',
  accent:  '#F97316',
  text:    '#111827',
  muted:   '#64748B',
  radius:  20,
  shadow:  '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06)',
};

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: T.card, borderRadius: T.radius, boxShadow: T.shadow, border: `1px solid ${T.border}`, overflow: 'hidden', ...style }}>
    {children}
  </div>
);

const CardHeader: React.FC<{ title: string; sub?: string; action?: React.ReactNode }> = ({ title, sub, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0' }}>
    <div>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

const statusStyle: Record<string, { bg: string; color: string }> = {
  Pending:  { bg: '#FFFBEB', color: '#D97706' },
  Reviewed: { bg: '#EFF6FF', color: '#2563EB' },
  Accepted: { bg: '#ECFDF5', color: '#059669' },
  Rejected: { bg: '#FFF1F2', color: '#DC2626' },
};

const Badge: React.FC<{ status: string }> = ({ status }) => {
  const s = statusStyle[status] ?? { bg: '#F1F5F9', color: '#64748B' };
  return (
    <span style={{ ...s, padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, display: 'inline-block' }}>
      {status}
    </span>
  );
};

interface KPIProps {
  label: string; value: string | number; growth?: number;
  desc: string; icon: React.ReactNode;
  iconBg: string; iconColor: string; accentColor: string;
}
const KPICard: React.FC<KPIProps> = ({ label, value, growth, desc, icon, iconBg, iconColor, accentColor }) => (
  <div style={{
    background: T.card, borderRadius: T.radius, boxShadow: T.shadow,
    border: `1px solid ${T.border}`, padding: 20, cursor: 'pointer',
    transition: 'all .18s', position: 'relative', overflow: 'hidden',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,.1)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = T.shadow; }}
  >
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: accentColor }} />
    <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 20 }}>
      {icon}
    </div>
    <div style={{ fontSize: 12, color: T.muted, fontWeight: 500, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1 }}>{value ?? '--'}</div>
    {growth !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, fontWeight: 600, color: growth >= 0 ? '#10B981' : '#EF4444' }}>
        {growth >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {Math.abs(growth)}% vs last month
      </div>
    )}
    <div style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>{desc}</div>
  </div>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontSize: 12, color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats]               = useState<any>({});
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const limit = 5;

  const { data: notifications = [] } = useQuery({
    queryKey: ['employerNotifications'],
    queryFn: getEmployerNotifications,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getEmployerDashboardStats();
        setStats(data);
      } catch (err) { console.error('Stats error:', err); }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchApps = async () => {
  try {
    const res = await getAllApplicants(page, limit);

    // Backend returns grouped data: [{ jobTitle, jobId, applicants: [...] }]
    // Flatten into a single list for the dashboard table
    const grouped: any[] = res.data || res.applications || [];

    const mapped: any[] = [];
    grouped.forEach((group: any) => {
      // Each group has jobTitle and applicants array
      const jobTitle = group.jobTitle || group.job?.title || '—';
      const applicants = group.applicants || [];
      applicants.forEach((a: any) => {
        mapped.push({
          id:        a.applicationId || a._id,
          name:      a.applicant?.name || 'Unknown',
          email:     a.applicant?.email || '',
          position:  jobTitle,
          avatar:    a.applicant?.profilePic || '',
          resume:    a.resume || '',
          appliedAt: a.appliedAt || a.createdAt || '',
          status:    a.status || 'Pending',
        });
      });
    });

    setApplications(mapped);
    setTotalPages(res.totalPages || 1);
  } catch (err) { console.error('Applications error:', err); }
};
    fetchApps();
  }, [page]);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const today    = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const QUICK_ACTIONS = [
    { icon: '💼', bg: '#FFF7ED', label: 'Post New Job',    sub: 'Create a listing',   path: '/employer/postjob'    },
    { icon: '👥', bg: '#ECFDF5', label: 'View Applicants', sub: 'Review submissions', path: '/employer/applicants' },
    { icon: '📊', bg: '#FFFBEB', label: 'Analytics',       sub: 'Insights & reports', path: '/employer/insight'    },
    { icon: '🏢', bg: '#F5F3FF', label: 'Company Profile', sub: 'Update info',        path: '/employer/profile'    },
    { icon: '📅', bg: '#FFF1F2', label: 'Interviews',      sub: 'Scheduled sessions', path: '/employer/interviews' },
    { icon: '⚡', bg: '#FFEDD5', label: 'Manage Jobs',     sub: 'Edit & close jobs',  path: '/employer/joblist'    },
  ];

  return (
    <div style={{ padding: 28, maxWidth: 1440, fontFamily: "'Inter', sans-serif" }}>

      <div style={{
        background: 'linear-gradient(135deg,#F59E0B 0%,#F97316 60%,#EA580C 100%)',
        borderRadius: T.radius, padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, position: 'relative', overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(249,115,22,.25)',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{greeting}, Employer 👋</h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.75)' }}>Here's your hiring activity — {today}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1 }} className="welcome-stats-row">
          {[
            { val: stats.jobsPostedCount ?? '--', lbl: 'Jobs Posted' },
            { val: stats.totalApplicationsCount ?? '--', lbl: 'Total Applications' },
            { val: stats.activeJobsCount ?? '--', lbl: 'Active Jobs' },
            { val: stats.employeeCount ?? '--', lbl: 'Employees' },
          ].map(s => (
            <div key={s.lbl} style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '14px 20px', textAlign: 'center', border: '1px solid rgba(255,255,255,.2)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }} className="kpi-grid-employer">
        <KPICard label="Active Jobs"          value={stats.activeJobsCount ?? 0}        desc="Currently accepting applications" icon={<Briefcase size={20} />} iconBg="#FFF7ED" iconColor="#F97316" accentColor="linear-gradient(90deg,#F97316,#FDBA74)" />
        <KPICard label="Total Applications"   value={stats.totalApplicationsCount ?? 0} desc="Across all job listings"           icon={<FileText size={20} />}  iconBg="#F5F3FF" iconColor="#8B5CF6" accentColor="linear-gradient(90deg,#8B5CF6,#C4B5FD)" />
        <KPICard label="Pending Applications" value={stats.pendingApplications ?? 0}    desc="Awaiting your review"              icon={<Clock size={20} />}     iconBg="#FFFBEB" iconColor="#F59E0B" accentColor="linear-gradient(90deg,#F59E0B,#FCD34D)" />
        <KPICard label="Employees"            value={stats.employeeCount ?? 0}          desc="Active employees in your company"  icon={<Users size={20} />}     iconBg="#EFF6FF" iconColor="#2563EB" accentColor="linear-gradient(90deg,#2563EB,#93C5FD)" />
        <KPICard label="Profile Views"        value={stats.profileViews ?? 0}           desc="Candidate profile visits"          icon={<Eye size={20} />}       iconBg="#ECFDF5" iconColor="#10B981" accentColor="linear-gradient(90deg,#10B981,#34D399)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }} className="grid-2-employer">
        <Card>
          <CardHeader title="Applications Snapshot" sub="Current totals — live" action={
            <button onClick={() => navigate('/employer/applicants')} style={{ fontSize: 12, fontWeight: 600, color: T.accent, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              View all <ArrowRight size={13} />
            </button>
          } />
          <div style={{ padding: '12px 16px 20px', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[{
                  name: 'This account',
                  total: stats.totalApplicationsCount ?? 0,
                  pending: stats.pendingApplications ?? 0,
                }]}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total" name="Total Applications" fill="#F97316" radius={[6, 6, 0, 0]} maxBarSize={64} />
                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Job Portfolio" sub="Active vs. total postings" />
          <div style={{ padding: '12px 16px 20px', height: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF7ED', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Briefcase size={20} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{stats.jobsPostedCount ?? 0}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Total jobs posted (lifetime)</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Layers size={20} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{stats.activeJobsCount ?? 0}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Currently active</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }} className="grid-2-employer">
        <Card>
          <CardHeader title="Quick Actions" sub="Common employer tasks" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 20px 20px' }}>
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => navigate(a.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#FAFAFA', transition: 'all .15s', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FFF7ED'; el.style.borderColor = '#F97316'; el.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FAFAFA'; el.style.borderColor = '#E5E7EB'; el.style.transform = 'none'; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{a.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" sub="Recent activity alerts" action={
            <span style={{ fontSize: 11, background: '#FFF7ED', color: '#F97316', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{notifications.length} new</span>
          } />
          <div style={{ padding: '8px 20px 16px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <p style={{ fontSize: 13, color: T.muted }}>No new notifications</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(notifications as any[]).slice(0, 5).map((n: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < Math.min(4, notifications.length - 1) ? '1px solid #F1F5F9' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FFF7ED', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>📋</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: T.text, lineHeight: 1.45, margin: 0 }}>{n.message || 'New activity'}</p>
                      <p style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{n.createdAt ? format(new Date(n.createdAt), 'MMM d, h:mm a') : 'Recently'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Community posts preview */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>Community</h2>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            Latest posts from the professional community
          </p>
        </div>
        <CommunityPostsPreview variant="employer" limit={3} />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Recent Applications</h2>
            <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Latest candidate submissions across all jobs</p>
          </div>
          <button onClick={() => navigate('/employer/applicants')} style={{ fontSize: 12, fontWeight: 600, color: T.accent, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            View all <ArrowRight size={13} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                {['Candidate', 'Position', 'Applied', 'Status', 'Resume'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    <p style={{ fontSize: 13, color: T.muted }}>No applications yet. Post a job to start receiving candidates.</p>
                    <button onClick={() => navigate('/employer/postjob')} style={{ marginTop: 12, padding: '8px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Post a Job
                    </button>
                  </td>
                </tr>
              ) : (
                applications.map((app, i) => (
                  <tr key={app.id || i} style={{ transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFC'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {app.avatar ? (
                          <img src={`${MEDIA_URL.replace(/\/$/, "")}/${app.avatar.replace(/^\//, "")}`} alt={app.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB', flexShrink: 0 }} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#FDBA74,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 }}>
                            {app.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{app.name}</div>
                          <div style={{ fontSize: 11.5, color: T.muted }}>{app.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: T.text, borderBottom: '1px solid #E5E7EB' }}>{app.position}</td>
                    <td style={{ padding: '11px 16px', fontSize: 12.5, color: T.muted, borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                      {app.appliedAt ? format(new Date(app.appliedAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #E5E7EB' }}>
                      <Badge status={app.status} />
                    </td>
                    <td style={{ padding: '11px 16px', borderBottom: '1px solid #E5E7EB' }}>
                      {app.resume ? (
                        <a href={`${MEDIA_URL.replace(/\/$/, "")}/${app.resume.replace(/^\//, "")}`} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: T.accent, textDecoration: 'none' }}>
                          <Eye size={13} /> View
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: T.muted }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: 12.5, color: T.muted }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  style={{ width: 32, height: 32, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', transition: 'all .15s', background: page === i + 1 ? T.active : '#FAFAFA', borderColor: page === i + 1 ? T.accent : '#E5E7EB', color: page === i + 1 ? T.accent : T.muted, fontWeight: page === i + 1 ? 700 : 500 }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <style>{`
        @media (max-width: 1400px) { .kpi-grid-employer { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 1200px) { .kpi-grid-employer { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 900px)  { .grid-2-employer { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px)  { .welcome-stats-row { display: none !important; } }
        @media (max-width: 640px)  { .kpi-grid-employer { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default Dashboard;