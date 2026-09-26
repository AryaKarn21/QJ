import React from 'react';
import { Plus, Trash2, HelpCircle, ChevronDown } from 'lucide-react';
import { CefrLanguageLevel } from '../config/countryCVConfigs/types';
import { LANGUAGES_LIST } from '../config/skillsAndLanguagesData';
import { LanguageSelect } from './LanguageSelect';

interface CefrLanguageEditorProps {
  motherTongue?: string;
  onMotherTongueChange: (value: string) => void;
  cefrLanguages?: CefrLanguageLevel[];
  onCefrLanguagesChange: (languages: CefrLanguageLevel[]) => void;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const CefrLanguageEditor: React.FC<CefrLanguageEditorProps> = ({
  motherTongue = '',
  onMotherTongueChange,
  cefrLanguages = [],
  onCefrLanguagesChange,
}) => {
  const addLanguage = () => {
    const newEntry: CefrLanguageLevel = {
      language: '',
      listening: 'B2',
      reading: 'B2',
      spokenInteraction: 'B2',
      spokenProduction: 'B2',
      writing: 'B2',
    };
    onCefrLanguagesChange([...cefrLanguages, newEntry]);
  };

  const updateLanguage = (index: number, patch: Partial<CefrLanguageLevel>) => {
    const updated = [...cefrLanguages];
    updated[index] = { ...updated[index], ...patch };
    onCefrLanguagesChange(updated);
  };

  const removeLanguage = (index: number) => {
    onCefrLanguagesChange(cefrLanguages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Mother Tongue Dropdown */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Mother Tongue(s)
        </label>
        <LanguageSelect
          value={motherTongue}
          onChange={onMotherTongueChange}
          options={LANGUAGES_LIST}
          placeholder="Select Mother Tongue…"
        />
      </div>

      {/* CEFR Foreign Languages */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700">
              Other Languages (CEFR Framework)
            </span>
            <span
              title="A1/A2: Basic User • B1/B2: Independent User • C1/C2: Proficient User"
              className="text-slate-400 cursor-help"
            >
              <HelpCircle size={13} />
            </span>
          </div>
          <button
            type="button"
            onClick={addLanguage}
            className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors shadow-2xs"
          >
            <Plus size={12} /> Add Language
          </button>
        </div>

        {cefrLanguages.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No foreign languages added yet. Click "+ Add Language" to specify CEFR levels for listening, reading, speaking, and writing.
          </p>
        ) : (
          <div className="space-y-3">
            {cefrLanguages.map((entry, idx) => (
              <div
                key={idx}
                className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-3.5 space-y-3 shadow-2xs"
              >
                {/* Language Name Dropdown & Remove Button */}
                <div className="flex items-end justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Language Name
                    </label>
                    <LanguageSelect
                      value={entry.language}
                      onChange={(val) => updateLanguage(idx, { language: val })}
                      options={LANGUAGES_LIST}
                      placeholder="Select Language…"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLanguage(idx)}
                    title="Remove language"
                    className="h-9 w-9 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 border border-slate-200 bg-white transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* CEFR 5-Skill Matrix - 100% Mobile & Desktop Responsive */}
                <div>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    CEFR Proficiency Levels (A1 – C2)
                  </p>
                  <div className="grid grid-cols-5 gap-1 sm:gap-2">
                    {/* Listening */}
                    <div className="min-w-0">
                      <span
                        className="block text-[10px] sm:text-[11px] font-medium text-slate-600 text-center truncate mb-1"
                        title="Listening"
                      >
                        Listening
                      </span>
                      <div className="relative">
                        <select
                          className="w-full h-8 sm:h-9 appearance-none rounded-md sm:rounded-lg border border-slate-200 bg-white pl-1 pr-3 sm:pl-2 sm:pr-4 py-1 text-center font-bold text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 cursor-pointer transition shadow-2xs hover:border-slate-300"
                          value={entry.listening}
                          onChange={(e) =>
                            updateLanguage(idx, {
                              listening: e.target.value as CefrLanguageLevel['listening'],
                            })
                          }
                          title="Listening CEFR Level"
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl} className="font-normal text-left">
                              {lvl}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={11}
                          className="pointer-events-none absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Reading */}
                    <div className="min-w-0">
                      <span
                        className="block text-[10px] sm:text-[11px] font-medium text-slate-600 text-center truncate mb-1"
                        title="Reading"
                      >
                        Reading
                      </span>
                      <div className="relative">
                        <select
                          className="w-full h-8 sm:h-9 appearance-none rounded-md sm:rounded-lg border border-slate-200 bg-white pl-1 pr-3 sm:pl-2 sm:pr-4 py-1 text-center font-bold text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 cursor-pointer transition shadow-2xs hover:border-slate-300"
                          value={entry.reading}
                          onChange={(e) =>
                            updateLanguage(idx, {
                              reading: e.target.value as CefrLanguageLevel['reading'],
                            })
                          }
                          title="Reading CEFR Level"
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl} className="font-normal text-left">
                              {lvl}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={11}
                          className="pointer-events-none absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Spoken Interaction */}
                    <div className="min-w-0">
                      <span
                        className="block text-[10px] sm:text-[11px] font-medium text-slate-600 text-center truncate mb-1"
                        title="Spoken Interaction"
                      >
                        <span className="hidden min-[440px]:inline">Spoken </span>Inter.
                      </span>
                      <div className="relative">
                        <select
                          className="w-full h-8 sm:h-9 appearance-none rounded-md sm:rounded-lg border border-slate-200 bg-white pl-1 pr-3 sm:pl-2 sm:pr-4 py-1 text-center font-bold text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 cursor-pointer transition shadow-2xs hover:border-slate-300"
                          value={entry.spokenInteraction}
                          onChange={(e) =>
                            updateLanguage(idx, {
                              spokenInteraction: e.target.value as CefrLanguageLevel['spokenInteraction'],
                            })
                          }
                          title="Spoken Interaction CEFR Level"
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl} className="font-normal text-left">
                              {lvl}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={11}
                          className="pointer-events-none absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Spoken Production */}
                    <div className="min-w-0">
                      <span
                        className="block text-[10px] sm:text-[11px] font-medium text-slate-600 text-center truncate mb-1"
                        title="Spoken Production"
                      >
                        <span className="hidden min-[440px]:inline">Spoken </span>Prod.
                      </span>
                      <div className="relative">
                        <select
                          className="w-full h-8 sm:h-9 appearance-none rounded-md sm:rounded-lg border border-slate-200 bg-white pl-1 pr-3 sm:pl-2 sm:pr-4 py-1 text-center font-bold text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 cursor-pointer transition shadow-2xs hover:border-slate-300"
                          value={entry.spokenProduction}
                          onChange={(e) =>
                            updateLanguage(idx, {
                              spokenProduction: e.target.value as CefrLanguageLevel['spokenProduction'],
                            })
                          }
                          title="Spoken Production CEFR Level"
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl} className="font-normal text-left">
                              {lvl}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={11}
                          className="pointer-events-none absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Writing */}
                    <div className="min-w-0">
                      <span
                        className="block text-[10px] sm:text-[11px] font-medium text-slate-600 text-center truncate mb-1"
                        title="Writing"
                      >
                        Writing
                      </span>
                      <div className="relative">
                        <select
                          className="w-full h-8 sm:h-9 appearance-none rounded-md sm:rounded-lg border border-slate-200 bg-white pl-1 pr-3 sm:pl-2 sm:pr-4 py-1 text-center font-bold text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 cursor-pointer transition shadow-2xs hover:border-slate-300"
                          value={entry.writing}
                          onChange={(e) =>
                            updateLanguage(idx, {
                              writing: e.target.value as CefrLanguageLevel['writing'],
                            })
                          }
                          title="Writing CEFR Level"
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl} className="font-normal text-left">
                              {lvl}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={11}
                          className="pointer-events-none absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
