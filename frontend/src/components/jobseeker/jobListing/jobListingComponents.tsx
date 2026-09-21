import React from 'react';
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  CalendarClock,
  SlidersHorizontal,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Building2,
  Sparkles,
  LayoutGrid,
  List,
  AlertCircle,
  RotateCcw,
  Tag,
  Check,
} from 'lucide-react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import type { Job } from '../jobseekerApi/api';

/* ══════════════════════════════════════════════════════════════════
   DATA NORMALIZATION & INITIALS HELPERS
   ══════════════════════════════════════════════════════════════════ */

export const normalizeSalaryText = (salary?: string): string => {
  if (!salary || salary.trim() === '') return 'Negotiable';
  const trimmed = salary.trim();
  // Fix typos like "$ negiiotable" -> "Negotiable"
  if (/^(\$|NPR|Rs\.?|₹)?\s*neg[i|e]*otable$/i.test(trimmed) || /^negotiable$/i.test(trimmed)) {
    return 'Negotiable';
  }
  return trimmed.replace(/neg[i|e]{1,2}otable/gi, 'Negotiable');
};

export const normalizeCompanyName = (name?: string): string => {
  if (!name || name.trim() === '') return 'Company';
  const trimmed = name.trim();
  // Fix uppercase typos e.g. "ABC PRVITED LTD" -> "ABC Private Ltd"
  return trimmed.replace(/PRVITED\s+LTD/gi, 'Private Ltd');
};

export const getCompanyInitials = (name?: string): string => {
  if (!name) return 'QJ';
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'QJ';
  if (words[0].length >= 2 && words[0].length <= 4 && words[0] === words[0].toUpperCase()) {
    return words[0];
  }
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
};

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-indigo-600 to-violet-700',
  'from-teal-600 to-emerald-700',
  'from-sky-600 to-cyan-700',
  'from-violet-600 to-purple-800',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-pink-700',
  'from-slate-700 to-slate-900',
];

export const getCompanyBgGradient = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

