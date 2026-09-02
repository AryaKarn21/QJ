import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  BookText,
  Eye,
  Files,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutTemplate,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { Drawer } from '../../ui/Drawer';
import { StatusBadge } from '../../ui/StatusBadge';
import { EmptyState } from '../../ui/EmptyState';
import {
  AdminBlog,
  CareerTip,
  CmsGenericPage,
  Faq,
  adminDeleteBlog,
  createCareerTip,
  createCmsGenericPage,
  createFaq,
  deleteCareerTip,
  deleteCmsGenericPage,
  deleteFaq,
  getAdminBlogs,
  getCareerTips,
  getCmsPage,
  getCmsPageById,
  getCmsPages,
  getFaqs,
  getHomepageContentAdmin,
  saveCmsPage,
  saveHomepageContent,
  toggleBlogPublish,
  toggleCmsPagePublish,
  updateCareerTip,
  updateCmsGenericPage,
  updateFaq,
  uploadCmsImage,
} from '../adminApi/api';

type TabId = 'blogs' | 'pages' | 'faqs' | 'career-tips' | 'legal' | 'homepage';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'blogs', label: 'Blogs', icon: <BookText size={14} /> },
  { id: 'pages', label: 'Pages', icon: <Files size={14} /> },
  { id: 'faqs', label: 'FAQs', icon: <HelpCircle size={14} /> },
  { id: 'career-tips', label: 'Career Tips', icon: <GraduationCap size={14} /> },
  { id: 'legal', label: 'Legal', icon: <FileText size={14} /> },
  { id: 'homepage', label: 'Homepage', icon: <LayoutTemplate size={14} /> },
];

// Every ReactQuill instance on this page lives inside a Drawer whose
// content area scrolls (`overflow-y-auto` — see ui/Drawer.tsx), which clips
// Quill's default link tooltip. The first fix attempt passed a custom
// `handlers.link` via the `modules` prop, but Quill assembles its final
// config with `extend(true, {}, Quill.DEFAULTS, moduleDefaults, themeConfig,
// userConfig)` (see quill/core/quill.js#expandConfig) — with three other
// layers (the toolbar module's own defaults, and the snow theme's, which
// also declares a `link` handler) merging around whatever `modules` prop
// react-quill is given. Config-based overrides through that pipeline proved
// unreliable in this project's react-quill/quill combo. Talking to the
// live Toolbar module instance directly — `toolbar.addHandler(format, fn)`,
// which is just `this.handlers[format] = fn` (quill/modules/toolbar.js) —
// sidesteps the merge pipeline completely and is the pattern react-quill's
// own docs recommend for reliable handler overrides.
const QUILL_TOOLBAR_CONTAINER = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline'],
  ['link', 'image'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
];
const QUILL_MODULES = { toolbar: QUILL_TOOLBAR_CONTAINER };

const CMS_IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const CMS_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // matches backend/middleware/cmsUploadMiddleware.js

// `quill` ships no usable TypeScript declarations for module internals
// (`getModule` on the `Quill` type resolves to `any`), so this is typed
// loosely on purpose rather than depending on types that don't exist.
interface QuillLike {
  getSelection(focus?: boolean): { index: number; length: number } | null;
  getLength(): number;
  format(name: string, value: unknown): void;
  insertEmbed(index: number, type: string, value: unknown, source?: string): void;
  setSelection(index: number, length?: number, source?: string): void;
}

function quillLinkHandler(this: { quill: QuillLike }, value: boolean) {
  if (!value) {
    this.quill.format('link', false);
    return;
  }
  const range = this.quill.getSelection();
  if (!range || range.length === 0) {
    window.alert('Select some text first, then click the link button.');
    return;
  }
  const url = window.prompt('Enter a URL (https://…):');
  if (!url) return;
  const safe = /^https?:\/\//i.test(url) || url.startsWith('/');
  if (!safe) {
    window.alert('Links must start with http://, https://, or / (a relative path).');
    return;
  }
  this.quill.format('link', url);
}

