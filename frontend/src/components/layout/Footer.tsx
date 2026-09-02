import React from 'react';
import StarFooter from '../../assets/quickjobs.png';
import {
  Home,
  User,
  BriefcaseIcon,
  Linkedin,
  Facebook,
  Mail,
  ArrowRight,
  ShieldCheck,
  FileText,
  HelpCircle
} from 'lucide-react';

// lucide-react has no WhatsApp glyph, so it's a small inline brand SVG
// sized/styled to match the other footer social icons.
const WhatsappIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.47 1.29 4.92L2 22l5.29-1.38a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.13.08-1.83-.11-.42-.12-.96-.3-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.36-.15-.2-1.18-1.56-1.18-2.98 0-1.41.74-2.11 1-2.4.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.15.11.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.61-.07.17-.2.72-.84.91-1.13.19-.28.38-.24.63-.14.26.09 1.65.78 1.94.92.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
  </svg>
);
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { FooterTestimonials } from './FooterTestimonials';

interface DecodedToken {
  id: string;
  role: 'jobseeker' | 'employer' | 'admin' | 'superadmin';
  exp: number;
}

const Footer: React.FC = () => {
  const navigate = useNavigate();

  // Check authentication and role
  const token = localStorage.getItem('token');
  let role: string | null = null;
  let isAuthenticated = false;

  if (token) {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      // Check if token expired
      if (decoded.exp * 1000 > Date.now()) {
        isAuthenticated = true;
        role = decoded.role;
      }
    } catch (error) {
      console.error('Invalid token', error);
    }
  }

  const handleProtectedNavigation = (path: string, allowedRole: string) => {
    if (isAuthenticated && role === allowedRole) {
      navigate(path);
    } else {
      alert('Access denied. Please log in with the correct account.');
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <footer className="relative bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-16 pb-12 overflow-hidden select-none">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-r from-blue-600/10 via-indigo-500/10 to-purple-600/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-slate-800/80">
          
          {/* Brand & Mission (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="mb-6 flex items-center">
                <img 
                  src={StarFooter} 
                  alt="QuickJobs Logo" 
                  className="h-14 w-auto object-contain cursor-pointer transition-opacity hover:opacity-90" 
                  onClick={() => navigate('/')}
                />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                Empowering talent and connecting industry leaders through seamless job discovery, real-time insights, and modern recruitment tools.
              </p>
            </div>

            {/* Social Icons */}
            <div className="mt-6 flex items-center space-x-3">
              <a
                href="https://www.linkedin.com/company/quickjobsservices/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all duration-200"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://www.facebook.com/share/1HvvtE1VLv/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all duration-200"
              >
                <Facebook size={18} />
              </a>
              <a
                href="https://web.whatsapp.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all duration-200"
              >
                <WhatsappIcon size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links & Company (2 Columns) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Company
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center text-slate-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                >
                  <Home size={15} className="mr-2 text-slate-500" />
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/jobs')}
                  className="flex items-center text-slate-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                >
                  <BriefcaseIcon size={15} className="mr-2 text-slate-500" />
                  Job Listings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/about')}
                  className="flex items-center text-slate-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                >
                  <User size={15} className="mr-2 text-slate-500" />
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/blog')}
                  className="flex items-center text-slate-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                >
                  <FileText size={15} className="mr-2 text-slate-500" />
                  Blog
                </button>
              </li>
            </ul>
          </div>

          {/* For Job Seekers (2 Columns) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Job Seekers
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/resume')}
                  className="text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Build your CV
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/jobs')}
                  className="text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Find Jobs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleProtectedNavigation('/user/dashboard', 'jobseeker')}
                  className="text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Jobseeker Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* For Job Providers (2 Columns) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Employers
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleProtectedNavigation('/employer/postjob', 'employer')}
                  className="text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Post Jobs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleProtectedNavigation('/employer/insight', 'employer')}
                  className="text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Insights
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleProtectedNavigation('/employer/dashboard', 'employer')}
                  className="text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Employer Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscription (2 Columns / Full Width on Small Screens) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Newsletter
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Subscribe to get job alerts and hiring trends.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <span>Subscribe</span>
                <ArrowRight size={13} />
              </button>
            </form>
          </div>

        </div>

        {/* Renders nothing until a real testimonial has been published
            (Admin > Content > Testimonials), same as the homepage's
            Testimonials.tsx. Sits above the copyright bar, on purpose. */}
        <FooterTestimonials />

        {/* Bottom Bar & Legal Support Links */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">

          <p>© {new Date().getFullYear()} Star Euro Group. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <FileText size={14} />
              <span>Terms of Service</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/community-guidelines')}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>Community Guidelines</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/faq')}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <HelpCircle size={14} />
              <span>FAQ</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/career-tips')}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <FileText size={14} />
              <span>Career Tips</span>
            </button>
            {/* Was navigate('/support') — no such top-level route exists
                (only the jobseeker-only, auth-gated /user/support ticket
                page). /contact is the real, public "get help" page. */}
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <HelpCircle size={14} />
              <span>Support</span>
            </button>
          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;