export const getTimeAgo = (dateString?: string): string => {
  if (!dateString) return 'Recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

export const isJobExpired = (deadline?: string): boolean => {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
};

export const formatDeadline = (deadline?: string): string => {
  if (!deadline) return '';
  return new Date(deadline).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/* ══════════════════════════════════════════════════════════════════
   1. HERO & UNIFIED SEARCH SECTION
   ══════════════════════════════════════════════════════════════════ */

interface JobHeroSearchProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  location: string;
  onLocationChange: (val: string) => void;
  onSearch: () => void;
  onSelectChip: (chip: string) => void;
}

export const POPULAR_CHIPS = [
  'React',
  'Node.js',
  'UI/UX Designer',
  'Remote',
  'Frontend',
  'Backend',
  'Internship',
  'Data Scientist',
];

export const JobHeroSearch: React.FC<JobHeroSearchProps> = ({
  keyword,
  onKeywordChange,
  location,
  onLocationChange,
  onSearch,
  onSelectChip,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/40 via-white to-slate-50/50 border-b border-slate-200/70 pt-8 pb-10 sm:pt-12 sm:pb-12 px-4 sm:px-6 lg:px-8">
      {/* Background soft glow accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-r from-orange-200/20 via-amber-200/20 to-blue-200/20 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/60 text-primary border border-orange-200/60 text-xs font-semibold uppercase tracking-wider mb-4 shadow-2xs">
          <Sparkles size={14} className="animate-pulse" />
          <span>Verified Opportunities</span>
        </div>

        {/* Heading & Subheading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Find Your Next <span className="text-primary">Opportunity</span>
        </h1>
        <p className="mt-3 text-slate-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-normal">
          Discover thousands of jobs from top companies around the world
        </p>

        {/* Unified Search Bar */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 max-w-4xl mx-auto bg-white rounded-2xl p-2 sm:p-2.5 shadow-lg shadow-slate-200/60 border border-slate-200/80 flex flex-col md:flex-row gap-2 transition-all duration-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
        >
          {/* Keyword Input (~45% on desktop) */}
          <div className="relative flex-1 md:w-[45%] flex items-center">
            <Search size={20} className="absolute left-3.5 text-slate-400 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="Job title, skills or keywords..."
              className="w-full pl-11 pr-3 py-3 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none rounded-xl hover:bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>

          <div className="hidden md:block w-px bg-slate-200 my-1 self-stretch" />

          {/* Location Input (~35% on desktop) */}
          <div className="relative flex-1 md:w-[35%] flex items-center">
            <MapPin size={20} className="absolute left-3.5 text-slate-400 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="City, state or remote..."
              className="w-full pl-11 pr-3 py-3 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none rounded-xl hover:bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>

          {/* Search Button (~20% on desktop) */}
          <button
            type="submit"
            className="w-full md:w-auto md:min-w-[150px] px-7 py-3.5 bg-primary hover:bg-[#e66800] text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            <Search size={16} strokeWidth={2.5} />
            <span>Search Jobs</span>
          </button>
        </form>

        {/* Popular Searches Chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Popular Searches:</span>
          {POPULAR_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onSelectChip(chip)}
              className="px-3 py-1 rounded-full bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-primary font-medium transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ══════════════════════════════════════════════════════════════════
   2. RESULT HEADER (Counts, Sort, Grid/List Toggle)
   ══════════════════════════════════════════════════════════════════ */

interface DynamicLocationStat {
  label: string;
  count: number;
}

interface JobResultHeaderProps {
  total: number;
  locationStats: DynamicLocationStat[];
  activeLocationFilter?: string;
  onSelectLocationBadge?: (loc: string) => void;
  sortBy: string;
  onSortChange: (val: any) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  hasSearchQuery?: boolean;
  onOpenMobileFilters: () => void;
  activeFilterCount: number;
}

export const JobResultHeader: React.FC<JobResultHeaderProps> = ({
  total,
  locationStats,
  activeLocationFilter,
  onSelectLocationBadge,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  hasSearchQuery,
  onOpenMobileFilters,
  activeFilterCount,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Total & Dynamic dataset counters */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Showing <span className="text-primary">{total}</span> {total === 1 ? 'job' : 'jobs'}
            </h2>
            {/* Mobile filter trigger */}
            <button
              type="button"
              onClick={onOpenMobileFilters}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors relative"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Dynamic location/remote counters strictly from loaded data */}
          {locationStats.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider mr-1">
                Locations:
              </span>
              {locationStats.map(({ label, count }) => {
                const isActive = activeLocationFilter?.toLowerCase() === label.toLowerCase();
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSelectLocationBadge?.(isActive ? '' : label)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white font-semibold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-primary border border-slate-200/60'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-primary border border-slate-200'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Sort & Grid/List view toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {/* View Mode Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-slate-500">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-label="List View"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-primary shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-by-select" className="text-xs font-medium text-slate-500 hidden sm:inline">
              Sort by:
            </label>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200/90 text-slate-800 rounded-xl px-3.5 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              {hasSearchQuery && <option value="relevance">Relevance</option>}
              <option value="deadlineSoon">Deadline Soon</option>
              <option value="salaryHigh">Salary: High to Low</option>
              <option value="salaryLow">Salary: Low to High</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   3. FILTER SIDEBAR (Desktop Sticky & Reusable)
   ══════════════════════════════════════════════════════════════════ */

export interface FilterState {
  location: string;
  jobType: string;
  datePosted: string;
  level: string;
  workMode: string;
  minSalary: string;
  maxSalary: string;
  skills: string;
  company: string;
  industry: string;
  education: string;
  minExperience: string;
  maxExperience: string;
}

interface FilterContentProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearAll: () => void;
  pendingLocation: string;
  setPendingLocation: (v: string) => void;
  onLocationSubmit: () => void;
  pendingSkills: string;
  setPendingSkills: (v: string) => void;
  onSkillsSubmit: () => void;
  pendingCompany: string;
  setPendingCompany: (v: string) => void;
  onCompanySubmit: () => void;
}

export const FilterContent: React.FC<FilterContentProps> = ({
  filters,
  onFilterChange,
  onClearAll,
  pendingLocation,
  setPendingLocation,
  onLocationSubmit,
  pendingSkills,
  setPendingSkills,
  onSkillsSubmit,
  pendingCompany,
  setPendingCompany,
  onCompanySubmit,
}) => {
  const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
  const LEVELS = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Manager', 'Executive'];
  const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];
  const DATE_POSTED_OPTIONS = [
    { value: '', label: 'Any time' },
    { value: '24h', label: 'Past 24 hours' },
    { value: '7d', label: 'Past 7 days' },
    { value: '30d', label: 'Past 30 days' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-primary" />
          <h3 className="font-bold text-slate-900 text-base">Filters</h3>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-primary hover:text-[#e66800] hover:underline"
        >
          Clear All
        </button>
      </div>

      {/* LOCATION */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Location
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search locations..."
            value={pendingLocation}
            onChange={(e) => setPendingLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLocationSubmit()}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all"
          />
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {pendingLocation && (
            <button
              type="button"
              onClick={() => {
                setPendingLocation('');
                onFilterChange('location', '');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {filters.location && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <span className="truncate max-w-[130px]">{filters.location}</span>
              <button
                type="button"
                onClick={() => {
                  setPendingLocation('');
                  onFilterChange('location', '');
                }}
                className="hover:text-blue-900"
              >
                <X size={13} />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* JOB TYPE */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Job Type
        </label>
        <div className="space-y-1.5">
          {JOB_TYPES.map((type) => {
            const checked = filters.jobType === type;
            return (
              <label
                key={type}
                className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer select-none hover:text-primary transition-colors py-0.5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onFilterChange('jobType', checked ? '' : type)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <span>{type}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* EXPERIENCE LEVEL */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Experience Level
        </label>
        <div className="space-y-1.5">
          {LEVELS.map((lvl) => {
            const checked = filters.level === lvl;
            return (
              <label
                key={lvl}
                className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer select-none hover:text-primary transition-colors py-0.5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onFilterChange('level', checked ? '' : lvl)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <span>{lvl}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* WORK MODE */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Work Mode
        </label>
        <div className="space-y-1.5">
          {WORK_MODES.map((mode) => {
            const checked = filters.workMode === mode;
            return (
              <label
                key={mode}
                className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer select-none hover:text-primary transition-colors py-0.5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onFilterChange('workMode', checked ? '' : mode)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <span>{mode}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* SKILLS */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Skills
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search skills e.g. React..."
            value={pendingSkills}
            onChange={(e) => setPendingSkills(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSkillsSubmit()}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all"
          />
          <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {pendingSkills && (
            <button
              type="button"
              onClick={() => {
                setPendingSkills('');
                onFilterChange('skills', '');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {filters.skills && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filters.skills.split(',').map((s) => s.trim()).filter(Boolean).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => {
                    const remaining = filters.skills
                      .split(',')
                      .map((x) => x.trim())
                      .filter((x) => x !== skill)
                      .join(', ');
                    onFilterChange('skills', remaining);
                    setPendingSkills(remaining);
                  }}
                  className="hover:text-orange-900"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* COMPANY */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Company
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search companies..."
            value={pendingCompany}
            onChange={(e) => setPendingCompany(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCompanySubmit()}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all"
          />
          <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {pendingCompany && (
            <button
              type="button"
              onClick={() => {
                setPendingCompany('');
                onFilterChange('company', '');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SALARY RANGE */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Salary Range (NPR)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minSalary}
            onChange={(e) => onFilterChange('minSalary', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all"
          />
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxSalary}
            onChange={(e) => onFilterChange('maxSalary', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* POSTED DATE */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Posted Date
        </label>
        <div className="space-y-1.5">
          {DATE_POSTED_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer select-none hover:text-primary transition-colors py-0.5"
            >
              <input
                type="radio"
                name="datePosted"
                value={opt.value}
                checked={filters.datePosted === opt.value}
                onChange={() => onFilterChange('datePosted', opt.value)}
                className="text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export const FilterSidebar: React.FC<FilterContentProps> = (props) => {
  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin">
        <FilterContent {...props} />
      </div>
    </aside>
  );
};

/* ══════════════════════════════════════════════════════════════════
   4. MOBILE FILTER DRAWER
   ══════════════════════════════════════════════════════════════════ */

interface MobileFilterDrawerProps extends FilterContentProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  onApply,
  ...filterProps
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative ml-auto w-full max-w-xs sm:max-w-md h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-primary" />
            <span>Filter Jobs</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          <FilterContent {...filterProps} />
        </div>

        {/* Sticky footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-primary hover:bg-[#e66800] rounded-xl shadow-sm transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   5. JOB CARD (Grid & List Views)
   ══════════════════════════════════════════════════════════════════ */

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onViewDetails: (id: string) => void;
  viewMode?: 'grid' | 'list';
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved,
  onToggleSave,
  onViewDetails,
  viewMode = 'grid',
}) => {
  const expired = isJobExpired(job.deadline);
  const rawDisplayName = job.companyOverride?.name?.trim() || job.employer?.name?.trim() || 'Company not available';
  const displayName = normalizeCompanyName(rawDisplayName);
  const displayLogo = job.companyOverride?.logo || job.employer?.companyLogo;
  const companyInitials = getCompanyInitials(displayName);
  const bgGradient = getCompanyBgGradient(displayName);
  const displaySalary = normalizeSalaryText(job.salary);

  // List View Layout
  if (viewMode === 'list') {
    return (
      <div
        className={`group bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex flex-col md:flex-row md:items-center justify-between gap-5 ${
          expired ? 'opacity-70 bg-slate-50/50' : ''
        }`}
      >
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Company Avatar */}
          {displayLogo ? (
            <img
              src={resolveMediaUrl(displayLogo)}
              alt={displayName}
              className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 shadow-2xs shrink-0 p-1"
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bgGradient} text-white font-bold text-sm tracking-wider flex items-center justify-center shadow-xs shrink-0 select-none`}
            >
              {companyInitials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold text-slate-500 truncate">{displayName}</span>
              {job.location && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  <MapPin size={11} className="text-blue-500 shrink-0" />
                  <span className="truncate max-w-[130px]">{job.location}</span>
                </span>
              )}
              {expired && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                  Closed
                </span>
              )}
            </div>

            <h3
              onClick={() => onViewDetails(job._id)}
              className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-primary transition-colors cursor-pointer line-clamp-2"
            >
              {job.title}
            </h3>

            {/* Semantic Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {job.jobtype && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <Clock size={12} />
                  <span>{job.jobtype}</span>
                </span>
              )}
              {job.workMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                  <span>{job.workMode}</span>
                </span>
              )}
              {job.level && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
                  <span>{job.level}</span>
                </span>
              )}
              {displaySalary && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <DollarSign size={12} />
                  <span>{displaySalary}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right column in List view: bookmark & View Details */}
        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{getTimeAgo(job.createdAt)}</span>
            {job.deadline && (
              <>
                <span>•</span>
                <span className={expired ? 'text-red-500 font-medium' : 'text-slate-500'}>
                  {expired ? 'Closed' : `Apply by ${formatDeadline(job.deadline)}`}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleSave(job._id)}
              aria-label={`Save ${job.title} at ${displayName}`}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-300 text-slate-400 hover:text-primary hover:bg-orange-50/60 transition-all active:scale-95"
            >
              <Bookmark
                size={18}
                fill={isSaved ? 'currentColor' : 'none'}
                className={isSaved ? 'text-primary' : ''}
              />
            </button>
            <button
              type="button"
              onClick={() => onViewDetails(job._id)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-[#e66800] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>View Details</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid View Layout (Standard)
  return (
    <div
      className={`group bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between ${
        expired ? 'opacity-75 bg-slate-50/50' : ''
      }`}
    >
      <div>
        {/* Top Row: Company logo, name, location, bookmark */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {displayLogo ? (
              <img
                src={resolveMediaUrl(displayLogo)}
                alt={displayName}
                className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 shadow-2xs shrink-0 p-1"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bgGradient} text-white font-bold text-sm tracking-wider flex items-center justify-center shadow-xs shrink-0 select-none`}
              >
                {companyInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate hover:text-primary transition-colors">
                {displayName}
              </p>
              {job.location && (
                <p className="text-xs text-blue-700 font-medium flex items-center gap-1 truncate mt-0.5">
                  <MapPin size={12} className="shrink-0 text-blue-500" />
                  <span className="truncate">{job.location}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleSave(job._id)}
            aria-label={`Save ${job.title} at ${displayName}`}
            className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-orange-50/80 transition-all active:scale-90 shrink-0"
            title={isSaved ? 'Saved' : 'Save job'}
          >
            <Bookmark
              size={20}
              fill={isSaved ? 'currentColor' : 'none'}
              className={isSaved ? 'text-primary' : ''}
            />
          </button>
        </div>

        {/* Job Title — Complete title, line-clamp-2 ONLY when very long */}
        <div className="mt-2 mb-2">
          <h3
            onClick={() => onViewDetails(job._id)}
            className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-primary transition-colors cursor-pointer line-clamp-2 tracking-tight leading-snug"
          >
            {job.title}
          </h3>
          {expired && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
              Closed
            </span>
          )}
        </div>

        {/* Short description if available */}
        {job.overview ? (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
            {job.overview}
          </p>
        ) : null}

        {/* Semantic Badges: Job Type (Green), Work Mode (Amber/Sky), Experience (Purple) */}
        <div className="flex flex-wrap items-center gap-1.5 my-3">
          {job.jobtype && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <Clock size={12} />
              <span>{job.jobtype}</span>
            </span>
          )}
          {job.workMode && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
              <span>{job.workMode}</span>
            </span>
          )}
          {job.level && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
              <span>{job.level}</span>
            </span>
          )}
        </div>

        {/* Salary */}
        <div className="my-2.5">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <DollarSign size={13} className="shrink-0" />
            <span>{displaySalary}</span>
          </span>
        </div>

        {/* Deadline */}
        {job.deadline && (
          <div
            className={`flex items-center gap-1.5 text-xs mt-2 ${
              expired ? 'text-red-500 font-medium' : 'text-slate-500'
            }`}
          >
            <CalendarClock size={13} className="shrink-0" />
            <span className="truncate">
              {expired ? `Closed on ${formatDeadline(job.deadline)}` : `Apply by ${formatDeadline(job.deadline)}`}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Posted time & View Details Button */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
          <Clock size={12} />
          <span>{getTimeAgo(job.createdAt)}</span>
        </span>
        <button
          type="button"
          onClick={() => onViewDetails(job._id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-[#e66800] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>View Details</span>
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   6. LOADING SKELETONS
   ══════════════════════════════════════════════════════════════════ */

interface JobSkeletonGridProps {
  count?: number;
  viewMode?: 'grid' | 'list';
}

export const JobSkeletonGrid: React.FC<JobSkeletonGridProps> = ({ count = 6, viewMode = 'grid' }) => {
  return (
    <div
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
          : 'space-y-4'
      }
      aria-busy="true"
      aria-label="Loading job listings"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-full" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 bg-slate-200 rounded-lg w-20" />
            <div className="h-6 bg-slate-200 rounded-lg w-16" />
            <div className="h-6 bg-slate-200 rounded-lg w-24" />
          </div>
          <div className="h-6 bg-slate-200 rounded-lg w-28" />
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <div className="h-3 bg-slate-200 rounded w-20" />
            <div className="h-8 bg-slate-200 rounded-xl w-28" />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   7. EMPTY & ERROR STATES
   ══════════════════════════════════════════════════════════════════ */

interface JobEmptyStateProps {
  onClearFilters: () => void;
}

export const JobEmptyState: React.FC<JobEmptyStateProps> = ({ onClearFilters }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-orange-100/60 text-primary flex items-center justify-center mx-auto mb-4">
        <Briefcase size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-900">No jobs found</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
        Try changing your search keywords or removing some filters to explore more opportunities.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-[#e66800] text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        <RotateCcw size={15} />
        <span>Clear Filters</span>
      </button>
    </div>
  );
};

interface JobErrorStateProps {
  onRetry: () => void;
}

export const JobErrorState: React.FC<JobErrorStateProps> = ({ onRetry }) => {
  return (
    <div className="bg-white rounded-2xl border border-red-200 p-8 sm:p-12 text-center shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-900">Unable to load jobs</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
        Something went wrong while loading job listings. Please check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-[#e66800] text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        <RotateCcw size={15} />
        <span>Try Again</span>
      </button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   8. PAGINATION
   ══════════════════════════════════════════════════════════════════ */

interface JobPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const JobPagination: React.FC<JobPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  // Generate pagination page numbers
  const pages: (number | string)[] = [];
  const maxButtons = 5;

  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push('...');
    if (!pages.includes(totalPages)) pages.push(totalPages);
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {pages.map((p, idx) => {
        if (p === '...') {
          return (
            <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">
              ...
            </span>
          );
        }
        const isCurrent = p === currentPage;
        return (
          <button
            key={`page-${p}`}
            type="button"
            onClick={() => onPageChange(p as number)}
            className={`min-w-[36px] h-9 px-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              isCurrent
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};
