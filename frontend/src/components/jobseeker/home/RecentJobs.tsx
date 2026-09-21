import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MapPin,
  Clock,
  Bookmark,
  CheckCircle2,
  DollarSign,
  Award,
  Sparkles,
  SearchX,
  ArrowRight,
} from 'lucide-react';
import { fetchRecentJobs } from '../jobseekerApi/api';

// Extended Job interface maintaining exact compatibility with existing fields
interface Job {
  _id: string;
  title: string;
  location: string;
  jobtype: string;
  status: string;
  salary: string;
  experience: string;
  level: string;
  deadline: string;
  istrending: boolean;
  openings: number;
  description: string;
  likeCount: number;
  dislikeCount: number;
  jobseekers: any[];
  jobcategory: string;
  createdAt: string;
  updatedAt?: string;
  isVerified?: boolean;
  skills?: string[];
  workMode?: 'Remote' | 'Hybrid' | 'On-site' | string;
  employer?: {
    _id: string;
    name: string;
    email?: string;
    companyLogo?: string;
    isVerified?: boolean;
  };
  // Per-job display identity (backend/models/Job.js) — falls back to the
  // populated `employer` above, and is the only display name left once
  // `employer` is null (account since deleted).
  companyOverride?: { name?: string; logo?: string };
}


