import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, MessageCircle, Eye, Calendar, User, Edit, Trash2, Send } from 'lucide-react';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Blog {
  _id: string;
  slug?: string;
  title: string;
  content: string;
  category?: string;
  featuredImage?: string;
  tags?: string[];
  isPublished: boolean;
  author: {
    _id: string;
    name: string;
    role: string;
  };
  authorImage: string;
  images: Array<{ url: string; caption?: string }>;
  likes: string[];
  comments: Array<{
    _id: string;
    author: {
      _id: string;
      name: string;
      role: string;
    };
    content: string;
    createdAt: string;
  }>;
  views: any[];
  publishedAt: string;
  isAIGenerated: boolean;
}

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchBlog();
    checkUser();
  }, [id]);

  const checkUser = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  };

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Include the token (when present) so the author viewing their own
      // draft — or an admin — is recognized server-side (see
      // blogController.getBlogById's isOwner/isPrivileged check);
      // anonymous/other-user requests still only ever see published posts.
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setBlog(data.blog);
        setLikesCount(data.blog.likes.length);
        
        // Check if current user has liked the blog
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsLiked(data.blog.likes.includes(payload.id));
        }
      } else {
        navigate('/blog');
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!comment.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: comment }),
      });

      if (response.ok) {
        setComment('');
        fetchBlog(); // Refresh to get updated comments
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate('/blog');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Blog not found.</p>
        <Link to="/blog" className="text-blue-600 hover:underline">
          Back to Blogs
        </Link>
      </div>
    );
  }

  const isAuthor = user && blog.author._id === user.id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link to="/blog" className="text-blue-600 hover:underline">
            ← Back to Blogs
          </Link>
          
          {isAuthor && (
            <div className="flex space-x-2">
              <Link
                to={`/blog/edit/${blog._id}`}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          {blog.category && (
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-medium">
              {blog.category}
            </span>
          )}
          {!blog.isPublished && (
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
              Draft — only visible to you
            </span>
          )}
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">{blog.title}</h1>

        {blog.featuredImage && (
          <img
            src={blog.featuredImage}
            alt={blog.title}
            className="w-full max-h-96 object-cover rounded-lg shadow-md mb-6"
          />
        )}

        <div className="flex items-center mb-6">
          {blog.authorImage && (
            <img
              src={blog.authorImage}
              alt={blog.author.name}
              className="w-12 h-12 rounded-full mr-4"
            />
          )}
          <div className="flex-1">
            <p className="text-lg font-medium text-gray-900">{blog.author.name}</p>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(blog.publishedAt)}
              {blog.isAIGenerated && (
                <span className="ml-3 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                  AI Generated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 text-sm text-gray-500 border-b border-gray-200 pb-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 hover:text-red-500 transition-colors ${
              isLiked ? 'text-red-500' : ''
            }`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount}</span>
          </button>
          <span className="flex items-center space-x-1">
            <MessageCircle className="h-5 w-5" />
            <span>{blog.comments.length}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Eye className="h-5 w-5" />
            <span>{blog.views.length}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none mb-8">
        {blog.images.map((image, index) => (
          <div key={index} className="mb-6">
            <img
              src={image.url}
              alt={image.caption || `Blog image ${index + 1}`}
              className="w-full rounded-lg shadow-md"
            />
            {image.caption && (
              <p className="text-sm text-gray-600 text-center mt-2 italic">
                {image.caption}
              </p>
            )}
          </div>
        ))}
        
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
          {blog.content}
        </div>

        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {blog.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Comments ({blog.comments.length})
        </h3>

        {/* Add Comment Form */}
        {user ? (
          <form onSubmit={handleComment} className="mb-8">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!comment.trim() || submittingComment}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4 mr-2" />
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">
              <Link to="/login" className="text-blue-600 hover:underline">
                Login
              </Link>{' '}
              to post a comment
            </p>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {blog.comments.map((comment) => (
            <div key={comment._id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User className="h-8 w-8 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{comment.author.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-gray-800">{comment.content}</p>
            </div>
          ))}
          
          {blog.comments.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;
