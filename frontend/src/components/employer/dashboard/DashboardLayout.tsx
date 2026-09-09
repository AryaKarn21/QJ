/**
 * PATH: src/components/employer/dashboard/DashboardLayout.tsx
 *
 * Quick Jobs — Employer Dashboard Layout
 * Recolored to match the actual QuickJobs logo (orange clock + blue
 * briefcase) and the palette already established across Profile.tsx /
 * Settings.tsx (#F97316 primary, warm cream page background) — the
 * original pasted-in version used a teal (#0E9E8A) palette that clashed
 * with the rest of the employer module.
 */

import logo from '../../../assets/quickjobs.png';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Briefcase, FileText,
  Users, CalendarDays, Bookmark, MessageSquare,
  BarChart3, Building2, CreditCard, Settings, Tags,
  LogOut, ChevronRight, Bell, Search, Download,
  Menu, X, Calendar, MessageCircle, Users2, Home, User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Nav tree ─────────────────────────────────────────────────────────
// Candidates / Interviews / Saved Candidates / Subscription don't have a
// real feature behind them yet — they route to a ComingSoon placeholder
// (registered in App.tsx) rather than being dead links that 404.
// Messages is a global, role-agnostic feature (not employer-scoped), so
// it lives at /messages, not /employer/messages.
// 'Home' is the one item that intentionally leaves the dashboard —
// it goes to the public job-seeker-facing site ("/"), not an
// /employer/* route, so employers can jump back to the main site.
const NAV_SECTIONS = [
  {
    label: 'Hiring',
    items: [
      { path: '/',                     icon: Home,             label: 'Home'              },
      { path: '/employer/dashboard',   icon: LayoutDashboard, label: 'Dashboard'         },
      { path: '/employer/postjob',     icon: PlusCircle,      label: 'Post a Job'        },
      { path: '/employer/joblist',     icon: Briefcase,       label: 'Manage Jobs'       },
      { path: '/employer/applicants',  icon: FileText,        label: 'Applications'      },
      { path: '/employer/candidates',  icon: Users,           label: 'Candidates'        },
      { path: '/employer/interviews',  icon: CalendarDays,    label: 'Interviews'        },
      { path: '/employer/saved',       icon: Bookmark,        label: 'Saved Candidates'  },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/messages',             icon: MessageSquare,   label: 'Messages' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { path: '/employer/insight',      icon: BarChart3,  label: 'Reports & Analytics' },
      { path: '/employer/profile',      icon: Building2,  label: 'Company Profile'     },
      { path: '/employer/job-categories', icon: Tags,     label: 'Job Categories'      },
      { path: '/employer/subscription', icon: CreditCard, label: 'Subscription'        },
      { path: '/employer/settings',     icon: Settings,   label: 'Settings'            },
    ],
  },
];

// Brand palette — matches Profile.tsx / Settings.tsx exactly, and the
// orange in the actual logo. Kept as constants (rather than scattering
// hex literals through the JSX again) so re-theming later is a one-line
// change instead of a find-and-replace across the whole file.
const BRAND = {
  primary: '#F97316',       // orange-500 — matches the logo's clock
  primaryDark: '#EA580C',   // orange-600 — hover state
  primaryLight: '#FFEDD5',  // orange-100 — active nav background
  primaryHover: '#FFF7ED',  // orange-50 — nav hover background
  primaryShadow: 'rgba(249,115,22,.25)',
  gradient: 'linear-gradient(135deg,#F59E0B,#F97316)', // amber → orange, matches Profile.tsx's banner family
  pageBg: '#FFF8F3',        // warm cream, matches Profile.tsx's page background
};

// Static placeholder rows for the notification dropdown — there's no
// notifications API/model yet, so this is presentational only (per the
// design brief) rather than wired to real data.
const NOTIFICATIONS = [
  { id: 1, message: 'New application received', time: '2 min ago' },
  { id: 2, message: 'Interview scheduled', time: '1 hour ago' },
  { id: 3, message: 'Candidate accepted offer', time: 'Yesterday' },
];

