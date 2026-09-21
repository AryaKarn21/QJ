import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge, statusToTone } from '../../ui/StatusBadge';
import { Drawer } from '../../ui/Drawer';
import { KpiCard } from '../../ui/KpiCard';
import { FilterBar } from '../../ui/FilterBar';
import { BulkActionsBar } from '../../ui/BulkActionsBar';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import {
  fetchJobs,
  approveJob,
  rejectJob,
  deleteJob,
  toggleTrendingStatus,
  createAdminJob,
  updateJob,
  updateJobStatus,
  bulkJobAction,
  getJobCategories,
  Job,
  JobCategory,
} from '../adminApi/api';
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Briefcase,
  Clock,
  Star,
  Pencil,
  Plus,
  Power,
  PowerOff,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Tag,
  Layers,
} from 'lucide-react';
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
      { label: 'Draft', value: 'Draft' },
    ],
  },
];

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Temporary'];
const LEVELS = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Director', 'Executive'];
const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];
const SALARY_PERIODS = ['Monthly', 'Yearly', 'Hourly'];
const CURRENCIES = ['NPR', 'USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD'];
const COUNTRIES = ['Nepal', 'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'Singapore', 'UAE'];

const PAGE_SIZE = 10;

interface JobFormData {
  _id?: string;
  title: string;
  employerName?: string;
  companyOverrideName?: string;
  location: string;
  country: string;
  jobtype: string;
  jobcategory: string;
  level: string;
  workMode: string;
  deadline: string;
  openings: number | string;
  status: string;
  salaryMin: number | string;
  salaryMax: number | string;
  salaryPeriod: string;
  currency: string;
  salary: string;
  minExperience: number | string;
  maxExperience: number | string;
  experience: string;
  description: string;
  overview: string;
  responsibilities: string;
  requirements: string;
  requiredSkills: string;
  benefits: string;
}

const INITIAL_JOB_FORM: JobFormData = {
  title: '',
  location: '',
  country: 'Nepal',
  jobtype: 'Full-time',
  jobcategory: '',
  level: 'Mid Level',
  workMode: 'On-site',
  deadline: '',
  openings: 1,
  status: 'Active',
  salaryMin: '',
  salaryMax: '',
  salaryPeriod: 'Monthly',
  currency: 'NPR',
  salary: '',
  minExperience: '',
  maxExperience: '',
  experience: '',
  description: '',
  overview: '',
  responsibilities: '',
  requirements: '',
  requiredSkills: '',
  benefits: '',
};

const JobManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status');
  const urlAction = searchParams.get('action');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Edit / Create modal state
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobForm, setJobForm] = useState<JobFormData>(INITIAL_JOB_FORM);
  const [savingJob, setSavingJob] = useState(false);

  useEffect(() => {
    if (urlStatus) {
      const lower = urlStatus.toLowerCase();
      const mapped = lower === 'active' ? 'Active'
        : lower === 'pending' ? 'Pending'
        : lower === 'expired' || lower === 'closed' ? 'Closed'
        : urlStatus;
      setFilters((prev) => ({ ...prev, status: mapped }));
    }
    if (urlAction === 'create') {
      setIsCreatingJob(true);
      setJobForm(INITIAL_JOB_FORM);
      setFormDrawerOpen(true);
    }
  }, [urlStatus, urlAction]);

  const handleToggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(jobs.map((j) => j._id)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedKeys);
    if (!ids.length) return;
    try {
      await bulkJobAction(action, ids);
      toast.success(`Bulk ${action} executed for ${ids.length} job(s)`);
      setSelectedKeys(new Set());
      load(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to execute bulk ${action}`);
    }
  };

  useEffect(() => {
    getJobCategories()
      .then((res: any) => {
        if (Array.isArray(res)) setCategories(res);
        else if (res?.categories) setCategories(res.categories);
      })
      .catch((err) => console.error('Failed to load job categories:', err));
  }, []);

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
  }, [search, filters]);

  useEffect(() => { setPage(1); }, [search, filters]);
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
      toast.success(job.istrending ? 'Removed from featured jobs.' : 'Marked as featured job.');
    } catch (err) {
      console.error('Failed to toggle trending:', err);
      toast.error('Failed to update featured status.');
    } finally {
      setTogglingTrending(false);
    }
  };

  const handleToggleStatus = async (job: Job, targetStatus: string) => {
    try {
      await updateJobStatus(job._id, targetStatus);
      toast.success(`Job marked as ${targetStatus}.`);
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, status: targetStatus } : j)));
      setSelectedJob((prev) => (prev && prev._id === job._id ? { ...prev, status: targetStatus } : prev));
    } catch (err) {
      console.error('Failed to update job status:', err);
      toast.error('Failed to update job status.');
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
      toast.success('Job listing deleted successfully.');
    } catch (err) {
      console.error('Failed to delete job:', err);
      toast.error('Failed to delete job.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (job: Job) => {
    setIsCreatingJob(false);
    setJobForm({
      _id: job._id,
      title: job.title || '',
      employerName: job.employer?.name || '',
      companyOverrideName: job.companyOverride?.name || '',
      location: job.location || '',
      country: job.country || 'Nepal',
      jobtype: job.jobtype || 'Full-time',
      jobcategory: job.jobcategory || (categories[0]?.name || ''),
      level: job.level || 'Mid Level',
      workMode: job.workMode || 'On-site',
      deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
      openings: job.openings || 1,
      status: job.status || 'Active',
      salaryMin: job.salaryMin !== undefined ? job.salaryMin : '',
      salaryMax: job.salaryMax !== undefined ? job.salaryMax : '',
      salaryPeriod: job.salaryPeriod || 'Monthly',
      currency: job.currency || 'NPR',
      salary: job.salary || '',
      minExperience: job.minExperience !== undefined ? job.minExperience : '',
      maxExperience: job.maxExperience !== undefined ? job.maxExperience : '',
      experience: job.experience || '',
      description: job.description || '',
      overview: job.overview || '',
      responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : '',
      requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : '',
      requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : '',
      benefits: Array.isArray(job.benefits) ? job.benefits.join(', ') : '',
    });
    setFormDrawerOpen(true);
  };

  const handleOpenCreate = () => {
    setIsCreatingJob(true);
    setJobForm({
      ...INITIAL_JOB_FORM,
      jobcategory: categories[0]?.name || '',
    });
    setFormDrawerOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      toast.error('Job title is required.');
      return;
    }
    setSavingJob(true);
    try {
      const payload: any = {
        title: jobForm.title.trim(),
        location: jobForm.location.trim(),
        country: jobForm.country,
        jobtype: jobForm.jobtype,
        jobcategory: jobForm.jobcategory,
        level: jobForm.level,
        workMode: jobForm.workMode,
        openings: Number(jobForm.openings) || 1,
        status: jobForm.status,
        description: jobForm.description.trim(),
        overview: jobForm.overview.trim() || undefined,
        responsibilities: jobForm.responsibilities ? jobForm.responsibilities.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
        requirements: jobForm.requirements ? jobForm.requirements.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
        requiredSkills: jobForm.requiredSkills ? jobForm.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        benefits: jobForm.benefits ? jobForm.benefits.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };

      if (jobForm.deadline) {
        payload.deadline = new Date(jobForm.deadline).toISOString();
      }
      if (jobForm.salaryMin !== '') payload.salaryMin = Number(jobForm.salaryMin);
      if (jobForm.salaryMax !== '') payload.salaryMax = Number(jobForm.salaryMax);
      if (jobForm.salaryPeriod) payload.salaryPeriod = jobForm.salaryPeriod;
      if (jobForm.currency) payload.currency = jobForm.currency;
      if (jobForm.salary) payload.salary = jobForm.salary;
      if (jobForm.minExperience !== '') payload.minExperience = Number(jobForm.minExperience);
      if (jobForm.maxExperience !== '') payload.maxExperience = Number(jobForm.maxExperience);
      if (jobForm.experience) payload.experience = jobForm.experience;
      if (jobForm.companyOverrideName?.trim()) {
        payload.companyOverride = { name: jobForm.companyOverrideName.trim() };
      }

      if (isCreatingJob) {
        await createAdminJob(payload);
        toast.success('Job listing created successfully.');
      } else if (jobForm._id) {
        await updateJob(jobForm._id, payload);
        toast.success('Job listing updated successfully.');
      }
      setFormDrawerOpen(false);
      setSelectedJob(null);
      load(page);
    } catch (err: any) {
      console.error('Error saving job:', err);
      toast.error(err?.response?.data?.message || 'Failed to save job.');
    } finally {
      setSavingJob(false);
    }
  };

  const columns: DataTableColumn<Job>[] = [
    {
      key: 'title',
      header: 'Job Title',
      render: (j) => (
        <div className="flex items-center gap-2">
          {j.istrending && <Star size={13} className="fill-amber-400 text-amber-400 shrink-0" />}
          <span className="font-medium text-slate-900 dark:text-slate-100">{j.title}</span>
        </div>
      ),
    },
    { key: 'employer', header: 'Company / Employer', render: (j) => j.companyOverride?.name || j.employer?.name || '—' },
    { key: 'jobtype', header: 'Type' },
    {
      key: 'status',
      header: 'Status',
      render: (j) => <StatusBadge label={j.status} tone={statusToTone(j.status)} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (j) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {j.status === 'Pending' && (
            <>
              <button
                onClick={() => handleApprove(j)}
                className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400"
              >
                <CheckCircle2 size={13} /> Approve
              </button>
              <button
                onClick={() => { setSelectedJob(j); setRejecting(true); }}
                className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400"
              >
                <XCircle size={13} /> Reject
              </button>
            </>
          )}

          {j.status === 'Active' ? (
            <button
              onClick={() => handleToggleStatus(j, 'Inactive')}
              title="Deactivate job"
              className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400"
            >
              <PowerOff size={13} /> Deactivate
            </button>
          ) : (j.status === 'Inactive' || j.status === 'Closed') ? (
            <button
              onClick={() => handleToggleStatus(j, 'Active')}
              title="Activate job"
              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400"
            >
              <Power size={13} /> Activate
            </button>
          ) : null}

          <button
            onClick={() => handleOpenEdit(j)}
            title="Edit job"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800 dark:hover:text-primary"
          >
            <Pencil size={14} />
          </button>

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Job Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review, create, edit, activate/deactivate, and manage every job listing on QuickJobs.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          <Plus size={16} /> Post New Job
        </button>
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

      {selectedKeys.size > 0 && (
        <BulkActionsBar
          selectedIds={Array.from(selectedKeys)}
          onClearSelection={() => setSelectedKeys(new Set())}
          entityLabel="job"
          actions={[
            {
              label: 'Approve',
              icon: <CheckCircle2 size={13} />,
              onClick: () => handleBulkAction('approve'),
            },
            {
              label: 'Reject',
              icon: <XCircle size={13} />,
              onClick: () => handleBulkAction('reject'),
            },
            {
              label: 'Feature',
              icon: <Star size={13} />,
              onClick: () => handleBulkAction('feature'),
            },
            {
              label: 'Delete',
              variant: 'danger',
              icon: <Trash2 size={13} />,
              onClick: () => {
                if (window.confirm(`Permanently delete ${selectedKeys.size} selected job(s)?`)) {
                  handleBulkAction('delete');
                }
              },
            },
          ]}
        />
      )}

      <DataTable
        columns={columns}
        data={jobs}
        getRowKey={(j) => j._id}
        loading={loading}
        onRowClick={(j) => setSelectedJob(j)}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        selectable={true}
        selectedKeys={selectedKeys}
        onToggleRow={handleToggleRow}
        onToggleAll={handleToggleAll}
        emptyTitle="No jobs found"
        emptyDescription="Try a different search or status filter."
      />

      {/* Details View Drawer */}
      <Drawer
        open={!!selectedJob && !rejecting && !formDrawerOpen}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title || ''}
        description={selectedJob?.companyOverride?.name || selectedJob?.employer?.name}
      >
        {selectedJob && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <div>
                <span className="text-xs text-slate-400">Status</span>
                <div className="mt-0.5"><StatusBadge label={selectedJob.status} tone={statusToTone(selectedJob.status)} /></div>
              </div>
              <div>
                <span className="text-xs text-slate-400">Type</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedJob.jobtype}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Location</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedJob.location || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Category</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedJob.jobcategory || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Salary</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedJob.salary || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Openings</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedJob.openings || 1}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Description</h3>
              <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-400">{selectedJob.description}</p>
            </div>

            {selectedJob.requirements?.length ? (
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Requirements</h3>
                <ul className="mt-1 list-inside list-disc text-slate-600 dark:text-slate-400">
                  {selectedJob.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {selectedJob.responsibilities?.length ? (
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Responsibilities</h3>
                <ul className="mt-1 list-inside list-disc text-slate-600 dark:text-slate-400">
                  {selectedJob.responsibilities.map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleOpenEdit(selectedJob)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                <Pencil size={14} /> Edit Job Information
              </button>

              {selectedJob.status === 'Pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(selectedJob)} className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={() => setRejecting(true)} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
                    Reject
                  </button>
                </div>
              )}

              {selectedJob.status === 'Active' ? (
                <button
                  onClick={() => handleToggleStatus(selectedJob, 'Inactive')}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-50 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400"
                >
                  <PowerOff size={14} /> Deactivate Listing
                </button>
              ) : (
                <button
                  onClick={() => handleToggleStatus(selectedJob, 'Active')}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-green-50 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400"
                >
                  <Power size={14} /> Activate Listing
                </button>
              )}

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
                <Trash2 size={14} /> Delete Job Listing
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit / Create Job Drawer */}
      <Drawer
        open={formDrawerOpen}
        onClose={() => setFormDrawerOpen(false)}
        title={isCreatingJob ? 'Post New Job' : `Edit Job: ${jobForm.title}`}
        description={isCreatingJob ? 'Create a job listing on behalf of any employer or platform' : 'Modify job details, requirements, compensation, and status'}
        widthClassName="max-w-2xl"
      >
        <form onSubmit={handleSaveJob} className="space-y-4 text-sm pb-12">
          {/* Title & Company */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Name / Display Override
              </label>
              <input
                type="text"
                value={jobForm.companyOverrideName || ''}
                onChange={(e) => setJobForm({ ...jobForm, companyOverrideName: e.target.value })}
                placeholder={jobForm.employerName || 'e.g. ABC Tech'}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Job Category
              </label>
              <select
                value={jobForm.jobcategory}
                onChange={(e) => setJobForm({ ...jobForm, jobcategory: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location & Country & Mode */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location (City / State)
              </label>
              <input
                type="text"
                value={jobForm.location}
                onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                placeholder="e.g. Kathmandu"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Country
              </label>
              <select
                value={jobForm.country}
                onChange={(e) => setJobForm({ ...jobForm, country: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {COUNTRIES.map((ctry) => (
                  <option key={ctry} value={ctry}>
                    {ctry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Work Mode
              </label>
              <select
                value={jobForm.workMode}
                onChange={(e) => setJobForm({ ...jobForm, workMode: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {WORK_MODES.map((wm) => (
                  <option key={wm} value={wm}>
                    {wm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type, Level, Status, Deadline */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Employment Type
              </label>
              <select
                value={jobForm.jobtype}
                onChange={(e) => setJobForm({ ...jobForm, jobtype: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {JOB_TYPES.map((jt) => (
                  <option key={jt} value={jt}>
                    {jt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Seniority Level
              </label>
              <select
                value={jobForm.level}
                onChange={(e) => setJobForm({ ...jobForm, level: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={jobForm.status}
                onChange={(e) => setJobForm({ ...jobForm, status: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
                <option value="Rejected">Rejected</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Openings
              </label>
              <input
                type="number"
                min="1"
                value={jobForm.openings}
                onChange={(e) => setJobForm({ ...jobForm, openings: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Salary & Experience */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-850">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={jobForm.currency}
                onChange={(e) => setJobForm({ ...jobForm, currency: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Salary
              </label>
              <input
                type="number"
                value={jobForm.salaryMin}
                onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                placeholder="e.g. 50000"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Salary
              </label>
              <input
                type="number"
                value={jobForm.salaryMax}
                onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                placeholder="e.g. 100000"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Period
              </label>
              <select
                value={jobForm.salaryPeriod}
                onChange={(e) => setJobForm({ ...jobForm, salaryPeriod: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {SALARY_PERIODS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Experience (Yrs)
              </label>
              <input
                type="number"
                value={jobForm.minExperience}
                onChange={(e) => setJobForm({ ...jobForm, minExperience: e.target.value })}
                placeholder="0"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Experience (Yrs)
              </label>
              <input
                type="number"
                value={jobForm.maxExperience}
                onChange={(e) => setJobForm({ ...jobForm, maxExperience: e.target.value })}
                placeholder="5"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                value={jobForm.deadline}
                onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={jobForm.description}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              placeholder="Provide a detailed description of the role…"
              className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Responsibilities & Requirements */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Responsibilities (one per line)
              </label>
              <textarea
                rows={3}
                value={jobForm.responsibilities}
                onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })}
                placeholder="Design and develop React components&#10;Collaborate with cross-functional teams"
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Requirements (one per line)
              </label>
              <textarea
                rows={3}
                value={jobForm.requirements}
                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                placeholder="3+ years of React experience&#10;Strong understanding of REST APIs"
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Skills & Benefits */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={jobForm.requiredSkills}
                onChange={(e) => setJobForm({ ...jobForm, requiredSkills: e.target.value })}
                placeholder="React, TypeScript, Node.js, Tailwind"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Benefits / Perks (comma-separated)
              </label>
              <input
                type="text"
                value={jobForm.benefits}
                onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                placeholder="Health insurance, Remote work, Flexible hours"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setFormDrawerOpen(false)}
              disabled={savingJob}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingJob}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {savingJob ? 'Saving…' : isCreatingJob ? 'Create Job' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Rejection Drawer */}
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

      {/* Confirm Delete Dialog */}
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