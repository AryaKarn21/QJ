import React, { useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff, ShieldAlert, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUsers, updateUserRole } from './adminApi/api';
import { DataTable, DataTableColumn } from '../ui/DataTable';
import { StatusBadge, StatusTone } from '../ui/StatusBadge';
import { FilterBar } from '../ui/FilterBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAdminAuth } from '../../context/useAdminAuth';

// getAllUsers merges jobseekers/employers/recruiters/mentors/admins, so the
// role union here is wider than UserDrawer's AdminUser type (which only
// covers the two admin-manageable tabs there).
type PlatformRole = 'jobseeker' | 'employer' | 'recruiter' | 'mentor' | 'admin' | 'superadmin';

interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  role: PlatformRole;
  createdAt: string;
}

const ROLE_TONE: Record<PlatformRole, StatusTone> = {
  jobseeker: 'neutral',
  employer: 'info',
  recruiter: 'info',
  mentor: 'info',
  admin: 'accent',
  superadmin: 'warning',
};

const ROLE_LABEL: Record<PlatformRole, string> = {
  jobseeker: 'Jobseeker',
  employer: 'Employer',
  recruiter: 'Recruiter',
  mentor: 'Mentor',
  admin: 'Admin',
  superadmin: 'Superadmin',
};

const ROLE_FILTER_CONFIG = [
  {
    key: 'role',
    label: 'Role',
    options: (Object.keys(ROLE_LABEL) as PlatformRole[]).map((role) => ({
      label: ROLE_LABEL[role],
      value: role,
    })),
  },
];

const PAGE_SIZE = 15;

const RolesPermissions: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId: currentUserId } = useAdminAuth();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ role: 'all' });
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<{
    user: PlatformUser;
    action: 'promote' | 'demote';
  } | null>(null);

  // Shares the ['adminUsers'] cache with UserManagement.tsx, so promoting/
  // demoting here stays in sync with the User Management list too.
  const { data: allUsers = [], isLoading } = useQuery<PlatformUser[]>({
    queryKey: ['adminUsers'],
    queryFn: getAllUsers,
    staleTime: 30_000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'promote' | 'demote' }) =>
      updateUserRole(id, action),
    onSuccess: (data) => {
      queryClient.setQueryData<PlatformUser[]>(['adminUsers'], (old = []) =>
        old.map((u) => (u._id === data.user._id ? { ...u, role: data.user.role } : u))
      );
      setPendingAction(null);
    },
    onError: () => {
      // Leave the dialog open with its loading state cleared so the admin
      // can see the failed action and retry, rather than silently closing.
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (filters.role !== 'all' && u.role !== filters.role) return false;
      if (!term) return true;
      return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
    });
  }, [allUsers, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: DataTableColumn<PlatformUser>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{u.name || '—'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Current role',
      render: (u) => <StatusBadge label={ROLE_LABEL[u.role]} tone={ROLE_TONE[u.role]} />,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (u) => (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'),
    },
    {
      key: 'action',
      header: 'Action',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (u) => {
        const isSelf = u._id === currentUserId;

        if (u.role === 'superadmin') {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Lock size={13} /> Protected
            </span>
          );
        }

        if (isSelf) {
          return (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500"
              title="You can't change your own role"
            >
              <Lock size={13} /> You
            </span>
          );
        }

        if (u.role === 'admin') {
          return (
            <button
              onClick={() => setPendingAction({ user: u, action: 'demote' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <ShieldOff size={14} /> Revoke admin
            </button>
          );
        }

        return (
          <button
            onClick={() => setPendingAction({ user: u, action: 'promote' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-400 dark:hover:bg-violet-500/10"
          >
            <ShieldCheck size={14} /> Promote to admin
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Roles &amp; Permissions
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Grant or revoke admin access. Superadmin accounts and your own account can't be
          changed here — for good reason.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Promoting a user to admin gives them access to user, job, application, revenue, and
          CMS management. Only do this for people you trust with that level of access.
        </span>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name or email…"
        filters={filters}
        filterConfigs={ROLE_FILTER_CONFIG}
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setPage(1);
        }}
        resultCount={filtered.length}
        resultLabel="user"
      />

      <DataTable
        columns={columns}
        data={paged}
        getRowKey={(u) => u._id}
        loading={isLoading}
        emptyTitle="No users match your filters"
        emptyDescription="Try a different search term or role filter."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          roleMutation.mutate({ id: pendingAction.user._id, action: pendingAction.action });
        }}
        loading={roleMutation.isPending}
        variant={pendingAction?.action === 'demote' ? 'danger' : 'default'}
        title={
          pendingAction?.action === 'promote'
            ? `Promote ${pendingAction.user.name} to admin?`
            : `Revoke admin access from ${pendingAction?.user.name}?`
        }
        description={
          pendingAction?.action === 'promote'
            ? "They'll immediately gain full admin access across the platform."
            : "They'll be reset to a basic jobseeker account and lose all admin access."
        }
        confirmLabel={pendingAction?.action === 'promote' ? 'Promote' : 'Revoke'}
      />
    </div>
  );
};

export default RolesPermissions;