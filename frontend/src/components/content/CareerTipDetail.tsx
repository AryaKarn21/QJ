import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Loader2 } from 'lucide-react';
import { getCareerTipById, type CareerTip } from '../../api/cmsPublicApi';

export default function CareerTipDetail() {
  const { id } = useParams<{ id: string }>();
  const [tip, setTip] = useState<CareerTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    getCareerTipById(id)
      .then((data) => {
        if (!cancelled) setTip(data);
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
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/career-tips" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={15} /> Back to Career Tips
      </Link>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : error || !tip ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <Lightbulb size={28} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">This career tip couldn't be found. It may have been removed.</p>
        </div>
      ) : (
        <article>
          <span className="mb-3 inline-block w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {tip.category}
          </span>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">{tip.title}</h1>
          <p className="mb-6 text-xs text-gray-400">
            {new Date(tip.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div
            className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: tip.content }}
          />
        </article>
      )}
    </div>
  );
}
