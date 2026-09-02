import { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { getActiveTestimonials, type PublicTestimonial } from '../../api/testimonialApi';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Compact, dark-themed testimonials strip for the very bottom of the
 * global Footer — same real data source as the homepage's Testimonials.tsx
 * section (GET /api/testimonials/active), just a second, footer-styled
 * presentational layer over it, matching how BlogCategoriesSection.tsx
 * reuses BlogCategoriesExplore.tsx's data for a differently-styled spot.
 * Renders nothing until an admin has actually published a testimonial —
 * same "no placeholder content" rule every other section here follows.
 */
export function FooterTestimonials() {
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveTestimonials(3)
      .then(setTestimonials)
      .catch(() => setTestimonials([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || testimonials.length === 0) return null;

  return (
    <div className="mt-10 border-t border-slate-800/80 pt-10">
      <div className="mb-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
        <Quote size={14} /> What People Are Saying
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <div
            key={t._id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors duration-200 hover:border-indigo-500/40"
          >
            {t.rating > 0 && (
              <div className="mb-3 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                  />
                ))}
              </div>
            )}
            <p className="mb-4 text-sm leading-relaxed text-slate-400">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              {t.avatarUrl ? (
                <img
                  src={`${MEDIA_URL.replace(/\/$/, '')}/${t.avatarUrl.replace(/^\//, '')}`}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-400">
                  {initials(t.name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-200">{t.name}</p>
                {(t.role || t.company) && (
                  <p className="truncate text-xs text-slate-500">
                    {t.role}
                    {t.role && t.company ? ' · ' : ''}
                    {t.company}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FooterTestimonials;
