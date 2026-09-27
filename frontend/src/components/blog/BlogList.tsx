import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Eye,
  Calendar,
  Search,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { BlogCategoriesExplore } from './BlogCategoriesExplore';
import { handleImageFallback, BLOG_IMAGE_FALLBACK } from '../../utils/imageFallback';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { SkeletonBlock, SkeletonText, SkeletonAvatarLine } from '../ui/Skeleton';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

interface Blog {
  _id: string;
  slug?: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  featuredImage?: string;
  author: {
    _id: string;
    name: string;
    role: string;
  } | null;
  authorImage: string;
  images: Array<{ url: string; caption?: string }>;
  likes: string[];
  comments: any[];
  views: any[];
  publishedAt: string;
  isAIGenerated: boolean;
}

interface BlogListProps {
  showUserBlogs?: boolean;
}

const BlogList: React.FC<BlogListProps> = ({ showUserBlogs = false }) => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check URL params for user blogs
  const urlParams = new URLSearchParams(window.location.search);
  const isUserBlogsFromUrl = urlParams.get('user') === 'true';
  const actualShowUserBlogs = showUserBlogs || isUserBlogsFromUrl;

  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    fetchBlogs();
  }, [currentPage, searchTerm, category, actualShowUserBlogs]);

  useEffect(() => {
    if (actualShowUserBlogs) return;
    fetch(`${API_BASE_URL}/api/blogs/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, [actualShowUserBlogs]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError(false);
      const token = localStorage.getItem('token');
      const endpoint = actualShowUserBlogs ? '/api/blogs/user/my-blogs' : '/api/blogs';
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '6',
        ...(searchTerm && { search: searchTerm }),
        ...(!actualShowUserBlogs && category && { category }),
      });

      const response = await fetch(`${API_BASE_URL}${endpoint}?${params}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBlogs(data.blogs);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const calculateReadTime = (content: string): number => {
    const plainText = content.replace(/<[^>]+>/g, ' ');
    const wordCount = plainText.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  };

  const truncateContent = (content: string, maxLength: number = 140) => {
    const plain = content.replace(/<[^>]+>/g, ' ').trim();
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" aria-busy="true" aria-label="Loading blogs">
        <div className="h-40 w-full rounded-3xl bg-slate-100 animate-pulse mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <SkeletonBlock className="w-full h-52 rounded-none" />
              <div className="p-6 space-y-4">
                <SkeletonAvatarLine avatarSize="h-9 w-9" />
                <SkeletonText width="w-3/4" height="h-6" />
                <SkeletonText width="w-full" height="h-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-8 sm:p-12 mb-10 text-white shadow-2xl shadow-slate-900/10 border border-slate-800">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-orange-400 mb-4 shadow-sm">
              <Sparkles size={14} className="animate-pulse" />
              <span>{actualShowUserBlogs ? 'Author Dashboard' : 'QuickJobs Knowledge Hub'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              {actualShowUserBlogs ? 'My Published Articles' : 'Career Insights & Industry Perspectives'}
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mb-6">
              {actualShowUserBlogs
                ? 'Manage, edit, and track reader engagement across your contributed career posts and articles.'
                : 'Actionable hiring tips, career advancement strategies, salary guides, and industry analyses from top recruiters and professionals.'}
            </p>

            {isLoggedIn && (
              <Link
                to="/blog/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 hover:shadow-orange-600/40 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Plus size={18} />
                <span>Write an Article</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>

        {/* Categories Explorer */}
        {!actualShowUserBlogs && <BlogCategoriesExplore />}

        {/* Search & Filter Bar */}
        {!actualShowUserBlogs && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-10 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search articles by title, topic, or keyword..."
                value={searchTerm}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearchTerm(e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200/80 text-slate-800 placeholder-slate-400 text-sm rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/30 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {categories.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={category}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setCategory(e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-200/80 text-slate-800 text-sm rounded-xl pl-10 pr-8 py-2.5 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/30 transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-red-100 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <X size={26} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Couldn't Load Articles</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              We encountered a temporary connection issue fetching blog posts. Please retry.
            </p>
            <button
              onClick={fetchBlogs}
              className="px-6 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20"
            >
              Retry
            </button>
          </div>
        ) : blogs.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={30} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {actualShowUserBlogs ? "You haven't published any articles yet" : 'No articles match your criteria'}
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              {actualShowUserBlogs
                ? 'Share your expertise, interview experiences, and career advice with thousands of job seekers and hiring managers.'
                : 'Try adjusting your search terms or selecting a different category filter to discover articles.'}
            </p>
            {actualShowUserBlogs && (
              <Link
                to="/blog/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-500 transition-all"
              >
                <Plus size={18} />
                <span>Write Your First Article</span>
              </Link>
            )}
          </div>
        ) : (
          /* Cards Grid */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {blogs.map((blog) => {
                const readTime = calculateReadTime(blog.content);
                const blogSlugOrId = blog.slug || blog._id;

                return (
                  <article
                    key={blog._id}
                    className="bg-white rounded-3xl border border-slate-200/70 hover:border-orange-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col group"
                  >
                    {/* Featured Image & Badges */}
                    <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                      <img
                        src={resolveMediaUrl(blog.featuredImage || blog.images[0]?.url) || BLOG_IMAGE_FALLBACK}
                        alt={blog.images[0]?.caption || blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handleImageFallback}
                      />

                      {/* Category Floating Pill */}
                      {blog.category && (
                        <div className="absolute top-3.5 left-3.5 z-10">
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/95 backdrop-blur-md text-orange-600 shadow-md border border-orange-100">
                            {blog.category}
                          </span>
                        </div>
                      )}

                      {/* Read Time Pill */}
                      <div className="absolute top-3.5 right-3.5 z-10">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-950/80 backdrop-blur-md text-white shadow-md flex items-center gap-1">
                          <Clock size={12} className="text-orange-400" />
                          <span>{readTime} min read</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-6 flex flex-col flex-1">
                      {/* Author & Meta Row */}
                      <div className="flex items-center gap-3 mb-3.5">
                        {blog.authorImage ? (
                          <img
                            src={resolveMediaUrl(blog.authorImage)}
                            alt={blog.author?.name || 'Author'}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 ring-2 ring-orange-500/10"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center">
                            {blog.author?.name ? blog.author.name[0].toUpperCase() : 'A'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {blog.author?.name || 'QuickJobs Contributor'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar size={11} />
                            <span>{formatDate(blog.publishedAt)}</span>
                            {blog.isAIGenerated && (
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">
                                AI Assisted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Article Title */}
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug mb-2.5">
                        <Link to={`/blog/${blogSlugOrId}`}>
                          {blog.title}
                        </Link>
                      </h3>

                      {/* Excerpt */}
                      <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-5 flex-1">
                        {blog.excerpt ? blog.excerpt : truncateContent(blog.content)}
                      </p>

                      {/* Footer Stats & Read Action */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1 transition-colors hover:text-red-500">
                            <Heart size={14} className={blog.likes?.length ? 'fill-red-500 text-red-500' : ''} />
                            <span className="font-semibold text-slate-600">{blog.likes?.length || 0}</span>
                          </span>
                          <span className="flex items-center gap-1 transition-colors hover:text-slate-700">
                            <MessageCircle size={14} />
                            <span className="font-semibold text-slate-600">{blog.comments?.length || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            <span className="font-semibold text-slate-600">{blog.views?.length || 0}</span>
                          </span>
                        </div>

                        <Link
                          to={`/blog/${blogSlugOrId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors group-hover:translate-x-0.5 duration-200"
                        >
                          <span>Read</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-6">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BlogList;
