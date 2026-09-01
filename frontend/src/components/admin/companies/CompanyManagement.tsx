import React, { useEffect, useState } from 'react';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge, statusToTone } from '../../ui/StatusBadge';
import { Drawer } from '../../ui/Drawer';
import { KpiCard } from '../../ui/KpiCard';
import { getAllCompanies, verifyCompany, rejectCompany, Company } from '../adminApi/api';
import { CheckCircle2, XCircle, Building2, ShieldCheck, Clock } from 'lucide-react';

const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Company | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = async (p = page) => {
    setLoading(true);
    const res = await getAllCompanies(p, 10, '');
    setCompanies(res.companies);
    setTotal(res.total);
    setTotalPages(res.totalPages);
    setLoading(false);
  };

  useEffect(() => { load(1); }, []);

  const pendingCount = companies.filter((c) => c.verificationStatus === 'Pending').length;
  const verifiedCount = companies.filter((c) => c.verificationStatus === 'Verified').length;

  const handleVerify = async (company: Company) => {
    await verifyCompany(company._id);
    setSelected(null);
    load(page);
  };

  const handleReject = async (company: Company) => {
    if (!rejectReason.trim()) return;
    await rejectCompany(company._id, rejectReason);
    setRejecting(false);
    setRejectReason('');
    setSelected(null);
    load(page);
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
        <KpiCard label="Pending KYC" value={pendingCount} icon={<Clock size={18} />} />
        <KpiCard label="Verified" value={verifiedCount} icon={<ShieldCheck size={18} />} />
      </div>

      <DataTable
        columns={columns}
        data={companies}
        getRowKey={(c) => c._id}
        loading={loading}
        onRowClick={(c) => setSelected(c)}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => { setPage(p); load(p); }}
        emptyTitle="No companies yet"
        emptyDescription="Employer accounts will show up here once someone signs up as an employer."
      />

      <Drawer
        open={!!selected && !rejecting}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        description={selected?.email}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">KYC Status:</span>{' '}
              <StatusBadge label={selected.verificationStatus} tone={statusToTone(selected.verificationStatus)} />
            </p>
            {selected.verificationStatus === 'Rejected' && selected.verificationNote && (
              <p className="text-red-600 text-xs">Reason: {selected.verificationNote}</p>
            )}
            <p><span className="font-medium">Industry:</span> {selected.industryType || '—'}</p>
            <p><span className="font-medium">Company Size:</span> {selected.companySize || '—'}</p>
            <p><span className="font-medium">PAN Number:</span> {selected.panNumber || '—'}</p>
            <p><span className="font-medium">Address:</span> {selected.address || '—'}</p>
            <p><span className="font-medium">Telephone:</span> {selected.telephone || '—'}</p>
            {selected.description && (
              <p className="whitespace-pre-wrap">{selected.description}</p>
            )}
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