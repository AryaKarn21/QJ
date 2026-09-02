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
} from 'lucide-react';
import { fetchJobs, fetchSavedJobs, toggleSaveJob, fetchJobCountsByCountry, type Job } from '../jobseekerApi/api';
import { AdBanner } from '../../common/AdBanner';


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

  const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

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

  if (isLoading) return <div className="p-8 text-center">Loading jobs...</div>;
  if (isError)
    return (
      <div className="p-8 text-center text-red-600">Failed to load jobs</div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Renders nothing if no admin has published a jobs-page ad. */}
      <AdBanner placement="jobs_page" />
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-2 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
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

          <div className="flex-1 pr-4 md:pr-0">
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
                return (
                <div
                  key={job._id}
                  className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
                    expired ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-start">
                      {job.employer?.companyLogo && (
                        <img
                          src={`${MEDIA_URL.replace(/\/$/, '')}/${job.employer.companyLogo.replace(
                            /^\//,
                            ''
                          )}`}
                          alt="Company Logo"
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          {expired && (
                            <span className="text-[11px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              Deadline Passed
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{job.employer?.name}</p>
                      </div>
                    </div>
                    <button onClick={() => handleToggleSave(job._id)} className="p-1">
                      {savedJobs.some((saved) => saved._id === job._id) ? (
                        <Bookmark fill="currentColor" className="text-primary" size={20} />
                      ) : (
                        <Bookmark className="text-gray-400" size={20} />
                      )}
                    </button>
                  </div>

                  <div className="text-sm text-gray-500 space-y-1">
                    <div className="flex items-center">
                      <MapPin className="mr-2" size={16} /> {job.location}
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-2" size={16} /> {job.jobtype}
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="mr-2" size={16} /> {job.salary}
                    </div>
                    {job.deadline && (
                      <div className={`flex items-center ${expired ? 'text-red-500' : ''}`}>
                        <CalendarClock className="mr-2" size={16} />
                        {expired
                          ? `Closed on ${formatDeadline(job.deadline)}`
                          : `Apply by ${formatDeadline(job.deadline)}`}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                    <span>{getTimeAgo(job.createdAt)}</span>
                    <button
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      View Details
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