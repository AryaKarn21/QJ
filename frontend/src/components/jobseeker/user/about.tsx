import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Users, Shield, Lightbulb, Sparkles, Send, MapPin, Target, Compass } from 'lucide-react';
import aboutimg from '../../../assets/aboutimg.png';
import { useSiteContent } from '../../../hooks/useSiteContent';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const cardHoverVariants: Variants = {
  hover: {
    y: -4,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

const About: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  const heroTitle = useSiteContent('about.hero.title', 'About Quick Jobs');
  const heroDescription = useSiteContent(
    'about.hero.description',
    'We are a human resource solutions company dedicated to helping businesses grow by empowering their people. Our team bridges the gap between talent and opportunity, creating meaningful professional connections.'
  );
  const missionDescription = useSiteContent(
    'about.mission.description',
    "Whether you're scaling a startup or optimizing an enterprise workforce, our HR experts work as an extension of your leadership team, enabling you to focus on the core aspects of your business while we deliver customized solutions that align with your goals."
  );
  const visionDescription = useSiteContent(
    'about.vision.description',
    'That is why we prioritize not just recruitment, but the full employee lifecycle from talent acquisition and onboarding to training, retention, and performance development. Our tailored strategies ensure the right people are in the right roles, thriving within a culture that supports growth and innovation.'
  );
  const valuesHeading = useSiteContent('about.values.heading', 'Our Core Values');
  const contactHeading = useSiteContent('about.contact.heading', 'Get in Touch');

  const coreValues = [
    {
      icon: Users,
      title: 'People First',
      desc: 'We believe that people are the most valuable asset of any organization. Every feature we build focuses on candidate respect and employer growth.',
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      icon: Shield,
      title: 'Integrity & Trust',
      desc: 'We operate with total transparency, honesty, and verified opportunities, fostering trustworthy connections across the recruitment ecosystem.',
      color: 'text-sky-500',
      bg: 'bg-sky-50',
    },
    {
      icon: Lightbulb,
      title: 'Continuous Innovation',
      desc: 'We leverage AI-powered resume matching and smart search tools to simplify hiring workflows and accelerate professional careers.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-800 overflow-hidden">
      {/* ── HERO / INTRO SECTION ── */}
      <section className="relative px-4 py-14 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle ambient blur */}
        <div className="pointer-events-none absolute -top-24 left-1/4 -z-10 h-80 w-80 rounded-full bg-orange-500/10 blur-[100px]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Professional Photography Showcase */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: -30 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:col-span-6 relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 p-2 shadow-xl shadow-slate-900/10">
              <img
                src={aboutimg}
                alt="QuickJobs team working together"
                className="w-full h-[380px] sm:h-[440px] object-cover rounded-2xl transition-transform duration-500 hover:scale-102"
              />
              {/* Badge overlay */}
              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-slate-900/85 p-4 shadow-lg backdrop-blur-md text-white flex items-center gap-3.5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                  <Target size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">Next-Generation Recruitment</p>
                  <p className="text-xs text-slate-300">Empowering 10,000+ candidates globally</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right: Narrative & Mission */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 25 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 shadow-2xs">
              <Compass size={13} className="text-orange-500" />
              Our Story &amp; Purpose
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-tight">
              {heroTitle}
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-700 font-medium">
              {heroDescription}
            </p>

            <div className="mt-6 space-y-4 text-sm sm:text-base leading-relaxed text-slate-600 border-l-2 border-orange-400/40 pl-5">
              <p>{missionDescription}</p>
              <p>{visionDescription}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── VALUES SECTION ── */}
      <section className="bg-slate-50/80 py-16 sm:py-20 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 shadow-2xs mb-3">
              <Sparkles size={13} className="text-orange-500" />
              Principles
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {valuesHeading}
            </h2>
            <p className="mt-2 text-base text-slate-600">
              The values that define how we build products, support talent, and empower employers.
            </p>
          </motion.div>

          <motion.div
            variants={prefersReducedMotion ? undefined : containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {coreValues.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={index}
                  variants={prefersReducedMotion ? undefined : itemVariants}
                  whileHover={prefersReducedMotion ? undefined : cardHoverVariants.hover}
                  className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs hover:shadow-lg hover:border-orange-200 transition-colors"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${value.bg} ${value.color} mb-5`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2.5">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{value.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── LOCATION & REACH OUT SECTION ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-orange-600 shadow-2xs mb-3">
            <MapPin size={13} className="text-orange-500" />
            Connect Locally &amp; Globally
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {contactHeading}
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Find our headquarters on the map or send us a direct message below.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Google Maps Embed */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 h-[420px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm"
          >
            <iframe
              title="QuickJobs Company Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.024359011829!2d85.3239607752413!3d27.717245824165795!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb1909b0f4ab05%3A0xe57f5f3b6d4b3a55!2sKathmandu!5e0!3m2!1sen!2snp!4v1629198745864!5m2!1sen!2snp"
              width="100%"
              height="100%"
              className="border-0 w-full h-full"
              allowFullScreen
              loading="lazy"
            />
          </motion.div>

          {/* Quick Inquiry Form */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-2">Send an Inquiry</h3>
            <p className="text-sm text-slate-500 mb-6">We typically respond to inquiries within 24 hours.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Thank you for your message! Our team will contact you soon.');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-900 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 px-6 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <Send size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                <span>Send Message</span>
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
