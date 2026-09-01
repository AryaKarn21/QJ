import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { askChatbot, getSuggestedQuestions, type ChatTurn, type ChatbotReply } from '../../api/chatbotApi';

interface DisplayMessage extends ChatTurn {
  source?: ChatbotReply['source'];
}

const WELCOME_MESSAGE: DisplayMessage = {
  role: 'assistant',
  text:
    "Hi! I'm the QuickJobs Assistant — an automated helper, not a human agent. " +
    'Ask me about finding jobs, your profile, the Resume Builder, ATS scoring, following people and companies, blogs, notifications, or subscriptions.',
};

// Floating help widget, mounted once at the app root (see App.tsx) so it
// persists across route changes and is available to logged-out visitors
// and every dashboard alike. Talks to the public /api/chatbot/* endpoints
// (backend/routes/chatbotRoutes.js) — no auth header needed.
export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelId = 'quickjobs-chatbot-panel';

  useEffect(() => {
    getSuggestedQuestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    toggleButtonRef.current?.focus();
  };

  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeAndReturnFocus();
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

  return (
    <>
      <button
        ref={toggleButtonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close QuickJobs help assistant' : 'Open QuickJobs help assistant'}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform duration-150 hover:bg-primary/90 active:scale-95 motion-reduce:transition-none focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="QuickJobs Assistant chat"
          onKeyDown={handlePanelKeyDown}
          className="fixed inset-x-4 bottom-24 top-20 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-5 sm:top-auto sm:h-[32rem] sm:w-96"
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
              onClick={closeAndReturnFocus}
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
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
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
      )}
    </>
  );
}
