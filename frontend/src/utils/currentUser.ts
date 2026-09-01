import { useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { UserRole } from '../types/community';

interface DecodedToken {
  id: string;
  role: UserRole;
  exp: number;
}

interface CurrentUserState {
  isAuthenticated: boolean;
  userId: string | null;
  role: UserRole | null;
}

// Generalized version of context/useAdminAuth.ts (which only exposes
// admin/superadmin flags) for the Community module, which needs to know
// "am I logged in, and as what role" for every role, not just admin.
export function useCurrentUser(): CurrentUserState {
  return useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return { isAuthenticated: false, userId: null, role: null };

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp * 1000 <= Date.now()) {
        return { isAuthenticated: false, userId: null, role: null };
      }
      return { isAuthenticated: true, userId: decoded.id, role: decoded.role };
    } catch {
      return { isAuthenticated: false, userId: null, role: null };
    }
  }, []);
}
