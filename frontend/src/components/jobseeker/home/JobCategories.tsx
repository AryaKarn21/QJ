import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layers, ArrowRight, SearchX } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { useHomepageSection } from '../../../hooks/useHomepageSection';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

type CategoryType = {
  _id: string;
  name: string;
  icon: string;
  isTrending: boolean;
  jobCount: number;
};

// Deliberate color per well-known category name (matches the reference
// design's Engineering=blue / Design=pink / Marketing=green / etc.), with
// a hashed fallback for anything an admin creates that isn't in this list
// — so it's never left uncolored, just not hand-picked.
const NAMED_ACCENTS: Record<string, { bg: string; text: string }> = {
  engineering: { bg: 'bg-blue-50', text: 'text-blue-500' },
  design: { bg: 'bg-pink-50', text: 'text-pink-500' },
  marketing: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  'it & software': { bg: 'bg-violet-50', text: 'text-violet-500' },
  'it and software': { bg: 'bg-violet-50', text: 'text-violet-500' },
  it: { bg: 'bg-violet-50', text: 'text-violet-500' },
  software: { bg: 'bg-violet-50', text: 'text-violet-500' },
  finance: { bg: 'bg-amber-50', text: 'text-amber-600' },
  healthcare: { bg: 'bg-rose-50', text: 'text-rose-500' },
  education: { bg: 'bg-teal-50', text: 'text-teal-500' },
  sales: { bg: 'bg-orange-50', text: 'text-orange-500' },
};
const HASH_FALLBACK_ACCENTS = [
  { bg: 'bg-orange-50', text: 'text-orange-500' },
  { bg: 'bg-violet-50', text: 'text-violet-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  { bg: 'bg-blue-50', text: 'text-blue-500' },
  { bg: 'bg-rose-50', text: 'text-rose-500' },
  { bg: 'bg-pink-50', text: 'text-pink-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-500' },
  { bg: 'bg-amber-50', text: 'text-amber-600' },
];
const accentFor = (name: string) => {
  const known = NAMED_ACCENTS[name.trim().toLowerCase()];
  if (known) return known;
  return HASH_FALLBACK_ACCENTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HASH_FALLBACK_ACCENTS.length];
};

const JobCategories = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const section = useHomepageSection('popularCategories', {
    heading: 'Explore Categories',
    description: 'Find jobs in your preferred field and build your dream career.',
  });

  useEffect(() => {
    const fetchTrendingCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/api/jobcategories/trending/all`);
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching trending categories:', err);
        setError('Failed to load trending categories');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingCategories();
  }, []);

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/jobs?q=${encodeURIComponent(categoryName)}`);
  };

  if (!section.isActive) return null;

  return (
    <section className="bg-slate-50 py-10 sm:py-12 lg:py-14">
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
              <Layers size={14} /> Browse Categories
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{section.heading}</h2>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              {section.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors duration-200"
          >
            <span>View All Categories</span>
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 sm:p-7 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <SearchX size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Couldn't load categories</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-4 leading-relaxed">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Layers size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No categories yet</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-4 leading-relaxed max-w-md mx-auto">
              Categories marked as trending will show up here. Browse all open jobs in the meantime.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Browse All Jobs <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className={categories.length <= 3 ? "flex flex-wrap gap-4 sm:gap-5" : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5"}>
            {categories.map((category) => {
              const accent = accentFor(category.name);
              return (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => handleCategoryClick(category.name)}
                  className={`group flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xs transition-all duration-200 ease-out hover:-translate-y-[2px] hover:border-orange-200 hover:shadow-md active:scale-[0.98] ${categories.length <= 3 ? "w-full sm:w-auto sm:min-w-[200px] sm:max-w-[240px]" : ""}`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg} transition-transform duration-200 ease-out group-hover:-translate-y-1`}>
                    {category.icon ? (
                      <img
                        src={resolveMediaUrl(category.icon)}
                        alt=""
                        className="h-6 w-6 object-contain transition-transform duration-200 ease-out group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Layers size={20} className={accent.text} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{category.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{category.jobCount} job{category.jobCount === 1 ? '' : 's'}</p>
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

export default JobCategories;
