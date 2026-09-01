import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, CheckCircle2, HardHat, Sparkles, ArrowLeft, Search, ImageIcon, ImageOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCurrentUser } from '../../utils/currentUser';
import {
  TEMPLATE_REGISTRY,
  type TemplateCategory,
  type TemplateDefinition,
} from './templates/registry';
import { THEME_PRESETS } from './themePresets';
import { SAMPLE_RESUME } from './templates/shared/sampleResume';
import { createResume, updateResume } from './resumeApi';

// Every color/font variant of the same base layout shares a `groupId`
// (see registry.ts) — grouping by it turns "1,500+ nearly-identical
// cards" into one card per structurally-distinct design, with the color
// choices surfaced as swatches instead of separate full-size cards. Hand
// written templates have no `groupId` (nothing to group them with), so
// each is simply its own single-variant group.
interface TemplateGroup {
  key: string;
  variants: TemplateDefinition[];
}

function groupTemplates(templates: TemplateDefinition[]): TemplateGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, TemplateDefinition[]>();
  for (const t of templates) {
    const key = t.groupId ?? t.id;
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(t);
  }
  return order.map((key) => ({ key, variants: byKey.get(key)! }));
}

// ── Preview modal ──────────────────────────────────────────────────────────────

interface PreviewModalProps {
  template: TemplateDefinition;
  onClose: () => void;
  onUse: () => void;
}

const TemplatePreviewModal: React.FC<PreviewModalProps> = ({ template, onClose, onUse }) => {
  const Template = template.component;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{template.name}</p>
            <p className="truncate text-xs text-slate-400">{template.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {template.atsFriendly && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 size={11} /> ATS Friendly
              </span>
            )}
            {template.photoSupported && (
              <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                <ImageIcon size={11} /> Photo
              </span>
            )}
            <button
              onClick={onUse}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              Use This Template
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto bg-slate-100 p-6">
          <Template resume={SAMPLE_RESUME} />
        </div>
      </div>
    </div>
  );
};

// ── Template card ──────────────────────────────────────────────────────────────

interface CardProps {
  group: TemplateGroup;
  activeVariant: TemplateDefinition;
  onSelectVariant: (templateId: string) => void;
  onPreview: () => void;
  onUse: () => void;
  isLoading: boolean;
}

const TemplateCard: React.FC<CardProps> = ({ group, activeVariant, onSelectVariant, onPreview, onUse, isLoading }) => {
  const Template = activeVariant.component;
  const displayName = activeVariant.baseName ?? activeVariant.name;
  const hasColorChoices = group.variants.length > 1;

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Thumbnail — live render at 0.35× scale */}
      <button
        onClick={onPreview}
        className="relative block w-full overflow-hidden bg-slate-50"
        style={{ height: 230 }}
      >
        <div
          style={{
            transform: 'scale(0.35)',
            transformOrigin: 'top left',
            width: '286%',
            pointerEvents: 'none',
          }}
        >
          <Template resume={SAMPLE_RESUME} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
          <span className="hidden rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow group-hover:block">
            Preview
          </span>
        </div>
      </button>

      {/* Footer */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-slate-800">{displayName}</p>
          <span className="shrink-0 text-[10.5px] uppercase tracking-wide text-slate-400">{activeVariant.category}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] text-slate-400">{activeVariant.description}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {activeVariant.atsFriendly && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">
              <CheckCircle2 size={10} /> ATS Friendly
            </span>
          )}
          {activeVariant.photoSupported ? (
            <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-medium text-violet-700">
              <ImageIcon size={10} /> Photo
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
              <ImageOff size={10} /> No Photo
            </span>
          )}
          {(activeVariant.bestFor || []).slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
              {tag}
            </span>
          ))}
        </div>

        {/* Color picker — every swatch is a full color/font variant of the
            SAME layout (see registry.ts groupId), so switching one never
            changes the structure, only the palette. */}
        {hasColorChoices && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {group.variants.map((variant) => {
              const theme = THEME_PRESETS.find((t) => t.id === variant.themeId);
              const isActive = variant.id === activeVariant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onSelectVariant(variant.id)}
                  title={theme?.name || variant.themeId}
                  aria-label={`Preview in ${theme?.name || 'this'} color`}
                  className={`h-5 w-5 shrink-0 rounded-full ring-offset-1 transition ${
                    isActive ? 'ring-2 ring-violet-500' : 'ring-1 ring-slate-200 hover:ring-slate-400'
                  }`}
                  style={{ backgroundColor: theme?.accent || '#94a3b8' }}
                />
              );
            })}
          </div>
        )}

        <button
          onClick={onUse}
          disabled={isLoading}
          className="mt-3 w-full rounded-lg bg-violet-600 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {isLoading ? 'Applying…' : 'Use Template'}
        </button>
      </div>
    </div>
  );
};