// The "attachment" button (an image icon in Quill's default set — easy to
// mistake for a paperclip). A few defensive choices here, each guarding
// against a way this could silently do nothing instead of visibly failing:
//  - `getSelection(true)` forces the editor to (re)focus, but its return
//    can still legitimately be null on some documents/timings; fall back
//    to the end of the content instead of bailing out with zero feedback.
//  - The file input is appended to the DOM (hidden) before `.click()` —
//    some browsers only reliably open the native picker for an
//    input that's actually attached, not a detached element.
//  - Everything is wrapped in try/catch with a console.error + alert, so
//    an unexpected exception surfaces instead of looking like a dead
//    button.
function quillImageHandler(this: { quill: QuillLike }) {
  try {
    const quill = this.quill;
    const range = quill.getSelection(true) ?? { index: Math.max(quill.getLength() - 1, 0), length: 0 };

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = CMS_IMAGE_ACCEPT;
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => input.remove();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        return;
      }
      if (file.size > CMS_IMAGE_MAX_BYTES) {
        window.alert('Image is too large. Please choose a file under 5MB.');
        cleanup();
        return;
      }
      try {
        const { url } = await uploadCmsImage(file);
        quill.insertEmbed(range.index, 'image', url, 'user');
        quill.setSelection(range.index + 1, 0, 'user');
      } catch (err) {
        console.error('CMS image upload failed:', err);
        window.alert('Failed to upload image. Please try again.');
      } finally {
        cleanup();
      }
    };
    input.click();
  } catch (err) {
    console.error('CMS image picker failed to open:', err);
    window.alert('Could not open the file picker. Please try again.');
  }
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

/**
 * Shared ReactQuill wrapper for every rich-text field in the CMS hub
 * (Pages, Career Tips, Legal). Wires the link and image ("attachment")
 * buttons imperatively after mount — see the comment above `QUILL_MODULES`
 * for why that beats passing handlers through the `modules` prop.
 */
function RichTextEditor({ value, onChange, style }: RichTextEditorProps) {
  const quillRef = React.useRef<ReactQuill>(null);

  useEffect(() => {
    const toolbar = quillRef.current?.getEditor().getModule('toolbar');
    toolbar?.addHandler('link', quillLinkHandler);
    toolbar?.addHandler('image', quillImageHandler);
  }, []);

  return (
    <ReactQuill ref={quillRef} theme="snow" modules={QUILL_MODULES} value={value} onChange={onChange} style={style} />
  );
}

