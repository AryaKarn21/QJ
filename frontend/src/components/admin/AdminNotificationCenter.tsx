import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../api/notificationApi';
import type { CommunityNotification } from '../../types/community';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const units: [number, string][] = [[86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label} ago`;
  }
  return 'just now';
}

type FilterTab = 'all' | 'unread' | 'read';

/**
 * Super Admin's Notification Center — real, persisted notifications
 * (backend/models/Notification.js), not the placeholder the admin
 * Sidebar previously showed. Reuses the same GET /api/notification/me,
 * mark-read, and mark-all-read endpoints the bell dropdown already uses
 * (backend/controllers/notificationController.js) plus a new DELETE
 * endpoint, so unread counts stay in sync between this page and the bell.
 */
export default function AdminNotificationCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<FilterTab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchMyNotifications(1)
      .then((res) => {
        setNotifications(res.notifications);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchMyNotifications(next);
      setNotifications((prev) => [...prev, ...res.notifications]);
      setHasMore(res.hasMore);
      setPage(next);
    } catch {
      toast.error('Could not load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleClick = async (n: CommunityNotification) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      markNotificationRead(n._id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkRead = async (e: React.MouseEvent, n: CommunityNotification) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    try {
      await markNotificationRead(n._id);
    } catch {
      toast.error('Could not mark as read.');
      load();
    }
  };

  const handleMarkAll = async () => {
    const prev = notifications;
    setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Could not mark all as read.');
      setNotifications(prev);
    }
  };

  const handleDelete = async (e: React.MouseEvent, n: CommunityNotification) => {
    e.stopPropagation();
    if (!window.confirm('Delete this notification?')) return;
    setBusyId(n._id);
    try {
      await deleteNotification(n._id);
      setNotifications((prev) => prev.filter((x) => x._id !== n._id));
    } catch {
      toast.error('Could not delete notification.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.isRead;
    if (tab === 'read') return n.isRead;
    return true;
  });
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real platform events — new registrations, job postings, subscription activity, and more.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
        {(['all', 'unread', 'read'] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t} {t === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load notifications.{' '}
          <button onClick={load} className="font-medium underline">Retry</button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <Bell size={28} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {tab === 'unread' ? "No unread notifications." : tab === 'read' ? 'No read notifications yet.' : 'No notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n._id}
              onClick={() => handleClick(n)}
              className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 transition-colors ${
                n.isRead
                  ? 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                  : 'border-violet-200 bg-violet-50 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm text-slate-800 dark:text-slate-100">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!n.isRead && (
                  <button
                    onClick={(e) => handleMarkRead(e, n)}
                    title="Mark as read"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(e, n)}
                  disabled={busyId === n._id}
                  title="Delete"
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                >
                  {busyId === n._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
