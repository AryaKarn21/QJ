import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MapPin, Clock, DollarSign, Users, Share2, Bookmark,
  Briefcase, BarChart, ThumbsUp, ThumbsDown, CalendarClock, Lock,
  Building2, Globe, GraduationCap, Gift, Sparkles, CheckCircle2,
  Linkedin, Target, Heart,
} from 'lucide-react';
import { fetchJobById, fetchJobs, likeJob, dislikeJob, toggleSaveJob } from '../jobseekerApi/api';
import { jwtDecode } from 'jwt-decode';


interface DecodedToken {
  id: string;
  role: 'jobseeker' | 'employer' | 'admin';
  exp: number;
}

// Matches jobController.js's COMPANY_PROFILE_FIELDS populate — every
// public-safe Employer field the "About the Company" section can show,
// auto-attached via the job's `employer` ref (see Phase 1's notes in
// jobController.js: nothing here is duplicated onto the job document).
interface Employer {
  _id: string;
  name: string;
  email?: string;
  companyLogo?: string;
  coverPhoto?: string;
  headline?: string; // reused as the company tagline
  description?: string;
  industryType?: string;
  companySize?: string;
  establishedDate?: string;
  address?: string; // reused as headquarters
  website?: string;
  socialLinks?: { linkedin?: string; twitter?: string; github?: string; website?: string };
  mission?: string;
  culture?: string;
  companyLocations?: string[];
  companyBenefits?: string[];
  verificationStatus?: 'Pending' | 'Verified' | 'Rejected';
}

interface Job {
  _id: string;
  title: string;
  country?: string;
  employer?: Employer;
  location: string;
  jobtype: string;
  status: string;
  salary: string;
  experience: string;
  level: string;
  openings: number;
  description: string;
  likeCount: number;
  dislikeCount: number;
  jobseekers: any[];
  jobcategory: string;
  deadline?: string;
  createdAt: string;
  updatedAt?: string;
  isSaved?: boolean;
  isApplied?: boolean;
  // Structured fields from Phase 1 (backend/models/Job.js) — every job
  // created/edited before that change simply won't have these, so every
  // section built from them below only renders when actually present.
  department?: string;
  workMode?: 'On-site' | 'Hybrid' | 'Remote';
  minExperience?: number;
  maxExperience?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: 'Yearly' | 'Monthly' | 'Hourly';
  currency?: string;
  overview?: string;
  responsibilities?: string[];
  requirements?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  education?: string;
  benefits?: string[];
  perks?: string[];
  workingHours?: string;
  companyOverride?: { name?: string; logo?: string; tagline?: string };
}

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

const formatDeadline = (deadline: string): string =>
  new Date(deadline).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

// Prefers the structured salaryMin/salaryMax (Phase 1) over the legacy
// free-text `salary` string when both happen to be present — the backend
// already keeps `salary` in sync with these (see employerController.js's
// deriveSalaryString), so this only matters for jobs edited to have one
// without the other out of band.
const formatSalary = (job: Job): string => {
  const { salaryMin: min, salaryMax: max } = job;
  if (min !== undefined || max !== undefined) {
    const cur = job.currency || 'NPR';
    const period = job.salaryPeriod || 'Yearly';
    const range = min !== undefined && max !== undefined && min !== max
      ? `${min.toLocaleString()} - ${max.toLocaleString()}`
      : (min ?? max)!.toLocaleString();
    return `${cur} ${range} / ${period}`;
  }
  return job.salary;
};

const formatExperience = (job: Job): string => {
  if (job.minExperience !== undefined || job.maxExperience !== undefined) {
    const min = job.minExperience;
    const max = job.maxExperience;
    if (min !== undefined && max !== undefined && min !== max) return `${min}-${max} years`;
    return `${min ?? max}+ years`;
  }
  return job.experience;
};


