import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, FileText } from 'lucide-react';
import { getActiveBlogCategories, type PublicBlogCategory } from '../../api/blogCategoryApi';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

// Same deterministic-accent trick JobCategories.tsx uses, so a category
// without a custom icon still looks intentional instead of gray/generic.
const ACCENTS = [
  { bg: 'bg-orange-50', text: 'text-orange-500' },
  { bg: 'bg-violet-50', text: 'text-violet-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  { bg: 'bg-blue-50', text: 'text-blue-500' },
  { bg: 'bg-rose-50', text: 'text-rose-500' },
  { bg: 'bg-pink-50', text: 'text-pink-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-500' },
  { bg: 'bg-amber-50', text: 'text-amber-600' },
];
const accentFor = (name: string) => ACCENTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENTS.length];

/**
 * Real, admin-managed blog categories (Phase 6) — renders nothing if no
 * admin has published one yet, same "no data yet means no section"
 * convention as every other Explore/Trending section in this app. Not
 * hardcoded: every category here came from GET /api/blog-categories/active.
 */
export function BlogCategoriesExplore() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveBlogCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && categories.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
        <Layers size={14} /> Explore Categories
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((cat) => {
            const accent = accentFor(cat.name);
            return (
              <button
                key={cat._id}
                type="button"
                onClick={() => navigate(`/blog/category/${cat.slug}`)}
                title={cat.description || cat.name}
                className="flex flex-col items-center gap-2 rounded-2xl border border-transparent bg-white p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-md"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.bg}`}>
                  {cat.icon ? (
                    <img
                      src={`${MEDIA_URL.replace(/\/$/, '')}/${cat.icon.replace(/^\//, '')}`}
                      alt=""
                      className="h-6 w-6 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Layers size={18} className={accent.text} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{cat.name}</p>
                  <p className="flex items-center justify-center gap-1 text-xs text-gray-400">
                    <FileText size={11} /> {cat.blogCount} article{cat.blogCount === 1 ? '' : 's'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BlogCategoriesExplore;
