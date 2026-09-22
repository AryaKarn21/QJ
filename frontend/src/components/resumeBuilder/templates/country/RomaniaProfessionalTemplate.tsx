import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { EuropassLogo } from './EuropassLogo';
import { EuropassLanguageSkillsTable, FormattedLanguageItem } from '../../components/EuropassLanguageSkillsTable';

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
      className="mx-auto w-full max-w-[800px] bg-white text-slate-800 font-sans text-xs leading-relaxed print:max-w-none shadow-sm print:shadow-none"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* ── HEADER: European CV Header with Light Neutral Gray Background (#F4F4F4) ── */}
      <header className="bg-[#F4F4F4] border-b border-slate-200/90 p-5 sm:p-6 print:p-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-5">
          {/* Candidate Photo (Circular, ~40-50mm, vertically centered) */}
          <div className="shrink-0 self-center">
            {personalInfo.photo ? (
              <div className="h-24 w-24 sm:h-26 sm:w-26 rounded-full overflow-hidden border border-slate-300 shadow-2xs bg-white">
                <img
                  src={personalInfo.photo}
                  alt={personalInfo.fullName || 'Candidate Photo'}
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
            ) : (
              <div className="h-24 w-24 sm:h-26 sm:w-26 rounded-full border border-slate-300 bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">
                {(personalInfo.fullName || 'CV').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Right/Center Content: Name & Title, Europass, Divider, and Personal Info */}
          <div className="flex-1 min-w-0 w-full text-center sm:text-left">
            {/* Top row: Name & Title on left, Europass logo on top right */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-[22px] font-bold tracking-tight text-slate-900 leading-tight">
                  {personalInfo.fullName || 'Candidate Name'}
                </h1>
                {resume.targetRole && (
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-700 mt-0.5">
                    {resume.targetRole}
                  </p>
                )}
              </div>

              {/* TOP-RIGHT Europass Logo */}
              <div className="shrink-0 self-center sm:self-start pt-0.5">
                <EuropassLogo width={124} height={30} />
              </div>
            </div>

            {/* Subtle horizontal divider extending across candidate info area */}
            <div className="border-b border-slate-300 my-1.5 w-full" />

            {/* Personal Information (Compact European inline format in exact required order) */}
            <div className="text-[9px] sm:text-[9.5px] text-slate-700 leading-relaxed">
              {metaItems.map((item, idx) => (
                <span key={item.label} className="inline-block mr-1">
                  <span className="font-bold text-slate-900">{item.label}:</span>{' '}
                  <span className="font-normal text-slate-700">{item.value}</span>
                  {idx < metaItems.length - 1 && (
                    <span className="mx-1 text-slate-400 font-normal">|</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── SECTIONS (ABOUT ME starts cleanly right after header) ── */}
      <div className="p-5 sm:p-6 print:p-5 space-y-4">
        {/* 1. ABOUT ME */}
        {resume.summary && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-500 pb-0.5 mb-2">
              <span className="text-slate-500 text-[10px]">●</span>
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
            <div className="flex items-center gap-1.5 border-b border-slate-500 pb-0.5 mb-2">
              <span className="text-slate-500 text-[10px]">●</span>
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
            <div className="flex items-center gap-1.5 border-b border-slate-500 pb-0.5 mb-2">
              <span className="text-slate-500 text-[10px]">●</span>
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
          (countryCVInfo.digitalSkills && countryCVInfo.digitalSkills.length > 0) ||
          Boolean(countryCVInfo.otherSkills && countryCVInfo.otherSkills.trim())) && (
          <section className="break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-500 pb-0.5 mb-1.5" style={{ breakAfter: 'avoid' }}>
              <span className="text-slate-500 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">SKILLS</h2>
            </div>
            {(() => {
              const renderSkillRow = (skills: string[], label?: string) => {
                const filtered = skills.map((s) => s.trim()).filter(Boolean);
                if (filtered.length === 0) return null;
                return (
                  <div className="text-[9.5px] sm:text-[10px] text-slate-700 leading-relaxed break-inside-avoid">
                    {label && (
                      <span className="font-bold text-slate-900 mr-1.5 inline-block select-none">
                        {label}:
                      </span>
                    )}
                    {filtered.map((skill, idx) => (
                      <span key={idx} className="inline-block">
                        <span className="whitespace-nowrap">{skill}</span>
                        {idx < filtered.length - 1 && (
                          <span className="mx-1.5 text-slate-400 font-normal select-none">|</span>
                        )}
                      </span>
                    ))}
                  </div>
                );
              };

              const categoryGroups: Record<string, string[]> = {};
              const allNames: string[] = [];
              const categoriesSet = new Set<string>();

              (resume.skills || []).forEach((s) => {
                const name = (typeof s === 'string' ? s : s?.name || '').trim();
                if (!name) return;
                allNames.push(name);
                const cat = (typeof s === 'object' && s?.category && s.category !== 'Other' ? s.category : '').trim();
                if (cat) categoriesSet.add(cat);
                const key = cat || 'General';
                if (!categoryGroups[key]) categoryGroups[key] = [];
                categoryGroups[key].push(name);
              });

              const digitalSkillItems = (countryCVInfo.structuredDigitalSkills && countryCVInfo.structuredDigitalSkills.length > 0
                ? countryCVInfo.structuredDigitalSkills
                    .map((s) => {
                      const name = typeof s === 'object' ? (s.name || s.skill || '') : s;
                      const prof = typeof s === 'object' && s.proficiency ? ` (${s.proficiency})` : '';
                      return name ? `${name}${prof}`.trim() : '';
                    })
                    .filter(Boolean)
                : (countryCVInfo.digitalSkills || []).map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
              );

              const softwareSkillItems = (countryCVInfo.structuredSoftwareSkills || [])
                .map((s) => {
                  const name = typeof s === 'object' ? (s.name || s.skill || '') : s;
                  const prof = typeof s === 'object' && s.proficiency ? ` (${s.proficiency})` : '';
                  return name ? `${name}${prof}`.trim() : '';
                })
                .filter(Boolean);

              const otherSkillsRaw = (countryCVInfo.otherSkills || '').trim();
              const otherSkillItems = otherSkillsRaw
                ? otherSkillsRaw.split(/[,|\n]/).map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <div className="space-y-1 text-[9.5px] sm:text-[10px] text-slate-700 leading-relaxed">
                  {categoriesSet.size > 1 ? (
                    Object.entries(categoryGroups).map(([cat, items]) => (
                      <React.Fragment key={cat}>
                        {renderSkillRow(items, cat === 'General' ? undefined : `${cat} Skills`)}
                      </React.Fragment>
                    ))
                  ) : (
                    renderSkillRow(allNames)
                  )}

                  {digitalSkillItems.length > 0 && renderSkillRow(digitalSkillItems, 'Digital Skills')}
                  {softwareSkillItems.length > 0 && renderSkillRow(softwareSkillItems, 'Software Skills')}

                  {otherSkillsRaw && (
                    otherSkillItems.length > 1 ? (
                      renderSkillRow(otherSkillItems, 'Other Skills')
                    ) : (
                      <div className="text-[9.5px] sm:text-[10px] text-slate-700 leading-relaxed break-inside-avoid">
                        <span className="font-bold text-slate-900 mr-1.5 inline-block select-none">
                          Other Skills:
                        </span>
                        <span>{otherSkillsRaw}</span>
                      </div>
                    )
                  )}
                </div>
              );
            })()}
          </section>
        )}

        {/* 5. LANGUAGE SKILLS (EUROPASS CEFR GRID AS REQUIRED) */}
        {(countryCVInfo.motherTongue ||
          (countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0) ||
          (countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0) ||
          (resume.languages && resume.languages.length > 0)) && (() => {
          const displayLanguages: FormattedLanguageItem[] = (
            countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0
              ? countryCVInfo.cefrLanguages.map((l) => ({
                  language: l.language,
                  listening: l.listening || 'B2',
                  reading: l.reading || 'B2',
                  spokenProduction: l.spokenProduction || l.spokenInteraction || 'B2',
                  spokenInteraction: l.spokenInteraction || l.spokenProduction || 'B2',
                  writing: l.writing || 'B2',
                }))
              : countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0
              ? countryCVInfo.simpleLanguages.map((l) => {
                  const lvl = l.cefrLevel || (l as any).level || 'B2';
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
            <EuropassLanguageSkillsTable
              motherTongue={countryCVInfo.motherTongue}
              languages={displayLanguages}
            />
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
            <div className="flex items-center gap-1.5 border-b border-slate-500 pb-0.5 mb-2">
              <span className="text-slate-500 text-[10px]">●</span>
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
            <div className="flex items-center gap-1.5 border-b border-slate-500 pb-0.5 mb-2">
              <span className="text-slate-500 text-[10px]">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                DECLARATION
              </h2>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-700 uppercase tracking-wide leading-relaxed">
              {declarationText}
            </p>
            <div className="border-b border-slate-400 mt-4 w-52" />
          </section>
        )}
      </div>
    </div>
  );
};
