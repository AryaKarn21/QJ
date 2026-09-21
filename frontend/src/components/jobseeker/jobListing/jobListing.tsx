import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchJobs, fetchSavedJobs, toggleSaveJob, type Job } from '../jobseekerApi/api';
import { AdBanner } from '../../common/AdBanner';
import {
  JobHeroSearch,
  JobResultHeader,
  FilterSidebar,
  MobileFilterDrawer,
  JobCard,
  JobSkeletonGrid,
  JobEmptyState,
  JobErrorState,
  JobPagination,
  type FilterState,
} from './jobListingComponents';

const AllJobListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Set document title for SEO
  useEffect(() => {
    document.title = 'Explore Jobs & Career Opportunities | QuickJobs';
  }, []);

  const initialQuery = searchParams.get('q') || '';
  const initialLocation = searchParams.get('location') || '';
  const initialCategory = searchParams.get('category') || '';

  // Search & input states
  const [pendingSearchQuery, setPendingSearchQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [pendingLocation, setPendingLocation] = useState(initialLocation);
  const [pendingSkills, setPendingSkills] = useState('');
  const [pendingCompany, setPendingCompany] = useState('');

  // Structured filters
  const [filters, setFilters] = useState<FilterState>({
    location: initialLocation,
    jobType: '',
    datePosted: '',
    level: '',
    workMode: '',
    minSalary: '',
    maxSalary: '',
    skills: '',
    company: '',
    industry: initialCategory,
    education: '',
    minExperience: '',
    maxExperience: '',
  });

  const [sortBy, setSortBy] = useState<
    'newest' | 'oldest' | 'salaryHigh' | 'salaryLow' | 'relevance' | 'deadlineSoon'
  >('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const limit = 9;

  // Query: Saved Jobs for bookmark toggle
  const { data: savedJobs = [], refetch: refetchSavedJobs } = useQuery({
    queryKey: ['savedJobs'],
    queryFn: async () => {
      const result = await fetchSavedJobs();
      return result;
    },
    staleTime: 0,
  });

  // Query: Jobs listing
  const { data, isLoading, isError, refetch } = useQuery({
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

  // Toggle save job
  const handleToggleSave = async (jobId: string) => {
    try {
      await toggleSaveJob(jobId);
      await refetchSavedJobs();
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  // Generic filter updater
  const handleFilterChange = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (key === 'location') {
      setPendingLocation(value as string);
    }
    if (key === 'skills') {
      setPendingSkills(value as string);
    }
    if (key === 'company') {
      setPendingCompany(value as string);
    }
    setPage(1);
  }, []);

  // Clear all filters & inputs
  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setPendingSearchQuery('');
    setPendingLocation('');
    setPendingSkills('');
    setPendingCompany('');
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
    setPage(1);
  }, []);

  // Search execution from Hero
  const handleHeroSearch = useCallback(() => {
    setSearchQuery(pendingSearchQuery.trim());
    setFilters((prev) => ({
      ...prev,
      location: pendingLocation.trim(),
    }));
    setPage(1);
  }, [pendingSearchQuery, pendingLocation]);

  // Handle click on popular search chips
  const handleSelectPopularChip = useCallback((chip: string) => {
    if (chip.toLowerCase() === 'remote') {
      setFilters((prev) => ({ ...prev, workMode: prev.workMode === 'Remote' ? '' : 'Remote' }));
      setPage(1);
    } else if (chip.toLowerCase() === 'internship') {
      setFilters((prev) => ({ ...prev, jobType: prev.jobType === 'Internship' ? '' : 'Internship' }));
      setPage(1);
    } else {
      setPendingSearchQuery(chip);
      setSearchQuery(chip);
      setPage(1);
    }
  }, []);

  // Dynamic location stats calculated STRICTLY from current loaded jobs dataset
  const locationStats = useMemo(() => {
    if (!data?.jobs || data.jobs.length === 0) return [];
    const map = new Map<string, number>();

    for (const job of data.jobs) {
      if (job.workMode?.toLowerCase() === 'remote') {
        map.set('Remote', (map.get('Remote') || 0) + 1);
      }
      if (job.country && job.country.trim()) {
        const c = job.country.trim();
        map.set(c, (map.get(c) || 0) + 1);
      } else if (job.location && job.location.trim()) {
        const parts = job.location.split(',').map((p) => p.trim()).filter(Boolean);
        const locKey = parts[parts.length - 1];
        if (locKey && locKey.toLowerCase() !== 'remote') {
          map.set(locKey, (map.get(locKey) || 0) + 1);
        }
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count }));
  }, [data?.jobs]);

  // Click on dynamic location badge in result header
  const handleLocationBadgeClick = useCallback((badge: string) => {
    if (!badge) {
      setFilters((prev) => ({ ...prev, location: '', workMode: '' }));
      setPendingLocation('');
      setPage(1);
      return;
    }

    if (badge.toLowerCase() === 'remote') {
      setFilters((prev) => ({
        ...prev,
        workMode: prev.workMode === 'Remote' ? '' : 'Remote',
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        location: prev.location.toLowerCase() === badge.toLowerCase() ? '' : badge,
      }));
      setPendingLocation((prev) => (prev.toLowerCase() === badge.toLowerCase() ? '' : badge));
    }
    setPage(1);
  }, []);

  // Active filter count for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filters.location) count++;
    if (filters.jobType) count++;
    if (filters.level) count++;
    if (filters.workMode) count++;
    if (filters.minSalary || filters.maxSalary) count++;
    if (filters.skills) count++;
    if (filters.company) count++;
    if (filters.datePosted) count++;
    if (filters.industry) count++;
    if (filters.education) count++;
    if (filters.minExperience || filters.maxExperience) count++;
    return count;
  }, [searchQuery, filters]);

  const jobsList: Job[] = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Common props for Desktop Sidebar & Mobile Drawer
  const filterProps = {
    filters,
    onFilterChange: handleFilterChange,
    onClearAll: handleClearAll,
    pendingLocation,
    setPendingLocation,
    onLocationSubmit: () => {
      setFilters((prev) => ({ ...prev, location: pendingLocation.trim() }));
      setPage(1);
    },
    pendingSkills,
    setPendingSkills,
    onSkillsSubmit: () => {
      setFilters((prev) => ({ ...prev, skills: pendingSkills.trim() }));
      setPage(1);
    },
    pendingCompany,
    setPendingCompany,
    onCompanySubmit: () => {
      setFilters((prev) => ({ ...prev, company: pendingCompany.trim() }));
      setPage(1);
    },
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased selection:bg-orange-100 selection:text-orange-900">
      {/* Optional Ad Placement */}
      <AdBanner placement="jobs_page" />

      {/* 1. Hero & Unified Search Section */}
      <JobHeroSearch
        keyword={pendingSearchQuery}
        onKeywordChange={setPendingSearchQuery}
        location={pendingLocation}
        onLocationChange={setPendingLocation}
        onSearch={handleHeroSearch}
        onSelectChip={handleSelectPopularChip}
      />

      {/* 2. Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation & Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl shadow-2xs hover:shadow-xs transition-all hover:text-primary active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span
              onClick={() => navigate('/')}
              className="hover:text-slate-600 cursor-pointer transition-colors"
            >
              Home
            </span>
            <span>/</span>
            <span className="text-slate-700 font-medium">Job Listings</span>
          </nav>
        </div>

        {/* 3. Result Header */}
        <JobResultHeader
          total={total}
          locationStats={locationStats}
          activeLocationFilter={filters.location || (filters.workMode === 'Remote' ? 'Remote' : '')}
          onSelectLocationBadge={handleLocationBadgeClick}
          sortBy={sortBy}
          onSortChange={(val) => {
            setSortBy(val);
            setPage(1);
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hasSearchQuery={Boolean(searchQuery)}
          onOpenMobileFilters={() => setShowMobileFilters(true)}
          activeFilterCount={activeFilterCount}
        />

        {/* 4. Two-Column Workspace (Sidebar + Grid/List) */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column: Sticky Desktop Filter Sidebar */}
          <FilterSidebar {...filterProps} />

          {/* Right Column: Listings Container */}
          <section className="flex-1 min-w-0 w-full" aria-label="Job listings content">
            {isLoading ? (
              <JobSkeletonGrid count={limit} viewMode={viewMode} />
            ) : isError ? (
              <JobErrorState onRetry={() => refetch()} />
            ) : jobsList.length === 0 ? (
              <JobEmptyState onClearFilters={handleClearAll} />
            ) : (
              <>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                      : 'space-y-4'
                  }
                >
                  {jobsList.map((job) => (
                    <JobCard
                      key={job._id}
                      job={job}
                      isSaved={savedJobs.some((saved) => saved._id === job._id)}
                      onToggleSave={handleToggleSave}
                      onViewDetails={(jobId) => navigate(`/jobs/${jobId}`)}
                      viewMode={viewMode}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <JobPagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => {
                    setPage(p);
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                />
              </>
            )}
          </section>
        </div>
      </main>

      {/* 5. Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        onApply={() => setShowMobileFilters(false)}
        {...filterProps}
      />
    </div>
  );
};

export default AllJobListing;