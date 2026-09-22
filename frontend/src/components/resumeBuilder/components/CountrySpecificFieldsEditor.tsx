import React, { useState } from 'react';
import { Globe, Plus, Trash2, Clock, Car, FileText, Code2, Monitor } from 'lucide-react';
import { getCountryConfig, CountryCVInfo, ProfessionalMembership, SimpleLanguageItem, StructuredSkillItem } from '../config/countryCVConfigs';
import { NationalitySelect } from './NationalitySelect';
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
  // Initialize with mother tongue or default if empty
  const languages: SimpleLanguageItem[] = countryCVInfo.simpleLanguages || [
    { language: countryCVInfo.motherTongue || 'English', cefrLevel: 'B2' },
  ];

  const addLanguage = () => {
    const available = LANGUAGES_LIST.find((l) => !languages.some((item) => item.language === l)) || 'English';
    const next = [...languages, { language: available, cefrLevel: 'B1' }];
    onChange({
      simpleLanguages: next,
      motherTongue: next[0]?.language || countryCVInfo.motherTongue,
    });
  };

  const updateLanguage = (idx: number, patch: Partial<SimpleLanguageItem>) => {
    const next = [...languages];
    next[idx] = { ...next[idx], ...patch };
    onChange({
      simpleLanguages: next,
      motherTongue: next[0]?.language || countryCVInfo.motherTongue,
    });
  };

  const removeLanguage = (idx: number) => {
    const next = languages.filter((_, i) => i !== idx);
    onChange({
      simpleLanguages: next,
      motherTongue: next[0]?.language || '',
    });
  };

  // ── Digital Skills (Dropdown + Proficiency) ──
  const digitalSkills: StructuredSkillItem[] = countryCVInfo.structuredDigitalSkills || [];

  const addDigitalSkill = () => {
    const available =
      DIGITAL_SKILLS_LIST.find((s) => !digitalSkills.some((item) => item.name === s)) ||
      DIGITAL_SKILLS_LIST[0];
    const next = [...digitalSkills, { name: available, proficiency: 'Advanced' }];
    onChange({
      structuredDigitalSkills: next,
      digitalSkills: next.map((d) => `${d.name} (${d.proficiency})`),
    });
  };

  const updateDigitalSkill = (idx: number, patch: Partial<StructuredSkillItem>) => {
    const next = [...digitalSkills];
    next[idx] = { ...next[idx], ...patch };
    onChange({
      structuredDigitalSkills: next,
      digitalSkills: next.map((d) => `${d.name} (${d.proficiency})`),
    });
  };

  const removeDigitalSkill = (idx: number) => {
    const next = digitalSkills.filter((_, i) => i !== idx);
    onChange({
      structuredDigitalSkills: next,
      digitalSkills: next.map((d) => `${d.name} (${d.proficiency})`),
    });
  };

  // ── Software Skills (Dropdown + Proficiency) ──
  const softwareSkills: StructuredSkillItem[] = countryCVInfo.structuredSoftwareSkills || [];

  const addSoftwareSkill = () => {
    const available =
      SOFTWARE_SKILLS_LIST.find((s) => !softwareSkills.some((item) => item.name === s)) ||
      SOFTWARE_SKILLS_LIST[0];
    const next = [...softwareSkills, { name: available, proficiency: 'Advanced' }];
    onChange({ structuredSoftwareSkills: next });
  };

  const updateSoftwareSkill = (idx: number, patch: Partial<StructuredSkillItem>) => {
    const next = [...softwareSkills];
    next[idx] = { ...next[idx], ...patch };
    onChange({ structuredSoftwareSkills: next });
  };

  const removeSoftwareSkill = (idx: number) => {
    const next = softwareSkills.filter((_, i) => i !== idx);
    onChange({ structuredSoftwareSkills: next });
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
            <input
              type="text"
              required
              className={fieldClass}
              placeholder="e.g. BARDIYA, Nepal / Bucharest, Romania"
              value={countryCVInfo.placeOfBirth || ''}
              onChange={(e) => onChange({ placeOfBirth: e.target.value })}
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

          {/* Street / Work Address * */}
          <div>
            <label className={labelClass}>
              Street / Work Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
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
            onCountryChange={(val) => onChange({ country: val })}
            onCityChange={(val) => onChange({ city: val })}
            onPostalCodeChange={(val) => onChange({ postalCode: val })}
          />
        </div>
      </div>

      {/* 2. DRIVING LICENSE (REQUIRED) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Car size={16} className="text-orange-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            DRIVING LICENSE
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* License Type * */}
          <div>
            <label className={labelClass}>
              License Type <span className="text-red-500">*</span>
            </label>
            <select
              className={fieldClass}
              value={drivingDetails.licenseType || ''}
              onChange={(e) => updateDrivingDetails({ licenseType: e.target.value })}
              required
            >
              <option value="">Select License Type…</option>
              {DRIVING_LICENSE_TYPES.map((lt) => (
                <option key={lt} value={lt}>
                  {lt}
                </option>
              ))}
            </select>
          </div>

          {/* Country * */}
          <div>
            <label className={labelClass}>
              Issuing Country <span className="text-red-500">*</span>
            </label>
            <select
              className={fieldClass}
              value={drivingDetails.country || ''}
              onChange={(e) => updateDrivingDetails({ country: e.target.value })}
              required
            >
              <option value="">Select Country…</option>
              {SUPPORTED_COUNTRIES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* License Number * */}
          <div>
            <label className={labelClass}>
              License Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={fieldClass}
              placeholder="e.g. 29452441140"
              value={drivingDetails.licenseNumber || ''}
              onChange={(e) => updateDrivingDetails({ licenseNumber: e.target.value })}
            />
          </div>

          {/* Issue Date * */}
          <div>
            <label className={labelClass}>
              Issue Date <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={fieldClass}
              placeholder="DD/MM/YYYY (e.g. 15/08/2020)"
              value={drivingDetails.issueDate || ''}
              onChange={(e) => updateDrivingDetails({ issueDate: e.target.value })}
            />
          </div>

          {/* Expiry Date * */}
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
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

        <p className="text-[11px] text-slate-500">
          Select language and CEFR proficiency level (A1 to C2). The first language represents your mother tongue / primary language.
        </p>

        <div className="space-y-2 pt-1">
          {languages.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
            >
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">
                  Language {idx === 0 ? '(Primary / Mother Tongue)' : ''} *
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

              <div className="w-36">
                <label className="text-[10.5px] font-semibold text-slate-600 block mb-0.5">
                  CEFR Level *
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

              {languages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLanguage(idx)}
                  className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 mt-4"
                  title="Remove Language"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. DIGITAL SKILLS (DROPDOWN + PROFICIENCY) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-orange-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              DIGITAL SKILLS
            </h4>
          </div>
          <button
            type="button"
            onClick={addDigitalSkill}
            className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
          >
            <Plus size={12} /> Add Digital Skill
          </button>
        </div>

        <div className="space-y-2">
          {digitalSkills.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              Click "+ Add Digital Skill" to select digital competencies (e.g. Microsoft Office, Google Workspace).
            </p>
          ) : (
            digitalSkills.map((ds, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
              >
                <div className="flex-1 min-w-[150px]">
                  <select
                    className={fieldClass}
                    value={ds.name}
                    onChange={(e) => updateDigitalSkill(idx, { name: e.target.value })}
                    required
                  >
                    {DIGITAL_SKILLS_LIST.map((skill) => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-36">
                  <select
                    className={fieldClass}
                    value={ds.proficiency}
                    onChange={(e) => updateDigitalSkill(idx, { proficiency: e.target.value as any })}
                    required
                  >
                    {SKILL_PROFICIENCIES.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeDigitalSkill(idx)}
                  className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove Skill"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. SOFTWARE SKILLS (DROPDOWN + PROFICIENCY) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-orange-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              SOFTWARE SKILLS
            </h4>
          </div>
          <button
            type="button"
            onClick={addSoftwareSkill}
            className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
          >
            <Plus size={12} /> Add Software Skill
          </button>
        </div>

        <div className="space-y-2">
          {softwareSkills.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              Click "+ Add Software Skill" to add applications and platforms (e.g. Microsoft Excel, Photoshop, AutoCAD).
            </p>
          ) : (
            softwareSkills.map((ss, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
              >
                <div className="flex-1 min-w-[150px]">
                  <select
                    className={fieldClass}
                    value={ss.name}
                    onChange={(e) => updateSoftwareSkill(idx, { name: e.target.value })}
                    required
                  >
                    {SOFTWARE_SKILLS_LIST.map((soft) => (
                      <option key={soft} value={soft}>
                        {soft}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-36">
                  <select
                    className={fieldClass}
                    value={ss.proficiency}
                    onChange={(e) => updateSoftwareSkill(idx, { proficiency: e.target.value as any })}
                    required
                  >
                    {SKILL_PROFICIENCIES.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeSoftwareSkill(idx)}
                  className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove Software"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
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
