import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { fetchMyNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/notificationApi';
import { useSocket } from '../../context/SocketContext';
import { useCurrentUser } from '../../utils/currentUser';
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

export function NotificationBell() {
  const { isAuthenticated } = useCurrentUser();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
// State for pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = (nextPage = 1, replace = false) => {
    if (loading) return;
    setLoading(true);
    fetchMyNotifications(nextPage)
      .then((res) => {
        if (replace) {
          setNotifications(res.notifications);
        } else {
          setNotifications((prev) => [...prev, ...res.notifications]);
        }
        setUnreadCount(res.unreadCount);
        setHasMore(res.hasMore);
        setPage(nextPage);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  };
  // Duplicate simple loader removed – pagination handled by the overloaded loadNotifications function above.

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnreadCount((c) => c + 1);
    socket.on('notification:new', handler);
    return () => {
      socket.off('notification:new', handler);
    };
  };

  // Infinite scroll: load more when sentinel becomes visible
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadNotifications(page + 1);
        }
      },
      { root: null, rootMargin: '0px', threshold: 1.0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => {
      if (sentinelRef.current) observer.unobserve(sentinelRef.current);
    };
  }, [hasMore, loading, page]);
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  const handleToggle = () => {
    setOpen((v) => !v);
    if (!loaded) loadNotifications(1, true);
  };

  const handleClickNotification = async (n: CommunityNotification) => {
    if (!n.isRead) {
      markNotificationRead(n._id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleToggle} className="relative rounded-full p-2 text-gray-600 hover:bg-secondary hover:text-dark">
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-light">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] rounded-xl border border-gray-200 bg-light shadow-card-hover">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-dark">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="text-xs font-medium text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleClickNotification(n)}
                  className={`block w-full border-b border-gray-50 px-4 py-3 text-left text-sm hover:bg-secondary ${!n.isRead ? 'bg-primary/5' : ''}`}
                >
                  <p className="text-dark">{n.message}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
                </button>
              ))
            )}
          <div ref={sentinelRef} />
          </div>
        </div>
      )}
    </div>
  );
}
