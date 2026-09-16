import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { Flame, Plus, Trash2, ChevronUp, ChevronDown, Search, Save, Eye } from 'lucide-react';
import { PageHeader } from '../../ui/PageHeader';
import { StatusBadge, StatusTone } from '../../ui/StatusBadge';
import { EmptyState } from '../../ui/EmptyState';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import {
  getTrendingJobsAdmin,
  searchEligibleTrendingJobs,
  addTrendingJob,
  updateTrendingJob,
  removeTrendingJob,
  reorderTrendingJobs,
  getTrendingSettings,
  updateTrendingSettings,
  TrendingJob,
  TrendingState,
  EligibleJob,
} from '../adminApi/api';
import { JobCard } from '../../jobseeker/home/JobCard';

const STATE_TONE: Record<TrendingState, StatusTone> = {
  active: 'success',
  scheduled: 'info',
  expired: 'danger',
  unpublished: 'neutral',
};

const STATE_LABEL: Record<TrendingState, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  unpublished: 'Unpublished',
};

const toDateInputValue = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

const apiErrorMessage = (err: unknown, fallback: string) =>
  (err as AxiosError<{ message?: string }>)?.response?.data?.message || fallback;

const TrendingJobsManagement: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: trendingData, isLoading: loadingTrending } = useQuery({
    queryKey: ['trendingJobsAdmin'],
    queryFn: getTrendingJobsAdmin,
    refetchInterval: 30000,
  });
  const jobs: TrendingJob[] = useMemo(() => trendingData?.jobs ?? [], [trendingData]);

  const { data: settingsData } = useQuery({
    queryKey: ['trendingSettingsAdmin'],
    queryFn: getTrendingSettings,
  });
  const [maxDisplayCount, setMaxDisplayCount] = useState(8);
  useEffect(() => {
    if (settingsData) setMaxDisplayCount(settingsData.maxDisplayCount);
  }, [settingsData]);

  // ── Add-job picker ──────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: eligibleData, isFetching: searching } = useQuery({
    queryKey: ['eligibleTrendingJobs', debouncedSearch],
    queryFn: () => searchEligibleTrendingJobs(debouncedSearch),
    enabled: pickerOpen,
  });
  const eligibleJobs: EligibleJob[] = eligibleData?.jobs ?? [];

  const invalidateTrending = () => queryClient.invalidateQueries({ queryKey: ['trendingJobsAdmin'] });

  const addMutation = useMutation({
    mutationFn: (jobId: string) => addTrendingJob(jobId, {}),
    onSuccess: (_data, jobId) => {
      const added = eligibleJobs.find((j) => j._id === jobId);
      toast.success(`"${added?.title || 'Job'}" added to Trending.`);
      invalidateTrending();
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, 'Failed to add job to trending.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: Partial<Pick<TrendingJob, 'trendingStartDate' | 'trendingEndDate'>> }) =>
      updateTrendingJob(jobId, data),
    onSuccess: invalidateTrending,
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Failed to update trending job.')),
  });

  const removeMutation = useMutation({
    mutationFn: (jobId: string) => removeTrendingJob(jobId),
    onSuccess: () => {
      toast.success('Removed from Trending.');
      invalidateTrending();
    },
    onError: () => toast.error('Failed to remove job from trending.'),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderTrendingJobs,
    onSuccess: invalidateTrending,
    onError: () => toast.error('Failed to reorder trending jobs.'),
  });

  const settingsMutation = useMutation({
    mutationFn: (count: number) => updateTrendingSettings(count),
    onSuccess: () => {
      toast.success('Trending display settings saved.');
      queryClient.invalidateQueries({ queryKey: ['trendingSettingsAdmin'] });
    },
    onError: () => toast.error('Failed to save settings.'),
  });

  const [confirmRemove, setConfirmRemove] = useState<TrendingJob | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= jobs.length) return;
    const reordered = [...jobs];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderMutation.mutate(reordered.map((j, i) => ({ jobId: j._id, trendingOrder: i })));
  };

  const previewJobs = useMemo(
    () => jobs.filter((j) => j.trendingState === 'active').slice(0, maxDisplayCount),
    [jobs, maxDisplayCount]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trending Jobs"
        description="Curate which jobs appear in the homepage's Trending Jobs section, their order, and their visibility window."
        actions={
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Plus size={15} /> Add Job
          </button>
        }
      />

      {pickerOpen && (
        <div className="rounded-admin-card border border-adminBorder bg-adminCard p-4 shadow-admin-card dark:border-slate-700">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-adminBorder px-3 py-2 dark:border-slate-700">
            <Search size={15} className="text-adminTextSecondary" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active jobs by title…"
              className="w-full bg-transparent text-sm text-adminText outline-none dark:text-slate-200"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {searching ? (
              <p className="px-2 py-3 text-sm text-adminTextSecondary">Searching…</p>
            ) : eligibleJobs.length === 0 ? (
              <p className="px-2 py-3 text-sm text-adminTextSecondary">
                No eligible active jobs found{search ? ` for "${search}"` : ''}.
              </p>
            ) : (
              eligibleJobs.map((job) => (
                <button
                  key={job._id}
                  onClick={() => addMutation.mutate(job._id)}
                  disabled={addMutation.isPending}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-adminHover disabled:opacity-50 dark:hover:bg-slate-800/50"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-adminText dark:text-slate-200">{job.title}</span>
                    <span className="text-adminTextSecondary"> — {job.employer?.name || 'Unknown company'} · {job.location}</span>
                  </span>
                  <Plus size={14} className="shrink-0 text-orange-500" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-admin-card border border-adminBorder bg-adminCard p-4 shadow-admin-card dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-adminText dark:text-slate-200">Max jobs shown on homepage</p>
          <p className="text-xs text-adminTextSecondary">Only "Active" trending jobs within this cap are shown publicly, in order.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={20}
            value={maxDisplayCount}
            onChange={(e) => setMaxDisplayCount(Number(e.target.value))}
            className="w-20 rounded-lg border border-adminBorder px-2.5 py-1.5 text-sm text-adminText dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <button
            onClick={() => settingsMutation.mutate(maxDisplayCount)}
            disabled={settingsMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-700"
          >
            <Save size={13} /> Save
          </button>
        </div>
      </div>

      {loadingTrending ? (
        <div className="rounded-admin-card border border-adminBorder bg-adminCard p-8 text-center text-sm text-adminTextSecondary shadow-admin-card dark:border-slate-700">
          Loading trending jobs…
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Flame size={22} />}
          title="No trending jobs yet"
          description='Use "Add Job" above to select an active job posting to feature on the homepage.'
        />
      ) : (
        <div className="overflow-hidden rounded-admin-card border border-adminBorder bg-adminCard shadow-admin-card dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-adminBorder bg-adminBg dark:border-slate-700 dark:bg-slate-800/60">
                <tr>
                  {['Order', 'Job', 'Status', 'Starts', 'Ends', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-adminTextSecondary dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-adminBorder/70 dark:divide-slate-800">
                {jobs.map((job, index) => (
                  <tr key={job._id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => move(index, -1)}
                          disabled={index === 0 || reorderMutation.isPending}
                          className="rounded p-1 text-adminTextSecondary hover:bg-adminHover disabled:opacity-30 dark:hover:bg-slate-800"
                          aria-label="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => move(index, 1)}
                          disabled={index === jobs.length - 1 || reorderMutation.isPending}
                          className="rounded p-1 text-adminTextSecondary hover:bg-adminHover disabled:opacity-30 dark:hover:bg-slate-800"
                          aria-label="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-adminText dark:text-slate-200">{job.title}</p>
                      <p className="text-xs text-adminTextSecondary">{job.employer?.name || '—'} · {job.location}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge label={STATE_LABEL[job.trendingState]} tone={STATE_TONE[job.trendingState]} />
                    </td>
                    <td className="px-4 py-3.5">
                      <input
                        type="date"
                        defaultValue={toDateInputValue(job.trendingStartDate)}
                        onBlur={(e) =>
                          updateMutation.mutate({ jobId: job._id, data: { trendingStartDate: e.target.value || null } })
                        }
                        className="rounded-md border border-adminBorder px-2 py-1 text-xs text-adminText dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <input
                        type="date"
                        defaultValue={toDateInputValue(job.trendingEndDate)}
                        onBlur={(e) =>
                          updateMutation.mutate({ jobId: job._id, data: { trendingEndDate: e.target.value || null } })
                        }
                        className="rounded-md border border-adminBorder px-2 py-1 text-xs text-adminText dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setConfirmRemove(job)}
                        title="Remove from trending"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Eye size={15} className="text-adminTextSecondary" />
          <h2 className="text-sm font-semibold text-adminText dark:text-slate-200">
            Homepage preview ({previewJobs.length} of {maxDisplayCount} shown)
          </h2>
        </div>
        {previewJobs.length === 0 ? (
          <p className="text-sm text-adminTextSecondary">
            Nothing will show on the public homepage right now — no trending job is both Active and within its visibility window.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {previewJobs.map((job) => (
              <JobCard key={job._id} job={job} readOnly />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) removeMutation.mutate(confirmRemove._id);
          setConfirmRemove(null);
        }}
        loading={removeMutation.isPending}
        title={`Remove "${confirmRemove?.title}" from Trending?`}
        description="It will stop appearing in the homepage's Trending Jobs section immediately."
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
};

export default TrendingJobsManagement;
