import React from 'react';
import StarFooter from '../../assets/quickjobs.png';
import { 
  Home, 
  User, 
  BriefcaseIcon, 
  Linkedin, 
  Facebook, 
  Twitter, 
  Mail, 
  ArrowRight,
  ShieldCheck,
  FileText,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

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
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all duration-200"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all duration-200"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all duration-200"
              >
                <Twitter size={18} />
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