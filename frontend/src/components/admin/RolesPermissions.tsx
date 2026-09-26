import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  Users,
  Key,
  AlertTriangle,
  Layers,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllUsers,
  updateUserRole,
  getRoles,
  getPermissionsCatalog,
  createRole,
  updateRole,
  deleteRole,
  assignUserRole,
  RoleModel,
  PermissionModuleGroup,
} from './adminApi/api';
import { DataTable, DataTableColumn } from '../ui/DataTable';
import { StatusBadge, StatusTone } from '../ui/StatusBadge';
import { FilterBar } from '../ui/FilterBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Drawer } from '../ui/Drawer';
import { useAdminAuth } from '../../context/useAdminAuth';
import { toast } from 'react-toastify';

type PlatformRole = 'jobseeker' | 'employer' | 'recruiter' | 'mentor' | 'admin' | 'superadmin' | string;

interface PlatformUser {
  _id: string;
  name: string;
  email: string;
  role: PlatformRole;
  customRole?: { _id: string; name: string; displayName: string } | null;
  createdAt: string;
}

const ROLE_TONE: Record<string, StatusTone> = {
  jobseeker: 'neutral',
  employer: 'info',
  recruiter: 'info',
  mentor: 'info',
  admin: 'accent',
  superadmin: 'warning',
  'content-manager': 'success',
  moderator: 'accent',
  support: 'info',
};

const ROLE_LABEL: Record<string, string> = {
  jobseeker: 'Jobseeker',
  employer: 'Employer',
  recruiter: 'Recruiter',
  mentor: 'Mentor',
  admin: 'Admin',
  superadmin: 'Super Admin',
  'content-manager': 'Content Manager',
  moderator: 'Moderator',
  support: 'Support Agent',
};

const ACTION_COLUMNS = ['view', 'create', 'edit', 'delete', 'publish', 'moderate', 'manage'];

const PAGE_SIZE = 15;

