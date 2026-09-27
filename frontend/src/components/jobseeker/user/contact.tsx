import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, CheckCircle2, Clock, Send, ShieldAlert, Sparkles, MapPin } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { submitTicket } from '../../../api/supportApi';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const Contact = () => {
  const isLoggedIn = !!localStorage.getItem('token');
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoggedIn && (!name.trim() || !email.trim())) {
      setError('Please fill in your name and email.');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in a subject and message.');
      return;
    }

    setSubmitting(true);
    try {
      await submitTicket({
        name: isLoggedIn ? undefined : name,
        email: isLoggedIn ? undefined : email,
        subject,
        message,
        category,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      setError('Something went wrong submitting your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center bg-slate-50/50 px-6 py-16 text-center">
        <motion.div
          initial={prefersReducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-sm"
        >
          <CheckCircle2 size={44} />
        </motion.div>
        <motion.h1
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900"
        >
          Message Received
        </motion.h1>
        <motion.p
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-2.5 max-w-md text-base leading-relaxed text-slate-600"
        >
          Thanks for reaching out! Our support team will get back to you shortly at{' '}
          <span className="font-semibold text-slate-900">{isLoggedIn ? 'your account email' : email}</span>.
        </motion.p>
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
        >
          {isLoggedIn ? (
            <Link
              to="/user/support"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg active:scale-95"
            >
              View My Support Tickets
            </Link>
          ) : (
            <button
              onClick={() => {
                setSubmitted(false);
                setSubject('');
                setMessage('');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg active:scale-95 cursor-pointer"
            >
              Send Another Message
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 active:scale-95"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-slate-50/60 px-4 py-12 sm:px-6 lg:px-8">
      {/* Subtle background ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 -z-10 h-80 w-80 rounded-full bg-sky-500/10 blur-[90px]" />

      <motion.div
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-4xl"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 shadow-2xs">
            <Sparkles size={13} className="text-orange-500" />
            Support &amp; Assistance
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Get in Touch With Us
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
            Have questions about jobs, employer accounts, or your resume? Send our support team a direct message.
          </p>
        </motion.div>

        {/* Info Highlights Row */}
        <motion.div
          variants={itemVariants}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Us</p>
              <p className="text-sm font-semibold text-slate-800">support@quickjobs.com</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Response Time</p>
              <p className="text-sm font-semibold text-slate-800">Within 24 Hours</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Office</p>
              <p className="text-sm font-semibold text-slate-800">Kathmandu, Nepal</p>
            </div>
          </div>
        </motion.div>

        {/* Contact Form Card */}
        <motion.div
          variants={itemVariants}
          className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-900/5 sm:p-10"
        >
          <div className="mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <MessageSquare size={20} className="text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900">Send Support Ticket</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoggedIn && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Your Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Topic / Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                >
                  <option value="general">General Question</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing &amp; Payments</option>
                  <option value="account">Account &amp; Security</option>
                  <option value="job_posting">Job Postings</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="How can we help? Please describe details so we can assist you quickly..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <ShieldAlert size={18} className="shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 px-6 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
            >
              <Send size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              <span>{submitting ? 'Sending Message…' : 'Submit Message'}</span>
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Contact;