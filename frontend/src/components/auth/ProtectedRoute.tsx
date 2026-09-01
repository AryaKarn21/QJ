import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../../utils/currentUser';
import type { UserRole } from '../../types/community';

interface ProtectedRouteProps {
  /**
   * Roles allowed to view this route/subtree. Omit to just require any
   * authenticated user (no role restriction).
   */
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

/**
 * Client-side route guard. The backend is the real authority on every
 * request (see backend/middleware/authMiddleware.js), but without this the
 * app happily rendered /admin, /employer, and /user dashboards for anyone
 * who typed the URL — they'd just see broken, empty, or 401'd widgets
 * instead of being redirected. This wraps a route (or a whole layout, so
 * every nested child route inherits the check) and:
 *
 *   - sends anonymous visitors to /login, remembering where they were
 *     headed so we can send them back after login
 *   - sends logged-in users of the wrong role to a "not authorized" page
 *     instead of a confusing half-broken dashboard
 *
 * Usage:
 *   <Route path="/admin" element={
 *     <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
 *       <AdminShell />
 *     </ProtectedRoute>
 *   }>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, role } = useCurrentUser();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;