// ── Category + Photo filter chips ───────────────────────────────────────────────

type CategoryFilter = 'All' | TemplateCategory;
type PhotoFilter = 'all' | 'photo' | 'no-photo';

const CATEGORY_TABS: { label: string; value: CategoryFilter; icon?: React.ReactNode }[] = [
  { label: 'All', value: 'All' },
  { label: 'ATS', value: 'ATS' },
  { label: 'Professional', value: 'Professional' },
  { label: 'Technology', value: 'Technology' },
  { label: 'Student', value: 'Student' },
  { label: 'Creative', value: 'Creative' },
  { label: 'Worker & Trades', value: 'Worker', icon: <HardHat size={13} /> },
];

const PHOTO_TABS: { label: string; value: PhotoFilter; icon?: React.ReactNode }[] = [
  { label: 'All', value: 'all' },
  { label: 'Photo templates', value: 'photo', icon: <ImageIcon size={12} /> },
  { label: 'No-photo templates', value: 'no-photo', icon: <ImageOff size={12} /> },
];

// Cards are paginated (grouped by distinct design, not raw color variant —
// see groupTemplates), so only ever PAGE_SIZE live-rendered previews are
// mounted at a time regardless of how many designs/colors match the
// current filters.
const PAGE_SIZE = 24;

// ── Worker hero banner ─────────────────────────────────────────────────────────

const POPULAR_WORKER_ROLES = [
  'Warehouse Worker', 'Factory Worker', 'Driver', 'Construction Worker',
  'Electrician', 'Cleaner', 'Security Guard', 'Delivery Driver',
];

