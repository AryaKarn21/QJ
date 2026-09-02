import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, FolderOpen, FileText } from "lucide-react";
import { DataTable, DataTableColumn } from "../ui/DataTable";
import { StatusBadge } from "../ui/StatusBadge";
import { Drawer } from "../ui/Drawer";
import {
  adminGetBlogCategories,
  adminCreateBlogCategory,
  adminUpdateBlogCategory,
  adminDeleteBlogCategory,
  type BlogCategory,
} from "../../api/blogCategoryApi";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";
const resolveImage = (url: string) => `${MEDIA_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;

const EMPTY_FORM = {
  name: "",
  description: "",
  isActive: true,
};

const BlogCategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminGetBlogCategories();
      setCategories(res);
    } catch {
      toast.error("Failed to load blog categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIconFile(null);
    setIconPreview(null);
    setDrawerOpen(true);
  };

  const openEdit = (c: BlogCategory) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "", isActive: c.isActive });
    setIconFile(null);
    setIconPreview(c.icon ? resolveImage(c.icon) : null);
    setDrawerOpen(true);
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Icon must be 1MB or smaller.");
      return;
    }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
        icon: iconFile,
      };
      if (editing) {
        await adminUpdateBlogCategory(editing._id, payload);
        toast.success("Category updated.");
      } else {
        await adminCreateBlogCategory(payload);
        toast.success("Category created.");
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: BlogCategory) => {
    if (!window.confirm(`Delete "${c.name}"? Blogs already tagged with it keep the label, but it won't be selectable or browsable anymore.`)) return;
    try {
      await adminDeleteBlogCategory(c._id);
      toast.success("Category deleted.");
      load();
    } catch {
      toast.error("Failed to delete category.");
    }
  };

  const columns: DataTableColumn<BlogCategory>[] = [
    {
      key: "category",
      header: "Category",
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.icon ? (
            <img src={resolveImage(c.icon)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover bg-slate-50" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
              <FolderOpen size={16} />
            </div>
          )}
          <div className="min-w-0 max-w-xs">
            <p className="truncate font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
            <p className="truncate text-xs text-slate-400">/blog/category/{c.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "blogCount",
      header: "Blogs",
      render: (c) => (
        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <FileText size={13} /> {c.blogCount ?? 0}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge label={c.isActive ? "Active" : "Inactive"} tone={c.isActive ? "success" : "neutral"} />,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => openEdit(c)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(c)}
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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Blog Categories</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} — active ones appear in "Explore Categories" and the blog category dropdown.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowKey={(c) => c._id}
        loading={loading}
        emptyTitle="No blog categories yet"
        emptyDescription="Create your first category to organize blog posts and show it under Explore Categories."
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Category" : "New Category"}
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
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Icon (optional)</label>
            {iconPreview ? (
              <img src={iconPreview} alt="Preview" className="mb-2 h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 dark:border-slate-700">
                <FolderOpen size={22} />
              </div>
            )}
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleIconChange} className="text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Technology"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Shown at the top of this category's page, e.g. Explore technology, AI and software career insights."
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active (shown on the homepage/blog page and selectable when writing a blog)
          </label>
        </div>
      </Drawer>
    </div>
  );
};

export default BlogCategoryManagement;
