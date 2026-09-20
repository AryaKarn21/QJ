import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Save, Wand2, Plus, X, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { getActiveBlogCategories, type PublicBlogCategory } from '../../api/blogCategoryApi';
import { uploadBlogImage } from '../../api/blogApi';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { TagInput } from '../common/TagInput';
// Matches the backend's actual default port (server.js: PORT || 3000, and
// every other API file in this app — testimonialApi.ts, advertisementApi.ts,
// etc.). This previously fell back to :8000, nothing listens there, so any
// environment missing VITE_API_BASE_URL had every blog request silently hit
// the wrong port instead of the real backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

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
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [uploadingPostImageIndex, setUploadingPostImageIndex] = useState<number | null>(null);
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
    getActiveBlogCategories()
      .then(setCategories)
      .catch((err) => {
        console.error('Failed to load blog categories:', err);
        // Non-fatal — "General" is always an option below even if the
        // fetch fails.
      });
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }
    setUploadingFeatured(true);
    try {
      const res = await uploadBlogImage(file);
      setFormData((prev) => ({ ...prev, featuredImage: res.url }));
      toast.success('Featured image uploaded to Cloudinary!');
    } catch (err: any) {
      console.error('Failed to upload featured image:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingFeatured(false);
    }
  };

  const handlePostImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }
    setUploadingPostImageIndex(index);
    try {
      const res = await uploadBlogImage(file);
      updateImage(index, 'url', res.url);
      toast.success('Image uploaded to Cloudinary!');
    } catch (err: any) {
      console.error('Failed to upload post image:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingPostImageIndex(null);
    }
  };

  const handleGenerateContent = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title first');
      return;
    }

    try {
      setGeneratingContent(true);
      setAiError(null);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/blogs/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: formData.title }),
      });

      const data = await response.json();

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
        toast.success(publish ? 'Blog published successfully!' : 'Draft saved.');
        navigate('/blog');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save blog');
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      toast.error('Failed to create blog');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Blog Post</h1>
        <p className="mt-2 text-gray-600">Share your thoughts and expertise with the community.</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter blog title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Content
            </label>
            <button
              type="button"
              onClick={handleGenerateContent}
              disabled={generatingContent || !formData.title.trim()}
              className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
            >
              <Wand2 className="h-4 w-4 mr-1" />
              {generatingContent ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
          {aiError && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="flex-1">
                <span className="font-semibold">AI generation note: </span>
                {aiError}
              </div>
              <button
                type="button"
                onClick={() => setAiError(null)}
                className="text-amber-700 hover:text-amber-950 font-bold"
                aria-label="Dismiss note"
              >
                ×
              </button>
            </div>
          )}
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            rows={12}
            placeholder="Write your blog content here..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-sans"
            required
          />
        </div>

        {/* Images */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Additional Post Images
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
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer text-xs font-medium transition-colors">
                      {uploadingPostImageIndex === index ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>{uploadingPostImageIndex === index ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={(e) => handlePostImageUpload(index, e)}
                        disabled={uploadingPostImageIndex === index}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-slate-400">or paste URL:</span>
                  </div>
                  <input
                    type="url"
                    placeholder="Image URL"
                    value={image.url}
                    onChange={(e) => updateImage(index, 'url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Caption (optional)"
                    value={image.caption}
                    onChange={(e) => updateImage(index, 'caption', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {image.url && (
                    <div className="relative mt-2">
                      <img
                        src={resolveMediaUrl(image.url)}
                        alt={image.caption || `Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateImage(index, 'url', '')}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow"
                        title="Clear image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
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
              Featured Image (Optional)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer text-xs font-medium transition-colors">
                  {uploadingFeatured ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>{uploadingFeatured ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleFeaturedImageUpload}
                    disabled={uploadingFeatured}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-400">or paste URL:</span>
              </div>
              <input
                type="url"
                id="featuredImage"
                name="featuredImage"
                value={formData.featuredImage}
                onChange={handleInputChange}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {formData.featuredImage && (
                <div className="relative mt-2 inline-block">
                  <img
                    src={resolveMediaUrl(formData.featuredImage)}
                    alt="Featured preview"
                    className="h-32 w-48 object-cover rounded-lg border border-gray-200"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, featuredImage: '' }))}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow"
                    title="Remove featured image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
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
            onChange={(val) => setFormData((prev) => ({ ...prev, tags: val }))}
            placeholder="Add tags..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/blog')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => submitBlog(false)}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => submitBlog(true)}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogCreate;
