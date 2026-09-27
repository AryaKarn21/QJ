import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  FileText,
  Zap,
  X,
  TrendingUp,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getHomepageContent } from '../../../api/cmsPublicApi';
import { useSiteContent } from '../../../hooks/useSiteContent';
import jobPhoto from '../../../assets/jobseekerassests/quickjobs-hero-hd.webp';

// Hardcoded copy stays as the fallback — CMS content only overrides it
// once an admin actually publishes something (see CmsHub.tsx's Homepage
// tab). This is why every CMS field below is read as `cms?.x || <default>`
// rather than the component depending on CMS content existing at all.
const DEFAULTS = {
  badgeText: 'Next-Generation Career Platform',
  headline: 'Welcome to',
  headlineAccent: 'Quick Jobs',
  subheadline: 'Best portal to find jobs of your choice. Discover top engineering, design, and management opportunities.',
  primaryCtaText: 'Find Jobs',
  primaryCtaLink: '/jobs',
  secondaryCtaText: 'Build Resume',
  secondaryCtaLink: '/resume',
  popularSearches: ['Frontend Developer', 'QA Engineer', 'UI/UX Designer', 'Data Analyst'],
};

// Staggered entrance — badge, heading, description, search, chips and CTAs
// fade + slide up one after another instead of all appearing at once.
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const searchPlaceholder = useSiteContent('homepage.hero.searchPlaceholder', 'Search for jobs or internships...');
  const popularSearchesLabel = useSiteContent('homepage.hero.popularSearchesLabel', 'Popular Searches:');
  const [searchInput, setSearchInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Shared ['homepage-content'] query key with CallToAction.tsx and every
  // homepage section component (see hooks/useHomepageSection.ts) — all of
  // them mounting together dedupes into one cached request instead of each
  // firing its own. A network hiccup/unpublished draft just falls back to
  // DEFAULTS below, same as before.
  const { data: res } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: getHomepageContent,
    retry: false,
  });
  const cms = res?.isPublished
    ? { ...DEFAULTS, ...res.hero, popularSearches: res.hero.popularSearches?.length ? res.hero.popularSearches : DEFAULTS.popularSearches }
    : null;

  const content = cms || DEFAULTS;
  const staticPopularJobs = content.popularSearches?.length ? content.popularSearches : DEFAULTS.popularSearches;
  const primaryCtaText = (content.primaryCtaText && content.primaryCtaText.trim()) || DEFAULTS.primaryCtaText;
  const secondaryCtaText = (content.secondaryCtaText && content.secondaryCtaText.trim()) || DEFAULTS.secondaryCtaText;
  const headline = (content.headline && content.headline.trim()) || DEFAULTS.headline;
  const headlineAccent = (content.headlineAccent && content.headlineAccent.trim()) || DEFAULTS.headlineAccent;
  const subheadline = (content.subheadline && content.subheadline.trim()) || DEFAULTS.subheadline;
  const badgeText = (content.badgeText && content.badgeText.trim()) || DEFAULTS.badgeText;

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    setIsFocused(false);
    if (trimmed) navigate(`/jobs?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handlePopularJobClick = (job: string) => {
    navigate(`/jobs?q=${encodeURIComponent(job)}`);
  };

  // Suggestions dropdown: shows the full popular-searches list on focus
  // with nothing typed yet, then narrows to whichever of those terms
  // match what's been typed so far.
  const suggestions = staticPopularJobs.filter((job) =>
    job.toLowerCase().includes(searchInput.trim().toLowerCase())
  );
  const showSuggestions = isFocused && suggestions.length > 0;

  const handleSuggestionClick = (job: string) => {
    setSearchInput(job);
    setIsFocused(false);
    navigate(`/jobs?q=${encodeURIComponent(job)}`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section className="relative isolate flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 sm:py-16 lg:py-20 lg:px-8">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Warm orange glow — left */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: [0.35, 0.55, 0.35], x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-orange-500/20 blur-[120px]"
        />
        {/* Cool blue glow — right */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: [0.3, 0.5, 0.3], x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute -right-24 top-1/3 h-[520px] w-[520px] rounded-full bg-sky-500/15 blur-[120px]"
        />
        {/* Faint violet glow — lower center */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute -bottom-20 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[110px]"
        />

        {/* Network-dot texture */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, #38BDF8 1px, transparent 1px)', backgroundSize: '36px 36px' }}
        />
      </div>

      {/* Main 2-column content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-7xl px-2 sm:px-4 lg:px-8"
      >
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12">
          {/* Left Column: Heading, Search & Actions */}
          <div className="text-center lg:col-span-7 lg:text-left">
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-tight text-white backdrop-blur-sm sm:text-[13px]"
            >
              <Zap size={13} className="fill-orange-400 text-orange-400" />
              {badgeText}
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="mb-3 text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-5xl xl:text-6xl"
            >
              {headline} <span className="text-orange-500">{headlineAccent}</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              variants={itemVariants}
              className="mx-auto mb-6 max-w-xl text-sm font-normal leading-relaxed text-slate-300 sm:text-base lg:mx-0 lg:text-lg"
            >
              {subheadline}
            </motion.p>

            {/* Search bar */}
            <motion.div variants={itemVariants} className="relative mx-auto mb-4 max-w-xl lg:mx-0" ref={searchWrapRef}>
              <div
                className={`flex flex-col gap-2 rounded-2xl bg-white p-1.5 border transition-all duration-200 sm:flex-row sm:items-center sm:gap-0 ${
                  isFocused ? 'border-orange-300 ring-2 ring-orange-500/25 shadow-md shadow-orange-500/10' : 'border-slate-100 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 pl-4">
                  <Search size={19} className={`shrink-0 transition-colors duration-200 ${isFocused ? 'text-orange-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder={content.searchPlaceholder || searchPlaceholder}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    className="w-full min-w-0 border-none bg-transparent py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      aria-label="Clear search"
                      className="shrink-0 rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="group flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 hover:bg-orange-600 active:scale-[0.98] sm:w-auto cursor-pointer"
                >
                  Search <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)]"
                >
                  <p className="px-4 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {searchInput.trim() ? 'Matching searches' : 'Popular searches'}
                  </p>
                  <ul className="max-h-64 overflow-y-auto py-1.5">
                    {suggestions.map((job, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSuggestionClick(job)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-600"
                        >
                          <TrendingUp size={14} className="shrink-0 text-slate-300" />
                          {job}
                        </button>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>

            {/* Popular searches */}
            <motion.div variants={itemVariants} className="mb-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="text-[13px] font-medium text-slate-400">{popularSearchesLabel}</span>
              {staticPopularJobs.map((job, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePopularJobClick(job)}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-orange-500 hover:bg-orange-500 hover:text-white active:scale-95 cursor-pointer"
                >
                  {job}
                </button>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
              <button
                type="button"
                onClick={() => navigate(content.primaryCtaLink || DEFAULTS.primaryCtaLink)}
                className="group inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 hover:bg-orange-600 active:scale-[0.98] cursor-pointer"
              >
                <span>{primaryCtaText}</span>
                <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => navigate(content.secondaryCtaLink || DEFAULTS.secondaryCtaLink)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-slate-900 shadow-md transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.98] cursor-pointer"
              >
                <FileText size={16} className="text-orange-500" />
                <span>{secondaryCtaText}</span>
              </button>
            </motion.div>
          </div>

          {/* Right Column: Clean, HD Hero Visual Showcase */}
          <motion.div
            variants={itemVariants}
            className="relative flex items-center justify-center lg:col-span-5"
          >
            {/* Ambient backlight glow */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-orange-500/25 via-sky-500/20 to-transparent blur-2xl -z-10" />

            {/* Visual Container */}
            <motion.div
              animate={prefersReducedMotion ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-lg lg:max-w-none overflow-hidden rounded-3xl border border-white/20 bg-slate-900/50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-sm group"
            >
              <img
                src={jobPhoto}
                alt="QuickJobs Career Opportunities"
                className="w-full h-auto object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;