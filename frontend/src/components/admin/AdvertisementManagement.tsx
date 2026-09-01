import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Eye, MousePointerClick, Image as ImageIcon } from "lucide-react";
import { DataTable, DataTableColumn } from "../ui/DataTable";
import { StatusBadge } from "../ui/StatusBadge";
import { Drawer } from "../ui/Drawer";
import {
  adminGetAdvertisements,
  adminCreateAdvertisement,
  adminUpdateAdvertisement,
  adminToggleAdvertisement,
  adminDeleteAdvertisement,
  type Advertisement,
  type AdPlacement,
} from "../../api/advertisementApi";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";
const resolveImage = (url: string) => `${MEDIA_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  homepage: "Homepage",
  jobs_page: "Job Listings",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  linkUrl: "",
  placement: "homepage" as AdPlacement,
  isActive: true,
  startDate: "",
  endDate: "",
};

// Real, computed from isActive + the scheduling window — not a stored
// field that could drift out of sync with the dates.
const computeStatus = (ad: Advertisement): { label: string; tone: "success" | "neutral" | "warning" } => {
  if (!ad.isActive) return { label: "Inactive", tone: "neutral" };
  const now = new Date();
  if (ad.startDate && new Date(ad.startDate) > now) return { label: "Scheduled", tone: "warning" };
  if (ad.endDate && new Date(ad.endDate) < now) return { label: "Expired", tone: "neutral" };
  return { label: "Live", tone: "success" };
};

const AdvertisementManagement: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [placementFilter, setPlacementFilter] = useState<AdPlacement | "">("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminGetAdvertisements({ page, limit: 10, search, placement: placementFilter || undefined });
      setAds(res.ads);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast.error("Failed to load advertisements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, placementFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setDrawerOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setEditing(ad);
    setForm({
      title: ad.title,
      description: ad.description || "",
      linkUrl: ad.linkUrl,
      placement: ad.placement,
      isActive: ad.isActive,
      startDate: ad.startDate ? ad.startDate.slice(0, 10) : "",
      endDate: ad.endDate ? ad.endDate.slice(0, 10) : "",
    });
    setImageFile(null);
    setImagePreview(resolveImage(ad.imageUrl));
    setDrawerOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be 3MB or smaller.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.linkUrl.trim()) {
      toast.error("Title and link are required.");
      return;
    }
    if (!editing && !imageFile) {
      toast.error("An image is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        linkUrl: form.linkUrl.trim(),
        placement: form.placement,
        isActive: form.isActive,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        image: imageFile,
      };
      if (editing) {
        await adminUpdateAdvertisement(editing._id, payload);
        toast.success("Advertisement updated.");
      } else {
        await adminCreateAdvertisement(payload);
        toast.success("Advertisement created.");
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to save advertisement.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ad: Advertisement) => {
    try {
      await adminToggleAdvertisement(ad._id);
      toast.success(ad.isActive ? "Advertisement deactivated." : "Advertisement activated.");
      load();
    } catch {
      toast.error("Failed to update advertisement status.");
    }
  };

  const handleDelete = async (ad: Advertisement) => {
    if (!window.confirm(`Delete "${ad.title}"? This can't be undone.`)) return;
    try {
      await adminDeleteAdvertisement(ad._id);
      toast.success("Advertisement deleted.");
      load();
    } catch {
      toast.error("Failed to delete advertisement.");
    }
  };

  const columns: DataTableColumn<Advertisement>[] = [
    {
      key: "ad",
      header: "Advertisement",
      render: (ad) => (
        <div className="flex items-center gap-3">
          <img src={resolveImage(ad.imageUrl)} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 max-w-xs">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{ad.title}</p>
            <p className="truncate text-xs text-slate-400">{ad.linkUrl}</p>
          </div>
        </div>
      ),
    },
    {
      key: "placement",
      header: "Placement",
      render: (ad) => <span className="text-slate-600 dark:text-slate-300">{PLACEMENT_LABELS[ad.placement]}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (ad) => {
        const status = computeStatus(ad);
        return <StatusBadge label={status.label} tone={status.tone} />;
      },
    },
    {
      key: "performance",
      header: "Impressions / Clicks",
      render: (ad) => (
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Eye size={13} /> {ad.impressions.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MousePointerClick size={13} /> {ad.clicks.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (ad) => (
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => handleToggle(ad)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {ad.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => openEdit(ad)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(ad)}
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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Advertisement Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} advertisement{total === 1 ? "" : "s"} — shown on the homepage and job listings pages.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Plus size={16} /> New Advertisement
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by title…"
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={placementFilter}
          onChange={(e) => { setPlacementFilter(e.target.value as AdPlacement | ""); setPage(1); }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All placements</option>
          <option value="homepage">Homepage</option>
          <option value="jobs_page">Job Listings</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={ads}
        getRowKey={(ad) => ad._id}
        loading={loading}
        emptyTitle="No advertisements yet"
        emptyDescription="Create your first advertisement to have it shown on the homepage or job listings page."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Advertisement" : "New Advertisement"}
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
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Banner Image</label>
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="mb-2 h-32 w-full rounded-lg object-cover" />
            ) : (
              <div className="mb-2 flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 dark:border-slate-700">
                <ImageIcon size={28} />
              </div>
            )}
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageChange} className="text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Link URL</label>
            <input
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="/jobs or https://…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Placement</label>
            <select
              value={form.placement}
              onChange={(e) => setForm({ ...form, placement: e.target.value as AdPlacement })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="homepage">Homepage</option>
              <option value="jobs_page">Job Listings</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Start date (optional)</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">End date (optional)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
      </Drawer>
    </div>
  );
};

export default AdvertisementManagement;
