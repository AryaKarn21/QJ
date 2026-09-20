import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, LogOut, Menu, Search, User as UserIcon, Globe, ExternalLink, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAdminUI } from '../../context/AdminUIContext';
import { useAdminAuth } from '../../context/useAdminAuth';
import { getAdminProfile } from '../admin/adminApi/api';
import { NotificationBell } from '../notifications/NotificationBell';

interface AdminProfile {
  name?: string;
  profilePic?: string;
  role?: string;
}

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { toggleMobileNav } = useAdminUI();
  const { isSuperAdmin } = useAdminAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery<AdminProfile>({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
    window.dispatchEvent(new Event('authChange'));
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:gap-4 sm:px-4">
      {/* Hamburger — mobile only, opens the Sidebar drawer */}
      <button
        onClick={toggleMobileNav}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Global search */}
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search admin console… (⌘K)"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-orange-500 transition-all"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {/* Live Site Link */}
        <Link
          to="/"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition-all"
        >
          <Globe size={13} className="text-orange-500" />
          <span>View Site</span>
          <ExternalLink size={11} className="text-slate-400" />
        </Link>

        {/* Super Admin Status Pill */}
        {isSuperAdmin && (
          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            <ShieldAlert size={12} />
            <span>Super Admin</span>
          </span>
        )}

        <ThemeToggle />

        <NotificationBell />

        {/* Profile Dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setProfileMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-1 pl-1.5 pr-2.5 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            {profile?.profilePic ? (
              <img src={profile.profilePic} alt="" className="h-7 w-7 rounded-lg object-cover shadow-xs" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 font-bold text-white text-xs shadow-xs">
                {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            )}
            <div className="hidden text-left sm:block">
              <span className="block max-w-[110px] truncate text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {profile?.name || 'Administrator'}
              </span>
              <span className="block text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase leading-none">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
            <ChevronDown size={13} className="hidden text-slate-400 sm:inline transition-transform duration-200" />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
              <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profile?.name || 'Administrator'}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400 mt-0.5">
                  <ShieldAlert size={10} /> {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                </span>
              </div>
              <div className="py-1">
                <Link
                  to="/admin/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <UserIcon size={14} className="text-slate-400" /> Settings &amp; Profile
                </Link>
                {isSuperAdmin && (
                  <Link
                    to="/admin/audit-logs"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ShieldAlert size={14} className="text-orange-500" /> Audit Log Trail
                  </Link>
                )}
              </div>
              <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;