/**
 * WorkerQuickResumeForm.tsx
 * Path: frontend/src/components/resumeBuilder/components/WorkerQuickResumeForm.tsx
 *
 * Step 3 of the builder wizard (see RESUME_TEMPLATE_SYSTEM_ROADMAP.md) for
 * candidates who need a resume built FOR them by staff, with minimal input:
 * limited education, limited English, no formal resume history. Every field
 * matches spec section 4 exactly. Skills are tap-to-select chips, not free
 * text — see JOB_CATEGORIES[].suggestedSkills in jobCategories.ts.
 *
 * This form reads/writes `Resume.workerInfo` (backend/models/Resume.js) and
 * `Resume.workerCategoryId` / `Resume.languageMode`. It does NOT touch
 * `experience[]`, `education[]`, or any other field the full ResumeEditor
 * uses — a resume can be built with this form alone, or refined afterward
 * in the full editor, without conflict.
 */

import React from 'react';
import ImageUpload from './ImageUpload';
import { getJobCategoryById, type JobCategory } from '../config/jobCategories';
import { getLabel, type LanguageMode } from '../config/resumeI18n';

export interface WorkerInfo {
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  jobPosition: string;
  yearsOfExperience: string;
  previousCompany: string;
  country: string;
  mainResponsibilities: string;
  simpleSkills: string[];
}

interface WorkerQuickResumeFormProps {
  workerCategoryId: string;
  languageMode: LanguageMode;
  fullName: string;
  contactNumber: string;
  photo: string | null;
  workerInfo: WorkerInfo;
  onFullNameChange: (value: string) => void;
  onContactNumberChange: (value: string) => void;
  onPhotoChange: (photo: string | null) => void;
  onWorkerInfoChange: (info: WorkerInfo) => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const WorkerQuickResumeForm: React.FC<WorkerQuickResumeFormProps> = ({
  workerCategoryId,
  languageMode,
  fullName,
  contactNumber,
  photo,
  workerInfo,
  onFullNameChange,
  onContactNumberChange,
  onPhotoChange,
  onWorkerInfoChange,
}) => {
  const category: JobCategory | undefined = getJobCategoryById(workerCategoryId);
  const suggestedSkills = category?.suggestedSkills ?? [];

  const setField = <K extends keyof WorkerInfo>(key: K, value: WorkerInfo[K]) =>
    onWorkerInfoChange({ ...workerInfo, [key]: value });

  const toggleSkill = (skillLabel: string) => {
    const isSelected = workerInfo.simpleSkills.includes(skillLabel);
    setField(
      'simpleSkills',
      isSelected
        ? workerInfo.simpleSkills.filter((s) => s !== skillLabel)
        : [...workerInfo.simpleSkills, skillLabel]
    );
  };

  const label = (key: Parameters<typeof getLabel>[0]) => getLabel(key, languageMode);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── Personal Information ─────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">{label('personalInformation')}</h3>

        <div className="flex items-start gap-4 mb-4">
          <ImageUpload
            imageUrl={photo}
            onImageChange={onPhotoChange}
            isPreviewMode={false}
            className="w-24 h-24 rounded-lg flex-shrink-0"
          />
          <div className="flex-1 space-y-4">
            <div>
              <label className={labelClass}>{label('fullName')}</label>
              <input
                className={inputClass}
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                placeholder={label('fullName')}
              />
            </div>
            <div>
              <label className={labelClass}>{label('contactNumber')}</label>
              <input
                className={inputClass}
                value={contactNumber}
                onChange={(e) => onContactNumberChange(e.target.value)}
                placeholder={label('contactNumber')}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>{label('dateOfBirth')}</label>
            <input
              type="date"
              className={inputClass}
              value={workerInfo.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{label('nationality')}</label>
            <input
              className={inputClass}
              value={workerInfo.nationality}
              onChange={(e) => setField('nationality', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{label('passportNumber')}</label>
            <input
              className={inputClass}
              value={workerInfo.passportNumber}
              onChange={(e) => setField('passportNumber', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Work Information ─────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">{label('workInformation')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{label('jobPosition')}</label>
            <input
              className={inputClass}
              value={workerInfo.jobPosition}
              onChange={(e) => setField('jobPosition', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{label('yearsOfExperience')}</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={workerInfo.yearsOfExperience}
              onChange={(e) => setField('yearsOfExperience', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{label('previousCompany')}</label>
            <input
              className={inputClass}
              value={workerInfo.previousCompany}
              onChange={(e) => setField('previousCompany', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{label('country')}</label>
            <input
              className={inputClass}
              value={workerInfo.country}
              onChange={(e) => setField('country', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>{label('mainResponsibilities')}</label>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={workerInfo.mainResponsibilities}
              onChange={(e) => setField('mainResponsibilities', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Skills — tap to select, no typing required ───────────────── */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">{label('skills')}</h3>
        {suggestedSkills.length === 0 ? (
          <p className="text-sm text-gray-500">
            No suggested skills for this category yet — add them in jobCategories.ts.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestedSkills.map((skill) => {
              const displayLabel = languageMode === 'ne' ? skill.ne : languageMode === 'bilingual' ? `${skill.en} / ${skill.ne}` : skill.en;
              const selected = workerInfo.simpleSkills.includes(skill.en);
              return (
                <button
                  key={skill.en}
                  type="button"
                  onClick={() => toggleSkill(skill.en)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  {selected ? '✓ ' : ''}
                  {displayLabel}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default WorkerQuickResumeForm;