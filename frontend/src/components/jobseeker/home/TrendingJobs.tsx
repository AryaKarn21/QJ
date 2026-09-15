import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { TrendingUp, SearchX, ArrowRight } from 'lucide-react';
import { fetchTrendingJobs, Job } from '../jobseekerApi/api';
import { JobCard } from './JobCard';

// Staggered card entrance — same pattern Hero.tsx uses, gated off entirely
// when the user prefers reduced motion (see `prefersReducedMotion` below).
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const TrendingJobs: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

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
          <div className="bg-white/80 border border-red-100 rounded-[20px] p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <SearchX size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Couldn't load trending jobs</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">Something went wrong on our end. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white/80 border border-slate-200/80 rounded-[20px] p-12 text-center max-w-lg mx-auto shadow-sm backdrop-blur-md">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
              <TrendingUp size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No trending jobs yet</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Jobs marked as trending by our team will show up here. In the meantime, browse everything that's open right now.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Browse All Jobs
            </button>
          </div>
        ) : (
          <motion.div
            variants={prefersReducedMotion ? undefined : containerVariants}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            whileInView={prefersReducedMotion ? undefined : 'show'}
            viewport={{ once: true, amount: 0.15 }}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4"
          >
            {jobs.map((job: Job) => (
              <motion.div
                key={job._id}
                variants={prefersReducedMotion ? undefined : cardVariants}
                className="w-[82%] shrink-0 snap-center sm:w-auto sm:shrink"
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default TrendingJobs;
