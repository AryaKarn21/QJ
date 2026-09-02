import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Save, Wand2, Plus, X, AlertCircle } from 'lucide-react';
import { getActiveBlogCategories, type PublicBlogCategory } from '../../api/blogCategoryApi';
import { TagInput } from '../common/TagInput';
// Matches the backend's actual default port (server.js: PORT || 3000, and
// every other API file in this app — testimonialApi.ts, advertisementApi.ts,
// etc.). This previously fell back to :8000, nothing listens there, so any
// environment missing VITE_API_BASE_URL had every blog request silently hit
// the wrong port instead of the real backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface BlogImage {
  url: string;
  caption: string;
}

const BlogCreate: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    category: 'General',
    excerpt: '',
    featuredImage: '',
  });
  const [images, setImages] = useState<BlogImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  // Separate from `generatingContent` (the loading flag) on purpose:
  // `generatingContent` is always false again by the time the author
  // clicks Publish — using it at submit made `isAIGenerated` always false
  // regardless of whether AI was actually used. This flips true once a
  // generation succeeds and stays true even after content is hand-edited
  // afterward — "AI was involved" isn't undone by the author polishing
  // the wording.
  const [hasGeneratedWithAI, setHasGeneratedWithAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Real, admin-managed categories (Phase 6) — this used to be a free-text
  // input, so a category created in the admin panel could never actually
  // be picked when writing a blog, same root cause the job posting form
  // already had for job categories before it became a dropdown.
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);

  useEffect(() => {
    getActiveBlogCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const generateContent = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title first.');
      return;
    }

    setAiError(null);
    try {
      setGeneratingContent(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/blogs/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: formData.title }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data) {
        setFormData((prev) => ({ ...prev, content: data.content }));
        setHasGeneratedWithAI(true);
        toast.success('Content generated. Feel free to edit it before publishing.');
      } else {
        // AI generation is optional — never blocks the author from writing
        // the blog by hand. Show a clear reason (backend already sends a
        // structured, secret-free message for both "not configured" (503)
        // and "generation failed" (500) cases) and let them continue.
        setAiError(
          (data && data.message) ||
            'AI content generation failed. You can continue editing manually.'
        );
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setAiError('AI content generation failed. You can continue editing manually.');
    } finally {
      setGeneratingContent(false);
    }
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
    submitBlog(true); // Enter-key / default form submission publishes
  };

  const submitBlog = async (publish: boolean) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required.');
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
        isAIGenerated: hasGeneratedWithAI,
        isPublished: publish,
      };

      const response = await fetch(`${API_BASE_URL}/api/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(blogData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(publish ? 'Blog published.' : 'Draft saved.');
        navigate(`/blog/${data.blog.slug || data.blog._id}`);
      } else {
        const error = await response.json().catch(() => null);
        toast.error(error?.message || 'Failed to create blog.');
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      toast.error('Failed to create blog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Blog</h1>
        <p className="text-gray-600">Share your thoughts and insights with the community</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter your blog title..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="button"
              onClick={generateContent}
              disabled={generatingContent || !formData.title.trim()}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {generatingContent ? 'Generating content...' : 'AI Generate'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter a title and click "AI Generate" to automatically create content using AI
          </p>
          {aiError && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}
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
              {/* A blog being edited (BlogEdit.tsx) may carry a category
                  that's since been renamed/deactivated/deleted — keep it
                  selectable so editing never silently blanks it out. */}
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

        {/* Submit Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/blog')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => submitBlog(false)}
              className="flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Publishing...' : 'Publish Blog'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BlogCreate;
