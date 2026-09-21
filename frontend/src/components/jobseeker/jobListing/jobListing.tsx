import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  CalendarClock,
  SlidersHorizontal,
  X,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { fetchJobs, fetchSavedJobs, toggleSaveJob, fetchJobCountsByCountry, type Job } from '../jobseekerApi/api';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { AdBanner } from '../../common/AdBanner';
import { SkeletonText, SkeletonAvatarLine } from '../../ui/Skeleton';


const getTimeAgo = (dateString: string): string => {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const isJobExpired = (deadline?: string): boolean => {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
};

const formatDeadline = (deadline: string): string =>
  new Date(deadline).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const AllJobListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  const initialQuery = searchParams.get('q') || '';

  const [pendingSearchQuery, setPendingSearchQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [pendingLocation, setPendingLocation] = useState('');
  const [pendingSkills, setPendingSkills] = useState('');
  const [pendingCompany, setPendingCompany] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    jobType: '',
    datePosted: '',
    level: '',
    workMode: '',
    minSalary: '',
    maxSalary: '',
    skills: '',
    company: '',
    industry: '',
    education: '',
    minExperience: '',
    maxExperience: '',
  });
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'salaryHigh' | 'salaryLow' | 'relevance'>('newest');
  const [page, setPage] = useState(1);
  // The filter panel used to be `hidden md:block` with no mobile
  // equivalent at all — every filter (not just the ones added in Phase 5)
  // was completely unreachable below the md breakpoint. This makes it a
  // togglable panel on mobile instead of just disappearing.
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [jobCounts, setJobCounts] = useState<Array<{country: string, jobCount: number}>>([]);
  const limit = 9;


  const {
    data: savedJobs = [],
    refetch: refetchSavedJobs,
  } = useQuery({
    queryKey: ['savedJobs'],
    queryFn: async () => {
      const result = await fetchSavedJobs();
      return result;
    },
    staleTime: 0,
  });

  // Fetch job counts by country
  useEffect(() => {
    const fetchCountryCounts = async () => {
      try {
        const counts = await fetchJobCountsByCountry();
        setJobCounts(counts);
      } catch (error) {
        console.error('Error fetching job counts by country:', error);
      }
    };
    fetchCountryCounts();
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', page, searchQuery, filters, sortBy],
    queryFn: () =>
      fetchJobs({
        page,
        limit,
        search: searchQuery,
        location: filters.location,
        jobType: filters.jobType,
        level: filters.level,
        workMode: filters.workMode,
        minSalary: filters.minSalary || undefined,
        maxSalary: filters.maxSalary || undefined,
        skills: filters.skills,
        datePosted: filters.datePosted as '24h' | '7d' | '30d' | '',
        sortBy,
        company: filters.company,
        industry: filters.industry,
        education: filters.education,
        minExperience: filters.minExperience || undefined,
        maxExperience: filters.maxExperience || undefined,
      }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const handleToggleSave = async (jobId: string) => {
    try {
      await toggleSaveJob(jobId);
      await refetchSavedJobs();
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  // Apply both search query and location/skills/company filters at once
  const applyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      location: pendingLocation.trim(),
      skills: pendingSkills.trim(),
      company: pendingCompany.trim(),
    }));
    setSearchQuery(pendingSearchQuery.trim());
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || filters.location || filters.skills || filters.workMode || filters.minSalary ||
    filters.maxSalary || filters.datePosted || filters.company || filters.industry || filters.education ||
    filters.minExperience || filters.maxExperience
  );

  // Clear or apply filters depending on current state
  const handleSearchOrClear = () => {
    if (hasActiveFilters) {
      // Clear all filters
      setSearchQuery('');
      setPendingSearchQuery('');
      setFilters({
        location: '',
        jobType: '',
        datePosted: '',
        level: '',
        workMode: '',
        minSalary: '',
        maxSalary: '',
        skills: '',
        company: '',
        industry: '',
        education: '',
        minExperience: '',
        maxExperience: '',
      });
      setPendingLocation('');
      setPendingSkills('');
      setPendingCompany('');
      setPage(1);
    } else if (pendingSearchQuery.trim() || pendingLocation.trim() || pendingSkills.trim() || pendingCompany.trim()) {
      applyFilters();
    }
  };

  // Trigger filter application on Enter key in inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  // Sorting now happens server-side (jobController.js's SORT_OPTIONS) on
  // the structured salaryMin/salaryMax fields, across the whole result
  // set before pagination — sorting only the current page client-side, on
  // `parseInt(job.salary)` (a free-text string parseInt can't meaningfully
  // read), used to silently do nothing for "Salary" and only reorder one
  // page at a time for "Newest"/"Oldest".
  const sortedJobs: Job[] = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8" aria-busy="true" aria-label="Loading jobs">
        <div className="bg-white rounded-lg shadow-sm p-2 mb-6">
          <SkeletonText width="w-full" height="h-12" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 space-y-3">
              <SkeletonAvatarLine avatarSize="h-12 w-12" />
              <SkeletonText width="w-1/3" height="h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (isError)
    return (
      <div className="p-8 text-center text-red-600">Failed to load jobs</div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Renders nothing if no admin has published a jobs-page ad. */}
      <AdBanner placement="jobs_page" />
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-xs transition-all hover:text-primary"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-6">
          {/* flex-wrap + a min-w floor on the input below — at very narrow
              widths (≈320px) the input, Search/Clear button and Filters
              button couldn't all fit on one nowrap row without overflowing
              the page horizontally. This lets the buttons drop to a second
              line there while staying a single row from sm+ up, matching
              the existing layout exactly at every width that already worked. */}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:gap-4">
            <div className="relative flex-1 min-w-[140px]">
              <input
                type="text"
                placeholder="Search by title or category"
                value={pendingSearchQuery}
                onChange={(e) => setPendingSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
            </div>
            <button
              onClick={handleSearchOrClear}
              className={`px-4 py-2 text-sm rounded-md focus:outline-none focus:ring-2 ${hasActiveFilters
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-primary text-white hover:bg-primary/90'
                }`}
            >
              {hasActiveFilters ? 'Clear' : 'Search'}
            </button>
            {/* The filter panel below is `hidden md:block` with no other
                way to reach it below md — this is the mobile entry point,
                shown only under md where that panel would otherwise be
                completely inaccessible. */}
            <button
              onClick={() => setShowMobileFilters((s) => !s)}
              className="md:hidden flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 relative"
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />}
            </button>
          </div>
        </div>

        {/* flex-col below md: with the filter panel now conditionally
            visible on mobile (not just hidden), this needs to actually
            stack the two columns instead of squeezing them into the same
            row until md — a real desktop-to-mobile layout switch, not a
            shrunk desktop layout. */}
        <div className="flex flex-col md:flex-row md:gap-8">
          {/* Filters — always visible at md+; below md it's a toggled
              panel (see the "Filters" button above) instead of simply
              disappearing with no way back in. */}
          <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block w-full md:w-64 rounded-xl bg-gray-100 p-6 space-y-6 mb-6 md:mb-0`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Filter</h2>
              <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFilters({
                    location: '',
                    jobType: '',
                    datePosted: '',
                    level: '',
                    workMode: '',
                    minSalary: '',
                    maxSalary: '',
                    skills: '',
                    company: '',
                    industry: '',
                    education: '',
                    minExperience: '',
                    maxExperience: '',
                  });
                  setPendingLocation('');
                  setPendingSkills('');
                  setPendingCompany('');
                  setSearchQuery('');
                  setPendingSearchQuery('');
                  setPage(1);
                }}
                className="text-md text-primary"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                aria-label="Close filters"
                className="md:hidden text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="City or postcode"
                  className="w-full p-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={pendingLocation}
                  onChange={(e) => setPendingLocation(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                  onClick={applyFilters}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Skills</label>
              <input
                type="text"
                placeholder="e.g. React, SQL"
                className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                value={pendingSkills}
                onChange={(e) => setPendingSkills(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input
                type="text"
                placeholder="e.g. Acme Inc."
                className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                value={pendingCompany}
                onChange={(e) => setPendingCompany(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Industry</label>
              <input
                type="text"
                placeholder="e.g. Information Technology"
                className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.industry}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, industry: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Education</label>
              <input
                type="text"
                placeholder="e.g. Bachelor's degree"
                className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.education}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, education: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Job Type</label>
              <select
                value={filters.jobType}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, jobType: e.target.value }));
                  setPage(1);
                }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
              >
                <option value="">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Hourly">Hourly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Work Mode</label>
              <select
                value={filters.workMode}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, workMode: e.target.value }));
                  setPage(1);
                }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
              >
                <option value="">All Modes</option>
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date Posted</label>
              <select
                value={filters.datePosted}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, datePosted: e.target.value }));
                  setPage(1);
                }}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
              >
                <option value="">Any time</option>
                <option value="24h">Past 24 hours</option>
                <option value="7d">Past week</option>
                <option value="30d">Past month</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Salary Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.minSalary}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, minSalary: e.target.value }));
                    setPage(1);
                  }}
                />
                <span className="text-gray-400 text-sm">–</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.maxSalary}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, maxSalary: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Only matches jobs with a structured salary range set.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Experience (years)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.minExperience}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, minExperience: e.target.value }));
                    setPage(1);
                  }}
                />
                <span className="text-gray-400 text-sm">–</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.maxExperience}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, maxExperience: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Level</label>
              <div className="space-y-2">
                {['Internship', 'Fresher', 'Mid Level', 'Senior'].map((level) => (
                  <label key={level} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="level"
                      value={level}
                      checked={filters.level === level}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, level: e.target.value }));
                        setPage(1);
                      }}
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Job Cards */}

          {/* min-w-0 — without it, this flex item (sidebar's sibling in the
              md:flex-row row above) falls back to its content's min-content
              width; a long unbroken job title/company name inside the grid
              below could then force this column (and the whole row) wider
              than the viewport instead of wrapping, causing horizontal
              page overflow at desktop/tablet widths. */}
          <div className="flex-1 min-w-0 pr-4 md:pr-0">
            {/* flex-col below sm — a fixed-width sort <select> squeezed
                against a `w-full` results-count block on a single
                non-wrapping row could overflow/clip at narrow widths,
                same class of bug as BlogList.tsx's header. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
              <div className="w-full sm:min-w-0 sm:flex-1">
                <p className="text-gray-600 text-lg">Showing {sortedJobs.length} jobs</p>
                {jobCounts.length > 0 && (
                  <div className="flex flex-wrap gap-2 sm:gap-4 md:gap-6 mt-1 overflow-x-auto pb-2 -mx-2 px-2">
                    {jobCounts.map(({ country, jobCount }, index) => (
                      <div key={country} className="whitespace-nowrap">
                        <span className="text-md sm:text-md font-bold text-gray-500">
                          {country} <span className="font-medium text-primary">{jobCount}</span>
                        </span>
                        {index < jobCounts.length - 1 && (
                          <span className="text-gray-400 hidden sm:inline"></span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full sm:w-auto shrink-0 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
              >
                {searchQuery && <option value="relevance">Relevance</option>}
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="salaryHigh">Salary: High to Low</option>
                <option value="salaryLow">Salary: Low to High</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedJobs.map((job) => {
                const expired = isJobExpired(job.deadline);
                // companyOverride lets an employer show different company
                // identity on this specific posting, and is also the only
                // display name left once `employer` is null (account since
                // deleted) — same fallback jobdetail.tsx already uses. The
                // final fallback is deliberately an honest "not available"
                // rather than a generic "Company" — that reads as if it
                // were the actual name, not a missing-data placeholder.
                const displayName = job.companyOverride?.name?.trim() || job.employer?.name?.trim() || 'Company not available';
                const displayLogo = job.companyOverride?.logo || job.employer?.companyLogo;
                const companyInitial = displayName.charAt(0).toUpperCase() || 'C';

                return (
                <div
                  key={job._id}
                  className={`group relative bg-white rounded-2xl border border-gray-100 hover:border-orange-200 p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between ${
                    expired ? 'opacity-75' : ''
                  }`}
                >
                  <div>
                    {/* Top Row: Company Avatar, Title, Bookmark */}
                    <div className="flex justify-between items-start gap-3 mb-3.5">
                      <div className="flex gap-3.5 items-center min-w-0">
                        {displayLogo ? (
                          <img
                            src={resolveMediaUrl(displayLogo)}
                            alt={displayName}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-2xs shrink-0"
                            onError={(e) => {
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                (e.target as HTMLElement).style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0';
                                fallback.innerText = companyInitial;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                            {companyInitial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-primary transition-colors line-clamp-1 break-words">
                              {job.title}
                            </h3>
                            {expired && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                Closed
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs sm:text-sm font-medium truncate mt-0.5">{displayName}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSave(job._id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-primary hover:bg-orange-50 transition-all active:scale-90 shrink-0"
                        title={savedJobs.some((saved) => saved._id === job._id) ? "Saved" : "Save job"}
                      >
                        {savedJobs.some((saved) => saved._id === job._id) ? (
                          <Bookmark fill="currentColor" className="text-primary" size={20} />
                        ) : (
                          <Bookmark size={20} />
                        )}
                      </button>
                    </div>

                    {/* Badges / Meta Pills */}
                    <div className="flex flex-wrap gap-2 my-3">
                      {job.jobtype && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                          <Clock size={12} />
                          <span>{job.jobtype}</span>
                        </span>
                      )}
                      {job.location && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100/80 text-gray-700 border border-gray-200/50">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="truncate max-w-[140px]">{job.location}</span>
                        </span>
                      )}
                      {job.salary && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <DollarSign size={12} />
                          <span>{job.salary}</span>
                        </span>
                      )}
                    </div>

                    {/* Deadline info if available */}
                    {job.deadline && (
                      <div className={`flex items-center gap-1.5 text-xs mt-2 ${expired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        <CalendarClock size={13} className="shrink-0" />
                        <span className="truncate">
                          {expired
                            ? `Closed on ${formatDeadline(job.deadline)}`
                            : `Apply by ${formatDeadline(job.deadline)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Posted time & View Details button */}
                  <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{getTimeAgo(job.createdAt)}</span>
                    <button
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-98"
                    >
                      <span>View Details</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Next
              </button>
            </div>

            {sortedJobs.length === 0 && (
              <div className="text-center text-gray-500 mt-12">No jobs match your filters.</div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default AllJobListing;