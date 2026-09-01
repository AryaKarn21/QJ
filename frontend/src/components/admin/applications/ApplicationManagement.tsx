import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Columns3,
  Download,
  Eye,
  List as ListIcon,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';
import { KpiCard } from '../../ui/KpiCard';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { StatusBadge, StatusTone } from '../../ui/StatusBadge';
import { EmptyState } from '../../ui/EmptyState';
import { AdminApplication, getAllApplications, updateApplicationStatus } from '../adminApi/api';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

/** Same resume-path normalization already used elsewhere in the app (employer Applicants pages). */
function resumeUrl(resumePath: string) {
  return `${MEDIA_URL.replace(/\/$/, '')}/${resumePath.replace(/\\/g, '/').replace(/^.*\/uploads/, 'uploads')}`;
}

const STATUS_OPTIONS = ['All', 'Pending', 'Reviewed', 'Accepted', 'Rejected'] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

const STATUS_TONE: Record<string, StatusTone> = {
  Pending: 'warning',
  Reviewed: 'info',
  Accepted: 'success',
  Rejected: 'danger',
};

const STATUS_FLOW: Record<string, string[]> = {
  Pending: ['Reviewed', 'Rejected'],
  Reviewed: ['Accepted', 'Rejected'],
  Accepted: ['Rejected'],
  Rejected: ['Reviewed'],
};