const RolesPermissions: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId: currentUserId, isSuperAdmin } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'roles' | 'matrix' | 'users'>('roles');

  // Drawer state for Create / Edit Role
  const [editingRole, setEditingRole] = useState<RoleModel | null | 'new'>(null);
  const [roleForm, setRoleForm] = useState<{
    name: string;
    displayName: string;
    description: string;
    status: 'active' | 'inactive';
    permissions: string[];
  }>({
    name: '',
    displayName: '',
    description: '',
    status: 'active',
    permissions: [],
  });

  // Delete role dialog
  const [roleToDelete, setRoleToDelete] = useState<RoleModel | null>(null);

  // User tab state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ role: 'all' });
  const [page, setPage] = useState(1);
  const [userToAssignRole, setUserToAssignRole] = useState<PlatformUser | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string>('jobseeker');
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string>('');

  // Queries
  const {
    data: roles = [],
    isLoading: loadingRoles,
    refetch: refetchRoles,
  } = useQuery<RoleModel[]>({
    queryKey: ['adminRoles'],
    queryFn: getRoles,
    staleTime: 30_000,
  });

  const {
    data: catalog = { modules: [], allKeys: [] },
    isLoading: loadingCatalog,
  } = useQuery<{ modules: PermissionModuleGroup[]; allKeys: string[] }>({
    queryKey: ['permissionsCatalog'],
    queryFn: getPermissionsCatalog,
    staleTime: 60_000,
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<PlatformUser[]>({
    queryKey: ['adminUsers'],
    queryFn: getAllUsers,
    staleTime: 30_000,
  });

  // Open Create Drawer
  const handleOpenCreate = () => {
    setRoleForm({
      name: '',
      displayName: '',
      description: '',
      status: 'active',
      permissions: [],
    });
    setEditingRole('new');
  };

  // Open Edit Drawer
  const handleOpenEdit = (role: RoleModel) => {
    setRoleForm({
      name: role.name,
      displayName: role.displayName || role.name,
      description: role.description || '',
      status: role.status || 'active',
      permissions: [...role.permissions],
    });
    setEditingRole(role);
  };

  // Role Mutation: Create / Update
  const roleSaveMutation = useMutation({
    mutationFn: async () => {
      if (editingRole === 'new') {
        return createRole({
          name: roleForm.name.trim().toLowerCase().replace(/\s+/g, '-'),
          displayName: roleForm.displayName.trim() || roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissions: roleForm.permissions,
        });
      } else if (editingRole && editingRole !== 'new') {
        return updateRole(editingRole._id, {
          displayName: roleForm.displayName,
          description: roleForm.description,
          status: roleForm.status,
          permissions: roleForm.permissions,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingRole === 'new' ? 'Role created successfully!' : 'Role updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
      setEditingRole(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save role');
    },
  });

  // Delete Role Mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
      setRoleToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    },
  });

  // User Role Assign Mutation
  const userAssignMutation = useMutation({
    mutationFn: () => {
      if (!userToAssignRole) return Promise.reject();
      return assignUserRole(userToAssignRole._id, {
        role: selectedRoleName,
        customRoleId: selectedCustomRoleId || null,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res.message || 'User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
      setUserToAssignRole(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user role');
    },
  });

  // Toggle single permission key in form
  const handleTogglePermission = (key: string) => {
    // If role is superadmin, protect against disabling all critical perms
    if (editingRole && editingRole !== 'new' && editingRole.name === 'superadmin') {
      const isCritical = ['roles.view', 'roles.edit', 'permissions.manage', 'security.manage'].includes(key);
      if (isCritical && roleForm.permissions.includes(key)) {
        toast.warn('Critical Super Admin permissions are protected against accidental removal.');
      }
    }

    setRoleForm((prev) => {
      const has = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: has ? prev.permissions.filter((p) => p !== key) : [...prev.permissions, key],
      };
    });
  };

  // Toggle all permissions in a module
  const handleToggleModuleAll = (moduleGroup: PermissionModuleGroup) => {
    const modKeys = moduleGroup.permissions.map((p) => p.key);
    const allSelected = modKeys.every((k) => roleForm.permissions.includes(k));

    setRoleForm((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((k) => !modKeys.includes(k))
        : Array.from(new Set([...prev.permissions, ...modKeys])),
    }));
  };

  // Select all or clear all
  const handleSelectAllGlobal = () => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: [...catalog.allKeys],
    }));
  };

  const handleClearAllGlobal = () => {
    if (editingRole && editingRole !== 'new' && editingRole.name === 'superadmin') {
      toast.error('Cannot clear all permissions for Super Admin');
      return;
    }
    setRoleForm((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  // Users Filter & Pagination
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (filters.role !== 'all' && u.role !== filters.role) return false;
      if (!term) return true;
      return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
    });
  }, [allUsers, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Dynamic filter config for users
  const roleFilterConfig = useMemo(() => {
    const options = [
      { label: 'All Roles', value: 'all' },
      ...roles.map((r) => ({ label: r.displayName || r.name, value: r.name })),
    ];
    return [{ key: 'role', label: 'Role', options }];
  }, [roles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Roles &amp; Permissions Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage granular access control, configure custom administrative roles, and inspect the permission matrix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'roles' && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 transition-colors"
            >
              <Plus size={16} /> Create Custom Role
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'roles'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers size={16} /> Roles Catalog ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'matrix'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders size={16} /> Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users size={16} /> User Role Assignment ({allUsers.length})
        </button>
      </div>

      {/* TAB 1: Roles Catalog */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => {
              const isSuper = r.name === 'superadmin';
              const permCount = isSuper ? catalog.allKeys.length : r.permissions?.length || 0;
              return (
                <div
                  key={r._id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {r.displayName || r.name}
                        </span>
                        {r.isSystem && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            System
                          </span>
                        )}
                      </div>
                      <StatusBadge
                        label={r.status === 'inactive' ? 'Inactive' : 'Active'}
                        tone={r.status === 'inactive' ? 'neutral' : 'success'}
                      />
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {r.description || 'Standard administrative role.'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span>
                        <strong>{permCount}</strong> / {catalog.allKeys.length} permissions
                      </span>
                      <span>
                        <strong>{r.userCount || 0}</strong> users
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Pencil size={13} /> {isSuper ? 'View Matrix' : 'Configure Permissions'}
                      </button>

                      {!r.isSystem && (
                        <button
                          onClick={() => setRoleToDelete(r)}
                          title="Delete Role"
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Permission Matrix Overview */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                System Permission Matrix
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing all modules across configured administrative roles
              </p>
            </div>

            {/* Matrix Table with responsive horizontal overflow */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                    <th className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 w-48">
                      Module
                    </th>
                    {roles.map((r) => (
                      <th
                        key={r._id}
                        className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 text-center min-w-[120px]"
                      >
                        {r.displayName || r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {catalog.modules.map((mod) => (
                    <tr key={mod.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                        <div>
                          <span>{mod.label}</span>
                          <span className="block text-[10px] text-slate-400">{mod.permissions.length} perms</span>
                        </div>
                      </td>

                      {roles.map((r) => {
                        const isSuper = r.name === 'superadmin';
                        const modKeys = mod.permissions.map((p) => p.key);
                        const assignedInMod = isSuper
                          ? modKeys.length
                          : modKeys.filter((k) => r.permissions.includes(k)).length;
                        const allAssigned = assignedInMod === modKeys.length;
                        const noneAssigned = assignedInMod === 0;

                        return (
                          <td key={r._id} className="py-2.5 px-3 text-center">
                            {allAssigned ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <Check size={14} className="stroke-[3]" /> Full
                              </span>
                            ) : noneAssigned ? (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                {assignedInMod}/{modKeys.length}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: User Role Assignment */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Search user by name or email…"
            filters={filters}
            filterConfigs={roleFilterConfig}
            onFilterChange={(key, value) => {
              setFilters((f) => ({ ...f, [key]: value }));
              setPage(1);
            }}
            resultCount={filteredUsers.length}
            resultLabel="user"
          />

          <DataTable
            columns={[
              {
                key: 'name',
                header: 'User',
                render: (u) => (
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{u.name || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (u) => (
                  <div className="flex items-center gap-1.5">
                    <StatusBadge
                      label={ROLE_LABEL[u.role] || u.role}
                      tone={ROLE_TONE[u.role] || 'info'}
                    />
                    {u.customRole && (
                      <span className="text-[11px] rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        {u.customRole.displayName || u.customRole.name}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'joined',
                header: 'Joined',
                render: (u) => (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'),
              },
              {
                key: 'actions',
                header: 'Action',
                className: 'text-right',
                render: (u) => {
                  const isSelf = u._id === currentUserId;
                  const isSuper = u.role === 'superadmin';

                  if (isSuper) {
                    return (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <Lock size={13} /> Protected
                      </span>
                    );
                  }

                  if (isSelf) {
                    return (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <Lock size={13} /> You
                      </span>
                    );
                  }

                  return (
                    <button
                      onClick={() => {
                        setUserToAssignRole(u);
                        setSelectedRoleName(u.role);
                        setSelectedCustomRoleId(u.customRole?._id || '');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Sliders size={13} /> Assign Role
                    </button>
                  );
                },
              },
            ]}
            data={pagedUsers}
            getRowKey={(u) => u._id}
            loading={loadingUsers}
            emptyTitle="No users found"
            emptyDescription="No users match your current search or filter."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* DRAWER: Create / Edit Role & Permission Matrix */}
      <Drawer
        open={editingRole !== null}
        onClose={() => setEditingRole(null)}
        title={editingRole === 'new' ? 'Create Custom Role' : `Configure Role: ${roleForm.displayName}`}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllGlobal}
                className="text-xs text-orange-600 hover:underline dark:text-orange-400"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClearAllGlobal}
                className="text-xs text-slate-500 hover:underline dark:text-slate-400"
              >
                Clear All
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingRole(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => roleSaveMutation.mutate()}
                disabled={roleSaveMutation.isPending || !roleForm.name.trim()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {roleSaveMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {editingRole !== 'new' && editingRole?.name === 'superadmin' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
              <span>
                <strong>Super Admin Override Active:</strong> Super Admin intrinsically possesses all platform permissions. Sensitive permissions are protected by self-lockout guards.
              </span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Role Name (Identifier)
              </label>
              <input
                value={roleForm.name}
                disabled={editingRole !== 'new' && (editingRole?.isSystem || false)}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="e.g. content-manager"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Label
              </label>
              <input
                value={roleForm.displayName}
                onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                placeholder="e.g. Content Manager"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <input
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="What can users with this role do?"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Permission Matrix By Module */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Module Permissions ({roleForm.permissions.length} selected)
              </h3>
            </div>

            <div className="space-y-3">
              {catalog.modules.map((mod) => {
                const modKeys = mod.permissions.map((p) => p.key);
                const allSelected = modKeys.every((k) => roleForm.permissions.includes(k));
                const someSelected = modKeys.some((k) => roleForm.permissions.includes(k));

                return (
                  <div
                    key={mod.name}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          {mod.label}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-400">
                          {mod.description}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleModuleAll(mod)}
                        className="text-[11px] font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                      >
                        {allSelected ? 'Deselect Module' : 'Select All'}
                      </button>
                    </div>

                    {/* Action Checkboxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {mod.permissions.map((p) => {
                        const checked = roleForm.permissions.includes(p.key);
                        return (
                          <label
                            key={p.key}
                            className={`flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'border-orange-200 bg-orange-50/50 text-slate-900 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-slate-100'
                                : 'border-slate-200 bg-slate-50/40 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePermission(p.key)}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold block truncate capitalize">
                                {p.action}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {p.key}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>

      {/* DIALOG: Assign Role to User */}
      <ConfirmDialog
        open={userToAssignRole !== null}
        onClose={() => setUserToAssignRole(null)}
        onConfirm={() => userAssignMutation.mutate()}
        loading={userAssignMutation.isPending}
        title={`Assign Role to ${userToAssignRole?.name}`}
        description="Select the platform role or custom administrative role to assign."
        confirmLabel="Save Assignment"
      >
        <div className="space-y-4 pt-3 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Platform Role
            </label>
            <select
              value={selectedRoleName}
              onChange={(e) => setSelectedRoleName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="jobseeker">Job Seeker</option>
              <option value="employer">Employer / Job Provider</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Administrative Role (Optional)
            </label>
            <select
              value={selectedCustomRoleId}
              onChange={(e) => setSelectedCustomRoleId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">None (Standard Role Permissions)</option>
              {roles
                .filter((r) => !['superadmin', 'jobseeker', 'employer'].includes(r.name))
                .map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.displayName || r.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </ConfirmDialog>

      {/* DIALOG: Delete Custom Role */}
      <ConfirmDialog
        open={roleToDelete !== null}
        onClose={() => setRoleToDelete(null)}
        onConfirm={() => roleToDelete && deleteRoleMutation.mutate(roleToDelete._id)}
        loading={deleteRoleMutation.isPending}
        variant="danger"
        title={`Delete role "${roleToDelete?.displayName || roleToDelete?.name}"?`}
        description="This action cannot be undone. Users assigned to this role will revert to basic permissions."
        confirmLabel="Delete Role"
      />
    </div>
  );
};

export default RolesPermissions;