import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Eye, Calendar, Search, Plus } from 'lucide-react';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  };
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
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substr(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {actualShowUserBlogs ? 'My Blogs' : 'Latest Blogs'}
          </h1>
          
          {isLoggedIn && (
            <Link
              to="/blog/create"
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Blog
            </Link>
          )}
        </div>
        
        {!actualShowUserBlogs && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="w-full relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => { setCurrentPage(1); setSearchTerm(e.target.value); }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={category}
                onChange={(e) => { setCurrentPage(1); setCategory(e.target.value); }}
                className="w-full sm:w-56 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">Couldn't load blogs. Please try again.</p>
          <button onClick={fetchBlogs} className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Retry
          </button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {actualShowUserBlogs ? 'You haven\'t created any blogs yet.' : 'No blog posts found.'}
          </p>
          {actualShowUserBlogs && (
            <Link
              to="/blog/create"
              className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Blog
            </Link>
          )}
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
                    {blog.authorImage && (
                      <img
                        src={blog.authorImage}
                        alt={blog.author.name}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{blog.author.name}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(blog.publishedAt)}
                        {blog.isAIGenerated && (
                          <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                            AI Generated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {blog.category && (
                    <span className="inline-block mb-2 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {blog.category}
                    </span>
                  )}

                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                    {blog.title}
                  </h3>

                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {blog.excerpt ? blog.excerpt : truncateContent(blog.content.replace(/<[^>]+>/g, ' '))}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Heart className="h-4 w-4 mr-1" />
                        {blog.likes.length}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {blog.comments.length}
                      </span>
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {blog.views.length}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/blog/${blog.slug || blog._id}`}
                    className="block w-full text-center bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Read More
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogList;
