import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Clock, CheckCircle2, XCircle, AlertTriangle, FileText, Loader2, RefreshCw } from 'lucide-react';
import {
  getAssessmentForCandidate,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  type CandidateAssessmentResponse,
  type AssessmentAnswerInput,
} from '../jobseeker/jobseekerApi/api';
import { SkeletonText, SkeletonParagraph, SkeletonBlock } from '../ui/Skeleton';

type AnswerState = Record<string, { selectedOptionIndexes?: number[]; textAnswer?: string; fileUrl?: string }>;

/**
 * Candidate-facing assessment page, reached via the secure link emailed by
 * assignAssessment — /assessment/:applicationId/:token. Requires the
 * candidate to be logged in as the applicant AND hold the matching token
 * (both re-verified on every API call server-side, see
 * assessmentController.js's verifyCandidateAccess) — no assessment content
 * is fetched until both checks pass.
 */
const TakeAssessment: React.FC = () => {
  const { applicationId, token } = useParams<{ applicationId: string; token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CandidateAssessmentResponse | null>(null);

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; passed?: boolean; needsManualGrading: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!applicationId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAssessmentForCandidate(applicationId, token);
      setData(res);
    } catch (err) {
      console.error('Error loading assessment:', err);
      const message = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (message?.status === 403) setError("This assessment link isn't valid for your account.");
      else if (message?.status === 404) setError('This assessment link has expired or is invalid.');
      else setError('Could not load this assessment right now.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    if (!applicationId || !token) return;
    setStarting(true);
    try {
      const res = await startAssessmentAttempt(applicationId, token);
      setAttemptId(res.attemptId);
      setRemainingSeconds(res.durationMinutes * 60);
      setAnswers({});
    } catch (err) {
      console.error('Error starting assessment:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Could not start the assessment. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!applicationId || !token || !attemptId || !data) return;
    setSubmitting(true);
    try {
      const answerList: AssessmentAnswerInput[] = data.assessment.questions.map((q) => ({
        question: q._id,
        ...answers[q._id],
      }));
      const res = await submitAssessmentAttempt(data.assessment._id, {
        applicationId,
        token,
        attemptId,
        answers: answerList,
      });
      setResult(res);
      setAttemptId(null);
      setRemainingSeconds(null);
      toast.success('Assessment submitted.');
      load();
    } catch (err) {
      console.error('Error submitting assessment:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'Could not submit the assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, token, attemptId, data, answers, load]);

  // Countdown — auto-submits the moment time runs out so a candidate who
  // leaves the tab open past the deadline doesn't lose their answers.
  useEffect(() => {
    if (remainingSeconds === null) return;
    if (remainingSeconds <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setRemainingSeconds((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(timer);
  }, [remainingSeconds, handleSubmit]);

  const timeDisplay = useMemo(() => {
    if (remainingSeconds === null) return '';
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const setAnswer = (questionId: string, patch: AnswerState[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" aria-busy="true" aria-label="Loading assessment">
        <SkeletonText width="w-1/2" height="h-8" className="mb-4" />
        <SkeletonBlock className="mb-4 h-24 w-full" />
        <SkeletonParagraph lines={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Can't open this assessment</h1>
        <p className="mb-4 text-sm text-gray-500">{error || 'Something went wrong.'}</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { assessment, assignment } = data;

  // In-progress attempt — the question form.
  if (attemptId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
        <div className="sticky top-0 z-10 mb-6 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <span className="text-sm font-medium text-orange-800">{assessment.title}</span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-orange-700">
            <Clock size={15} /> {timeDisplay}
          </span>
        </div>

        <div className="space-y-6">
          {assessment.questions.map((q, idx) => (
            <div key={q._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-gray-900">
                {idx + 1}. {q.questionText} <span className="ml-1 text-xs font-normal text-gray-400">({q.points} pt{q.points === 1 ? '' : 's'})</span>
              </p>

              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name={q._id}
                        checked={answers[q._id]?.selectedOptionIndexes?.[0] === i}
                        onChange={() => setAnswer(q._id, { selectedOptionIndexes: [i] })}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'multiple_select' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt, i) => {
                    const selected = answers[q._id]?.selectedOptionIndexes || [];
                    return (
                      <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={selected.includes(i)}
                          onChange={(e) =>
                            setAnswer(q._id, {
                              selectedOptionIndexes: e.target.checked
                                ? [...selected, i]
                                : selected.filter((x) => x !== i),
                            })
                          }
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              )}

              {(q.type === 'short_answer' || q.type === 'coding') && (
                <textarea
                  value={answers[q._id]?.textAnswer || ''}
                  onChange={(e) => setAnswer(q._id, { textAnswer: e.target.value })}
                  rows={q.type === 'coding' ? 8 : 3}
                  placeholder={q.type === 'coding' ? `Write your ${q.codingLanguage || 'code'} here…` : 'Your answer…'}
                  className={`w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none ${q.type === 'coding' ? 'font-mono' : ''}`}
                />
              )}

              {q.type === 'long_answer' && (
                <textarea
                  value={answers[q._id]?.textAnswer || ''}
                  onChange={(e) => setAnswer(q._id, { textAnswer: e.target.value })}
                  rows={6}
                  placeholder="Your answer…"
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none"
                />
              )}

              {q.type === 'file_submission' && (
                <div>
                  <input
                    type="url"
                    value={answers[q._id]?.fileUrl || ''}
                    onChange={(e) => setAnswer(q._id, { fileUrl: e.target.value })}
                    placeholder="Paste a link to your file (Google Drive, GitHub, etc.)"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Upload your file to a sharing service and paste the link here.</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
          <div className="mx-auto flex max-w-3xl justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? 'Submitting…' : 'Submit Assessment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not in an attempt — landing view: instructions, status, or result.
  const isFinished = assignment.status === 'submitted' || assignment.status === 'evaluated';

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <FileText size={14} /> Technical Assessment
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{assessment.title}</h1>
      {assessment.description && <p className="mb-4 text-gray-600">{assessment.description}</p>}

      {assessment.instructions && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="mb-1 font-semibold">Instructions</p>
          <p className="whitespace-pre-wrap">{assessment.instructions}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="font-semibold text-gray-800">{assessment.duration} min</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-400">Questions</p>
          <p className="font-semibold text-gray-800">{assessment.questions.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-400">Attempts</p>
          <p className="font-semibold text-gray-800">{assignment.attemptsUsed}/{assessment.maxAttempts}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-400">Deadline</p>
          <p className="font-semibold text-gray-800">
            {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      {isFinished ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          {result?.needsManualGrading || assignment.status === 'submitted' ? (
            <>
              <Clock size={28} className="mx-auto mb-2 text-amber-500" />
              <p className="font-semibold text-gray-900">Submitted — awaiting review</p>
              <p className="mt-1 text-sm text-gray-500">The employer will review your answers and get back to you.</p>
            </>
          ) : assignment.latestPassed ? (
            <>
              <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500" />
              <p className="font-semibold text-gray-900">You passed! Score: {assignment.latestScore}/{result?.maxScore ?? '—'}</p>
            </>
          ) : (
            <>
              <XCircle size={28} className="mx-auto mb-2 text-red-500" />
              <p className="font-semibold text-gray-900">Score: {assignment.latestScore}/{result?.maxScore ?? '—'}</p>
            </>
          )}
          {assignment.attemptsRemaining > 0 && !assignment.expired && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {starting ? <Loader2 size={15} className="animate-spin" /> : null}
              Try Again ({assignment.attemptsRemaining} attempt{assignment.attemptsRemaining === 1 ? '' : 's'} left)
            </button>
          )}
        </div>
      ) : assignment.expired ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <AlertTriangle size={24} className="mx-auto mb-2" />
          The deadline for this assessment has passed.
        </div>
      ) : assignment.attemptsRemaining <= 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
          You've used all your attempts for this assessment.
        </div>
      ) : (
        <button
          onClick={handleStart}
          disabled={starting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {starting ? <Loader2 size={16} className="animate-spin" /> : null}
          {starting ? 'Starting…' : 'Start Assessment'}
        </button>
      )}

      <div className="mt-6 text-center">
        <Link to="/user/applications" className="text-sm text-primary hover:underline">
          ← Back to My Applications
        </Link>
      </div>
    </div>
  );
};

export default TakeAssessment;
