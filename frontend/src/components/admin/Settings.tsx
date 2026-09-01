import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, KeyRound, Megaphone, ShieldCheck, Send, Loader2 } from 'lucide-react';
import { getAdminProfile, makeAnnouncement } from './adminApi/api';
import { changePassword } from '../auth/authApi/authApi';
import { useAdminAuth } from '../../context/useAdminAuth';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const AdminSettings = () => {
  const { isSuperAdmin } = useAdminAuth();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<{ name: string; profilePic: string } | null>(null);


  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementRole, setAnnouncementRole] = useState<'all' | 'jobseeker' | 'employer'>('all');
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getAdminProfile();
        setUser({ name: data.name, profilePic: data.profilePic });
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchProfile();
  }, []);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match');
      return;
    }

    try {
      setLoading(true);
      await changePassword({ currentPassword: oldPassword, newPassword });
      alert('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      alert(message);
    } finally {
      setLoading(false);
    }
  };


  const handleMakeAnnouncement = async () => {
    if (!announcementMessage.trim()) {
      alert("Please enter an announcement message.");
      return;
    }

    try {
      setAnnouncementLoading(true);
      await makeAnnouncement({
        message: announcementMessage,
        targetRole: announcementRole,
      });
      alert("Announcement sent successfully.");
      setAnnouncementMessage('');
      setAnnouncementRole('all');
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(message || "Failed to send announcement.");
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const passwordFormValid =
    oldPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 overflow-y-auto w-full text-slate-800" style={{ maxHeight: 'calc(100vh - 50px)' }}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Settings
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#F97316]">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage your account security and platform-wide announcements.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl px-3 py-2 shadow-sm shrink-0 self-start sm:self-auto">
            {user?.profilePic ? (
              <img
                src={`${MEDIA_URL.replace(/\/$/, "")}/${user.profilePic.replace(/^\//, "")}`}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-orange-100"
              />
            ) : (
              <span className="w-9 h-9 flex items-center justify-center rounded-full bg-orange-50 text-[#F97316] text-sm font-bold ring-2 ring-orange-100">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-700 truncate max-w-[9rem]">
              {user?.name || 'Loading...'}
            </span>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Password Change Card */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 sm:px-6 py-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900">Change your Password</h2>
                <p className="text-xs text-slate-400 font-medium">Keep your account secure with a strong password.</p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Old Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter your old password"
                    autoComplete="current-password"
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Toggle old password visibility"
                  >
                    {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    autoComplete="new-password"
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    className={`w-full pl-4 pr-11 py-2.5 bg-slate-50/80 border rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      confirmPassword && newPassword && confirmPassword !== newPassword
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400'
                        : 'border-slate-200 focus:ring-orange-500/20 focus:border-[#F97316]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <p className="text-xs font-medium text-rose-500">Passwords do not match.</p>
                )}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={loading || !passwordFormValid}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#F97316] text-white font-semibold py-2.5 rounded-xl shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Change Password</span>
                )}
              </button>
            </div>
          </section>

          {/* General Announcement Section — platform-wide broadcast,
              superadmin only (backend now enforces this too; this
              just avoids showing a form regular admins would get a
              403 from). */}
          {isSuperAdmin ? (
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 sm:px-6 py-4 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100 shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900">Make General Announcements</h2>
                  <p className="text-xs text-slate-400 font-medium">Broadcast a message to users platform-wide.</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Target Audience
                  </label>
                  <select
                    value={announcementRole}
                    onChange={(e) =>
                      setAnnouncementRole(e.target.value as 'all' | 'jobseeker' | 'employer')
                    }
                    className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all cursor-pointer"
                  >
                    <option value="all">All Users</option>
                    <option value="jobseeker">Jobseekers</option>
                    <option value="employer">Employers</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Announcement Message
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">
                      {announcementMessage.length}/500
                    </span>
                  </div>
                  <textarea
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value.slice(0, 500))}
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316] transition-all resize-none"
                    placeholder="Write your message here..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleMakeAnnouncement}
                    disabled={announcementLoading || !announcementMessage.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#F97316] text-white font-semibold px-6 py-2.5 rounded-xl shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200 cursor-pointer"
                  >
                    {announcementLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Announcement</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 sm:px-6 py-4 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-orange-50 text-[#F97316] border border-orange-100 shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900">Make General Announcements</h2>
                  <p className="text-xs text-slate-400 font-medium">Broadcast a message to users platform-wide.</p>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                  <Lock size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>Platform-wide announcements are restricted to superadmins.</span>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminSettings;