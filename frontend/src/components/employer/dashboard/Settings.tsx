import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Lock,
  Bell,
  Building2,
  Check,
  Loader2,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { getEmployerProfile, updateNotificationPreferences, deactivateEmployerAccount } from '../employerApi/api';
import { changePassword } from '../../auth/authApi/authApi';
import { SkeletonCircle, SkeletonText } from '../../ui/Skeleton';

type NotificationPrefs = {
  allNotifications: boolean;
  newApplications: boolean;
};

const EmployerSettings = () => {
  const navigate = useNavigate();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [user, setUser] = useState<{ name: string; companyLogo: string; email?: string } | null>(null);

  const [notifications, setNotifications] = useState<NotificationPrefs>({
    allNotifications: true,
    newApplications: true,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // Deactivate-account modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getEmployerProfile();
        setUser({ name: data.name, companyLogo: data.companyLogo, email: data.email });
        setNotifications({
          allNotifications: data.notificationPreferences?.allNotifications ?? true,
          newApplications: data.notificationPreferences?.newApplications ?? true,
        });
      } catch (err) {
        console.error('Failed to load employer profile for settings:', err);
      }
    };
    fetchProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password.';
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleTogglePref = async (key: keyof NotificationPrefs) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setNotifLoading(true);
    try {
      await updateNotificationPreferences(updated);
      toast.success('Notification preferences updated!');
    } catch (err: any) {
      setNotifications(notifications); // rollback
      toast.error('Failed to update notification preferences.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivatePassword) {
      setDeactivateError('Please enter your password to confirm.');
      return;
    }
    setDeactivateLoading(true);
    setDeactivateError('');
    try {
      await deactivateEmployerAccount(deactivatePassword);
      setShowDeactivateModal(false);
      localStorage.clear();
      window.location.href = '/login';
    } catch (err: any) {
      setDeactivateError(err.response?.data?.message || 'Failed to deactivate account. Check password.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const passwordMatch = newPassword && confirmPassword ? newPassword === confirmPassword : null;

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#F8FAFC] min-h-full">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back Navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-all hover:text-orange-600"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        {/* ══ HEADER ════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <Lock size={22} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Settings
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Manage your employer account security, notification alerts, and workspace preferences.
            </p>
          </div>

          {/* Account Profile Pill */}
          <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-2.5 shadow-xs">
            {!user ? (
              <>
                <SkeletonCircle size="h-9 w-9" />
                <SkeletonText width="w-24" />
              </>
            ) : (
              <>
                {user.companyLogo ? (
                  <img
                    src={resolveMediaUrl(user.companyLogo)}
                    alt={user.name}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-100 shadow-2xs"
                  />
                ) : (
                  <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-sm shadow-2xs">
                    {user.name?.charAt(0).toUpperCase() || 'E'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[160px]">{user.name}</p>
                  <span className="text-[11px] font-medium text-orange-600">Employer Workspace</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ MAIN GRID ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Password & Security (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-orange-100 bg-white p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Change Password</h2>
                  <p className="text-xs text-slate-500">Update your account login password regularly to keep your hiring data secure.</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
                {/* Old Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Toggle old password visibility"
                    >
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Toggle new password visibility"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {newPassword && (
                    <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${newPassword.length >= 6 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {newPassword.length >= 6 ? <Check size={12} /> : null}
                      {newPassword.length >= 6 ? 'Minimum length requirement met.' : 'Password must be at least 6 characters.'}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        passwordMatch === true
                          ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                          : passwordMatch === false
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-orange-500 focus:ring-orange-500/20'
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordMatch !== null && (
                    <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${passwordMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {passwordMatch ? <Check size={12} /> : <X size={12} />}
                      {passwordMatch ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-98"
                  >
                    {passwordLoading && <Loader2 size={16} className="animate-spin" />}
                    {passwordLoading ? 'Updating Password…' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: Notifications & Danger Zone (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Notification Preferences */}
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Notification Alerts</h2>
                  <p className="text-xs text-slate-500">Choose when and how QuickJobs notifies you.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {/* Toggle 1: All Notifications */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-orange-50/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">All Notifications</p>
                    <p className="text-xs text-slate-500 mt-0.5">Receive general account alerts, system updates, and candidate activity.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('allNotifications')}
                    disabled={notifLoading}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                      notifications.allNotifications ? 'bg-orange-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        notifications.allNotifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 2: New Applications */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-orange-50/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">New Candidate Applications</p>
                    <p className="text-xs text-slate-500 mt-0.5">Get immediate notifications whenever a candidate submits an application to your jobs.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('newApplications')}
                    disabled={notifLoading}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                      notifications.newApplications ? 'bg-orange-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        notifications.newApplications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-3 pb-4 border-b border-rose-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-rose-700">Danger Zone</h2>
                  <p className="text-xs text-slate-500">Irreversible employer workspace actions.</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Deactivating this account will unpublish all active job listings, pause applications, and sign you out immediately.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(true)}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all"
                >
                  <AlertTriangle size={14} /> Deactivate Account
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ══ DEACTIVATE CONFIRMATION MODAL ══════════════════════════ */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl relative transition-all">
            <button
              onClick={() => {
                setShowDeactivateModal(false);
                setDeactivatePassword('');
                setDeactivateError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3.5 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Deactivate employer account?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  All active job postings will be hidden and recruiters under this company will lose access. This action cannot be undone from this panel.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Enter your password to confirm
              </label>
              <input
                type="password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                placeholder="Your account password"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                autoFocus
              />
              {deactivateError && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">{deactivateError}</p>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivatePassword('');
                  setDeactivateError('');
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivateLoading || !deactivatePassword}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-xs"
              >
                {deactivateLoading && <Loader2 size={14} className="animate-spin" />}
                {deactivateLoading ? 'Deactivating…' : 'Yes, Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerSettings;