import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Check, Loader2, ArrowLeft, Palette,
  Sparkles, Download, Save, Layers, ChevronUp, ChevronDown, Eye, EyeOff, LayoutTemplate,
  ShieldCheck,
} from 'lucide-react';
import {
  getResumeById,
  updateResume,
  Resume,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
  CertificationEntry,
  SkillEntry,
  CustomSectionEntry,
} from './resumeApi';
import { generateResumeSummary, SummaryAction } from './resumeAiApi';
import { THEME_PRESETS, FONT_FAMILY_PRESETS } from './themePresets';
import { TemplateRenderer } from './templates/TemplateRenderer';
import { getTemplateById } from './templates/registry';
import {
  getEffectiveSectionOrder,
  isCustomSectionId,
  customSectionId,
  customSectionKey,
  sectionLabel,
} from './templates/shared/sections';
import { generatePDF, generateAtsSafePDF } from './utils/pdfGenerator';
import ImageUpload from './components/ImageUpload';
import { AtsAnalysisPanel } from './components/AtsAnalysisPanel';

const AUTOSAVE_DELAY_MS = 1200;

// Font-size customization: a uniform document zoom rather than rewriting
// every hand-authored template's fixed-px Tailwind classes into relative
// units (~70 files) — the same technique real resume builders use for this
// exact feature. Applied identically to the live preview and both PDF
// export paths (see handleDownloadPDF/generateAtsSafePDF) so what's shown
// is what gets exported.
const FONT_SCALE_PRESETS: { value: number; label: string }[] = [
  { value: 0.9, label: 'Compact' },
  { value: 1, label: 'Standard' },
  { value: 1.1, label: 'Large' },
];

// Spacing customization: a slightly larger zoom + extra breathing room
// around the page reads as "more spacious" without needing per-section
// margin overrides across every template.
const SPACING_PRESETS: { value: 'compact' | 'standard' | 'relaxed'; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
  { value: 'relaxed', label: 'Relaxed' },
];
const SPACING_SCALE: Record<string, number> = { compact: 0.97, standard: 1, relaxed: 1.05 };

const emptyExperience: ExperienceEntry = {
  role: '', company: '', companyId: null, location: '',
  startDate: '', endDate: '', current: false, description: '',
};
const emptyEducation: EducationEntry = {
  degree: '', institution: '', startDate: '', endDate: '', description: '',
};
const emptyProject: ProjectEntry = { title: '', description: '', link: '' };
const emptyCertification: CertificationEntry = { name: '', issuer: '', year: '' };

const fieldClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100';
const labelClass = 'mb-1 block text-xs font-medium text-slate-500';

type SaveState = 'idle' | 'saving' | 'saved';

function updateArrayItem<K extends keyof Resume>(
  resume: Resume,
  update: (patch: Partial<Resume>) => void,
  key: K,
  index: number,
  patch: Partial<(Resume[K] & any[])[number]>
) {
  const list = [...(resume[key] as any[])] as any[];
  list[index] = { ...list[index], ...patch };
  update({ [key]: list } as Partial<Resume>);
}

const Section: React.FC<{ title: string; onAdd?: () => void; children: React.ReactNode }> = ({
  title, onAdd, children,
}) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100">
          <Plus size={12} /> Add
        </button>
      )}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const EntryCard: React.FC<{ onRemove: () => void; children: React.ReactNode }> = ({ onRemove, children }) => (
  <div className="relative rounded-lg border border-slate-200 p-3">
    <button onClick={onRemove} className="absolute right-2 top-2 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-500" title="Remove">
      <Trash2 size={13} />
    </button>
    <div className="pr-6">{children}</div>
  </div>
);

const AiButton: React.FC<{ label: string; onClick: () => void; loading?: boolean; icon?: React.ReactNode }> = ({
  label, onClick, loading, icon,
}) => (
  <button onClick={onClick} disabled={loading} className="flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60">
    {loading ? <Loader2 size={13} className="animate-spin" /> : icon}
    {loading ? 'Working…' : label}
  </button>
);

