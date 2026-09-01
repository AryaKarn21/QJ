import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Home, BriefcaseIcon, Info, FileText, Mail, Users,
  ChevronDown, SparkleIcon, MessageCircle, X, ArrowRight,
  Grid, LogOut, LayoutDashboard, User, Settings, Newspaper,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StarLogo from '../../assets/quickjobs.png';
import { jwtDecode } from 'jwt-decode';
import { NotificationBell } from '../notifications/NotificationBell';
import { fetchJobCategories } from '../../api/jobCategoryApi';
import { fetchPublicProfile } from '../../api/followApi';

interface DecodedToken {
  id: string;
  role: 'jobseeker' | 'employer' | 'admin';
  exp: number;
  name?: string;
}

const NAV_ITEMS = [
  { name: 'Home', icon: <Home size={18} />, path: '/' },
  { name: 'Job Listings', icon: <BriefcaseIcon size={18} />, path: '/jobs' },
  { name: 'Community', icon: <Users size={18} />, path: '/community' },
  { name: 'Resume Builder', icon: <FileText size={18} />, path: '/resume' },
  { name: 'Blog', icon: <Newspaper size={18} />, path: '/blog' },
  { name: 'About Us', icon: <Info size={18} />, path: '/about' },
  { name: 'Contact', icon: <Mail size={18} />, path: '/contact' },
];

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

