import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Home, BriefcaseIcon, Info, FileText, Mail, Users,
  ChevronDown, SparkleIcon, MessageCircle, X, ArrowRight,
  Grid, LogOut, LayoutDashboard, User, Settings, Newspaper, Search,
  Bell,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StarLogo from '../../assets/quickjobs.png';
import { jwtDecode } from 'jwt-decode';
import { NotificationBell } from '../notifications/NotificationBell';
import { fetchJobCategories } from '../../api/jobCategoryApi';
import { fetchPublicProfile } from '../../api/followApi';
import HeaderSearch from './HeaderSearch';
import { resolveMediaUrl } from '../../utils/mediaUrl';

interface DecodedToken {
  id: string;
  role: 'jobseeker' | 'employer' | 'admin';
  exp: number;
  name?: string;
}

const NAV_ITEMS = [
  { name: 'Home',           icon: <Home size={18} />,          path: '/'        },
  { name: 'Job Listings',   icon: <BriefcaseIcon size={18} />, path: '/jobs'    },
  { name: 'Community',      icon: <Users size={18} />,         path: '/community'},
  { name: 'Resume Builder', icon: <FileText size={18} />,      path: '/resume'  },
  { name: 'Blog',           icon: <Newspaper size={18} />,     path: '/blog'    },
  { name: 'About Us',       icon: <Info size={18} />,          path: '/about'   },
  { name: 'Contact',        icon: <Mail size={18} />,          path: '/contact' },
];

// Bottom tab bar — Community first (as requested), icon-only, LinkedIn flow.
// Resume Builder excluded here (shown in non-sticky nav only per requirement).
const BOTTOM_TABS = [
  { name: 'Community', icon: Users,          path: '/community' },
  { name: 'Home',      icon: Home,           path: '/'          },
  { name: 'Jobs',      icon: BriefcaseIcon,  path: '/jobs'      },
  { name: 'Messages',  icon: MessageCircle,  path: '/messages'  },
  { name: 'Profile',   icon: User,           path: null         }, // opens profile menu
];

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

