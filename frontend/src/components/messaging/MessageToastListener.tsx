import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from '../../context/SocketContext';
import { useCurrentUser } from '../../utils/currentUser';
import type { DirectMessage } from '../../types/community';

function messagePreviewText(msg: DirectMessage): string {
  if (msg.type === 'call' && msg.call) {
    const kind = msg.call.callType === 'video' ? 'Video call' : 'Voice call';
    return msg.call.status === 'completed' ? `${kind} ended` : `Missed ${kind.toLowerCase()}`;
  }
  if (msg.attachments && msg.attachments.length > 0) {
    return msg.text ? msg.text : '📎 Sent an attachment';
  }
  return msg.text;
}

// Mounted once at the app root (see App.tsx), independent of whether the
// Messages page is even open. This is what actually makes a new message
// *noticeable* to the recipient rather than a silent bump on the
// notification bell they may not be looking at: a toast everywhere in the
// app, plus a real OS-level notification when the tab is backgrounded.
//
// Deliberately skips the toast when the recipient already has this exact
// conversation open (the ChatPanel itself shows the message inline —
// popping a toast on top of it would just be noise).
export default function MessageToastListener() {
  const { socket } = useSocket();
  const { userId, isAuthenticated } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  // Ask once per login for permission to show OS notifications while the
  // tab is backgrounded. Skipped entirely if the browser doesn't support it
  // or the user already answered (granted or denied) — never re-prompts.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleNewMessage = (msg: DirectMessage) => {
      if (msg.sender === userId) return; // our own message echoed back
      const threadPath = `/messages/${msg.conversation}`;
      if (locationRef.current === threadPath) return; // already looking at it

      const title = msg.senderName || 'New message';
      const body = messagePreviewText(msg);

      toast.info(
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-slate-500 truncate">{body}</p>
        </div>,
        { onClick: () => navigate(threadPath) }
      );

      if (
        typeof document !== 'undefined' && document.hidden &&
        typeof window !== 'undefined' && 'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const n = new Notification(title, { body, tag: msg.conversation });
          n.onclick = () => {
            window.focus();
            navigate(threadPath);
            n.close();
          };
        } catch {
          // Some browsers throw constructing Notification from a background
          // tab under certain permission states — never let that break chat.
        }
      }
    };

    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [socket, userId, navigate]);

  return null;
}
