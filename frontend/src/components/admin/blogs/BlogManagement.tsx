import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  UploadCloud,
  X,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import {
  getAllBlogsAdmin,
  updateBlogStatusAdmin,
  createBlogAdmin,
  updateBlogAdmin,
  deleteBlogAdmin,
  uploadBlogImageAdmin,
} from '../adminApi/api';

export const BlogManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all'; // 'all' | 'published' | 'drafts'

  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'drafts'>(
    initialStatus === 'published' || initialStatus === 'drafts' ? initialStatus : 'all'
  );

  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Career Advice');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingBlog, setSavingBlog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllBlogsAdmin({
        status: statusFilter,
        search: search || undefined,
        page,
        limit: 12,
      });
      setBlogs(res.blogs || []);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleStatusFilterChange = (st: 'all' | 'published' | 'drafts') => {
    setStatusFilter(st);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (st !== 'all') newParams.set('status', st);
    else newParams.delete('status');
    setSearchParams(newParams);
  };

  const handleTogglePublish = async (blogId: string, currentPublished: boolean) => {
    try {
      await updateBlogStatusAdmin(blogId, !currentPublished);
      toast.success(`Blog ${!currentPublished ? 'published' : 'moved to drafts'}`);
      fetchBlogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle blog publish status');
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this blog post?')) return;
    try {
      await deleteBlogAdmin(blogId);
      toast.success('Blog deleted successfully');
      fetchBlogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete blog');
    }
  };

  const openCreateModal = () => {
    setEditingBlogId(null);
    setTitle('');
    setCategory('Career Advice');
    setExcerpt('');
    setContent('');
    setFeaturedImage('');
    setIsPublished(true);
    setSeoTitle('');
    setSeoDescription('');
    setPreviewing(false);
    setIsEditorOpen(true);
  };

  const openEditModal = (blog: any) => {
    setEditingBlogId(blog._id);
    setTitle(blog.title || '');
    setCategory(blog.category || 'Career Advice');
    setExcerpt(blog.excerpt || '');
    setContent(blog.content || '');
    setFeaturedImage(blog.featuredImage || blog.images?.[0]?.url || '');
    setIsPublished(blog.isPublished ?? true);
    setSeoTitle(blog.seoTitle || '');
    setSeoDescription(blog.seoDescription || '');
    setPreviewing(false);
    setIsEditorOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const data = await uploadBlogImageAdmin(file);
      if (data.url) {
        setFeaturedImage(data.url);
        toast.success('Featured image uploaded');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSavingBlog(true);
    try {
      const payload = {
        title,
        category,
        excerpt,
        content,
        featuredImage,
        isPublished,
        status: isPublished ? 'published' : 'draft',
        seoTitle,
        seoDescription,
      };

      if (editingBlogId) {
        await updateBlogAdmin(editingBlogId, payload);
        toast.success('Blog updated successfully');
      } else {
        await createBlogAdmin(payload);
        toast.success('Blog created successfully');
      }

      setIsEditorOpen(false);
      fetchBlogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save blog');
    } finally {
      setSavingBlog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Newspaper size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Blog & Editorial Management
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Publish articles, update featured media with Cloudinary integration, and moderate platform posts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBlogs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 transition-all"
          >
            <Plus size={14} /> New Blog Post
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Articles' },
              { id: 'published', label: 'Published' },
              { id: 'drafts', label: 'Drafts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleStatusFilterChange(tab.id as any)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === tab.id
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
              placeholder="Search by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Blog Cards Grid */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-orange-500" />
          Loading articles...
        </div>
      ) : blogs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No blog posts found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => {
            const img = blog.featuredImage || blog.images?.[0]?.url;

            return (
              <div
                key={blog._id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md"
              >
                <div>
                  {/* Image banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                    {img ? (
                      <img
                        src={img}
                        alt={blog.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <span
                      className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                        blog.isPublished
                          ? 'bg-emerald-500/90 text-white'
                          : blog.status === 'unpublished'
                          ? 'bg-slate-600/90 text-white'
                          : 'bg-amber-500/90 text-white'
                      }`}
                    >
                      {blog.isPublished ? 'Published' : blog.status === 'unpublished' ? 'Unpublished' : 'Draft'}
                    </span>
                    <span className="absolute left-3 top-3 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur-md">
                      {blog.category || 'General'}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {blog.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {blog.excerpt || blog.content?.slice(0, 100)}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>By {blog.author?.name || 'QuickJobs Editor'}</span>
                      <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(blog._id, !!blog.isPublished)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      blog.isPublished
                        ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    {blog.isPublished ? 'Unpublish' : 'Publish'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(blog)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                      title="Edit article"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlog(blog._id)}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Delete article"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-800"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit / Create Article Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingBlogId ? 'Edit Blog Article' : 'Create New Article'}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewing((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Eye size={13} /> {previewing ? 'Back to editing' : 'Preview'}
                </button>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {previewing ? (
              <div className="mt-4 space-y-3 text-xs">
                {featuredImage && (
                  <img src={featuredImage} alt="" className="h-48 w-full rounded-xl object-cover" />
                )}
                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  {category || 'General'}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title || 'Untitled article'}</h2>
                {excerpt && <p className="text-slate-500 dark:text-slate-400">{excerpt}</p>}
                <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{content}</div>
                <div className="rounded-xl border border-dashed border-slate-200 p-3 dark:border-slate-700">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Search result preview</p>
                  <p className="truncate text-sm text-blue-700">{seoTitle || title || 'Untitled article'}</p>
                  <p className="line-clamp-2 text-[11px] text-slate-500">{seoDescription || excerpt || 'No description set.'}</p>
                </div>
                <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewing(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Back to editing
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSaveBlog} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 10 Essential Resume Tips for 2026"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Career Advice, Tech, Remote Work"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Publishing Status
                  </label>
                  <select
                    value={isPublished ? 'published' : 'draft'}
                    onChange={(e) => setIsPublished(e.target.value === 'published')}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="published">Publish Immediately</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>
              </div>

              {/* Featured Image Uploader */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Featured Image
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <UploadCloud size={14} />
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </button>
                  {featuredImage && (
                    <div className="flex items-center gap-2">
                      <img
                        src={featuredImage}
                        alt="Preview"
                        className="h-10 w-16 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => setFeaturedImage('')}
                        className="text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Excerpt (Short Summary)
                </label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief synopsis for feed previews..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Full Article Content *
                </label>
                <textarea
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write full article body text..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">SEO (optional)</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      SEO Title
                    </label>
                    <input
                      type="text"
                      maxLength={70}
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Falls back to the article title"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      SEO Description
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Falls back to the excerpt"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBlog}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 disabled:opacity-50"
                >
                  {savingBlog ? <RefreshCw size={13} className="animate-spin" /> : null}
                  {editingBlogId ? 'Save Changes' : 'Publish Article'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
