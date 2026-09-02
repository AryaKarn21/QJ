import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, FileText } from 'lucide-react';
import { getActiveBlogCategories, type PublicBlogCategory } from '../../../api/blogCategoryApi';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

// Same deterministic-accent trick JobCategories.tsx/BlogCategoriesExplore.tsx
// use, so a category without a custom icon still looks intentional.
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
 * "Explore Blog Categories" — the main homepage's (/) equivalent of
 * BlogCategoriesExplore.tsx, which is styled for embedding inside
 * BlogList.tsx's own container (/blog) and doesn't match this page's
 * section design (full-bleed background, max-w-6xl header block, same
 * card grid as JobCategories.tsx). Rather than reuse that component as-is
 * here, this is a homepage-styled presentational layer over the exact
 * same data source (GET /api/blog-categories/active via
 * getActiveBlogCategories) — no hardcoded categories, no duplicated
 * fetch/type logic. Renders nothing if no admin has published a blog
 * category yet, same convention as every other homepage section.
 */
const BlogCategoriesSection = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getActiveBlogCategories()
      .then(setCategories)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && (failed || categories.length === 0)) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
              <BookOpen size={14} /> From the Blog
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Explore Blog Categories</h2>
            <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
              Career insights, hiring trends, and advice — browse by topic.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/blog')}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-500 hover:text-orange-600"
          >
            View All Articles <ArrowRight size={15} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-50" />
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
                  className="flex flex-col items-center gap-2.5 rounded-2xl border border-transparent bg-slate-50 p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:bg-white hover:shadow-md"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg}`}>
                    {cat.icon ? (
                      <img
                        src={`${MEDIA_URL.replace(/\/$/, '')}/${cat.icon.replace(/^\//, '')}`}
                        alt=""
                        className="h-6 w-6 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <BookOpen size={20} className={accent.text} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{cat.name}</p>
                    <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
                      <FileText size={11} /> {cat.blogCount} article{cat.blogCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogCategoriesSection;
