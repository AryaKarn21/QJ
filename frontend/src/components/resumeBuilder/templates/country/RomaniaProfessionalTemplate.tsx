import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { EuropassLogo } from './EuropassLogo';

interface Props {
  resume: Resume;
}

export const RomaniaProfessionalTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo = {} as any, countryCVInfo = {} } = resume;

  // Personal metadata items for European header
  const metaItems: { label: string; value?: string }[] = [
    { label: 'Passport', value: countryCVInfo.passportNumber },
    { label: 'Date of birth', value: countryCVInfo.dateOfBirth },
    { label: 'Place of birth', value: countryCVInfo.placeOfBirth },
    { label: 'Nationality', value: countryCVInfo.nationality },
    { label: 'Gender', value: countryCVInfo.gender },
    { label: 'Phone', value: personalInfo.phone },
    { label: 'Email', value: personalInfo.email },
    {
      label: 'Address',
      value: [
        countryCVInfo.address,
        countryCVInfo.city,
        countryCVInfo.postalCode,
        countryCVInfo.country || personalInfo.location,
      ]
        .filter(Boolean)
        .join(', '),
    },
  ].filter((item) => Boolean(item.value && item.value.trim()));

  const hasDrivingLicense = Boolean(
    countryCVInfo.drivingLicense ||
      (countryCVInfo.drivingLicenseDetails &&
        (countryCVInfo.drivingLicenseDetails.licenseType || countryCVInfo.drivingLicenseDetails.country))
  );

  const declarationText =
    countryCVInfo.declaration !== undefined
      ? countryCVInfo.declaration
      : 'I HEREBY DECLARE THAT THE INFORMATION GIVEN IN THIS CV IS TRUE AND HONEST TO MY KNOWLEDGE AND BELIEF.';

  return (
    <div
      className="mx-auto w-full max-w-[800px] bg-white text-slate-800 p-6 sm:p-8 font-sans text-xs leading-relaxed print:p-4 print:max-w-none"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-start gap-4 sm:gap-6 pb-2">
        {/* Candidate Photo */}
        {personalInfo.photo ? (
          <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-full border-2 border-slate-300 shadow-2xs">
            <img
              src={personalInfo.photo}
              alt={personalInfo.fullName || 'Candidate'}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
            {(personalInfo.fullName || 'CV').slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Right Content: Top row (Name & Title on left, Europass on far right), Line, and Horizontal Personal Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                {personalInfo.fullName || 'Candidate Name'}
              </h1>
              {resume.targetRole && (
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mt-0.5">
                  {resume.targetRole}
                </p>
              )}
            </div>

            {/* TOP-RIGHT European / Europass Logo */}
            <div className="shrink-0 pt-0.5">
              <EuropassLogo width={138} height={34} />
            </div>
          </div>

          {/* Thin horizontal line spanning across */}
          <div className="border-b border-slate-300 my-1.5 w-full" />

          {/* Horizontal Personal Information spanning all the way across */}
          <div className="text-[11px] text-slate-700 leading-relaxed">
            {metaItems.map((item, idx) => (
              <span key={item.label} className="inline-block mr-1.5 whitespace-nowrap">
                <span className="font-bold text-slate-900">{item.label}:</span>{' '}
                <span>{item.value}</span>
                {idx < metaItems.length - 1 && <span className="ml-1.5 text-slate-400 font-normal">|</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTIONS ── */}
      <div className="space-y-4 mt-4">
        {/* 1. ABOUT ME */}
        {resume.summary && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
              <span className="text-slate-400 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">ABOUT ME</h2>
            </div>
            <p className="text-[11.5px] text-slate-700 leading-relaxed whitespace-pre-line">
              {resume.summary}
            </p>
          </section>
        )}

        {/* 2. EDUCATION & TRAINING */}
        {resume.education && resume.education.length > 0 && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
              <span className="text-slate-400 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                EDUCATION & TRAINING
              </h2>
            </div>
            <div className="space-y-2.5">
              {resume.education.map((edu, idx) => {
                const dateStr = formatDateRange(edu.startDate, edu.endDate);
                const locStr = [edu.location || edu.city, edu.country].filter(Boolean).join(', ');
                const headerMeta = [dateStr, locStr].filter(Boolean).join(' — ');
                const qualAndInst = [edu.degree || 'EDUCATION', edu.institution].filter(Boolean).join(' — ');

                return (
                  <div key={idx} className="space-y-0.5 text-[11px]">
                    {headerMeta && (
                      <div className="font-medium text-slate-500 uppercase tracking-wide">
                        {headerMeta}
                      </div>
                    )}
                    {qualAndInst && (
                      <div className="font-bold uppercase text-slate-900">
                        {qualAndInst}
                      </div>
                    )}
                    {edu.fieldOfStudy && (
                      <div className="text-slate-600">Field of study: {edu.fieldOfStudy}</div>
                    )}
                    {edu.description && (
                      <div className="text-slate-600">Level in EQF: {edu.description}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. WORK EXPERIENCE */}
        {resume.experience && resume.experience.length > 0 && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
              <span className="text-slate-400 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                WORK EXPERIENCE
              </h2>
            </div>
            <div className="space-y-3">
              {resume.experience.map((exp, idx) => {
                const jobTitle = exp.title || (exp as any).role || '';
                const companyName = exp.company || '';
                const titleAndCompany = [jobTitle, companyName].filter(Boolean).join(' — ');
                const dateStr = formatDateRange(exp.startDate, exp.endDate, exp.current);
                const locStr = [exp.location || exp.city, exp.country].filter(Boolean).join(', ');
                const headerMeta = [dateStr, locStr].filter(Boolean).join(' — ');

                return (
                  <div key={idx} className="space-y-0.5 text-[11px]">
                    {headerMeta && (
                      <div className="font-medium text-slate-500 uppercase tracking-wide">
                        {headerMeta}
                      </div>
                    )}
                    {titleAndCompany && (
                      <div className="font-bold uppercase text-slate-900">
                        {titleAndCompany}
                      </div>
                    )}
                    {exp.description && (
                      <ul className="list-disc list-outside pl-4 space-y-0.5 text-slate-700 leading-snug">
                        {toBulletLines(exp.description).map((line, bIdx) => (
                          <li key={bIdx}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. SKILLS */}
        {((resume.skills && resume.skills.length > 0) ||
          (countryCVInfo.structuredDigitalSkills && countryCVInfo.structuredDigitalSkills.length > 0) ||
          (countryCVInfo.structuredSoftwareSkills && countryCVInfo.structuredSoftwareSkills.length > 0) ||
          (countryCVInfo.digitalSkills && countryCVInfo.digitalSkills.length > 0)) && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
              <span className="text-slate-400 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">SKILLS</h2>
            </div>
            <div className="space-y-1 text-[11px] text-slate-700 leading-relaxed">
              {resume.skills && resume.skills.length > 0 && (
                <div>
                  {(resume.skills || [])
                    .map((s) => (typeof s === 'string' ? s : s.name))
                    .filter(Boolean)
                    .join(' | ')}
                </div>
              )}

              {((countryCVInfo.structuredDigitalSkills && countryCVInfo.structuredDigitalSkills.length > 0) ||
                (countryCVInfo.digitalSkills && countryCVInfo.digitalSkills.length > 0)) && (
                <div>
                  <span className="font-bold text-slate-900">Digital Skills: </span>
                  <span>
                    {countryCVInfo.structuredDigitalSkills && countryCVInfo.structuredDigitalSkills.length > 0
                      ? countryCVInfo.structuredDigitalSkills
                          .map((s) => {
                            const name = typeof s === 'object' ? (s.name || s.skill || '') : s;
                            const prof = typeof s === 'object' && s.proficiency ? ` (${s.proficiency})` : '';
                            return name ? `${name}${prof}` : '';
                          })
                          .filter(Boolean)
                          .join(' | ')
                      : (countryCVInfo.digitalSkills || []).join(' | ')}
                  </span>
                </div>
              )}

              {countryCVInfo.structuredSoftwareSkills && countryCVInfo.structuredSoftwareSkills.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900">Software Skills: </span>
                  <span>
                    {countryCVInfo.structuredSoftwareSkills
                      .map((s) => {
                        const name = typeof s === 'object' ? (s.name || s.skill || '') : s;
                        const prof = typeof s === 'object' && s.proficiency ? ` (${s.proficiency})` : '';
                        return name ? `${name}${prof}` : '';
                      })
                      .filter(Boolean)
                      .join(' | ')}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 5. LANGUAGE SKILLS (SIMPLIFIED 2-COLUMN TABLE AS REQUIRED) */}
        {(countryCVInfo.motherTongue ||
          (countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0) ||
          (countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0) ||
          (resume.languages && resume.languages.length > 0)) && (() => {
          const displayLanguages: { language: string; level: string }[] = (
            countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0
              ? countryCVInfo.simpleLanguages.map((l) => ({
                  language: l.language,
                  level: (l as any).level || (l as any).cefrLevel || 'B2',
                }))
              : countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0
              ? countryCVInfo.cefrLanguages.map((l) => ({
                  language: l.language,
                  level: l.listening || l.reading || l.spokenProduction || l.spokenInteraction || l.writing || 'B2',
                }))
              : (resume.languages || []).map((l) => ({
                  language: l.name,
                  level: l.level || 'B2',
                }))
          ).filter((l) => Boolean(l.language && l.language.trim()));

          return (
            <section className="break-inside-avoid">
              <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
                <span className="text-slate-400 text-[10px]">●</span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  LANGUAGE SKILLS
                </h2>
              </div>

              {countryCVInfo.motherTongue && (
                <p className="text-[11.5px] font-medium text-slate-800 mb-2">
                  Mother tongue(s): <span className="font-bold uppercase">{countryCVInfo.motherTongue}</span>
                </p>
              )}

              {displayLanguages.length > 0 && (
                <div className="max-w-md overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-slate-300">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-50 font-bold uppercase text-slate-800 text-[10px] tracking-wide">
                        <th className="py-1.5 px-3 border-r border-slate-300">Language</th>
                        <th className="py-1.5 px-3">CEFR Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayLanguages.map((lang, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-300 uppercase">
                            {lang.language}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-800">
                            {lang.level}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })()}

        {/* 6. CERTIFICATIONS (if provided) */}
        {resume.certifications && resume.certifications.length > 0 && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
              <span className="text-slate-400 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                CERTIFICATIONS
              </h2>
            </div>
            <div className="space-y-1">
              {resume.certifications.map((c, idx) => (
                <div key={idx} className="text-[11px] text-slate-700">
                  <span className="font-bold text-slate-900">{c.name}</span>
                  {c.issuer && <span> — {c.issuer}</span>}
                  {c.date && <span className="text-slate-500"> ({c.date})</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. DRIVING LICENSE */}
        {hasDrivingLicense && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
              <span className="text-slate-400 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                DRIVING LICENSE
              </h2>
            </div>
            <div className="text-[11px] text-slate-700">
              <p>
                <span className="font-semibold text-slate-800">License Category:</span>{' '}
                <span className="font-bold text-slate-900">
                  {countryCVInfo.drivingLicenseDetails?.licenseType || countryCVInfo.drivingLicense}
                </span>
                {countryCVInfo.drivingLicenseDetails?.country && (
                  <span> ({countryCVInfo.drivingLicenseDetails.country})</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.licenseNumber && (
                  <span> • License No: {countryCVInfo.drivingLicenseDetails.licenseNumber}</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.issueDate && (
                  <span> • Issued: {countryCVInfo.drivingLicenseDetails.issueDate}</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.expiryDate && (
                  <span> • Expires: {countryCVInfo.drivingLicenseDetails.expiryDate}</span>
                )}
              </p>
            </div>
          </section>
        )}

        {/* 8. DECLARATION */}
        {declarationText && (
          <section className="break-inside-avoid pt-1">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
              <span className="text-slate-400 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                DECLARATION
              </h2>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-700 uppercase tracking-wide leading-relaxed">
              {declarationText}
            </p>
          </section>
        )}
      </div>
    </div>
  );
};
