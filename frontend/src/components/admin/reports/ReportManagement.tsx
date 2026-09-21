import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Filter,
  User,
  Briefcase,
  Share2,
  MessageSquare,
  Newspaper,
  Eye,
  Check,
  Ban,
  Trash2,
} from 'lucide-react';
import {
  getAllReports,
  getReportStats,
  resolveReport,
  ReportItem,
} from '../adminApi/api';

const TARGET_ICONS: Record<string, React.ReactNode> = {
  user: <User size={15} className="text-blue-500" />,
  job: <Briefcase size={15} className="text-emerald-500" />,
  post: <Share2 size={15} className="text-purple-500" />,
  comment: <MessageSquare size={15} className="text-amber-500" />,
  blog: <Newspaper size={15} className="text-cyan-500" />,
};

const STATUS_BADGES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
    text: 'Pending Review',
    icon: <Clock size={12} />,
  },
  reviewed: {
    bg: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
    text: 'Under Review',
    icon: <AlertTriangle size={12} />,
  },
  resolved: {
    bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    text: 'Resolved',
    icon: <CheckCircle2 size={12} />,
  },
  dismissed: {
    bg: 'bg-slate-500/15 border-slate-500/30 text-slate-500 dark:text-slate-400',
    text: 'Dismissed',
    icon: <XCircle size={12} />,
  },
};

