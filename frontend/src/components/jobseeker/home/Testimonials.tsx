import { useEffect, useState } from 'react';
import { Quote, Star, MessageSquareHeart } from 'lucide-react';
import { getActiveTestimonials, type PublicTestimonial } from '../../../api/testimonialApi';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';
const resolveImage = (url: string) => `${MEDIA_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

// Deterministic accent per card, same hashed-fallback trick used by
// JobCategories.tsx, so the row doesn't look monochrome.
const ACCENTS = [
  { bg: 'bg-orange-50', text: 'text-orange-500' },
  { bg: 'bg-violet-50', text: 'text-violet-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  { bg: 'bg-blue-50', text: 'text-blue-500' },
  { bg: 'bg-rose-50', text: 'text-rose-500' },
];
const accentFor = (name: string) =>
  ACCENTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENTS.length];

/**
 * Real testimonials, admin-published via /admin/testimonials
 * (backend/controllers/testimonialController.js) — same "no data yet
 * means render nothing" convention as AdBanner.tsx/JobCategories.tsx.
 * No placeholder quotes ever ship here.
 */
const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveTestimonials(9)
      .then(setTestimonials)
      .catch(() => setTestimonials([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && testimonials.length === 0) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="mb-10 text-center">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
            <MessageSquareHeart size={14} /> Testimonials
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            What People Are Saying
          </h2>
          <p className="mx-auto mt-1.5 max-w-xl text-sm text-slate-500 sm:text-base">
            Real feedback from job seekers and employers who found success on QuickJobs.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => {
              const accent = accentFor(t.name);
              return (
                <div
                  key={t._id}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <Quote size={22} className={`mb-3 ${accent.text}`} />

                  <p className="mb-5 flex-1 text-sm leading-relaxed text-slate-600">
                    "{t.quote}"
                  </p>

                  {t.rating > 0 && (
                    <div className="mb-4 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {t.avatarUrl ? (
                      <img
                        src={resolveImage(t.avatarUrl)}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accent.bg} ${accent.text}`}>
                        {initials(t.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{t.name}</p>
                      {(t.role || t.company) && (
                        <p className="truncate text-xs text-slate-400">
                          {t.role}
                          {t.role && t.company ? ' · ' : ''}
                          {t.company}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
