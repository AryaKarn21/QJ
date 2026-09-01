import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminUIProvider } from '../../context/AdminUIContext';
import AdminErrorBoundary from '../admin/AdminErrorBoundary';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Usage in App.tsx is unchanged:
 *
 *   <Route path="/admin" element={<AdminShell />}>
 *     <Route path="dashboard" element={<AdminDashboard />} />
 *     ...
 *   </Route>
 *
 * All child routes keep rendering through <Outlet /> exactly as before —
 * only the chrome around them (sidebar/topbar/theme) changes.
 *
 * Responsive behavior: on screens < 768px, Sidebar renders as a hidden
 * full-width overlay drawer (toggled via Topbar's hamburger button)
 * instead of taking up permanent horizontal space, so this flex layout
 * doesn't need any special mobile-only branching itself.
 */
const AdminShellInner: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-adminBg dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* key={pathname} remounts the boundary (clearing any caught
              error) whenever the admin navigates to a different page. */}
          <AdminErrorBoundary key={location.pathname}>
            <Outlet />
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export const AdminShell: React.FC = () => (
  <AdminUIProvider>
    <AdminShellInner />
  </AdminUIProvider>
);

export default AdminShell;