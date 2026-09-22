import React, { useState } from 'react';
import { Globe, Plus, Trash2, Shield, Calendar, Clock, MapPin, Award } from 'lucide-react';
import { getCountryConfig, CountryCVInfo, ProfessionalMembership } from '../config/countryCVConfigs';
import { CefrLanguageEditor } from './CefrLanguageEditor';

interface CountrySpecificFieldsEditorProps {
  countryCode: string;
  countryCVInfo?: CountryCVInfo;
  onChange: (patch: Partial<CountryCVInfo>) => void;
}

const fieldClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200';
const labelClass = 'mb-1 block text-xs font-medium text-slate-600';

export const CountrySpecificFieldsEditor: React.FC<CountrySpecificFieldsEditorProps> = ({
  countryCode,
  countryCVInfo = {},
  onChange,
}) => {
  const config = getCountryConfig(countryCode);
  const [digitalSkillDraft, setDigitalSkillDraft] = useState('');

  if (!config) return null;

  const isGulf = config.features.hasGulfFields;
  const isEuropean = config.features.hasCEFRGrid;

  const addDigitalSkill = () => {
    const val = digitalSkillDraft.trim();
    if (!val) return;
    const current = countryCVInfo.digitalSkills || [];
    if (!current.includes(val)) {
      onChange({ digitalSkills: [...current, val] });
    }
    setDigitalSkillDraft('');
  };

  const removeDigitalSkill = (skill: string) => {
    const current = countryCVInfo.digitalSkills || [];
    onChange({ digitalSkills: current.filter((s) => s !== skill) });
  };

  const addMembership = () => {
    const current = countryCVInfo.memberships || [];
    const newEntry: ProfessionalMembership = {
      organization: '',
      membershipType: 'Member',
      year: '',
    };
    onChange({ memberships: [...current, newEntry] });
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
    <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-4 sm:p-5 space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-orange-200/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label={config.countryName}>
            {config.flag}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {config.countryName} CV Fields
            </h3>
            <p className="text-[11px] text-slate-500">
              {config.disclaimer}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
          {config.badge}
        </span>
      </div>

      {/* Gulf / Qatar Specific Recruiter Snapshot */}
      {isGulf && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Clock size={13} className="text-orange-500" />
            Recruiter Availability & Candidate Status
          </h4>
          <p className="text-[11px] text-slate-500">
            Hiring managers in the Gulf prioritize candidate availability and status. All fields are optional.
          </p>

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
              <label className={labelClass}>
                Nationality <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                className={fieldClass}
                placeholder="e.g. Nepali, Indian, Filipino, British"
                value={countryCVInfo.nationality || ''}
                onChange={(e) => onChange({ nationality: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Visa / Work Status (Optional)</label>
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

      {/* European / Romanian / Bosnian Personal Details */}
      {isEuropean && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Globe size={13} className="text-orange-500" />
            European Personal Details
          </h4>
          <p className="text-[11px] text-slate-500">
            Nationality is mandatory for international and European CV applications. Date of birth and address are optional.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Nationality <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                className={fieldClass}
                placeholder="e.g. Romanian, Bosnian, Nepali"
                value={countryCVInfo.nationality || ''}
                onChange={(e) => onChange({ nationality: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Date of Birth (Optional)</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="e.g. 15/05/1995 or May 15, 1995"
                value={countryCVInfo.dateOfBirth || ''}
                onChange={(e) => onChange({ dateOfBirth: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Street Address (Optional)</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="e.g. Str. Victoriei nr. 12"
                value={countryCVInfo.address || ''}
                onChange={(e) => onChange({ address: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Postal Code / City</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="e.g. 010021, Bucharest"
                value={countryCVInfo.city || ''}
                onChange={(e) => onChange({ city: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Driving License (both European and Gulf) */}
      {config.features.hasDrivingLicense && (
        <div>
          <label className={labelClass}>Driving License (Optional)</label>
          <input
            type="text"
            className={fieldClass}
            placeholder={
              isGulf
                ? 'e.g. Valid Qatar Light Vehicle Driving License'
                : 'e.g. Category B, C (European Driving Licence)'
            }
            value={countryCVInfo.drivingLicense || ''}
            onChange={(e) => onChange({ drivingLicense: e.target.value })}
          />
        </div>
      )}

      {/* CEFR Language Editor (for Romania & Bosnia) */}
      {config.features.hasCEFRGrid && (
        <div className="pt-2 border-t border-orange-200/60">
          <CefrLanguageEditor
            motherTongue={countryCVInfo.motherTongue}
            onMotherTongueChange={(val) => onChange({ motherTongue: val })}
            cefrLanguages={countryCVInfo.cefrLanguages}
            onCefrLanguagesChange={(langs) => onChange({ cefrLanguages: langs })}
          />
        </div>
      )}

      {/* Digital Skills (European formats) */}
      {config.features.hasDigitalSkills && (
        <div className="pt-2 border-t border-orange-200/60 space-y-2">
          <label className={labelClass}>Digital & Software Skills (Chips)</label>
          <div className="flex gap-2">
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. Microsoft Excel, SAP, Python, Docker, Figma"
              value={digitalSkillDraft}
              onChange={(e) => setDigitalSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDigitalSkill();
                }
              }}
            />
            <button
              type="button"
              onClick={addDigitalSkill}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 shrink-0"
            >
              Add
            </button>
          </div>
          {(countryCVInfo.digitalSkills || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {countryCVInfo.digitalSkills!.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 shadow-2xs"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeDigitalSkill(skill)}
                    className="text-slate-400 hover:text-red-500 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Professional Memberships (for Qatar) */}
      {config.features.hasMemberships && (
        <div className="pt-2 border-t border-orange-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Professional Memberships & Accreditations
              </h4>
              <p className="text-[11px] text-slate-500">
                e.g. Qatar Society of Engineers, Chartered Institute, Bar Association.
              </p>
            </div>
            <button
              type="button"
              onClick={addMembership}
              className="flex items-center gap-1 rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
            >
              <Plus size={12} /> Add Membership
            </button>
          </div>

          {(countryCVInfo.memberships || []).map((m, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
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
