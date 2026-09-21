import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Layers2, ArrowRight, SearchX } from 'lucide-react';
import { fetchJobCategories } from '../../../api/jobCategoryApi';
import { fetchJobs, Job } from '../jobseekerApi/api';
import { JobCard } from './JobCard';

const MAX_FIELDS = 4;
const JOBS_PER_FIELD = 3;

interface FieldGroup {
  name: string;
  jobs: Job[];
  total: number;
}

// No hardcoded category/job-title list — whatever real, active JobCategory
// records actually have published jobs is what shows here. Categories with
// zero active jobs are dropped entirely rather than rendered empty, and
// the remaining ones are ranked by real job count (most active fields
// first) — never a fabricated number.
const fetchFieldGroups = async (): Promise<FieldGroup[]> => {
  const categories = await fetchJobCategories();
  const groups = await Promise.all(
    categories.map(async (cat) => {
      try {
        const res = await fetchJobs({ jobcategory: cat.name, limit: JOBS_PER_FIELD, sortBy: 'newest' });
        return { name: cat.name, jobs: (res.jobs || []) as Job[], total: (res.total || 0) as number };
      } catch {
        return { name: cat.name, jobs: [], total: 0 };
      }
    })
  );
  return groups
    .filter((g) => g.total > 0 && g.jobs.length > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_FIELDS);
};

const containerVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const cardVariants: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

const ExploreByField: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const { data: fields = [], isLoading, isError } = useQuery({
    queryKey: ['exploreByField'],
    queryFn: fetchFieldGroups,
  });

  // Nothing real to show (no categories with active jobs yet) — skip the
  // section entirely rather than rendering an empty shell on the homepage.
  if (!isLoading && !isError && fields.length === 0) return null;

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="mb-6 sm:mb-8">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
            <Layers2 size={14} /> By Field
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Explore Jobs by Field</h2>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">Jump into the fields hiring right now.</p>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {[1, 2].map((n) => (
              <div key={n}>
                <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200" />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((m) => (
                    <div key={m} className="h-44 animate-pulse rounded-2xl border border-slate-100 bg-white" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 sm:p-7 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <SearchX size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Couldn't load job fields</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">Something went wrong on our end. Please try again.</p>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {fields.map((field) => (
              <div key={field.name}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{field.name}</h3>
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs?q=${encodeURIComponent(field.name)}`)}
                    className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors duration-200"
                  >
                    <span>View All Jobs</span>
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
                <motion.div
                  variants={prefersReducedMotion ? undefined : containerVariants}
                  initial={prefersReducedMotion ? undefined : 'hidden'}
                  whileInView={prefersReducedMotion ? undefined : 'show'}
                  viewport={{ once: true, amount: 0.15 }}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {field.jobs.map((job) => (
                    <motion.div key={job._id} variants={prefersReducedMotion ? undefined : cardVariants} className="h-full">
                      <JobCard job={job} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default ExploreByField;
