import React from 'react';
import { Plus, Trash2, Globe, HelpCircle } from 'lucide-react';
import { CefrLanguageLevel } from '../config/countryCVConfigs/types';
import { LANGUAGES_LIST } from '../config/skillsAndLanguagesData';

interface CefrLanguageEditorProps {
  motherTongue?: string;
  onMotherTongueChange: (value: string) => void;
  cefrLanguages?: CefrLanguageLevel[];
  onCefrLanguagesChange: (languages: CefrLanguageLevel[]) => void;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const fieldClass =
  'w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200';
const selectClass =
  'w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white';

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
      {/* Mother Tongue */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Mother Tongue(s)
        </label>
        <select
          className={selectClass}
          value={motherTongue}
          onChange={(e) => onMotherTongueChange(e.target.value)}
        >
          <option value="">Select Mother Tongue…</option>
          {motherTongue && !LANGUAGES_LIST.includes(motherTongue) && (
            <option value={motherTongue}>{motherTongue}</option>
          )}
          {LANGUAGES_LIST.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {/* CEFR Foreign Languages */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700">Other Languages (CEFR Framework)</span>
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
            className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors"
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
                className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Language Name
                    </label>
                    <input
                      type="text"
                      className={fieldClass}
                      placeholder="e.g. English, German, French, Italian"
                      value={entry.language}
                      onChange={(e) => updateLanguage(idx, { language: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLanguage(idx)}
                    title="Remove language"
                    className="mt-5 text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* CEFR 5-Skill Matrix */}
                <div>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    CEFR Proficiency Levels (A1 – C2)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <span className="block text-[10.5px] text-slate-500 mb-0.5">Listening</span>
                      <select
                        className={selectClass}
                        value={entry.listening}
                        onChange={(e) =>
                          updateLanguage(idx, { listening: e.target.value as CefrLanguageLevel['listening'] })
                        }
                      >
                        {CEFR_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="block text-[10.5px] text-slate-500 mb-0.5">Reading</span>
                      <select
                        className={selectClass}
                        value={entry.reading}
                        onChange={(e) =>
                          updateLanguage(idx, { reading: e.target.value as CefrLanguageLevel['reading'] })
                        }
                      >
                        {CEFR_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="block text-[10.5px] text-slate-500 mb-0.5">Spoken Inter.</span>
                      <select
                        className={selectClass}
                        value={entry.spokenInteraction}
                        onChange={(e) =>
                          updateLanguage(idx, {
                            spokenInteraction: e.target.value as CefrLanguageLevel['spokenInteraction'],
                          })
                        }
                      >
                        {CEFR_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="block text-[10.5px] text-slate-500 mb-0.5">Spoken Prod.</span>
                      <select
                        className={selectClass}
                        value={entry.spokenProduction}
                        onChange={(e) =>
                          updateLanguage(idx, {
                            spokenProduction: e.target.value as CefrLanguageLevel['spokenProduction'],
                          })
                        }
                      >
                        {CEFR_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="block text-[10.5px] text-slate-500 mb-0.5">Writing</span>
                      <select
                        className={selectClass}
                        value={entry.writing}
                        onChange={(e) =>
                          updateLanguage(idx, { writing: e.target.value as CefrLanguageLevel['writing'] })
                        }
                      >
                        {CEFR_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
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