const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [latestJobs, setLatestJobs] = useState<Job[]>([]);
  const [loadingSimilarJobs, setLoadingSimilarJobs] = useState(true);
  const [loadingJob, setLoadingJob] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;

      try {
        setLoadingJob(true);
        const jobData = await fetchJobById(id);
        setJob(jobData);
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setLoadingJob(false);
      }
    };

    loadJob();
  }, [id]);

  useEffect(() => {
    const loadSimilarJobs = async () => {
      if (!job) return;

      try {
        setLoadingSimilarJobs(true);
        const res = await fetchJobs({ page: 1, limit: 50 });
        const similarJobs = res.jobs
          .filter((j: Job) => j._id !== job._id && j.jobcategory === job.jobcategory)
          .slice(0, 3);
        setLatestJobs(similarJobs);
      } catch (error) {
        console.error('Error loading similar jobs:', error);
      } finally {
        setLoadingSimilarJobs(false);
      }
    };

    loadSimilarJobs();
  }, [job?._id, job?.jobcategory]);


  const isExpired = Boolean(job?.deadline && new Date(job.deadline).getTime() < Date.now());

  const handleApply = () => {
    if (isExpired) return;

    const token = localStorage.getItem('token');

    if (!token) {
      toast.error('Please log in to apply.');
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.role === 'jobseeker') {
        if (job) {
          navigate(`/jobs/${job._id}/apply`);
        }
      } else {
        toast.error('Only jobseekers can apply for jobs.');
      }
    } catch (error) {
      console.error('Invalid token format', error);
      toast.error('Authentication error. Please log in again.');
    }
  };

  const handleSave = async () => {
    if (!job || isSaving) return;
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to save jobs.');
      return;
    }
    try {
      setIsSaving(true);
      const res = await toggleSaveJob(job._id);
      setJob({ ...job, isSaved: res.saved });
      toast.success(res.saved ? 'Job saved.' : 'Removed from saved jobs.');
    } catch (err) {
      console.error('Error saving job:', err);
      toast.error('Failed to update saved jobs. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!job) return;
    const url = window.location.href;
    // Native share sheet on mobile/supporting browsers; clipboard copy
    // everywhere else — never a dead button.
    if (navigator.share) {
      try {
        await navigator.share({ title: job.title, text: `${job.title} at ${job.employer?.name || 'QuickJobs'}`, url });
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.error('Could not copy the link. Please copy it from the address bar.');
    }
  };

  const handleLike = async () => {
    if (!job || isLiking) return;
    try {
      setIsLiking(true);
      const res = await likeJob(job._id);
      setJob({ ...job, likeCount: res.likes, dislikeCount: res.dislikes });
    } catch (err) {
      console.error("Error liking job:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (!job || isDisliking) return;
    try {
      setIsDisliking(true);
      const res = await dislikeJob(job._id);
      setJob({ ...job, dislikeCount: res.dislikes, likeCount: res.likes });
    } catch (err) {
      console.error("Error disliking job:", err);
    } finally {
      setIsDisliking(false);
    }
  };

  if (loadingJob) return <div className="text-center py-10 text-gray-500">Loading job details...</div>;
  if (!job) return <div className="text-center py-10 text-red-500">Job not found.</div>;

  // companyOverride lets an employer show different company identity on
  // THIS specific posting than their profile (Phase 1's models/Job.js) —
  // falls back to the auto-attached, populated employer otherwise.
  const displayName = job.companyOverride?.name || job.employer?.name || 'Company';
  const displayLogo = job.companyOverride?.logo || job.employer?.companyLogo;
  const displayTagline = job.companyOverride?.tagline || job.employer?.headline;

  // Small building blocks reused across the structured job-detail
  // sections below — only ever rendered when the underlying data exists,
  // matching this app's "no data yet means render nothing" convention.
  const BulletList = ({ items }: { items?: string[] }) =>
    !items || items.length === 0 ? null : (
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );

  const ChipList = ({ items }: { items?: string[] }) =>
    !items || items.length === 0 ? null : (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
            {item}
          </span>
        ))}
      </div>
    );

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="pt-6 mt-6 border-t border-gray-100 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="text-base font-semibold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Job Detail Section */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header card */}
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4 border-b pb-4">
                <div className="flex items-start space-x-4 min-w-0">
                  {displayLogo ? (
                    <img
                      src={`${MEDIA_URL.replace(/\/$/, '')}/${displayLogo.replace(/^\//, '')}`}
                      alt={`${displayName} Logo`}
                      className="w-16 h-16 rounded-full object-cover bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-semibold shrink-0">
                      {displayName?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
                    <p className="text-gray-600 mb-0.5">{displayName}</p>
                    {displayTagline && <p className="text-gray-400 text-xs mb-2">{displayTagline}</p>}
                    <div className="flex flex-wrap text-sm text-gray-500 gap-x-3 gap-y-1 mt-1">
                      <span><MapPin size={14} className="inline mr-1" />{job.location}{job.country ? `, ${job.country}` : ''}</span>
                      {job.workMode && <span><Globe size={14} className="inline mr-1" />{job.workMode}</span>}
                      <span><Clock size={14} className="inline mr-1" />{job.jobtype}</span>
                      {isExpired && (
                        <span className="text-gray-600 text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 inline-flex items-center gap-1">
                          <Lock size={11} /> Deadline Passed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 self-stretch sm:self-auto">
                  {isExpired ? (
                    <span
                      className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1.5 rounded text-sm font-medium cursor-not-allowed"
                      title="The application deadline for this job has passed"
                    >
                      <Lock size={14} />
                      Applications Closed
                    </span>
                  ) : job.isApplied ? (
                    // applyInJob already rejects a second application
                    // server-side — this just surfaces that up front
                    // instead of letting the jobseeker find out after
                    // filling out the form again.
                    <span
                      className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded text-sm font-medium"
                      title="You've already applied to this job"
                    >
                      <CheckCircle2 size={14} />
                      Already Applied
                    </span>
                  ) : (
                    <button
                      onClick={handleApply}
                      className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Apply Now
                    </button>
                  )}
                  <div className="flex space-x-1 text-gray-500">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      title={job.isSaved ? 'Remove from saved jobs' : 'Save job'}
                      aria-label={job.isSaved ? 'Remove from saved jobs' : 'Save job'}
                      className={`p-1.5 rounded hover:bg-gray-100 ${job.isSaved ? 'text-primary' : ''}`}
                    >
                      <Bookmark size={18} className={job.isSaved ? 'fill-primary' : ''} />
                    </button>
                    <button onClick={handleShare} title="Share job" aria-label="Share job" className="p-1.5 rounded hover:bg-gray-100">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Job Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="text-gray-500 text-sm mb-1"><DollarSign size={14} className="inline mr-1" />Salary</p>
                  <p className="font-semibold">{formatSalary(job)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1"><Briefcase size={14} className="inline mr-1" />Experience</p>
                  <p className="font-semibold">{formatExperience(job)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1"><BarChart size={14} className="inline mr-1" />Level</p>
                  <p className="font-semibold">{job.level}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1"><Users size={14} className="inline mr-1" />Openings</p>
                  <p className="font-semibold">{job.openings}</p>
                </div>
                {job.deadline && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1"><CalendarClock size={14} className="inline mr-1" />Application Deadline</p>
                    <p className={`font-semibold ${isExpired ? 'text-red-500' : ''}`}>
                      {formatDeadline(job.deadline)}
                    </p>
                  </div>
                )}
                {job.department && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1"><Building2 size={14} className="inline mr-1" />Department</p>
                    <p className="font-semibold">{job.department}</p>
                  </div>
                )}
              </div>
            </div>

            {/* About the Job */}
            <div className="bg-white rounded-lg p-6 shadow">
              {job.overview && (
                <Section title="About the Job">
                  <p className="text-sm text-gray-600 leading-relaxed">{job.overview}</p>
                </Section>
              )}

              {job.responsibilities && job.responsibilities.length > 0 && (
                <Section title="Responsibilities">
                  <BulletList items={job.responsibilities} />
                </Section>
              )}

              {job.requirements && job.requirements.length > 0 && (
                <Section title="Requirements">
                  <BulletList items={job.requirements} />
                </Section>
              )}

              {job.requiredSkills && job.requiredSkills.length > 0 && (
                <Section title="Required Skills">
                  <ChipList items={job.requiredSkills} />
                </Section>
              )}

              {job.preferredSkills && job.preferredSkills.length > 0 && (
                <Section title="Preferred Skills">
                  <ChipList items={job.preferredSkills} />
                </Section>
              )}

              {job.education && (
                <Section title="Education">
                  <p className="text-sm text-gray-600 flex items-start gap-2">
                    <GraduationCap size={16} className="mt-0.5 shrink-0 text-primary" />
                    {job.education}
                  </p>
                </Section>
              )}

              {((job.benefits && job.benefits.length > 0) || (job.perks && job.perks.length > 0)) && (
                <Section title="Benefits & Perks">
                  <div className="space-y-3">
                    {job.benefits && job.benefits.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.benefits.map((b, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1">
                            <Gift size={12} /> {b}
                          </span>
                        ))}
                      </div>
                    )}
                    {job.perks && job.perks.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.perks.map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1">
                            <Sparkles size={12} /> {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {job.workingHours && (
                <Section title="Working Hours">
                  <p className="text-sm text-gray-600">{job.workingHours}</p>
                </Section>
              )}

              {/* Legacy full description — always shown; it's the one
                  required field every job (old or new) always has. */}
              <Section title="Job Description">
                <div
                  className="text-sm text-gray-600 leading-relaxed prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </Section>

              {/* Likes/Dislikes */}
              <div className="pt-6 mt-6 border-t flex justify-between items-center">
                <div className="flex items-center space-x-6 text-gray-500">
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className="flex items-center space-x-1 hover:text-green-600"
                  >
                    <ThumbsUp size={18} /> <span>{job.likeCount}</span>
                  </button>
                  <button
                    onClick={handleDislike}
                    disabled={isDisliking}
                    className="flex items-center space-x-1 hover:text-red-600"
                  >
                    <ThumbsDown size={18} /> <span>{job.dislikeCount}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* About the Company — auto-attached from the employer's
                profile (Phase 1), never re-typed per job. */}
            {job.employer && (
              <div className="bg-white rounded-lg p-6 shadow">
                <h2 className="text-base font-semibold text-gray-800 mb-4">About the Company</h2>
                <div className="flex items-start gap-4 mb-4">
                  {job.employer.companyLogo ? (
                    <img
                      src={`${MEDIA_URL.replace(/\/$/, '')}/${job.employer.companyLogo.replace(/^\//, '')}`}
                      alt={`${job.employer.name} Logo`}
                      className="w-14 h-14 rounded-full object-cover bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-semibold shrink-0">
                      {job.employer.name?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">{job.employer.name}</p>
                    {job.employer.headline && <p className="text-sm text-gray-500">{job.employer.headline}</p>}
                  </div>
                </div>

                {job.employer.description && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{job.employer.description}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                  {job.employer.industryType && (
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Industry</p>
                      <p className="font-medium text-gray-700">{job.employer.industryType}</p>
                    </div>
                  )}
                  {job.employer.companySize && (
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Company Size</p>
                      <p className="font-medium text-gray-700">{job.employer.companySize}</p>
                    </div>
                  )}
                  {job.employer.establishedDate && (
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Founded</p>
                      <p className="font-medium text-gray-700">{new Date(job.employer.establishedDate).getFullYear()}</p>
                    </div>
                  )}
                  {job.employer.address && (
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Headquarters</p>
                      <p className="font-medium text-gray-700">{job.employer.address}</p>
                    </div>
                  )}
                </div>

                {(job.employer.website || job.employer.socialLinks?.linkedin) && (
                  <div className="flex flex-wrap gap-4 mb-4">
                    {job.employer.website && (
                      <a
                        href={job.employer.website.startsWith('http') ? job.employer.website : `https://${job.employer.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <Globe size={13} /> {job.employer.website}
                      </a>
                    )}
                    {job.employer.socialLinks?.linkedin && (
                      <a
                        href={job.employer.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <Linkedin size={13} /> LinkedIn
                      </a>
                    )}
                  </div>
                )}

                {job.employer.mission && (
                  <div className="mb-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <Target size={13} className="text-primary" /> Mission
                    </p>
                    <p className="text-sm leading-relaxed text-gray-600">{job.employer.mission}</p>
                  </div>
                )}

                {job.employer.culture && (
                  <div className="mb-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <Heart size={13} className="text-primary" /> Culture
                    </p>
                    <p className="text-sm leading-relaxed text-gray-600">{job.employer.culture}</p>
                  </div>
                )}

                {job.employer.companyLocations && job.employer.companyLocations.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <MapPin size={13} className="text-primary" /> Office Locations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.employer.companyLocations.map((loc) => (
                        <span key={loc} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{loc}</span>
                      ))}
                    </div>
                  </div>
                )}

                {job.employer.companyBenefits && job.employer.companyBenefits.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <Gift size={13} className="text-primary" /> Benefits
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.employer.companyBenefits.map((b) => (
                        <span key={b} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1">{b}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate(`/community/company/${job.employer!._id}`)}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  View Company →
                </button>
              </div>
            )}
          </div>

          {/* Similar Jobs Section */}
          <div className="space-y-6">
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm border-2">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 px-1">Similar Jobs</h2>

              <div className="space-y-4 py-4">
                {loadingSimilarJobs ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : latestJobs.length > 0 ? (
                  latestJobs.map((sJob) => (
                    <div
                      key={sJob._id}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden p-4"
                    >
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-start mb-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border bg-gray-200">
                              {sJob.employer?.companyLogo ? (
                                <img
                                  src={`${MEDIA_URL.replace(/\/$/, '')}/${sJob.employer.companyLogo.replace(/^\//, '')}`}
                                  alt={sJob.employer.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-bold">
                                  {sJob.employer?.name?.[0] || 'C'}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 flex-grow">
                              <h3 className="font-semibold text-lg">{sJob.title}</h3>
                              <p className="text-primary text-sm">{sJob.employer?.name}</p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-gray-500">
                              <MapPin size={16} className="mr-2 flex-shrink-0" />
                              <span className="text-sm">{sJob.location}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Clock size={16} className="mr-2 flex-shrink-0" />
                              <span className="text-sm">{new Date(sJob.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Briefcase size={16} className="mr-2 flex-shrink-0" />
                              <span className="text-sm">{sJob.jobtype}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => navigate(`/jobs/${sJob._id}`)}
                            className="bg-primary text-white py-2 px-6 rounded-md hover:bg-primary/90 transition-colors duration-200 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No similar jobs found.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;