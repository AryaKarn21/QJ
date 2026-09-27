import { useEffect, useState, useRef } from 'react';
import { Briefcase, Users, Building2, Target } from 'lucide-react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { getPublicStats, type PublicStats } from '../../../api/statsApi';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  return `${n}`;
}

function AnimatedStat({ value, suffix = '', shouldReduceMotion }: { value: number; suffix?: string; shouldReduceMotion: boolean | null }) {
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    if (!isInView || value === 0) {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const duration = 700;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * value);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(value);
      }
    };

    const animId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animId);
  }, [isInView, value, shouldReduceMotion]);

  return (
    <span ref={ref}>
      {formatCount(displayValue)}{suffix}
    </span>
  );
}

export function TrustStatsBar() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [failed, setFailed] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    getPublicStats()
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  if (failed || !stats) return null;

  const items = [
    { icon: Briefcase, raw: stats.activeJobs, label: 'Active Jobs' },
    { icon: Users, raw: stats.jobseekers, label: 'Job Seekers' },
    { icon: Building2, raw: stats.companies, label: 'Companies' },
    { icon: Target, raw: stats.successRate, suffix: '%', label: 'Success Rate' },
  ];

  return (
    <section className="relative z-10 -mt-8 px-4 sm:-mt-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, ease: 'easeOut' }}
        className="mx-auto grid max-w-7xl grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] sm:grid-cols-4 sm:gap-6 sm:p-6 lg:p-7"
      >
        {items.map(({ icon: Icon, raw, suffix, label }) => (
          <div key={label} className="flex items-center justify-center gap-3 sm:justify-start group">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 transition-transform duration-200 group-hover:scale-105">
              <Icon size={20} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl">
                <AnimatedStat value={raw} suffix={suffix} shouldReduceMotion={shouldReduceMotion} />
              </p>
              <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
