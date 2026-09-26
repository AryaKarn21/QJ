import React, { useEffect, useState } from 'react';
import { X, Mail, Send, Code2 } from 'lucide-react';
import type { EmailPreviewResponse } from '../employer/employerApi/api';

interface EmailPreviewModalProps {
  onClose: () => void;
  fetchPreview: () => Promise<EmailPreviewResponse>;
  onConfirmSend: () => Promise<void>;
  sendLabel?: string;
}

// Reusable "preview the exact email before sending" modal (spec section
// 23) — every call site passes its own fetchPreview/onConfirmSend so the
// same component can back Assign Assessment, Schedule/Reschedule/Cancel
// Interview, and Accept/Reject actions without duplicating layout code.
// Same modal chrome convention as AssignAssessmentModal.tsx: fixed
// inset-0 overlay, rounded-2xl white card, header/body/footer.
export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  onClose,
  fetchPreview,
  onConfirmSend,
  sendLabel = 'Send Email',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<EmailPreviewResponse | null>(null);
  const [view, setView] = useState<'formatted' | 'html'>('formatted');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPreview()
      .then((res) => {
        if (!cancelled) setPreview(res);
      })
      .catch((err) => {
        if (!cancelled) {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(message || 'Could not load the email preview.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    setSending(true);
    try {
      await onConfirmSend();
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Mail size={18} className="text-orange-600" /> Email Preview
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {loading ? (
            <div className="space-y-3 py-4">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : preview ? (
            <div className="space-y-3">
              <div className="grid grid-cols-[70px_1fr] gap-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
                <span className="font-semibold text-gray-500">To</span>
                <span className="text-gray-900">{preview.to || 'No email on file'}</span>
                <span className="font-semibold text-gray-500">Subject</span>
                <span className="font-semibold text-gray-900">{preview.subject}</span>
              </div>

              <div className="flex rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setView('formatted')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${view === 'formatted' ? 'bg-orange-600 text-white' : 'text-gray-600'}`}
                >
                  Formatted
                </button>
                <button
                  onClick={() => setView('html')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold ${view === 'html' ? 'bg-orange-600 text-white' : 'text-gray-600'}`}
                >
                  <Code2 size={12} /> HTML
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                {view === 'formatted' ? (
                  <iframe
                    title="Email preview"
                    srcDoc={preview.html}
                    sandbox=""
                    className="h-80 w-full bg-white"
                  />
                ) : (
                  <pre className="h-80 overflow-auto whitespace-pre-wrap bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
                    {preview.text}
                  </pre>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || loading || !!error}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-700 disabled:opacity-50"
          >
            <Send size={14} /> {sending ? 'Sending…' : sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
