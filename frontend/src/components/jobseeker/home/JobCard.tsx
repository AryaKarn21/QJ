import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, DollarSign, ArrowRight, Bookmark, Flame } from 'lucide-react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { toggleSaveJob } from '../jobseekerApi/api';

// Shared card shape — a superset of what TrendingJobs/ExploreByField/the
// admin trending preview actually have available. Every field beyond _id/
// title/location/jobtype is optional so this renders sensibly whether it's
// fed a full populated Job or a lean admin-preview row.
export interface JobCardData {
  _id: string;
  title: string;
  location: string;
  jobtype: string;
  salary?: string;
  istrending?: boolean;
  isSaved?: boolean;
  requiredSkills?: string[];
  employer?: {
    name?: string;
    companyLogo?: string;
  };
  // Per-job display identity (backend/models/Job.js) — falls back to the
  // populated `employer` above, and is the only display name left once
  // `employer` is null (account since deleted).
  companyOverride?: { name?: string; logo?: string };
}

// Small, deterministic accent set for the logo-fallback square so cards
// without a real company logo still look varied instead of one gray box —
// same approach TrendingJobs.tsx used before this component existed.
const LOGO_ACCENTS = ['bg-slate-700', 'bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500'];
const accentFor = (id: string) => LOGO_ACCENTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % LOGO_ACCENTS.length];

interface JobCardProps {
  job: JobCardData;
  /** Admin preview mode — renders the same markup but disables navigation/bookmark clicks. */
  readOnly?: boolean;
  className?: string;
}

export const JobCard: React.FC<JobCardProps> = ({ job, readOnly = false, className = '' }) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(!!job.isSaved);
  const [saving, setSaving] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || saving) return;
    setSaving(true);
    const prev = isSaved;
    setIsSaved(!prev); // optimistic — toggleSaveJob's 401 interceptor redirects anonymous users to login anyway
    try {
      await toggleSaveJob(job._id);
    } catch (error) {
      console.error('Error toggling saved job:', error);
      setIsSaved(prev);
    } finally {
      setSaving(false);
    }
  };

  const goToJob = () => {
    if (!readOnly) navigate(`/jobs/${job._id}`);
  };

  const displayName = job.companyOverride?.name || job.employer?.name;
  const displayLogo = job.companyOverride?.logo || job.employer?.companyLogo;

  return (
    <article
      className={`group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-100 hover:shadow-lg ${className}`}
    >
      <div>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {displayLogo ? (
              <img
                src={resolveMediaUrl(displayLogo)}
                alt={`${displayName || 'Company'} logo`}
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ${accentFor(job._id)}`}>
                {displayName?.[0] || 'C'}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold tracking-tight text-slate-900">{job.title}</h3>
              <p className="truncate text-sm text-slate-500">{displayName || 'Company'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSave}
            disabled={readOnly}
            aria-label={isSaved ? 'Remove bookmark' : 'Bookmark job'}
            aria-pressed={isSaved}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 ${
              isSaved
                ? 'border-orange-200 bg-orange-50 text-orange-500'
                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-orange-200 hover:text-orange-500'
            } ${readOnly ? 'cursor-default' : ''}`}
          >
            <Bookmark size={15} className={isSaved ? 'fill-orange-500' : ''} />
          </button>
        </div>

        {job.istrending && (
          <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-600">
            <Flame size={11} className="fill-orange-500 text-orange-500" /> Trending
          </span>
        )}

        <p className="mb-3 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin size={14} className="shrink-0 text-slate-400" />
          <span className="truncate">{job.location}</span>
        </p>

        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {job.requiredSkills.slice(0, 3).map((skill) => (
              <span key={skill} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {skill}
              </span>
            ))}
          </div>
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
          onClick={goToJob}
          disabled={readOnly}
          aria-label={`View details for ${job.title}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition-transform duration-200 group-hover:scale-105 hover:bg-orange-600 active:scale-95 disabled:cursor-default"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
};

export default JobCard;
