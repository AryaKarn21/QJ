import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb, Search } from 'lucide-react';
import { getCareerTips, type CareerTip } from '../../api/cmsPublicApi';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export default function CareerTips() {
  const [tips, setTips] = useState<CareerTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getCareerTips()
      .then((data) => {
        if (!cancelled) setTips(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(tips.map((t) => t.category).filter(Boolean)))], [tips]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tips.filter((t) => {
      if (category !== 'All' && t.category !== category) return false;
      if (q && !(t.title.toLowerCase().includes(q) || stripHtml(t.content).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tips, category, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <Lightbulb size={32} className="mx-auto mb-3 text-primary" />
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Career Tips</h1>
        <p className="mt-2 text-sm text-gray-500">Practical advice to help you find and land the right job.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                category === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search career tips…"
            className="w-full rounded-full border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center text-sm text-red-600">
          Couldn't load career tips right now. Please try again later.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
          <p className="text-sm text-gray-500">
            {query || category !== 'All' ? 'No career tips match your filters.' : 'No career tips have been published yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tip) => (
            <Link
              key={tip._id}
              to={`/career-tips/${tip._id}`}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <span className="mb-2 inline-block w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {tip.category}
              </span>
              <h2 className="mb-2 font-bold text-gray-900 group-hover:text-primary">{tip.title}</h2>
              <p className="mb-4 line-clamp-3 flex-1 text-sm text-gray-500">{stripHtml(tip.content)}</p>
              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                Read more <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
