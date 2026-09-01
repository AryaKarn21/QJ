import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { getJobseekerProfile } from '../jobseekerApi/api';
import { changePassword } from '../../auth/authApi/authApi';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const UserSettings = () => {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<{ name: string; profilePic: string } | null>(null);
  const [notifications, setNotifications] = useState({
    allNotifications: false,
    applicationStatus: false,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getJobseekerProfile();
        setUser({ name: data.name, profilePic: data.profilePic });
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchProfile();
  }, []);

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
    } catch (err: any) {
      alert(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-auto p-6" style={{ maxHeight: 'calc(100vh - 50px)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="flex items-center space-x-3">
              {user?.profilePic ? (
                <img
                  src={`${MEDIA_URL.replace(/\/$/, "")}/${user.profilePic.replace(/^\//, "")}`}
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
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      <Eye size={20} />
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
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
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
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90"
                >
                  {loading ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Notification Setting</h2>
              <div className="space-y-4">
                {['allNotifications', 'applicationStatus'].map((key) => (
                  <div className="flex items-center justify-between" key={key}>
                    <span>
                      {{
                        allNotifications: 'All notifications',
                        applicationStatus: 'Notify me on application status',
                      }[key as keyof typeof notifications]}
                    </span>
                    <button
                      onClick={() => handleNotificationChange(key as keyof typeof notifications)}
                      className={`w-12 h-6 rounded-full transition-colors duration-200 ${notifications[key as keyof typeof notifications] ? 'bg-primary' : 'bg-gray-300'
                        }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transform transition-transform duration-200 ${notifications[key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'
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
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Deactivate Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
