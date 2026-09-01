import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FileDown, Trash2, CheckCircle2, UserCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUsers, deleteUser } from './adminApi/api';
import { FilterBar } from '../ui/FilterBar';
import { BulkActionsBar } from '../ui/BulkActionsBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonRow } from '../ui/Skeleton';
import { UserDrawer, type AdminUser } from './users/UserDrawer';
import { exportToCsv, USER_CSV_COLUMNS } from '../../utils/csvExport';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';
const PAGE_SIZE = 15;

type TabKey = 'employer' | 'jobseeker';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'employer',  label: 'Employers'   },
  { key: 'jobseeker', label: 'Job Seekers' },
];

const FILTER_CONFIGS = [
  {
    key: 'verifiedFilter',
    label: 'Verification',
    options: [
      { label: 'Verified',   value: 'true'  },
      { label: 'Unverified', value: 'false' },
    ],
  },
];

const mediaUrl = (path?: string) =>
  path ? `${MEDIA_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : null;

const UserAvatar: React.FC<{ user: AdminUser; size?: 'sm' | 'md' }> = ({ user, size = 'sm' }) => {
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  const url = mediaUrl(user.profilePic) || mediaUrl(user.companyLogo);

  if (url) {
    return (
      <img src={url} alt={user.name} className={`${dim} rounded-full object-cover`} />
    );
  }
  return (
    <div className={`${dim} flex items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-200 font-semibold text-violet-700 dark:from-violet-500/20 dark:to-violet-600/20 dark:text-violet-400`}>
      {user.name?.charAt(0).toUpperCase() || <UserCircle size={14} />}
    </div>
  );
};

const UserManagement: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab,       setActiveTab]       = useState<TabKey>('employer');
  const [search,          setSearch]          = useState('');
  const [filters,         setFilters]         = useState<Record<string, string>>({ verifiedFilter: 'all' });
  const [page,            setPage]            = useState(1);
  const [selectedIds,     setSelectedIds]     = useState<string[]>([]);
  const [drawerUser,      setDrawerUser]      = useState<AdminUser | null>(null);
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [confirmBulkDel,  setConfirmBulkDel]  = useState(false);

  useEffect(() => { setPage(1); setSelectedIds([]); }, [activeTab, search, filters]);

  const { data: allUsers = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['adminUsers'],
    queryFn:  getAllUsers,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AdminUser[]>(['adminUsers'], (old = []) =>
        old.filter((u) => u._id !== id)
      );
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteUser(id)));
    },
    onSuccess: (_, ids) => {
      queryClient.setQueryData<AdminUser[]>(['adminUsers'], (old = []) =>
        old.filter((u) => !ids.includes(u._id))
      );
      setSelectedIds([]);
      setConfirmBulkDel(false);
    },
  });

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      if (u.role !== activeTab) return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !u.name?.toLowerCase().includes(q) &&
          !u.email?.toLowerCase().includes(q)
        ) return false;
      }

      if (filters.verifiedFilter !== 'all') {
        const want = filters.verifiedFilter === 'true';
        if (Boolean(u.isVerified) !== want) return false;
      }

      return true;
    });
  }, [allUsers, activeTab, search, filters]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageIds      = paginated.map((u) => u._id);
  const allSelected  = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someSelected = pageIds.some((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openDrawer = useCallback((user: AdminUser) => {
    setDrawerUser(user);
    setDrawerOpen(true);
  }, []);

  const handleUserUpdated = useCallback((updated: AdminUser) => {
    queryClient.setQueryData<AdminUser[]>(['adminUsers'], (old = []) =>
      old.map((u) => (u._id === updated._id ? updated : u))
    );
    setDrawerUser(updated);
  }, [queryClient]);

  const handleUserDeleted = useCallback((id: string) => {
    queryClient.setQueryData<AdminUser[]>(['adminUsers'], (old = []) =>
      old.filter((u) => u._id !== id)
    );
  }, [queryClient]);

  const handleExport = () => {
    const toExport = selectedIds.length > 0
      ? filtered.filter((u) => selectedIds.includes(u._id))
      : filtered;
    exportToCsv(`${activeTab}s`, USER_CSV_COLUMNS, toExport as unknown as Record<string, unknown>[]);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">User Management</h1>
          <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
            Manage job seekers, employers, and their accounts
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">

        <div className="flex border-b border-slate-200 dark:border-slate-700 px-5 pt-4">
          {TABS.map((tab) => {
            const count = allUsers.filter((u) => u.role === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`mr-6 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  activeTab === tab.key
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={`Search ${activeTab}s by name or email…`}
            filters={filters}
            filterConfigs={activeTab === 'employer' ? FILTER_CONFIGS : []}
            onFilterChange={(key, val) => setFilters((prev) => ({ ...prev, [key]: val }))}
            resultCount={filtered.length}
            resultLabel={activeTab}
            actions={
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FileDown size={13} />
                {selectedIds.length > 0 ? `Export ${selectedIds.length} selected` : 'Export CSV'}
              </button>
            }
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="border-b border-slate-100 px-5 py-2.5 dark:border-slate-800">
            <BulkActionsBar
              selectedIds={selectedIds}
              onClearSelection={() => setSelectedIds([])}
              entityLabel={activeTab}
              actions={[
                {
                  label: `Delete ${selectedIds.length} selected`,
                  icon: <Trash2 size={13} />,
                  variant: 'danger',
                  onClick: () => setConfirmBulkDel(true),
                },
              ]}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                <th className="w-10 px-5 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-600"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  User
                </th>
                {activeTab === 'employer' && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Verification
                  </th>
                )}
                {activeTab === 'jobseeker' && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Resume
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} columns={activeTab === 'employer' ? 5 : 5} />
              ))}

              {!isLoading && paginated.map((user) => (
                <tr
                  key={user._id}
                  onClick={() => openDrawer(user)}
                  className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    selectedIds.includes(user._id) ? 'bg-violet-50/50 dark:bg-violet-500/5' : ''
                  }`}
                >
                  <td className="w-10 px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user._id)}
                      onChange={() => toggleOne(user._id)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 dark:border-slate-600"
                      aria-label={`Select ${user.name}`}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {activeTab === 'employer' && (
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={user.isVerified ? 'Verified' : 'Unverified'}
                        tone={user.isVerified ? 'success' : 'warning'}
                      />
                    </td>
                  )}

                  {activeTab === 'jobseeker' && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {user.resume ? (
                        <a
                          href={`${MEDIA_URL.replace(/\/$/, '')}/${user.resume.replace(/^\//, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(user.createdAt)}
                  </td>

                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {activeTab === 'employer' && !user.isVerified && (
                        <button
                          onClick={() => openDrawer(user)}
                          title="Verify employer"
                          className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                        >
                          <CheckCircle2 size={12} /> Verify
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${user.name}?`)) {
                            deleteMutation.mutate(user._id);
                          }
                        }}
                        title="Delete user"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            title={`No ${activeTab}s found`}
            description={
              search || filters.verifiedFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : `No ${activeTab}s have registered yet.`
            }
            className="m-6"
          />
        )}

        {!isLoading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-xs text-slate-400">…</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        p === page
                          ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-500/20 dark:text-violet-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <UserDrawer
        user={drawerUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUserUpdated={handleUserUpdated}
        onUserDeleted={handleUserDeleted}
      />

      <ConfirmDialog
        open={confirmBulkDel}
        onClose={() => setConfirmBulkDel(false)}
        onConfirm={() => bulkDeleteMutation.mutateAsync(selectedIds)}
        loading={bulkDeleteMutation.isPending}
        title={`Delete ${selectedIds.length} ${activeTab}${selectedIds.length > 1 ? 's' : ''}?`}
        description="All selected accounts and their data will be permanently removed. This cannot be undone."
        confirmLabel={`Delete ${selectedIds.length} accounts`}
        variant="danger"
      />
    </div>
  );
};

export default UserManagement;