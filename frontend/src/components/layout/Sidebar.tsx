import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  Share2,
  Newspaper,
  Tags,
  Building2,
  ShieldAlert,
  BarChart3,
  Settings,
  ScrollText,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  User,
  Sparkles,
  LifeBuoy,
  Bell,
  CreditCard,
  Mail,
  LayoutTemplate,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAdminUI } from '../../context/AdminUIContext';
import { useAdminAuth } from '../../context/useAdminAuth';
import { useQuery } from '@tanstack/react-query';
import { getMyPermissions } from '../admin/adminApi/api';
import logo from '../../assets/quickjobs.png';

interface SubNavItem {
  label: string;
  path: string;
  superAdminOnly?: boolean;
  requiredPermission?: string | string[];
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string; // Direct link if no children
  children?: SubNavItem[];
  superAdminOnly?: boolean;
  requiredPermission?: string | string[];
}

const PRIMARY_NAV: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    path: '/admin/dashboard',
    requiredPermission: 'dashboard.view',
  },
  {
    id: 'users',
    label: 'Users',
    icon: <Users size={20} />,
    requiredPermission: 'users.view',
    children: [
      { label: 'All Users', path: '/admin/users' },
      { label: 'Job Seekers', path: '/admin/users?role=jobseeker' },
      { label: 'Job Providers', path: '/admin/users?role=employer' },
      { label: 'Admins', path: '/admin/users?role=admin' },
    ],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: <Briefcase size={20} />,
    requiredPermission: 'jobs.view',
    children: [
      { label: 'All Jobs', path: '/admin/jobs' },
      { label: 'Active Jobs', path: '/admin/jobs?status=active' },
      { label: 'Pending Approvals', path: '/admin/jobs?status=pending' },
      { label: 'Expired / Closed', path: '/admin/jobs?status=expired' },
      { label: 'Trending Jobs', path: '/admin/trending-jobs', superAdminOnly: true },
    ],
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: <ClipboardList size={20} />,
    requiredPermission: 'applications.view',
    children: [
      { label: 'All Applications', path: '/admin/applications' },
      { label: 'Pending', path: '/admin/applications?status=Pending' },
      { label: 'Accepted', path: '/admin/applications?status=Accepted' },
      { label: 'Rejected', path: '/admin/applications?status=Rejected' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    icon: <Share2 size={20} />,
    requiredPermission: 'community.view',
    children: [
      { label: 'All Posts', path: '/admin/community/posts' },
      { label: 'Flagged / Reported', path: '/admin/community/reported' },
      { label: 'Comments', path: '/admin/community/comments' },
    ],
  },
  {
    id: 'blogs',
    label: 'Blogs',
    icon: <Newspaper size={20} />,
    requiredPermission: 'blogs.view',
    children: [
      { label: 'All Blogs', path: '/admin/blogs' },
      { label: 'Published', path: '/admin/blogs?status=published' },
      { label: 'Drafts', path: '/admin/blogs?status=drafts' },
      { label: 'Categories', path: '/admin/blog-categories' },
    ],
  },
  {
    id: 'cms',
    label: 'CMS',
    icon: <LayoutTemplate size={20} />,
    requiredPermission: ['cms.view', 'policies.view'],
    children: [
      { label: 'Legal & Policies', path: '/admin/cms?tab=policies', requiredPermission: 'policies.view' },
      { label: 'Website Content', path: '/admin/cms?tab=homepage', requiredPermission: 'cms.view' },
      { label: 'Site Content & Copy', path: '/admin/cms?tab=site-content', requiredPermission: 'cms.view' },
      { label: 'Pages', path: '/admin/cms?tab=pages', requiredPermission: 'cms.view' },
      { label: 'FAQs', path: '/admin/cms?tab=faqs', requiredPermission: 'cms.view' },
      { label: 'Career Tips', path: '/admin/cms?tab=career-tips', requiredPermission: 'cms.view' },
      { label: 'Newsletter', path: '/admin/cms?tab=newsletter', requiredPermission: 'cms.view' },
    ],
  },
  {
    id: 'roles-permissions',
    label: 'Roles & Permissions',
    icon: <ShieldCheck size={20} />,
    path: '/admin/roles-permissions',
    requiredPermission: ['roles.view', 'permissions.manage'],
    superAdminOnly: true,
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: <Tags size={20} />,
    requiredPermission: ['jobs.view', 'blogs.view'],
    children: [
      { label: 'Job Categories', path: '/admin/jobcategories' },
      { label: 'Blog Categories', path: '/admin/blog-categories' },
    ],
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: <Building2 size={20} />,
    requiredPermission: 'users.view',
    children: [
      { label: 'All Companies', path: '/admin/employers' },
      { label: 'Verified', path: '/admin/employers?status=verified' },
      { label: 'Pending Verification', path: '/admin/employers?status=pending' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <ShieldAlert size={20} />,
    requiredPermission: 'community.manage_reports',
    children: [
      { label: 'All Reports', path: '/admin/reports' },
      { label: 'User Reports', path: '/admin/reports?targetType=user' },
      { label: 'Job Reports', path: '/admin/reports?targetType=job' },
      { label: 'Post Reports', path: '/admin/reports?targetType=post' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 size={20} />,
    requiredPermission: 'analytics.view',
    children: [
      { label: 'User Growth', path: '/admin/analytics?tab=users' },
      { label: 'Job Trends', path: '/admin/analytics?tab=jobs' },
      { label: 'Revenue', path: '/admin/analytics?tab=revenue' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={20} />,
    requiredPermission: 'settings.view',
    children: [
      { label: 'General Settings', path: '/admin/settings' },
      { label: 'Roles & Permissions', path: '/admin/roles-permissions', superAdminOnly: true },
      { label: 'Security / Logs', path: '/admin/security', superAdminOnly: true },
    ],
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: <ScrollText size={20} />,
    path: '/admin/audit-logs',
    requiredPermission: 'audit_logs.view',
    superAdminOnly: true,
  },
  {
    id: 'email-logs',
    label: 'Email Logs',
    icon: <Mail size={20} />,
    path: '/admin/email-logs',
    requiredPermission: 'email.view',
  },
];

const SECONDARY_NAV: NavSection[] = [
  {
    id: 'ai-center',
    label: 'AI Center',
    icon: <Sparkles size={20} />,
    path: '/admin/ai-center',
  },
  {
    id: 'support',
    label: 'Support Tickets',
    icon: <LifeBuoy size={20} />,
    path: '/admin/support',
    requiredPermission: 'support.view',
  },
  {
    id: 'plans',
    label: 'Plans & Monetization',
    icon: <CreditCard size={20} />,
    path: '/admin/plans',
    requiredPermission: 'settings.view',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell size={20} />,
    path: '/admin/notifications',
    requiredPermission: 'notifications.view',
  },
];

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, closeMobileNav } = useAdminUI();
  const { isSuperAdmin, admin } = useAdminAuth();
  const location = useLocation();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Fetch current user's effective permissions
  const { data: myPermsData } = useQuery({
    queryKey: ['myPermissions'],
    queryFn: getMyPermissions,
    staleTime: 60_000,
  });

  const userPermissions = useMemo(() => myPermsData?.permissions || [], [myPermsData]);

  // Check if current user has permission for a nav section or sub-item
  const hasNavPermission = (required?: string | string[]) => {
    if (isSuperAdmin) return true;
    if (!required) return true;
    const list = Array.isArray(required) ? required : [required];
    return list.some((p) => userPermissions.includes(p) || userPermissions.includes('*'));
  };

  // Auto-expand sections when the current route matches any child
  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}`;
    const autoOpen: Record<string, boolean> = {};

    PRIMARY_NAV.forEach((sec) => {
      if (sec.children) {
        const matchesChild = sec.children.some(
          (c) => fullPath === c.path || location.pathname === c.path.split('?')[0]
        );
        if (matchesChild) {
          autoOpen[sec.id] = true;
        }
      }
    });

    setOpenSections((prev) => ({ ...prev, ...autoOpen }));
  }, [location.pathname, location.search]);

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

  // Escape closes drawer
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileNav();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const showExpandedContent = !sidebarCollapsed || mobileNavOpen;

  const isSubItemActive = (path: string) => {
    const currentFull = `${location.pathname}${location.search}`;
    return currentFull === path;
  };

  const isSectionActive = (sec: NavSection) => {
    if (sec.path) {
      return location.pathname === sec.path;
    }
    if (sec.children) {
      return sec.children.some(
        (c) => location.pathname === c.path.split('?')[0]
      );
    }
    return false;
  };

  return (
    <>
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
        aria-label="Super Admin Navigation Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-slate-800/80 bg-gradient-to-b from-[#0B1020] via-[#0F172A] to-[#121A2C] text-slate-200 backdrop-blur-xl transition-all duration-300 ease-in-out select-none
          w-[min(320px,85vw)] md:static md:z-auto md:h-screen md:w-[320px] md:translate-x-0
          ${mobileNavOpen ? 'translate-x-0 shadow-2xl shadow-orange-950/20' : '-translate-x-full'}
          ${sidebarCollapsed ? 'md:w-[72px]' : 'md:w-[250px] lg:w-[260px]'}
        `}
      >
        {/* Top Header / Branding */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/60 px-4">
          <Link
            to="/admin/dashboard"
            onClick={closeMobileNav}
            className="flex items-center gap-3 overflow-hidden rounded-lg p-1 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <div className="relative flex items-center justify-center rounded-xl bg-slate-900/80 p-1.5 border border-slate-700/50 shadow-inner">
              <img src={logo} alt="QuickJobs Logo" className="h-7 w-7 shrink-0 object-contain" />
            </div>
            {showExpandedContent && (
              <div className="flex flex-col truncate">
                <span className="truncate text-base font-bold text-white tracking-wide">
                  QuickJobs
                </span>
                <span className="truncate text-[10px] uppercase font-bold text-orange-400 tracking-wider">
                  {isSuperAdmin ? 'Super Admin' : 'Admin Portal'}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* User Identity / Role Overview */}
        {showExpandedContent ? (
          <div className="px-3 py-3 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/40 p-2.5 border border-slate-800/50 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-full bg-orange-500/20 blur-xs group-hover:bg-orange-500/40 transition-all duration-300" />
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 border border-orange-500/50 text-orange-400">
                    <User size={18} />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-slate-200">
                      {admin?.name || 'Administrator'}
                    </span>
                    {isSuperAdmin && (
                      <span className="shrink-0 rounded bg-orange-500/20 px-1.5 py-0.2 text-[9px] font-bold text-orange-400 border border-orange-500/30 uppercase">
                        Super
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
          <div className="p-2 shrink-0 flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-orange-500/30 blur-md group-hover:bg-orange-500/50 transition-all duration-300" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 border border-orange-500/60 text-orange-400">
                <User size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Navigation Menu */}
        <nav className="custom-sidebar-scroll flex-1 space-y-1 overflow-y-auto px-2.5 py-2">
          {PRIMARY_NAV.map((sec) => {
            if (sec.superAdminOnly && !isSuperAdmin) return null;
            if (!hasNavPermission(sec.requiredPermission)) return null;

            const isExpanded = !!openSections[sec.id];
            const activeSection = isSectionActive(sec);

            // Item has direct path (no children, e.g. Dashboard, Roles & Permissions, Audit Logs)
            if (sec.path && !sec.children) {
              return (
                <Link
                  key={sec.id}
                  to={sec.path}
                  onClick={closeMobileNav}
                  title={!showExpandedContent ? sec.label : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    !showExpandedContent ? 'justify-center px-0' : ''
                  } ${
                    activeSection
                      ? 'bg-orange-500/15 text-orange-400 font-semibold border-l-4 border-orange-500 rounded-l-none'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span className={`shrink-0 ${activeSection ? 'text-orange-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {sec.icon}
                  </span>
                  {showExpandedContent && <span className="truncate">{sec.label}</span>}
                </Link>
              );
            }

            // Accordion Item with Children
            const visibleChildren = (sec.children || []).filter(
              (c) => (!c.superAdminOnly || isSuperAdmin) && hasNavPermission(c.requiredPermission)
            );

            if (visibleChildren.length === 0) return null;

            return (
              <div key={sec.id} className="space-y-0.5">
                {/* Parent Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarCollapsed && !mobileNavOpen) {
                      toggleSidebar();
                    }
                    toggleSection(sec.id);
                  }}
                  title={!showExpandedContent ? sec.label : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 text-left ${
                    !showExpandedContent ? 'justify-center px-0' : ''
                  } ${
                    activeSection
                      ? 'text-orange-400 bg-orange-500/10'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span className={`shrink-0 ${activeSection ? 'text-orange-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {sec.icon}
                  </span>
                  {showExpandedContent && (
                    <>
                      <span className="flex-1 truncate">{sec.label}</span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-orange-400' : ''
                        }`}
                      />
                    </>
                  )}
                </button>

                {/* Submenu Accordion */}
                {showExpandedContent && isExpanded && (
                  <div className="ml-5 space-y-0.5 border-l border-slate-800/80 pl-3 py-1 animate-fadeIn">
                    {visibleChildren.map((child) => {
                      const active = isSubItemActive(child.path);
                      return (
                        <Link
                          key={child.label}
                          to={child.path}
                          onClick={closeMobileNav}
                          className={`block rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${
                            active
                              ? 'bg-orange-500/20 text-orange-400 font-semibold shadow-sm'
                              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Secondary Tools Section */}
          {showExpandedContent && (
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Additional Tools
              </p>
            </div>
          )}

          {SECONDARY_NAV.filter((sec) => hasNavPermission(sec.requiredPermission)).map((sec) => (
            <Link
              key={sec.id}
              to={sec.path!}
              onClick={closeMobileNav}
              title={!showExpandedContent ? sec.label : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                !showExpandedContent ? 'justify-center px-0' : ''
              } ${
                location.pathname.startsWith(sec.path!)
                  ? 'bg-orange-500/15 text-orange-400 font-semibold border-l-4 border-orange-500 rounded-l-none'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <span className="shrink-0 text-slate-400 group-hover:text-slate-200">
                {sec.icon}
              </span>
              {showExpandedContent && <span className="truncate">{sec.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer & Expand/Collapse Controls */}
        <div className="shrink-0 border-t border-slate-800/80 p-3 bg-slate-950/40 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden w-full items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200 md:flex focus:outline-none focus:ring-2 focus:ring-orange-500/50 mb-1"
          >
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {showExpandedContent && <span>Collapse Sidebar</span>}
          </button>

          {showExpandedContent && (
            <div className="pt-2 text-center border-t border-slate-800/50">
              <p className="text-xs font-semibold text-slate-300">QuickJobs Super Admin</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Control Center v2.0</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;