import { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  Bell,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Loader2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import {
  getJobseekerProfile,
  updateJobseekerNotificationPreferences,
  deactivateJobseekerAccount,
} from '../jobseekerApi/api';
import { changePassword } from '../../auth/authApi/authApi';
import { SkeletonCircle, SkeletonText } from '../../ui/Skeleton';

type SettingsTab = 'security' | 'notifications' | 'privacy' | 'danger';

const UserSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');

  // Password fields state
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile / user state
  const [user, setUser] = useState<{
    name: string;
    email?: string;
    profilePic?: string;
    profileStatus?: any;
    notificationPreferences?: any;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    allNotifications: true,
    applicationStatus: true,
    newJobs: true,
    community: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Deactivate modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const data = await getJobseekerProfile();
        setUser(data);
        if (data.notificationPreferences) {
          setNotifications((prev) => ({
            ...prev,
            ...data.notificationPreferences,
          }));
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        toast.error('Failed to load settings data.');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200', text: 'text-gray-400' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500', text: 'text-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.warning('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      await changePassword({ currentPassword: oldPassword, newPassword });
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update password.';
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveNotifications = async () => {
    try {
      setNotifSaving(true);
      await updateJobseekerNotificationPreferences(notifications);
      toast.success('Notification preferences saved successfully!');
    } catch (err: any) {
      toast.error('Failed to save notification preferences.');
    } finally {
      setNotifSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatePassword) {
      setDeactivateError('Please enter your password to confirm.');
      return;
    }

    setDeactivateError('');
    setDeactivateLoading(true);
    try {
      await deactivateJobseekerAccount(deactivatePassword);
      toast.success('Account deactivated.');
      localStorage.removeItem('token');
      window.location.href = '/login?deactivated=true';
    } catch (err: any) {
      setDeactivateError(err?.response?.data?.message || err?.message || 'Failed to deactivate account.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 overflow-auto" style={{ maxHeight: 'calc(100dvh - 50px)' }}>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Page Header & Profile Card ── */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {loadingProfile || !user ? (
              <div className="flex items-center gap-4">
                <SkeletonCircle size="h-16 w-16" />
                <div className="space-y-2">
                  <SkeletonText width="w-40" height="h-6" />
                  <SkeletonText width="w-48" height="h-4" />
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  {user.profilePic ? (
                    <img
                      src={resolveMediaUrl(user.profilePic)}
                      alt={user.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Active" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name}</h1>
                    <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                      Jobseeker
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <Mail size={14} className="text-gray-400" />
                    <span>{user.email || 'jobseeker@quickjobs.com'}</span>
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => navigate('/user/profile')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all self-start md:self-auto shadow-sm"
          >
            <span>View Full Profile</span>
            <ExternalLink size={14} />
          </button>
        </div>

        {/* ── Settings Container with Modern Tabs ── */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          
          {/* Navigation Tabs Bar */}
          <div className="flex items-center border-b border-gray-100 overflow-x-auto bg-gray-50/50 p-2 gap-1 sm:gap-2">
            {[
              { id: 'security', label: 'Security & Password', icon: KeyRound },
              { id: 'notifications', label: 'Notification Preferences', icon: Bell },
              { id: 'privacy', label: 'Account & Privacy', icon: Shield },
              { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? tab.danger
                        ? 'bg-red-50 text-red-700 shadow-sm border border-red-200'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : tab.danger
                      ? 'text-gray-500 hover:text-red-600 hover:bg-red-50/50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/70'
                  }`}
                >
                  <Icon size={16} className={isActive ? (tab.danger ? 'text-red-600' : 'text-primary') : 'text-gray-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Body */}
          <div className="p-6 sm:p-10">

            {/* ── TAB 1: Security & Password ── */}
            {activeTab === 'security' && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Change Your Password</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Ensure your account is using a long, random password to stay secure.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  {/* Old Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter at least 6-8 characters"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Strength:</span>
                          <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full ${strength.color} transition-all duration-300`}
                            style={{ width: `${(strength.score / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Security Hints */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Info size={14} className="text-blue-600 shrink-0" />
                      <span>Password Requirements:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-700 pl-1">
                      <li>Minimum 8 characters length</li>
                      <li>At least one capital letter & one number</li>
                      <li>Avoid reusing passwords from other online accounts</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-60"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── TAB 2: Notification Preferences ── */}
            {activeTab === 'notifications' && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Notification Alerts & Preferences</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Control how and when you receive communications from employers and QuickJobs.
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {/* Master switch */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">All Notifications</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Master toggle to enable or pause all notification events.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('allNotifications')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.allNotifications ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          notifications.allNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Application Status Updates */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Application Status Alerts</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Get notified when an employer reviews, shortlists, or schedules an interview for your submission.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('applicationStatus')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.applicationStatus ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          notifications.applicationStatus ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Recommended Jobs */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Matching Job Recommendations</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Receive personalized job openings that match your skills, target roles, and location.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('newJobs')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.newJobs ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          notifications.newJobs ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Community & Messaging */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Community & Direct Messages</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Alerts for incoming direct messages, connection requests, and post reactions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification('community')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications.community ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          notifications.community ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    disabled={notifSaving}
                    onClick={handleSaveNotifications}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-60"
                  >
                    {notifSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving Preferences...</span>
                      </>
                    ) : (
                      <>
                        <Bell size={16} />
                        <span>Save Preferences</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 3: Account & Privacy ── */}
            {activeTab === 'privacy' && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Account Overview & Privacy</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Manage your visibility settings and verified identity on QuickJobs.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-400 font-medium">Account Name</span>
                      <p className="font-bold text-gray-900 mt-0.5">{user?.name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Email Address</span>
                      <p className="font-bold text-gray-900 mt-0.5">{user?.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Current Status</span>
                      <p className="font-bold text-emerald-600 mt-0.5 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Active Jobseeker
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Profile Visibility</span>
                      <p className="font-bold text-gray-900 mt-0.5">
                        {user?.profileStatus?.visibility === 'private' ? 'Private' : 'Public to Employers'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-900">Career Status & Opportunities</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      You can change whether you are actively looking for jobs or just browsing through your main Profile page.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => navigate('/user/profile')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        Manage Career Preferences <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: Danger Zone ── */}
            {activeTab === 'danger' && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle size={20} /> Danger Zone
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Critical account actions that affect your access and profile visibility.
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 sm:p-7 space-y-4">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-gray-900">Deactivate Your Account</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                      Temporarily disable your profile, applications, and messaging activity. Your data will be preserved, and you can easily reactivate by signing back in.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeactivateModal(true);
                        setDeactivateError('');
                        setDeactivatePassword('');
                      }}
                      className="rounded-xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 transition-all"
                    >
                      Deactivate Account
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── Deactivate Confirmation Modal ── */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Deactivate your account?</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                This action will hide your profile from recruiters. Please enter your password to confirm.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Enter Password to Confirm</label>
              <div className="relative">
                <input
                  type={showDeactivatePassword ? 'text' : 'password'}
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-100"
                />
                <button
                  type="button"
                  onClick={() => setShowDeactivatePassword(!showDeactivatePassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showDeactivatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {deactivateError && <p className="text-xs text-red-600 font-medium mt-1.5">{deactivateError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivatePassword('');
                  setDeactivateError('');
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivateLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {deactivateLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <span>Yes, Deactivate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;