export const ApplicationManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminApplication | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminApplications', status, search, page],
    queryFn: () => getAllApplications({ page, limit: 10, status: status === 'All' ? undefined : status, search }),
    retry: false,
  });

  const applications = data?.applications ?? [];
  const counts = data?.statusCounts;

  const handleStatusChange = async (app: AdminApplication, newStatus: string) => {
    setUpdatingId(app._id);
    try {
      await updateApplicationStatus(app._id, newStatus);
      await queryClient.invalidateQueries({ queryKey: ['adminApplications'] });
      if (selected?._id === app._id) {
        setSelected({ ...app, status: newStatus as AdminApplication['status'] });
      }
    } catch {
      // Best-effort: a toast system isn't wired up yet — silently ignore, the
      // table just won't reflect the change and the admin can retry.
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: DataTableColumn<AdminApplication>[] = [
    {
      key: 'applicant',
      header: 'Candidate',
      render: (app) => (
        <div className="flex items-center gap-2.5">
          {app.applicant?.profilePic ? (
            <img src={resumeUrl(app.applicant.profilePic)} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
              <UserRound size={14} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">
              {app.applicant?.name ?? 'Deleted user'}
            </p>
            <p className="truncate text-xs text-slate-400">{app.applicant?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'job',
      header: 'Applied For',
      render: (app) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
            {app.job?.title ?? 'Job removed'}
          </p>
          {app.job?.employer?.name && (
            <p className="truncate text-xs text-slate-400">{app.job.employer.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Applied On',
      render: (app) => (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
          {new Date(app.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (app) => <StatusBadge label={app.status} tone={STATUS_TONE[app.status] ?? 'neutral'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (app) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelected(app);
          }}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Eye size={13} /> View
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Application Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every application across every employer — review, track, and move candidates through the pipeline.
          </p>
        </div>

        {/* View toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ListIcon size={14} /> List
          </button>
          <button
            onClick={() => setView('pipeline')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === 'pipeline'
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Columns3 size={14} /> Pipeline
          </button>
        </div>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load applications. Make sure the backend is running and you're signed in as an admin or superadmin.
        </div>
      )}

      {/* KPI summary — always reflects totals across ALL applications, not just the current filter/page */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Pending" value={counts?.Pending ?? '—'} icon={<Clock size={16} />} loading={isLoading} accent="amber" />
        <KpiCard label="Reviewed" value={counts?.Reviewed ?? '—'} icon={<Eye size={16} />} loading={isLoading} accent="blue" />
        <KpiCard label="Accepted" value={counts?.Accepted ?? '—'} icon={<CheckCircle2 size={16} />} loading={isLoading} accent="green" />
        <KpiCard label="Rejected" value={counts?.Rejected ?? '—'} icon={<XCircle size={16} />} loading={isLoading} accent="rose" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search candidate or job title…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-violet-500/20"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <DataTable
          columns={columns}
          data={applications}
          getRowKey={(a) => a._id}
          loading={isLoading}
          onRowClick={(a) => setSelected(a)}
          emptyTitle="No applications found"
          emptyDescription="Try a different search or status filter."
          page={data?.page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
        />
      ) : (
        <PipelineBoard
          applications={applications}
          isLoading={isLoading}
          onSelect={setSelected}
          onStatusChange={handleStatusChange}
          updatingId={updatingId}
        />
      )}

      <ApplicationDrawer
        application={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        updating={updatingId === selected?._id}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Pipeline (kanban-style) board
// ---------------------------------------------------------------------------
function PipelineBoard({
  applications,
  isLoading,
  onSelect,
  onStatusChange,
  updatingId,
}: {
  applications: AdminApplication[];
  isLoading: boolean;
  onSelect: (a: AdminApplication) => void;
  onStatusChange: (a: AdminApplication, status: string) => void;
  updatingId: string | null;
}) {
  const columns: { status: AdminApplication['status']; label: string }[] = [
    { status: 'Pending', label: 'Pending' },
    { status: 'Reviewed', label: 'Reviewed' },
    { status: 'Accepted', label: 'Accepted' },
    { status: 'Rejected', label: 'Rejected' },
  ];

  if (!isLoading && applications.length === 0) {
    return <EmptyState title="No applications on this page" description="Try a different search or status filter." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => {
        const items = applications.filter((a) => a.status === col.status);
        return (
          <div key={col.status} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="mb-3 flex items-center justify-between px-1">
              <StatusBadge label={col.label} tone={STATUS_TONE[col.status]} />
              <span className="text-xs font-medium text-slate-400">{items.length}</span>
            </div>

            <div className="space-y-2">
              {isLoading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ))}

              {!isLoading &&
                items.map((app) => (
                  <div
                    key={app._id}
                    onClick={() => onSelect(app)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                  >
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {app.applicant?.name ?? 'Deleted user'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{app.job?.title ?? 'Job removed'}</p>

                    {STATUS_FLOW[app.status]?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {STATUS_FLOW[app.status].map((next) => (
                          <button
                            key={next}
                            disabled={updatingId === app._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(app, next);
                            }}
                            className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            → {next}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer — resume viewer + cover letter + status actions
// ---------------------------------------------------------------------------
function ApplicationDrawer({
  application,
  onClose,
  onStatusChange,
  updating,
}: {
  application: AdminApplication | null;
  onClose: () => void;
  onStatusChange: (a: AdminApplication, status: string) => void;
  updating: boolean;
}) {
  const isPdf = application?.resume?.toLowerCase().endsWith('.pdf');

  return (
    <Drawer
      open={!!application}
      onClose={onClose}
      title={application?.applicant?.name ?? 'Application'}
      description={application?.job?.title}
      widthClassName="max-w-lg"
    >
      {application && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <StatusBadge label={application.status} tone={STATUS_TONE[application.status]} />
            <div className="flex gap-1.5">
              {STATUS_FLOW[application.status]?.map((next) => (
                <button
                  key={next}
                  disabled={updating}
                  onClick={() => onStatusChange(application, next)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Move to {next}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Applied for</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
              <Briefcase size={14} /> {application.job?.title ?? 'Job removed'}
            </p>
            {application.job?.employer?.name && (
              <p className="mt-0.5 text-xs text-slate-400">{application.job.employer.name}</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Applied on {new Date(application.createdAt).toLocaleString()}
            </p>
          </div>

          {application.howDidYouHear && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">How they heard about this job</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{application.howDidYouHear}</p>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Cover letter</p>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {application.coverLetter}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Resume</p>
              <a
                href={resumeUrl(application.resume)}
                download
                className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                <Download size={13} /> Download
              </a>
            </div>

            {isPdf ? (
              <iframe
                src={resumeUrl(application.resume)}
                title="Resume preview"
                className="h-80 w-full rounded-lg border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <a
                href={resumeUrl(application.resume)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-violet-600 hover:bg-slate-50 dark:border-slate-700 dark:text-violet-400 dark:hover:bg-slate-800"
              >
                <Eye size={14} /> Open resume in a new tab
              </a>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default ApplicationManagement;