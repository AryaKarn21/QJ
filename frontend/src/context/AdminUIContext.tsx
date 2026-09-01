import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface AdminUIContextValue {
  theme: Theme;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  // Mobile-only overlay drawer state (separate from desktop collapse —
  // on small screens the sidebar is fully hidden until this is true).
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

const AdminUIContext = createContext<AdminUIContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'quickjob_admin_theme';
const SIDEBAR_STORAGE_KEY = 'quickjob_admin_sidebar_collapsed';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

function getInitialSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
}

export const AdminUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(getInitialSidebarCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  // Keep the <html> element's class in sync so Tailwind's `dark:` variants work app-wide.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close the mobile drawer automatically if the viewport grows past the
  // mobile breakpoint while it's open (e.g. rotating a tablet, resizing
  // a window) so it never gets stuck open on desktop.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const toggleSidebar = () => setSidebarCollapsedState((prev) => !prev);
  const setSidebarCollapsed = (value: boolean) => setSidebarCollapsedState(value);
  const openMobileNav = () => setMobileNavOpen(true);
  const closeMobileNav = () => setMobileNavOpen(false);
  const toggleMobileNav = () => setMobileNavOpen((prev) => !prev);

  return (
    <AdminUIContext.Provider
      value={{
        theme,
        toggleTheme,
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        mobileNavOpen,
        openMobileNav,
        closeMobileNav,
        toggleMobileNav,
      }}
    >
      {children}
    </AdminUIContext.Provider>
  );
};

export function useAdminUI(): AdminUIContextValue {
  const ctx = useContext(AdminUIContext);
  if (!ctx) {
    throw new Error('useAdminUI must be used within an <AdminUIProvider>');
  }
  return ctx;
}