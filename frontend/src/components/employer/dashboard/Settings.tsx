import { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import { getEmployerProfile, updateNotificationPreferences, deactivateEmployerAccount } from '../employerApi/api';
import { changePassword } from '../../auth/authApi/authApi';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || import.meta.env.VITE_API_BASE_URL || "https://qj.onrender.com";

type NotificationPrefs = {
  allNotifications: boolean;
  newApplications: boolean;
};

const EmployerSettings = () => {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [user, setUser] = useState<{ name: string; companyLogo: string } | null>(null);

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
        setUser({ name: data.name, companyLogo: data.companyLogo });
        // notificationPreferences lives on the User document itself, so it
        // comes back for free with the profile fetch — fall back to the
        // schema defaults (true/true) if the account predates this field.
        setNotifications({
          allNotifications: data.notificationPreferences?.allNotifications ?? true,
          newApplications: data.notificationPreferences?.newApplications ?? true,
        });
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchProfile();
  }, []);

  const handleNotificationChange = async (key: keyof NotificationPrefs) => {
    const nextValue = !notifications[key];
    const previous = notifications;

    // Optimistic update so the toggle feels instant; roll back on failure.
    setNotifications((prev) => ({ ...prev, [key]: nextValue }));
    setNotifLoading(true);
    try {
      await updateNotificationPreferences({ [key]: nextValue });
    } catch (err) {
      console.error('Failed to update notification preference:', err);
      setNotifications(previous);
      alert('Could not save that setting. Please try again.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      await changePassword({ currentPassword: oldPassword, newPassword });
      alert('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
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
      await deactivateEmployerAccount(deactivatePassword);
      // Account is now deactivated server-side; log the session out locally
      // and send the employer to login, where they'll get the
      // "account deactivated" message if they try to sign back in.
      localStorage.removeItem('token');
      window.location.href = '/login?deactivated=true';
    } catch (err: any) {
      setDeactivateError(err?.response?.data?.message || 'Failed to deactivate account.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-auto p-6" style={{ maxHeight: 'calc(100vh - 50px)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="flex items-center space-x-3">
              {user?.companyLogo ? (
                <img
                  src={`${MEDIA_URL.replace(/\/$/, "")}/${user.companyLogo.replace(/^\//, "")}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-300 text-3xl font-bold text-gray-500">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
              <span>{user?.name || 'Loading...'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Password Change Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Change your Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Enter your old password
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      aria-label="Toggle old password visibility"
                    >
                      {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Enter your new password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg pr-10"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      aria-label="Toggle new password visibility"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">At least 6 characters.</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Confirm your password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60"
                >
                  {passwordLoading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Notification Setting</h2>
              <div className="space-y-4">
                {(['allNotifications', 'newApplications'] as const).map((key) => (
                  <div className="flex items-center justify-between" key={key}>
                    <span>
                      {{
                        allNotifications: 'All notifications',
                        newApplications: 'Notify me on new Applications'
                      }[key]}
                    </span>
                    <button
                      onClick={() => handleNotificationChange(key)}
                      disabled={notifLoading}
                      className={`w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-60 ${notifications[key] ? 'bg-primary' : 'bg-gray-300'
                        }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transform transition-transform duration-200 ${notifications[key] ? 'translate-x-7' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
            <div>
              <h3 className="font-medium mb-2">Deactivate Account</h3>
              <p className="text-gray-600 mb-4">
                Once you deactivate this account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Deactivate Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowDeactivateModal(false);
                setDeactivatePassword('');
                setDeactivateError('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Deactivate your account?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your job postings will be hidden and you'll be logged out immediately.
                  This action cannot be undone from here — contact support to reactivate.
                </p>
              </div>
            </div>

            <label className="block text-sm text-gray-600 mb-1">
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-2"
              autoFocus
            />
            {deactivateError && (
              <p className="text-sm text-red-600 mb-2">{deactivateError}</p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivatePassword('');
                  setDeactivateError('');
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivateLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {deactivateLoading ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerSettings;