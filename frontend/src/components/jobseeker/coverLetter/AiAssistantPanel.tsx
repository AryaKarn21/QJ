import React, { useState } from 'react';
import { Sparkles, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { runCoverLetterAi, type CoverLetterAiAction, type CoverLetterAiRequest } from './coverLetterAiApi';
import { getFriendlyErrorMessage } from '../../../utils/apiError';

interface AiButtonDef {
  action: CoverLetterAiAction;
  label: string;
  /** Actions other than "generate" need existing content to work from. */
  needsExisting: boolean;
}

const AI_BUTTONS: AiButtonDef[] = [
  { action: 'generate', label: 'Generate for this job', needsExisting: false },
  { action: 'improve', label: 'Improve existing letter', needsExisting: true },
  { action: 'rewrite', label: 'Rewrite', needsExisting: true },
  { action: 'concise', label: 'Make concise', needsExisting: true },
  { action: 'professional', label: 'Make professional', needsExisting: true },
  { action: 'persuasive', label: 'Make persuasive', needsExisting: true },
  { action: 'grammar', label: 'Fix grammar', needsExisting: true },
  { action: 'customize', label: 'Customize for this job', needsExisting: true },
];

export interface AiAssistantPanelProps {
  /** Everything the assistant needs, minus `action` (added per-click) and `existingCoverLetter` (read fresh each click via getCurrentContent). */
  context: Omit<CoverLetterAiRequest, 'action' | 'existingCoverLetter'>;
  /** Returns the *current* plain-text editor content at call time — a getter, not a snapshot, so it's never stale. */
  getCurrentContent: () => string;
  onInsert: (aiText: string) => void;
  onReplace: (aiText: string) => void;
}

/**
 * The "✨ Gemini AI Assistant" side panel. Every action shows a Preview
 * before touching the editor — Insert/Replace/Cancel are explicit user
 * choices, never automatic (spec requirement: never overwrite the user's
 * existing letter without confirmation).
 */
const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ context, getCurrentContent, onInsert, onReplace }) => {
  const [activeAction, setActiveAction] = useState<CoverLetterAiAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ action: CoverLetterAiAction; text: string } | null>(null);

  const runAction = async (btn: AiButtonDef) => {
    if (activeAction) return; // ignore duplicate/overlapping requests
    const existing = getCurrentContent();
    if (btn.needsExisting && !existing.trim()) {
      setError("There's no cover letter text yet to work from — try \"Generate for this job\" first.");
      return;
    }

    setError(null);
    setActiveAction(btn.action);
    try {
      const content = await runCoverLetterAi({
        ...context,
        action: btn.action,
        existingCoverLetter: btn.needsExisting ? existing : undefined,
      });
      setPreview({ action: btn.action, text: content });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'The AI assistant is unavailable right now. Please try again shortly.'));
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Sparkles size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-slate-800">Gemini AI Assistant</h3>
      </div>

      {!preview ? (
        <div className="space-y-2 p-4">
          <p className="text-xs text-slate-500">Help improve your cover letter</p>
          <div className="flex flex-col gap-2">
            {AI_BUTTONS.map((btn) => (
              <button
                key={btn.action}
                type="button"
                onClick={() => runAction(btn)}
                disabled={activeAction !== null}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {btn.label}
                {activeAction === btn.action && <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Preview</p>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
            {preview.text}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onInsert(preview.text);
                setPreview(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Check size={13} /> Insert
            </button>
            <button
              type="button"
              onClick={() => {
                onReplace(preview.text);
                setPreview(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={13} /> Replace letter
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistantPanel;
