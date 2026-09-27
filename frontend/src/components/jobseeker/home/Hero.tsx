import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  FileText,
  Briefcase,
  Zap,
  X,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getHomepageContent } from '../../../api/cmsPublicApi';
import { useSiteContent } from '../../../hooks/useSiteContent';
import jobPhoto from '../../../assets/jobseekerassests/quickjobs-hero-hd.webp';

// Hardcoded copy stays as the fallback — CMS content only overrides it
// once an admin actually publishes something (see CmsHub.tsx's Homepage
// tab). This is why every CMS field below is read as `cms?.x || <default>`
// rather than the component depending on CMS content existing at all.
const DEFAULTS = {
  badgeText: 'Build Your Future With QuickJobs',
  headline: 'Welcome to',
  headlineAccent: 'Quick Jobs',
  subheadline: 'Best portal to find jobs of your choice. Discover top engineering, design, and management opportunities.',
  primaryCtaText: 'Find Jobs',
  primaryCtaLink: '/jobs',
  secondaryCtaText: 'Build Resume',
  secondaryCtaLink: '/resume',
  popularSearches: ['Frontend Developer', 'QA Engineer', 'UI/UX Designer', 'Data Analyst'],
};

// Single hero slides array architecture — ready for multiple images if configured,
// but maintains exactly one hero image without duplication.
const HERO_SLIDES = [jobPhoto];

// Specific entrance variants matching the requested timing & order:
// 1. Badge (300ms)
// 2. Heading (450ms)
// 3. Description (550ms)
// 4. Search bar (650ms)
// 5. Popular Searches (750ms + staggered tags)
// 6. CTA / Buttons (850ms)
const createItemVariant = (delay: number, duration: number = 0.6): Variants => ({
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration,
      delay,
      ease: [0.25, 0.1, 0.25, 1], // Smooth cubic ease-out
    },
  },
});

const badgeVariant = createItemVariant(0.3, 0.55);
const headingVariant = createItemVariant(0.45, 0.6);
const descVariant = createItemVariant(0.55, 0.6);
const searchVariant = createItemVariant(0.65, 0.65);
const ctaVariant = createItemVariant(0.85, 0.55);

const popularContainerVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.75,
      duration: 0.55,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.09, // 90ms stagger between pills
      delayChildren: 0.85,
    },
  },
};

const popularTagVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

