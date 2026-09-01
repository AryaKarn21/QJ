import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, DataTableColumn } from '../ui/DataTable';
import { StatusBadge, statusToTone } from '../ui/StatusBadge';
import { adminGetAllSubscriptions, type AdminSubscriptionRow, type Subscription } from '../../api/subscriptionApi';

// Matches the existing Subscription.status enum (backend/models/
// Subscription.js) — "pending/active/expired/cancelled/failed" — not the
// TRIAL/PAST_DUE wording from generic subscription-SaaS examples, per the
// existing project's own status conventions.
const STATUS_TABS: { id: Subscription['status'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'expired', label: 'Expired' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'failed', label: 'Failed' },
];

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Subscription['status'] | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminSubscriptions', status, page],
    queryFn: () => adminGetAllSubscriptions({ status: status === 'all' ? undefined : status, page, limit: 20 }),
    retry: false,
  });

  const totalPages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;

  const columns: DataTableColumn<AdminSubscriptionRow>[] = [
    {
      key: 'user',
      header: 'Subscriber',
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{s.user?.name ?? 'Deleted user'}</p>
          <p className="truncate text-xs text-slate-400">{s.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (s) => (
        <div>
          <p className="text-slate-700 dark:text-slate-200">{s.plan?.name ?? '—'}</p>
          <p className="text-xs text-slate-400">
            {s.plan ? `${s.plan.price} / ${s.plan.billingCycle}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge label={s.status} tone={statusToTone(s.status)} />,
    },
    {
      key: 'startDate',
      header: 'Start',
      render: (s) => <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'endDate',
      header: 'Renewal / End',
      render: (s) => <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'gateway',
      header: 'Gateway',
      render: (s) => <span className="capitalize text-slate-500 dark:text-slate-400">{s.gateway}</span>,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every subscription purchased through eSewa / Khalti. Manage the plan catalog from Subscription Management.
        </p>
      </div>

      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setStatus(t.id); setPage(1); }}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              status === t.id
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load subscriptions.
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.subscriptions ?? []}
        getRowKey={(s) => s._id}
        loading={isLoading}
        emptyTitle="No active subscriptions"
        emptyDescription="Once a user subscribes to a plan through eSewa or Khalti, it will show up here."
        onRowClick={(s) => navigate(`/admin/subscriptions/${s._id}`)}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
