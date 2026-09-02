import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Eye, Calendar, Search, Layers, ArrowLeft, FileText } from 'lucide-react';
import { getBlogCategoryBySlug, type PublicBlogCategory } from '../../api/blogCategoryApi';

// Matches the backend's actual default port (server.js: PORT || 3000) —
// see BlogCreate.tsx for why a :8000 fallback would be wrong here too.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

interface Blog {
  _id: string;
  slug?: string;
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  author: { _id: string; name: string; role: string };
  authorImage: string;
  images: Array<{ url: string; caption?: string }>;
  likes: string[];
  // Only `.length` is ever read here (comment/view counts on the card) —
  // `unknown[]` rather than a full shape, and rather than `any`.
  comments: unknown[];
  views: unknown[];
  publishedAt: string;
}

const truncate = (content: string, max = 150) => {
  const plain = content.replace(/<[^>]+>/g, ' ');
  return plain.length <= max ? plain : plain.slice(0, max) + '...';
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * /blog/category/:slug — the category "hub" page (section 5): title,
 * description, real published articles filtered to this category (reuses
 * the existing GET /api/blogs?category=<name>, no new blog endpoint), its
 * own search, pagination, and an honest empty state instead of a
 * hardcoded/fake article list.
 */
const BlogCategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [category, setCategory] = useState<PublicBlogCategory | null>(null);
  const [categoryError, setCategoryError] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setCategory(null);
    setCategoryError(false);
    getBlogCategoryBySlug(slug)
      .then(setCategory)
      .catch(() => setCategoryError(true));
  }, [slug]);

  useEffect(() => {
    if (!category) return;
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError(false);
        const params = new URLSearchParams({
          page: String(page),
          limit: '9',
          category: category.name,
          ...(searchTerm && { search: searchTerm }),
        });
        const res = await fetch(`${API_BASE_URL}/api/blogs?${params}`);
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        setBlogs(data.blogs || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        console.error('Error loading category blogs:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [category, page, searchTerm]);

  if (categoryError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-lg mb-4">This category doesn't exist or is no longer active.</p>
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
          <ArrowLeft size={16} /> Back to Blog
        </Link>
      </div>
    );
  }

  if (!category) {
    return <div className="flex justify-center items-center min-h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/blog')} className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
        <ArrowLeft size={15} /> All Categories
      </button>

      <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          {category.icon ? (
            <img src={`${MEDIA_URL.replace(/\/$/, '')}/${category.icon.replace(/^\//, '')}`} alt="" className="h-14 w-14 rounded-xl object-contain bg-white p-2 shadow-sm" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><Layers size={24} /></div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{category.name}</h1>
            <p className="flex items-center gap-1 text-sm text-gray-500 mt-1"><FileText size={13} /> {category.blogCount} article{category.blogCount === 1 ? '' : 's'}</p>
          </div>
        </div>
        {category.description && <p className="mt-4 text-gray-600 max-w-2xl">{category.description}</p>}
      </div>

      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-800">Latest Articles</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder={`Search in ${category.name}...`}
            value={searchTerm}
            onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
            className="pl-9 pr-3 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">Couldn't load articles. Please try again.</p>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-500 text-lg">
            {searchTerm
              ? `No articles matching "${searchTerm}" in ${category.name}.`
              : 'No articles have been published in this category yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {blogs.map((blog) => (
              <div key={blog._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {(blog.featuredImage || blog.images[0]?.url) && (
                  <img
                    src={blog.featuredImage || blog.images[0].url}
                    alt={blog.images[0]?.caption || blog.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    {blog.authorImage && <img src={blog.authorImage} alt={blog.author.name} className="w-8 h-8 rounded-full mr-3" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{blog.author.name}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" /> {formatDate(blog.publishedAt)}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{blog.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{blog.excerpt || truncate(blog.content)}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center"><Heart className="h-4 w-4 mr-1" />{blog.likes.length}</span>
                    <span className="flex items-center"><MessageCircle className="h-4 w-4 mr-1" />{blog.comments.length}</span>
                    <span className="flex items-center"><Eye className="h-4 w-4 mr-1" />{blog.views.length}</span>
                  </div>
                  <Link to={`/blog/${blog.slug || blog._id}`} className="block w-full text-center bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
                    Read More
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
              <span className="px-4 py-2 bg-primary text-white rounded-lg">{page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogCategoryPage;
