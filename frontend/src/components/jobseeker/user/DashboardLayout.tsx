/**
 * PATH: src/components/jobseeker/user/DashboardLayout.tsx
 *
 * Quick Jobs — Job Seeker Dashboard Layout
 * Same premium sidebar/navbar pattern as the employer dashboard
 * (src/components/employer/dashboard/DashboardLayout.tsx), same orange
 * brand palette matching the logo, adapted to the job seeker's own
 * real routes.
 */

import logo from '../../../assets/quickjobs.png';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, ClipboardList, Bookmark,
  FileText, MessageSquare, Users2, UserCircle, Settings,
  LogOut, ChevronRight, Bell, MessageCircle,
  Menu, X, Calendar, Home, History, LifeBuoy, CreditCard,
} from 'lucide-react';
import { useState } from 'react';

// ── Nav tree ─────────────────────────────────────────────────────────
// "My Applications" previously pointed at /user/applications, which was
// never registered as a route in App.tsx even though the page component
// (myApplications.tsx) existed — fixed alongside this rebuild.
const NAV_SECTIONS = [
  {
    label: 'Job Search',
    items: [
      { path: '/',                   icon: Home,            label: 'Home'            },
      { path: '/user/dashboard',     icon: LayoutDashboard, label: 'Dashboard'       },
      { path: '/jobs',               icon: Search,          label: 'Browse Jobs'     },
      { path: '/user/applications',  icon: ClipboardList,   label: 'My Applications' },
      { path: '/user/savedjobs',     icon: Bookmark,        label: 'Saved Jobs'      },
    ],
  },
  {
    label: 'Career Tools',
    items: [
      { path: '/resume',             icon: FileText,        label: 'Resume Builder'  },
      { path: '/resume/history',     icon: History,         label: 'My Resumes'      },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/messages',           icon: MessageSquare,   label: 'Messages' },
      { path: '/user/support',       icon: LifeBuoy,        label: 'Support Tickets' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { path: '/user/profile',       icon: UserCircle,      label: 'Profile'  },
      { path: '/user/subscription',  icon: CreditCard,      label: 'Subscription' },
      { path: '/user/settings',      icon: Settings,        label: 'Settings' },
    ],
  },
];

// Same palette as the employer layout — matches the actual logo and the
// rest of the app's orange accent, rather than each dashboard shell
// picking its own colors.
const BRAND = {
  primary: '#F97316',
  primaryLight: '#FFEDD5',
  primaryHover: '#FFF7ED',
  primaryShadow: 'rgba(249,115,22,.25)',
  gradient: 'linear-gradient(135deg,#F59E0B,#F97316)',
  pageBg: '#FFF8F3',
};

const UserDashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('authChange'));
    setShowLogout(false);
    navigate('/');
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[99] backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div style={{ display: 'flex', minHeight: '100vh', background: BRAND.pageBg, fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* ══ SIDEBAR ═══════════════════════════════════════════════ */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: 256,
          background: '#fff', borderRight: '1px solid #E5E7EB',
          boxShadow: '2px 0 24px rgba(0,0,0,.06)',
          display: 'flex', flexDirection: 'column', zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
        }}
          className="jobseeker-sidebar"
        >
          <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <img src={logo} alt="Quick Jobs" style={{ height: 46, width: 'auto', objectFit: 'contain' }} />
            <button
              style={{ display: 'none' }}
              className="sidebar-close-mobile"
              onClick={e => { e.stopPropagation(); setSidebarOpen(false); }}
            >
              <X size={16} />
            </button>
          </div>

          <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B', padding: '14px 10px 5px', display: 'block' }}>
                  {section.label}
                </p>
                {section.items.map(item => {
                  const Icon = item.icon;
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

          {/* Same self-contained-shell issue as the employer dashboard:
              no top Header here, so this is the only way back to
              Community without typing the URL. */}
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

          {/* Go Premium card */}
          <div style={{ margin: '10px 10px 8px', borderRadius: 14, padding: 16, background: BRAND.gradient, color: '#fff', flexShrink: 0 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>⚡</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Go Premium</div>
            <div style={{ fontSize: 11.5, lineHeight: 1.5, opacity: .82, marginBottom: 12 }}>
              Priority applications, resume review, and profile boost.
            </div>
            <button style={{ background: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Upgrade Now →
            </button>
          </div>

          <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = BRAND.primaryHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            onClick={() => navigate('/user/profile')}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,#FDBA74,${BRAND.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
              JS
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>My Account</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Job Seeker</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setShowLogout(true); }}
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
        }} className="jobseeker-navbar">

          <button
            className="mobile-menu-btn-jobseeker"
            style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: BRAND.pageBg, border: '1px solid #E5E7EB', color: '#64748B', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: BRAND.pageBg, border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 14px', height: 40, maxWidth: 380, width: '100%', transition: 'all .15s' }}
            onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = BRAND.primary}
            onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'}
          >
            <Search size={15} color="#64748B" style={{ flexShrink: 0 }} />
            <input type="text" placeholder="Search jobs, companies…" style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13.5, color: '#111827', width: '100%', fontFamily: 'inherit' }} />
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 36, border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12.5, color: '#64748B', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Calendar size={13} />
            <span>{today}</span>
          </div>

          <button style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.pageBg, border: '1px solid #E5E7EB', color: '#64748B', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'all .15s' }}>
            <Bell size={17} />
            <span style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff' }} />
          </button>

          <Link to="/messages" style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.pageBg, border: '1px solid #E5E7EB', color: '#64748B', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'all .15s', textDecoration: 'none' }}>
            <MessageCircle size={17} />
          </Link>

          <div
            onClick={() => navigate('/user/profile')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,#FDBA74,${BRAND.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            JS
          </div>
        </header>

        {/* ══ MAIN ══════════════════════════════════════════════════ */}
        <main style={{ flex: 1, marginLeft: 256, paddingTop: 72, minHeight: '100vh', background: BRAND.pageBg }} className="jobseeker-main">
          <Outlet />
        </main>
      </div>

      {showLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
          onClick={() => setShowLogout(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 360, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,.15)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🚪</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Sign out?</h2>
            <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.55, marginBottom: 24 }}>You'll need to sign back in to access your account.</p>
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
          .jobseeker-sidebar { transform: translateX(-256px) !important; }
          .jobseeker-sidebar.open { transform: translateX(0) !important; }
          .sidebar-close-mobile { display: flex !important; }
          .jobseeker-navbar { left: 0 !important; padding: 0 16px !important; }
          .mobile-menu-btn-jobseeker { display: flex !important; }
          .jobseeker-main { margin-left: 0 !important; }
        }
      `}</style>
    </>
  );
};

export default UserDashboardLayout;