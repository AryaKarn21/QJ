import React, { useState } from 'react';
import { Globe, Plus, Trash2, Clock, Car, FileText, Code2, Monitor, ChevronDown, Sliders } from 'lucide-react';
import { getCountryConfig, CountryCVInfo, ProfessionalMembership, SimpleLanguageItem, StructuredSkillItem, CefrLanguageLevel } from '../config/countryCVConfigs';
import { NationalitySelect } from './NationalitySelect';
import { PlaceOfBirthSelect } from './PlaceOfBirthSelect';
import { CascadingLocationSelect } from './CascadingLocationSelect';
import { GENDER_OPTIONS } from '../config/countryCVConfigs/nationalities';
import { isValidDateOfBirth } from '../config/countryCVConfigs/fieldValidation';
import {
  LANGUAGES_LIST,
  CEFR_LEVELS,
  DIGITAL_SKILLS_LIST,
  SOFTWARE_SKILLS_LIST,
  SKILL_PROFICIENCIES,
  DRIVING_LICENSE_TYPES,
} from '../config/skillsAndLanguagesData';
import { SUPPORTED_COUNTRIES_LIST } from '../config/locationData';

interface CountrySpecificFieldsEditorProps {
  countryCode: string;
  countryCVInfo?: CountryCVInfo;
  onChange: (patch: Partial<CountryCVInfo>) => void;
}

const fieldClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white';
const labelClass = 'mb-1 block text-xs font-semibold text-slate-700';

