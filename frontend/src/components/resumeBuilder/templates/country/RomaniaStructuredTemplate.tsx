import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { ResumeLink } from '../shared/ResumeLink';
import { EuropassLogo } from './EuropassLogo';

interface Props {
  resume: Resume;
}

export const RomaniaStructuredTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo, countryCVInfo = {} } = resume;

  return (
    <div
      className="mx-auto min-h-[1050px] w-full max-w-[800px] bg-white text-slate-800 p-8 sm:p-10 shadow-sm print:shadow-none font-sans"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Header: Personal Information */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-orange-600">Curriculum Vitae</span>
            <EuropassLogo width={135} height={32} />
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          <p className="mt-1 text-base font-semibold text-slate-700">
            {resume.targetRole || 'Professional Title'}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            {countryCVInfo.passportNumber && (
              <p><span className="font-semibold text-slate-800">Passport:</span> {countryCVInfo.passportNumber}</p>
            )}
            {personalInfo.email && (
              <p><span className="font-semibold text-slate-800">Email:</span> {personalInfo.email}</p>
            )}
            {personalInfo.phone && (
              <p><span className="font-semibold text-slate-800">Phone:</span> {personalInfo.phone}</p>
            )}
            {(personalInfo.location || countryCVInfo.city || countryCVInfo.country) && (
              <p>
                <span className="font-semibold text-slate-800">Address:</span>{' '}
                {[countryCVInfo.address, countryCVInfo.city, countryCVInfo.postalCode, countryCVInfo.country || personalInfo.location]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            {countryCVInfo.nationality && (
              <p><span className="font-semibold text-slate-800">Nationality:</span> {countryCVInfo.nationality}</p>
            )}
            {countryCVInfo.dateOfBirth && (
              <p><span className="font-semibold text-slate-800">Date of birth:</span> {countryCVInfo.dateOfBirth}</p>
            )}
            {(countryCVInfo.drivingLicense || countryCVInfo.drivingLicenseDetails?.licenseType) && (
              <p className="sm:col-span-2">
                <span className="font-semibold text-slate-800">Driving Licence:</span>{' '}
                {countryCVInfo.drivingLicenseDetails?.licenseType || countryCVInfo.drivingLicense}
                {countryCVInfo.drivingLicenseDetails?.country && ` (${countryCVInfo.drivingLicenseDetails.country})`}
                {countryCVInfo.drivingLicenseDetails?.licenseNumber && ` • No: ${countryCVInfo.drivingLicenseDetails.licenseNumber}`}
                {countryCVInfo.drivingLicenseDetails?.expiryDate && ` • Expires: ${countryCVInfo.drivingLicenseDetails.expiryDate}`}
              </p>
            )}
            {personalInfo.linkedin && (
              <div className="sm:col-span-2 pt-0.5">
                <ResumeLink url={personalInfo.linkedin} label="LinkedIn Profile" />
              </div>
            )}
          </div>
        </div>

        {personalInfo.photo && (
          <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-slate-300 shadow-sm">
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* Professional Profile */}
      {resume.summary && (
        <div className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
            Work Profile
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-4">
            {resume.summary}
          </p>
        </div>
      )}

      {/* Work Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <div className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
            Work Experience
          </h2>
          <div className="space-y-4 pl-4">
            {resume.experience.map((exp, i) => (
              <div key={exp._id || i} className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                <div className="md:col-span-3 text-slate-500 font-medium">
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </div>
                <div className="md:col-span-9">
                  <h3 className="font-bold text-sm text-slate-900">{exp.role}</h3>
                  <p className="font-semibold text-orange-600">
                    {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                  </p>
                  {exp.description && (
                    <div className="mt-1.5 space-y-1 text-slate-600">
                      {toBulletLines(exp.description).map((b, bIdx) => (
                        <p key={bIdx} className="flex items-start gap-1.5">
                          <span className="text-slate-400 font-bold">•</span>
                          <span>{b}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education & Training */}
      {resume.education && resume.education.length > 0 && (
        <div className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
            Education and Training
          </h2>
          <div className="space-y-3 pl-4">
            {resume.education.map((edu, i) => (
              <div key={edu._id || i} className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                <div className="md:col-span-3 text-slate-500 font-medium">
                  {edu.startDate} – {edu.endDate}
                </div>
                <div className="md:col-span-9">
                  <h3 className="font-bold text-sm text-slate-900">{edu.degree}</h3>
                  <p className="text-slate-700 font-medium">{edu.institution}</p>
                  {edu.description && <p className="mt-1 text-slate-600">{edu.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language Skills (Europass CEFR Matrix) */}
      {(countryCVInfo.motherTongue ||
        (countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0) ||
        (countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0) ||
        (resume.languages && resume.languages.length > 0)) && (() => {
        const displayLanguages = (
          countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0
            ? countryCVInfo.cefrLanguages
            : countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0
            ? countryCVInfo.simpleLanguages.map((l) => {
                const lvl = (l as any).level || (l as any).cefrLevel || 'B2';
                return {
                  language: l.language,
                  listening: lvl,
                  reading: lvl,
                  spokenProduction: lvl,
                  spokenInteraction: lvl,
                  writing: lvl,
                };
              })
            : (resume.languages || []).map((l) => {
                const lvl = l.level || 'B2';
                return {
                  language: l.name,
                  listening: lvl,
                  reading: lvl,
                  spokenProduction: lvl,
                  spokenInteraction: lvl,
                  writing: lvl,
                };
              })
        ).filter((l) => Boolean(l.language && l.language.trim()));

        return (
          <div className="mt-6 border-b border-slate-200 pb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
              Language Skills
            </h2>
            <div className="pl-4 space-y-3">
              {countryCVInfo.motherTongue && (
                <p className="text-xs">
                  <span className="font-bold text-slate-700">Mother tongue(s):</span>{' '}
                  <span className="font-bold uppercase text-slate-900">{countryCVInfo.motherTongue}</span>
                </p>
              )}

              {displayLanguages.length > 0 && (
                <div className="overflow-x-auto border-t border-b border-slate-200 py-1.5">
                  <table className="w-full text-center text-[10.5px]">
                    <thead>
                      <tr className="border-b border-slate-300 font-bold uppercase text-slate-800 text-[10px] tracking-wide">
                        <th className="py-1 text-left w-28"></th>
                        <th colSpan={2} className="py-1 border-r border-slate-200">
                          UNDERSTANDING
                        </th>
                        <th colSpan={2} className="py-1 border-r border-slate-200">
                          SPEAKING
                        </th>
                        <th className="py-1">WRITING</th>
                      </tr>
                      <tr className="text-[9.5px] text-slate-500 border-b border-slate-200">
                        <th className="py-1 text-left"></th>
                        <th className="py-1 font-normal">Listening</th>
                        <th className="py-1 font-normal border-r border-slate-200">Reading</th>
                        <th className="py-1 font-normal">Spoken production</th>
                        <th className="py-1 font-normal border-r border-slate-200">Spoken interaction</th>
                        <th className="py-1 font-normal"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayLanguages.map((lang, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-b border-slate-200 bg-slate-50/70 font-medium"
                        >
                          <td className="py-2 px-3 text-left font-bold uppercase text-slate-900 text-[11px]">
                            {lang.language}
                          </td>
                          <td className="py-2 text-slate-800">{lang.listening}</td>
                          <td className="py-2 text-slate-800 border-r border-slate-100">{lang.reading}</td>
                          <td className="py-2 text-slate-800">{lang.spokenProduction}</td>
                          <td className="py-2 text-slate-800 border-r border-slate-100">
                            {lang.spokenInteraction}
                          </td>
                          <td className="py-2 text-slate-800">{lang.writing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-1.5 text-[9.5px] text-slate-400 italic">
                    Levels: A1 and A2: Basic user - B1 and B2: Independent user - C1 and C2: Proficient user
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Digital Skills & Other Skills */}
      {((countryCVInfo.structuredDigitalSkills?.length || 0) > 0 ||
        (countryCVInfo.structuredSoftwareSkills?.length || 0) > 0 ||
        (countryCVInfo.digitalSkills?.length || 0) > 0 ||
        (resume.skills?.length || 0) > 0 ||
        countryCVInfo.otherSkills) && (
        <div className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
            Skills & Competences
          </h2>
          <div className="pl-4 space-y-3">
            {resume.skills && resume.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map((s, idx) => (
                  <span key={idx} className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800">
                    {typeof s === 'string' ? s : s.name}
                  </span>
                ))}
              </div>
            )}
            {((countryCVInfo.structuredDigitalSkills && countryCVInfo.structuredDigitalSkills.length > 0) ||
              (countryCVInfo.digitalSkills && countryCVInfo.digitalSkills.length > 0)) && (
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900">Digital Skills: </span>
                {countryCVInfo.structuredDigitalSkills && countryCVInfo.structuredDigitalSkills.length > 0 ? (
                  <span>
                    {countryCVInfo.structuredDigitalSkills.map((s) => `${s.skill} (${s.proficiency})`).join(' • ')}
                  </span>
                ) : (
                  <span>{(countryCVInfo.digitalSkills || []).join(' • ')}</span>
                )}
              </div>
            )}
            {countryCVInfo.structuredSoftwareSkills && countryCVInfo.structuredSoftwareSkills.length > 0 && (
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900">Software Skills: </span>
                <span>
                  {countryCVInfo.structuredSoftwareSkills.map((s) => `${s.skill} (${s.proficiency})`).join(' • ')}
                </span>
              </div>
            )}
            {countryCVInfo.otherSkills && (
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900">Communication & Organizational Skills:</span>{' '}
                {countryCVInfo.otherSkills}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certifications & Additional Info */}
      {(resume.certifications?.length || 0) > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
            Certifications & Training
          </h2>
          <div className="pl-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {resume.certifications.map((c, i) => (
              <div key={c._id || i} className="rounded border border-slate-200 p-2.5 bg-slate-50">
                <p className="font-bold text-slate-900">{c.name}</p>
                <p className="text-slate-500 text-[11px]">{c.issuer} {c.year ? `(${c.year})` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
