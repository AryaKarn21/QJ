import React, { useEffect, useState } from 'react';
import { ScrollText, ShieldAlert, Users, Activity } from 'lucide-react';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { Drawer } from '../../ui/Drawer';
import { FilterBar, FilterConfig } from '../../ui/FilterBar';
import { KpiCard } from '../../ui/KpiCard';
import { getAuditLogs, getAuditLogStats, AuditLogEntry, AuditLogStats } from '../adminApi/api';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ module: 'all', success: 'all' });
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page: p,
        limit: 20,
        module: filters.module !== 'all' ? filters.module : undefined,
        success: filters.success !== 'all' ? (filters.success as 'true' | 'false') : undefined,
        search: search || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setModules(res.modules);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAuditLogStats().then(setStats).catch(() => {});
  }, []);

  // Refetch whenever a filter or the search term changes, resetting to page 1.
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters.module, filters.success]);

  const filterConfigs: FilterConfig[] = [
    {
      key: 'module',
      label: 'Modules',
      options: modules.map((m) => ({ label: m, value: m })),
    },
    {
      key: 'success',
      label: 'Outcomes',
      options: [
        { label: 'Success', value: 'true' },
        { label: 'Failed', value: 'false' },
      ],
    },
  ];

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (log) => (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDateTime(log.createdAt)}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (log) =>
        log.actor?.email ? (
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{log.actor.name || '—'}</p>
            <p className="truncate text-xs text-slate-400">{log.actor.email}</p>
          </div>
        ) : (
          <span className="text-slate-400">Anonymous</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">{log.action}</p>
          {log.targetLabel && <p className="truncate text-xs text-slate-400">{log.targetLabel}</p>}
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      render: (log) => <span className="capitalize text-slate-600 dark:text-slate-300">{log.module || '—'}</span>,
    },
    {
      key: 'success',
      header: 'Outcome',
      render: (log) => (
        <StatusBadge
          label={log.success ? `${log.statusCode ?? 200} OK` : `${log.statusCode ?? 'Failed'}`}
          tone={log.success ? 'success' : 'danger'}
        />
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      render: (log) => <span className="text-xs text-slate-400">{log.ip || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          <ScrollText size={20} /> Audit Logs
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          A record of every state-changing action taken across the platform — who did what, when, and whether it
          succeeded.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard label="Events (24h)" value={stats?.totalLast24h ?? '—'} icon={<Activity size={18} />} />
        <KpiCard
          label="Failures (24h)"
          value={stats?.failuresLast24h ?? '—'}
          icon={<ShieldAlert size={18} />}
          accent="rose"
        />
        <KpiCard label="Active Actors (24h)" value={stats?.activeActorsLast24h ?? '—'} icon={<Users size={18} />} accent="blue" />
        <KpiCard label="Total Logged" value={stats?.totalAllTime ?? '—'} icon={<ScrollText size={18} />} accent="violet" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by actor, action, or target…"
        filters={filters}
        filterConfigs={filterConfigs}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        resultCount={total}
        resultLabel="event"
      />

      <DataTable
        columns={columns}
        data={logs}
        getRowKey={(log) => log._id}
        loading={loading}
        onRowClick={(log) => setSelected(log)}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
          load(p);
        }}
        emptyTitle="No audit events yet"
        emptyDescription="Once admins or users take actions on the platform, they'll show up here."
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.action || ''}
        description={selected ? formatDateTime(selected.createdAt) : undefined}
        widthClassName="max-w-lg"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Outcome</p>
              <StatusBadge
                label={selected.success ? `${selected.statusCode ?? 200} OK` : `${selected.statusCode ?? 'Failed'}`}
                tone={selected.success ? 'success' : 'danger'}
              />
            </div>

            <div>
              <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Actor</p>
              {selected.actor?.email ? (
                <p className="text-slate-600 dark:text-slate-300">
                  {selected.actor.name} ({selected.actor.email}) — {selected.actor.role}
                </p>
              ) : (
                <p className="text-slate-400">Unauthenticated request</p>
              )}
            </div>

            {selected.targetType && (
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Target</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {selected.targetType} — {selected.targetLabel || selected.targetId}
                </p>
              </div>
            )}

            <div>
              <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Request</p>
              <p className="text-slate-600 dark:text-slate-300">
                {selected.method} {selected.path}
              </p>
              <p className="text-xs text-slate-400">
                {selected.ip} · {selected.userAgent}
                {typeof selected.durationMs === 'number' ? ` · ${selected.durationMs}ms` : ''}
              </p>
            </div>

            {selected.params && Object.keys(selected.params).length > 0 && (
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Params</p>
                <pre className="overflow-x-auto rounded-md bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {JSON.stringify(selected.params, null, 2)}
                </pre>
              </div>
            )}

            {selected.body && Object.keys(selected.body).length > 0 && (
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Request Body</p>
                <pre className="overflow-x-auto rounded-md bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {JSON.stringify(selected.body, null, 2)}
                </pre>
              </div>
            )}

            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Details</p>
                <pre className="overflow-x-auto rounded-md bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogs;