import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Plus,
  Pencil,
  Trash2,
  Tags,
  Loader2,
  Search,
  X,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
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
import { resolveMediaUrl } from '../../../utils/mediaUrl';

const iconUrl = (icon?: string) => {
  if (!icon) return '';
  if (/^https?:\/\//i.test(icon.trim())) return icon.trim();
  const relPath = icon.includes('/') ? icon : `uploads/icons/${icon}`;
  return resolveMediaUrl(relPath);
};

interface FormState {
  name: string;
  description: string;
  icon: File | null;
}

const EMPTY_FORM: FormState = { name: '', description: '', icon: null };

type StatusFilter = 'all' | 'active' | 'inactive';
type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const JobCategories: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<EmployerJobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search, Filter & View Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmployerJobCategory | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete State
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

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (iconPreview && iconPreview.startsWith('blob:')) {
        URL.revokeObjectURL(iconPreview);
      }
    };
  }, [iconPreview]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIconPreview(null);
    setModalOpen(true);
  };

  const openEdit = (category: EmployerJobCategory) => {
    setEditing(category);
    setForm({ name: category.name, description: category.description || '', icon: null });
    setIconPreview(category.icon ? iconUrl(category.icon) : null);
    setModalOpen(true);
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, icon: file }));
    if (file) {
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveIcon = () => {
    setForm((f) => ({ ...f, icon: null }));
    setIconPreview(null);
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
        toast.success('Category updated successfully');
      } else {
        const created = await createEmployerJobCategory({
          name,
          description: form.description.trim(),
          icon: form.icon,
        });
        setCategories((prev) => [created, ...prev]);
        toast.success('Category created successfully');
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
      toast.info(`Category set to ${nextStatus}.`);
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
        setDeleteBlockedCount(jobCount);
      } else {
        toast.error(getFriendlyErrorMessage(err, 'Could not delete this category.'));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Metrics calculation
  const totalCount = categories.length;
  const activeCount = useMemo(() => categories.filter((c) => c.status === 'active').length, [categories]);
  const inactiveCount = totalCount - activeCount;

  // Filtered & Sorted Categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const matchesQuery =
          cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus =
          statusFilter === 'all' ? true : cat.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'name-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name-desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });
  }, [categories, searchQuery, statusFilter, sortBy]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#F8FAFC] min-h-full">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Back Navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-all hover:text-orange-600"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        {/* ══ HEADER ════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <Tags size={22} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Job Categories
              </h1>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                {totalCount}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              Create your own hiring categories — they will appear seamlessly alongside standard platform categories when posting jobs.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:brightness-105 active:scale-98"
          >
            <Plus size={17} className="stroke-[2.5]" />
            Create Category
          </button>
        </div>

        {/* ══ METRICS CARDS ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-5 shadow-xs">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Categories</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{totalCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <Tags size={22} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-5 shadow-xs">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Active in Job Posts</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{activeCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white p-5 shadow-xs">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Draft / Inactive</p>
              <p className="mt-1 text-2xl font-bold text-slate-500">{inactiveCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <XCircle size={22} />
            </div>
          </div>
        </div>

        {/* ══ SEARCH & CONTROLS TOOLBAR ════════════════════════════ */}
        <div className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories by name or description…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-9 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Tabs & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                    statusFilter === tab
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-lg p-1.5 transition-colors ${
                  viewMode === 'grid' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-lg p-1.5 transition-colors ${
                  viewMode === 'list' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ══ CONTENT AREA ═════════════════════════════════════════ */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-orange-100 bg-white/80 p-5" />
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            icon={<Tags size={22} />}
            title="Could not load categories"
            description={loadError}
            action={
              <button onClick={load} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                Retry
              </button>
            }
          />
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 mb-3">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No custom job categories yet</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              Create a custom category for specialized roles unique to your company. It will be instantly selectable when posting jobs.
            </p>
            <button
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Plus size={16} /> Create Your First Category
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Search size={28} className="mx-auto text-slate-400 mb-2" />
            <h3 className="text-base font-bold text-slate-800">No matching categories found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Try adjusting your search keyword or switching your status filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-4 text-xs font-semibold text-orange-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ══ GRID VIEW ══════════════════════════════════════════ */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((category) => {
              const icon = iconUrl(category.icon);
              return (
                <div
                  key={category._id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-orange-100 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                >
                  <div>
                    {/* Top row: Icon & Status Toggle */}
                    <div className="flex items-start justify-between gap-3">
                      {icon ? (
                        <img
                          src={icon}
                          alt={category.name}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover border border-slate-100 shadow-xs"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fb = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 text-orange-600 border border-orange-100"
                        style={{ display: icon ? 'none' : 'flex' }}
                      >
                        <Tags size={22} />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(category)}
                        disabled={togglingId === category._id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-60 ${
                          category.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200/60'
                        }`}
                        title={`Click to switch to ${category.status === 'active' ? 'inactive' : 'active'}`}
                      >
                        {togglingId === category._id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              category.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                        )}
                        {category.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    {/* Title & Description */}
                    <div className="mt-3.5">
                      <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-orange-600 transition-colors">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {category.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(category.createdAt)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        title="Edit category"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(category);
                          setDeleteBlockedCount(null);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ══ LIST VIEW ══════════════════════════════════════════ */
          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xs">
            <div className="divide-y divide-slate-100">
              {filteredCategories.map((category) => {
                const icon = iconUrl(category.icon);
                return (
                  <div
                    key={category._id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-orange-50/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      {icon ? (
                        <img
                          src={icon}
                          alt={category.name}
                          className="h-10 w-10 shrink-0 rounded-xl object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                          <Tags size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-slate-800 text-sm">{category.name}</p>
                          <span className="text-[11px] text-slate-400">&bull; {formatDate(category.createdAt)}</span>
                        </div>
                        {category.description && (
                          <p className="truncate text-xs text-slate-500 mt-0.5">{category.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(category)}
                        disabled={togglingId === category._id}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-60 ${
                          category.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {togglingId === category._id && <Loader2 size={11} className="animate-spin" />}
                        {category.status === 'active' ? 'Active' : 'Inactive'}
                      </button>

                      <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(category);
                            setDeleteBlockedCount(null);
                          }}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ CREATE / EDIT MODAL ════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Tags size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? 'Edit Job Category' : 'Create Custom Job Category'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Software Engineering, Cloud Architecture"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Briefly describe the role domain covered by this category…"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Icon Uploader */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Icon <span className="text-slate-400 font-normal lowercase">(optional image)</span>
                </label>

                {iconPreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-orange-100 bg-orange-50/50">
                    <img
                      src={iconPreview}
                      alt="Preview"
                      className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {form.icon?.name || 'Current Icon'}
                      </p>
                      <p className="text-[11px] text-slate-400">Image selected for category</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Remove icon"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <ImageIcon size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-orange-600 hover:underline">Click to upload</span>
                      <span className="text-xs text-slate-400"> or drag and drop</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : editing ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM DIALOG ══════════════════════════════════ */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteBlockedCount(null);
        }}
        onConfirm={confirmDelete}
        loading={deleting}
        title={deleteBlockedCount !== null ? 'Delete Category With Active Jobs?' : `Delete "${deleteTarget?.name}"?`}
        description={
          deleteBlockedCount !== null
            ? `${deleteBlockedCount} job vacancy listing${deleteBlockedCount === 1 ? '' : 's'} currently reference this custom category. Deleting it will keep those jobs, but the category will no longer be selectable for future postings.`
            : 'Are you sure you want to remove this category? This action cannot be undone.'
        }
        confirmLabel={deleteBlockedCount !== null ? 'Delete Anyway' : 'Delete Category'}
      />
    </div>
  );
};

export default JobCategories;
