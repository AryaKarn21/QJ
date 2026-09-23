import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Flag, X } from 'lucide-react';
import { reportContent } from '../../api/communityApi';

interface ReportPostModalProps {
  targetType: 'post' | 'comment';
  targetId: string;
  onClose: () => void;
}

const REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate content',
  'Misleading information',
  'Job scam',
  'Offensive content',
  'Other',
];

export const ReportPostModal: React.FC<ReportPostModalProps> = ({ targetType, targetId, onClose }) => {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOther = reason === 'Other';
  const canSubmit = reason && (!isOther || otherReason.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await reportContent({
        targetType,
        targetId,
        reason: isOther ? otherReason.trim() : reason,
        description: description.trim() || undefined,
      });
      toast.success('Report submitted. Our moderation team will review it.');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => !submitting && onClose()} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Report this ${targetType}`}
        className="relative w-full max-w-sm animate-scaleUp rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Flag size={16} />
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Report this {targetType}
            </h3>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                reason === r
                  ? 'border-primary bg-primary/5 text-dark dark:border-primary dark:text-slate-100'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-primary"
              />
              {r}
            </label>
          ))}
        </div>

        {isOther && (
          <input
            type="text"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            placeholder="Enter reason *"
            maxLength={200}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        )}

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details (optional)"
          rows={2}
          maxLength={2000}
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPostModal;
