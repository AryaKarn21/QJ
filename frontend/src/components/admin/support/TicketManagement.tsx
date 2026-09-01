import React, { useEffect, useState, useCallback } from 'react';
import { Inbox, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge, StatusTone } from '../../ui/StatusBadge';
import { KpiCard } from '../../ui/KpiCard';
import { Drawer } from '../../ui/Drawer';
import { FilterBar } from '../../ui/FilterBar';
import { getAllTickets, replyToTicket, updateTicketStatus, SupportTicket } from '../adminApi/api';

const STATUS_TONE: Record<SupportTicket['status'], StatusTone> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

const STATUS_LABEL: Record<SupportTicket['status'], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_FILTER_CONFIG = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'Open', value: 'open' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Resolved', value: 'resolved' },
      { label: 'Closed', value: 'closed' },
    ],
  },
  {
    key: 'category',
    label: 'Category',
    options: [
      { label: 'General', value: 'general' },
      { label: 'Technical', value: 'technical' },
      { label: 'Billing', value: 'billing' },
      { label: 'Account', value: 'account' },
      { label: 'Job Posting', value: 'job_posting' },
      { label: 'Other', value: 'other' },
    ],
  },
];

const TicketManagement: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', category: 'all' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllTickets(page, 15, filters.status, filters.category, search);
      setTickets(data.tickets);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters, search]);

  const counts = {
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
  };

  const openDrawer = (ticket: SupportTicket) => {
    setSelected(ticket);
    setReplyText(ticket.adminReply || '');
    setError('');
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    setError('');
    try {
      const { ticket } = await replyToTicket(selected._id, replyText);
      setTickets((prev) => prev.map((t) => (t._id === ticket._id ? ticket : t)));
      setSelected(ticket);
    } catch (err) {
      console.error('Failed to send reply:', err);
      setError('Could not send your reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: SupportTicket['status']) => {
    if (!selected) return;
    try {
      const { ticket } = await updateTicketStatus(selected._id, status);
      setTickets((prev) => prev.map((t) => (t._id === ticket._id ? ticket : t)));
      setSelected(ticket);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Could not update the status. Please try again.');
    }
  };

  const columns: DataTableColumn<SupportTicket>[] = [
    {
      key: 'subject',
      header: 'Ticket',
      render: (t) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">{t.subject}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t.name} · {t.email}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (t) => <span className="capitalize text-slate-600 dark:text-slate-300">{t.category.replace('_', ' ')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge label={STATUS_LABEL[t.status]} tone={STATUS_TONE[t.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      render: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Support Center</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Respond to jobseeker and employer questions, and track ticket status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Open (this page)" value={counts.open} icon={<Inbox size={16} />} accent="blue" loading={loading} />
        <KpiCard label="In Progress" value={counts.in_progress} icon={<Clock size={16} />} accent="amber" loading={loading} />
        <KpiCard label="Resolved (this page)" value={counts.resolved} icon={<CheckCircle2 size={16} />} accent="green" loading={loading} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or subject…"
        filters={filters}
        filterConfigs={STATUS_FILTER_CONFIG}
        onFilterChange={(key, val) => setFilters((prev) => ({ ...prev, [key]: val }))}
        resultCount={total}
        resultLabel="ticket"
      />

      <DataTable
        columns={columns}
        data={tickets}
        getRowKey={(t) => t._id}
        loading={loading}
        onRowClick={openDrawer}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No tickets found"
        emptyDescription="Try a different search or filter, or check back once someone submits one."
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.subject || ''}
        description={selected ? `${selected.name} · ${selected.email}` : undefined}
        widthClassName="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge label={STATUS_LABEL[selected.status]} tone={STATUS_TONE[selected.status]} />
              <span className="text-xs text-slate-400 capitalize">{selected.category.replace('_', ' ')}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {selected.message}
            </div>

            {selected.adminReply && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide opacity-70">Previous reply</p>
                {selected.adminReply}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Reply to this ticket
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Type your reply…"
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? 'Sending…' : 'Send Reply & Mark Resolved'}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Or just update status</p>
              <div className="flex flex-wrap gap-2">
                {(['open', 'in_progress', 'closed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={selected.status === s}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default TicketManagement;