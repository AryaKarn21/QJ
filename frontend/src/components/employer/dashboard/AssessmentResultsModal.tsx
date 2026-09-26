import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Award, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { getAssessmentResults, gradeAssessmentAttempt } from '../employerApi/api';

interface Question {
  _id: string;
  type: 'mcq' | 'multiple_select' | 'coding' | 'short_answer' | 'long_answer' | 'file_submission';
  questionText: string;
  options?: string[];
  correctOptionIndexes?: number[];
  points: number;
}

interface Answer {
  question: string;
  selectedOptionIndexes?: number[];
  textAnswer?: string;
  fileUrl?: string;
  pointsAwarded?: number;
}

interface Attempt {
  _id: string;
  candidate?: { name?: string; email?: string };
  attemptNumber: number;
  answers: Answer[];
  status: 'in_progress' | 'submitted' | 'evaluated';
  score: number;
  maxScore: number;
  passed?: boolean;
  startedAt?: string;
  submittedAt?: string;
  timeTakenSeconds?: number;
  autoEvaluated: boolean;
}

interface ResultsResponse {
  assessment: { title: string; passingScore: number; questions: Question[] };
  attempts: Attempt[];
}

interface AssessmentResultsModalProps {
  assessmentId: string;
  applicationId: string;
  onClose: () => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

export const AssessmentResultsModal: React.FC<AssessmentResultsModalProps> = ({
  assessmentId,
  applicationId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [grades, setGrades] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAssessmentResults(assessmentId, applicationId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load assessment results.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assessmentId, applicationId]);

  const questionById = new Map((data?.assessment.questions || []).map((q) => [q._id, q]));

  const setGrade = (attemptId: string, questionId: string, points: number) => {
    setGrades((prev) => ({
      ...prev,
      [attemptId]: { ...(prev[attemptId] || {}), [questionId]: points },
    }));
  };

  const handleSaveGrades = async (attempt: Attempt) => {
    const attemptGrades = grades[attempt._id];
    if (!attemptGrades || Object.keys(attemptGrades).length === 0) {
      toast.info('Enter at least one score before saving.');
      return;
    }
    setSaving(attempt._id);
    try {
      await gradeAssessmentAttempt(
        attempt._id,
        Object.entries(attemptGrades).map(([question, pointsAwarded]) => ({ question, pointsAwarded }))
      );
      toast.success('Grades saved.');
      const res = await getAssessmentResults(assessmentId, applicationId);
      setData(res);
    } catch (err) {
      console.error('Failed to save grades:', err);
      toast.error('Could not save grades.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-gray-900/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Award size={18} className="text-orange-600" /> Assessment Results
            {data?.assessment.title ? ` — ${data.assessment.title}` : ''}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading results…</div>
          ) : !data || data.attempts.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No attempts submitted yet.</div>
          ) : (
            <div className="space-y-5">
              {data.attempts.map((attempt) => (
                <div key={attempt._id} className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Attempt {attempt.attemptNumber}</p>
                      <p className="text-xs text-gray-500">
                        {attempt.candidate?.name} · {attempt.candidate?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={13} /> {formatDuration(attempt.timeTakenSeconds)}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                      Score: {attempt.score}/{attempt.maxScore}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
                        attempt.status !== 'evaluated'
                          ? 'bg-amber-100 text-amber-800'
                          : attempt.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {attempt.status !== 'evaluated' ? (
                        'Awaiting manual grading'
                      ) : attempt.passed ? (
                        <>
                          <CheckCircle2 size={12} /> Passed
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> Failed
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {attempt.answers.map((answer, idx) => {
                      const q = questionById.get(answer.question);
                      if (!q) return null;
                      const needsManualGrading = ['coding', 'short_answer', 'long_answer', 'file_submission'].includes(q.type);
                      return (
                        <div key={idx} className="rounded-lg bg-gray-50 p-3 text-xs">
                          <p className="mb-1 font-semibold text-gray-800">{q.questionText}</p>
                          {q.type === 'mcq' || q.type === 'multiple_select' ? (
                            <p className="text-gray-600">
                              Selected: {(answer.selectedOptionIndexes || []).map((i) => q.options?.[i]).join(', ') || '—'}
                            </p>
                          ) : q.type === 'file_submission' ? (
                            answer.fileUrl ? (
                              <a href={answer.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                View submission
                              </a>
                            ) : (
                              <span className="text-gray-400">No file submitted</span>
                            )
                          ) : (
                            <p className="whitespace-pre-wrap text-gray-600">{answer.textAnswer || '—'}</p>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-gray-500">Points ({q.points} max):</span>
                            {needsManualGrading && attempt.status !== 'evaluated' ? (
                              <input
                                type="number"
                                min={0}
                                max={q.points}
                                defaultValue={answer.pointsAwarded ?? ''}
                                onChange={(e) => setGrade(attempt._id, q._id, Math.min(q.points, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                                className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                              />
                            ) : (
                              <span className="font-semibold text-gray-800">{answer.pointsAwarded ?? 0}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {attempt.status !== 'evaluated' && (
                    <button
                      onClick={() => handleSaveGrades(attempt)}
                      disabled={saving === attempt._id}
                      className="mt-3 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      {saving === attempt._id ? 'Saving…' : 'Save Grades'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button
            onClick={onClose}
            className="ml-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultsModal;