export const CmsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('blogs');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Content (CMS)</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Blogs, FAQs, Career Tips, and legal pages — all editable from here.
        </p>
      </div>

      <div className="mb-6 -mx-1 overflow-x-auto px-1">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60 sm:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'blogs' && <BlogsTab />}
      {activeTab === 'pages' && <PagesTab />}
      {activeTab === 'faqs' && <FaqsTab />}
      {activeTab === 'career-tips' && <CareerTipsTab />}
      {activeTab === 'legal' && <LegalTab />}
      {activeTab === 'homepage' && <HomepageTab />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Blogs — moderation over the existing user-authored Blog collection
// ---------------------------------------------------------------------------
function BlogsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cmsBlogs', search, page],
    queryFn: () => getAdminBlogs({ page, limit: 10, search }),
    retry: false,
  });

  const handleTogglePublish = async (blog: AdminBlog) => {
    await toggleBlogPublish(blog._id);
    queryClient.invalidateQueries({ queryKey: ['cmsBlogs'] });
  };

  const handleDelete = async (blog: AdminBlog) => {
    if (!window.confirm(`Delete "${blog.title}"? This can't be undone.`)) return;
    await adminDeleteBlog(blog._id);
    queryClient.invalidateQueries({ queryKey: ['cmsBlogs'] });
  };

  const columns: DataTableColumn<AdminBlog>[] = [
    {
      key: 'title',
      header: 'Blog',
      render: (b) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{b.title}</p>
          <p className="truncate text-xs text-slate-400">by {b.author?.name ?? 'Deleted user'}</p>
        </div>
      ),
    },
    {
      key: 'flags',
      header: '',
      render: (b) => b.isAIGenerated ? (
        <span className="flex items-center gap-1 text-xs font-medium text-violet-500">
          <Sparkles size={12} /> AI-assisted
        </span>
      ) : null,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (b) => <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'isPublished',
      header: 'Status',
      render: (b) => <StatusBadge label={b.isPublished ? 'Published' : 'Hidden'} tone={b.isPublished ? 'success' : 'neutral'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => handleTogglePublish(b)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {b.isPublished ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={() => handleDelete(b)}
            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load blogs. Make sure the backend is running and you're signed in as an admin or superadmin.
        </div>
      )}

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search blog titles…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.blogs ?? []}
        getRowKey={(b) => b._id}
        loading={isLoading}
        emptyTitle="No blogs yet"
        emptyDescription="Blogs written by jobseekers and employers will show up here for moderation."
        page={data?.page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pages — generic admin-authored pages (About Us, landing pages, etc.),
// distinct from the fixed Legal-page slugs below. Reuses DataTable/Drawer/
// StatusBadge/EmptyState/ReactQuill — same components every other tab uses.
// ---------------------------------------------------------------------------
const EMPTY_PAGE_FORM = { title: '', content: '', featuredImage: '', status: 'published' as 'draft' | 'published' };

function PagesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_PAGE_FORM);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cmsPages', search, page],
    queryFn: () => getCmsPages({ page, limit: 10, search }),
    retry: false,
  });

  const { data: editingPage, isLoading: loadingEditingPage } = useQuery({
    queryKey: ['cmsPage-edit', editingId],
    queryFn: () => getCmsPageById(editingId as string),
    enabled: typeof editingId === 'string' && editingId !== 'new',
  });

  useEffect(() => {
    if (editingId === 'new') {
      setForm(EMPTY_PAGE_FORM);
      setPreviewing(false);
    } else if (editingPage) {
      setForm({
        title: editingPage.title,
        content: editingPage.content,
        featuredImage: editingPage.featuredImage || '',
        status: editingPage.status,
      });
      setPreviewing(false);
    }
  }, [editingId, editingPage]);

  const closeDrawer = () => setEditingId(null);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        await createCmsGenericPage(form);
      } else if (editingId) {
        await updateCmsGenericPage(editingId, form);
      }
      queryClient.invalidateQueries({ queryKey: ['cmsPages'] });
      toast.success('Page saved.');
      closeDrawer();
    } catch (err) {
      console.error('Error saving CMS page:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save page. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (p: CmsGenericPage) => {
    await toggleCmsPagePublish(p._id);
    queryClient.invalidateQueries({ queryKey: ['cmsPages'] });
  };

  const handleDelete = async (p: CmsGenericPage) => {
    if (!window.confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    await deleteCmsGenericPage(p._id);
    queryClient.invalidateQueries({ queryKey: ['cmsPages'] });
  };

  const columns: DataTableColumn<CmsGenericPage>[] = [
    {
      key: 'title',
      header: 'Page',
      render: (p) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{p.title}</p>
          <p className="truncate text-xs text-slate-400">/{p.slug} · by {p.author?.name ?? 'Deleted user'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge label={p.status === 'published' ? 'Published' : 'Draft'} tone={p.status === 'published' ? 'success' : 'neutral'} />,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (p) => <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{new Date(p.updatedAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => setEditingId(p._id)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleTogglePublish(p)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {p.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={() => handleDelete(p)}
            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load pages. Make sure the backend is running and you're signed in as an admin or superadmin.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search page titles…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
        <button
          onClick={() => setEditingId('new')}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={15} /> New Page
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data?.pages ?? []}
        getRowKey={(p) => p._id}
        loading={isLoading}
        emptyTitle="No pages yet"
        emptyDescription="Create your first admin-authored page (About Us, a landing page, etc.)."
        page={data?.page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
      />

      <Drawer
        open={editingId !== null}
        onClose={closeDrawer}
        title={editingId === 'new' ? 'New Page' : 'Edit Page'}
        widthClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPreviewing((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Eye size={14} /> {previewing ? 'Back to editing' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Save size={15} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        {editingId !== 'new' && loadingEditingPage ? (
          <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        ) : previewing ? (
          <div className="space-y-3">
            {form.featuredImage && (
              <img src={form.featuredImage} alt="" className="h-40 w-full rounded-lg object-cover" />
            )}
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{form.title || 'Untitled page'}</h2>
            <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: form.content }} />
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Page title">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </Field>

            <Field label="Featured image URL (optional)">
              <input
                value={form.featuredImage}
                onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
                placeholder="https://…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </Field>

            <Field label="Content">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg">
                <RichTextEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} style={{ height: 260, marginBottom: 42 }} />
              </div>
            </Field>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.status === 'published'}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? 'published' : 'draft' })}
              />
              Published (visible at /p/{editingPage?.slug || '…'})
            </label>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------
function FaqsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Faq | 'new' | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cmsFaqs'],
    queryFn: () => getFaqs(true),
    retry: false,
  });

  const handleDelete = async (faq: Faq) => {
    if (!window.confirm(`Delete this FAQ?`)) return;
    await deleteFaq(faq._id);
    queryClient.invalidateQueries({ queryKey: ['cmsFaqs'] });
  };

  return (
    <div>
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load FAQs.
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={15} /> Add FAQ
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No FAQs yet" description="Add the questions jobseekers and employers ask most." />
      ) : (
        <ul className="space-y-2">
          {data.map((faq) => (
            <li
              key={faq._id}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{faq.question}</p>
                  {!faq.isActive && <StatusBadge label="Hidden" tone="neutral" />}
                  {faq.audience !== 'all' && <StatusBadge label={faq.audience} tone="info" />}
                </div>
                <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => setEditing(faq)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(faq)}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FaqDrawer
        faq={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: ['cmsFaqs'] });
        }}
      />
    </div>
  );
}

function FaqDrawer({
  faq,
  open,
  onClose,
  onSaved,
}: {
  faq: Faq | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [audience, setAudience] = useState<Faq['audience']>('all');
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setQuestion(faq?.question ?? '');
      setAnswer(faq?.answer ?? '');
      setAudience(faq?.audience ?? 'all');
      setOrder(faq?.order ?? 0);
      setIsActive(faq?.isActive ?? true);
    }
  }, [open, faq]);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const payload = { question, answer, audience, order, isActive };
      if (faq) {
        await updateFaq(faq._id, payload);
      } else {
        await createFaq(payload);
      }
      toast.success('FAQ saved.');
      onSaved();
    } catch (err) {
      console.error('Error saving FAQ:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save FAQ. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={faq ? 'Edit FAQ' : 'Add FAQ'}>
      <div className="space-y-4">
        <Field label="Question">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </Field>
        <Field label="Answer">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Audience">
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as Faq['audience'])}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="all">All</option>
              <option value="jobseeker">Job seekers</option>
              <option value="employer">Employers</option>
            </select>
          </Field>
          <Field label="Order">
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Visible on the public FAQ page
        </label>

        <button
          onClick={handleSave}
          disabled={saving || !question.trim() || !answer.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save FAQ'}
        </button>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Career Tips
// ---------------------------------------------------------------------------
function CareerTipsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CareerTip | 'new' | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cmsCareerTips'],
    queryFn: () => getCareerTips(true),
    retry: false,
  });

  const handleDelete = async (tip: CareerTip) => {
    if (!window.confirm(`Delete "${tip.title}"?`)) return;
    await deleteCareerTip(tip._id);
    queryClient.invalidateQueries({ queryKey: ['cmsCareerTips'] });
  };

  return (
    <div>
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load career tips.
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={15} /> Add Career Tip
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No career tips yet" description="Short advice cards for job seekers — resume tips, interview prep, and more." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((tip) => (
            <div key={tip._id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <StatusBadge label={tip.category} tone="accent" />
                {!tip.isActive && <StatusBadge label="Hidden" tone="neutral" />}
              </div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{tip.title}</p>
              <div
                className="mt-1 line-clamp-3 text-sm text-slate-500 dark:text-slate-400"
                dangerouslySetInnerHTML={{ __html: tip.content }}
              />
              <div className="mt-3 flex gap-1.5">
                <button
                  onClick={() => setEditing(tip)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(tip)}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CareerTipDrawer
        tip={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: ['cmsCareerTips'] });
        }}
      />
    </div>
  );
}

