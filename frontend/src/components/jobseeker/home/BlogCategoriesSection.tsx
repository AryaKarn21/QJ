import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, FileText } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getActiveBlogCategories, type PublicBlogCategory } from '../../../api/blogCategoryApi';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { useHomepageSection } from '../../../hooks/useHomepageSection';

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
  const prefersReducedMotion = useReducedMotion();
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const section = useHomepageSection('blogCategories', {
    heading: 'Explore Blog Categories',
    description: 'Career insights, hiring trends, and advice — browse by topic.',
  });

  useEffect(() => {
    getActiveBlogCategories()
      .then(setCategories)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (!section.isActive) return null;
  if (!loading && (failed || categories.length === 0)) return null;

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >

        {/* Section header */}
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
              <BookOpen size={14} /> From the Blog
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{section.heading}</h2>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              {section.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/blog')}
            className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors duration-200"
          >
            <span>View All Articles</span>
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-50" />
            ))}
          </div>
        ) : (
          <div className={categories.length <= 3 ? "flex flex-wrap gap-4 sm:gap-5" : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5"}>
            {categories.map((cat) => {
              const accent = accentFor(cat.name);
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => navigate(`/blog/category/${cat.slug}`)}
                  title={cat.description || cat.name}
                  className={`group flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 text-center shadow-xs transition-all duration-200 ease-out hover:-translate-y-[2px] hover:border-orange-200 hover:bg-white hover:shadow-md active:scale-[0.98] ${categories.length <= 3 ? "w-full sm:w-auto sm:min-w-[200px] sm:max-w-[240px]" : ""}`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg} overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.04]`}>
                    {cat.icon ? (
                      <img
                        src={resolveMediaUrl(cat.icon)}
                        alt=""
                        className="h-6 w-6 object-contain transition-transform duration-200 ease-out group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <BookOpen size={20} className={accent.text} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{cat.name}</p>
                    <p className="flex items-center justify-center gap-1 text-xs text-slate-400 mt-0.5">
                      <FileText size={11} /> {cat.blogCount} article{cat.blogCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default BlogCategoriesSection;
