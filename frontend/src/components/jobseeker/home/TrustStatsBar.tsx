import { useEffect, useState } from 'react';
import { Briefcase, Users, Building2, Target } from 'lucide-react';
import { getPublicStats, type PublicStats } from '../../../api/statsApi';

// Rounds a real count into a compact "10K+" style label — the "+" is only
// ever appended when the number has genuinely been rounded DOWN (so the
// real count actually is at least that many); small real counts are shown
// exactly, with no "+", rather than dressed up to look bigger than they are.
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  return `${n}`;
}

/**
 * Real-data trust bar shown directly under the Hero — Active Jobs /
 * Companies / Job Seekers / Success Rate, all fetched from
 * GET /api/stats/public (backend/controllers/statsController.js).
 * Renders nothing (not a fake "0" row) until real numbers arrive, and
 * fails silently to nothing rather than showing placeholder stats if the
 * request errors — this bar's entire purpose is to be trustworthy.
 */
export function TrustStatsBar() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getPublicStats()
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  if (failed || !stats) return null;

  const items = [
    { icon: Briefcase, value: formatCount(stats.activeJobs), label: 'Active Jobs' },
    { icon: Users, value: formatCount(stats.jobseekers), label: 'Job Seekers' },
    { icon: Building2, value: formatCount(stats.companies), label: 'Companies' },
    { icon: Target, value: `${stats.successRate}%`, label: 'Success Rate' },
  ];

  return (
    <section className="relative z-10 -mt-8 px-4 sm:-mt-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] sm:grid-cols-4 sm:gap-6 sm:p-8">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center justify-center gap-3 sm:justify-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <Icon size={20} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl">{value}</p>
              <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
