import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge, statusToTone } from '../../ui/StatusBadge';
import { Drawer } from '../../ui/Drawer';
import { KpiCard } from '../../ui/KpiCard';
import {
  getAllCompanies,
  verifyCompany,
  rejectCompany,
  toggleCompanySuspendAdmin,
  Company,
} from '../adminApi/api';
import {
  CheckCircle2,
  XCircle,
  Building2,
  ShieldCheck,
  Clock,
  Search,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';

const CompanyManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status'); // 'verified' | 'pending' | null

  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'pending'>(
    statusParam === 'verified' || statusParam === 'pending' ? statusParam : 'all'
  );
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Company | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (statusParam === 'verified' || statusParam === 'pending') {
      setActiveTab(statusParam);
    }
  }, [statusParam]);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const res = await getAllCompanies(page, 20, search);
      setCompanies(res.companies || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load companies');
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load({ silent: true }), 30000);

  const pendingCount = useMemo(
    () => companies.filter((c) => c.verificationStatus === 'Pending').length,
    [companies]
  );
  const verifiedCount = useMemo(
    () => companies.filter((c) => c.verificationStatus === 'Verified').length,
    [companies]
  );

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (activeTab === 'verified' && c.verificationStatus !== 'Verified') return false;
      if (activeTab === 'pending' && c.verificationStatus !== 'Pending') return false;
      return true;
    });
  }, [companies, activeTab]);

  const handleVerify = async (company: Company) => {
    try {
      await verifyCompany(company._id);
      toast.success(`Verified KYC for ${company.name}`);
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to verify company');
    }
  };

  const handleReject = async (company: Company) => {
    if (!rejectReason.trim()) return;
    try {
      await rejectCompany(company._id, rejectReason);
      toast.success(`Rejected KYC for ${company.name}`);
      setRejecting(false);
      setRejectReason('');
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject company');
    }
  };

  const handleToggleSuspend = async (company: Company) => {
    const nextSuspended = !company.isSuspended;
    const reason = nextSuspended
      ? window.prompt('Enter reason for company suspension (optional):') || undefined
      : undefined;

    try {
      await toggleCompanySuspendAdmin(company._id, nextSuspended, reason);
      toast.success(`Company ${nextSuspended ? 'suspended' : 'reactivated'}`);
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update company status');
    }
  };

  const columns: DataTableColumn<Company>[] = [
    { key: 'name', header: 'Company', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'industryType', header: 'Industry', render: (c) => c.industryType || '—' },
    {
      key: 'verificationStatus',
      header: 'KYC Status',
      render: (c) => <StatusBadge label={c.verificationStatus} tone={statusToTone(c.verificationStatus)} />,
    },
    {
      key: 'actions',
      header: '',
      render: (c) =>
        c.verificationStatus === 'Pending' ? (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleVerify(c); }}
              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <CheckCircle2 size={14} /> Verify
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelected(c); setRejecting(true); }}
              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <XCircle size={14} /> Reject
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Companies" value={total} icon={<Building2 size={18} />} />
        <KpiCard label="Pending KYC" value={pendingCount} icon={<Clock size={18} />} accent="amber" />
        <KpiCard label="Verified" value={verifiedCount} icon={<ShieldCheck size={18} />} accent="green" />
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'All Companies' },
            { id: 'verified', label: 'Verified' },
            { id: 'pending', label: 'Pending KYC' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies by name or PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCompanies}
        getRowKey={(c) => c._id}
        loading={loading}
        onRowClick={(c) => setSelected(c)}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        emptyTitle="No companies found"
        emptyDescription="No employer accounts match your selected tab or search query."
      />

      <Drawer
        open={!!selected && !rejecting}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        description={selected?.email}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">KYC Status:</span>
              <StatusBadge label={selected.verificationStatus} tone={statusToTone(selected.verificationStatus)} />
            </div>
            {selected.verificationStatus === 'Rejected' && selected.verificationNote && (
              <p className="text-red-600 text-xs">Reason: {selected.verificationNote}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="font-medium">Account Access:</span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                selected.isSuspended
                  ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              }`}>
                {selected.isSuspended ? 'Suspended' : 'Active'}
              </span>
            </div>

            <p><span className="font-medium">Industry:</span> {selected.industryType || '—'}</p>
            <p><span className="font-medium">Company Size:</span> {selected.companySize || '—'}</p>
            <p><span className="font-medium">PAN Number:</span> {selected.panNumber || '—'}</p>
            <p><span className="font-medium">Address:</span> {selected.address || '—'}</p>
            <p><span className="font-medium">Telephone:</span> {selected.telephone || '—'}</p>
            {selected.description && (
              <p className="whitespace-pre-wrap">{selected.description}</p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => handleToggleSuspend(selected)}
                className={`w-full rounded-lg py-2 text-xs font-semibold transition-all ${
                  selected.isSuspended
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400'
                }`}
              >
                {selected.isSuspended ? 'Reactivate Company Account' : 'Suspend Company Account'}
              </button>
            </div>

            {selected.verificationStatus === 'Pending' && (
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleVerify(selected)} className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Verify
                </button>
                <button onClick={() => setRejecting(true)} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        open={rejecting}
        onClose={() => { setRejecting(false); setRejectReason(''); }}
        title="Reject company verification"
        description="This reason is sent to the employer."
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. PAN number couldn't be verified, address is incomplete…"
          className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          rows={4}
        />
        <button
          onClick={() => selected && handleReject(selected)}
          disabled={!rejectReason.trim()}
          className="mt-3 w-full rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Confirm Rejection
        </button>
      </Drawer>
    </div>
  );
};

export default CompanyManagement;