const WorkerHeroBanner: React.FC<{ onRoleClick: () => void }> = ({ onRoleClick }) => (
  <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-[#e67e22]/10 p-2">
        <HardHat size={22} className="text-[#e67e22]" />
      </div>
      <div className="flex-1">
        <h3 className="text-[15px] font-bold text-slate-800">Build a Resume for Your Job</h3>
        <p className="mt-0.5 text-[12.5px] text-slate-500">
          Choose your job role and get a professionally designed resume tailored to your experience.
          All templates are ATS-friendly and easy to fill out.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {POPULAR_WORKER_ROLES.map((role) => (
            <button
              key={role}
              onClick={onRoleClick}
              className="rounded-full border border-[#e67e22]/40 bg-white px-2.5 py-1 text-[11px] font-medium text-[#c0511a] hover:bg-[#e67e22] hover:text-white transition"
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── AI Banner ──────────────────────────────────────────────────────────────────

const AiBanner: React.FC<{ onBuild: () => void }> = ({ onBuild }) => (
  <div className="mb-8 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-600 p-2.5 flex-shrink-0">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-slate-800">
            Let AI Build Your Resume Automatically
          </h3>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            Just tell us about yourself — your experience, skills, and education.
            AI writes your entire resume in seconds.
          </p>
        </div>
      </div>
      <button
        onClick={onBuild}
        className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200 whitespace-nowrap"
      >
        <Sparkles size={14} /> Build with AI
      </button>
    </div>
  </div>
);

// ── Main gallery ───────────────────────────────────────────────────────────────

const TemplateGallery: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // When opened as "Change template" from an existing resume (see
  // ResumeEditor.tsx), ?resumeId=<id> is set — selecting a template then
  // PATCHes that resume's layout instead of creating a new one, and
  // section order / content / photo are all preserved untouched.
  const resumeId = searchParams.get('resumeId');
  const { isAuthenticated } = useCurrentUser();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [preview, setPreview] = useState<TemplateDefinition | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  // Which color variant is currently shown for each group's card —
  // defaults to the group's first variant until the shopper picks a swatch.
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATE_REGISTRY.filter((t) => {
      if (activeCategory !== 'All' && t.category !== activeCategory) return false;
      if (photoFilter === 'photo' && !t.photoSupported) return false;
      if (photoFilter === 'no-photo' && t.photoSupported) return false;
      if (q) {
        const haystack = [t.name, t.baseName, t.description, ...(t.bestFor || [])].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeCategory, photoFilter, query]);

  // Default: one card per structurally-distinct design (see
  // groupTemplates) — this is what actually fixes "too many templates
  // that all look the same": color variants become swatches on a card
  // instead of separate cards. `showAllVariants` lets someone who
  // specifically wants to browse/verify every one of the 1,621 selectable
  // templates individually do exactly that, without losing the grouped
  // view as the default (better) experience for actually picking one.
  const [showAllVariants, setShowAllVariants] = useState(false);
  const groups = useMemo(
    () => (showAllVariants ? filtered.map((t) => ({ key: t.id, variants: [t] })) : groupTemplates(filtered)),
    [filtered, showAllVariants]
  );
  const totalVariants = filtered.length;

  const visible = groups.slice(0, visibleCount);
  const hasMore = visibleCount < groups.length;

  const activeVariantOf = (group: TemplateGroup): TemplateDefinition =>
    group.variants.find((v) => v.id === selectedVariant[group.key]) ?? group.variants[0];

  const resetPaging = () => setVisibleCount(PAGE_SIZE);

  const handleUse = async (template: TemplateDefinition) => {
    if (loading) return;

    if (!isAuthenticated) {
      toast.info('Please log in to start building your resume.');
      navigate('/login', { state: { from: { pathname: '/resume' } } });
      return;
    }

    setLoading(template.id);
    try {
      if (resumeId) {
        await updateResume(resumeId, { layout: template.id });
        toast.success(`Switched to "${template.name}".`);
        navigate(`/resume/${resumeId}/edit`);
        return;
      }
      const resume = await createResume({ layout: template.id, theme: 'violet' });
      navigate(`/resume/${resume._id}/edit`);
    } catch (err: any) {
      console.error('Failed to create resume', err);
      if (err?.response?.status === 401) {
        toast.info('Your session expired — please log in again.');
        navigate('/login', { state: { from: { pathname: '/resume' } } });
      } else {
        toast.error(err?.response?.data?.message || 'Failed to create resume. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {resumeId ? (
          <button
            onClick={() => navigate(`/resume/${resumeId}/edit`)}
            className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={15} /> Back to editor
          </button>
        ) : (
          /* ── AI Banner at the top ── */
          <AiBanner onBuild={() => navigate('/resume/ai-builder')} />
        )}

        {/* ── Heading + search ──
            The real, headline number is the total selectable template
            count (TEMPLATE_REGISTRY.length) — leading with the smaller
            "designs" count here is what previously read as "only 81
            templates" even though every one of those cards has multiple
            fully-selectable color/font variants underneath it. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold uppercase tracking-widest text-slate-500">
              {resumeId ? 'Choose a New Template' : 'Choose a Template'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              <span className="font-bold text-violet-600">{TEMPLATE_REGISTRY.length.toLocaleString()}</span> templates
              {' — '}{groups.length.toLocaleString()} unique layouts, each in multiple colors/fonts.{' '}
              <button
                onClick={() => { setShowAllVariants((v) => !v); resetPaging(); }}
                className="font-medium text-violet-600 underline hover:text-violet-700"
              >
                {showAllVariants ? 'Group by layout' : `Show all ${totalVariants.toLocaleString()} individually`}
              </button>
            </p>
          </div>
          <div className="relative w-full max-w-xs sm:w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPaging(); }}
              placeholder="Search templates…"
              className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveCategory(tab.value); resetPaging(); }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCategory === tab.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Photo filter chips */}
        <div className="mt-2.5 flex flex-wrap gap-2">
          {PHOTO_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setPhotoFilter(tab.value); resetPaging(); }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                photoFilter === tab.value
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Worker hero banner — show only on Worker tab */}
        {activeCategory === 'Worker' && (
          <div className="mt-5">
            <WorkerHeroBanner onRoleClick={() => {}} />
          </div>
        )}

        {/* Template grid — one card per distinct design; color variants
            are swatches on the card, not separate cards. */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((group) => {
            const active = activeVariantOf(group);
            return (
              <TemplateCard
                key={group.key}
                group={group}
                activeVariant={active}
                onSelectVariant={(id) => setSelectedVariant((prev) => ({ ...prev, [group.key]: id }))}
                onPreview={() => setPreview(active)}
                onUse={() => handleUse(active)}
                isLoading={loading === active.id}
              />
            );
          })}
        </div>

        {groups.length === 0 && (
          <div className="mt-16 text-center text-slate-400">
            <p className="text-sm">No templates match your filters. Try clearing the search or filters.</p>
          </div>
        )}

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Load more templates ({(groups.length - visibleCount).toLocaleString()} more)
            </button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <TemplatePreviewModal
          template={preview}
          onClose={() => setPreview(null)}
          onUse={() => {
            setPreview(null);
            handleUse(preview);
          }}
        />
      )}
    </div>
  );
};

export default TemplateGallery;