// Format relative time helper for posted time
const getRelativeTime = (dateString: string) => {
  if (!dateString) return 'Recently';
  const postedDate = new Date(dateString);
  const diffInDays = Math.floor(
    (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays <= 0) return 'Posted Today';
  if (diffInDays === 1) return 'Posted 1 day ago';
  if (diffInDays < 30) return `Posted ${diffInDays} days ago`;
  return `Posted ${Math.floor(diffInDays / 30)} months ago`;
};

const RecentJobs: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const getJobs = async () => {
      try {
        const data = await fetchRecentJobs();
        setJobs(data || []);
      } catch (error) {
        console.error('Error fetching recent jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    getJobs();
  }, []);

  const toggleBookmark = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setBookmarkedJobs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  // Badge Style Helper
  const getWorkModeBadgeStyle = (mode?: string) => {
    const normalized = mode?.toLowerCase() || '';
    if (normalized.includes('remote')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (normalized.includes('hybrid')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/80';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200/80';
  };

  const getJobTypeBadgeStyle = (type: string) => {
    const normalized = type?.toLowerCase() || '';
    if (normalized.includes('intern')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    }
    if (normalized.includes('full')) {
      return 'bg-orange-50 text-orange-700 border-orange-200/80';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Skeleton Loader State Component
  if (loading) {
    return (
      <section className="bg-slate-50/50 py-10 sm:py-12 lg:py-14" aria-busy="true" aria-label="Loading jobs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center mb-8">
            <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse mb-2.5" />
            <div className="h-4 w-72 bg-slate-200 rounded-md animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-pulse flex flex-col justify-between h-[340px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-28 bg-slate-200 rounded" />
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  </div>

                  <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                  <div className="flex gap-2 mb-5">
                    <div className="h-5 w-20 bg-slate-200 rounded-full" />
                    <div className="h-5 w-24 bg-slate-200 rounded-full" />
                  </div>

                  <div className="space-y-2">
                    <div className="h-3.5 w-1/2 bg-slate-200 rounded" />
                    <div className="h-3.5 w-2/3 bg-slate-200 rounded" />
                    <div className="h-3.5 w-2/5 bg-slate-200 rounded" />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="h-10 flex-1 bg-slate-200 rounded-xl" />
                  <div className="h-10 flex-1 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50/50 py-10 sm:py-12 lg:py-14 selection:bg-orange-500 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-xs font-semibold text-[#F97316] mb-2.5 shadow-2xs">
            <Sparkles size={14} className="text-[#F97316]" />
            <span>Latest Opportunities</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Explore Recent Jobs
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-1.5">
            Discover your next high-impact career opportunity with top hiring teams.
          </p>
        </div>

        {/* Empty State */}
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 bg-orange-100 text-[#F97316] rounded-xl flex items-center justify-center mx-auto mb-3">
              <SearchX size={24} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              No jobs available yet
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-4 leading-relaxed max-w-md mx-auto">
              New opportunities will appear here soon. Check back shortly or browse other job categories.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              Refresh Feed
            </button>
          </div>
        ) : (
          /* Jobs Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {jobs.map((job) => {
              const deadline = new Date(job.deadline);
              const daysLeft = Math.max(
                0,
                Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              );
              const isVerifiedEmployer =
                job.employer?.isVerified || job.isVerified;
              const workMode = job.workMode || (job.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-site');
              const isBookmarked = !!bookmarkedJobs[job._id];
              const displayName = job.companyOverride?.name?.trim() || job.employer?.name?.trim();
              const displayLogo = job.companyOverride?.logo || job.employer?.companyLogo;

              return (
                <article
                  key={job._id}
                  className="group relative bg-white/90 hover:bg-white border border-slate-200/80 hover:border-orange-200 rounded-[20px] p-6 shadow-xs hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-200 ease-out hover:-translate-y-[3px] hover:scale-[1.01] flex flex-col justify-between backdrop-blur-xl"
                >
                  <div>
                    {/* Top Section: Logo, Employer Name, Bookmark */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {displayLogo ? (
                          <img
                            src={resolveMediaUrl(displayLogo)}
                            alt={`${displayName || 'Company'} Logo`}
                            className="w-14 h-14 rounded-2xl object-cover bg-slate-100 border border-slate-200/60 shrink-0 group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-300">
                            {displayName?.[0] || 'C'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 text-sm truncate">
                              {displayName || 'Top Company'}
                            </span>
                            {isVerifiedEmployer && (
                              <CheckCircle2
                                size={15}
                                className="text-[#F97316] shrink-0"
                                aria-label="Verified Employer"
                              />
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                            {getRelativeTime(job.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => toggleBookmark(e, job._id)}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                        className={`p-2.5 rounded-xl border transition-all duration-200 shrink-0 cursor-pointer active:scale-95 hover:scale-105 ${
                          isBookmarked
                            ? 'bg-orange-50 border-orange-200 text-[#F97316]'
                            : 'bg-slate-50/80 hover:bg-orange-50 border-slate-200/60 hover:border-orange-200 text-slate-400 hover:text-[#F97316]'
                        }`}
                      >
                        <Bookmark
                          size={18}
                          className={isBookmarked ? 'fill-[#F97316]' : ''}
                        />
                      </button>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#F97316] transition-colors duration-200 line-clamp-1 mb-3">
                      {job.title}
                    </h3>

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      {/* Work Mode Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getWorkModeBadgeStyle(
                          workMode
                        )}`}
                      >
                        {workMode}
                      </span>

                      {/* Job Type Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getJobTypeBadgeStyle(
                          job.jobtype
                        )}`}
                      >
                        {job.jobtype}
                      </span>
                    </div>

                    {/* Meta Info List */}
                    <div className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-600 font-medium">
                      {job.salary && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <DollarSign size={16} className="text-[#F97316] shrink-0" />
                          <span className="truncate font-semibold">{job.salary}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin size={16} className="text-slate-400 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>

                      {job.experience && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Award size={16} className="text-slate-400 shrink-0" />
                          <span className="truncate">{job.experience}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={16} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {daysLeft > 0 ? (
                            <span className={daysLeft <= 3 ? 'text-rose-600 font-semibold' : ''}>
                              {daysLeft} days left to apply
                            </span>
                          ) : (
                            <span className="text-rose-600 font-semibold">Deadline passed</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Optional Skills Tags */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-6 pt-2">
                        {job.skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 3 && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-medium">
                            +{job.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200 text-center active:scale-[0.98] hover:scale-[1.02] hover:-translate-y-[1px] cursor-pointer"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm transition-all duration-200 text-center shadow-md shadow-orange-500/20 active:scale-[0.98] hover:scale-[1.02] hover:-translate-y-[1px] inline-flex items-center justify-center gap-1.5 cursor-pointer group/btn"
                    >
                      <span>Apply Now</span>
                      <ArrowRight size={14} className="transition-transform duration-200 group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default RecentJobs;