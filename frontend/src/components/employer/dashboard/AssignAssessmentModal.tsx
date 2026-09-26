import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Plus, Trash2, ClipboardCheck, Mail, Eye } from 'lucide-react';
import {
  getEmployerAssessments,
  createAssessment,
  assignAssessment,
  previewApplicationEmail,
  type AssessmentSummary,
  type AssessmentQuestionInput,
} from '../employerApi/api';
import EmailPreviewModal from '../../shared/EmailPreviewModal';

const QUESTION_TYPES: { value: AssessmentQuestionInput['type']; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice (single answer)' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'coding', label: 'Coding' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'file_submission', label: 'File Submission' },
];

const emptyQuestion = (): AssessmentQuestionInput => ({
  type: 'mcq',
  questionText: '',
  options: ['', ''],
  correctOptionIndexes: [],
  points: 1,
});

interface AssignAssessmentModalProps {
  jobId: string;
  applicationId: string;
  candidateEmail?: string;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignAssessmentModal: React.FC<AssignAssessmentModalProps> = ({
  jobId,
  applicationId,
  candidateEmail,
  onClose,
  onAssigned,
}) => {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [existing, setExisting] = useState<AssessmentSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState(30);
  const [deadline, setDeadline] = useState('');
  const [passingScore, setPassingScore] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [questions, setQuestions] = useState<AssessmentQuestionInput[]>([emptyQuestion()]);

  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEmployerAssessments(jobId)
      .then((list) => {
        if (cancelled) return;
        setExisting(list);
        if (list.length === 0) setMode('create');
      })
      .catch(() => {
        if (!cancelled) setMode('create');
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const updateQuestion = (idx: number, patch: Partial<AssessmentQuestionInput>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const options = [...(q.options || [])];
        options[optIdx] = value;
        return { ...q, options };
      })
    );
  };

  const toggleCorrect = (qIdx: number, optIdx: number, single: boolean) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const current = q.correctOptionIndexes || [];
        if (single) return { ...q, correctOptionIndexes: [optIdx] };
        const has = current.includes(optIdx);
        return { ...q, correctOptionIndexes: has ? current.filter((x) => x !== optIdx) : [...current, optIdx] };
      })
    );
  };

  const handleAssign = async () => {
    if (mode === 'select' && !selectedId) {
      toast.error('Choose an assessment to assign.');
      return;
    }
    if (mode === 'create') {
      if (!title.trim() || !deadline) {
        toast.error('Title and deadline are required.');
        return;
      }
      for (const q of questions) {
        if (!q.questionText.trim()) {
          toast.error('Every question needs text.');
          return;
        }
        if (['mcq', 'multiple_select'].includes(q.type) && (q.options || []).filter((o) => o.trim()).length < 2) {
          toast.error('Multiple-choice questions need at least 2 options.');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      let assessmentId = selectedId;
      if (mode === 'create') {
        const created = await createAssessment({
          jobId,
          title,
          description,
          instructions,
          questions,
          duration,
          deadline,
          passingScore,
          maxAttempts,
        });
        assessmentId = created._id;
      }

      const res = await assignAssessment(assessmentId, applicationId, {
        deadline: mode === 'select' ? deadline || undefined : undefined,
        customMessage: customMessage.trim() || undefined,
      });

      toast.success(res.emailSent ? 'Assessment assigned and email sent.' : 'Assessment assigned — email delivery failed, you can resend later.');
      onAssigned();
      onClose();
    } catch (err) {
      console.error('Error assigning assessment:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Could not assign the assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <ClipboardCheck size={18} className="text-orange-600" /> Assign Technical Assessment
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {existing.length > 0 && (
            <div className="mb-4 flex rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setMode('select')}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === 'select' ? 'bg-orange-600 text-white' : 'text-gray-600'}`}
              >
                Use existing assessment
              </button>
              <button
                onClick={() => setMode('create')}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === 'create' ? 'bg-orange-600 text-white' : 'text-gray-600'}`}
              >
                Create new
              </button>
            </div>
          )}

          {mode === 'select' ? (
            loadingExisting ? (
              <div className="py-8 text-center text-gray-400">Loading assessments…</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Assessment</label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {existing.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.title} — {a.duration} min
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Override deadline (optional)</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assessment title *"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none"
              />
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions for the candidate (optional)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Duration (min) *</label>
                  <input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Deadline *</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Passing Score</label>
                  <input
                    type="number"
                    min={0}
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Max Attempts</label>
                  <input
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Questions</p>
                {questions.map((q, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <select
                        value={q.type}
                        onChange={(e) =>
                          updateQuestion(idx, {
                            type: e.target.value as AssessmentQuestionInput['type'],
                            options: ['mcq', 'multiple_select'].includes(e.target.value) ? q.options?.length ? q.options : ['', ''] : q.options,
                          })
                        }
                        className="rounded-lg border border-gray-300 p-1.5 text-xs"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={q.points}
                        onChange={(e) => updateQuestion(idx, { points: parseInt(e.target.value, 10) || 0 })}
                        className="w-16 rounded-lg border border-gray-300 p-1.5 text-xs"
                        title="Points"
                      />
                      {questions.length > 1 && (
                        <button
                          onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          className="ml-auto text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <input
                      value={q.questionText}
                      onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                      placeholder="Question text *"
                      className="mb-2 w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                    />
                    {(q.type === 'mcq' || q.type === 'multiple_select') && (
                      <div className="space-y-1.5">
                        {(q.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type={q.type === 'mcq' ? 'radio' : 'checkbox'}
                              name={`correct-${idx}`}
                              checked={(q.correctOptionIndexes || []).includes(optIdx)}
                              onChange={() => toggleCorrect(idx, optIdx, q.type === 'mcq')}
                              title="Mark as correct"
                            />
                            <input
                              value={opt}
                              onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 rounded-lg border border-gray-300 p-1.5 text-sm focus:border-primary focus:outline-none"
                            />
                            {(q.options?.length || 0) > 2 && (
                              <button
                                onClick={() =>
                                  updateQuestion(idx, { options: (q.options || []).filter((_, i) => i !== optIdx) })
                                }
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => updateQuestion(idx, { options: [...(q.options || []), ''] })}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          + Add option
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus size={13} /> Add question
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-3">
            <label className="mb-1 block text-xs font-semibold text-gray-700">Custom message to candidate (optional)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
              placeholder="Add a personal note that will appear on the application timeline…"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-xs text-orange-900">
            <Mail size={14} className="mt-0.5 shrink-0 text-orange-600" />
            <span>
              A secure assessment link will be emailed to <strong>{candidateEmail || 'the candidate'}</strong>.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          {mode === 'select' && selectedId && (
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50"
            >
              <Eye size={14} /> Preview email
            </button>
          )}
          <button
            onClick={handleAssign}
            disabled={submitting}
            className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? 'Assigning…' : 'Assign Assessment'}
          </button>
        </div>
      </div>

      {showPreview && (
        <EmailPreviewModal
          onClose={() => setShowPreview(false)}
          sendLabel="Assign & Send"
          fetchPreview={() =>
            previewApplicationEmail(applicationId, {
              action: 'assign_assessment',
              assessmentId: selectedId,
              deadline: deadline || undefined,
              customMessage: customMessage.trim() || undefined,
            })
          }
          onConfirmSend={handleAssign}
        />
      )}
    </div>
  );
};

export default AssignAssessmentModal;
