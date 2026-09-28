import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, CheckCircle2, PartyPopper, X } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  shape: 'rect' | 'circle' | 'ribbon';
  delay: number;
  duration: number;
}

const CONFETTI_COLORS = [
  '#10B981', // emerald
  '#F59E0B', // amber / gold
  '#EF4444', // red / ruby
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#FFD700', // bright gold
];

export interface CongratulationsBannerProps {
  jobTitle?: string;
  companyName?: string;
  candidateName?: string;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * High-performance, celebratory confetti particles overlay.
 * Renders fluttering and spinning confetti pieces across the view.
 */
export const ConfettiEffect: React.FC<{ durationSeconds?: number }> = ({ durationSeconds = 6 }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const newParticles: Particle[] = [];
    const count = 55;
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100, // percentage 0 - 100vw
        y: -10 - Math.random() * 20, // start above view
        size: Math.random() * 8 + 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        shape: Math.random() > 0.6 ? 'circle' : Math.random() > 0.3 ? 'ribbon' : 'rect',
        delay: Math.random() * 2,
        duration: Math.random() * 2.5 + 3,
      });
    }
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setVisible(false);
    }, durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [durationSeconds]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}px`,
            width: p.shape === 'ribbon' ? `${p.size * 0.4}px` : `${p.size}px`,
            height: p.shape === 'ribbon' ? `${p.size * 1.8}px` : `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '9999px' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: 0.9,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg) scale(0.8);
            opacity: 1;
          }
          50% {
            transform: translateY(50vh) rotate(360deg) scale(1.1);
            opacity: 0.95;
          }
          100% {
            transform: translateY(105vh) rotate(720deg) scale(0.9);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation-name: confettiFall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

/**
 * Celebratory congratulations card shown when a candidate's application is Accepted.
 */
export const CongratulationsBanner: React.FC<CongratulationsBannerProps> = ({
  jobTitle,
  companyName,
  candidateName,
  onDismiss,
  className = '',
  compact = false,
}) => {
  const [replayKey, setReplayKey] = useState(0);

  const handleCelebrateAgain = () => {
    setReplayKey((k) => k + 1);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 p-5 text-white shadow-xl shadow-emerald-500/20 transition-all ${className}`}
      role="region"
      aria-label="Application Accepted Congratulations"
    >
      <ConfettiEffect key={replayKey} durationSeconds={5} />

      {/* Decorative background sparkles */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-white/10 blur-xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-amber-300/20 blur-lg" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-amber-300 ring-2 ring-white/30 animate-bounce">
            <Trophy size={26} className="drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white backdrop-blur-sm">
                <Sparkles size={12} className="text-amber-200" /> Offer / Accepted
              </span>
              <span className="text-xs text-emerald-100 font-medium flex items-center gap-1">
                <CheckCircle2 size={13} /> Application Successful
              </span>
            </div>

            <h3 className="mt-1 text-lg sm:text-xl font-black tracking-tight drop-shadow-sm text-white">
              {candidateName ? `Congratulations, ${candidateName}! 🎉` : 'Congratulations! You are Accepted! 🎉'}
            </h3>

            <p className="mt-0.5 text-xs sm:text-sm text-emerald-50 leading-relaxed max-w-2xl font-medium">
              Your application {jobTitle ? <span>for <strong className="text-white underline decoration-white/40">{jobTitle}</strong></span> : ''}
              {companyName ? <span> at <strong className="text-white">{companyName}</strong></span> : ''} has been officially <strong className="text-white uppercase tracking-wide">Accepted</strong>!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleCelebrateAgain}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-md hover:bg-emerald-50 transition-all active:scale-95 cursor-pointer"
            title="Celebrate again"
          >
            <PartyPopper size={15} className="text-emerald-600" /> Celebrate
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CongratulationsBanner;
