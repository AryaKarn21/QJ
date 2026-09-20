import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { toast } from 'react-toastify';
import {
  Bookmark,
  BookmarkCheck,
  Search,
  MapPin,
  Clock,
  Trash2,
  Briefcase,
  Building2,
  ExternalLink,
  ArrowRight,
  LayoutGrid,
  List,
  AlertTriangle,
  Calendar,
  Sparkles,
  DollarSign,
  X,
  Filter,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { fetchSavedJobs, toggleSaveJob } from '../jobseekerApi/api';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { SkeletonRow } from '../../ui/Skeleton';

interface Employer {
  name: string;
  email?: string;
  companyLogo?: string;
}

interface Job {
  _id: string;
  title: string;
  employer?: Employer;
  companyOverride?: { name?: string; logo?: string };
  location: string;
  country?: string;
  jobtype: string;
  workMode?: string;
  level?: string;
  salary?: string;
  experience?: string;
  status?: string;
  createdAt: string;
  deadline?: string;
}

type ViewMode = 'grid' | 'table';
type FilterType = 'all' | 'full-time' | 'remote' | 'expiring';
type SortOrder = 'newest' | 'oldest' | 'deadline' | 'title';

const UserSavedJobs: React.FC = () => {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadJobs = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const jobs = await fetchSavedJobs();
      setSavedJobs(Array.isArray(jobs) ? jobs : []);
    } catch (err) {
      console.error('Error loading saved jobs:', err);
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useAutoRefresh(() => loadJobs({ silent: true }), 30000);

  const handleUnsave = async (id: string, jobTitle?: string) => {
    setRemovingId(id);
    try {
      await toggleSaveJob(id);
      setSavedJobs((prev) => prev.filter((job) => job._id !== id));
      toast.success(`Removed "${jobTitle || 'Job'}" from saved list`);
    } catch (err) {
      console.error('Error unsaving job:', err);
      toast.error('Failed to remove job from saved list');
    } finally {
      setRemovingId(null);
    }
  };

  const displayNameFor = (job: Job) =>
    job.companyOverride?.name?.trim() || job.employer?.name?.trim() || 'Company';

  const displayLogoFor = (job: Job) =>
    job.companyOverride?.logo || job.employer?.companyLogo;

  // Compute summary stats
  const stats = useMemo(() => {
    const total = savedJobs.length;
    let active = 0;
    let expiring = 0;
    let remote = 0;

    savedJobs.forEach((job) => {
      const isExpired = job.deadline ? isPast(new Date(job.deadline)) : false;
      if (!isExpired && (job.status?.toLowerCase() === 'active' || !job.status)) {
        active++;
      }
      if (job.deadline && !isExpired) {
        const daysLeft = differenceInDays(new Date(job.deadline), new Date());
        if (daysLeft >= 0 && daysLeft <= 7) {
          expiring++;
        }
      }
      const locStr = `${job.location || ''} ${job.workMode || ''}`.toLowerCase();
      if (locStr.includes('remote') || locStr.includes('hybrid')) {
        remote++;
      }
    });

    return { total, active, expiring, remote };
  }, [savedJobs]);

  // Filter & Sort
  const filteredJobs = useMemo(() => {
    return savedJobs
      .filter((job) => {
        // Search filter
        const query = searchTerm.toLowerCase().trim();
        if (query) {
          const titleMatch = job.title?.toLowerCase().includes(query);
          const companyMatch = displayNameFor(job).toLowerCase().includes(query);
          const locationMatch = job.location?.toLowerCase().includes(query);
          const typeMatch = job.jobtype?.toLowerCase().includes(query);
          if (!titleMatch && !companyMatch && !locationMatch && !typeMatch) return false;
        }

        // Tab filter
        if (filterType === 'full-time') {
          return job.jobtype?.toLowerCase().includes('full');
        }
        if (filterType === 'remote') {
          const loc = `${job.location || ''} ${job.workMode || ''}`.toLowerCase();
          return loc.includes('remote') || loc.includes('hybrid');
        }
        if (filterType === 'expiring') {
          if (!job.deadline) return false;
          const isExpired = isPast(new Date(job.deadline));
          const daysLeft = differenceInDays(new Date(job.deadline), new Date());
          return !isExpired && daysLeft >= 0 && daysLeft <= 7;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortOrder === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortOrder === 'deadline') {
          const dA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const dB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return dA - dB;
        }
        if (sortOrder === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [savedJobs, searchTerm, filterType, sortOrder]);

  return (
    <div className="min-h-full space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 sm:p-8 text-white shadow-lg shadow-orange-500/15">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-3 text-orange-100">
            <Bookmark size={13} className="text-white" />
            <span>Job Seeker Portal &bull; Bookmarks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Saved Jobs
          </h1>
          <p className="mt-2 text-sm text-orange-100/90 leading-relaxed">
            Keep track of roles you're interested in, monitor upcoming application deadlines, and apply as soon as you're ready.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-24 bottom-0 -mb-12 h-36 w-36 rounded-full bg-orange-700/20 blur-xl pointer-events-none" />
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm transition-all hover:border-orange-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Saved</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <Bookmark size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</p>
          <span className="text-[11px] text-gray-400">Bookmarked opportunities</span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-all hover:border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Active Openings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.active}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Ready for applications</span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm transition-all hover:border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Expiring Soon</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.expiring}</p>
          <span className="text-[11px] text-amber-600 font-medium">Closing in &le; 7 days</span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Remote / Hybrid</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Briefcase size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.remote}</p>
          <span className="text-[11px] text-blue-600 font-medium">Flexible work options</span>
        </div>
      </div>

      {/* Filter, Search & View Mode Controls */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, company, skills, or location…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2.5 pl-10 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Right controls: filter tabs, sort & view toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-white text-orange-600 font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({savedJobs.length})
              </button>
              <button
                onClick={() => setFilterType('full-time')}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                  filterType === 'full-time'
                    ? 'bg-white text-orange-600 font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Full Time
              </button>
              <button
                onClick={() => setFilterType('remote')}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                  filterType === 'remote'
                    ? 'bg-white text-orange-600 font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Remote
              </button>
              <button
                onClick={() => setFilterType('expiring')}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                  filterType === 'expiring'
                    ? 'bg-white text-orange-600 font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Closing Soon
              </button>
            </div>

            {/* Sort selector */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="deadline">Deadline (Closest)</option>
              <option value="title">Title (A-Z)</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Table View"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-2/3 rounded bg-gray-100" />
              </div>
              <div className="mt-5 flex justify-between border-t border-gray-50 pt-3">
                <div className="h-8 w-24 rounded-lg bg-gray-200" />
                <div className="h-8 w-24 rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        /* Empty States */
        savedJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 shadow-inner">
              <Bookmark size={32} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">No saved jobs yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              Browse thousands of active listings on QuickJobs. Bookmark positions you're interested in to easily compare and apply later.
            </p>
            <div className="mt-6">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all active:scale-95"
              >
                <Search size={16} /> Explore Open Jobs
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <Search size={24} />
            </div>
            <h3 className="mt-3 text-base font-bold text-gray-900">No matching saved jobs</h3>
            <p className="mt-1 text-sm text-gray-500">
              We couldn't find any saved jobs matching "{searchTerm}" with the active filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
              }}
              className="mt-4 rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear Search &amp; Filters
            </button>
          </div>
        )
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const logo = displayLogoFor(job);
            const companyName = displayNameFor(job);
            const isExpired = job.deadline ? isPast(new Date(job.deadline)) : false;
            const daysLeft = job.deadline && !isExpired ? differenceInDays(new Date(job.deadline), new Date()) : null;

            return (
              <div
                key={job._id}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/5"
              >
                {/* Header: Company Logo, Title, Bookmark Remove */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <img
                          src={resolveMediaUrl(logo)}
                          alt={companyName}
                          className="h-12 w-12 rounded-xl object-cover border border-gray-100 shadow-xs"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 text-base font-bold text-orange-700 border border-orange-200/60 shadow-xs">
                          {companyName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                          <Building2 size={12} className="text-gray-400" />
                          <span className="truncate max-w-[140px]">{companyName}</span>
                        </span>
                        <h2 className="mt-0.5 truncate text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                          <Link to={`/jobs/${job._id}`} title={job.title}>
                            {job.title}
                          </Link>
                        </h2>
                      </div>
                    </div>

                    {/* Unsave button */}
                    <button
                      onClick={() => handleUnsave(job._id, job.title)}
                      disabled={removingId === job._id}
                      className="rounded-xl p-2 text-orange-500 bg-orange-50/80 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                      title="Remove from saved jobs"
                      aria-label="Remove from saved jobs"
                    >
                      <BookmarkCheck size={18} />
                    </button>
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                    {job.location && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-gray-600">
                        <MapPin size={12} className="text-gray-400" />
                        <span className="truncate max-w-[120px]">{job.location}</span>
                      </span>
                    )}

                    {job.jobtype && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 font-medium text-orange-700">
                        <Briefcase size={12} />
                        {job.jobtype}
                      </span>
                    )}

                    {job.workMode && (
                      <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                        {job.workMode}
                      </span>
                    )}

                    {job.salary && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        <DollarSign size={12} />
                        {job.salary}
                      </span>
                    )}
                  </div>

                  {/* Deadline Notice */}
                  <div className="mt-4">
                    {isExpired ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                        <AlertTriangle size={12} /> Deadline Expired
                      </div>
                    ) : daysLeft !== null && daysLeft <= 7 ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60 animate-pulse">
                        <Clock size={12} /> Closing in {daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft > 1 ? 's' : ''}`}
                      </div>
                    ) : job.deadline ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} className="text-gray-400" />
                        <span>Deadline: {format(new Date(job.deadline), 'MMM dd, yyyy')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Clock size={12} />
                        <span>Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-center text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    className="flex-1 rounded-xl bg-orange-500 py-2 text-center text-xs font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"
                  >
                    Apply Now <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View (Modern dense table) */
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-600">
                  <th className="px-5 py-3.5">Job Title &amp; Company</th>
                  <th className="px-5 py-3.5">Location &amp; Type</th>
                  <th className="px-5 py-3.5">Salary</th>
                  <th className="px-5 py-3.5">Deadline</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredJobs.map((job) => {
                  const logo = displayLogoFor(job);
                  const companyName = displayNameFor(job);
                  const isExpired = job.deadline ? isPast(new Date(job.deadline)) : false;
                  const daysLeft = job.deadline && !isExpired ? differenceInDays(new Date(job.deadline), new Date()) : null;

                  return (
                    <tr key={job._id} className="hover:bg-orange-50/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {logo ? (
                            <img
                              src={resolveMediaUrl(logo)}
                              alt={companyName}
                              className="h-10 w-10 shrink-0 rounded-xl object-cover border border-gray-100"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700">
                              {companyName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              to={`/jobs/${job._id}`}
                              className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors block truncate max-w-xs"
                            >
                              {job.title}
                            </Link>
                            <span className="text-xs text-gray-500 truncate block max-w-xs">
                              {companyName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-gray-700">
                            <MapPin size={12} className="text-gray-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{job.location || 'Not specified'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                            <span className="font-medium text-orange-600">{job.jobtype}</span>
                            {job.workMode && <span>&bull; {job.workMode}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-gray-900 text-xs">
                        {job.salary ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {job.salary}
                          </span>
                        ) : (
                          <span className="text-gray-400">Negotiable</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        {isExpired ? (
                          <span className="rounded-md bg-red-50 px-2 py-0.5 font-semibold text-red-600">
                            Expired
                          </span>
                        ) : daysLeft !== null && daysLeft <= 7 ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                            {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                          </span>
                        ) : job.deadline ? (
                          <span className="text-gray-600">
                            {format(new Date(job.deadline), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/jobs/${job._id}`)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => navigate(`/jobs/${job._id}`)}
                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-600 transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => handleUnsave(job._id, job.title)}
                            disabled={removingId === job._id}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Remove from saved"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSavedJobs;
