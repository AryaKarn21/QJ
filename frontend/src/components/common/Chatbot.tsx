import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import { askChatbot, getSuggestedQuestions, type ChatTurn, type ChatbotReply } from '../../api/chatbotApi';

// Event name Header.tsx's assistant button dispatches to open this panel —
// see the "OPEN_CHATBOT_EVENT" trigger wiring in Header.tsx.
export const OPEN_CHATBOT_EVENT = 'quickjobs:open-chatbot';

interface DisplayMessage extends ChatTurn {
  source?: ChatbotReply['source'];
}

const WELCOME_MESSAGE: DisplayMessage = {
  role: 'assistant',
  text:
    "Hi! I'm the QuickJobs Assistant — an automated helper, not a human agent. " +
    'Ask me about finding jobs, your profile, the Resume Builder, ATS scoring, following people and companies, blogs, notifications, or subscriptions.',
};

// Help widget, mounted once at the app root (see App.tsx) so it persists
// across route changes and is available to logged-out visitors and every
// dashboard alike. Talks to the public /api/chatbot/* endpoints
// (backend/routes/chatbotRoutes.js) — no auth header needed.
//
// Opened via the assistant button in Header.tsx (top of every page) rather
// than a floating bottom-right FAB — the panel below anchors under the
// header for the same reason, instead of floating up from the bottom of
// the page/footer.
export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = 'quickjobs-chatbot-panel';

  useEffect(() => {
    getSuggestedQuestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

  // Header.tsx's assistant button lives in a different component tree, so
  // it signals this panel open via a plain window event rather than
  // lifting chat state up into Header (which every other page/dashboard
  // would then need to thread through too).
  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(OPEN_CHATBOT_EVENT, openPanel);
    return () => window.removeEventListener(OPEN_CHATBOT_EVENT, openPanel);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // Closes on Escape and on an outside click — same pattern Header.tsx's
  // own dropdowns use, now that this panel opens from a header button
  // rather than toggling from a button glued to the panel itself.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history: ChatTurn[] = messages
      .filter((m) => m !== WELCOME_MESSAGE)
      .map(({ role, text }) => ({ role, text }));

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setSending(true);

    try {
      const res = await askChatbot(trimmed, history);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply, source: res.source }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "Sorry, I'm having trouble responding right now. Please try again in a moment, or check /faq.",
          source: 'fallback',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label="QuickJobs Assistant chat"
      onKeyDown={handlePanelKeyDown}
      // Anchored under the header (fixed top offset matching Header.tsx's
      // h-14/h-16/h-20 across breakpoints, plus a little clearance) rather
      // than floating up from the bottom of the page — this panel opens
      // from the assistant button in the header now, not a page-bottom FAB.
      // `100dvh` (not `100vh`) for the height cap: on mobile Safari/Chrome
      // `100vh` is the *largest* possible viewport (address bar hidden), so
      // a plain vh cap could size the panel taller than what's actually
      // visible. `dvh` tracks the real visible viewport as browser chrome
      // shows/hides. Safe-area insets keep it clear of notches/home-indicator
      // cutouts on the sides in landscape.
      className="fixed z-40 sm:left-auto flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96 top-[calc(4.5rem+env(safe-area-inset-top))] sm:top-[calc(5rem+env(safe-area-inset-top))] lg:top-[calc(6rem+env(safe-area-inset-top))] h-[min(32rem,calc(100dvh-6rem))] left-[calc(1rem+env(safe-area-inset-left))] right-[calc(1rem+env(safe-area-inset-right))] sm:right-[calc(1.25rem+env(safe-area-inset-right))]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-primary px-4 py-3.5 text-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Bot size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">QuickJobs Assistant</p>
          <p className="truncate text-xs text-white/80">Automated &middot; may make mistakes</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="ml-auto rounded-lg p-1.5 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        aria-live="polite"
        // overscroll-contain: on mobile, scrolling past the top/bottom of
        // this inner list used to hand the gesture off to the page
        // behind the panel (scroll chaining), which felt like the whole
        // page was jumping. Containing it keeps the scroll where the
        // user's thumb is.
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4"
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'rounded-br-sm bg-primary text-white'
                  : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {m.text}
              {m.role === 'assistant' && m.source && m.source !== 'ai' && (
                <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {m.source === 'faq' ? 'From our FAQ' : 'Quick answer'}
                </p>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-400">
              <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> Thinking…
            </div>
          </div>
        )}

        {messages.length === 1 && suggestions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-slate-400">Try asking:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <label htmlFor="quickjobs-chatbot-input" className="sr-only">
          Ask the QuickJobs Assistant a question
        </label>
        <input
          id="quickjobs-chatbot-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          maxLength={1000}
          disabled={sending}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
