import { useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';

export type AdminRole = 'jobseeker' | 'employer' | 'admin' | 'superadmin';

interface DecodedToken {
  id: string;
  role: AdminRole;
  exp: number;
}

interface AdminAuthState {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  role: AdminRole | null;
  userId: string | null;
  // Not part of the JWT (which only carries {id, role, exp}) — sourced
  // separately from localStorage, set at login time (see Login.tsx). Null
  // for OAuth logins, where the callback redirect never carries email/name.
  admin: { email: string | null; name: string | null } | null;
}

/**
 * Decodes the stored JWT (if any) and exposes role flags so the Sidebar / route
 * guards can show or hide superadmin-only sections ("Roles & Permissions",
 * "Audit Logs", "Security", "System Settings") without another network call.
 */
export function useAdminAuth(): AdminAuthState {
  return useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return { isSuperAdmin: false, isAdmin: false, role: null, userId: null, admin: null };
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const isExpired = decoded.exp * 1000 <= Date.now();
      if (isExpired) {
        return { isSuperAdmin: false, isAdmin: false, role: null, userId: null, admin: null };
      }

      const isAdmin = decoded.role === 'admin' || decoded.role === 'superadmin';

      return {
        isSuperAdmin: decoded.role === 'superadmin',
        isAdmin,
        role: decoded.role,
        userId: decoded.id,
        admin: isAdmin
          ? { email: localStorage.getItem('adminEmail'), name: localStorage.getItem('adminName') }
          : null,
      };
    } catch {
      return { isSuperAdmin: false, isAdmin: false, role: null, userId: null, admin: null };
    }
  }, []);
}