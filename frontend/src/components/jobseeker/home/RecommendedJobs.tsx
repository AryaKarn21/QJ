import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Briefcase, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { fetchJobRecommendations } from '../../../api/communityAiApi';
import { useCurrentUser } from '../../../utils/currentUser';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

// Same fallback-accent trick TrendingJobs.tsx uses for cards without a logo.
const LOGO_ACCENTS = ['bg-slate-700', 'bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500'];
const accentFor = (id: string) => LOGO_ACCENTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % LOGO_ACCENTS.length];

/**
 * "Recommended For You" — this already existed as a real, working backend
 * feature (skill-matched candidates, optionally re-ranked by Gemini when
 * configured — see backend/controllers/communityAiController.js's
 * getJobRecommendations) with a frontend API client already written
 * (api/communityAiApi.ts's fetchJobRecommendations), but nothing on the
 * site ever rendered it. This wires up that existing feature rather than
 * building a new one. Jobseeker-only (the endpoint reads the caller's own
 * skills), and renders nothing for anyone else or when there's nothing to
 * recommend yet — same "no data yet means no section" convention as every
 * other homepage section here.
 */
const RecommendedJobs: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useCurrentUser();
  const enabled = isAuthenticated && role === 'jobseeker';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobRecommendations'],
    queryFn: fetchJobRecommendations,
    enabled,
  });

  if (!enabled) return null;
  if (!isLoading && (isError || !data || data.length === 0)) return null;

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
              <Sparkles size={14} /> Just For You
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Recommended Jobs</h2>
            <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
              Matched to the skills on your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-500 hover:text-orange-600"
          >
            View All Jobs <ArrowRight size={15} />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(data || []).slice(0, 8).map(({ job, reason }) => (
              <article
                key={job._id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-lg"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {job.employer?.companyLogo ? (
                        <img
                          src={`${MEDIA_URL.replace(/\/$/, '')}/${job.employer.companyLogo.replace(/^\//, '')}`}
                          alt={`${job.employer.name} logo`}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ${accentFor(job._id)}`}>
                          {job.employer?.name?.[0] || 'C'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-bold tracking-tight text-slate-900">{job.title}</h3>
                        <p className="truncate text-sm text-slate-500">{job.employer?.name || 'Company'}</p>
                      </div>
                    </div>
                  </div>

                  <p className="mb-2 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{job.location}</span>
                  </p>

                  {reason && (
                    <p className="mb-2 flex items-start gap-1.5 text-xs text-orange-600">
                      <Sparkles size={12} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{reason}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <div className="min-w-0 space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      <Briefcase size={11} /> {job.jobtype}
                    </span>
                    {job.salary && (
                      <p className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <DollarSign size={12} className="text-orange-500" />
                        <span className="truncate">{job.salary}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    aria-label={`View details for ${job.title}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition-transform duration-200 group-hover:scale-105 hover:bg-orange-600 active:scale-95"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedJobs;