const SkillsInput: React.FC<{ skills: SkillEntry[]; onChange: (skills: SkillEntry[]) => void }> = ({ skills, onChange }) => {
  const [draft, setDraft] = useState('');
  const addSkill = () => {
    const value = draft.trim();
    if (value && !skills.some((s) => s.name.toLowerCase() === value.toLowerCase())) {
      onChange([...skills, { name: value, category: 'Other', level: 'Intermediate' }]);
    }
    setDraft('');
  };
  return (
    <div>
      <div className="flex gap-2">
        <input className={fieldClass} placeholder="Type a skill and press Enter" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
        <button onClick={addSkill} className="rounded-lg bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700">Add</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span key={skill.name} className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
            {skill.name}
            <button onClick={() => onChange(skills.filter((s) => s.name !== skill.name))} className="text-slate-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
    </div>
  );
};

const SaveIndicator: React.FC<{ state: SaveState }> = ({ state }) => {
  if (state === 'saving') return <span className="flex items-center gap-1 text-xs text-slate-400"><Loader2 size={12} className="animate-spin" /> Saving…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1 text-xs text-emerald-600"><Check size={12} /> Saved</span>;
  return null;
};

// Simple collision-resistant-enough id for a freshly created custom section
// (only needs to be unique within one resume's customSections array — no
// backend involvement until the next autosave, which is when Mongo assigns
// its own real _id on first read-back).
function generateLocalId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Section-wise layout system: lets the user show/hide sections, reorder
// them with up/down buttons (no drag-and-drop dependency in this codebase),
// and manage custom sections. Operates on resume.sectionOrder / hiddenSections
// / customSections via the shared helpers in templates/shared/sections.ts —
// the exact same source of truth every template reads from for rendering.
const SectionsPanel: React.FC<{
  resume: Resume;
  onReorder: (newOrder: string[]) => void;
  onToggleHidden: (id: string) => void;
  onAddCustom: (title: string, content: string) => void;
  onUpdateCustom: (id: string, patch: Partial<CustomSectionEntry>) => void;
  onRemoveCustom: (id: string) => void;
}> = ({ resume, onReorder, onToggleHidden, onAddCustom, onUpdateCustom, onRemoveCustom }) => {
  const order = getEffectiveSectionOrder(resume);
  const hiddenSet = new Set(resume.hiddenSections || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [expandedCustomId, setExpandedCustomId] = useState<string | null>(null);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className={labelClass}>
        Sections — show/hide and reorder. Empty sections never appear on the resume regardless of this setting.
      </p>
      <div className="space-y-1.5">
        {order.map((id, index) => {
          const isCustom = isCustomSectionId(id);
          const label = sectionLabel(resume, id);
          const isHidden = hiddenSet.has(id);
          const custom = isCustom
            ? (resume.customSections || []).find((c) => c._id === customSectionKey(id))
            : null;

          return (
            <div key={id}>
              <div
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${
                  isHidden ? 'border-slate-100 bg-white/60' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
                <button
                  onClick={() => isCustom && setExpandedCustomId((cur) => (cur === id ? null : id))}
                  className={`flex-1 truncate text-left text-xs font-medium ${isHidden ? 'text-slate-400' : 'text-slate-700'} ${isCustom ? 'hover:text-violet-600' : ''}`}
                >
                  {label}
                  {isCustom && <span className="ml-1 text-[10px] text-slate-400">(custom)</span>}
                </button>
                {isCustom && (
                  <button onClick={() => onRemoveCustom(id)} className="rounded p-1 text-slate-300 hover:text-red-500" title="Delete custom section">
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => onToggleHidden(id)}
                  className={`rounded p-1 ${isHidden ? 'text-slate-300 hover:text-slate-500' : 'text-violet-600 hover:text-violet-700'}`}
                  title={isHidden ? 'Show section' : 'Hide section'}
                >
                  {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {isCustom && expandedCustomId === id && custom && (
                <div className="mt-1.5 space-y-2 rounded-md border border-violet-200 bg-white p-2.5">
                  <input
                    className={fieldClass}
                    placeholder="Section title"
                    value={custom.title}
                    onChange={(e) => onUpdateCustom(id, { title: e.target.value })}
                  />
                  <textarea
                    className={fieldClass}
                    rows={3}
                    placeholder="Content"
                    value={custom.content}
                    onChange={(e) => onUpdateCustom(id, { content: e.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddForm ? (
        <div className="mt-3 space-y-2 rounded-md border border-violet-200 bg-white p-2.5">
          <input
            className={fieldClass}
            placeholder="Section title (e.g. Volunteer Work)"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
          />
          <textarea
            className={fieldClass}
            rows={3}
            placeholder="Content"
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!draftTitle.trim()) return;
                onAddCustom(draftTitle.trim(), draftContent);
                setDraftTitle('');
                setDraftContent('');
                setShowAddForm(false);
              }}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
            >
              Add Section
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setDraftTitle('');
                setDraftContent('');
              }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-3 flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100"
        >
          <Plus size={12} /> Add custom section
        </button>
      )}
    </div>
  );
};

const ResumeEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Store resume in a ref AS WELL as state so that the autosave timer
  // closure always reads the latest value — this is the ROOT CAUSE fix.
  // Without this, handlePhotoChange updates state but scheduleSave sends
  // the stale resume snapshot captured when the timer was registered.
  const [resume, setResume] = useState<Resume | null>(null);
  const resumeRef = useRef<Resume | null>(null);

  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showSectionsPanel, setShowSectionsPanel] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [aiAction, setAiAction] = useState<SummaryAction | null>(null);
  const [aiTargetRole, setAiTargetRole] = useState('');
  const [aiError, setAiError] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `previewRef` is what generatePDF's html2canvas call captures. At the
  // default font size/spacing (scale 1) it wraps TemplateRenderer
  // directly, unchanged from before. Away from the default, an inner
  // wrapper (`previewInnerRef`) carries a `transform: scale(...)` — the
  // technique html2canvas actually supports (confirmed: it does NOT
  // support the CSS `zoom` property the live preview below uses on-screen)
  // — and `previewRef` is explicitly sized via `scaledCaptureDims`
  // (measured from the transformed box's real on-screen size via
  // getBoundingClientRect, which — unlike offsetWidth/Height — DOES
  // reflect the transform) so html2canvas captures exactly that box
  // instead of clipping to the pre-transform layout size.
  const previewRef = useRef<HTMLDivElement>(null);
  const previewInnerRef = useRef<HTMLDivElement>(null);
  const [scaledCaptureDims, setScaledCaptureDims] = useState<{ width: number; height: number } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showAtsPanel, setShowAtsPanel] = useState(false);
  const [downloadingAtsSafePdf, setDownloadingAtsSafePdf] = useState(false);

  const previewScaleValue =
    (resume?.fontScale ?? 1) * (SPACING_SCALE[resume?.spacing || 'standard'] ?? 1);

  // Only measures/engages the scaled-capture wrapper when the user has
  // actually moved font size or spacing off the defaults — at scale 1 this
  // is a no-op and `generatePDF` captures `previewRef` exactly as it
  // always has, so nobody who never opens the Customize controls sees any
  // behavior change.
  useLayoutEffect(() => {
    if (previewScaleValue === 1) {
      setScaledCaptureDims(null);
      return;
    }
    const inner = previewInnerRef.current;
    if (!inner) return;
    const measure = () => {
      const rect = inner.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setScaledCaptureDims({ width: rect.width, height: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [previewScaleValue, resume]);

  useEffect(() => {
    if (!id) return;
    getResumeById(id).then((data) => {
      setResume(data);
      resumeRef.current = data;
      setLoading(false);
    });
  }, [id]);

  // Schedule an autosave using the ref — always gets the latest resume
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      if (!resumeRef.current) return;
      try {
        await updateResume(resumeRef.current._id, resumeRef.current);
        setSaveState('saved');
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveState('idle');
      }
    }, AUTOSAVE_DELAY_MS);
  }, []);

  const update = useCallback((patch: Partial<Resume>) => {
    setResume((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      // Keep ref in sync immediately so the save timer reads fresh data
      resumeRef.current = next;
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const handleManualSave = async () => {
    if (!resumeRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    try {
      await updateResume(resumeRef.current._id, resumeRef.current);
      setSaveState('saved');
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (err) {
      console.error('Manual save failed:', err);
      setSaveState('idle');
    }
  };

  const handleDownloadPDF = async () => {
    if (!resume || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const fileName = `${resume.personalInfo?.fullName || resume.title || 'resume'}.pdf`.replace(/\s+/g, '_');
      const templateName = getTemplateById(resume.layout)?.name || resume.layout;
      await generatePDF(previewRef, fileName, resume.layout, templateName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setAiError('Could not generate the PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadAtsSafePdf = async () => {
    if (!resume || downloadingAtsSafePdf) return;
    setDownloadingAtsSafePdf(true);
    try {
      const fileName = `${resume.personalInfo?.fullName || resume.title || 'resume'}_ATS_Safe.pdf`.replace(/\s+/g, '_');
      await generateAtsSafePDF(resume, fileName);
    } catch (err) {
      console.error('Failed to generate ATS-safe PDF:', err);
      setAiError('Could not generate the ATS-safe PDF. Please try again.');
    } finally {
      setDownloadingAtsSafePdf(false);
    }
  };

  // Photo change — updates personalInfo.photo and triggers autosave
  const handlePhotoChange = useCallback((dataUrl: string | null) => {
    if (!resumeRef.current) return;
    update({
      personalInfo: {
        ...resumeRef.current.personalInfo,
        photo: dataUrl ?? '',
      },
    });
  }, [update]);

  // Section-wise layout system handlers — all persist through the same
  // debounced update()/autosave path as every other field, and all read/
  // write exactly the fields templates/shared/sections.ts consumes, so
  // order/visibility here is always what actually renders.
  const handleReorderSections = useCallback((newOrder: string[]) => {
    update({ sectionOrder: newOrder });
  }, [update]);

  const handleToggleSectionHidden = useCallback((id: string) => {
    if (!resumeRef.current) return;
    const hidden = resumeRef.current.hiddenSections || [];
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    update({ hiddenSections: next });
  }, [update]);

  const handleAddCustomSection = useCallback((title: string, content: string) => {
    if (!resumeRef.current) return;
    const id = generateLocalId();
    const baseOrder = getEffectiveSectionOrder(resumeRef.current);
    update({
      customSections: [...(resumeRef.current.customSections || []), { _id: id, title, content }],
      sectionOrder: [...baseOrder, customSectionId(id)],
    });
  }, [update]);

  const handleUpdateCustomSection = useCallback((sectionId: string, patch: Partial<CustomSectionEntry>) => {
    if (!resumeRef.current) return;
    const key = customSectionKey(sectionId);
    const next = (resumeRef.current.customSections || []).map((c) => (c._id === key ? { ...c, ...patch } : c));
    update({ customSections: next });
  }, [update]);

  const handleRemoveCustomSection = useCallback((sectionId: string) => {
    if (!resumeRef.current) return;
    const key = customSectionKey(sectionId);
    update({
      customSections: (resumeRef.current.customSections || []).filter((c) => c._id !== key),
      sectionOrder: (resumeRef.current.sectionOrder || []).filter((sid) => sid !== sectionId),
    });
  }, [update]);

  const handleAiSummaryAction = async (action: SummaryAction) => {
    if (!resume) return;
    setAiError('');
    setAiAction(action);
    try {
      const summary = await generateResumeSummary(resume._id, action, aiTargetRole.trim() || undefined);
      update({ summary });
    } catch (err: any) {
      setAiError(err?.response?.data?.message || 'AI request failed. Please try again.');
    } finally {
      setAiAction(null);
    }
  };

  if (loading || !resume) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading resume…</div>;
  }

  const currentTemplateDef = getTemplateById(resume.layout);
  // Combined uniform scale applied to the live preview + PDF exports —
  // font-size preset and spacing preset compose multiplicatively so
  // "Large + Relaxed" reads as noticeably roomier than either alone.
  // (Computed above, before the loading guard, as `previewScaleValue` —
  // reused here under its original name for the render below.)
  const previewScale = previewScaleValue;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row print:block">

      {/* ── Form panel ── */}
      <div className="w-full space-y-6 overflow-y-auto border-b border-slate-200 bg-white p-5 lg:h-screen lg:w-1/2 lg:border-b-0 lg:border-r print:hidden">

        {/* Top bar — wraps on narrow screens instead of overflowing
            horizontally now that there are 5 action buttons + Back. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => navigate('/resume')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <SaveIndicator state={saveState} />
            <button onClick={handleManualSave} className="flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100">
              <Save size={13} /> Save
            </button>
            <button onClick={handleDownloadPDF} disabled={downloadingPdf} className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
              {downloadingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {downloadingPdf ? 'Generating…' : 'Download PDF'}
            </button>
            <button onClick={() => setShowSectionsPanel((s) => !s)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Layers size={13} /> Sections
            </button>
            <button onClick={() => setShowThemePicker((s) => !s)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Palette size={13} /> Theme & Layout
            </button>
            <button onClick={() => setShowAtsPanel((s) => !s)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <ShieldCheck size={13} /> ATS Score
            </button>
          </div>
        </div>

        {/* Sections panel — show/hide, reorder, custom sections */}
        {showSectionsPanel && (
          <SectionsPanel
            resume={resume}
            onReorder={handleReorderSections}
            onToggleHidden={handleToggleSectionHidden}
            onAddCustom={handleAddCustomSection}
            onUpdateCustom={handleUpdateCustomSection}
            onRemoveCustom={handleRemoveCustomSection}
          />
        )}

        {/* Theme & template picker — layout switching now reopens the full
            Template Gallery (all 1500+ registry templates) instead of the
            old 3-item inline picker, which only ever covered the 3 legacy
            fallback layouts. */}
        {showThemePicker && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className={labelClass}>Template</p>
            <div className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 ring-1 ring-slate-200">
              <span className="truncate text-xs font-medium text-slate-600">
                {currentTemplateDef?.name || resume.layout}
              </span>
              <button
                onClick={() => navigate(`/resume?resumeId=${resume._id}`)}
                className="flex shrink-0 items-center gap-1 rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100"
              >
                <LayoutTemplate size={12} /> Change template
              </button>
            </div>
            {resume.layout.includes('--') ? (
              <p className={`${labelClass} mt-3`}>
                This template's color theme is fixed to the variant you picked. Use "Change template" above to pick a different color/photo variant of the same layout.
              </p>
            ) : (
              <>
                <p className={`${labelClass} mt-3`}>Theme</p>
                <div className="flex flex-wrap gap-2">
                  {THEME_PRESETS.map((t) => (
                    <button key={t.id} onClick={() => update({ theme: t.id })}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${resume.theme === t.id ? 'ring-2 ring-violet-400' : ''}`}
                      style={{ backgroundColor: t.accentSoft, color: t.accent }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Typography & density — independent of theme/color. Most
                generated + hand-written templates read this via
                getTheme(resume.theme, resume.fontFamily); a few named
                formats (Harvard/Stanford Resume, the Worker category) keep
                intentionally fixed typography — see registry.ts's
                `fontCustomizable` flag. */}
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className={labelClass}>Font Family</p>
              {currentTemplateDef?.fontCustomizable === false ? (
                <p className="text-xs text-slate-400">
                  This template uses fixed typography as part of its design and can't be overridden.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {FONT_FAMILY_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => update({ fontFamily: f.id })}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                        (resume.fontFamily || 'theme-default') === f.id
                          ? 'border-violet-400 bg-violet-50 text-violet-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      style={f.id !== 'theme-default' ? { fontFamily: f.fontBody } : undefined}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              <p className={`${labelClass} mt-3`}>Font Size</p>
              <div className="flex gap-2">
                {FONT_SCALE_PRESETS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => update({ fontScale: s.value })}
                    className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                      (resume.fontScale ?? 1) === s.value
                        ? 'border-violet-400 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <p className={`${labelClass} mt-3`}>Spacing</p>
              <div className="flex gap-2">
                {SPACING_PRESETS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => update({ spacing: s.value })}
                    className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                      (resume.spacing || 'standard') === s.value
                        ? 'border-violet-400 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Font size and spacing apply to both the preview and the downloaded PDF.
              </p>
            </div>
          </div>
        )}

        {/* ATS compatibility analysis */}
        {showAtsPanel && (
          <AtsAnalysisPanel
            resumeId={resume._id}
            onDownloadAtsSafePdf={handleDownloadAtsSafePdf}
            downloadingAtsSafePdf={downloadingAtsSafePdf}
          />
        )}

        {/* Title / Target role */}
        <div>
          <label className={labelClass}>Resume Title (for your own reference)</label>
          <input className={fieldClass} value={resume.title} onChange={(e) => update({ title: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Target Role</label>
          <input className={fieldClass} placeholder="e.g. Frontend Engineer" value={resume.targetRole} onChange={(e) => update({ targetRole: e.target.value })} />
        </div>

        {/* Personal Information */}
        <Section title="Personal Information">

          {/* Profile photo */}
          <div className="mb-3">
            <p className={labelClass}>Profile Photo</p>
            <div className="flex items-center gap-4">
              <ImageUpload
                imageUrl={resume.personalInfo.photo || null}
                onImageChange={handlePhotoChange}
                className="h-24 w-24 rounded-full overflow-hidden"
                isPreviewMode={false}
              />
              <div className="text-xs text-slate-400 space-y-1">
                <p>Click the circle to add or change your photo.</p>
                <p>The photo is saved with the resume and appears in templates and the downloaded PDF.</p>
                {resume.personalInfo.photo && (
                  <button onClick={() => handlePhotoChange(null)} className="text-rose-500 hover:text-rose-600 underline">
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input className={fieldClass} placeholder="Full name" value={resume.personalInfo.fullName}
              onChange={(e) => update({ personalInfo: { ...resume.personalInfo, fullName: e.target.value } })} />
            <input className={fieldClass} placeholder="Email" value={resume.personalInfo.email}
              onChange={(e) => update({ personalInfo: { ...resume.personalInfo, email: e.target.value } })} />
            <input className={fieldClass} placeholder="Phone" value={resume.personalInfo.phone}
              onChange={(e) => update({ personalInfo: { ...resume.personalInfo, phone: e.target.value } })} />
            <input className={fieldClass} placeholder="Location" value={resume.personalInfo.location}
              onChange={(e) => update({ personalInfo: { ...resume.personalInfo, location: e.target.value } })} />
            <input className={fieldClass} placeholder="LinkedIn URL" value={resume.personalInfo.linkedin}
              onChange={(e) => update({ personalInfo: { ...resume.personalInfo, linkedin: e.target.value } })} />
            <input className={fieldClass} placeholder="Website / Portfolio" value={resume.personalInfo.website}
              onChange={(e) => update({ personalInfo: { ...resume.personalInfo, website: e.target.value } })} />
            <input className={`${fieldClass} col-span-2`} placeholder="GitHub URL" value={resume.personalInfo.github || ''}
              onChange={(e) => update({ personalInfo: { ...resume.personalInfo, github: e.target.value } })} />
          </div>
        </Section>

        {/* Summary */}
        <Section title="Professional Summary">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input type="text" value={aiTargetRole} onChange={(e) => setAiTargetRole(e.target.value)}
              placeholder="Target role (optional)"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
            <AiButton
              label={resume.summary?.trim() ? 'Improve' : 'Generate with AI'}
              icon={<Sparkles size={13} />}
              loading={aiAction === (resume.summary?.trim() ? 'improve' : 'generate')}
              onClick={() => handleAiSummaryAction(resume.summary?.trim() ? 'improve' : 'generate')}
            />
            {resume.summary?.trim() && (
              <>
                <AiButton label="Shorten" loading={aiAction === 'shorten'} onClick={() => handleAiSummaryAction('shorten')} />
                <AiButton label="Expand" loading={aiAction === 'expand'} onClick={() => handleAiSummaryAction('expand')} />
              </>
            )}
          </div>
          {aiError && <p className="mb-2 text-xs text-rose-600">{aiError}</p>}
          <textarea className={fieldClass} rows={4} placeholder="2-3 sentences summarizing your experience and strengths…"
            value={resume.summary} onChange={(e) => update({ summary: e.target.value })} />
        </Section>

        {/* Experience */}
        <Section title="Experience" onAdd={() => update({ experience: [...resume.experience, { ...emptyExperience }] })}>
          {resume.experience.map((exp, i) => (
            <EntryCard key={exp._id || i} onRemove={() => update({ experience: resume.experience.filter((_, idx) => idx !== i) })}>
              <div className="grid grid-cols-2 gap-2">
                <input className={fieldClass} placeholder="Role / Job Title" value={exp.role}
                  onChange={(e) => updateArrayItem(resume, update, 'experience', i, { role: e.target.value })} />
                <input className={fieldClass} placeholder="Company" value={exp.company}
                  onChange={(e) => updateArrayItem(resume, update, 'experience', i, { company: e.target.value, companyId: null })} />
                <input className={fieldClass} placeholder="Location" value={exp.location}
                  onChange={(e) => updateArrayItem(resume, update, 'experience', i, { location: e.target.value })} />
                <input className={fieldClass} placeholder="Start (e.g. Jan 2023)" value={exp.startDate}
                  onChange={(e) => updateArrayItem(resume, update, 'experience', i, { startDate: e.target.value })} />
                <input className={fieldClass} placeholder="End" value={exp.endDate} disabled={exp.current}
                  onChange={(e) => updateArrayItem(resume, update, 'experience', i, { endDate: e.target.value })} />
              </div>
              <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" checked={exp.current}
                  onChange={(e) => updateArrayItem(resume, update, 'experience', i, { current: e.target.checked })} />
                I currently work here
              </label>
              <textarea className={`${fieldClass} mt-2`} rows={3} placeholder="What did you do?"
                value={exp.description} onChange={(e) => updateArrayItem(resume, update, 'experience', i, { description: e.target.value })} />
            </EntryCard>
          ))}
        </Section>

        {/* Education */}
        <Section title="Education" onAdd={() => update({ education: [...resume.education, { ...emptyEducation }] })}>
          {resume.education.map((edu, i) => (
            <EntryCard key={edu._id || i} onRemove={() => update({ education: resume.education.filter((_, idx) => idx !== i) })}>
              <div className="grid grid-cols-2 gap-2">
                <input className={fieldClass} placeholder="Degree" value={edu.degree}
                  onChange={(e) => updateArrayItem(resume, update, 'education', i, { degree: e.target.value })} />
                <input className={fieldClass} placeholder="Institution" value={edu.institution}
                  onChange={(e) => updateArrayItem(resume, update, 'education', i, { institution: e.target.value })} />
                <input className={fieldClass} placeholder="Start year" value={edu.startDate}
                  onChange={(e) => updateArrayItem(resume, update, 'education', i, { startDate: e.target.value })} />
                <input className={fieldClass} placeholder="End year" value={edu.endDate}
                  onChange={(e) => updateArrayItem(resume, update, 'education', i, { endDate: e.target.value })} />
              </div>
            </EntryCard>
          ))}
        </Section>

        {/* Projects */}
        <Section title="Projects" onAdd={() => update({ projects: [...resume.projects, { ...emptyProject }] })}>
          {resume.projects.map((p, i) => (
            <EntryCard key={p._id || i} onRemove={() => update({ projects: resume.projects.filter((_, idx) => idx !== i) })}>
              <input className={fieldClass} placeholder="Project title" value={p.title}
                onChange={(e) => updateArrayItem(resume, update, 'projects', i, { title: e.target.value })} />
              <textarea className={`${fieldClass} mt-2`} rows={2} placeholder="What did you build?" value={p.description}
                onChange={(e) => updateArrayItem(resume, update, 'projects', i, { description: e.target.value })} />
            </EntryCard>
          ))}
        </Section>

        {/* Certifications */}
        <Section title="Certifications" onAdd={() => update({ certifications: [...resume.certifications, { ...emptyCertification }] })}>
          {resume.certifications.map((c, i) => (
            <EntryCard key={c._id || i} onRemove={() => update({ certifications: resume.certifications.filter((_, idx) => idx !== i) })}>
              <div className="grid grid-cols-3 gap-2">
                <input className={fieldClass} placeholder="Name" value={c.name}
                  onChange={(e) => updateArrayItem(resume, update, 'certifications', i, { name: e.target.value })} />
                <input className={fieldClass} placeholder="Issuer" value={c.issuer}
                  onChange={(e) => updateArrayItem(resume, update, 'certifications', i, { issuer: e.target.value })} />
                <input className={fieldClass} placeholder="Year" value={c.year}
                  onChange={(e) => updateArrayItem(resume, update, 'certifications', i, { year: e.target.value })} />
              </div>
            </EntryCard>
          ))}
        </Section>

        {/* Skills */}
        <Section title="Skills">
          <SkillsInput skills={resume.skills} onChange={(skills) => update({ skills })} />
        </Section>

      </div>

      {/* ── Live preview panel ── */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:h-screen print:bg-white print:p-0 print:overflow-visible">
        {/* At the default font size/spacing (scale 1) both wrapper styles
            below are `undefined` — this renders byte-for-byte the same DOM
            styling as before the Customize feature existed, so nobody who
            never touches those controls sees any change. Away from
            default, `previewInnerRef` gets `transform: scale()` (the CSS
            property html2canvas actually supports — `zoom` is confirmed
            unsupported) and the outer `previewRef` is explicitly sized to
            that transform's real on-screen box (measured via the
            useLayoutEffect above with getBoundingClientRect, which DOES
            reflect a transform, unlike offsetWidth/Height) so both the
            on-screen layout and the html2canvas/PDF capture use the same
            correctly-sized box instead of clipping to the pre-transform size. */}
        <div
          ref={previewRef}
          style={scaledCaptureDims ? { width: scaledCaptureDims.width, height: scaledCaptureDims.height, position: 'relative' } : undefined}
        >
          <div
            ref={previewInnerRef}
            style={previewScale !== 1 ? { transform: `scale(${previewScale})`, transformOrigin: 'top left', width: 720 } : undefined}
          >
            <TemplateRenderer resume={resume} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default ResumeEditor;