const reducedMotionVariant: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const searchPlaceholder = useSiteContent('homepage.hero.searchPlaceholder', 'Search for jobs or internships...');
  const popularSearchesLabel = useSiteContent('homepage.hero.popularSearchesLabel', 'Popular Searches:');
  const [searchInput, setSearchInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Carousel autoplay if multiple slides are present (6-second interval, 900ms transition)
  useEffect(() => {
    if (HERO_SLIDES.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

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
  const headline = (content.headline && content.headline.trim()) || DEFAULTS.headline;
  const headlineAccent = (content.headlineAccent && content.headlineAccent.trim()) || DEFAULTS.headlineAccent;
  const subheadline = (content.subheadline && content.subheadline.trim()) || DEFAULTS.subheadline;
  const badgeText = (content.badgeText && content.badgeText.trim()) || DEFAULTS.badgeText;
  const primaryCtaText = content.primaryCtaText && content.primaryCtaText.trim();
  const secondaryCtaText = content.secondaryCtaText && content.secondaryCtaText.trim();

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

  // Suggestions dropdown: shows matching popular searches
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
    <section className="relative isolate flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6 sm:py-12 lg:py-14 pb-14 sm:pb-16 lg:pb-20 min-h-[460px] lg:min-h-[500px] xl:min-h-[530px]">
      {/* ── BACKGROUND ── Exact HD Hero visual with Ken Burns slow zoom ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {HERO_SLIDES.length > 1 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={activeSlide}
              src={HERO_SLIDES[activeSlide]}
              alt="QuickJobs Career Opportunities"
              className="h-full w-full object-cover object-right-top"
              style={{ objectPosition: 'right top', transformOrigin: 'right top' }}
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          </AnimatePresence>
        ) : (
          <motion.img
            src={HERO_SLIDES[0]}
            alt="QuickJobs Career Opportunities"
            className="h-full w-full object-cover object-right-top"
            style={{ objectPosition: 'right top', transformOrigin: 'right top' }}
            animate={prefersReducedMotion ? undefined : { scale: [1, 1.02, 1] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Soft dark gradient on left to guarantee text readability while keeping the people vibrant */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/30 to-transparent" />

        {/* Subtle ambient glows for visual depth */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: [0.3, 0.5, 0.3], x: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-orange-500/20 blur-[110px]"
        />
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute -right-24 top-1/3 h-[480px] w-[480px] rounded-full bg-sky-500/15 blur-[110px]"
        />
      </div>

      {/* ── FLOATING CAREER ANIMATION LAYER (Desktop / Tablet Landscape) ── */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block overflow-hidden">
        <div className="relative mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Animated SVG connecting dotted lines: Job Opportunities -> Build Your CV -> Grow Your Career */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="careerLineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.45" />
              </linearGradient>
            </defs>
            <motion.path
              d="M 1120, 80 C 1170, 150 1190, 220 1200, 280 C 1205, 340 1150, 410 1100, 460"
              fill="none"
              stroke="url(#careerLineGradient)"
              strokeWidth="1.75"
              strokeDasharray="4 4"
              animate={prefersReducedMotion ? undefined : { strokeDashoffset: [0, -16] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            />
          </svg>

          {/* 1. Job Opportunities Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, y: 0 }
                : {
                    opacity: [0.92, 1, 0.92],
                    y: [0, -6, 0],
                    scale: [1, 1.015, 1],
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : { duration: 5, repeat: Infinity, ease: 'easeInOut' }
            }
            className="absolute top-8 right-6 xl:right-14 flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/80 p-3 px-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">Job Opportunities</p>
              <p className="text-[11px] font-medium text-slate-300">1,200+ Active Roles</p>
            </div>
          </motion.div>

          {/* 2. Build Your CV Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, y: 0 }
                : {
                    opacity: [0.92, 1, 0.92],
                    y: [0, 6, 0],
                    scale: [1, 1.015, 1],
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }
            }
            className="absolute top-[50%] right-2 xl:right-8 flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/80 p-3 px-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">Build Your CV</p>
              <p className="text-[11px] font-medium text-slate-300">ATS Optimized</p>
            </div>
          </motion.div>

          {/* 3. Grow Your Career Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, y: 0 }
                : {
                    opacity: [0.92, 1, 0.92],
                    y: [0, -5, 0],
                    scale: [1, 1.015, 1],
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 2.4 }
            }
            className="absolute bottom-6 right-8 xl:right-20 flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/80 p-3 px-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">Grow Your Career</p>
              <p className="text-[11px] font-medium text-slate-300">Fast-Track Hires</p>
            </div>
          </motion.div>

          {/* 4. Career Growth Micro-Badge */}
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: [0, 4, 0],
                    opacity: [0.88, 1, 0.88],
                  }
            }
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="absolute top-16 left-[48%] xl:left-[51%] flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-slate-900/80 px-3 py-1 shadow-md backdrop-blur-md"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-300">Career Growth +45%</span>
          </motion.div>

          {/* 5. Job Discovery Micro-Badge */}
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: [0, -4, 0],
                    opacity: [0.88, 1, 0.88],
                  }
            }
            transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
            className="absolute bottom-20 left-[44%] xl:left-[47%] flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-slate-900/80 px-3 py-1 shadow-md backdrop-blur-md"
          >
            <Search size={12} className="text-orange-400" />
            <span className="text-[11px] font-bold text-orange-300">Job Discovery</span>
          </motion.div>

          {/* 6. Hiring & Recruitment Micro-Badge */}
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: [0, 5, 0],
                    opacity: [0.88, 1, 0.88],
                  }
            }
            transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 2.0 }}
            className="absolute top-4 right-[30%] xl:right-[34%] flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-slate-900/80 px-3 py-1 shadow-md backdrop-blur-md"
          >
            <span className="flex h-2 w-2 rounded-full bg-sky-400" />
            <span className="text-[11px] font-bold text-sky-300">Hiring &amp; Recruitment</span>
          </motion.div>
        </div>
      </div>

      {/* ── CONTENT ── Aligned to the left matching the hero layout ── */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center lg:text-left">
        <div className="mx-auto max-w-2xl lg:mx-0">
          {/* 1. Badge (delay 300ms) */}
          <motion.div
            variants={prefersReducedMotion ? reducedMotionVariant : badgeVariant}
            initial="hidden"
            animate="show"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-tight text-white backdrop-blur-sm sm:text-[13px]"
          >
            <Zap size={13} className="fill-orange-400 text-orange-400" />
            {badgeText}
          </motion.div>

          {/* 2. Main Heading (delay 450ms) */}
          <motion.h1
            variants={prefersReducedMotion ? reducedMotionVariant : headingVariant}
            initial="hidden"
            animate="show"
            className="mb-3 text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {headline} <span className="text-orange-500">{headlineAccent}</span>
          </motion.h1>

          {/* 3. Description (delay 550ms) */}
          <motion.p
            variants={prefersReducedMotion ? reducedMotionVariant : descVariant}
            initial="hidden"
            animate="show"
            className="mx-auto mb-5 max-w-xl text-base font-normal leading-relaxed text-slate-300 sm:text-lg lg:mx-0"
          >
            {subheadline}
          </motion.p>

          {/* 4. Search bar (delay 650ms) */}
          <motion.div
            variants={prefersReducedMotion ? reducedMotionVariant : searchVariant}
            initial="hidden"
            animate="show"
            className="relative mx-auto mb-4 max-w-xl lg:mx-0"
            ref={searchWrapRef}
          >
            <div
              className={`group/search flex flex-col gap-2 rounded-2xl bg-white p-1.5 border transition-all duration-300 ease-out hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center sm:gap-0 ${
                isFocused
                  ? 'border-orange-500/80 ring-4 ring-orange-500/20 shadow-[0_8px_30px_rgba(249,115,22,0.2)]'
                  : 'border-slate-100 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.3)]'
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
                    className="shrink-0 rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="group flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/30 hover:bg-orange-600 active:scale-[0.98] sm:w-auto cursor-pointer"
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
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
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

          {/* 5. Popular Searches with staggered tag animation (delay 750ms + 90ms stagger) */}
          <motion.div
            variants={prefersReducedMotion ? reducedMotionVariant : popularContainerVariant}
            initial="hidden"
            animate="show"
            className="flex flex-wrap items-center justify-center gap-2 lg:justify-start"
          >
            <span className="text-[13px] font-medium text-slate-400">{popularSearchesLabel}</span>
            {staticPopularJobs.map((job, i) => (
              <motion.button
                key={i}
                variants={prefersReducedMotion ? undefined : popularTagVariant}
                type="button"
                onClick={() => handlePopularJobClick(job)}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-orange-500 hover:bg-orange-500 hover:text-white active:scale-95 cursor-pointer"
              >
                {job}
              </motion.button>
            ))}
          </motion.div>

          {/* 6. Optional CTA Buttons (delay 850ms) */}
          {(primaryCtaText || secondaryCtaText) && (
            <motion.div
              variants={prefersReducedMotion ? reducedMotionVariant : ctaVariant}
              initial="hidden"
              animate="show"
              className="mt-5 flex flex-wrap items-center justify-center gap-3.5 lg:justify-start"
            >
              {primaryCtaText && (
                <button
                  type="button"
                  onClick={() => navigate(content.primaryCtaLink || '/jobs')}
                  className="group inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 hover:bg-orange-600 active:scale-[0.98] cursor-pointer"
                >
                  <span>{primaryCtaText}</span>
                  <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              )}
              {secondaryCtaText && (
                <button
                  type="button"
                  onClick={() => navigate(content.secondaryCtaLink || '/resume')}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-[15px] font-bold text-slate-900 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:bg-slate-100 active:scale-[0.98] cursor-pointer"
                >
                  <span>{secondaryCtaText}</span>
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Slide indicators only rendered if there are multiple slides (Section 16 requirement) */}
      {HERO_SLIDES.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeSlide ? 'w-6 bg-orange-500' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;