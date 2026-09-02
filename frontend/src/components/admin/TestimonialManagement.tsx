import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Star, User as UserIcon } from "lucide-react";
import { DataTable, DataTableColumn } from "../ui/DataTable";
import { StatusBadge } from "../ui/StatusBadge";
import { Drawer } from "../ui/Drawer";
import {
  adminGetTestimonials,
  adminCreateTestimonial,
  adminUpdateTestimonial,
  adminToggleTestimonial,
  adminDeleteTestimonial,
  type Testimonial,
} from "../../api/testimonialApi";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";
const resolveImage = (url: string) => `${MEDIA_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;

const EMPTY_FORM = {
  name: "",
  role: "",
  company: "",
  quote: "",
  rating: 5,
  isActive: true,
};

const TestimonialManagement: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminGetTestimonials({ page, limit: 10, search });
      setTestimonials(res.testimonials);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast.error("Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAvatarFile(null);
    setAvatarPreview(null);
    setDrawerOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      name: t.name,
      role: t.role || "",
      company: t.company || "",
      quote: t.quote,
      rating: t.rating || 5,
      isActive: t.isActive,
    });
    setAvatarFile(null);
    setAvatarPreview(t.avatarUrl ? resolveImage(t.avatarUrl) : null);
    setDrawerOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.quote.trim()) {
      toast.error("Name and quote are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        company: form.company.trim(),
        quote: form.quote.trim(),
        rating: form.rating,
        isActive: form.isActive,
        avatar: avatarFile,
      };
      if (editing) {
        await adminUpdateTestimonial(editing._id, payload);
        toast.success("Testimonial updated.");
      } else {
        await adminCreateTestimonial(payload);
        toast.success("Testimonial created.");
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to save testimonial.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: Testimonial) => {
    try {
      await adminToggleTestimonial(t._id);
      toast.success(t.isActive ? "Testimonial unpublished." : "Testimonial published.");
      load();
    } catch {
      toast.error("Failed to update testimonial status.");
    }
  };

  const handleDelete = async (t: Testimonial) => {
    if (!window.confirm(`Delete the testimonial from "${t.name}"? This can't be undone.`)) return;
    try {
      await adminDeleteTestimonial(t._id);
      toast.success("Testimonial deleted.");
      load();
    } catch {
      toast.error("Failed to delete testimonial.");
    }
  };

  const columns: DataTableColumn<Testimonial>[] = [
    {
      key: "testimonial",
      header: "Testimonial",
      render: (t) => (
        <div className="flex items-center gap-3">
          {t.avatarUrl ? (
            <img src={resolveImage(t.avatarUrl)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <UserIcon size={16} />
            </div>
          )}
          <div className="min-w-0 max-w-sm">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">
              {t.name}
              {t.role || t.company ? (
                <span className="font-normal text-slate-400"> — {[t.role, t.company].filter(Boolean).join(", ")}</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-slate-400">{t.quote}</p>
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (t) => (
        <div className="flex items-center gap-0.5 text-amber-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={13} className={i < t.rating ? "fill-amber-400" : "text-slate-200 dark:text-slate-700"} />
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) => <StatusBadge label={t.isActive ? "Published" : "Unpublished"} tone={t.isActive ? "success" : "neutral"} />,
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => handleToggle(t)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t.isActive ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={() => openEdit(t)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(t)}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Testimonial Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} testimonial{total === 1 ? "" : "s"} — published ones are shown on the homepage.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Plus size={16} /> New Testimonial
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, company, or quote…"
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <DataTable
        columns={columns}
        data={testimonials}
        getRowKey={(t) => t._id}
        loading={loading}
        emptyTitle="No testimonials yet"
        emptyDescription="Add your first testimonial to have it shown on the homepage."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Testimonial" : "New Testimonial"}
        widthClassName="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Photo (optional)</label>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="mb-2 h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-200 text-slate-300 dark:border-slate-700">
                <UserIcon size={22} />
              </div>
            )}
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarChange} className="text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Role (optional)</label>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Software Engineer"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Company (optional)</label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Quote</label>
            <textarea
              value={form.quote}
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
              rows={4}
              maxLength={600}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Rating</label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm({ ...form, rating: i + 1 })}
                  className="p-0.5"
                >
                  <Star size={20} className={i < form.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"} />
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Published (visible on the homepage)
          </label>
        </div>
      </Drawer>
    </div>
  );
};

export default TestimonialManagement;
