import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  Search,
  Sparkles,
  CheckSquare,
  Square,
  ChevronUp,
  ChevronDown,
  Briefcase,
  Check,
} from 'lucide-react';
import type { SkillEntry } from '../resumeApi';
import {
  UNIVERSAL_SKILLS_LIBRARY,
  TARGET_JOB_RECOMMENDED_SKILLS,
  getRecommendedSkillsForRole,
  searchSkills,
} from '../config/skillsData';

interface UniversalSkillsEditorProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
  targetRole?: string;
  onTargetRoleChange?: (role: string) => void;
}

const PRESET_TARGET_JOBS = [
  'Dairy Production Worker',
  'Cleaner / Housekeeper',
  'Driver',
  'Construction Worker',
  'Warehouse Worker',
  'Kitchen Helper',
  'Waiter / Restaurant Worker',
  'Security Guard',
  'Factory Worker',
  'Farm / Agriculture Worker',
  'Electrician',
  'Plumber',
  'Welder',
  'Data Entry Operator',
  'Software Developer',
];

export const UniversalSkillsEditor: React.FC<UniversalSkillsEditorProps> = ({
  skills,
  onChange,
  targetRole = 'Dairy Production Worker',
  onTargetRoleChange,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(targetRole || 'Dairy Production Worker');
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<string>>(new Set());
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [draft, setDraft] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync role if prop updates
  useEffect(() => {
    if (targetRole && targetRole !== selectedRole) {
      setSelectedRole(targetRole);
    }
  }, [targetRole]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const existingNamesLower = new Set(
    skills.map((s) => (typeof s === 'string' ? s : s.name || '').trim().toLowerCase())
  );

  // Get recommendations for selected target job
  const { roleTitle, skills: recommendedList } = getRecommendedSkillsForRole(selectedRole);

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setCheckedSuggestions(new Set());
    if (onTargetRoleChange) {
      onTargetRoleChange(newRole);
    }
  };

  const toggleCheckSuggestion = (skillName: string) => {
    const next = new Set(checkedSuggestions);
    if (next.has(skillName)) {
      next.delete(skillName);
    } else {
      next.add(skillName);
    }
    setCheckedSuggestions(next);
  };

  const addSelectedRecommendations = () => {
    const toAdd: SkillEntry[] = [];
    checkedSuggestions.forEach((skillName) => {
      if (!existingNamesLower.has(skillName.toLowerCase())) {
        toAdd.push({
          name: skillName,
          category: 'Other',
          level: 'Intermediate',
        });
      }
    });
    if (toAdd.length > 0) {
      onChange([...skills, ...toAdd]);
    }
    setCheckedSuggestions(new Set());
  };

  const addSingleSkill = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    if (existingNamesLower.has(trimmed.toLowerCase())) {
      setCustomSkillInput('');
      setDraft('');
      return;
    }
    const newEntry: SkillEntry = {
      name: trimmed,
      category: 'Other',
      level: 'Intermediate',
    };
    onChange([...skills, newEntry]);
    setCustomSkillInput('');
    setDraft('');
    setIsSearchOpen(false);
  };

  const removeSkillAt = (idx: number) => {
    const next = skills.filter((_, i) => i !== idx);
    onChange(next);
  };

  const moveSkill = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= skills.length) return;
    const next = [...skills];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    onChange(next);
  };

  const filteredSuggestions = searchSkills(draft, 15).filter(
    (item) => !existingNamesLower.has(item.toLowerCase())
  );

  // Identify best-matching preset job for dropdown
  const matchedPreset = PRESET_TARGET_JOBS.find((job) => {
    const sLow = selectedRole.toLowerCase();
    if (sLow.includes('dairy') || sLow.includes('milk')) return job === 'Dairy Production Worker';
    if (sLow.includes('clean') || sLow.includes('housekeep') || sLow.includes('maid')) return job === 'Cleaner / Housekeeper';
    if (sLow.includes('driver') || sLow.includes('driving')) return job === 'Driver';
    if (sLow.includes('construct') || sLow.includes('mason') || sLow.includes('brick')) return job === 'Construction Worker';
    if (sLow.includes('warehouse') || sLow.includes('handler') || sLow.includes('stock')) return job === 'Warehouse Worker';
    if (sLow.includes('kitchen') || sLow.includes('cook') || sLow.includes('chef')) return job === 'Kitchen Helper';
    if (sLow.includes('waiter') || sLow.includes('restaurant') || sLow.includes('server')) return job === 'Waiter / Restaurant Worker';
    if (sLow.includes('security') || sLow.includes('guard')) return job === 'Security Guard';
    if (sLow.includes('factory') || sLow.includes('assembly') || sLow.includes('machine')) return job === 'Factory Worker';
    if (sLow.includes('farm') || sLow.includes('agri') || sLow.includes('crop')) return job === 'Farm / Agriculture Worker';
    if (sLow.includes('electric')) return job === 'Electrician';
    if (sLow.includes('plumb')) return job === 'Plumber';
    if (sLow.includes('weld')) return job === 'Welder';
    if (sLow.includes('data entry') || sLow.includes('clerk') || sLow.includes('typing')) return job === 'Data Entry Operator';
    if (sLow.includes('software') || sLow.includes('developer') || sLow.includes('engineer')) return job === 'Software Developer';
    return job.toLowerCase() === sLow;
  });

  return (
    <div ref={containerRef} className="space-y-4">
      {/* ── PART 1: TARGET JOB SELECTOR ── */}
      <div className="rounded-xl border border-orange-200/80 bg-orange-50/30 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Briefcase size={13} className="text-orange-500" />
            TARGET JOB
          </label>
          <span className="text-[10.5px] text-slate-500">
            Recommended skills update for this trade
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-64">
            <select
              value={matchedPreset || 'Custom'}
              onChange={(e) => {
                if (e.target.value !== 'Custom') {
                  handleRoleChange(e.target.value);
                }
              }}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 py-2 text-xs font-semibold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 shadow-2xs cursor-pointer"
            >
              {PRESET_TARGET_JOBS.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
              {!matchedPreset && (
                <option value="Custom">Custom: {selectedRole}</option>
              )}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <input
            type="text"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200"
            placeholder="Or type custom job title (e.g. Dairy Product, Driver)..."
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
          />
        </div>

        {/* ── RECOMMENDED SKILLS LIST WITH CHECKBOXES ── */}
        <div className="pt-2 border-t border-orange-200/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              RECOMMENDED SKILLS FOR {roleTitle.toUpperCase()}
            </span>
            {checkedSuggestions.size > 0 && (
              <button
                type="button"
                onClick={addSelectedRecommendations}
                className="flex items-center gap-1 rounded-md bg-orange-600 px-3 py-1 text-xs font-bold text-white hover:bg-orange-700 shadow-xs transition"
              >
                <Plus size={13} /> Add Selected Skills ({checkedSuggestions.size})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 bg-white/70 rounded-lg border border-slate-200/80">
            {recommendedList.map((skill) => {
              const alreadyAdded = existingNamesLower.has(skill.toLowerCase());
              const isChecked = checkedSuggestions.has(skill);

              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    if (!alreadyAdded) {
                      toggleCheckSuggestion(skill);
                    }
                  }}
                  disabled={alreadyAdded}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition ${
                    alreadyAdded
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isChecked
                      ? 'bg-orange-100 text-orange-900 font-semibold border border-orange-300'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  {alreadyAdded ? (
                    <Check size={13} className="text-emerald-600 shrink-0" />
                  ) : isChecked ? (
                    <CheckSquare size={13} className="text-orange-600 shrink-0" />
                  ) : (
                    <Square size={13} className="text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{skill}</span>
                  {alreadyAdded && (
                    <span className="ml-auto text-[9.5px] text-emerald-600 font-medium shrink-0">
                      Added
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {checkedSuggestions.size > 0 && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={addSelectedRecommendations}
                className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-600 shadow-xs transition"
              >
                <Plus size={14} /> Add Selected Skills ({checkedSuggestions.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── PART 3: CUSTOM / SELF-ADDED SKILLS ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Plus size={13} className="text-orange-500" />
          Add Your Own Skill
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 transition"
            placeholder="Enter your skill (e.g. Milk Quality Inspection, Chemical Safety)..."
            value={customSkillInput}
            onChange={(e) => setCustomSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSingleSkill(customSkillInput);
              }
            }}
          />
          <button
            type="button"
            onClick={() => addSingleSkill(customSkillInput)}
            disabled={!customSkillInput.trim()}
            className="flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 shadow-2xs"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* ── MY SELECTED SKILLS (WITH ADD, REMOVE, AND REORDER) ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            MY SELECTED SKILLS ({skills.length})
          </label>
          <span className="text-[10px] text-slate-400">
            Use arrows to reorder • (x) to remove
          </span>
        </div>

        {skills.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2 text-center bg-white rounded-lg border border-dashed border-slate-200">
            No skills added yet. Select from recommended skills above or add your own.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, idx) => {
              const name = typeof s === 'string' ? s : s.name;
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-2.5 pr-1.5 py-1 text-xs font-medium text-slate-800 shadow-2xs group hover:border-slate-300 transition"
                >
                  <span className="font-semibold text-slate-900">{name}</span>

                  {/* Reorder controls */}
                  <div className="flex items-center border-l border-slate-200 pl-1 ml-1 gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSkill(idx, 'up')}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition"
                      title="Move skill left/up"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === skills.length - 1}
                      onClick={() => moveSkill(idx, 'down')}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition"
                      title="Move skill right/down"
                    >
                      <ChevronDown size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSkillAt(idx)}
                      className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition ml-0.5"
                      title={`Remove ${name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SEARCH & BROWSE LIBRARY (COMPLEMENTARY ACCORDION) ── */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="relative">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-orange-500 focus:outline-none"
              placeholder="Search complete skills library..."
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
            />
          </div>

          {isSearchOpen && draft.trim().length > 0 && (
            <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => addSingleSkill(item)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 transition"
                  >
                    <span>{item}</span>
                    <Plus size={12} className="text-slate-400" />
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => addSingleSkill(draft)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs font-semibold text-orange-600 hover:bg-orange-50 transition"
                >
                  <span>Add "{draft.trim()}"</span>
                  <Plus size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick trade chips */}
        <div className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-500">
          <Sparkles size={11} className="text-orange-500" />
          <span>Quick trade groups:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.keys(UNIVERSAL_SKILLS_LIBRARY).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
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
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>{activeCategory} Library:</span>
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
                    onClick={() => addSingleSkill(item)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] text-slate-700 hover:border-orange-400 hover:text-orange-600 transition"
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

export default UniversalSkillsEditor;