const DashboardLayout = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [showLogout,    setShowLogout]    = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [hasUnread,     setHasUnread]     = useState(true);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close either dropdown when clicking outside of it.
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('authChange'));
    setShowLogout(false);
    setProfileOpen(false);
    navigate('/');
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  // Escape closes the drawer, and body scroll is locked while it's open —
  // otherwise the page behind a full-height mobile overlay keeps scrolling
  // underneath it, which reads as broken on a touch device.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[99] backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div style={{ display: 'flex', minHeight: '100dvh', background: BRAND.pageBg, fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* ══ SIDEBAR ═══════════════════════════════════════════════ */}
        <aside
          role="dialog"
          aria-modal={sidebarOpen || undefined}
          aria-label="Employer navigation"
          style={{
            position: 'fixed', top: 0, left: 0, height: '100dvh', width: 256,
            background: '#fff', borderRight: '1px solid #E5E7EB',
            boxShadow: '2px 0 24px rgba(0,0,0,.06)',
            display: 'flex', flexDirection: 'column', zIndex: 100,
            transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
          }}
          // The mobile media query below hides this off-screen with
          // `!important` — a plain inline `transform` (no `!important`)
          // can never win against that, so opening the drawer has to go
          // through the `.open` class (already defined below) rather than
          // an inline style, or the hamburger button would visibly do
          // nothing on mobile.
          className={`employer-sidebar${sidebarOpen ? ' open' : ''}`}
        >
          {/* Logo */}
          <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <img src={logo} alt="Quick Jobs" style={{ height: 46, width: 'auto', objectFit: 'contain' }} />
            <button
              style={{ display: 'none' }}
              className="sidebar-close-mobile"
              aria-label="Close menu"
              onClick={e => { e.stopPropagation(); setSidebarOpen(false); }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B', padding: '14px 10px 5px', display: 'block' }}>
                  {section.label}
                </p>
                {section.items.map(item => {
                  const Icon   = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 10, marginBottom: 2,
                        color: active ? BRAND.primary : '#64748B',
                        fontWeight: active ? 600 : 500, fontSize: 13.5,
                        textDecoration: 'none',
                        background: active ? BRAND.primaryLight : 'transparent',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = BRAND.primaryHover; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Icon size={17} style={{ flexShrink: 0, opacity: active ? 1 : .7 }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {active && <ChevronRight size={13} style={{ opacity: .5 }} />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* This dashboard shell has its own sidebar/navbar and never
              renders the main site Header (which has the Community link),
              so without this there's no way back to Community short of
              typing the URL. Kept visually distinct (dashed border) from
              the sections above — it's a link out of the dashboard. */}
          <div style={{ padding: '0 10px 6px' }}>
            <Link
              to="/community"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10,
                color: '#64748B', fontWeight: 500, fontSize: 13.5,
                textDecoration: 'none', border: '1px dashed #CBD5E1',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = BRAND.primaryHover}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Users2 size={17} />
              <span>Community</span>
            </Link>
          </div>

          {/* Upgrade card */}
          <div style={{ margin: '10px 10px 8px', borderRadius: 14, padding: 16, background: BRAND.gradient, color: '#fff', flexShrink: 0 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>⚡</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Upgrade to Pro</div>
            <div style={{ fontSize: 11.5, lineHeight: 1.5, opacity: .82, marginBottom: 12 }}>
              Post unlimited jobs, access AI candidate ranking & analytics.
            </div>
            <button style={{ background: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Upgrade Now →
            </button>
          </div>

          {/* Profile */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = BRAND.primaryHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,#FDBA74,${BRAND.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
              EM
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Employer</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Company Admin</div>
            </div>
            <button
              onClick={() => setShowLogout(true)}
              style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid transparent', color: '#64748B', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF1F2'; (e.currentTarget as HTMLElement).style.borderColor = '#FECACA'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </aside>

        {/* ══ NAVBAR ════════════════════════════════════════════════ */}
        <header style={{
          position: 'fixed', top: 0, left: 256, right: 0, height: 72,
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px',
          zIndex: 90,
        }} className="employer-navbar">

          {/* Mobile menu btn */}
          <button
            className="mobile-menu-btn-employer"
            aria-label="Open menu"
            style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: BRAND.pageBg, border: '1px solid #E5E7EB', color: '#64748B', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: BRAND.pageBg, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 14px', height: 40, maxWidth: 380, width: '100%', transition: 'all .15s' }}
            onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = BRAND.primary}
            onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'}
          >
            <Search size={15} color="#64748B" style={{ flexShrink: 0 }} />
            <input type="text" placeholder="Search jobs, candidates, applications…" style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13.5, color: '#111827', width: '100%', fontFamily: 'inherit' }} />
            <kbd style={{ fontSize: 10.5, color: '#64748B', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>⌘ K</kbd>
          </div>

          {/* People/company search (LinkedIn-style) — separate from the
              job/candidate search above; this dashboard has its own
              navbar (not the main site Header where that search lives),
              so it never appeared here at all. */}
          <Link to="/community/search" aria-label="Search people, companies, skills" title="Search people, companies, skills"
            style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.pageBg, border: '1px solid #E5E7EB', color: '#64748B', cursor: 'pointer', flexShrink: 0, transition: 'all .15s', textDecoration: 'none' }}>
            <Users2 size={17} />
          </Link>

          <div style={{ flex: 1 }} />

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 36, border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12.5, color: '#64748B', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Calendar size={13} />
            <span>{today}</span>
          </div>

          {/* Notification */}
          <div ref={notifRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              aria-label="Notifications"
              onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
              style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.pageBg, border: '1px solid #E5E7EB', color: '#64748B', cursor: 'pointer', position: 'relative', transition: 'all .15s' }}
            >
              <Bell size={17} />
              {hasUnread && (
                <span style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff' }} />
              )}
            </button>

            {notifOpen && (
              <div
                role="menu"
                aria-label="Notifications"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320,
                  background: '#fff', borderRadius: 16, boxShadow: '0 16px 40px rgba(0,0,0,.14)',
                  border: '1px solid #E5E7EB', zIndex: 110, overflow: 'hidden',
                  maxWidth: 'calc(100vw - 32px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Notifications</span>
                  <button
                    onClick={() => setHasUnread(false)}
                    style={{ background: 'none', border: 'none', color: BRAND.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                  >
                    Mark all read
                  </button>
                </div>

                <div>
                  {NOTIFICATIONS.map(n => (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderBottom: '1px solid #F8FAFC' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: BRAND.primary, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: '#111827', margin: 0 }}>{n.message}</p>
                        <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '2px 0 0' }}>{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setNotifOpen(false)}
                  style={{ width: '100%', textAlign: 'center', padding: '11px', background: BRAND.pageBg, border: 'none', borderTop: '1px solid #F1F5F9', color: BRAND.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          <Link to="/messages" aria-label="Messages" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.pageBg, border: '1px solid #E5E7EB', color: '#64748B', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'all .15s', textDecoration: 'none' }}>
            <MessageCircle size={17} />
          </Link>

          {/* Export */}
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 36, background: BRAND.gradient, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 2px 8px ${BRAND.primaryShadow}`, fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
          >
            <Download size={13} />
            Export
          </button>

          {/* Avatar */}
          <div ref={profileRef} style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
              style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,#FDBA74,${BRAND.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer' }}
            >
              EM
            </div>

            {profileOpen && (
              <div
                role="menu"
                aria-label="Profile menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 200,
                  background: '#fff', borderRadius: 16, boxShadow: '0 16px 40px rgba(0,0,0,.14)',
                  border: '1px solid #E5E7EB', zIndex: 110, overflow: 'hidden',
                  maxWidth: 'calc(100vw - 32px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,#FDBA74,${BRAND.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
                    EM
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Employer</div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>Company Admin</div>
                  </div>
                </div>

                <div style={{ padding: 6 }}>
                  <Link
                    to="/employer/profile"
                    onClick={() => setProfileOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, color: '#374151', fontSize: 13.5, fontWeight: 500, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = BRAND.primaryHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <User size={15} /> My Profile
                  </Link>
                  <Link
                    to="/employer/settings"
                    onClick={() => setProfileOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, color: '#374151', fontSize: 13.5, fontWeight: 500, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = BRAND.primaryHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <Settings size={15} /> Settings
                  </Link>
                  <div style={{ height: 1, background: '#F1F5F9', margin: '6px 4px' }} />
                  <button
                    onClick={() => { setProfileOpen(false); setShowLogout(true); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, color: '#EF4444', fontSize: 13.5, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFF1F2'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ══ MAIN ══════════════════════════════════════════════════ */}
        <main style={{ flex: 1, marginLeft: 256, paddingTop: 72, minHeight: '100dvh', background: BRAND.pageBg }} className="employer-main">
          <Outlet />
        </main>
      </div>

      {/* Logout modal */}
      {showLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
          onClick={() => setShowLogout(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 360, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.15)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🚪</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Sign out?</h2>
            <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.55, marginBottom: 24 }}>You'll need to sign back in to access the employer panel.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLogout(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: BRAND.pageBg, color: '#111827', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleLogout} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .employer-sidebar { transform: translateX(-256px) !important; padding-bottom: env(safe-area-inset-bottom); }
          .employer-sidebar.open { transform: translateX(0) !important; }
          .sidebar-close-mobile { display: flex !important; width: 32px; height: 32px; align-items: center; justify-content: center; }
          .employer-navbar {
            left: 0 !important;
            padding: 0 calc(16px + env(safe-area-inset-right)) 0 calc(16px + env(safe-area-inset-left)) !important;
          }
          .mobile-menu-btn-employer { display: flex !important; }
          .employer-main { margin-left: 0 !important; }
        }
        @media (max-width: 480px) {
          .employer-navbar kbd { display: none; }
        }
      `}</style>
    </>
  );
};

export default DashboardLayout;