import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Lock, ShieldAlert, UserX, ShieldCheck, Unlock, AlertTriangle } from 'lucide-react';
import { DataTable, DataTableColumn } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { KpiCard } from '../../ui/KpiCard';
import {
  getSecurityOverview,
  getLockedAccounts,
  unlockAccount,
  getRecentFailedLogins,
  SecurityOverview,
  LockedAccount,
  AuditLogEntry,
} from '../adminApi/api';

const formatDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

const Security: React.FC = () => {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [failedLogins, setFailedLogins] = useState<AuditLogEntry[]>([]);
  const [loadingLocked, setLoadingLocked] = useState(true);
  const [loadingFailed, setLoadingFailed] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const loadOverview = () => getSecurityOverview().then(setOverview).catch(() => {});

  const loadLockedAccounts = async () => {
    setLoadingLocked(true);
    try {
      const res = await getLockedAccounts();
      setLockedAccounts(res.accounts);
    } catch {
      toast.error('Failed to load locked accounts');
    } finally {
      setLoadingLocked(false);
    }
  };

  const loadFailedLogins = async () => {
    setLoadingFailed(true);
    try {
      const res = await getRecentFailedLogins(25);
      setFailedLogins(res.events);
    } catch {
      toast.error('Failed to load failed login events');
    } finally {
      setLoadingFailed(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadLockedAccounts();
    loadFailedLogins();
  }, []);

  const handleUnlock = async (account: LockedAccount) => {
    if (!window.confirm(`Unlock ${account.email}? They'll be able to attempt login again immediately.`)) {
      return;
    }
    setUnlockingId(account._id);
    try {
      await unlockAccount(account._id);
      toast.success(`${account.email} unlocked`);
      loadLockedAccounts();
      loadOverview();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to unlock account');
    } finally {
      setUnlockingId(null);
    }
  };

  const lockedColumns: DataTableColumn<LockedAccount>[] = [
    {
      key: 'account',
      header: 'Account',
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{a.name || '—'}</p>
          <p className="truncate text-xs text-slate-400">{a.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (a) => <span className="capitalize text-slate-600 dark:text-slate-300">{a.role}</span>,
    },
    {
      key: 'failedLoginAttempts',
      header: 'Failed Attempts',
      render: (a) => <span className="text-slate-600 dark:text-slate-300">{a.failedLoginAttempts}</span>,
    },
    {
      key: 'lockUntil',
      header: 'Locked Until',
      render: (a) => (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDateTime(a.lockUntil)}</span>
      ),
    },
    {
      key: 'lastLoginIP',
      header: 'Last IP',
      render: (a) => <span className="text-xs text-slate-400">{a.lastLoginIP || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (a) => (
        <button
          onClick={() => handleUnlock(a)}
          disabled={unlockingId === a._id}
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-[#F97316] transition-colors hover:bg-orange-50 disabled:opacity-50"
        >
          <Unlock size={14} />
          {unlockingId === a._id ? 'Unlocking…' : 'Unlock'}
        </button>
      ),
    },
  ];

  const failedLoginColumns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (log) => (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDateTime(log.createdAt)}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Target',
      render: (log) => {
        // recordAudit() never sets `actor` for a login-failure event (the
        // "actor" would be the target account itself, not some other
        // authenticated user acting on it) — the real target email is
        // written to `targetLabel` instead. Reading `actor?.email` here
        // meant this column showed "Unknown account" for every single
        // row, even ones with a perfectly good known target. Only a
        // genuine "no such account" attempt (metadata.reason ===
        // "no_such_account") has no email at all to show, by design —
        // logging an attacker-supplied email for a nonexistent account
        // would just be log pollution.
        const label = log.targetLabel || log.actor?.email;
        return label ? (
          <span className="text-slate-700 dark:text-slate-300">{label}</span>
        ) : (
          <span className="text-slate-400">Unknown account</span>
        );
      },
    },
    {
      key: 'action',
      header: 'Event',
      render: (log) => (
        <StatusBadge
          label={
            log.action === 'auth.login_blocked_locked'
              ? 'Blocked (locked)'
              : log.action === 'auth.account_locked'
              ? 'Locked out (this attempt)'
              : 'Failed attempt'
          }
          tone="danger"
        />
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      render: (log) => <span className="text-xs text-slate-400">{log.ip || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          <Lock size={20} /> Security
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Account lockouts, recent failed logins, and platform-wide security posture.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Locked Accounts"
          value={overview?.lockedAccounts ?? '—'}
          icon={<Lock size={18} />}
          accent="rose"
        />
        <KpiCard
          label="Failed Logins (24h)"
          value={overview?.failedLogins24h ?? '—'}
          icon={<ShieldAlert size={18} />}
          accent="amber"
        />
        <KpiCard
          label="Deactivated Accounts"
          value={overview?.deactivatedAccounts ?? '—'}
          icon={<UserX size={18} />}
          accent="blue"
        />
        <KpiCard
          label="Admins & Superadmins"
          value={overview?.adminCount ?? '—'}
          icon={<ShieldCheck size={18} />}
          accent="violet"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Currently Locked Accounts</h2>
        </div>
        <DataTable
          columns={lockedColumns}
          data={lockedAccounts}
          getRowKey={(a) => a._id}
          loading={loadingLocked}
          emptyTitle="No locked accounts"
          emptyDescription="Accounts get locked automatically after repeated failed login attempts."
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Failed Logins</h2>
        <DataTable
          columns={failedLoginColumns}
          data={failedLogins}
          getRowKey={(log) => log._id}
          loading={loadingFailed}
          emptyTitle="No recent failed logins"
          emptyDescription="Failed login attempts across the platform will show up here."
        />
      </div>
    </div>
  );
};

export default Security;