import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  Send, Search, Loader2, AlertCircle, MessageCircle,
  Phone, Video, MoreHorizontal, ChevronLeft, X, Check, CheckCheck, Edit3, User, Trash2,
  Paperclip, PhoneMissed, FileText, Download,
} from 'lucide-react';
import { fetchConversations, fetchMessages, sendMessage, deleteMessage, logCall } from '../../api/messageApi';
import { useSocket } from '../../context/SocketContext';
import { useCurrentUser } from '../../utils/currentUser';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { Avatar } from '../community/Avatar';
import type { ConversationSummary, DirectMessage, MessageAttachment } from '../../types/community';
import { useWebRTC, type CallEndedInfo } from './useWebRTC';
import { CallOverlay } from './CallOverlay';

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;
const ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/zip,text/plain';

function isImageAttachment(a: MessageAttachment) {
  return !!a.mimeType?.startsWith('image/');
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function callSummary(
  callType: 'audio' | 'video',
  status: 'completed' | 'missed' | 'declined',
  duration: number,
  mine: boolean
): string {
  const kind = callType === 'video' ? 'Video call' : 'Voice call';
  if (status === 'completed') return `${kind} · ${formatCallDuration(duration)}`;
  if (status === 'declined') return mine ? `${kind} declined` : `You declined this ${kind.toLowerCase()}`;
  return mine ? `${kind} · No answer` : `Missed ${kind.toLowerCase()}`;
}

function timeLabel(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function activeLabel(online: boolean, lastLogin?: string | null): string {
  if (online) return 'Active now';
  if (!lastLogin) return '';
  const diff = Date.now() - new Date(lastLogin).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'Active now';
  if (m < 60) return `Active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Active ${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 8) return `Active ${d}d ago`;
  return '';
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
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

type PendingMessage = DirectMessage & { _pending?: boolean; _failed?: boolean; _files?: File[] };

const TYPING_DEBOUNCE_MS = 2000;
const TYPING_AUTO_CLEAR_MS = 5000;

// ─── Sidebar conversation item ────────────────────────────────────────────────

function lastMessagePreview(conv: ConversationSummary, userId: string | null): string {
  const lm = conv.lastMessage;
  if (!lm) return 'Start a conversation';
  if (lm.type === 'call' && lm.call) {
    return callSummary(lm.call.callType, lm.call.status, lm.call.duration, String(lm.sender) === userId);
  }
  if (lm.hasAttachments) return lm.text ? lm.text : '📎 Attachment';
  return lm.text || 'Start a conversation';
}

function ConvItem({
  conv, active, online, onClick, userId,
}: {
  conv: ConversationSummary;
  active: boolean;
  online: boolean;
  onClick: () => void;
  userId: string | null;
}) {
  const actLabel = activeLabel(online, (conv.otherUser as any).lastLogin);
  const preview = lastMessagePreview(conv, userId);

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 text-left
        transition-all duration-150 relative group
        border-l-[3px]
        ${active
          ? 'bg-blue-50/80 border-l-blue-600'
          : 'border-l-transparent hover:bg-slate-50/80'
        }
      `}
    >
      <div className="relative flex-shrink-0">
        <Avatar user={conv.otherUser} size={11} />
        {online && (
          <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm truncate leading-snug ${
            conv.unreadCount > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
          }`}>
            {conv.otherUser.name}
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums">
            {conv.lastMessageAt ? relativeLabel(conv.lastMessageAt) : ''}
          </span>
        </div>

        {actLabel ? (
          <>
            <p className={`text-[11px] truncate font-medium leading-tight ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
              {actLabel}
            </p>
            <p className={`text-[11px] truncate mt-0.5 leading-tight ${
              conv.unreadCount > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'
            }`}>
              {preview}
            </p>
          </>
        ) : (
          <p className={`text-[11px] truncate leading-tight ${
            conv.unreadCount > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'
          }`}>
            {preview}
          </p>
        )}
      </div>

      {conv.unreadCount > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
        </span>
      )}
    </button>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function Bubble({
  msg, mine, showAvatar, conv, read, onRetry, onDelete,
}: {
  msg: PendingMessage;
  mine: boolean;
  showAvatar: boolean;
  conv: ConversationSummary;
  read: boolean;
  onRetry: (msg: PendingMessage) => void;
  onDelete: (msg: PendingMessage) => void;
}) {
  if (msg.type === 'call' && msg.call) {
    const missed = msg.call.status !== 'completed';
    const CallIcon = msg.call.callType === 'video' ? Video : missed ? PhoneMissed : Phone;
    return (
      <div className="flex justify-center py-2">
        <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium shadow-sm ${
          missed
            ? 'border-red-100 bg-red-50 text-red-500'
            : 'border-slate-200 bg-white text-slate-500'
        }`}>
          <CallIcon size={12} />
          <span>{callSummary(msg.call.callType, msg.call.status, msg.call.duration, mine)}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400">{timeLabel(msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  const images = (msg.attachments || []).filter(isImageAttachment);
  const files = (msg.attachments || []).filter((a) => !isImageAttachment(a));

  return (
    <div className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar slot */}
      <div className="w-7 flex-shrink-0 self-end">
        {!mine && showAvatar && (
          <Avatar user={conv.otherUser} size={7} />
        )}
      </div>

      {/* Delete btn (mine only, visible on hover) */}
      {mine && (
        <button
          onClick={() => onDelete(msg)}
          aria-label="Delete message"
          className="mb-1 opacity-0 group-hover:opacity-100 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-300 transition-all hover:bg-slate-100 hover:text-red-500"
        >
          <Trash2 size={13} />
        </button>
      )}

      <div className={`flex min-w-0 flex-col gap-1 max-w-[78%] sm:max-w-[65%] lg:max-w-[55%] ${mine ? 'items-end' : 'items-start'}`}>
        {/* Image attachments */}
        {images.length > 0 && (
          <div className={`grid gap-1 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {images.map((img, idx) => (
              <a
                key={idx}
                href={resolveMediaUrl(img.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-2xl border border-white/20 shadow-sm hover:opacity-90 transition-opacity"
              >
                <img
                  src={resolveMediaUrl(img.url)}
                  alt={img.fileName || 'Attachment'}
                  className="h-44 w-full max-w-[240px] object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {/* File attachments */}
        {files.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {files.map((f, idx) => (
              <a
                key={idx}
                href={resolveMediaUrl(f.url)}
                target="_blank"
                rel="noopener noreferrer"
                download={f.fileName}
                className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs shadow-sm hover:opacity-80 transition-opacity ${
                  mine
                    ? 'border-blue-300/30 bg-blue-500/15 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText size={15} className="text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[11px]">{f.fileName || 'File'}</p>
                  <p className="text-slate-400 text-[10px]">{formatBytes(f.size)}</p>
                </div>
                <Download size={13} className="flex-shrink-0 text-slate-400" />
              </a>
            ))}
          </div>
        )}

        {/* Text bubble */}
        {msg.text && (
          <button
            type="button"
            onClick={() => msg._failed && onRetry(msg)}
            disabled={!msg._failed}
            className={`
              min-w-0 max-w-full px-4 py-2.5 text-sm leading-relaxed text-left
              shadow-sm transition-opacity
              ${mine
                ? msg._failed
                  ? 'bg-red-500 text-white rounded-3xl rounded-br-lg cursor-pointer'
                  : 'bg-blue-600 text-white rounded-3xl rounded-br-lg'
                : 'bg-white text-slate-800 rounded-3xl rounded-bl-lg border border-slate-100/80'
              }
              ${msg._pending ? 'opacity-50' : 'opacity-100'}
              ${!msg._failed ? 'cursor-default' : ''}
            `}
          >
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</p>
          </button>
        )}

        {/* Timestamp + read receipt */}
        <div className={`flex items-center gap-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {msg._pending ? 'Sending…' : msg._failed ? 'Failed · tap to retry' : timeLabel(msg.createdAt)}
          </span>
          {mine && !msg._pending && !msg._failed && (
            read
              ? <CheckCheck size={11} className="text-blue-500" />
              : <Check size={11} className="text-slate-300" />
          )}
        </div>

        {msg._failed && (
          <button
            onClick={() => onRetry(msg)}
            className="text-[10px] text-red-500 flex items-center gap-1 px-1 hover:underline"
          >
            <AlertCircle size={10} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  conv, online, onVoiceCall, onVideoCall, onMarkRead, onBack,
}: {
  conv: ConversationSummary;
  online: boolean;
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setPage(1);
    setText('');
    setSending(false);
    setOtherTyping(false);
    setReadAt(null);
    setPendingFiles([]);
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
        otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_AUTO_CLEAR_MS);
      }
    };

    const handleRead = (data: { conversationId: string; readerId: string; readAt: string }) => {
      if (data.conversationId !== conv._id || data.readerId === userId) return;
      setReadAt(data.readAt);
    };

    const handleDeleted = (data: { conversation: string; messageId: string }) => {
      if (data.conversation !== conv._id) return;
      setMessages((p) => p.filter((m) => m._id !== data.messageId));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:typing', handleTyping);
    socket.on('conversation:read', handleRead);
    socket.on('message:deleted', handleDeleted);
    return () => {
      socket.emit('conversation:leave', conv._id);
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:typing', handleTyping);
      socket.off('conversation:read', handleRead);
      socket.off('message:deleted', handleDeleted);
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

  const deliver = async (id: string, body: string, files?: File[]) => {
    setSending(true);
    try {
      const saved = await sendMessage(conv._id, body, files);
      setMessages((p) => {
        const withoutTemp = p.filter((m) => m._id !== id);
        if (withoutTemp.some((m) => m._id === saved._id)) return withoutTemp;
        return [...withoutTemp, saved];
      });
    } catch (err) {
      setMessages((p) => p.map((m) => m._id === id ? { ...m, _pending: false, _failed: true } : m));
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        toast.error(err.response.data?.message || "You can't send messages in this conversation.");
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message);
      }
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    const files = pendingFiles;
    if ((!body && files.length === 0) || sending || !userId) return;
    const tempId = `tmp-${Date.now()}`;
    setText('');
    setPendingFiles([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    stopTyping();
    setMessages((p) => [...p, {
      _id: tempId,
      conversation: conv._id,
      sender: userId,
      text: body,
      attachments: files.map((f) => ({ url: URL.createObjectURL(f), mimeType: f.type, fileName: f.name, size: f.size })),
      createdAt: new Date().toISOString(),
      _pending: true,
      _files: files,
    }]);
    setTimeout(() => scrollToBottom(), 50);
    await deliver(tempId, body, files);
  };

  const retry = (msg: PendingMessage) => {
    if (sending) return;
    setMessages((p) => p.map((m) => m._id === msg._id ? { ...m, _pending: true, _failed: false } : m));
    deliver(msg._id, msg.text, msg._files);
  };

  const handleFilesPicked = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const oversized = incoming.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (oversized.length > 0) {
      toast.error(`${oversized.length > 1 ? 'Some files are' : `"${oversized[0].name}" is`} larger than 15MB.`);
    }
    setPendingFiles((p) => {
      const next = [...p, ...incoming.filter((f) => f.size <= MAX_ATTACHMENT_BYTES)];
      if (next.length > MAX_ATTACHMENTS) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files at once.`);
        return next.slice(0, MAX_ATTACHMENTS);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((p) => p.filter((_, i) => i !== idx));
  };

  const handleDeleteMessage = async (msg: PendingMessage) => {
    if (msg._pending || msg._failed || msg._id.startsWith('tmp-')) {
      setMessages((p) => p.filter((m) => m._id !== msg._id));
      return;
    }
    if (!window.confirm('Delete this message?')) return;
    setMessages((p) => p.filter((m) => m._id !== msg._id));
    try {
      await deleteMessage(conv._id, msg._id);
    } catch (err) {
      setMessages((p) => (p.some((m) => m._id === msg._id) ? p : [...p, msg]));
      toast.error(
        (axios.isAxiosError(err) && err.response?.data?.message) || 'Could not delete this message.'
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  type Item = { type: 'divider'; label: string } | { type: 'msg'; msg: PendingMessage; showAvatar: boolean };
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let lastDay = '';
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const day = dayLabel(m.createdAt);
      if (day !== lastDay) { out.push({ type: 'divider', label: day }); lastDay = day; }
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
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 py-3 sm:px-5 z-10 flex-shrink-0 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="md:hidden flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 -ml-1 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="relative flex-shrink-0">
            <Avatar user={conv.otherUser} size={10} linkToProfile />
            {online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 leading-tight truncate">
              {conv.otherUser.name}
            </p>
            <p className="text-xs truncate leading-tight mt-0.5">
              {otherTyping ? (
                <span className="text-blue-500 font-medium">typing…</span>
              ) : online ? (
                <span className="text-emerald-600 font-medium">Active now</span>
              ) : (() => {
                const lbl = activeLabel(false, (conv.otherUser as any).lastLogin);
                return lbl
                  ? <span className="text-slate-400">{lbl}</span>
                  : <span className="text-slate-400">{conv.otherUser.headline || ''}</span>;
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <IconBtn icon={<Phone size={16} />} label="Voice call" onClick={onVoiceCall} hoverColor="hover:text-emerald-600 hover:bg-emerald-50" />
          <IconBtn icon={<Video size={16} />} label="Video call" onClick={onVideoCall} hoverColor="hover:text-blue-600 hover:bg-blue-50" />
          <div className="relative">
            <IconBtn icon={<MoreHorizontal size={16} />} label="More options" onClick={() => setMoreOpen((v) => !v)} />
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-1.5 z-20 w-44 rounded-xl border border-slate-100 bg-white py-1 shadow-xl shadow-slate-200/60 ring-1 ring-black/5">
                  <a
                    href={profileHref}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg mx-1 transition-colors"
                  >
                    <User size={14} className="text-slate-400" /> View profile
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 space-y-2"
        style={{ background: 'linear-gradient(to bottom, #f8f9fa, #f1f3f5)' }}
      >
        {loading ? (
          // Alternating left/right bubble shapes, matching the real thread
          // below, instead of a bare spinner — same animate-pulse
          // convention as the conversation list skeleton in the sidebar.
          <div className="space-y-3 pt-2" aria-busy="true" aria-label="Loading messages">
            {[68, 45, 80, 55, 40, 72].map((widthPct, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`h-9 animate-pulse rounded-2xl bg-slate-200 ${i % 2 === 0 ? 'rounded-bl-sm' : 'rounded-br-sm'}`}
                  style={{ width: `${widthPct}%`, maxWidth: '320px' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-4 py-1.5 hover:bg-slate-50 shadow-sm disabled:opacity-60 transition-all"
                >
                  {loadingMore ? <Loader2 size={10} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 shadow-sm">
                  <MessageCircle size={26} className="text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Start the conversation</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Say hello to {conv.otherUser.name} 👋
                </p>
              </div>
            ) : (
              items.map((item, i) =>
                item.type === 'divider' ? (
                  <div key={`d-${i}`} className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-slate-200/70" />
                    <span className="text-[10px] text-slate-400 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 border border-slate-200/80 shadow-sm font-medium">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-slate-200/70" />
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
                    onDelete={handleDeleteMessage}
                  />
                )
              )
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input area ── */}
      <div
        className="border-t border-slate-100 bg-white px-3 py-3 sm:px-4 flex-shrink-0"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {/* Pending file previews */}
        {pendingFiles.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {pendingFiles.map((f, idx) => {
              const isImg = f.type.startsWith('image/');
              return (
                <div key={idx} className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-2 text-xs text-slate-600 shadow-sm">
                  {isImg ? (
                    <img src={URL.createObjectURL(f)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <FileText size={15} className="text-slate-400" />
                    </div>
                  )}
                  <span className="max-w-[100px] truncate font-medium">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    aria-label={`Remove ${f.name}`}
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-slate-400 text-white hover:bg-slate-500 transition-colors"
                  >
                    <X size={9} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            onChange={(e) => handleFilesPicked(e.target.files)}
            className="hidden"
          />

          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pendingFiles.length >= MAX_ATTACHMENTS}
            aria-label="Attach file"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 mb-0.5"
          >
            <Paperclip size={17} />
          </button>

          {/* Text input */}
          <div className="flex-1 flex items-end gap-2 bg-slate-50 rounded-3xl border border-slate-200 px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100/70 focus-within:bg-white transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onBlur={stopTyping}
              placeholder={`Message ${conv.otherUser.name}…`}
              rows={1}
              aria-label="Type a message"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed py-0.5"
              style={{ maxHeight: 120 }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={send}
            disabled={(!text.trim() && pendingFiles.length === 0) || sending}
            aria-label="Send message"
            className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm mb-0.5
              ${(text.trim() || pendingFiles.length > 0)
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }
            `}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>

        <p className="hidden sm:block text-[10px] text-slate-400 text-center mt-2 select-none">
          Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}

function IconBtn({
  icon, label, onClick, hoverColor = 'hover:text-slate-700 hover:bg-slate-100',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hoverColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-slate-400 ${hoverColor} transition-all`}
    >
      {icon}
    </button>
  );
}

// ─── Main MessagesPage ────────────────────────────────────────────────────────
//
// IMPORTANT — Layout fix:
//   Use  className="contents"  on whatever wrapper your router/layout
//   wraps this page in, OR make sure the parent is NOT setting
//   overflow:hidden / max-width / padding that clips this component.
//
//   This component uses  style={{ position:'fixed', inset:0 }}
//   which is equivalent to  className="fixed inset-0"  and will fill
//   the entire viewport regardless of the DOM hierarchy.
//
//   If your layout has a <main> like:
//     <main className="max-w-6xl mx-auto px-4 py-8"> ... </main>
//   the fixed child will still escape it and cover the full screen correctly.
//   The only thing that breaks fixed positioning is a parent with
//   transform / perspective / filter / will-change set — remove those.

export function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { userId } = useCurrentUser();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

  const handleCallEnded = useCallback((info: CallEndedInfo) => {
    const conv = conversations.find((c) => c.otherUser._id === info.peerId);
    if (!conv) return;
    logCall(conv._id, info).catch((err) => console.error('Failed to log call:', err));
  }, [conversations]);

  const {
    callState, callType, incomingCall, localStream, remoteStream,
    isMuted, isCamOff, callDuration, error: callError, dismissError,
    startCall, answerCall, rejectCall, endCall, toggleMute, toggleCamera,
    canSwitchCamera, switchCamera,
  } = useWebRTC(socket, userId || '', handleCallEnded);

  useEffect(() => {
    fetchConversations()
      .then(setConversations)
      .catch(() => toast.error('Could not load conversations.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleGlobalMessage = (msg: DirectMessage) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === msg.conversation);
        if (idx === -1) return prev;
        const isMine = msg.sender === userId;
        const isActive = msg.conversation === conversationId;
        const updated: ConversationSummary = {
          ...prev[idx],
          lastMessage: {
            text: msg.text || '',
            sender: msg.sender,
            createdAt: msg.createdAt,
            type: msg.type || 'text',
            call: msg.call || null,
            hasAttachments: !!(msg.attachments && msg.attachments.length),
          },
          lastMessageAt: msg.createdAt,
          unreadCount: isMine || isActive ? prev[idx].unreadCount : prev[idx].unreadCount + 1,
        };
        // Remove old entry, prepend updated (no duplicates)
        const withoutOld = prev.filter((_, i) => i !== idx);
        return [updated, ...withoutOld];
      });
    };
    socket.on('message:new', handleGlobalMessage);
    return () => { socket.off('message:new', handleGlobalMessage); };
  }, [socket, userId, conversationId]);

  const partnerIdsKey = useMemo(
    () => [...new Set(conversations.map((c) => c.otherUser._id))].sort().join(','),
    [conversations]
  );

  useEffect(() => {
    if (!socket || !partnerIdsKey) return;
    const userIds = partnerIdsKey.split(',');
    const queryPresence = () => {
      socket.emit('presence:query', userIds, (result: Record<string, boolean>) => {
        setOnlineMap((prev) => ({ ...prev, ...result }));
      });
    };
    queryPresence();
    socket.on('connect', queryPresence);
    return () => { socket.off('connect', queryPresence); };
  }, [socket, partnerIdsKey]);

  useEffect(() => {
    if (!socket) return;
    const handlePresenceUpdate = ({ userId: otherId, online }: { userId: string; online: boolean }) => {
      setOnlineMap((prev) => ({ ...prev, [otherId]: online }));
    };
    socket.on('presence:update', handlePresenceUpdate);
    return () => { socket.off('presence:update', handlePresenceUpdate); };
  }, [socket]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.otherUser.name.toLowerCase().includes(q));
  }, [conversations, search]);

  const active = conversations.find((c) => c._id === conversationId);
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
    /*
     * ── KEY FIX ──────────────────────────────────────────────────────────────
     * Use style={{ position:'fixed', inset:0 }} instead of Tailwind's
     * className="fixed inset-0" so the specificity cannot be overridden by
     * a parent layout's stylesheet. If your app shell wraps pages in a
     * <div className="overflow-hidden"> or adds a CSS transform, move this
     * component outside that wrapper using a React Portal:
     *
     *   import { createPortal } from 'react-dom';
     *   return createPortal(<MessagesPage />, document.body);
     *
     * OR add  data-no-layout="true"  to this route so your layout skips
     * wrapping it.
     * ─────────────────────────────────────────────────────────────────────────
     */
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
      className="bg-slate-100 flex flex-col overflow-hidden"
    >
      {/* Call overlay */}
      {(callState === 'calling' || callState === 'incoming' || callState === 'connected' || callState === 'reconnecting' || callState === 'failed') && (
        <CallOverlay
          callState={callState} callType={callType}
          remoteName={callRemoteName} remoteAvatar={callRemoteAvatar}
          localStream={localStream} remoteStream={remoteStream}
          isMuted={isMuted} isCamOff={isCamOff} callDuration={callDuration}
          error={callError}
          canSwitchCamera={canSwitchCamera}
          onAnswer={answerCall} onReject={rejectCall} onEnd={endCall}
          onToggleMute={toggleMute} onToggleCamera={toggleCamera} onSwitchCamera={switchCamera}
          onDismissError={dismissError}
        />
      )}

      {/* ── Two-pane shell ── */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <aside className={`
          flex-shrink-0 flex-col border-r border-slate-200/80 bg-white
          w-full md:w-[300px] lg:w-[340px] md:flex
          ${showingChat ? 'hidden' : 'flex'}
        `}>
          {/* Sidebar header */}
          <div className="px-4 pt-5 pb-3 border-b border-slate-100 flex-shrink-0 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Messages</h2>
                {totalUnread > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </div>
              <button
                aria-label="New message"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Edit3 size={15} />
              </button>
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-2.5 focus-within:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border focus-within:border-blue-200 transition-all">
              <Search size={13} className="text-slate-400 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search" className="flex-shrink-0">
                  <X size={12} className="text-slate-400 hover:text-slate-600 transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-1">
                    <div className="w-11 h-11 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded-full animate-pulse w-3/5" />
                      <div className="h-2.5 bg-slate-100 rounded-full animate-pulse w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 shadow-sm">
                  <MessageCircle size={22} className="text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {search ? 'No results found' : 'No conversations yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {search
                    ? `Nothing matched "${search}"`
                    : 'Start a chat from someone\'s profile page.'
                  }
                </p>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((c) => (
                  <ConvItem
                    key={c._id}
                    conv={c}
                    active={c._id === conversationId}
                    online={!!onlineMap[c.otherUser._id]}
                    onClick={() => navigate(`/messages/${c._id}`)}
                    userId={userId}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className={`min-w-0 flex-1 flex-col min-h-0 md:flex ${showingChat ? 'flex' : 'hidden'}`}>
          {active ? (
            <ChatPanel
              conv={active}
              online={!!onlineMap[active.otherUser._id]}
              onVoiceCall={handleVoiceCall}
              onVideoCall={handleVideoCall}
              onMarkRead={markRead}
              onBack={() => navigate('/messages')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-white">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-5 shadow-sm">
                <MessageCircle size={34} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Your Messages</h3>
              <p className="text-sm text-slate-400 max-w-[220px] leading-relaxed">
                Pick a conversation from the left to read and reply.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}