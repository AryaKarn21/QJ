import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  Send, Search, Loader2, AlertCircle, MessageCircle,
  Phone, Video, MoreHorizontal, ChevronLeft, X, Check, CheckCheck, Edit3, User,
} from 'lucide-react';
import { fetchConversations, fetchMessages, sendMessage } from '../../api/messageApi';
import { useSocket } from '../../context/SocketContext';
import { useCurrentUser } from '../../utils/currentUser';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { Avatar } from '../community/Avatar';
import type { ConversationSummary, DirectMessage } from '../../types/community';
import { useWebRTC } from './useWebRTC';
import { CallOverlay } from './CallOverlay';

function timeLabel(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function relativeLabel(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return new Date(d).toLocaleDateString([], { weekday: 'short' });
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dayLabel(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

type PendingMessage = DirectMessage & { _pending?: boolean; _failed?: boolean };

const TYPING_DEBOUNCE_MS = 2000;
const TYPING_AUTO_CLEAR_MS = 5000;

// ─── Sidebar conversation item ────────────────────────────────────────────────

function ConvItem({
  conv, active, onClick,
}: { conv: ConversationSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors relative group min-h-[44px] ${active ? 'bg-blue-50 border-l-[3px] border-blue-600' : 'border-l-[3px] border-transparent'}`}
    >
      {/* Avatar with online dot */}
      <div className="relative flex-shrink-0">
        <Avatar user={conv.otherUser} size={12} />
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
            {conv.otherUser.name}
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0">
            {conv.lastMessageAt ? relativeLabel(conv.lastMessageAt) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate min-w-0 ${conv.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
            {conv.lastMessage?.text || 'Start a conversation'}
          </p>
          {conv.unreadCount > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function Bubble({
  msg, mine, showAvatar, conv, read, onRetry,
}: {
  msg: PendingMessage;
  mine: boolean;
  showAvatar: boolean;
  conv: ConversationSummary;
  read: boolean;
  onRetry: (msg: PendingMessage) => void;
}) {
  return (
    <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar — only shown for last message in a group */}
      <div className="w-8 flex-shrink-0">
        {!mine && showAvatar && <Avatar user={conv.otherUser} size={8} />}
      </div>

      <div className={`flex min-w-0 flex-col max-w-[85%] sm:max-w-[75%] md:max-w-[68%] ${mine ? 'items-end' : 'items-start'}`}>
        <button
          type="button"
          onClick={() => msg._failed && onRetry(msg)}
          disabled={!msg._failed}
          className={`min-w-0 max-w-full px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm text-left ${
            mine
              ? msg._failed
                ? 'bg-red-500 text-white rounded-br-none cursor-pointer'
                : 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
          } ${msg._pending ? 'opacity-60' : ''} ${!msg._failed ? 'cursor-default' : ''}`}
        >
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</p>
        </button>

        <div className={`flex items-center gap-1 mt-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-400">
            {msg._pending ? 'Sending…' : msg._failed ? 'Failed' : timeLabel(msg.createdAt)}
          </span>
          {mine && !msg._pending && !msg._failed && (
            read
              ? <CheckCheck size={12} className="text-blue-500" aria-label="Read" />
              : <Check size={12} className="text-slate-300" aria-label="Sent" />
          )}
        </div>

        {msg._failed && (
          <button
            onClick={() => onRetry(msg)}
            className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5 px-1 hover:underline"
          >
            <AlertCircle size={10} /> Tap to retry
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  conv, onVoiceCall, onVideoCall, onMarkRead, onBack,
}: {
  conv: ConversationSummary;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onMarkRead: (id: string) => void;
  onBack: () => void;
}) {
  const { userId } = useCurrentUser();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Reset all per-conversation transient UI state (including the draft —
  // previously left in place, so typing a draft in one chat and switching
  // conversations silently pre-filled the *next* chat's input box with it)
  // whenever the open conversation changes.
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setPage(1);
    setText('');
    setSending(false);
    setOtherTyping(false);
    setReadAt(null);
    isTypingRef.current = false;
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    fetchMessages(conv._id, 1)
      .then((res) => {
        setMessages(res.messages);
        setHasMore(res.hasMore);
        onMarkRead(conv._id);
        setTimeout(() => scrollToBottom(false), 50);
      })
      .catch(() => toast.error('Could not load messages.'))
      .finally(() => setLoading(false));
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv._id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('conversation:join', conv._id);

    const handleNewMessage = (msg: DirectMessage) => {
      if (msg.conversation !== conv._id) return;
      setMessages((p) => {
        // The sender's own socket also receives this broadcast — if the
        // optimistic-send's REST response already landed (or lands right
        // after), the same message would otherwise be appended twice.
        if (p.some((m) => m._id === msg._id)) return p;
        return [...p, msg];
      });
      setTimeout(() => scrollToBottom(), 50);
    };

    const handleTyping = ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      if (conversationId !== conv._id) return;
      setOtherTyping(isTyping);
      if (otherTypingTimeoutRef.current) { clearTimeout(otherTypingTimeoutRef.current); otherTypingTimeoutRef.current = null; }
      if (isTyping) {
        // Safety net in case the "stopped typing" event never arrives
        // (dropped connection, tab closed mid-type).
        otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_AUTO_CLEAR_MS);
      }
    };

    const handleRead = (data: { conversationId: string; readerId: string; readAt: string }) => {
      if (data.conversationId !== conv._id || data.readerId === userId) return;
      setReadAt(data.readAt);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:typing', handleTyping);
    socket.on('conversation:read', handleRead);
    return () => {
      socket.emit('conversation:leave', conv._id);
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:typing', handleTyping);
      socket.off('conversation:read', handleRead);
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
    };
  }, [socket, conv._id, userId, scrollToBottom]);

  const loadMore = async () => {
    setLoadingMore(true);
    const prev = containerRef.current?.scrollHeight || 0;
    try {
      const res = await fetchMessages(conv._id, page + 1);
      setMessages((p) => [...res.messages, ...p]);
      setHasMore(res.hasMore);
      setPage((p) => p + 1);
      // keep scroll position after prepend
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight - prev;
        }
      });
    } catch { toast.error('Could not load older messages.'); }
    finally { setLoadingMore(false); }
  };

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    if (isTypingRef.current && socket) {
      isTypingRef.current = false;
      socket.emit('conversation:typing', { conversationId: conv._id, isTyping: false });
    }
  }, [socket, conv._id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    if (!socket) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('conversation:typing', { conversationId: conv._id, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_DEBOUNCE_MS);
  };

  // Sends (or re-sends) `body` under `id` (a fresh temp id for a new
  // message, or an existing failed message's id for a retry). Dedupes
  // against the real-time `message:new` broadcast either order arrives in:
  // if the socket delivers the saved message before this REST call
  // resolves, the temp entry is simply dropped instead of duplicated.
  const deliver = async (id: string, body: string) => {
    setSending(true);
    try {
      const saved = await sendMessage(conv._id, body);
      setMessages((p) => {
        const withoutTemp = p.filter((m) => m._id !== id);
        if (withoutTemp.some((m) => m._id === saved._id)) return withoutTemp;
        return [...withoutTemp, saved];
      });
    } catch (err) {
      setMessages((p) => p.map((m) => m._id === id ? { ...m, _pending: false, _failed: true } : m));
      // A 403 here means the messaging-permission check failed (e.g. one
      // side blocked the other) — worth a specific toast, not just the
      // silent "failed" bubble, so the sender understands why.
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        toast.error(err.response.data?.message || "You can't send messages in this conversation.");
      }
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (!text.trim() || sending || !userId) return;
    const body = text.trim();
    const tempId = `tmp-${Date.now()}`;
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    stopTyping();
    setMessages((p) => [...p, { _id: tempId, conversation: conv._id, sender: userId, text: body, createdAt: new Date().toISOString(), _pending: true }]);
    setTimeout(() => scrollToBottom(), 50);
    await deliver(tempId, body);
  };

  const retry = (msg: PendingMessage) => {
    if (sending) return;
    setMessages((p) => p.map((m) => m._id === msg._id ? { ...m, _pending: true, _failed: false } : m));
    deliver(msg._id, msg.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Group messages by day then by sender for avatar display
  type Item = { type: 'divider'; label: string } | { type: 'msg'; msg: PendingMessage; showAvatar: boolean };
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let lastDay = '';
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const day = dayLabel(m.createdAt);
      if (day !== lastDay) { out.push({ type: 'divider', label: day }); lastDay = day; }
      // Show avatar if last message in a sender group
      const next = messages[i + 1];
      const showAvatar = !next || next.sender !== m.sender;
      out.push({ type: 'msg', msg: m, showAvatar });
    }
    return out;
  }, [messages]);

  const profileHref = conv.otherUser.role === 'employer'
    ? `/community/company/${conv.otherUser._id}`
    : `/community/profile/${conv.otherUser._id}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2 sm:px-5 sm:py-3 z-10">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            aria-label="Back to conversations"
            className="md:hidden flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 -ml-1"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="relative flex-shrink-0">
            <Avatar user={conv.otherUser} size={10} linkToProfile />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 leading-tight truncate">{conv.otherUser.name}</p>
            <p className="text-xs text-slate-400 truncate">
              {otherTyping ? <span className="text-blue-500 font-medium">typing…</span> : conv.otherUser.headline || 'Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <IconBtn icon={<Phone size={17} />} label="Voice call" onClick={onVoiceCall} hoverColor="hover:text-green-600" />
          <IconBtn icon={<Video size={17} />} label="Video call" onClick={onVideoCall} hoverColor="hover:text-blue-600" />
          <div className="relative">
            <IconBtn icon={<MoreHorizontal size={17} />} label="More options" onClick={() => setMoreOpen((v) => !v)} />
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <a
                    href={profileHref}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User size={15} /> View profile
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-6 space-y-1" style={{ background: '#f3f2ef' }}>
        {loading ? (
          <div className="flex justify-center pt-10"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-3">
                <button onClick={loadMore} disabled={loadingMore}
                  className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-4 py-1.5 hover:bg-slate-50 shadow-sm disabled:opacity-60">
                  {loadingMore ? <Loader2 size={11} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <MessageCircle size={28} className="text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Start the conversation</p>
                <p className="text-xs text-slate-400 mt-1">Say hello to {conv.otherUser.name} 👋</p>
              </div>
            ) : items.map((item, i) =>
              item.type === 'divider' ? (
                <div key={`d-${i}`} className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] text-slate-400 bg-white rounded-full px-3 py-1 border border-slate-200 shadow-sm">{item.label}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              ) : (
                <Bubble
                  key={item.msg._id}
                  msg={item.msg}
                  mine={item.msg.sender === userId}
                  showAvatar={item.showAvatar}
                  conv={conv}
                  read={!!readAt && item.msg.createdAt <= readAt}
                  onRetry={retry}
                />
              )
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input ── */}
      <div className="border-t border-slate-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:pb-3">
        <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            placeholder={`Message ${conv.otherUser.name}…`}
            rows={1}
            aria-label="Type a message"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed py-1.5"
            style={{ maxHeight: 120 }}
          />
          <button onClick={send} disabled={!text.trim() || sending} aria-label="Send message"
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${text.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="hidden sm:block text-[10px] text-slate-400 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function IconBtn({ icon, label, onClick, hoverColor = 'hover:text-slate-700' }: { icon: React.ReactNode; label: string; onClick: () => void; hoverColor?: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-slate-400 ${hoverColor} hover:bg-slate-100 transition-colors`}>
      {icon}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { userId } = useCurrentUser();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const {
    callState, callType, incomingCall, localStream, remoteStream,
    isMuted, isCamOff, callDuration, error: callError, dismissError,
    startCall, answerCall, rejectCall, endCall, toggleMute, toggleCamera,
  } = useWebRTC(socket, userId || '');

  useEffect(() => {
    fetchConversations()
      .then(setConversations)
      .catch(() => toast.error('Could not load conversations.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.otherUser.name.toLowerCase().includes(q));
  }, [conversations, search]);

  const active = conversations.find((c) => c._id === conversationId);
  // Which pane mobile shows is derived directly from the route, not a
  // separately-tracked boolean — the previous `mobileShowChat` state could
  // desync from the URL (e.g. browser back navigation clearing
  // `conversationId` without going through the in-app "Back" button),
  // stranding the UI on an empty chat pane with no way back except leaving
  // the page entirely.
  const showingChat = !!conversationId;

  const markRead = (id: string) =>
    setConversations((p) => p.map((c) => c._id === id ? { ...c, unreadCount: 0 } : c));

  const handleVoiceCall = () => {
    if (!active) return;
    startCall(active.otherUser._id, 'audio', active.otherUser.name, resolveMediaUrl(active.otherUser.avatar));
  };
  const handleVideoCall = () => {
    if (!active) return;
    startCall(active.otherUser._id, 'video', active.otherUser.name, resolveMediaUrl(active.otherUser.avatar));
  };

  const callRemoteName = incomingCall?.callerName || active?.otherUser.name || 'Unknown';
  const callRemoteAvatar = incomingCall?.callerAvatar || resolveMediaUrl(active?.otherUser.avatar);

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="min-h-dvh bg-[#f3f2ef]">
      {/* Call overlay */}
      {(callState === 'calling' || callState === 'incoming' || callState === 'connected' || callState === 'failed') && (
        <CallOverlay
          callState={callState} callType={callType}
          remoteName={callRemoteName} remoteAvatar={callRemoteAvatar}
          localStream={localStream} remoteStream={remoteStream}
          isMuted={isMuted} isCamOff={isCamOff} callDuration={callDuration}
          error={callError}
          onAnswer={answerCall} onReject={rejectCall} onEnd={endCall}
          onToggleMute={toggleMute} onToggleCamera={toggleCamera}
          onDismissError={dismissError}
        />
      )}

      <div className="mx-auto max-w-5xl px-0 py-0 sm:px-4 sm:py-6">
        <div className="flex h-[calc(100dvh-4rem)] overflow-hidden border-0 border-slate-200 bg-white sm:h-[calc(100dvh-120px)] sm:min-h-[560px] sm:rounded-xl sm:border sm:shadow-sm">

          {/* ── LEFT SIDEBAR ── */}
          <div className={`w-full flex-shrink-0 flex-col border-r border-slate-100 md:flex md:w-[320px] ${showingChat ? 'hidden' : 'flex'}`}>
            {/* Sidebar header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Messaging</h2>
                  {totalUnread > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <button aria-label="New message" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <Edit3 size={16} />
                </button>
              </div>
              {/* Search */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-2">
                <Search size={14} className="text-slate-400 flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages"
                  aria-label="Search messages"
                  className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full min-w-0"
                />
                {search && (
                  <button onClick={() => setSearch('')} aria-label="Clear search">
                    <X size={13} className="text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-slate-100 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <MessageCircle size={22} className="text-blue-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {search ? 'No results' : 'No conversations yet'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {search ? `Nothing matched "${search}"` : 'Start chatting from someone\'s profile.'}
                  </p>
                </div>
              ) : (
                <div>
                  {filtered.map((c) => (
                    <ConvItem
                      key={c._id}
                      conv={c}
                      active={c._id === conversationId}
                      onClick={() => navigate(`/messages/${c._id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className={`min-w-0 flex-1 flex-col md:flex ${showingChat ? 'flex' : 'hidden'}`}>
            {active ? (
              <ChatPanel
                conv={active}
                onVoiceCall={handleVoiceCall}
                onVideoCall={handleVideoCall}
                onMarkRead={markRead}
                onBack={() => navigate('/messages')}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-5">
                  <MessageCircle size={40} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Your Messages</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Select a conversation from the left to start reading and replying to messages.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
