import React from 'react';
import { Palette, Type, FileDigit, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import type { Resume } from '../resumeApi';
import { THEME_PRESETS } from '../themePresets';
import { TEMPLATE_REGISTRY, getTemplateById } from '../templates/registry';

export const FONT_SCALE_PRESETS: { value: number; label: string }[] = [
  { value: 0.9, label: 'Compact' },
  { value: 1, label: 'Standard' },
  { value: 1.1, label: 'Large' },
];

interface PdfCustomizationToolbarProps {
  resume: Resume;
  onUpdate: (patch: Partial<Resume>) => void;
  onChangeTemplate?: () => void;
}

export const PdfCustomizationToolbar: React.FC<PdfCustomizationToolbarProps> = ({
  resume,
  onUpdate,
  onChangeTemplate,
}) => {
  const currentTemplate = getTemplateById(resume.layout);
  const currentScale = resume.fontScale ?? 1;
  const currentPageNumbering = resume.pageNumbering || 'all';
  const currentShowLogo = resume.showLogo || 'all';

  // Common input styling guaranteeing identical height, border, radius, typography, and spacing
  const selectStyle =
    'h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:border-orange-500 focus:outline-none transition-colors';

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Controls group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Template */}
          <div className="flex items-center gap-1.5">
            <LayoutTemplate size={14} className="text-slate-500 shrink-0" />
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider shrink-0">
              Template:
            </label>
            <select
              className={`${selectStyle} min-w-[150px] max-w-[200px]`}
              value={resume.layout}
              onChange={(e) => onUpdate({ layout: e.target.value })}
              title="Select resume template"
            >
              {TEMPLATE_REGISTRY.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Colour Style */}
          <div className="flex items-center gap-1.5">
            <Palette size={14} className="text-slate-500 shrink-0" />
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider shrink-0">
              Colour:
            </label>
            <select
              className={`${selectStyle} min-w-[110px]`}
              value={resume.theme}
              onChange={(e) => onUpdate({ theme: e.target.value })}
              title="Select color style"
            >
              {THEME_PRESETS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Text Size */}
          <div className="flex items-center gap-1.5">
            <Type size={14} className="text-slate-500 shrink-0" />
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider shrink-0">
              Text Size:
            </label>
            <select
              className={`${selectStyle} min-w-[115px]`}
              value={currentScale}
              onChange={(e) => onUpdate({ fontScale: parseFloat(e.target.value) })}
              title="Select text size"
            >
              {FONT_SCALE_PRESETS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Show Logo On (Wide enough so 'First page only' is never truncated) */}
          <div className="flex items-center gap-1.5">
            <ImageIcon size={14} className="text-slate-500 shrink-0" />
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider shrink-0">
              Show Logo:
            </label>
            <select
              className={`${selectStyle} min-w-[135px]`}
              value={currentShowLogo}
              onChange={(e) => onUpdate({ showLogo: e.target.value as any })}
              title="Control logo visibility on pages"
            >
              <option value="all">All pages</option>
              <option value="first">First page only</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* 5. Page Number (Wide enough so 'First page only' / 'Last page only' is never truncated) */}
          <div className="flex items-center gap-1.5">
            <FileDigit size={14} className="text-slate-500 shrink-0" />
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider shrink-0">
              Page Number:
            </label>
            <select
              className={`${selectStyle} min-w-[135px]`}
              value={currentPageNumbering}
              onChange={(e) => onUpdate({ pageNumbering: e.target.value as any })}
              title="Control page numbering in footer"
            >
              <option value="no">No</option>
              <option value="all">All pages</option>
              <option value="first">First page only</option>
              <option value="last">Last page only</option>
            </select>
          </div>
          {/* 6. Page Number Style */}
          <div className="flex items-center gap-1.5">
            <FileDigit size={14} className="text-slate-500 shrink-0" />
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider shrink-0">
              Page Number Style:
            </label>
            <select
              className={`${selectStyle} min-w-[135px]`}
              value={resume.pageNumberStyle || 'full'}
              onChange={(e) => onUpdate({ pageNumberStyle: e.target.value as any })}
              title="Select page number style"
            >
              <option value="plain">Plain</option>
              <option value="prefixed">Prefixed</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        {/* Change template gallery shortcut */}
        {onChangeTemplate && (
          <button
            type="button"
            onClick={onChangeTemplate}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline shrink-0 ml-auto"
          >
            Browse All Templates →
          </button>
        )}
      </div>
    </div>
  );
};

export default PdfCustomizationToolbar;
