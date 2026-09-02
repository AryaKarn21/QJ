import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge, statusToTone } from '../../ui/StatusBadge';
import { Drawer } from '../../ui/Drawer';
import { KpiCard } from '../../ui/KpiCard';
import { FilterBar } from '../../ui/FilterBar';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import {
  fetchJobs,
  approveJob,
  rejectJob,
  deleteJob,
  toggleTrendingStatus,
  Job,
} from '../adminApi/api';
import { CheckCircle2, XCircle, Trash2, Briefcase, Clock, Star } from 'lucide-react';
import { toast } from 'react-toastify';

const STATUS_FILTER_CONFIG = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'Pending', value: 'Pending' },
      { label: 'Active', value: 'Active' },
      { label: 'Rejected', value: 'Rejected' },
      { label: 'Inactive', value: 'Inactive' },
      { label: 'Closed', value: 'Closed' },
    ],
  },
];

const PAGE_SIZE = 10;

const JobManagement: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [confirmDeleteJob, setConfirmDeleteJob] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingTrending, setTogglingTrending] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetchJobs(p, PAGE_SIZE, search, filters.status);
      setJobs(res.jobs);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  // Reset to page 1 whenever the search term or filters change, so you
  // can't get stranded on an empty page after narrowing the results.
  useEffect(() => { setPage(1); }, [search, filters]);

  // The single source of truth for fetching — fires on page change AND
  // on search/filter change (since that also updates `page` above).
  useEffect(() => { load(page); }, [page, load]);

  const pendingCount = jobs.filter((j) => j.status === 'Pending').length;
  const activeCount = jobs.filter((j) => j.status === 'Active').length;

  const handleApprove = async (job: Job) => {
    try {
      await approveJob(job._id);
      toast.success(`"${job.title}" approved and is now live.`);
      setSelectedJob(null);
      load(page);
    } catch (err) {
      console.error('Failed to approve job:', err);
      toast.error('Failed to approve job. Please try again.');
    }
  };

  const handleReject = async (job: Job) => {
    if (!rejectReason.trim()) return;
    try {
      await rejectJob(job._id, rejectReason);
      toast.success(`"${job.title}" rejected.`);
      setRejecting(false);
      setRejectReason('');
      setSelectedJob(null);
      load(page);
    } catch (err) {
      console.error('Failed to reject job:', err);
      toast.error('Failed to reject job. Please try again.');
    }
  };

  const handleToggleTrending = async (job: Job) => {
    setTogglingTrending(true);
    try {
      await toggleTrendingStatus(job._id, !job.istrending);
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, istrending: !j.istrending } : j)));
      setSelectedJob((prev) => (prev && prev._id === job._id ? { ...prev, istrending: !prev.istrending } : prev));
    } catch (err) {
      console.error('Failed to toggle trending:', err);
    } finally {
      setTogglingTrending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteJob) return;
    setDeleting(true);
    try {
      await deleteJob(confirmDeleteJob._id);
      setJobs((prev) => prev.filter((j) => j._id !== confirmDeleteJob._id));
      setConfirmDeleteJob(null);
      setSelectedJob(null);
    } catch (err) {
      console.error('Failed to delete job:', err);
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Job>[] = [
    {
      key: 'title',
      header: 'Job Title',
      render: (j) => (
        <div className="flex items-center gap-2">
          {j.istrending && <Star size={13} className="fill-amber-400 text-amber-400" />}
          <span className="font-medium">{j.title}</span>
        </div>
      ),
    },
    { key: 'employer', header: 'Employer', render: (j) => j.employer?.name || '—' },
    { key: 'jobtype', header: 'Type' },
    {
      key: 'status',
      header: 'Status',
      render: (j) => <StatusBadge label={j.status} tone={statusToTone(j.status)} />,
    },
    {
      key: 'actions',
      header: '',
      render: (j) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {j.status === 'Pending' && (
            <>
              <button
                onClick={() => handleApprove(j)}
                className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400"
              >
                <CheckCircle2 size={14} /> Approve
              </button>
              <button
                onClick={() => { setSelectedJob(j); setRejecting(true); }}
                className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400"
              >
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          <button
            onClick={() => setConfirmDeleteJob(j)}
            title="Delete job"
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Job Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Review, approve, and manage every job posted on the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Jobs" value={total} icon={<Briefcase size={18} />} loading={loading} />
        <KpiCard label="Awaiting Review" value={pendingCount} icon={<Clock size={18} />} accent="amber" loading={loading} />
        <KpiCard label="Active" value={activeCount} icon={<CheckCircle2 size={18} />} accent="green" loading={loading} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by job title or location…"
        filters={filters}
        filterConfigs={STATUS_FILTER_CONFIG}
        onFilterChange={(key, val) => setFilters((prev) => ({ ...prev, [key]: val }))}
        resultCount={total}
        resultLabel="job"
      />

      <DataTable
        columns={columns}
        data={jobs}
        getRowKey={(j) => j._id}
        loading={loading}
        onRowClick={(j) => setSelectedJob(j)}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No jobs found"
        emptyDescription="Try a different search or status filter."
      />

      <Drawer
        open={!!selectedJob && !rejecting}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title || ''}
        description={selectedJob?.employer?.name}
      >
        {selectedJob && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">Location:</span> {selectedJob.location}</p>
            <p><span className="font-medium">Type:</span> {selectedJob.jobtype}</p>
            <p><span className="font-medium">Category:</span> {selectedJob.jobcategory}</p>
            <p><span className="font-medium">Salary:</span> {selectedJob.salary}</p>
            <p><span className="font-medium">Openings:</span> {selectedJob.openings}</p>
            <p><span className="font-medium">Status:</span> <StatusBadge label={selectedJob.status} tone={statusToTone(selectedJob.status)} /></p>
            <p className="whitespace-pre-wrap">{selectedJob.description}</p>

            <div className="flex gap-2 pt-2">
              {selectedJob.status === 'Pending' && (
                <>
                  <button onClick={() => handleApprove(selectedJob)} className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={() => setRejecting(true)} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
                    Reject
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => handleToggleTrending(selectedJob)}
              disabled={togglingTrending}
              className={`flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium disabled:opacity-50 ${
                selectedJob.istrending
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Star size={14} className={selectedJob.istrending ? 'fill-amber-400' : ''} />
              {selectedJob.istrending ? 'Remove from Featured' : 'Mark as Featured'}
            </button>

            <button
              onClick={() => setConfirmDeleteJob(selectedJob)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 size={14} /> Delete Job
            </button>
          </div>
        )}
      </Drawer>

      <Drawer
        open={rejecting}
        onClose={() => { setRejecting(false); setRejectReason(''); }}
        title="Reject job posting"
        description="This reason is sent to the employer."
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Salary range is missing, description looks incomplete…"
          className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          rows={4}
        />
        <button
          onClick={() => selectedJob && handleReject(selectedJob)}
          disabled={!rejectReason.trim()}
          className="mt-3 w-full rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Confirm Rejection
        </button>
      </Drawer>

      <ConfirmDialog
        open={!!confirmDeleteJob}
        onClose={() => setConfirmDeleteJob(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete "${confirmDeleteJob?.title}"?`}
        description="This job posting and its data will be permanently removed. This cannot be undone."
        confirmLabel="Delete Job"
        variant="danger"
      />
    </div>
  );
};

export default JobManagement;