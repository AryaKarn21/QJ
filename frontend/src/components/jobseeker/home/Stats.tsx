import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCode2,
  Target,
  Users,
  LayoutTemplate,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tag: string;
  link: string;
  iconBg: string;
  iconColor: string;
  tagColor: string;
  borderHover: string;
}

const features: Feature[] = [
  {
    id: 'ai-resume',
    title: 'AI Resume Builder',
    description: 'Craft ATS-optimized resumes tailored to specific job descriptions in seconds.',
    icon: FileCode2,
    tag: 'AI Powered',
    link: '/resume',
    iconBg: '#FFF7ED',
    iconColor: '#F97316',
    tagColor: '#EA580C',
    borderHover: '#FED7AA',
  },
  {
    id: 'job-tracking',
    title: 'Job Tracking System',
    description: 'Organize your application pipeline, interview schedules, and offers in one place.',
    icon: Target,
    tag: 'Productivity',
    link: '/user/dashboard',
    iconBg: '#FFF7ED',
    iconColor: '#FB923C',
    tagColor: '#EA580C',
    borderHover: '#FED7AA',
  },
  {
    id: 'resume-templates',
    title: 'Resume Templates',
    description: 'Access battle-tested, modern layouts designed by top industry recruiters.',
    icon: LayoutTemplate,
    tag: 'Design',
    link: '/resume',
    iconBg: '#FFF7ED',
    iconColor: '#F97316',
    tagColor: '#EA580C',
    borderHover: '#FED7AA',
  },
  {
    id: 'community',
    title: 'Community Network',
    description: 'Connect with peers, share interview experiences, and get insider advice.',
    icon: Users,
    tag: 'Networking',
    link: '/community',
    iconBg: '#FFF7ED',
    iconColor: '#FB923C',
    tagColor: '#EA580C',
    borderHover: '#FED7AA',
  },
];

const Stats: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      style={{
        position: 'relative',
        padding: '72px 0',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF8F3 100%)',
        borderTop: '1px solid #FFE4CC',
        borderBottom: '1px solid #FFE4CC',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background blob — same slow, professional drift as the
          Hero blobs, kept static (no motion) when the visitor prefers
          reduced motion. The centering transform lives on this outer,
          never-animated wrapper so framer-motion's own transform
          composition (on the inner element) never fights it. */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 300,
        pointerEvents: 'none',
      }}>
        <motion.div
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '100%', height: '100%',
            background: 'radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 52px' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 16px', borderRadius: 999,
              background: '#FFF7ED', border: '1px solid #FED7AA',
              fontSize: 12, fontWeight: 700, color: '#EA580C',
              marginBottom: 16, letterSpacing: '.04em',
            }}
          >
            <Sparkles size={13} color="#F97316" />
            Built For Next-Gen Careers
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            style={{
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 900, color: '#111827',
              lineHeight: 1.2, letterSpacing: '-0.02em', margin: 0,
            }}
          >
            Everything you need to land{' '}
            <span style={{
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              your next role
            </span>
          </motion.h2>
        </div>

        {/* Feature cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}
          className="features-grid"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.09 }}
                onClick={() => navigate(feature.link)}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #F3F4F6',
                  borderRadius: 20,
                  padding: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'all .22s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                whileHover={{
                  y: -6,
                  boxShadow: '0 12px 36px rgba(249,115,22,0.14)',
                  borderColor: '#FED7AA',
                }}
              >
                {/* Top accent line on hover — done via pseudo via inline approach */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #F97316, #FB923C)', borderRadius: '20px 20px 0 0', opacity: 0 }}
                  className="card-top-accent"
                />

                <div>
                  {/* Icon row + tag */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: feature.iconBg,
                      border: '1.5px solid #FED7AA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: feature.iconColor,
                    }}>
                      <Icon size={22} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                      textTransform: 'uppercase' as const,
                      background: '#FFF7ED', border: '1px solid #FED7AA',
                      color: feature.tagColor,
                      padding: '4px 10px', borderRadius: 999,
                    }}>
                      {feature.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                    {feature.description}
                  </p>
                </div>

                {/* Footer */}
                <div style={{
                  marginTop: 24, paddingTop: 16,
                  borderTop: '1px solid #F3F4F6',
                  display: 'flex', alignItems: 'center',
                  fontSize: 13, fontWeight: 700, color: '#F97316',
                  gap: 4,
                }}>
                  Explore feature
                  <ArrowUpRight size={14} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) { .features-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 600px)  { .features-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
};

export default Stats;