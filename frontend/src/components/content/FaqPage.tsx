import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import { getFaqs, type Faq } from '../../api/cmsPublicApi';

type AudienceFilter = 'all' | 'jobseeker' | 'employer';

const AUDIENCE_LABELS: Record<AudienceFilter, string> = {
  all: 'All',
  jobseeker: 'Job Seekers',
  employer: 'Employers',
};

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900">{faq.question}</span>
        <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600">{faq.answer}</div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getFaqs()
      .then((data) => {
        if (!cancelled) setFaqs(data);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((f) => {
      if (audience !== 'all' && f.audience !== 'all' && f.audience !== audience) return false;
      if (q && !(f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [faqs, audience, query]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <HelpCircle size={32} className="mx-auto mb-3 text-primary" />
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm text-gray-500">Answers to common questions about using QuickJobs.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AUDIENCE_LABELS) as AudienceFilter[]).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                audience === a ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {AUDIENCE_LABELS[a]}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FAQs…"
            className="w-full rounded-full border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center text-sm text-red-600">
          Couldn't load FAQs right now. Please try again later.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
          <p className="text-sm text-gray-500">
            {query || audience !== 'all' ? 'No FAQs match your filters.' : 'No FAQs have been published yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq) => (
            <FaqItem key={faq._id} faq={faq} />
          ))}
        </div>
      )}
    </div>
  );
}
