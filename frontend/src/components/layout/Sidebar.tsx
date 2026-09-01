import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  LifeBuoy,
  Briefcase,
  ClipboardList,
  Tags,
  CreditCard,
  DollarSign,
  Megaphone,
  Sparkles,
  BarChart3,
  Newspaper,
  Bell,
  ShieldCheck,
  ScrollText,
  Lock,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  X,
  User,
  ShieldAlert,
  ReceiptText,
} from 'lucide-react';
import { useAdminUI } from '../../context/AdminUIContext';
import { useAdminAuth } from '../../context/useAdminAuth';
import logo from '../../assets/quickjobs.png';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string; // omitted => not yet built, shown as "Coming Soon"
  superAdminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/admin/dashboard' }],
  },
  {
    label: 'People',
    items: [
      { label: 'User Management', icon: <Users size={22} />, path: '/admin/users' },
      { label: 'Company Management', icon: <Building2 size={22} />, path: '/admin/employers' },
      { label: 'Support Center', icon: <LifeBuoy size={22} />, path: '/admin/support' },
    ],
  },
  {
    label: 'Hiring',
    items: [
      { label: 'Job Management', icon: <Briefcase size={22} />, path: '/admin/jobs' },
      { label: 'Application Management', icon: <ClipboardList size={22} />, path: '/admin/applications' },
      { label: 'Categories & Taxonomy', icon: <Tags size={22} />, path: '/admin/jobcategories' },
    ],
  },
  {
    label: 'Monetization',
    items: [
      { label: 'Subscription Management', icon: <CreditCard size={22} />, path: '/admin/plans' },
      { label: 'Subscriptions', icon: <ReceiptText size={22} />, path: '/admin/subscriptions' },
      { label: 'Revenue', icon: <DollarSign size={22} />, path: '/admin/revenue' },
      { label: 'Advertisement Management', icon: <Megaphone size={22} />, path: '/admin/advertisements' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'AI Center', icon: <Sparkles size={22} />, path: '/admin/ai-center' },
      { label: 'Analytics', icon: <BarChart3 size={22} />, path: '/admin/analytics' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'CMS', icon: <Newspaper size={22} />, path: '/admin/cms' },
      { label: 'Notifications', icon: <Bell size={22} />, path: '/admin/notifications' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Roles & Permissions', icon: <ShieldCheck size={22} />, path: '/admin/roles-permissions', superAdminOnly: true },
      { label: 'Audit Logs', icon: <ScrollText size={22} />, path: '/admin/audit-logs', superAdminOnly: true },
      { label: 'Security', icon: <Lock size={22} />, path: '/admin/security', superAdminOnly: true },
      { label: 'System Settings', icon: <Settings size={22} />, path: '/admin/settings', superAdminOnly: true },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, closeMobileNav } = useAdminUI();
  const { isSuperAdmin, admin } = useAdminAuth();
  const location = useLocation();

  // Prevent body scrolling while mobile drawer is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const showExpandedContent = !sidebarCollapsed || mobileNavOpen;

  return (
    <>
      {/* Custom Styles for Subtle Glass Scrollbar */}
      <style>{`
        .custom-sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
        }
        .custom-sidebar-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
        }
      `}</style>

      {/* Backdrop — Mobile only */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300 md:hidden"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        aria-label="Admin Navigation Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-800/80 bg-gradient-to-b from-[#0B1020] to-[#121A2C] text-slate-200 backdrop-blur-xl transition-all duration-300 ease-in-out select-none
          w-[320px] md:static md:z-auto md:translate-x-0
          ${mobileNavOpen ? 'translate-x-0 shadow-2xl shadow-orange-950/20' : '-translate-x-full'}
          ${sidebarCollapsed ? 'md:w-[80px]' : 'md:w-[280px] lg:w-[320px]'}
        `}
      >
        {/* Top Header / Branding */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/60 px-4">
          <Link 
            to="/admin/dashboard" 
            onClick={closeMobileNav}
            className="flex items-center gap-3 overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg p-1 transition-opacity hover:opacity-90"
          >
            <div className="relative flex items-center justify-center rounded-xl bg-slate-900/80 p-1.5 border border-slate-700/50 shadow-inner">
              <img src={logo} alt="QuickJobs Logo" className="h-7 w-7 shrink-0 object-contain" />
            </div>
            {showExpandedContent && (
              <div className="flex flex-col truncate">
                <span className="truncate text-base font-bold text-white tracking-wide">
                  QuickJobs
                </span>
                <span className="text-[10px] font-semibold text-orange-400/90 uppercase tracking-wider -mt-0.5">
                  Admin Panel
                </span>
              </div>
            )}
          </Link>

          {/* Close button — Mobile only */}
          <button
            onClick={closeMobileNav}
            aria-label="Close drawer menu"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Card Section */}
        {showExpandedContent ? (
          <div className="p-4 shrink-0">
            <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-3.5 backdrop-blur-md shadow-lg group transition-all duration-300 hover:border-slate-700/80">
              <div className="flex items-center gap-3.5">
                {/* Admin Avatar with Soft Orange Glow */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-orange-500/30 blur-md group-hover:bg-orange-500/50 transition-all duration-300" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 border border-orange-500/60 text-orange-400 shadow-md">
                    <User size={22} />
                  </div>
                </div>

                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-slate-100">
                      Administrator
                    </span>
                    {isSuperAdmin && (
                      <span className="shrink-0 text-orange-400" title="Super Admin">
                        <ShieldAlert size={14} />
                      </span>
                    )}
                  </div>
                  <span className="truncate text-xs font-normal text-slate-400">
                    {admin?.email || 'admin@quickjobs.com'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 shrink-0 flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-orange-500/30 blur-md group-hover:bg-orange-500/50 transition-all duration-300" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 border border-orange-500/60 text-orange-400">
                <User size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Group Items */}
        <nav className="custom-sidebar-scroll flex-1 space-y-6 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1.5">
                {showExpandedContent ? (
                  <p className="px-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400/90 mb-2">
                    {group.label}
                  </p>
                ) : (
                  <div className="my-2 border-t border-slate-800/60" />
                )}

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = item.path ? location.pathname.startsWith(item.path) : false;
                    const isComingSoon = !item.path;

                    const content = (
                      <>
                        <span className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-[#F97316]' : 'text-slate-400 group-hover:text-slate-200'}`}>
                          {item.icon}
                        </span>

                        {showExpandedContent && (
                          <span className="flex-1 truncate text-left text-sm font-medium tracking-wide">
                            {item.label}
                          </span>
                        )}

                        {showExpandedContent && isComingSoon && (
                          <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700/50">
                            Coming Soon
                          </span>
                        )}
                      </>
                    );

                    const baseClasses = `group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                      !showExpandedContent ? 'justify-center px-0' : ''
                    }`;

                    if (isComingSoon) {
                      return (
                        <div
                          key={item.label}
                          title={!showExpandedContent ? `${item.label} — Coming Soon` : undefined}
                          className={`${baseClasses} cursor-not-allowed opacity-50 text-slate-400 hover:bg-slate-900/30`}
                        >
                          {content}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        to={item.path!}
                        onClick={closeMobileNav}
                        title={!showExpandedContent ? item.label : undefined}
                        className={`${baseClasses} ${
                          isActive
                            ? 'bg-[#F97316]/15 text-[#F97316] font-semibold border-l-4 border-[#F97316] rounded-l-none shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white hover:-translate-y-0.5'
                        }`}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer & Expand/Collapse Controls */}
        <div className="shrink-0 border-t border-slate-800/80 p-3 bg-slate-950/40">
          {/* Collapse Toggle Button (Desktop Only) */}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden w-full items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200 md:flex focus:outline-none focus:ring-2 focus:ring-orange-500/50 mb-2"
          >
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {showExpandedContent && <span>Collapse Sidebar</span>}
          </button>

          {/* Sidebar Footer Branding */}
          {showExpandedContent && (
            <div className="pt-2 pb-1 text-center border-t border-slate-800/50">
              <p className="text-xs font-semibold text-slate-300">QuickJobs Admin</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Version 1.0</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Made with <span className="text-red-500">❤️</span> by QuickJobs
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;