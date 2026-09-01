import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Briefcase, DollarSign, ArrowRight, TrendingUp } from 'lucide-react';
import { fetchTrendingJobs, Job } from '../jobseekerApi/api';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

// A small, deterministic set of accent colors for the logo-fallback
// square, so cards without a real company logo still look varied and
// professional instead of every one being the same gray box.
const LOGO_ACCENTS = [
  'bg-slate-700', 'bg-violet-500', 'bg-emerald-500', 'bg-blue-500',
  'bg-rose-500', 'bg-amber-500',
];
const accentFor = (id: string) => LOGO_ACCENTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % LOGO_ACCENTS.length];

const TrendingJobs: React.FC = () => {
  const navigate = useNavigate();

  const { data: jobs = [], isLoading, isError } = useQuery<Job[]>({
    queryKey: ['trendingJobs'],
    queryFn: fetchTrendingJobs,
  });

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
              <TrendingUp size={14} /> Most In-Demand
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Trending Jobs</h2>
            <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
              Explore the most popular job opportunities right now.
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
        ) : isError ? (
          <p className="py-10 text-center text-sm text-red-500">Failed to load trending jobs.</p>
        ) : jobs.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No trending jobs right now — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {jobs.map((job: Job) => (
              <article
                key={job._id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-lg"
              >
                <div>
                  <div className="mb-4 flex items-start justify-between gap-2">
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

                  <p className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{job.location}</span>
                  </p>
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

export default TrendingJobs;
