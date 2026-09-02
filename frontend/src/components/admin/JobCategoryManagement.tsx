import React, { useState, useEffect, useMemo } from 'react';
import { 
  getJobCategories, 
  createJobCategory, 
  updateJobCategory, 
  deleteJobCategory, 
  toggleJobCategoryTrending,
  JobCategory
} from './adminApi/api';
import { toast } from 'react-toastify';
import { 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaStar, 
  FaSearch, 
  FaCloudUploadAlt, 
  FaTimes, 
  FaFolder, 
  FaFolderOpen,
  FaFilter,
  FaSortAmountDown,
  FaCalendarAlt,
  FaBolt,
} from 'react-icons/fa';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const JobCategories = () => {
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<JobCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: null as File | null,
    // Defaults to true for new categories: the homepage "Explore
    // Categories" section only shows isTrending:true categories (see
    // JobCategories.tsx -> GET /api/jobcategories/trending/all), so a
    // category created with this left unchecked would silently never
    // appear there. Editing an existing category still respects its
    // current value (see handleEdit).
    isTrending: true,
  });

  // Client-side UI Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingFilter, setTrendingFilter] = useState<'all' | 'trending' | 'normal'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Preview URL state for file upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Update image preview when formData.icon or currentCategory changes
  useEffect(() => {
    if (formData.icon) {
      const objectUrl = URL.createObjectURL(formData.icon);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (currentCategory && currentCategory.icon) {
      setImagePreview(`${MEDIA_URL.replace(/\/$/, '')}/uploads/icons/${currentCategory.icon.replace(/^\//, '')}`);
    } else {
      setImagePreview(null);
    }
  }, [formData.icon, currentCategory]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getJobCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Matches backend/middleware/iconUploadMiddleware.js's 1MB limit exactly
  // — checking it here means a too-large file (a phone photo routinely
  // runs several MB) is rejected instantly with a clear message instead
  // of round-tripping to the server first.
  const MAX_ICON_BYTES = 1 * 1024 * 1024;

  const acceptIconFile = (file: File) => {
    if (file.size > MAX_ICON_BYTES) {
      toast.error('Icon image is too large. Please choose a file under 1MB.');
      return;
    }
    setFormData(prev => ({ ...prev, icon: file }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      acceptIconFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        acceptIconFile(file);
      } else {
        toast.error('Please upload an image file');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('isTrending', String(formData.isTrending));
    if (formData.icon) {
      formDataToSend.append('icon', formData.icon);
    }

    try {
      if (currentCategory) {
        await updateJobCategory(currentCategory._id, formDataToSend);
        toast.success('Category updated successfully');
      } else {
        await createJobCategory(formDataToSend);
        toast.success('Category created successfully');
      }
      setIsModalOpen(false);
      setFormData({ name: '', icon: null, isTrending: true });
      setCurrentCategory(null);
      setImagePreview(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error?.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEdit = (category: JobCategory) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      icon: null,
      isTrending: category.isTrending,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await deleteJobCategory(id);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      const jobCount = error?.response?.data?.jobCount;
      if (error?.response?.status === 409 && typeof jobCount === 'number') {
        // Category is still in use — ask explicitly before orphaning those jobs.
        const confirmForce = window.confirm(
          `${jobCount} job${jobCount === 1 ? '' : 's'} still list this category. ` +
          `Delete it anyway? Those jobs will keep their category label, but it will ` +
          `no longer appear in this list.`
        );
        if (confirmForce) {
          try {
            await deleteJobCategory(id, true);
            toast.success('Category deleted successfully');
            fetchCategories();
          } catch (forceError) {
            console.error('Error force-deleting category:', forceError);
            toast.error('Failed to delete category');
          }
        }
        return;
      }
      console.error('Error deleting category:', error);
      toast.error(error?.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleToggleTrending = async (id: string, isCurrentlyTrending: boolean) => {
    try {
      await toggleJobCategoryTrending(id, !isCurrentlyTrending);
      toast.success(`Category ${!isCurrentlyTrending ? 'added to' : 'removed from'} trending`);
      fetchCategories();
    } catch (error) {
      console.error('Error toggling trending status:', error);
      toast.error('Failed to update trending status');
    }
  };

  const openNewCategoryModal = (prefillName?: string) => {
    setCurrentCategory(null);
    setFormData({ name: prefillName || '', icon: null, isTrending: true });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const SUGGESTED_CATEGORIES = [
    'Software Engineering',
    'Marketing',
    'Sales',
    'Design',
    'Customer Support',
    'Healthcare',
    'Finance',
    'Warehouse & Logistics',
  ];

  // Client-side processed list for UX enhancements
  const processedCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTrending =
          trendingFilter === 'all'
            ? true
            : trendingFilter === 'trending'
            ? cat.isTrending
            : !cat.isTrending;
        return matchesSearch && matchesTrending;
      })
      .sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
  }, [categories, searchQuery, trendingFilter, sortOrder]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-64px)] overflow-y-auto w-full bg-slate-50/50 text-slate-800 selection:bg-orange-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Job Categories
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#F97316]">
                <FaBolt className="w-3 h-3" /> Admin
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage all job categories used throughout the platform.
            </p>
          </div>

          <button
            onClick={() => openNewCategoryModal()}
            className="inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer shrink-0"
          >
            <FaPlus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-all">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Total Badge */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Filter Trending */}
            <div className="relative inline-flex items-center">
              <FaFilter className="absolute left-3 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
              <select
                value={trendingFilter}
                onChange={(e) => setTrendingFilter(e.target.value as any)}
                className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Trending</option>
                <option value="trending">Trending Only</option>
                <option value="normal">Normal Only</option>
              </select>
            </div>

            {/* Sort A-Z */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 transition-all cursor-pointer active:scale-95"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <FaSortAmountDown className={`w-3.5 h-3.5 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              <span>Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
            </button>

            {/* Counter Badge */}
            <div className="px-3.5 py-2 bg-orange-50 border border-orange-200/80 rounded-xl text-xs sm:text-sm font-bold text-[#F97316] shrink-0">
              Total: {processedCategories.length} {processedCategories.length === 1 ? 'Category' : 'Categories'}
            </div>
          </div>
        </div>

        {/* LOADING SKELETON STATE */}
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading job categories">
            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
              <div className="animate-pulse space-y-6">
                <div className="h-5 bg-slate-200 rounded-md w-1/4 mb-6" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0" />
                    <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                    <div className="h-7 bg-slate-200 rounded-full w-24" />
                    <div className="h-4 bg-slate-200 rounded-md w-24" />
                    <div className="flex gap-2">
                      <div className="w-9 h-9 bg-slate-200 rounded-xl" />
                      <div className="w-9 h-9 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Stacked Skeleton Cards */}
            <div className="md:hidden space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                    <div className="h-5 bg-slate-200 rounded w-1/2" />
                  </div>
                  <div className="h-7 bg-slate-200 rounded-full w-28" />
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : processedCategories.length === 0 ? (

          /* EMPTY STATE */
          (searchQuery || trendingFilter !== 'all') ? (
            /* No results for current search/filter — compact, low-emphasis */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-sm max-w-md mx-auto">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                <FaSearch className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                No matching categories
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Try a different search term or reset the filters to see all categories.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setTrendingFilter('all'); }}
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <FaTimes className="w-3.5 h-3.5" />
                <span>Clear search &amp; filters</span>
              </button>
            </div>
          ) : (
            /* True empty state — first-run, high-emphasis onboarding */
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto">
              {/* Decorative gradient backdrop */}
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-orange-50 via-orange-50/40 to-transparent pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-100/60 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -top-6 -left-10 w-32 h-32 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

              <div className="relative px-8 sm:px-12 py-12 text-center">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 bg-orange-200/40 rounded-3xl rotate-6" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-orange-400 to-[#F97316] text-white rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <FaFolderOpen className="w-9 h-9" />
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                  Let's set up your first category
                </h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                  Categories help job seekers filter listings and keep the platform organized.
                  Create one from scratch, or start from a common category below.
                </p>

                <button
                  onClick={() => openNewCategoryModal()}
                  className="inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  <FaPlus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>

                {/* Quick-start suggestions */}
                <div className="mt-9 pt-7 border-t border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Or start from a suggestion
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {SUGGESTED_CATEGORIES.map((name) => (
                      <button
                        key={name}
                        onClick={() => openNewCategoryModal(name)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-[#F97316] transition-all cursor-pointer"
                      >
                        <FaPlus className="w-2.5 h-2.5 opacity-60" />
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          
          /* MAIN DATA DISPLAY */
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th scope="col" className="px-6 py-4">Category Icon</th>
                      <th scope="col" className="px-6 py-4">Category Name</th>
                      <th scope="col" className="px-6 py-4">Trending Status</th>
                      <th scope="col" className="px-6 py-4">Created Date</th>
                      <th scope="col" className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-sm text-slate-700">
                    {processedCategories.map((category) => {
                      const createdDate = (category as any).createdAt
                        ? new Date((category as any).createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : null;

                      return (
                        <tr
                          key={category._id}
                          className="hover:bg-orange-50/30 transition-colors group"
                        >
                          {/* Category Icon */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-xs overflow-hidden group-hover:scale-105 transition-transform duration-200">
                              {category.icon ? (
                                <img
                                  src={`${MEDIA_URL.replace(/\/$/, '')}/uploads/icons/${category.icon.replace(/^\//, '')}`}
                                  alt={category.name}
                                  className="w-8 h-8 object-contain"
                                  onError={(e) => {
                                    console.error('Failed to load image:', e);
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <FaFolder className="w-5 h-5 text-[#F97316]" />
                              )}
                            </div>
                          </td>

                          {/* Category Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 group-hover:text-[#F97316] transition-colors">
                              {category.name}
                            </span>
                          </td>

                          {/* Trending Badge Toggle */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleTrending(category._id, category.isTrending)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border cursor-pointer active:scale-95 ${
                                category.isTrending
                                  ? 'bg-orange-50 border-orange-200 text-[#F97316] hover:bg-orange-100 shadow-2xs'
                                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                              }`}
                              title={category.isTrending ? 'Click to remove from trending' : 'Click to add to trending'}
                            >
                              <FaStar className={`w-3.5 h-3.5 ${category.isTrending ? 'fill-[#F97316]' : 'text-slate-400'}`} />
                              <span>{category.isTrending ? 'Trending' : 'Normal'}</span>
                            </button>
                          </td>

                          {/* Created Date */}
                          <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs font-medium">
                            {createdDate ? (
                              <div className="flex items-center gap-1.5">
                                <FaCalendarAlt className="w-3 h-3 text-slate-400" />
                                <span>{createdDate}</span>
                              </div>
                            ) : (
                              <span className="italic text-slate-300">N/A</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleEdit(category)}
                                className="p-2.5 rounded-xl border border-orange-200 text-[#F97316] hover:bg-orange-50 hover:border-orange-300 active:bg-orange-100 transition-all duration-200 cursor-pointer hover:scale-105"
                                title="Edit Category"
                                aria-label={`Edit ${category.name}`}
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(category._id)}
                                className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 active:bg-rose-100 transition-all duration-200 cursor-pointer hover:scale-105"
                                title="Delete Category"
                                aria-label={`Delete ${category.name}`}
                              >
                                <FaTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards (No Horizontal Scrolling) */}
            <div className="md:hidden space-y-3">
              {processedCategories.map((category) => {
                const createdDate = (category as any).createdAt
                  ? new Date((category as any).createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : null;

                return (
                  <article
                    key={category._id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 hover:border-orange-200 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                          {category.icon ? (
                            <img
                              src={`${MEDIA_URL.replace(/\/$/, '')}/uploads/icons/${category.icon.replace(/^\//, '')}`}
                              alt={category.name}
                              className="w-7 h-7 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <FaFolder className="w-5 h-5 text-[#F97316]" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">
                            {category.name}
                          </h3>
                          {createdDate && (
                            <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                              Created {createdDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Icon Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 rounded-xl border border-orange-200 text-[#F97316] bg-orange-50/50"
                          title="Edit"
                        >
                          <FaEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(category._id)}
                          className="p-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50/50"
                          title="Delete"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Status</span>
                      <button
                        onClick={() => handleToggleTrending(category._id, category.isTrending)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          category.isTrending
                            ? 'bg-orange-50 border-orange-200 text-[#F97316]'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}
                      >
                        <FaStar className={`w-3 h-3 ${category.isTrending ? 'fill-[#F97316]' : 'text-slate-400'}`} />
                        <span>{category.isTrending ? 'Trending' : 'Normal'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {/* PREMIUM GLASSMORPHISM MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Glass Container */}
            <div className="relative bg-white/95 border border-white/40 rounded-[24px] shadow-2xl backdrop-blur-xl w-full max-w-lg overflow-hidden z-10 transition-all duration-300 transform scale-100">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100">
                    <FaFolder className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {currentCategory ? 'Edit Category' : 'Add New Category'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close modal"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* Category Name Input */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Software Engineering"
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                    required
                  />
                </div>

                {/* File Drag and Drop Upload Area */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Category Icon
                  </label>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                      isDragging
                        ? 'border-[#F97316] bg-orange-50/50'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="file"
                      id="icon"
                      name="icon"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />

                    {imagePreview ? (
                      /* Instant Image Preview UI */
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200/80 p-2 shadow-sm flex items-center justify-center overflow-hidden relative group">
                          <img
                            src={imagePreview}
                            alt="Category Icon Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#F97316] hover:underline">
                          Click or drag to replacement
                        </span>
                      </div>
                    ) : (
                      /* Drag & Drop Placeholder */
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#F97316] border border-orange-100 flex items-center justify-center">
                          <FaCloudUploadAlt className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Click to upload <span className="text-slate-400 font-normal">or drag and drop</span>
                          </p>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">
                            PNG, SVG, JPG, or WEBP up to 5MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Trending toggle — the homepage "Explore Categories" section
                    only shows categories with isTrending:true, so this has to
                    be settable right here at creation time, not just from the
                    separate star-toggle in the table afterward. */}
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isTrending}
                    onChange={(e) => setFormData(prev => ({ ...prev, isTrending: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#F97316] focus:ring-orange-500/40"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">Show on homepage (Trending)</span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Only trending categories appear in the "Explore Categories" section on the homepage. Leave this checked so this category shows up right away.
                    </span>
                  </span>
                </label>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-semibold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {currentCategory ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCategories;