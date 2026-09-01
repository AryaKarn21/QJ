import { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, ShieldCheck, Download } from 'lucide-react';
import { getAtsAnalysis, type AtsAnalysis, type AtsSeverity } from '../resumeAiApi';

const labelClass = 'mb-1 block text-xs font-medium text-slate-500';
const fieldClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100';

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
}
function scoreRing(score: number): string {
  if (score >= 80) return 'stroke-emerald-500';
  if (score >= 50) return 'stroke-amber-500';
  return 'stroke-rose-500';
}
function barColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

const SEVERITY_ICON: Record<AtsSeverity, React.ReactNode> = {
  critical: <AlertTriangle size={14} className="shrink-0 text-rose-500" />,
  warning: <AlertTriangle size={14} className="shrink-0 text-amber-500" />,
  tip: <Info size={14} className="shrink-0 text-slate-400" />,
};

// Simple circular score gauge — no charting library needed for one ring.
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={radius} strokeWidth="8" className="fill-none stroke-slate-100" />
        <circle
          cx="40" cy="40" r={radius} strokeWidth="8" strokeLinecap="round"
          className={`fill-none transition-all duration-500 ${scoreRing(score)}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${scoreColor(score)}`}>{Math.round(score)}</span>
        <span className="text-[10px] text-slate-400">/ 100</span>
      </div>
    </div>
  );
};

interface AtsAnalysisPanelProps {
  resumeId: string;
  onDownloadAtsSafePdf?: () => void;
  downloadingAtsSafePdf?: boolean;
}

export const AtsAnalysisPanel: React.FC<AtsAnalysisPanelProps> = ({
  resumeId,
  onDownloadAtsSafePdf,
  downloadingAtsSafePdf,
}) => {
  const [analysis, setAnalysis] = useState<AtsAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [showJdBox, setShowJdBox] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAtsAnalysis(resumeId, jobDescription.trim() || undefined);
      setAnalysis(result);
      setHasRun(true);
    } catch (err) {
      const message = axios.isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      setError(message || 'Could not run the ATS analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={15} className="shrink-0 text-violet-600" />
          <p className="text-sm font-semibold text-slate-700">ATS Compatibility Analysis</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100 disabled:opacity-60"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {hasRun ? 'Re-analyze' : 'Run analysis'}
        </button>
      </div>

      {/* Optional job-description paste for keyword relevance */}
      <div>
        <button
          onClick={() => setShowJdBox((s) => !s)}
          className="text-xs font-medium text-violet-600 hover:underline"
        >
          {showJdBox ? 'Hide job description box' : '+ Paste a job description for keyword-match scoring (optional)'}
        </button>
        {showJdBox && (
          <textarea
            className={`${fieldClass} mt-2`}
            rows={4}
            placeholder="Paste the job description here to check keyword overlap. Without this, relevance is estimated from your Target Role only."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        )}
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      {!hasRun && !loading && !error && (
        <p className="text-xs text-slate-400">
          Run the analysis to get an estimated ATS compatibility score, a section-by-section breakdown, and actionable suggestions.
        </p>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={analysis.overallScore} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${scoreColor(analysis.overallScore)}`}>
                {analysis.status === 'good' ? 'Looking good' : analysis.status === 'warning' ? 'Needs improvement' : 'Needs attention'}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{analysis.disclaimer}</p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="space-y-2">
            {analysis.categories.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{c.label}</span>
                  <span className={`font-semibold ${scoreColor(c.score)}`}>{Math.round(c.score)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${barColor(c.score)}`} style={{ width: `${Math.round(c.score)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Suggestions</p>
              <ul className="space-y-1.5">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    {SEVERITY_ICON[s.severity]}
                    <span>{s.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.suggestions.length === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={13} /> No issues found — this resume covers the essentials well.
            </p>
          )}

          {/* Keyword match, if a JD/target role was evaluated */}
          {analysis.jdKeywords && (
            <div className="rounded-md bg-white p-2.5 ring-1 ring-slate-200">
              <p className="mb-1 text-xs font-semibold text-slate-600">Keyword match</p>
              {analysis.jdKeywords.missing.length > 0 ? (
                <p className="text-xs text-slate-500">
                  Missing: <span className="text-rose-500">{analysis.jdKeywords.missing.join(', ')}</span>
                </p>
              ) : (
                <p className="text-xs text-emerald-600">All detected keywords are covered.</p>
              )}
            </div>
          )}

          {onDownloadAtsSafePdf && (
            <button
              onClick={onDownloadAtsSafePdf}
              disabled={downloadingAtsSafePdf}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60"
            >
              {downloadingAtsSafePdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloadingAtsSafePdf ? 'Generating…' : 'Download ATS-Safe PDF'}
            </button>
          )}
        </div>
      )}

      <p className={labelClass}>
        Estimated compatibility only — no analysis can guarantee any specific company's ATS will pass a resume.
      </p>
    </div>
  );
};