export const ReportManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTarget = searchParams.get('targetType') || '';
  const initialStatus = searchParams.get('status') || '';

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<{ total: number; pending: number; resolved: number; dismissed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState<string>(initialTarget);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected report for action modal
  const [activeReport, setActiveReport] = useState<ReportItem | null>(null);
  const [actionType, setActionType] = useState<'warn' | 'remove_content' | 'suspend_user' | 'dismiss' | 'other'>('dismiss');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getReportStats();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllReports({
        targetType: targetFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: 15,
      });
      if (res.success) {
        setReports(res.reports);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load moderation reports');
    } finally {
      setLoading(false);
    }
  }, [targetFilter, statusFilter, search, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilterTarget = (type: string) => {
    setTargetFilter(type);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (type) newParams.set('targetType', type);
    else newParams.delete('targetType');
    setSearchParams(newParams);
  };

  const handleFilterStatus = (st: string) => {
    setStatusFilter(st);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (st) newParams.set('status', st);
    else newParams.delete('status');
    setSearchParams(newParams);
  };

  const openActionModal = (report: ReportItem) => {
    setActiveReport(report);
    setResolutionNotes('');
    if (report.targetType === 'user') {
      setActionType('warn');
    } else if (['post', 'comment', 'job', 'blog'].includes(report.targetType)) {
      setActionType('remove_content');
    } else {
      setActionType('dismiss');
    }
  };

  const submitResolution = async () => {
    if (!activeReport) return;
    setSubmittingAction(true);
    try {
      await resolveReport(activeReport._id, {
        action: actionType,
        resolutionNotes,
      });
      toast.success('Report resolved successfully and action recorded.');
      setActiveReport(null);
      fetchReports();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resolve report');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <ShieldAlert size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Moderation & Reports Hub
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Centrally review, moderate, and resolve platform reports for users, jobs, community posts, comments, and blogs.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchReports();
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Queue
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500">Total Reports</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.total ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Pending Review</span>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats?.pending ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Resolved</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats?.resolved ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500">Dismissed</span>
          <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">
            {stats?.dismissed ?? '—'}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Target Type Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: '', label: 'All Types' },
              { id: 'user', label: 'Users' },
              { id: 'job', label: 'Jobs' },
              { id: 'post', label: 'Posts' },
              { id: 'comment', label: 'Comments' },
              { id: 'blog', label: 'Blogs' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleFilterTarget(t.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  targetFilter === t.id
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: '', label: 'All Statuses' },
              { id: 'pending', label: 'Pending' },
              { id: 'reviewed', label: 'Under Review' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'dismissed', label: 'Dismissed' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => handleFilterStatus(st.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === st.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by reason, details, or reporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-orange-500" />
            Loading moderation reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Reports Found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {targetFilter || statusFilter || search
                ? 'No reports match your selected filters. Try clearing your search or status selection.'
                : 'Great work! The report moderation queue is currently clear.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {reports.map((report) => {
              const badge = STATUS_BADGES[report.status] || STATUS_BADGES.pending;

              return (
                <div
                  key={report._id}
                  className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Info */}
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {TARGET_ICONS[report.targetType]}
                          {report.targetType}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${badge.bg}`}
                        >
                          {badge.icon}
                          {badge.text}
                        </span>

                        <span className="text-xs text-slate-400">
                          Reported on {new Date(report.createdAt).toLocaleDateString()} at{' '}
                          {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Reason */}
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          Reason: {report.reason}
                        </span>
                        {report.customReason && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            &ldquo;{report.customReason}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Target Preview Snippet */}
                      {report.targetPreview && (
                        <div className="mt-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                            Flagged Item Details
                          </span>
                          {report.targetType === 'job' && (
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {report.targetPreview.title}
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                Company: {report.targetPreview.company || '—'} · Status: {report.targetPreview.status}
                              </p>
                            </div>
                          )}
                          {report.targetType === 'user' && (
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {report.targetPreview.name} ({report.targetPreview.email})
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                Role: {report.targetPreview.role} · Status: {report.targetPreview.status}
                              </p>
                            </div>
                          )}
                          {['post', 'comment'].includes(report.targetType) && (
                            <div>
                              <p className="text-slate-700 dark:text-slate-300 italic line-clamp-3">
                                &ldquo;{report.targetPreview.content || report.targetPreview.title || 'Content removed or unavailable'}&rdquo;
                              </p>
                              {report.targetPreview.author && (
                                <p className="text-slate-400 text-[11px] mt-1">
                                  Author: {report.targetPreview.author.name || report.targetPreview.author}
                                </p>
                              )}
                            </div>
                          )}
                          {report.targetType === 'blog' && (
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {report.targetPreview.title}
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                Category: {report.targetPreview.category} · Published: {String(report.targetPreview.isPublished)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reporter */}
                      <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                        <span>Reported by:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {report.reportedBy?.name || 'Anonymous user'} ({report.reportedBy?.role || 'User'})
                        </span>
                      </div>

                      {/* Resolution Log if resolved */}
                      {report.resolvedBy && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                          <span className="font-semibold">Resolved by {report.resolvedBy.name}</span>: Action: &ldquo;{report.actionTaken}&rdquo;
                          {report.resolutionNotes && <p className="mt-0.5 text-[11px] opacity-90">Note: {report.resolutionNotes}</p>}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {report.status === 'pending' || report.status === 'reviewed' ? (
                        <button
                          onClick={() => openActionModal(report)}
                          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 transition-all"
                        >
                          <Check size={14} /> Take Action
                        </button>
                      ) : (
                        <button
                          onClick={() => openActionModal(report)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        >
                          Re-open / Update
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-orange-500" size={20} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Resolve Moderation Report
                </h3>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-500">Target Type: <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{activeReport.targetType}</span></p>
                <p className="text-slate-500 mt-1">Reason: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeReport.reason}</span></p>
                {activeReport.customReason && (
                  <p className="mt-1 text-slate-600 dark:text-slate-300 italic">&ldquo;{activeReport.customReason}&rdquo;</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Select Action to Take:
                </label>
                <select
                  value={actionType}
                  onChange={(e: any) => setActionType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="dismiss">Dismiss Report (No Violation Found)</option>
                  <option value="warn">Issue Official Warning to User</option>
                  <option value="remove_content">Remove / Unpublish Flagged Content</option>
                  <option value="suspend_user">Suspend / Deactivate User Account</option>
                  <option value="other">Custom Resolution</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Resolution Notes & Audit Reason:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain why this decision was made. Will be saved to Super Admin Audit Logs..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={submitResolution}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 disabled:opacity-50"
              >
                {submittingAction ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
