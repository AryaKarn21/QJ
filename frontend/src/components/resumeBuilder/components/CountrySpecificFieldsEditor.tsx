import React, { useState } from 'react';
import { Globe, Plus, Trash2, Clock, Car, FileText } from 'lucide-react';
import { getCountryConfig, CountryCVInfo, ProfessionalMembership } from '../config/countryCVConfigs';
import { CefrLanguageEditor } from './CefrLanguageEditor';
import { NationalitySelect } from './NationalitySelect';
import { GENDER_OPTIONS } from '../config/countryCVConfigs/nationalities';
import { isValidDateOfBirth } from '../config/countryCVConfigs/fieldValidation';

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
  const [digitalSkillDraft, setDigitalSkillDraft] = useState('');

  if (!config) return null;

  const isGulf = config.features.hasGulfFields;
  const isEuropean = config.features.hasCEFRGrid;

  const dobValidation = isValidDateOfBirth(countryCVInfo.dateOfBirth || '');

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

  const updateDrivingDetails = (patch: Record<string, string>) => {
    const current = countryCVInfo.drivingLicenseDetails || {
      licenseType: countryCVInfo.drivingLicense || '',
      country: '',
      licenseNumber: '',
      expiryDate: '',
    };
    const next = { ...current, ...patch };
    onChange({
      drivingLicenseDetails: next,
      drivingLicense: next.licenseType || countryCVInfo.drivingLicense,
    });
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
              {config.disclaimer} • All core fields marked with <span className="text-red-500 font-bold">*</span> are required.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
          {config.badge}
        </span>
      </div>

      {/* Mandatory Personal Demographic Details */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Globe size={13} className="text-orange-500" />
          Mandatory Personal & Demographic Information
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
              placeholder="Select Nationality (e.g. Nepalese, Romanian)…"
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

          {/* Passport Number (Optional / Displayed in Header if present) */}
          <div>
            <label className={labelClass}>
              Passport Number <span className="text-slate-400 text-[10px] font-normal">(Optional metadata)</span>
            </label>
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. PA4439019"
              value={countryCVInfo.passportNumber || ''}
              onChange={(e) => onChange({ passportNumber: e.target.value })}
            />
          </div>

          {/* Street Address * */}
          <div>
            <label className={labelClass}>
              Street / Work Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={fieldClass}
              placeholder="e.g. Str. Victoriei nr. 12 / Doha (Work)"
              value={countryCVInfo.address || ''}
              onChange={(e) => onChange({ address: e.target.value })}
            />
          </div>

          {/* City * */}
          <div>
            <label className={labelClass}>
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={fieldClass}
              placeholder="e.g. Bucharest / Doha / Kathmandu"
              value={countryCVInfo.city || ''}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>

          {/* Country * */}
          <div>
            <label className={labelClass}>
              Country <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={fieldClass}
              placeholder="e.g. Romania / Qatar / Nepal"
              value={countryCVInfo.country || ''}
              onChange={(e) => onChange({ country: e.target.value })}
            />
          </div>

          {/* Postal Code * */}
          <div>
            <label className={labelClass}>
              Postal Code <span className="text-slate-500 text-[10.5px] font-normal">(if applicable)</span>
            </label>
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. 010021"
              value={countryCVInfo.postalCode || ''}
              onChange={(e) => onChange({ postalCode: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Gulf / Qatar Recruiter Availability & Status */}
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

      {/* DRIVING LICENSE: THE ONLY OPTIONAL FIELD */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car size={15} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Driving License
            </span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
              Optional
            </span>
          </div>
          {countryCVInfo.drivingLicense && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  drivingLicense: '',
                  drivingLicenseDetails: undefined,
                })
              }
              className="text-[11px] text-red-500 hover:underline"
            >
              Clear License
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          This is the only optional section. Leave empty if you do not hold a driving license. If left blank, this section is completely hidden from the generated CV and will never trigger an error.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className={labelClass}>License Category / Type</label>
            <input
              type="text"
              className={fieldClass}
              placeholder={isGulf ? 'e.g. Qatar Light Vehicle Driving License' : 'e.g. Category B, European Driving Licence'}
              value={countryCVInfo.drivingLicenseDetails?.licenseType || countryCVInfo.drivingLicense || ''}
              onChange={(e) => updateDrivingDetails({ licenseType: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Issuing Country</label>
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. Romania / Qatar / Nepal"
              value={countryCVInfo.drivingLicenseDetails?.country || ''}
              onChange={(e) => updateDrivingDetails({ country: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>License Number (Optional)</label>
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. 29452441140"
              value={countryCVInfo.drivingLicenseDetails?.licenseNumber || ''}
              onChange={(e) => updateDrivingDetails({ licenseNumber: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Expiry Date (Optional)</label>
            <input
              type="text"
              className={fieldClass}
              placeholder="e.g. 17/08/2027"
              value={countryCVInfo.drivingLicenseDetails?.expiryDate || ''}
              onChange={(e) => updateDrivingDetails({ expiryDate: e.target.value })}
            />
          </div>
        </div>
      </div>

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

      {/* Declaration Section */}
      <div className="pt-2 border-t border-orange-200/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-orange-500" />
          <label className={labelClass}>Declaration Statement</label>
        </div>
        <p className="text-[11px] text-slate-500">
          Standard declaration for European-style CVs confirming the honesty and accuracy of all submitted details.
        </p>
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
