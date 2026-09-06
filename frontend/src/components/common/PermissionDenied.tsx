import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

interface PermissionDeniedProps {
  /** Defaults to a generic "you don't have permission" message. */
  message?: string;
  /** Where the action button navigates. Defaults to "/". */
  actionTo?: string;
  /** Defaults to "Go to Dashboard". */
  actionLabel?: string;
}

/**
 * Shown in place of a broken/blank page when an API call comes back 403
 * (authenticated, but not permitted) — never render the raw error to the
 * user. For 401 (not authenticated at all), redirect to /login instead of
 * using this component.
 */
const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  message = "You don't have permission to access this information.",
  actionTo = '/',
  actionLabel = 'Go to Dashboard',
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
        <ShieldAlert size={24} aria-hidden="true" />
      </div>
      <p className="max-w-sm text-sm font-medium text-slate-600">{message}</p>
      <button
        type="button"
        onClick={() => navigate(actionTo)}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {actionLabel}
      </button>
    </div>
  );
};

export default PermissionDenied;
