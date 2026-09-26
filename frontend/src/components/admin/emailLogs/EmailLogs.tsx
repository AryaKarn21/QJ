import React, { useCallback, useEffect, useState } from 'react';
import { Mail, MailWarning, MailCheck, RotateCcw } from 'lucide-react';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge, StatusTone } from '../../ui/StatusBadge';
import { Drawer } from '../../ui/Drawer';
import { FilterBar, FilterConfig } from '../../ui/FilterBar';
import { KpiCard } from '../../ui/KpiCard';
import { getEmailLogs, getEmailLogById, retryEmailLog, EmailLogEntry } from '../adminApi/api';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { toast } from 'react-toastify';
import { useCurrentUser } from '../../../utils/currentUser';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const STATUS_TONE: Record<string, StatusTone> = {
  sent: 'success',
  delivered: 'success',
  queued: 'warning',
  failed: 'danger',
};

const EmailLogs: React.FC = () => {
  const { role } = useCurrentUser();
  const isSuperAdmin = role?.toLowerCase() === 'superadmin';

  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [selected, setSelected] = useState<(EmailLogEntry & { textBody?: string; htmlBody?: string }) | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(
    async (p = page, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await getEmailLogs({
          page: p,
          limit: 20,
          status: filters.status !== 'all' ? filters.status : undefined,
          search: search || undefined,
        });
        setLogs(res.logs);
        setTotal(res.totalLogs);
        setTotalPages(res.totalPages);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [page, filters.status, search]
  );

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters.status]);

  useAutoRefresh(() => load(page, { silent: true }), 30000);

  const openRow = async (row: EmailLogEntry) => {
    setSelected(row);
    try {
      const full = await getEmailLogById(row._id);
      setSelected(full);
    } catch {
      // keep the summary row visible even if the detail fetch fails
    }
  };

  const handleRetry = async (id: string) => {
    setRetrying(true);
    try {
      await retryEmailLog(id);
      toast.success('Email retried successfully.');
      setSelected(null);
      load(page, { silent: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not retry this email.');
    } finally {
      setRetrying(false);
    }
  };

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Statuses',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Sent', value: 'sent' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Failed', value: 'failed' },
      ],
    },
  ];

  const columns: DataTableColumn<EmailLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (log) => <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDateTime(log.createdAt)}</span>,
    },
    {
      key: 'recipientEmail',
      header: 'Recipient',
      render: (log) => <span className="text-slate-700 dark:text-slate-300">{log.recipientEmail}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (log) => <span className="text-slate-600 dark:text-slate-300">{log.type}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (log) => <span className="truncate text-slate-600 dark:text-slate-300">{log.subject}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => <StatusBadge label={log.status} tone={STATUS_TONE[log.status] || 'neutral'} />,
    },
    {
      key: 'attempts',
      header: 'Attempts',
      render: (log) => <span className="text-slate-500">{log.attempts}</span>,
    },
  ];

  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const sentCount = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          <Mail size={20} /> Email Delivery Log
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every transactional email sent by QuickJobs, its delivery status, and a retry action for failed sends.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="This Page" value={logs.length} icon={<Mail size={18} />} />
        <KpiCard label="Sent / Delivered (this page)" value={sentCount} icon={<MailCheck size={18} />} accent="green" />
        <KpiCard label="Failed (this page)" value={failedCount} icon={<MailWarning size={18} />} accent="rose" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by recipient email…"
        filters={filters}
        filterConfigs={filterConfigs}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        resultCount={total}
        resultLabel="email"
      />

      <DataTable
        columns={columns}
        data={logs}
        getRowKey={(log) => log._id}
        loading={loading}
        onRowClick={openRow}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
          load(p);
        }}
        emptyTitle="No emails logged yet"
        emptyDescription="Once the app sends a transactional email, it will show up here."
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.subject || ''}
        description={selected ? formatDateTime(selected.createdAt) : undefined}
        widthClassName="max-w-lg"
        footer={
          selected?.status === 'failed' ? (
            isSuperAdmin ? (
              <button
                onClick={() => handleRetry(selected._id)}
                disabled={retrying}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-adminAccent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                <RotateCcw size={14} className={retrying ? 'animate-spin' : ''} /> {retrying ? 'Retrying…' : 'Retry Send'}
              </button>
            ) : (
              <p className="text-center text-xs text-slate-400">Only a Super Admin can retry a failed email.</p>
            )
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Status</p>
              <StatusBadge label={selected.status} tone={STATUS_TONE[selected.status] || 'neutral'} />
            </div>
            <div>
              <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Recipient</p>
              <p className="text-slate-600 dark:text-slate-300">{selected.recipientEmail}</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Type</p>
              <p className="text-slate-600 dark:text-slate-300">{selected.type}</p>
            </div>
            {selected.failureReason && (
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Failure Reason</p>
                <p className="text-rose-600 dark:text-rose-400">{selected.failureReason}</p>
              </div>
            )}
            {selected.htmlBody && (
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Email Body</p>
                <iframe title="Email body" srcDoc={selected.htmlBody} sandbox="" className="h-64 w-full rounded-md border border-slate-200" />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default EmailLogs;
