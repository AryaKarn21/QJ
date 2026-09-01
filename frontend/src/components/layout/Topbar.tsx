import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, LogOut, Menu, Search, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAdminUI } from '../../context/AdminUIContext';
import { getAdminProfile } from '../admin/adminApi/api';

interface AdminProfile {
  name?: string;
  profilePic?: string;
}

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { toggleMobileNav } = useAdminUI();
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 sm:gap-4 sm:px-4">
      {/* Hamburger — mobile only, opens the Sidebar drawer */}
      <button
        onClick={toggleMobileNav}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
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
          placeholder="Search… (⌘K)"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-violet-500/20"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />

        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-500" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setProfileMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {profile?.profilePic ? (
              <img src={profile.profilePic} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                <UserIcon size={14} />
              </span>
            )}
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 sm:inline dark:text-slate-200">
              {profile?.name || 'Admin'}
            </span>
            <ChevronDown size={14} className="hidden text-slate-400 sm:inline" />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;