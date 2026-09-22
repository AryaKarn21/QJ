import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Search, Sparkles } from 'lucide-react';
import type { SkillEntry } from '../resumeApi';
import {
  UNIVERSAL_SKILLS_LIBRARY,
  searchSkills,
} from '../config/skillsData';

interface UniversalSkillsEditorProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
}

export const UniversalSkillsEditor: React.FC<UniversalSkillsEditorProps> = ({
  skills,
  onChange,
}) => {
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const existingNamesLower = new Set(
    skills.map((s) => (typeof s === 'string' ? s : s.name || '').trim().toLowerCase())
  );

  const filteredSuggestions = searchSkills(draft, 15).filter(
    (item) => !existingNamesLower.has(item.toLowerCase())
  );

  const addSkillName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNamesLower.has(trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    const newEntry: SkillEntry = {
      name: trimmed,
      category: 'Other',
      level: 'Intermediate',
    };
    onChange([...skills, newEntry]);
    setDraft('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeSkillAt = (idx: number) => {
    const next = skills.filter((_, i) => i !== idx);
    onChange(next);
  };

  const isCustomSkill =
    draft.trim() &&
    !filteredSuggestions.some(
      (s) => s.toLowerCase() === draft.trim().toLowerCase()
    ) &&
    !existingNamesLower.has(draft.trim().toLowerCase());

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Search / Input Field with + Add Skill */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 transition"
              placeholder="Select or enter a skill (e.g. Dairy Production, Driving, Cleaning)..."
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (draft.trim()) {
                    addSkillName(draft);
                  }
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => addSkillName(draft)}
            disabled={!draft.trim()}
            className="flex items-center gap-1 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 shadow-2xs"
          >
            <Plus size={14} /> Add Skill
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && (draft.trim().length > 0 || filteredSuggestions.length > 0) && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
            {isCustomSkill && (
              <button
                type="button"
                onClick={() => addSkillName(draft)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold text-orange-600 hover:bg-orange-50 transition"
              >
                <span>Add custom skill: "{draft.trim()}"</span>
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700">Custom</span>
              </button>
            )}

            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addSkillName(suggestion)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 transition"
                >
                  <span>{suggestion}</span>
                  <Plus size={12} className="text-slate-400" />
                </button>
              ))
            ) : !isCustomSkill ? (
              <p className="px-3 py-2 text-xs text-slate-400 italic">
                No matching suggestions. Type your custom skill and click Add.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Existing Skills Removable Chips */}
      {skills.length > 0 && (
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
            Added Skills ({skills.length}):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, idx) => {
              const name = typeof s === 'string' ? s : s.name;
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800"
                >
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => removeSkillAt(idx)}
                    className="ml-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 p-0.5 transition"
                    title={`Remove ${name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Suggestions by Role / Trade */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1.5">
          <Sparkles size={12} className="text-orange-500" />
          <span>Browse popular worker & professional skills:</span>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {Object.keys(UNIVERSAL_SKILLS_LIBRARY).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-[10.5px] px-2 py-0.5 rounded-full border transition ${
                activeCategory === cat
                  ? 'bg-orange-500 text-white border-orange-500 font-medium'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {activeCategory && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>{activeCategory} Suggestions:</span>
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {UNIVERSAL_SKILLS_LIBRARY[activeCategory]
                .filter((item) => !existingNamesLower.has(item.toLowerCase()))
                .map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => addSkillName(item)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:border-orange-400 hover:text-orange-600 transition"
                  >
                    <Plus size={10} />
                    {item}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
