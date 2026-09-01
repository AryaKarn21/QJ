import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  FileText,
  Zap,
} from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { getHomepageContent } from '../../../api/cmsPublicApi';
import jobPhoto from '../../../assets/authImages/loginimg.webp';

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
  const [searchInput, setSearchInput] = useState('');
  const [cms, setCms] = useState<typeof DEFAULTS | null>(null);

  useEffect(() => {
    getHomepageContent()
      .then((res) => {
        if (res.isPublished) {
          setCms({ ...DEFAULTS, ...res.hero, popularSearches: res.hero.popularSearches?.length ? res.hero.popularSearches : DEFAULTS.popularSearches });
        }
      })
      .catch(() => {}); // network hiccup — just keep showing the hardcoded defaults
  }, []);

  const content = cms || DEFAULTS;
  const staticPopularJobs = content.popularSearches;

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed) navigate(`/jobs?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handlePopularJobClick = (job: string) => {
    navigate(`/jobs?q=${encodeURIComponent(job)}`);
  };

  return (
    <section className="relative isolate flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 sm:px-6 sm:py-20 lg:min-h-[620px] lg:px-8 lg:py-0">

      {/* ── BACKGROUND ── deliberately restrained: one real photo, one
          dark scrim for contrast, two soft brand-color glows (orange
          left, blue right). No floating shapes, no glass panels, no
          parallax — a corporate job portal, not a design experiment.
          Darkest over the left/text column for contrast, fading lighter
          toward the right so the photo actually stays visible instead
          of disappearing under a flat, overly dark scrim. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img src={jobPhoto} alt="" className="h-full w-full object-cover opacity-[0.35]" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/45" />

        {/* Warm orange glow — left, echoing a lit office */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-orange-500/25 blur-[110px]"
        />
        {/* Cool blue glow — right, echoing the tech/network side */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full bg-sky-500/20 blur-[110px]"
        />

        {/* Faint network-dot texture, right half only */}
        <div
          className="absolute inset-y-0 right-0 w-1/2 opacity-[0.12] [mask-image:linear-gradient(to_left,black,transparent)]"
          style={{ backgroundImage: 'radial-gradient(circle, #38BDF8 1px, transparent 1px)', backgroundSize: '36px 36px' }}
        />
      </div>

      {/* ── CONTENT ── centered on mobile (narrow enough that centering
          reads better), shifts to a left-aligned column on desktop —
          matching the reference's content sitting in the left/center-left
          portion of the hero rather than dead-center. */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-6xl text-center lg:text-left"
      >
      <div className="mx-auto max-w-2xl lg:mx-0">

        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-tight text-white backdrop-blur-sm sm:text-[13px]"
        >
          <Zap size={13} className="fill-orange-400 text-orange-400" />
          {content.badgeText}
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="mb-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          {content.headline} <span className="text-orange-500">{content.headlineAccent}</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mb-9 max-w-xl text-base font-normal leading-relaxed text-slate-300 sm:text-lg lg:mx-0"
        >
          {content.subheadline}
        </motion.p>

        {/* Search bar — one integrated pill on tablet+, stacks to a
            full-width input then a full-width button on phones so the
            button keeps a comfortable touch target instead of squeezing
            into the same row. */}
        <motion.div variants={itemVariants} className="mx-auto mb-6 max-w-xl lg:mx-0">
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-1.5 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4)] sm:flex-row sm:items-center sm:gap-0">
            <div className="flex min-w-0 flex-1 items-center gap-2 pl-4">
              <Search size={19} className="shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search for jobs or internships..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-w-0 border-none bg-transparent py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-orange-600 active:scale-95 sm:w-auto"
            >
              Search <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>

        {/* Popular searches */}
        <motion.div variants={itemVariants} className="mb-9 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          <span className="text-[13px] font-medium text-slate-400">Popular Searches:</span>
          {staticPopularJobs.map((job, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePopularJobClick(job)}
              className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-orange-500 hover:bg-orange-500 hover:text-white active:scale-95"
            >
              {job}
            </button>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
          <button
            type="button"
            onClick={() => navigate(content.primaryCtaLink)}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition-all duration-200 hover:scale-[1.03] hover:bg-orange-600 active:scale-95"
          >
            {content.primaryCtaText} <ArrowRight size={17} />
          </button>
          <button
            type="button"
            onClick={() => navigate(content.secondaryCtaLink)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-slate-900 transition-all duration-200 hover:scale-[1.03] hover:bg-slate-100 active:scale-95"
          >
            <FileText size={16} className="text-orange-500" /> {content.secondaryCtaText}
          </button>
        </motion.div>

        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
