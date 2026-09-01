import React, { useState } from 'react';
import { Trash2, Mail, Calendar, Briefcase, FileText } from 'lucide-react';
import { Drawer } from '../../ui/Drawer';
import { StatusBadge } from '../../ui/StatusBadge';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { deleteUser } from '../adminApi/api';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'jobseeker' | 'employer' | 'admin' | 'superadmin';
  isVerified?: boolean;
  createdAt: string;
  profilePic?: string;
  companyLogo?: string;
  resume?: string;
  panNumber?: string;
  industryType?: string;
  companySize?: string;
  address?: string;
  telephone?: string;
  description?: string;
  skills?: string[];
}

interface UserDrawerProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onUserUpdated: (updated: AdminUser) => void;
  onUserDeleted: (id: string) => void;
}

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';
const mediaUrl = (path?: string) =>
  path ? `${MEDIA_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : null;

/**
 * Slide-over detail panel for a single user (job seeker or employer).
 * Opened by clicking a row in UserManagement. Handles verify (employers
 * only) and delete inline, so an admin never has to leave the list.
 */
export const UserDrawer: React.FC<UserDrawerProps> = ({
  user,
  open,
  onClose,
  onUserDeleted,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const avatarUrl = mediaUrl(user.profilePic) || mediaUrl(user.companyLogo);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteUser(user._id);
      onUserDeleted(user._id);
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title={user.name} description={user.email}>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-lg font-semibold text-violet-700 dark:from-violet-500/20 dark:to-violet-600/20 dark:text-violet-400">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {user.name}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge label={user.role} tone="neutral" />
                {user.role === 'employer' && (
                  <StatusBadge
                    label={user.isVerified ? 'Verified' : 'Unverified'}
                    tone={user.isVerified ? 'success' : 'warning'}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Mail size={14} className="text-slate-400" /> {user.email}
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Calendar size={14} className="text-slate-400" />
              Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Employer-specific details */}
          {user.role === 'employer' && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Briefcase size={14} className="text-slate-400" />
                {user.industryType || 'Industry not set'}
              </div>
              {user.companySize && (
                <p className="text-slate-500 dark:text-slate-400">Company size: {user.companySize}</p>
              )}
              {user.panNumber && (
                <p className="text-slate-500 dark:text-slate-400">PAN: {user.panNumber}</p>
              )}
              {user.address && (
                <p className="text-slate-500 dark:text-slate-400">{user.address}</p>
              )}
              {user.description && (
                <p className="whitespace-pre-wrap text-slate-500 dark:text-slate-400">{user.description}</p>
              )}
            </div>
          )}

          {/* Job seeker-specific details */}
          {user.role === 'jobseeker' && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              {user.resume ? (
                <a
                  href={mediaUrl(user.resume) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-violet-600 hover:underline dark:text-violet-400"
                >
                  <FileText size={14} /> View resume
                </a>
              ) : (
                <p className="text-slate-400">No resume uploaded</p>
              )}
              {user.skills && user.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {user.role === 'employer' && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Verification decisions are handled in Company Management.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${user.name}?`}
        description="This account and its data will be permanently removed. This cannot be undone."
        confirmLabel="Delete account"
        variant="danger"
      />
    </>
  );
};

export default UserDrawer;