const Header: React.FC = () => {
  const [isJobsDropdownOpen, setIsJobsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; role: string; avatar?: string } | null>(null);
  // Real, admin-managed categories (backend/models/JobCategory.js) — this
  // dropdown used to hard-code its own copy of the list, so a category
  // created via the admin panel's Job Category Management never actually
  // appeared here (or anywhere a job could be tagged with it).
  const [jobCategories, setJobCategories] = useState<string[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadUser = () => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLoggedIn(false); setUserInfo(null); return; }
    try {
      const decoded: DecodedToken = jwtDecode(token);
      setIsLoggedIn(true);

      // The JWT deliberately only carries id/role (see
      // authController.js's generateToken), so name/avatar were never
      // actually available here — `userProfile` in localStorage was read
      // but nothing in the app ever wrote it, so this always fell through
      // to a blank name and a "?" avatar for every user, every session.
      // Paint the cached copy first (if this tab already fetched one this
      // session) for an instant, flash-free header, then refresh it from
      // the real profile — the same role-agnostic endpoint the Community
      // module's own profile pages use, so it works for every role
      // without a separate admin/employer/jobseeker branch here.
      const cachedProfile = localStorage.getItem('userProfile');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.id === decoded.id) {
            setUserInfo({ name: parsed.name || '', role: decoded.role, avatar: parsed.avatar || '' });
          }
        } catch { /* ignore a corrupt cache entry */ }
      }

      fetchPublicProfile(decoded.id)
        .then((profile) => {
          const fresh = { id: decoded.id, name: profile.name || '', avatar: profile.avatar || '' };
          localStorage.setItem('userProfile', JSON.stringify(fresh));
          setUserInfo({ name: fresh.name, role: decoded.role, avatar: fresh.avatar });
        })
        .catch(() => { /* keep whatever was already set (cache or blank) — not fatal */ });
    } catch { setIsLoggedIn(false); setUserInfo(null); }
  };

  useEffect(() => { loadUser(); }, [location.pathname]);

  useEffect(() => {
    fetchJobCategories()
      .then((cats) => setJobCategories(cats.map((c) => c.name)))
      .catch((err) => console.error('Failed to fetch job categories', err));
  }, []);

  useEffect(() => {
    const handleAuthChange = () => loadUser();
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsJobsDropdownOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsJobsDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Background scroll lock while the mobile drawer is open — without this,
  // the page behind it keeps scrolling on touch, which reads as broken on
  // a real phone even though the drawer itself renders correctly.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isMobileMenuOpen]);

  // Escape closes whichever menu/dropdown is open — keyboard users
  // currently have no way to dismiss these other than clicking away.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsMobileMenuOpen(false);
      setIsJobsDropdownOpen(false);
      setIsProfileDropdownOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleCategoryClick = (categoryName: string) => {
    const query = encodeURIComponent(categoryName);
    setIsJobsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate(`/jobs?q=${query}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
    setIsLoggedIn(false);
    setUserInfo(null);
    setIsProfileDropdownOpen(false);
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!userInfo) return '/';
    if (userInfo.role === 'employer') return '/employer/dashboard';
    if (userInfo.role === 'admin') return '/admin/dashboard';
    return '/user/dashboard';
  };

  const getProfilePath = () => {
    if (!userInfo) return '/';
    if (userInfo.role === 'employer') return '/employer/profile';
    if (userInfo.role === 'admin') return '/admin/dashboard';
    return '/user/profile';
  };

  // Every role has a real Settings page (Change Password lives on all of
  // them) — previously only jobseeker got a Settings entry in this menu,
  // and it opened a Sidebar drawer instead of navigating here.
  const getSettingsPath = () => {
    if (!userInfo) return '/';
    if (userInfo.role === 'employer') return '/employer/settings';
    if (userInfo.role === 'admin' || userInfo.role === 'superadmin') return '/admin/settings';
    return '/user/settings';
  };

  const initial = userInfo?.name?.charAt(0)?.toUpperCase() || '?';

  // Role label
  const roleLabel = userInfo?.role === 'jobseeker' ? 'Job Seeker'
    : userInfo?.role === 'employer' ? 'Employer'
    : userInfo?.role === 'admin' ? 'Admin'
    : '';

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ease-in-out ${
      scrolled
        ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm shadow-slate-900/5 py-0'
        : 'bg-white/95 backdrop-blur-md border-b border-slate-100 py-1'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 transition-all duration-300">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 shrink-0 group focus:outline-none">
            <div className="relative overflow-hidden p-1 rounded-xl transition-transform duration-300 group-hover:scale-105 active:scale-95">
              <img src={StarLogo} alt="QuickJobs Logo" className="h-9 w-auto sm:h-11 object-contain drop-shadow-sm transition-all duration-300" />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-1.5 bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
            {NAV_ITEMS.map((item) => {
              const isHome = item.path === '/';
              const isActive = isHome ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return (
                <Link key={item.name} to={item.path}
                  className={`px-3.5 py-2 text-xs xl:text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 group relative ${
                    isActive ? 'bg-white text-primary font-semibold shadow-sm border border-slate-200/60 scale-[1.02]' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}>
                  <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-700'}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Categories Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button type="button" onClick={() => setIsJobsDropdownOpen(!isJobsDropdownOpen)}
                className={`px-3.5 py-2 text-xs xl:text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 border ${
                  isJobsDropdownOpen ? 'bg-white text-slate-900 shadow-sm border-slate-200/80' : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/70'
                }`}>
                <SparkleIcon size={18} className="text-amber-500 fill-amber-400/20 animate-pulse" />
                <span>Categories</span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform duration-300 ${isJobsDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
              </button>

              {isJobsDropdownOpen && (
                <div className="absolute right-0 lg:left-1/2 lg:-translate-x-1/2 mt-3 w-screen max-w-3xl bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200/80 p-5 z-50">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><Grid className="w-4 h-4" /></div>
                      <h3 className="font-semibold text-slate-900 text-sm">Explore Job Categories</h3>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{jobCategories.length} Categories</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-[55vh] overflow-y-auto pr-1">
                    {jobCategories.map((category) => (
                      <button key={category} type="button" onClick={() => handleCategoryClick(category)}
                        className="group flex items-center justify-between text-left px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-150">
                        <span className="truncate pr-2 font-medium">{category}</span>
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-2.5">
            {!isLoggedIn ? (
              <div className="hidden sm:flex items-center space-x-2">
                <Link to="/login" className="px-4 py-2.5 text-xs xl:text-sm font-semibold text-slate-700 hover:text-primary hover:bg-slate-100/80 rounded-xl transition-all duration-200">
                  Log In
                </Link>
                <Link to="/signup" className="relative group inline-flex items-center justify-center px-4 sm:px-5 py-2.5 text-xs xl:text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-primary/25 transition-all duration-200 active:scale-95">
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>Register</span>
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                {/* Messages */}
                <Link to="/messages" aria-label="Messages"
                  className="p-2.5 text-slate-600 hover:text-primary hover:bg-slate-100/80 rounded-xl transition-all duration-200 active:scale-95">
                  <MessageCircle size={20} />
                </Link>

                {/* Notifications */}
                <div className="p-1 rounded-xl hover:bg-slate-100/80 transition-all duration-200">
                  <NotificationBell />
                </div>

                {/* ── Profile Avatar Dropdown ── */}
                <div className="relative ml-1" ref={profileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl border border-slate-200/80 hover:border-primary/30 hover:bg-slate-50 transition-all duration-200 active:scale-95"
                    aria-label="Profile menu"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                      {userInfo?.avatar ? (
                        <img
                          src={`${MEDIA_URL.replace(/\/$/, '')}/${userInfo.avatar.replace(/^\//, '')}`}
                          alt={userInfo.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-bold">{initial}</span>
                      )}
                    </div>
                    {/* Name — only on larger screens. The role badge that
                        used to sit under it here was removed; it still
                        appears once, inside the opened dropdown header
                        below, where it reads as account context rather
                        than a persistent label. */}
                    <div className="hidden xl:block text-left">
                      <p className="text-xs font-semibold text-slate-800 leading-tight max-w-[100px] truncate">{userInfo?.name}</p>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile dropdown */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden z-50">
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-orange-50/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                            {userInfo?.avatar ? (
                              <img
                                src={`${MEDIA_URL.replace(/\/$/, '')}/${userInfo.avatar.replace(/^\//, '')}`}
                                alt={userInfo.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-base font-bold">{initial}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{userInfo?.name}</p>
                            <p className="text-xs text-primary font-medium">{roleLabel}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="py-1.5">
                        <button onClick={() => { navigate(getDashboardPath()); setIsProfileDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                          <LayoutDashboard size={16} className="text-slate-400" />
                          <span className="font-medium">Dashboard</span>
                        </button>

                        <button onClick={() => { navigate(getProfilePath()); setIsProfileDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                          <User size={16} className="text-slate-400" />
                          <span className="font-medium">My Profile</span>
                        </button>

                        <button onClick={() => { navigate('/messages'); setIsProfileDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                          <MessageCircle size={16} className="text-slate-400" />
                          <span className="font-medium">Messages</span>
                        </button>

                        {userInfo?.role === 'jobseeker' && (
                          <button onClick={() => { navigate('/resume'); setIsProfileDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                            <FileText size={16} className="text-slate-400" />
                            <span className="font-medium">Resume Builder</span>
                          </button>
                        )}

                        {/* Was jobseeker-only and opened a Sidebar drawer
                            instead of navigating; every role has a real
                            Settings page (Change Password included), so
                            this is now available everywhere and goes
                            straight there. */}
                        <button onClick={() => { navigate(getSettingsPath()); setIsProfileDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                          <Settings size={16} className="text-slate-400" />
                          <span className="font-medium">Settings</span>
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-slate-100 py-1.5">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                          <LogOut size={16} />
                          <span className="font-medium">Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile hamburger */}
            <button type="button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2.5 text-slate-700 hover:text-primary hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all duration-200 active:scale-95"
              aria-label="Toggle Mobile Menu" aria-expanded={isMobileMenuOpen} aria-controls="mobile-nav-menu">
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div id="mobile-nav-menu" role="navigation" aria-label="Mobile" className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 pt-3 pb-6 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const isHome = item.path === '/';
              const isActive = isHome ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return (
                <Link key={item.name} to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive ? 'bg-primary/10 text-primary font-semibold shadow-sm' : 'text-slate-700 hover:bg-slate-100/80'
                  }`}>
                  <span className={isActive ? 'text-primary' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Mobile profile links when logged in */}
            {isLoggedIn && (
              <div className="pt-3 mt-2 border-t border-slate-100 space-y-1.5">
                <button onClick={() => { navigate(getDashboardPath()); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100/80">
                  <LayoutDashboard size={18} className="text-slate-400" /> Dashboard
                </button>
                <button onClick={() => { navigate(getProfilePath()); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100/80">
                  <User size={18} className="text-slate-400" /> My Profile
                </button>
                <button onClick={() => { navigate(getSettingsPath()); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100/80">
                  <Settings size={18} className="text-slate-400" /> Settings
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
                  <LogOut size={18} /> Log Out
                </button>
              </div>
            )}

            {!isLoggedIn && (
              <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-2.5">
                <Link to="/login" className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all duration-150">
                  Log In
                </Link>
                <Link to="/signup" className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-primary/20 transition-all duration-150 active:scale-95">
                  <span>Register Account</span><ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};

export default Header;