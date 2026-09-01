import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, FileText, Briefcase } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Keyboard from '../../../assets/jobseekerassests/Rectangle 89.png';
import OfficeSpace from '../../../assets/aboutimg.png';
import { getHomepageContent } from '../../../api/cmsPublicApi';

// Same fallback pattern as Hero.tsx — CMS content only overrides this
// once an admin publishes something in CmsHub's Homepage tab.
const DEFAULTS = {
  badgeText: 'Build Your Future',
  heading: 'Build Your Career with',
  headingAccent: 'QuickJobs',
  description: 'Create your professional resume, get noticed by top companies and take the next step in your career.',
  primaryCtaText: 'Build Resume',
  primaryCtaLink: '/resume',
  secondaryCtaText: 'Explore Jobs',
  secondaryCtaLink: '/jobs',
};

const CallToAction: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [cms, setCms] = useState<typeof DEFAULTS | null>(null);

  useEffect(() => {
    getHomepageContent()
      .then((res) => {
        if (res.isPublished) setCms({ ...DEFAULTS, ...res.cta });
      })
      .catch(() => {});
  }, []);

  const content = cms || DEFAULTS;

  return (
    <section
      style={{
        position: 'relative',
        padding: '72px 0',
        background: 'linear-gradient(180deg, #FFF8F3 0%, #FFFFFF 100%)',
        borderTop: '1px solid #FFE4CC',
        overflow: 'hidden',
      }}
    >
      {/* Background blobs — same slow, professional drift as the Hero
          section's, static when the visitor prefers reduced motion. The
          first blob's centering transform lives on a never-animated
          outer wrapper so it can't fight framer-motion's own transform
          on the inner element. */}
      <div style={{
        position: 'absolute', top: '50%', left: '40%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 400,
        pointerEvents: 'none',
      }}>
        <motion.div
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '100%', height: '100%',
            background: 'radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>
      <motion.div
        animate={prefersReducedMotion ? undefined : { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6], y: [0, -15, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{
          position: 'absolute', top: '30%', right: '-5%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: 28,
            background: '#FFFFFF',
            border: '1.5px solid #FED7AA',
            boxShadow: '0 8px 40px rgba(249,115,22,0.1), 0 2px 8px rgba(0,0,0,0.04)',
            padding: '56px 64px',
            display: 'flex', alignItems: 'center',
            gap: 48,
          }}
          className="cta-card"
        >
          {/* Internal accent glow - top left */}
          <div style={{
            position: 'absolute', top: -80, left: -80,
            width: 280, height: 280,
            background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
          {/* Internal accent glow - bottom right */}
          <div style={{
            position: 'absolute', bottom: -80, right: 200,
            width: 250, height: 250,
            background: 'radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />

          {/* Decorative dot pattern */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            backgroundImage: 'radial-gradient(circle, #F97316 1px, transparent 1px)',
            backgroundSize: '32px 32px', opacity: 0.04, pointerEvents: 'none',
          }} />

          {/* Left: Text + buttons */}
          <div style={{ flex: '0 0 55%', position: 'relative', zIndex: 1 }} className="cta-left">

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 16px', borderRadius: 999,
              background: '#FFF7ED', border: '1px solid #FED7AA',
              fontSize: 12, fontWeight: 700, color: '#EA580C',
              marginBottom: 24,
            }}>
              <Sparkles size={13} color="#F97316" />
              {content.badgeText}
            </div>

            {/* Heading */}
            <h2 style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              fontWeight: 900, lineHeight: 1.2,
              color: '#111827', marginBottom: 32,
              letterSpacing: '-0.02em',
            }}>
              {content.heading}{' '}
              <span style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {content.headingAccent}
              </span>
            </h2>

            {/* Description */}
            {content.description && (
              <p style={{
                fontSize: 16, lineHeight: 1.7, color: '#6B7280',
                marginBottom: 32, maxWidth: 440,
              }}>
                {content.description}
              </p>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate(content.primaryCtaLink)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 28px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  boxShadow: '0 6px 20px rgba(249,115,22,0.38)',
                  transition: 'all .18s', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
              >
                <FileText size={17} />
                {content.primaryCtaText}
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => navigate(content.secondaryCtaLink)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 28px', borderRadius: 14, cursor: 'pointer',
                  background: '#FFFFFF', border: '1.5px solid #FED7AA',
                  color: '#C2410C', fontWeight: 700, fontSize: 15,
                  boxShadow: '0 2px 8px rgba(249,115,22,0.08)',
                  transition: 'all .18s', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = '#FFF7ED';
                  el.style.borderColor = '#F97316';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = '#FFFFFF';
                  el.style.borderColor = '#FED7AA';
                  el.style.transform = 'none';
                }}
              >
                <Briefcase size={17} color="#F97316" />
                {content.secondaryCtaText}
              </button>
            </div>
          </div>

          {/* Right: Image — a slow, continuous float (paused for
              prefers-reduced-motion) plus a deliberate, subtle lift +
              tilt + zoom on hover, so it reads as alive without being a
              gimmick. The glow behind it breathes in sync so the two
              never look like they're competing. */}
          <div style={{ flex: '0 0 40%', position: 'relative', zIndex: 1 }} className="cta-right">
            <motion.div
              animate={prefersReducedMotion ? undefined : { y: [0, -10, 0] }}
              transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.035, rotate: -1 }}
              style={{ position: 'relative', cursor: 'pointer' }}
            >
              {/* Glow behind image */}
              <motion.div
                animate={prefersReducedMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', inset: -8,
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,146,60,0.1))',
                  borderRadius: 24, filter: 'blur(16px)',
                }}
              />
              <div
                className="cta-image-frame"
                style={{
                  position: 'relative',
                  borderRadius: 20, overflow: 'hidden',
                  border: '1.5px solid #FED7AA',
                  boxShadow: '0 8px 32px rgba(249,115,22,0.12)',
                  transition: 'box-shadow .3s ease',
                }}
              >
                <img
                  src={Keyboard}
                  alt="Workplace"
                  style={{
                    width: '100%', height: 'auto', display: 'block', objectFit: 'cover',
                    transition: 'transform .5s ease',
                  }}
                  className="cta-image"
                />
              </div>

              {/* Second, job-related photo — a real office/workplace shot
                  (already used on the About page, reused rather than
                  adding a new asset), overlapping the main photo's
                  bottom-left corner "polaroid" style. Floats on its own
                  slower, offset cadence so it doesn't move in lockstep
                  with the main image, and has its own independent hover
                  zoom. Hidden below the 900px breakpoint (same one the
                  two-column layout itself collapses at) — there isn't
                  room for an overlap once the columns stack. */}
              <motion.div
                animate={prefersReducedMotion ? undefined : { y: [0, -8, 0] }}
                transition={{ y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 } }}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
                className="cta-accent-frame"
                style={{
                  position: 'absolute',
                  bottom: -28,
                  left: -28,
                  width: '48%',
                  maxWidth: 150,
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '4px solid #FFFFFF',
                  boxShadow: '0 10px 28px rgba(15,23,42,0.18)',
                  zIndex: 2,
                }}
              >
                <img
                  src={OfficeSpace}
                  alt="Modern office workspace"
                  style={{ width: '100%', aspectRatio: '4 / 3', display: 'block', objectFit: 'cover' }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .cta-card { flex-direction: column !important; padding: 36px 28px !important; }
          .cta-left, .cta-right { flex: none !important; width: 100% !important; }
          .cta-accent-frame { display: none; }
        }
        .cta-image-frame:hover .cta-image { transform: scale(1.08); }
        .cta-image-frame:hover { box-shadow: 0 12px 40px rgba(249,115,22,0.22); }
      `}</style>
    </section>
  );
};

export default CallToAction;