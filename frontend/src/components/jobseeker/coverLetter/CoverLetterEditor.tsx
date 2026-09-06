import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-toastify';
import { FileText, Save, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import AiAssistantPanel from './AiAssistantPanel';
import { COVER_LETTER_TEMPLATES, getTemplateById } from './CoverLetterTemplates';
import {
  getMyCoverLetters,
  createCoverLetter,
  updateCoverLetter,
  getCoverLetterById,
  type CoverLetterSummary,
} from './coverLetterApi';
import { getJobseekerProfile } from '../jobseekerApi/api';
import { getMyResumes, getResumeById } from '../../resumeBuilder/resumeApi';
import { getFriendlyErrorMessage } from '../../../utils/apiError';

interface CoverLetterEditorProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  /** Controlled HTML content — the parent (apply.tsx) owns this so it can derive plain text for submission. */
  value: string;
  onChange: (html: string) => void;
}

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

export function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Best-effort candidate context, built from data that's ALREADY on the
 * account — never invented. Skills/experience come straight from the
 * jobseeker profile; a richer summary/experience block is layered in from
 * the most recently updated Resume Builder resume, if one exists.
 */
function useCandidateAutofill() {
  const [context, setContext] = useState<{
    candidateName: string;
    candidateProfile: string;
    candidateSkills: string[];
    candidateExperience: string;
    resumeText: string;
  }>({ candidateName: '', candidateProfile: '', candidateSkills: [], candidateExperience: '', resumeText: '' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await getJobseekerProfile();
        if (cancelled) return;

        const skills: string[] = Array.isArray(profile.skills) ? profile.skills : [];
        const experienceLines = Array.isArray(profile.experiences)
          ? profile.experiences
              .map((e: any) => `${e.jobPosition || 'Role'} at ${e.institution || 'Company'}${e.current ? ' (Current)' : ''}`)
              .join('; ')
          : '';

        let resumeText = '';
        let experienceFromResume = '';
        try {
          const resumes = await getMyResumes();
          if (resumes.length > 0) {
            const latest = await getResumeById(resumes[0]._id);
            if (!cancelled) {
              resumeText = [
                latest.summary,
                (latest.experience || [])
                  .map((e) => `${e.role} at ${e.company}: ${e.description}`)
                  .join('\n'),
              ]
                .filter(Boolean)
                .join('\n\n');
              experienceFromResume = (latest.experience || [])
                .map((e) => `${e.role} at ${e.company}`)
                .join('; ');
            }
          }
        } catch {
          // No resume yet, or resume fetch failed — autofill just has less
          // to work with; not a blocking error for the cover letter editor.
        }

        if (cancelled) return;
        setContext({
          candidateName: profile.name || '',
          candidateProfile: profile.headline || profile.bio || '',
          candidateSkills: skills,
          candidateExperience: experienceFromResume || experienceLines,
          resumeText,
        });
      } catch {
        // Profile fetch failed — AI actions still work, just with less
        // context; the service layer is instructed to never invent facts
        // in place of missing ones.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return context;
}

const DRAFT_PREFIX = 'quickjobs:coverLetterDraft:';

const CoverLetterEditor: React.FC<CoverLetterEditorProps> = ({ jobId, jobTitle, companyName, jobDescription, value, onChange }) => {
  const autofill = useCandidateAutofill();
  const [templateId, setTemplateId] = useState('professional');
  const [savedLetters, setSavedLetters] = useState<CoverLetterSummary[]>([]);
  const [currentLetterId, setCurrentLetterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const plainText = useMemo(() => htmlToPlainText(value), [value]);
  const wordCount = useMemo(() => countWords(plainText), [plainText]);

  // Preserve the draft across navigation (e.g. the candidate clicks away to
  // check the job description again) — restored once on mount if the
  // parent hasn't already loaded something into `value`.
  useEffect(() => {
    if (value.trim()) return;
    const draft = localStorage.getItem(DRAFT_PREFIX + jobId);
    if (draft) onChange(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (value.trim()) {
      localStorage.setItem(DRAFT_PREFIX + jobId, value);
    }
  }, [value, jobId]);

  useEffect(() => {
    getMyCoverLetters()
      .then(setSavedLetters)
      .catch(() => setSavedLetters([]));
  }, []);

  const applyTemplate = (id: string) => {
    if (value.trim() && !window.confirm('Switching templates will replace your current draft. Continue?')) {
      return;
    }
    setTemplateId(id);
    const template = getTemplateById(id);
    onChange(template.build({ jobTitle, companyName, candidateName: autofill.candidateName }));
  };

  const handleReuse = async (id: string) => {
    if (!id) return;
    setLoadingSaved(true);
    try {
      const letter = await getCoverLetterById(id);
      if (value.trim() && !window.confirm('This will replace your current draft with the saved letter. Continue?')) {
        return;
      }
      onChange(letter.content);
      setTemplateId(letter.templateId);
      setCurrentLetterId(letter._id);
      toast.success(`Loaded "${letter.title}".`);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not load that cover letter.'));
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleSave = async () => {
    if (!plainText.trim() || saving) return;
    setSaving(true);
    try {
      const title = `${jobTitle || 'Cover Letter'}${companyName ? ` — ${companyName}` : ''}`;
      if (currentLetterId) {
        await updateCoverLetter(currentLetterId, { content: value, templateId, job: jobId });
      } else {
        const created = await createCoverLetter({ content: value, templateId, job: jobId, title });
        setCurrentLetterId(created._id);
      }
      const letters = await getMyCoverLetters();
      setSavedLetters(letters);
      toast.success('✓ Cover letter saved — you can reuse it for future applications.');
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Could not save this cover letter.'));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (value.trim() && !window.confirm('Clear the current draft? This cannot be undone.')) return;
    onChange('');
    setCurrentLetterId(null);
    localStorage.removeItem(DRAFT_PREFIX + jobId);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <FileText size={15} className="text-primary" /> Cover Letter
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              aria-label="Cover letter template"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {COVER_LETTER_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            {savedLetters.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => handleReuse(e.target.value)}
                aria-label="Reuse a previous cover letter"
                disabled={loadingSaved}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
              >
                <option value="" disabled>
                  Reuse previous letter…
                </option>
                {savedLetters.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.title}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white [&_.ql-container]:min-h-[260px] [&_.ql-container]:rounded-b-xl [&_.ql-toolbar]:rounded-t-xl">
          <ReactQuill theme="snow" value={value} onChange={onChange} modules={QUILL_MODULES} placeholder="Write your cover letter, or use a template / the AI Assistant to get started…" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {wordCount} word{wordCount === 1 ? '' : 's'} · {plainText.length} character{plainText.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={!plainText.trim() || saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : currentLetterId ? 'Update saved letter' : 'Save for reuse'}
          </button>
        </div>
        {!plainText.trim() && (
          <p className="flex items-center gap-1 text-xs text-amber-600">
            <RotateCcw size={12} /> A cover letter is required before you can submit this application.
          </p>
        )}
      </div>

      <AiAssistantPanel
        context={{
          jobTitle,
          companyName,
          jobDescription,
          candidateName: autofill.candidateName,
          candidateProfile: autofill.candidateProfile,
          candidateSkills: autofill.candidateSkills,
          candidateExperience: autofill.candidateExperience,
          resumeText: autofill.resumeText,
        }}
        getCurrentContent={() => htmlToPlainText(value)}
        onInsert={(text) => onChange(value ? `${value}<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>` : `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`)}
        onReplace={(text) => onChange(`<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`)}
      />
    </div>
  );
};

export default CoverLetterEditor;