function CareerTipDrawer({
  tip,
  open,
  onClose,
  onSaved,
}: {
  tip: CareerTip | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(tip?.title ?? '');
      setCategory(tip?.category ?? 'General');
      setContent(tip?.content ?? '');
      setIsActive(tip?.isActive ?? true);
    }
  }, [open, tip]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const payload = { title, category, content, isActive };
      if (tip) {
        await updateCareerTip(tip._id, payload);
      } else {
        await createCareerTip(payload);
      }
      toast.success('Career tip saved.');
      onSaved();
    } catch (err) {
      console.error('Error saving career tip:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save career tip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={tip ? 'Edit Career Tip' : 'Add Career Tip'} widthClassName="max-w-xl">
      <div className="space-y-4">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </Field>
        <Field label="Category">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Resume, Interview, Career Growth"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </Field>
        <Field label="Content">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg">
            <RichTextEditor value={content} onChange={setContent} />
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Visible on the public Career Tips page
        </label>

        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save Career Tip'}
        </button>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Legal pages — Privacy Policy / Terms of Service
// ---------------------------------------------------------------------------
const LEGAL_PAGE_SLUGS = ['privacy-policy', 'terms-of-service', 'community-guidelines'] as const;
type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];
const LEGAL_PAGE_LABELS: Record<LegalPageSlug, string> = {
  'privacy-policy': 'Privacy Policy',
  'terms-of-service': 'Terms of Service',
  'community-guidelines': 'Community Guidelines',
};

function LegalTab() {
  const [slug, setSlug] = useState<LegalPageSlug>('privacy-policy');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cmsPage', slug],
    queryFn: () => getCmsPage(slug),
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setTitle(data.title || LEGAL_PAGE_LABELS[slug]);
      setContent(data.content || '');
      setSavedAt(null);
    }
  }, [data, slug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCmsPage(slug, { title, content });
      setSavedAt(new Date());
      toast.success(`${LEGAL_PAGE_LABELS[slug]} saved.`);
      // Without this, `data` (and its `isDraftPlaceholder: true`) stayed
      // exactly what it was on first load — the "This page hasn't been
      // created yet" banner never went away after a successful save, and
      // a follow-up edit could look like the first one never took, even
      // though the backend had already written it correctly.
      queryClient.invalidateQueries({ queryKey: ['cmsPage', slug] });
    } catch (err) {
      // Previously there was no catch at all — a failed save just quietly
      // re-enabled the button with zero indication anything went wrong,
      // which is exactly what "I saved it and it's gone" looks like from
      // the admin's side.
      console.error('Error saving legal page:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
        {LEGAL_PAGE_SLUGS.map((s) => (
          <button
            key={s}
            onClick={() => setSlug(s)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              slug === s
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {LEGAL_PAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : (
        <div className="space-y-4">
          {data?.isDraftPlaceholder && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              This page hasn't been created yet — write it below and save to publish it for the first time.
            </div>
          )}

          <Field label="Page title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </Field>

          <Field label="Content">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg">
              <RichTextEditor value={content} onChange={setContent} style={{ height: 320, marginBottom: 42 }} />
            </div>
          </Field>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Save size={15} /> {saving ? 'Saving…' : 'Save'}
            </button>
            {savedAt && (
              <span className="text-xs text-slate-400">Saved at {savedAt.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Homepage — Hero + closing-CTA copy only (see backend/models/HomepageContent.js
// for exactly what this covers and why: Stats.tsx's feature grid, and the
// already-dynamic Featured Jobs/Career Tips/Community sections, are
// deliberately NOT here — CMS controls content, not the whole component
// tree, per the original scoping note this tab used to show).
// ---------------------------------------------------------------------------
const EMPTY_HOMEPAGE_FORM = {
  isPublished: false,
  hero: {
    badgeText: '', headline: '', headlineAccent: '', subheadline: '',
    primaryCtaText: '', primaryCtaLink: '', secondaryCtaText: '', secondaryCtaLink: '',
    popularSearches: [] as string[],
  },
  cta: {
    badgeText: '', heading: '', headingAccent: '', description: '',
    primaryCtaText: '', primaryCtaLink: '', secondaryCtaText: '', secondaryCtaLink: '',
  },
};

function HomepageTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_HOMEPAGE_FORM);
  const [popularSearchesText, setPopularSearchesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['homepageContentAdmin'],
    queryFn: getHomepageContentAdmin,
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    // No explicit `: HomepageContentAdmin` annotation here on purpose —
    // that type's hero/cta are optional (`?:`, matching the raw API
    // response, which may legitimately omit them before anything's ever
    // been saved), but this spread always fully populates both from
    // EMPTY_HOMEPAGE_FORM's defaults. Annotating `next` with the looser
    // optional type re-introduced an `| undefined` that could never
    // actually occur here, which is exactly what made this a
    // longstanding tsc error (setForm expects the fully-populated shape
    // form's own useState default has, not the optional API shape).
    const next = {
      isPublished: !!data.isPublished,
      hero: { ...EMPTY_HOMEPAGE_FORM.hero, ...data.hero },
      cta: { ...EMPTY_HOMEPAGE_FORM.cta, ...data.cta },
    };
    setForm(next);
    setPopularSearchesText((next.hero?.popularSearches || []).join('\n'));
    setSavedAt(null);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const hero = {
        ...form.hero,
        popularSearches: popularSearchesText.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      await saveHomepageContent({ isPublished: form.isPublished, hero, cta: form.cta });
      setSavedAt(new Date());
      toast.success('Homepage content saved.');
      queryClient.invalidateQueries({ queryKey: ['homepageContentAdmin'] });
    } catch (err) {
      console.error('Error saving homepage content:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setHero = (patch: Partial<typeof form.hero>) =>
    setForm((f) => ({ ...f, hero: { ...f.hero, ...patch } }));
  const setCta = (patch: Partial<typeof form.cta>) =>
    setForm((f) => ({ ...f, cta: { ...f.cta, ...patch } }));

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {form.isPublished ? 'Published — live on the homepage' : 'Not published — homepage is showing its built-in default copy'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Edit below, then Publish when it's ready. Unpublishing doesn't delete your draft — it just falls back to the default copy.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
          />
          Published
        </label>
      </div>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <LayoutTemplate size={16} /> Hero section
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Badge text">
            <input value={form.hero.badgeText} onChange={(e) => setHero({ badgeText: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Next-Generation Career Platform" />
          </Field>
          <Field label="Headline">
            <input value={form.hero.headline} onChange={(e) => setHero({ headline: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Welcome to" />
          </Field>
          <Field label="Headline accent (highlighted part)">
            <input value={form.hero.headlineAccent} onChange={(e) => setHero({ headlineAccent: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Quick Jobs" />
          </Field>
          <Field label="Subheadline">
            <input value={form.hero.subheadline} onChange={(e) => setHero({ subheadline: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Best portal to find jobs of your choice..." />
          </Field>
          <Field label="Primary CTA text">
            <input value={form.hero.primaryCtaText} onChange={(e) => setHero({ primaryCtaText: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Find Jobs" />
          </Field>
          <Field label="Primary CTA link">
            <input value={form.hero.primaryCtaLink} onChange={(e) => setHero({ primaryCtaLink: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="/jobs" />
          </Field>
          <Field label="Secondary CTA text">
            <input value={form.hero.secondaryCtaText} onChange={(e) => setHero({ secondaryCtaText: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Build Resume" />
          </Field>
          <Field label="Secondary CTA link">
            <input value={form.hero.secondaryCtaLink} onChange={(e) => setHero({ secondaryCtaLink: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="/resume" />
          </Field>
        </div>
        <Field label="Popular searches (one per line, shown as quick-tap chips)">
          <textarea
            value={popularSearchesText}
            onChange={(e) => setPopularSearchesText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder={'Frontend Developer\nQA Engineer\nUI/UX Designer'}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <LayoutTemplate size={16} /> Closing CTA section
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Badge text">
            <input value={form.cta.badgeText} onChange={(e) => setCta({ badgeText: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Start Your Journey" />
          </Field>
          <Field label="Heading">
            <input value={form.cta.heading} onChange={(e) => setCta({ heading: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Skill is more than a trait," />
          </Field>
          <Field label="Heading accent (highlighted part)">
            <input value={form.cta.headingAccent} onChange={(e) => setCta({ headingAccent: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="it's a foundation for excellence" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea value={form.cta.description} onChange={(e) => setCta({ description: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Create your professional resume, get noticed by top companies and take the next step in your career." />
            </Field>
          </div>
          <Field label="Primary CTA text">
            <input value={form.cta.primaryCtaText} onChange={(e) => setCta({ primaryCtaText: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Join Now" />
          </Field>
          <Field label="Primary CTA link">
            <input value={form.cta.primaryCtaLink} onChange={(e) => setCta({ primaryCtaLink: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="/signup" />
          </Field>
          <Field label="Secondary CTA text">
            <input value={form.cta.secondaryCtaText} onChange={(e) => setCta({ secondaryCtaText: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Explore Jobs" />
          </Field>
          <Field label="Secondary CTA link">
            <input value={form.cta.secondaryCtaLink} onChange={(e) => setCta({ secondaryCtaLink: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="/jobs" />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && <span className="text-xs text-slate-400">Saved at {savedAt.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared form field wrapper
// ---------------------------------------------------------------------------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}

export default CmsHub;