const Header: React.FC = () => {
  const [isJobsDropdownOpen, setIsJobsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; role: string; avatar?: string } | null>(null);
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
      const cachedProfile = localStorage.getItem('userProfile');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.id === decoded.id) {
            setUserInfo({ name: parsed.name || '', role: decoded.role, avatar: parsed.avatar || '' });
          }
        } catch { /* ignore corrupt cache */ }
      }
      fetchPublicProfile(decoded.id)
        .then((profile) => {
          const fresh = { id: decoded.id, name: profile.name || '', avatar: profile.avatar || '' };
          localStorage.setItem('userProfile', JSON.stringify(fresh));
          setUserInfo({ name: fresh.name, role: decoded.role, avatar: fresh.avatar });
        })
        .catch(() => { /* keep cache */ });
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
    setIsMobileProfileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setIsJobsDropdownOpen(false);
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node))
        setIsProfileDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    if (!isMobileMenuOpen && !isMobileProfileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isMobileMenuOpen, isMobileProfileOpen]);
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsMobileMenuOpen(false);
      setIsJobsDropdownOpen(false);
      setIsProfileDropdownOpen(false);
      setIsMobileProfileOpen(false);
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
    setIsMobileProfileOpen(false);
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
  const getSettingsPath = () => {
    if (!userInfo) return '/';
    if (userInfo.role === 'employer') return '/employer/settings';
    if (userInfo.role === 'admin' || userInfo.role === 'superadmin') return '/admin/settings';
    return '/user/settings';
  };

  const initial = userInfo?.name?.charAt(0)?.toUpperCase() || '?';
  const roleLabel = userInfo?.role === 'jobseeker' ? 'Job Seeker'
    : userInfo?.role === 'employer' ? 'Employer'
    : userInfo?.role === 'admin' ? 'Admin' : '';

  return (
    <>
      {/* ── TOP HEADER (visible on all screens, but minimal on mobile) ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm shadow-slate-900/5 py-0'
          : 'bg-white/95 backdrop-blur-md border-b border-slate-100 py-1'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20 transition-all duration-300">

            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0 group focus:outline-none">
              <div className="relative overflow-hidden p-1 rounded-xl transition-transform duration-300 group-hover:scale-105 active:scale-95">
                <img src={StarLogo} alt="QuickJobs Logo" className="h-8 w-auto sm:h-10 lg:h-11 object-contain drop-shadow-sm" />
              </div>
            </Link>

            {/* Search — desktop */}
            {isLoggedIn && (
              <HeaderSearch className="hidden md:block md:w-52 lg:w-64 xl:w-80 mx-2" suggestionSeeds={jobCategories} />
            )}

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

            {/* Right side — desktop */}
            <div className="flex items-center space-x-2">
              {!isLoggedIn ? (
                <>
                  {/* Desktop login/register */}
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
                  {/* Mobile: hamburger for not-logged-in */}
                  <button type="button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden p-2.5 text-slate-700 hover:text-primary hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all duration-200 active:scale-95"
                    aria-label="Toggle Mobile Menu">
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                  </button>
                </>
              ) : (
                <>
                  {/* Desktop: messages + notifications + profile */}
                  <div className="hidden lg:flex items-center space-x-1.5">
                    <Link to="/messages" aria-label="Messages"
                      className="p-2.5 text-slate-600 hover:text-primary hover:bg-slate-100/80 rounded-xl transition-all duration-200 active:scale-95">
                      <MessageCircle size={20} />
                    </Link>
                    <div className="p-1 rounded-xl hover:bg-slate-100/80 transition-all duration-200">
                      <NotificationBell />
                    </div>
                    <div className="relative ml-1" ref={profileDropdownRef}>
                      <button type="button"
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl border border-slate-200/80 hover:border-primary/30 hover:bg-slate-50 transition-all duration-200 active:scale-95"
                        aria-label="Profile menu">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                          {userInfo?.avatar ? (
                            <img src={resolveMediaUrl(userInfo.avatar)} alt={userInfo.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">{initial}</span>
                          )}
                        </div>
                        <div className="hidden xl:block text-left">
                          <p className="text-xs font-semibold text-slate-800 leading-tight max-w-[100px] truncate">{userInfo?.name}</p>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden z-50">
                          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-orange-50/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                                {userInfo?.avatar ? (
                                  <img src={resolveMediaUrl(userInfo.avatar)} alt={userInfo.name} className="w-full h-full object-cover" />
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
                          <div className="py-1.5">
                            <button onClick={() => { navigate(getDashboardPath()); setIsProfileDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                              <LayoutDashboard size={16} className="text-slate-400" /><span className="font-medium">Dashboard</span>
                            </button>
                            <button onClick={() => { navigate(getProfilePath()); setIsProfileDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                              <User size={16} className="text-slate-400" /><span className="font-medium">My Profile</span>
                            </button>
                            <button onClick={() => { navigate('/messages'); setIsProfileDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                              <MessageCircle size={16} className="text-slate-400" /><span className="font-medium">Messages</span>
                            </button>
                            {userInfo?.role === 'jobseeker' && (
                              <button onClick={() => { navigate('/resume'); setIsProfileDropdownOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                                <FileText size={16} className="text-slate-400" /><span className="font-medium">Resume Builder</span>
                              </button>
                            )}
                            <button onClick={() => { navigate(getSettingsPath()); setIsProfileDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors text-left">
                              <Settings size={16} className="text-slate-400" /><span className="font-medium">Settings</span>
                            </button>
                          </div>
                          <div className="border-t border-slate-100 py-1.5">
                            <button onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                              <LogOut size={16} /><span className="font-medium">Log Out</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile top bar right: only search + notification bell */}
                  <div className="flex lg:hidden items-center gap-1">
                    <Link to="/community/search" aria-label="Search"
                      className="p-2 text-slate-600 hover:text-primary hover:bg-slate-100/80 rounded-xl transition-all duration-200 active:scale-95">
                      <Search size={20} />
                    </Link>
                    <div className="p-1 rounded-xl hover:bg-slate-100/80 transition-all duration-200">
                      <NotificationBell />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile hamburger menu — only for NOT logged-in users */}
        {isMobileMenuOpen && !isLoggedIn && (
          <div className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-slate-200/80 shadow-2xl max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
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
              <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-2.5">
                <Link to="/login" className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all duration-150">Log In</Link>
                <Link to="/signup" className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-primary/20 transition-all duration-150 active:scale-95">
                  <span>Register Account</span><ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── LINKEDIN-STYLE BOTTOM TAB BAR (mobile, logged-in only) ── */}
      {isLoggedIn && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Mobile navigation"
        >
          <div className="flex items-stretch h-14">
            {BOTTOM_TABS.map((tab) => {
              const Icon = tab.icon;
              // Profile tab — opens slide-up sheet
              if (!tab.path) {
                return (
                  <button
                    key={tab.name}
                    onClick={() => setIsMobileProfileOpen(true)}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-500 active:bg-slate-50 transition-colors"
                    aria-label="Profile menu"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                      {userInfo?.avatar ? (
                        <img src={resolveMediaUrl(userInfo.avatar)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{initial}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium">Me</span>
                  </button>
                );
              }
              const isHome = tab.path === '/';
              const isActive = isHome ? location.pathname === '/' : location.pathname.startsWith(tab.path);
              return (
                <Link
                  key={tab.name}
                  to={tab.path}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-slate-50 ${
                    isActive ? 'text-primary' : 'text-slate-500'
                  }`}
                  aria-label={tab.name}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : ''}`}>{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* ── MOBILE PROFILE SLIDE-UP SHEET ── */}
      {isMobileProfileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end"
          onClick={() => setIsMobileProfileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-2xl shadow-2xl max-h-[80dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* user card */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0 shadow">
                {userInfo?.avatar ? (
                  <img src={resolveMediaUrl(userInfo.avatar)} alt={userInfo?.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-lg font-bold">{initial}</span>
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900">{userInfo?.name}</p>
                <p className="text-sm text-primary font-medium">{roleLabel}</p>
              </div>
            </div>

            {/* actions */}
            <div className="py-2">
              {[
                { icon: LayoutDashboard, label: 'Dashboard',      action: () => { navigate(getDashboardPath()); setIsMobileProfileOpen(false); } },
                { icon: User,           label: 'My Profile',      action: () => { navigate(getProfilePath()); setIsMobileProfileOpen(false); } },
                { icon: FileText,       label: 'Resume Builder',  action: () => { navigate('/resume'); setIsMobileProfileOpen(false); }, jobseekerOnly: true },
                { icon: Settings,       label: 'Settings',        action: () => { navigate(getSettingsPath()); setIsMobileProfileOpen(false); } },
              ].filter(item => !('jobseekerOnly' in item && item.jobseekerOnly) || userInfo?.role === 'jobseeker')
               .map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
                  <Icon size={20} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-[15px]">{label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 py-2">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-left">
                <LogOut size={20} className="shrink-0" />
                <span className="font-medium text-[15px]">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;