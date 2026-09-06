import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Tags, Loader2 } from 'lucide-react';
import {
  getMyJobCategories,
  createEmployerJobCategory,
  updateEmployerJobCategory,
  setEmployerJobCategoryStatus,
  deleteEmployerJobCategory,
  type EmployerJobCategory,
} from './jobCategoriesApi';
import { EmptyState } from '../../ui/EmptyState';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { getFriendlyErrorMessage } from '../../../utils/apiError';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';
const iconUrl = (icon?: string) => (icon ? `${MEDIA_URL.replace(/\/$/, '')}/uploads/icons/${icon.replace(/^\//, '')}` : '');

interface FormState {
  name: string;
  description: string;
  icon: File | null;
}

const EMPTY_FORM: FormState = { name: '', description: '', icon: null };

/**
 * Employer Dashboard → Settings → Job Categories. Manages categories THIS
 * employer created — separate from, but appearing alongside, the
 * admin-seeded system categories in the "Post a Job" dropdown (see
 * jobCategoryController.js's getJobCategories, which merges both scopes).
 */
const JobCategories: React.FC = () => {
  const [categories, setCategories] = useState<EmployerJobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmployerJobCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EmployerJobCategory | null>(null);
  const [deleteBlockedCount, setDeleteBlockedCount] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getMyJobCategories();
      setCategories(data);
    } catch (err) {
      setLoadError(getFriendlyErrorMessage(err, 'Could not load your job categories.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (category: EmployerJobCategory) => {
    setEditing(category);
    setForm({ name: category.name, description: category.description || '', icon: null });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Category name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateEmployerJobCategory(editing._id, {
          name,
          description: form.description.trim(),
          icon: form.icon,
        });
        setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        toast.success('✓ Category updated successfully');
      } else {
        const created = await createEmployerJobCategory({ name, description: form.description.trim(), icon: form.icon });
        setCategories((prev) => [created, ...prev]);
        toast.success('✓ Category created successfully');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not save this category.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (category: EmployerJobCategory) => {
    setTogglingId(category._id);
    const nextStatus = category.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await setEmployerJobCategoryStatus(category._id, nextStatus);
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not update category status.'));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployerJobCategory(deleteTarget._id, deleteBlockedCount !== null);
      setCategories((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      toast.success('Category deleted successfully');
      setDeleteTarget(null);
      setDeleteBlockedCount(null);
    } catch (err: any) {
      const jobCount = err?.response?.data?.jobCount;
      if (err?.response?.status === 409 && typeof jobCount === 'number') {
        // Ask again with the force flag, showing exactly how many jobs are affected.
        setDeleteBlockedCount(jobCount);
      } else {
        toast.error(getFriendlyErrorMessage(err, 'Could not delete this category.'));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-50px)] bg-[#FFF8F3] p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Job Categories</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create your own hiring categories — they'll appear alongside the standard categories when you post a job.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 sm:w-auto"
          >
            <Plus size={16} /> Create Category
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-orange-100 bg-white/80" />
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={<Tags size={22} />}
            title="Couldn't load your categories"
            description={loadError}
            action={
              <button onClick={load} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Retry
              </button>
            }
          />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<Tags size={22} />}
            title="No custom categories yet"
            description="Create a category for a role type unique to your company — it'll show up in your Post a Job dropdown right away."
            action={
              <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Create Category
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category._id}
                className="flex flex-col gap-3 rounded-xl border border-orange-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {category.icon ? (
                    <img src={iconUrl(category.icon)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                      <Tags size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{category.name}</p>
                    {category.description && <p className="truncate text-sm text-slate-500">{category.description}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(category)}
                    disabled={togglingId === category._id}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
                      category.status === 'active' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {togglingId === category._id && <Loader2 size={11} className="animate-spin" />}
                    {category.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    aria-label={`Edit ${category.name}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(category);
                      setDeleteBlockedCount(null);
                    }}
                    aria-label={`Delete ${category.name}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-800">{editing ? 'Edit Category' : 'Create Category'}</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Name <span className="text-rose-500">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Digital Marketing"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional — helps candidates understand what this category covers"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Icon (optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.files?.[0] || null }))}
                  className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteBlockedCount(null);
        }}
        onConfirm={confirmDelete}
        loading={deleting}
        title={deleteBlockedCount !== null ? 'Delete anyway?' : `Delete "${deleteTarget?.name}"?`}
        description={
          deleteBlockedCount !== null
            ? `${deleteBlockedCount} job${deleteBlockedCount === 1 ? '' : 's'} still list this category. Deleting it won't change those jobs, but the category will no longer be selectable.`
            : 'This cannot be undone.'
        }
        confirmLabel={deleteBlockedCount !== null ? 'Delete anyway' : 'Delete'}
      />
    </div>
  );
};

export default JobCategories;
