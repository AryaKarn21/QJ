import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { TrendingUp, SearchX, ArrowRight } from 'lucide-react';
import { fetchTrendingJobs, Job } from '../jobseekerApi/api';
import { JobCard } from './JobCard';

// Staggered card entrance — same pattern Hero.tsx uses, gated off entirely
// when the user prefers reduced motion (see `prefersReducedMotion` below).
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const TrendingJobs: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const { data: jobs = [], isLoading, isError } = useQuery<Job[]>({
    queryKey: ['trendingJobs'],
    queryFn: fetchTrendingJobs,
  });

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <motion.div
        initial={prefersReducedMotion ? undefined : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.1 }}
        variants={sectionVariants}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >

        {/* Section header */}
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
              <TrendingUp size={14} /> Most In-Demand
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Trending Jobs</h2>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Explore the most popular job opportunities right now.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors duration-200"
          >
            <span>View All Jobs</span>
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 sm:p-7 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <SearchX size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Couldn't load trending jobs</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-4 leading-relaxed">Something went wrong on our end. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-7 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No trending jobs yet</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-4 leading-relaxed max-w-md mx-auto">
              Jobs marked as trending will show up here. In the meantime, browse open opportunities across all categories.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Browse All Jobs <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <motion.div
            variants={prefersReducedMotion ? undefined : containerVariants}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            whileInView={prefersReducedMotion ? undefined : 'show'}
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {jobs.map((job: Job) => (
              <motion.div
                key={job._id}
                variants={prefersReducedMotion ? undefined : cardVariants}
                className="h-full"
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default TrendingJobs;