export const CountrySpecificFieldsEditor: React.FC<CountrySpecificFieldsEditorProps> = ({
  countryCode,
  countryCVInfo = {},
  onChange,
}) => {
  const config = getCountryConfig(countryCode);

  if (!config) return null;

  const isGulf = config.features.hasGulfFields;
  const isEuropean = config.features.hasCEFRGrid;

  const dobValidation = isValidDateOfBirth(countryCVInfo.dateOfBirth || '');
  const [expandedLanguageIdx, setExpandedLanguageIdx] = useState<number | null>(null);

  // ── Driving License Details ──
  const drivingDetails = countryCVInfo.drivingLicenseDetails || {
    licenseType: countryCVInfo.drivingLicense || '',
    country: countryCVInfo.country || '',
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
  };

  const updateDrivingDetails = (patch: Record<string, string>) => {
    const next = { ...drivingDetails, ...patch };
    onChange({
      drivingLicenseDetails: next,
      drivingLicense: next.licenseType,
    });
  };

  // ── Language Skills (Streamlined Language + CEFR Level) ──
  const languages: SimpleLanguageItem[] = countryCVInfo.simpleLanguages || [
    { language: 'English', cefrLevel: 'B2', level: 'B2' },
  ];

  const syncLanguages = (next: SimpleLanguageItem[], extraPatch: Record<string, any> = {}) => {
    const nextCefr = next.map((l) => {
      const lvl = l.cefrLevel || (l as any).level || 'B2';
      return {
        language: l.language,
        listening: lvl,
        reading: lvl,
        spokenProduction: lvl,
        spokenInteraction: lvl,
        writing: lvl,
      };
    });
    onChange({
      simpleLanguages: next,
      cefrLanguages: nextCefr,
      ...extraPatch,
    });
  };

  const addLanguage = () => {
    const available = LANGUAGES_LIST.find((l) => !languages.some((item) => item.language === l)) || 'English';
    const next = [...languages, { language: available, cefrLevel: 'A2', level: 'A2' }];
    syncLanguages(next);
  };

  const updateLanguage = (idx: number, patch: Partial<SimpleLanguageItem>) => {
    const next = [...languages];
    const updatedLevel = patch.cefrLevel || patch.level || next[idx].cefrLevel || (next[idx] as any).level || 'A2';
    next[idx] = { ...next[idx], ...patch, cefrLevel: updatedLevel, level: updatedLevel };
    syncLanguages(next);
  };

  const removeLanguage = (idx: number) => {
    const next = languages.filter((_, i) => i !== idx);
    if (expandedLanguageIdx === idx) setExpandedLanguageIdx(null);
    syncLanguages(next);
  };

  const updateCefrSkill = (
    idx: number,
    skill: 'listening' | 'reading' | 'spokenProduction' | 'spokenInteraction' | 'writing',
    level: string
  ) => {
    const currentList = countryCVInfo.cefrLanguages || [];
    const baseLang = languages[idx] || { language: 'English', cefrLevel: 'A2' };
    const baseEntry: CefrLanguageLevel = currentList[idx] || {
      language: baseLang.language,
      listening: (baseLang.cefrLevel as any) || 'A2',
      reading: (baseLang.cefrLevel as any) || 'A2',
      spokenProduction: (baseLang.cefrLevel as any) || 'A2',
      spokenInteraction: (baseLang.cefrLevel as any) || 'A2',
      writing: (baseLang.cefrLevel as any) || 'A2',
    };
    const updated = [...currentList];
    updated[idx] = { ...baseEntry, [skill]: level as any };
    onChange({ cefrLanguages: updated });
  };

  // ── Digital Skills (Dropdown + Proficiency) ──
  const digitalSkills: StructuredSkillItem[] = countryCVInfo.structuredDigitalSkills || [];

  const addDigitalSkill = () => {
    const available =
      DIGITAL_SKILLS_LIST.find((s) => !digitalSkills.some((item) => (item.name || item.skill) === s)) ||
      DIGITAL_SKILLS_LIST[0];
    const next = [...digitalSkills, { name: available, skill: available, proficiency: 'Advanced' }];
    onChange({
      structuredDigitalSkills: next,
      digitalSkills: next.map((d) => `${d.name || d.skill} (${d.proficiency})`),
    });
  };

  const updateDigitalSkill = (idx: number, patch: Partial<StructuredSkillItem>) => {
    const next = [...digitalSkills];
    const updated = { ...next[idx], ...patch };
    if (patch.name && !patch.skill) updated.skill = patch.name;
    if (patch.skill && !patch.name) updated.name = patch.skill;
    next[idx] = updated;
    onChange({
      structuredDigitalSkills: next,
      digitalSkills: next.map((d) => `${d.name || d.skill} (${d.proficiency})`),
    });
  };

  const removeDigitalSkill = (idx: number) => {
    const next = digitalSkills.filter((_, i) => i !== idx);
    onChange({
      structuredDigitalSkills: next,
      digitalSkills: next.map((d) => `${d.name || d.skill} (${d.proficiency})`),
    });
  };

  // ── Software Skills (Dropdown + Proficiency) ──
  const softwareSkills: StructuredSkillItem[] = countryCVInfo.structuredSoftwareSkills || [];

  const addSoftwareSkill = () => {
    const available =
      SOFTWARE_SKILLS_LIST.find((s) => !softwareSkills.some((item) => (item.name || item.skill) === s)) ||
      SOFTWARE_SKILLS_LIST[0];
    const next = [...softwareSkills, { name: available, skill: available, proficiency: 'Advanced' }];
    onChange({
      structuredSoftwareSkills: next,
      softwareSkills: next.map((s) => `${s.name || s.skill} (${s.proficiency})`),
    });
  };

  const updateSoftwareSkill = (idx: number, patch: Partial<StructuredSkillItem>) => {
    const next = [...softwareSkills];
    const updated = { ...next[idx], ...patch };
    if (patch.name && !patch.skill) updated.skill = patch.name;
    if (patch.skill && !patch.name) updated.name = patch.skill;
    next[idx] = updated;
    onChange({
      structuredSoftwareSkills: next,
      softwareSkills: next.map((s) => `${s.name || s.skill} (${s.proficiency})`),
    });
  };

  const removeSoftwareSkill = (idx: number) => {
    const next = softwareSkills.filter((_, i) => i !== idx);
    onChange({
      structuredSoftwareSkills: next,
      softwareSkills: next.map((s) => `${s.name || s.skill} (${s.proficiency})`),
    });
  };

  // ── Memberships (for Gulf/Qatar) ──
  const addMembership = () => {
    const current = countryCVInfo.memberships || [];
    onChange({
      memberships: [...current, { organization: '', membershipType: 'Member', year: '' }],
    });
  };

  const updateMembership = (idx: number, patch: Partial<ProfessionalMembership>) => {
    const current = [...(countryCVInfo.memberships || [])];
    current[idx] = { ...current[idx], ...patch };
    onChange({ memberships: current });
  };

  const removeMembership = (idx: number) => {
    const current = countryCVInfo.memberships || [];
    onChange({ memberships: current.filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/20 p-4 sm:p-5 space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-orange-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" role="img" aria-label={config.countryName}>
            {config.flag}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {config.countryName} CV Specifics & Required Details
            </h3>
            <p className="text-[11px] text-slate-500">
              {config.disclaimer} • Complete every field marked with{' '}
              <span className="text-red-500 font-bold">*</span>.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
          {config.badge}
        </span>
      </div>

      {/* 1. PERSONAL INFORMATION */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Globe size={13} className="text-orange-500" />
          Personal Information
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Passport Number * */}
          <div>
            <label className={labelClass}>
              Passport Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={fieldClass}
              placeholder="e.g. PA4439019"
              value={countryCVInfo.passportNumber || ''}
              onChange={(e) => onChange({ passportNumber: e.target.value })}
            />
          </div>

          {/* Date of Birth * */}
          <div>
            <label className={labelClass}>
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={`${fieldClass} ${
                countryCVInfo.dateOfBirth && !dobValidation.valid ? 'border-red-400 bg-red-50/30' : ''
              }`}
              placeholder="DD/MM/YYYY (e.g. 29/05/1994)"
              value={countryCVInfo.dateOfBirth || ''}
              onChange={(e) => onChange({ dateOfBirth: e.target.value })}
            />
            {countryCVInfo.dateOfBirth && !dobValidation.valid ? (
              <span className="text-[10.5px] text-red-600 font-medium mt-0.5 block">
                {dobValidation.message}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 mt-0.5 block">Format: DD/MM/YYYY</span>
            )}
          </div>

          {/* Place of Birth * */}
          <div>
            <label className={labelClass}>
              Place of Birth <span className="text-red-500">*</span>
            </label>
            <PlaceOfBirthSelect
              value={countryCVInfo.placeOfBirth || ''}
              onChange={(val) => onChange({ placeOfBirth: val })}
              placeholder="Select or type Place of Birth…"
              required
            />
          </div>

          {/* Nationality * */}
          <div>
            <label className={labelClass}>
              Nationality <span className="text-red-500">*</span>
            </label>
            <NationalitySelect
              value={countryCVInfo.nationality || ''}
              onChange={(val) => onChange({ nationality: val })}
              placeholder="Select Nationality…"
              required
            />
          </div>

          {/* Gender * */}
          <div>
            <label className={labelClass}>
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              className={fieldClass}
              value={countryCVInfo.gender || ''}
              onChange={(e) => onChange({ gender: e.target.value })}
              required
            >
              <option value="">Select Gender…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Street / Work Address */}
          <div>
            <label className={labelClass}>Street / Work Address</label>
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. Str. Victoriei nr. 12 / Qatar (Work)"
              value={countryCVInfo.address || ''}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </div>
        </div>

        {/* Cascading Country → City → Postal Code */}
        <div className="pt-2">
          <CascadingLocationSelect
            country={countryCVInfo.country || ''}
            city={countryCVInfo.city || ''}
            postalCode={countryCVInfo.postalCode || ''}
            onLocationChange={(patch) => onChange(patch)}
          />
        </div>
      </div>

      {/* 2. DRIVING LICENSE */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Car size={16} className="text-orange-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            DRIVING LICENSE
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* License Type */}
          <div>
            <label className={labelClass}>License Category / Type</label>
            <select
              className={fieldClass}
              value={drivingDetails.licenseType || ''}
              onChange={(e) => updateDrivingDetails({ licenseType: e.target.value })}
            >
              <option value="">Select License Type…</option>
              {DRIVING_LICENSE_TYPES.map((lt) => (
                <option key={lt} value={lt}>
                  {lt}
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className={labelClass}>Issuing Country</label>
            <select
              className={fieldClass}
              value={drivingDetails.country || ''}
              onChange={(e) => updateDrivingDetails({ country: e.target.value })}
            >
              <option value="">Select Country…</option>
              {SUPPORTED_COUNTRIES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* License Number */}
          <div>
            <label className={labelClass}>License Number</label>
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. 29452441140"
              value={drivingDetails.licenseNumber || ''}
              onChange={(e) => updateDrivingDetails({ licenseNumber: e.target.value })}
            />
          </div>

          {/* Issue Date */}
          <div>
            <label className={labelClass}>Issue Date</label>
            <input
              type="text"
              className={fieldClass}
              placeholder="DD/MM/YYYY (e.g. 15/08/2020)"
              value={drivingDetails.issueDate || ''}
              onChange={(e) => updateDrivingDetails({ issueDate: e.target.value })}
            />
          </div>

          {/* Expiry Date */}
          <div className="sm:col-span-2">
            <label className={labelClass}>Expiry Date</label>
            <input
              type="text"
              className={fieldClass}
              placeholder="DD/MM/YYYY (e.g. 17/08/2027)"
              value={drivingDetails.expiryDate || ''}
              onChange={(e) => updateDrivingDetails({ expiryDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* 3. LANGUAGE SKILLS (STREAMLINED LANGUAGE + CEFR DROPDOWN ONLY) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-orange-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              LANGUAGE SKILLS
            </h4>
          </div>
          <button
            type="button"
            onClick={addLanguage}
            className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
          >
            <Plus size={12} /> Add Language
          </button>
        </div>

        <div className="space-y-3 pt-1">
          {/* Mother Tongue Dropdown */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Mother tongue(s) <span className="text-red-500">*</span>
            </label>
            <select
              className={fieldClass}
              value={countryCVInfo.motherTongue || ''}
              onChange={(e) => onChange({ motherTongue: e.target.value })}
              required
            >
              <option value="">Select Mother Tongue…</option>
              {countryCVInfo.motherTongue && !LANGUAGES_LIST.includes(countryCVInfo.motherTongue) && (
                <option value={countryCVInfo.motherTongue}>
                  {countryCVInfo.motherTongue}
                </option>
              )}
              {LANGUAGES_LIST.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            Other Languages & CEFR Proficiency Matrix (Listening, Reading, Spoken production, Spoken interaction, Writing):
          </p>

          {languages.map((item, idx) => {
            const cefrEntry = countryCVInfo.cefrLanguages?.[idx] || {
              listening: item.cefrLevel || 'A2',
              reading: item.cefrLevel || 'A2',
              spokenProduction: item.cefrLevel || 'A2',
              spokenInteraction: item.cefrLevel || 'A2',
              writing: item.cefrLevel || 'A2',
            };
            const isCustomizing = expandedLanguageIdx === idx;

            return (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5 transition"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">
                      Language <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={fieldClass}
                      value={item.language}
                      onChange={(e) => updateLanguage(idx, { language: e.target.value })}
                      required
                    >
                      <option value="">Select Language…</option>
                      {LANGUAGES_LIST.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">
                      Overall Level *
                    </label>
                    <select
                      className={fieldClass}
                      value={item.cefrLevel}
                      onChange={(e) => updateLanguage(idx, { cefrLevel: e.target.value as any })}
                      required
                    >
                      <option value="">Select Level…</option>
                      {CEFR_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="self-end flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedLanguageIdx(isCustomizing ? null : idx)}
                      className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-2 rounded-lg border transition ${
                        isCustomizing
                          ? 'border-orange-300 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Fine-tune Listening, Reading, Speaking & Writing"
                    >
                      <Sliders size={12} />
                      <span className="hidden sm:inline">5 Skills</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-150 ${isCustomizing ? 'rotate-180 text-orange-500' : ''}`}
                      />
                    </button>

                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(idx)}
                        className="rounded-lg p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Remove Language"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional Expandable 5-Skill Matrix */}
                {isCustomizing && (
                  <div className="pt-2 border-t border-slate-200/80 bg-white p-3 rounded-lg border shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      <span>Europass 5-Skill Matrix for {item.language || 'Language'}</span>
                      <span className="text-[10px] font-normal lowercase text-slate-400">
                        (Listening, Reading, Spoken prod., Spoken int., Writing)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">Listening</span>
                        <select
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold bg-white"
                          value={cefrEntry.listening || item.cefrLevel || 'A2'}
                          onChange={(e) => updateCefrSkill(idx, 'listening', e.target.value)}
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">Reading</span>
                        <select
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold bg-white"
                          value={cefrEntry.reading || item.cefrLevel || 'A2'}
                          onChange={(e) => updateCefrSkill(idx, 'reading', e.target.value)}
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">Spoken Prod.</span>
                        <select
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold bg-white"
                          value={cefrEntry.spokenProduction || item.cefrLevel || 'A2'}
                          onChange={(e) => updateCefrSkill(idx, 'spokenProduction', e.target.value)}
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">Spoken Inter.</span>
                        <select
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold bg-white"
                          value={cefrEntry.spokenInteraction || item.cefrLevel || 'A2'}
                          onChange={(e) => updateCefrSkill(idx, 'spokenInteraction', e.target.value)}
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-500 mb-0.5">Writing</span>
                        <select
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold bg-white"
                          value={cefrEntry.writing || item.cefrLevel || 'A2'}
                          onChange={(e) => updateCefrSkill(idx, 'writing', e.target.value)}
                        >
                          {CEFR_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* 6. Gulf Recruiter Status (If Qatar) */}
      {isGulf && (
        <div className="space-y-3 pt-3 border-t border-orange-200/70">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Clock size={13} className="text-orange-500" />
            Gulf Recruiter Snapshot & Availability
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Current Location</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="e.g. Doha, Qatar / Dubai, UAE / Outside GCC"
                value={countryCVInfo.currentLocation || ''}
                onChange={(e) => onChange({ currentLocation: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Notice Period</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="e.g. Immediately available / 1 Month / 60 Days"
                value={countryCVInfo.noticePeriod || ''}
                onChange={(e) => onChange({ noticePeriod: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Earliest Start Date / Availability</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="e.g. Immediately / Upon NOC / 1st of next month"
                value={countryCVInfo.availability || ''}
                onChange={(e) => onChange({ availability: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Visa / Work Status</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="e.g. Transferable Visa with NOC / Resident / Citizen"
                value={countryCVInfo.visaStatus || ''}
                onChange={(e) => onChange({ visaStatus: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. DECLARATION */}
      <div className="pt-2 border-t border-orange-200/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-orange-500" />
          <label className={labelClass}>Declaration Statement</label>
        </div>
        <textarea
          rows={2}
          className={fieldClass}
          value={
            countryCVInfo.declaration !== undefined
              ? countryCVInfo.declaration
              : 'I HEREBY DECLARE THAT THE INFORMATION GIVEN IN THIS CV IS TRUE AND HONEST TO MY KNOWLEDGE AND BELIEF.'
          }
          onChange={(e) => onChange({ declaration: e.target.value })}
        />
      </div>

      {/* 8. Professional Memberships (for Qatar) */}
      {config.features.hasMemberships && (
        <div className="pt-2 border-t border-orange-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Professional Memberships
            </h4>
            <button
              type="button"
              onClick={addMembership}
              className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
            >
              <Plus size={12} /> Add Membership
            </button>
          </div>

          {(countryCVInfo.memberships || []).map((m, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
            >
              <input
                type="text"
                className={`${fieldClass} flex-2`}
                placeholder="Organization (e.g. Project Management Institute)"
                value={m.organization}
                onChange={(e) => updateMembership(idx, { organization: e.target.value })}
              />
              <input
                type="text"
                className={`${fieldClass} flex-1`}
                placeholder="Type (e.g. Member / Fellow)"
                value={m.membershipType}
                onChange={(e) => updateMembership(idx, { membershipType: e.target.value })}
              />
              <input
                type="text"
                className={`${fieldClass} w-24`}
                placeholder="Year (e.g. 2021)"
                value={m.year}
                onChange={(e) => updateMembership(idx, { year: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeMembership(idx)}
                className="text-slate-400 hover:text-red-500 p-1"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
