import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Trash2, Plus, DollarSign, TrendingUp, Users, Wallet } from "lucide-react";
import { DataTable, DataTableColumn } from "../ui/DataTable";
import { StatusBadge } from "../ui/StatusBadge";
import { KpiCard } from "../ui/KpiCard";
import { Drawer } from "../ui/Drawer";
import {
  fetchRevenues,
  fetchEmployers,
  fetchJobsByEmployer,
  addRevenue,
  updateRevenue,
  deleteRevenue,
  toggleTrendingStatus,
} from "./adminApi/api";

interface Revenue {
  _id: string;
  amount: number;
  currency: string;
  paidBy: {
    _id: string;
    name: string;
  };
  paidFor: {
    _id: string;
    title: string;
    istrending: boolean;
  };
  remarks?: string;
  createdAt?: string;
}

interface RevenueFormData {
  _id?: string;
  amount?: number;
  currency?: string;
  paidBy?: string;
  paidFor?: string;
  remarks?: string;
}

interface Employer {
  _id: string;
  name: string;
  email: string;
}

interface Job {
  _id: string;
  title: string;
}

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "NPR"];

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
};

const RevenueManagement: React.FC = () => {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<RevenueFormData>({});
  const [showDrawer, setShowDrawer] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [revenueData, employerData] = await Promise.all([
        fetchRevenues(),
        fetchEmployers(),
      ]);
      setRevenues(revenueData);
      setEmployers(employerData.employers);
    } catch {
      toast.error("Failed to load revenue records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Real numbers derived from the actual loaded records — no invented
  // KPIs. Grouped by currency since summing across currencies as one
  // number would be meaningless (and wrong).
  const kpis = useMemo(() => {
    const totalsByCurrency = new Map<string, number>();
    let trendingFunded = 0;
    const employerIds = new Set<string>();

    for (const rev of revenues) {
      const currency = rev.currency || "USD";
      totalsByCurrency.set(currency, (totalsByCurrency.get(currency) || 0) + (rev.amount || 0));
      if (rev.paidFor?.istrending) trendingFunded++;
      if (rev.paidBy?._id) employerIds.add(rev.paidBy._id);
    }

    const topCurrency = [...totalsByCurrency.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      totalEntries: revenues.length,
      topCurrencyLabel: topCurrency ? `${topCurrency[0]} ${topCurrency[1].toLocaleString()}` : "—",
      currencyBreakdown: [...totalsByCurrency.entries()],
      trendingFunded,
      employerCount: employerIds.size,
    };
  }, [revenues]);

  const handleEmployerChange = async (employerId: string) => {
    try {
      const data = await fetchJobsByEmployer(employerId);
      setJobs(data.jobs);
      setFormData((prev) => ({ ...prev, paidBy: employerId, paidFor: "" }));
    } catch {
      toast.error("Failed to load this employer's jobs.");
    }
  };

  const handleSubmit = async () => {
    if (!formData.paidBy || !formData.paidFor || !formData.amount) {
      toast.error("Employer, job, and amount are required.");
      return;
    }
    const payload = {
      amount: formData.amount,
      currency: formData.currency || "USD",
      paidBy: formData.paidBy,
      paidFor: formData.paidFor,
      remarks: formData.remarks,
    };

    setSaving(true);
    try {
      if (editMode && formData._id) {
        await updateRevenue(formData._id, payload);
        toast.success("Revenue entry updated.");
      } else {
        await addRevenue(payload);
        toast.success("Revenue entry added.");
      }
      setShowDrawer(false);
      setFormData({});
      fetchAllData();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to save revenue entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTrending = async (jobId: string, currentStatus: boolean) => {
    setTogglingId(jobId);
    try {
      await toggleTrendingStatus(jobId, !currentStatus);
      toast.success(currentStatus ? "Job unmarked as trending." : "Job marked as trending.");
      fetchAllData();
    } catch {
      toast.error("Failed to toggle trending status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (rev: Revenue) => {
    if (!window.confirm(`Delete this revenue entry (${rev.currency} ${rev.amount})? This can't be undone.`)) return;
    try {
      await deleteRevenue(rev._id);
      toast.success("Revenue entry deleted.");
      fetchAllData();
    } catch {
      toast.error("Failed to delete revenue entry.");
    }
  };

  const openDrawer = async (revenue?: Revenue) => {
    if (revenue) {
      setEditMode(true);
      try {
        const jobResponse = await fetchJobsByEmployer(revenue.paidBy._id);
        setJobs(jobResponse.jobs);
      } catch {
        setJobs([]);
      }
      setFormData({
        _id: revenue._id,
        amount: revenue.amount,
        currency: revenue.currency || "USD",
        paidBy: revenue.paidBy._id,
        paidFor: revenue.paidFor._id,
        remarks: revenue.remarks,
      });
    } else {
      setEditMode(false);
      setFormData({});
      setJobs([]);
    }
    setShowDrawer(true);
  };

  const columns: DataTableColumn<Revenue>[] = [
    {
      key: "amount",
      header: "Amount",
      render: (rev) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {rev.currency || "USD"} {rev.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "paidBy",
      header: "Paid By",
      render: (rev) => <span className="text-slate-700 dark:text-slate-300">{rev.paidBy?.name || "—"}</span>,
    },
    {
      key: "paidFor",
      header: "Paid For",
      render: (rev) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate text-slate-700 dark:text-slate-300">{rev.paidFor?.title || "—"}</p>
        </div>
      ),
    },
    {
      key: "trending",
      header: "Job Status",
      render: (rev) => (
        <StatusBadge
          label={rev.paidFor?.istrending ? "Trending" : "Basic"}
          tone={rev.paidFor?.istrending ? "success" : "neutral"}
        />
      ),
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (rev) => (
        <span className="max-w-[180px] truncate text-slate-500 dark:text-slate-400">{rev.remarks || "—"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (rev) => (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDate(rev.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (rev) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => rev.paidFor?._id && handleToggleTrending(rev.paidFor._id, rev.paidFor.istrending)}
            disabled={togglingId === rev.paidFor?._id}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {rev.paidFor?.istrending ? "Unmark" : "Mark Trending"}
          </button>
          <button
            onClick={() => openDrawer(rev)}
            title="Edit"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(rev)}
            title="Delete"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Revenue Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Payments received from employers for job boosts and trending placements.
          </p>
        </div>
        <button
          onClick={() => openDrawer()}
          className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <Plus size={16} /> Add Revenue
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Entries" value={kpis.totalEntries} icon={<Wallet size={18} />} accent="teal" loading={loading} />
        <KpiCard
          label="Top Currency Total"
          value={kpis.topCurrencyLabel}
          icon={<DollarSign size={18} />}
          accent="green"
          loading={loading}
          description={kpis.currencyBreakdown.length > 1 ? `${kpis.currencyBreakdown.length} currencies in use` : undefined}
        />
        <KpiCard label="Trending Jobs Funded" value={kpis.trendingFunded} icon={<TrendingUp size={18} />} accent="amber" loading={loading} />
        <KpiCard label="Paying Employers" value={kpis.employerCount} icon={<Users size={18} />} accent="blue" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={revenues}
        getRowKey={(rev) => rev._id}
        loading={loading}
        emptyTitle="No revenue recorded yet"
        emptyDescription="Payments from employers for job boosts will show up here once recorded."
      />

      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editMode ? "Edit Revenue Entry" : "Add Revenue Entry"}
        widthClassName="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDrawer(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : editMode ? "Update Entry" : "Add Entry"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Employer</label>
            <select
              value={formData.paidBy || ""}
              onChange={(e) => handleEmployerChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Select employer</option>
              {employers.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Job</label>
            <select
              value={formData.paidFor || ""}
              onChange={(e) => setFormData({ ...formData, paidFor: e.target.value })}
              disabled={!formData.paidBy}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Select job</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Amount</label>
              <input
                type="number"
                min={0}
                value={formData.amount ?? ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Currency</label>
              <select
                value={formData.currency || "USD"}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Remarks (optional)</label>
            <textarea
              value={formData.remarks || ""}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {!editMode && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              Adding a new revenue entry automatically marks the selected job as trending.
            </p>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default RevenueManagement;
