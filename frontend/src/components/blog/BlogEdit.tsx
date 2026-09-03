import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, X } from 'lucide-react';
import { getActiveBlogCategories, type PublicBlogCategory } from '../../api/blogCategoryApi';
import { TagInput } from '../common/TagInput';
// Matches the backend's actual default port (server.js: PORT || 3000) —
// see BlogCreate.tsx for why the previous :8000 fallback was wrong.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

interface BlogImage {
  url: string;
  caption: string;
}

interface Blog {
  _id: string;
  title: string;
  content: string;
  images: BlogImage[];
  tags: string[];
  category?: string;
  excerpt?: string;
  featuredImage?: string;
  isPublished: boolean;
}

const BlogEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    category: 'General',
    excerpt: '',
    featuredImage: '',
  });
  const [isPublished, setIsPublished] = useState(true);
  const [images, setImages] = useState<BlogImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingBlog, setFetchingBlog] = useState(true);
  // Real, admin-managed categories (Phase 6) — see BlogCreate.tsx's copy
  // of this same comment.
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);

  useEffect(() => {
    fetchBlog();
  }, [id]);

  useEffect(() => {
    getActiveBlogCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const fetchBlog = async () => {
    try {
      setFetchingBlog(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const blog: Blog = data.blog;
        
        setFormData({
          title: blog.title,
          content: blog.content,
          tags: blog.tags.join(', '),
          category: blog.category || 'General',
          excerpt: blog.excerpt || '',
          featuredImage: blog.featuredImage || '',
        });
        setImages(blog.images || []);
        setIsPublished(blog.isPublished !== false);
      } else {
        navigate('/blog');
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
      navigate('/blog');
    } finally {
      setFetchingBlog(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addImage = () => {
    setImages([...images, { url: '', caption: '' }]);
  };

  const updateImage = (index: number, field: 'url' | 'caption', value: string) => {
    const updatedImages = images.map((img, i) =>
      i === index ? { ...img, [field]: value } : img
    );
    setImages(updatedImages);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitBlog(isPublished);
  };

  const submitBlog = async (publish: boolean) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const blogData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category.trim() || 'General',
        excerpt: formData.excerpt.trim(),
        featuredImage: formData.featuredImage.trim(),
        images: images.filter(img => img.url.trim()),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        isPublished: publish,
      };

      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(blogData),
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/blog/${data.blog?.slug || id}`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update blog');
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      alert('Failed to update blog');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingBlog) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Blog</h1>
        <p className="text-gray-600">Update your blog post</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter your blog title..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Content *
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder="Write your blog content here..."
            rows={12}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            required
          />
        </div>

        {/* Images */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Images (Optional)
            </label>
            <button
              type="button"
              onClick={addImage}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Image
            </button>
          </div>
          
          <div className="space-y-4">
            {images.map((image, index) => (
              <div key={index} className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Image {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="Image URL"
                    value={image.url}
                    onChange={(e) => updateImage(index, 'url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Caption (optional)"
                    value={image.caption}
                    onChange={(e) => updateImage(index, 'caption', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {image.url && (
                    <img
                      src={image.url}
                      alt={image.caption || `Preview ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category + Excerpt + Featured Image */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="General">General</option>
              {/* This blog's current category may since have been
                  renamed/deactivated/deleted — keep it selectable so
                  editing never silently blanks it out. */}
              {formData.category && formData.category !== 'General' && !categories.some((c) => c.name === formData.category) && (
                <option value={formData.category}>{formData.category}</option>
              )}
              {categories.map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="featuredImage" className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image URL (Optional)
            </label>
            <input
              type="url"
              id="featuredImage"
              name="featuredImage"
              value={formData.featuredImage}
              onChange={handleInputChange}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
            Excerpt (Optional)
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            value={formData.excerpt}
            onChange={handleInputChange}
            placeholder="A short summary shown on blog cards (max 300 characters)..."
            rows={2}
            maxLength={300}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags (Optional)
          </label>
          <TagInput
            value={formData.tags}
            onChange={(csv) => setFormData(prev => ({ ...prev, tags: csv }))}
            placeholder="Type a tag and press Enter, e.g. technology"
          />
        </div>

        {/* Status */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published (uncheck to unpublish / save as draft)
        </label>

        {/* Submit Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(`/blog/${id}`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Updating...' : 'Update Blog'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogEdit;
