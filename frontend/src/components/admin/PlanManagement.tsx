import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  type Plan,
} from '../../api/subscriptionApi';

const EMPTY_FORM = {
  name: '',
  role: 'employer' as 'employer' | 'jobseeker' | 'both',
  description: '',
  price: 0,
  currency: 'NPR',
  billingCycle: 'monthly' as 'monthly' | 'yearly',
  features: '',
  isActive: true,
};

export default function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getPlans()
      .then(setPlans)
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      role: plan.role,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      features: plan.features.join('\n'),
      isActive: plan.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.price < 0) {
      toast.error('Plan name and a valid price are required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      role: form.role,
      description: form.description.trim(),
      price: Number(form.price),
      currency: form.currency,
      billingCycle: form.billingCycle,
      features: form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      isActive: form.isActive,
    };

    try {
      setSaving(true);
      if (editing) {
        await updatePlan(editing._id, payload);
        toast.success('Plan updated.');
      } else {
        await createPlan(payload);
        toast.success('Plan created.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return;
    try {
      await deletePlan(plan._id);
      toast.success('Plan deleted.');
      load();
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message || 'Failed to delete plan.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage employer and jobseeker subscription plans (eSewa / Khalti).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
        >
          <Plus size={16} /> New Plan
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Audience</th>
              <th className="text-left px-4 py-3">Price</th>
              <th className="text-left px-4 py-3">Cycle</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  No plans yet — create one to get started.
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{plan.name}</td>
                  <td className="px-4 py-3 capitalize">{plan.role}</td>
                  <td className="px-4 py-3">
                    {plan.currency} {plan.price}
                  </td>
                  <td className="px-4 py-3 capitalize">{plan.billingCycle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editing ? 'Edit Plan' : 'New Plan'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600">Plan name</label>
                <input
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">Audience</label>
                  <select
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as typeof EMPTY_FORM.role })
                    }
                  >
                    <option value="employer">Employer</option>
                    <option value="jobseeker">Jobseeker</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Billing cycle</label>
                  <select
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                    value={form.billingCycle}
                    onChange={(e) =>
                      setForm({ ...form, billingCycle: e.target.value as typeof EMPTY_FORM.billingCycle })
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">Price (NPR)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Currency</label>
                  <input
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600">Description</label>
                <textarea
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">Features (one per line)</label>
                <textarea
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  rows={4}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active (visible to users)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}