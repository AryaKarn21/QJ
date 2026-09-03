import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Layers, ArrowRight, SearchX } from 'lucide-react';

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
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
              <Layers size={14} /> Browse Categories
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Explore Categories</h2>
            <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
              Find jobs in your preferred field and build your dream career.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-500 hover:text-orange-600"
          >
            View All Categories <ArrowRight size={15} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-red-100 rounded-[20px] p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <SearchX size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Couldn't load categories</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-[20px] p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
              <Layers size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No categories yet</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Categories marked as trending by our team will show up here. Browse all open jobs in the meantime.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Browse All Jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((category) => {
              const accent = accentFor(category.name);
              return (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => handleCategoryClick(category.name)}
                  className="flex flex-col items-center gap-2.5 rounded-2xl border border-transparent bg-white p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-md"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg}`}>
                    {category.icon ? (
                      <img
                        src={`${(import.meta.env.VITE_MEDIA_URL || API_BASE_URL).replace(/\/$/, '')}/uploads/icons/${category.icon.replace(/^\//, '')}`}
                        alt=""
                        className="h-6 w-6 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Layers size={20} className={accent.text} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{category.name}</p>
                    <p className="text-xs text-slate-400">{category.jobCount} job{category.jobCount === 1 ? '' : 's'}</p>
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

export default JobCategories;
