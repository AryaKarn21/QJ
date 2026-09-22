import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { EuropassLogo } from './EuropassLogo';
import { EuropassLanguageSkillsTable, FormattedLanguageItem } from '../../components/EuropassLanguageSkillsTable';

interface Props {
  resume: Resume;
}

export const BosniaProfessionalTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo = {} as any, countryCVInfo = {} } = resume;

  // Personal metadata items for European header
  const metaItems: { label: string; value?: string }[] = [
    { label: 'Broj pasoša', value: countryCVInfo.passportNumber },
    { label: 'Datum rođenja', value: countryCVInfo.dateOfBirth },
    { label: 'Mjesto rođenja', value: countryCVInfo.placeOfBirth },
    { label: 'Državljanstvo', value: countryCVInfo.nationality },
    { label: 'Pol', value: countryCVInfo.gender },
    { label: 'Telefon', value: personalInfo.phone },
    { label: 'Email', value: personalInfo.email },
    {
      label: 'Adresa',
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
      : 'Izjavljujem da su svi podaci navedeni u ovom životopisu potpuni, istiniti i tačni prema mom najboljem znanju.';

  // Section Header Component guaranteeing exact identical styling across all sections
  const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5" style={{ breakAfter: 'avoid' }}>
      <span className="text-slate-500 text-[10px]">●</span>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
        {title}
      </h2>
    </div>
  );

  return (
    <div
      className="mx-auto w-full max-w-[800px] bg-white text-slate-800 font-sans text-xs leading-relaxed print:max-w-none shadow-sm print:shadow-none"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* ── HEADER: European CV Header with Light Neutral Gray Background (#F4F4F4) ── */}
      <header className="bg-[#F4F4F4] border-b border-slate-200/90 p-4 sm:p-5 print:p-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-5">
          {/* Candidate Photo (Circular, ~40-50mm, vertically centered) */}
          <div className="shrink-0 self-center">
            {personalInfo.photo ? (
              <div className="h-24 w-24 sm:h-25 sm:w-25 rounded-full overflow-hidden border border-slate-300 shadow-2xs bg-white">
                <img
                  src={personalInfo.photo}
                  alt={personalInfo.fullName || 'Kandidat'}
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
            ) : (
              <div className="h-24 w-24 sm:h-25 sm:w-25 rounded-full border border-slate-300 bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">
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
                  {personalInfo.fullName || 'Ime i prezime'}
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

      {/* ── SECTIONS (Compact spacing matching Reference CV) ── */}
      <div className="p-4 sm:p-5 print:p-4 space-y-3.5">
        {/* 1. O MENI */}
        {resume.summary && (
          <section className="break-inside-avoid">
            <SectionHeading title="O MENI" />
            <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
              {resume.summary}
            </p>
          </section>
        )}

        {/* 2. OBRAZOVANJE I OBUKA */}
        {resume.education && resume.education.length > 0 && (
          <section className="break-inside-avoid">
            <SectionHeading title="OBRAZOVANJE I OBUKA" />
            <div className="space-y-2">
              {resume.education.map((edu, idx) => {
                const dateStr = formatDateRange(edu.startDate, edu.endDate);
                const locStr = [edu.location || edu.city, edu.country].filter(Boolean).join(', ');
                const headerMeta = [dateStr, locStr].filter(Boolean).join(' — ');
                const qualAndInst = [edu.degree || 'OBRAZOVANJE', edu.institution].filter(Boolean).join(' — ');

                return (
                  <div key={idx} className="space-y-0.5 text-[10.5px]">
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
                      <div className="text-slate-600">Smjer / Područje: {edu.fieldOfStudy}</div>
                    )}
                    {edu.description && (
                      <div className="text-slate-600">Nivo EOK: {edu.description}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. RADNO ISKUSTVO */}
        {resume.experience && resume.experience.length > 0 && (
          <section className="break-inside-avoid">
            <SectionHeading title="RADNO ISKUSTVO" />
            <div className="space-y-2.5">
              {resume.experience.map((exp, idx) => {
                const jobTitle = exp.title || (exp as any).role || '';
                const companyName = exp.company || '';
                const titleAndCompany = [jobTitle, companyName].filter(Boolean).join(' — ');
                const dateStr = formatDateRange(exp.startDate, exp.endDate, exp.current);
                const locStr = [exp.location || exp.city, exp.country].filter(Boolean).join(', ');
                const headerMeta = [dateStr, locStr].filter(Boolean).join(' — ');

                return (
                  <div key={idx} className="space-y-0.5 text-[10.5px]">
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

        {/* 4. VJEŠTINE (SKILLS - UNIVERSAL INLINE) */}
        {(() => {
          const allSkillNames: string[] = [];
          const seen = new Set<string>();

          const addSkill = (raw?: string) => {
            if (!raw) return;
            const cleaned = raw.replace(/\s*\([^)]*\)/g, '').trim();
            if (!cleaned) return;
            const lower = cleaned.toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              allSkillNames.push(cleaned);
            }
          };

          (resume.skills || []).forEach((s) => {
            const name = typeof s === 'string' ? s : s?.name;
            addSkill(name);
          });

          (countryCVInfo.structuredDigitalSkills || []).forEach((s) => {
            const name = typeof s === 'object' ? (s.name || s.skill) : s;
            addSkill(name);
          });
          (countryCVInfo.digitalSkills || []).forEach((s) => {
            addSkill(typeof s === 'string' ? s : (s as any)?.name);
          });
          (countryCVInfo.structuredSoftwareSkills || []).forEach((s) => {
            const name = typeof s === 'object' ? (s.name || s.skill) : s;
            addSkill(name);
          });
          if (countryCVInfo.otherSkills) {
            countryCVInfo.otherSkills.split(/[,|\n]/).forEach((s) => addSkill(s));
          }

          if (allSkillNames.length === 0) return null;

          return (
            <section className="break-inside-avoid">
              <SectionHeading title="VJEŠTINE" />
              <div className="text-[10px] sm:text-[10.5px] text-slate-700 leading-relaxed">
                {allSkillNames.map((skill, idx) => (
                  <span key={idx} className="inline-block">
                    <span className="whitespace-nowrap">{skill}</span>
                    {idx < allSkillNames.length - 1 && (
                      <span className="mx-1.5 text-slate-400 font-normal select-none">|</span>
                    )}
                  </span>
                ))}
              </div>
            </section>
          );
        })()}

        {/* 5. JEZIČKE VJEŠTINE (LANGUAGE SKILLS - COMPACT 2-COLUMN TABLE) */}
        {(countryCVInfo.motherTongue ||
          (countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0) ||
          (countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0) ||
          (resume.languages && resume.languages.length > 0)) && (() => {
          const displayLanguages: FormattedLanguageItem[] = (
            countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0
              ? countryCVInfo.simpleLanguages.map((l) => ({
                  language: l.language,
                  cefrLevel: l.cefrLevel || (l as any).level || 'A2',
                }))
              : countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0
              ? countryCVInfo.cefrLanguages.map((l) => ({
                  language: l.language,
                  cefrLevel: l.listening || l.reading || 'A2',
                }))
              : (resume.languages || []).map((l) => ({
                  language: l.name,
                  cefrLevel: l.level || 'A2',
                }))
          ).filter((l) => Boolean(l.language && l.language.trim()));

          return (
            <EuropassLanguageSkillsTable
              motherTongue={countryCVInfo.motherTongue}
              languages={displayLanguages}
              title="JEZIČKE VJEŠTINE"
              motherTongueLabel="Maternji jezik"
            />
          );
        })()}

        {/* 6. CERTIFIKATI (if provided) */}
        {resume.certifications && resume.certifications.length > 0 && (
          <section className="break-inside-avoid">
            <SectionHeading title="CERTIFIKATI" />
            <div className="space-y-1">
              {resume.certifications.map((c, idx) => (
                <div key={idx} className="text-[10.5px] text-slate-700">
                  <span className="font-bold text-slate-900">{c.name}</span>
                  {c.issuer && <span> — {c.issuer}</span>}
                  {c.date && <span className="text-slate-500"> ({c.date})</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. VOZAČKA DOZVOLA (if provided) */}
        {hasDrivingLicense && (
          <section className="break-inside-avoid">
            <SectionHeading title="VOZAČKA DOZVOLA" />
            <div className="text-[10.5px] text-slate-700">
              <p>
                <span className="font-semibold text-slate-800">Kategorija:</span>{' '}
                <span className="font-bold text-slate-900">
                  {countryCVInfo.drivingLicenseDetails?.licenseType || countryCVInfo.drivingLicense}
                </span>
                {countryCVInfo.drivingLicenseDetails?.country && (
                  <span> ({countryCVInfo.drivingLicenseDetails.country})</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.licenseNumber && (
                  <span> • Broj: {countryCVInfo.drivingLicenseDetails.licenseNumber}</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.issueDate && (
                  <span> • Izdato: {countryCVInfo.drivingLicenseDetails.issueDate}</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.expiryDate && (
                  <span> • Ističe: {countryCVInfo.drivingLicenseDetails.expiryDate}</span>
                )}
              </p>
            </div>
          </section>
        )}

        {/* 8. IZJAVA (DECLARATION) */}
        {declarationText && (
          <section className="break-inside-avoid pt-1">
            <SectionHeading title="IZJAVA" />
            <p className="text-[10.5px] font-normal text-slate-700 leading-relaxed">
              {declarationText}
            </p>
            <div className="mt-3 flex items-end justify-between text-[10px] text-slate-600">
              <div>
                <p className="font-semibold text-slate-800">
                  {countryCVInfo.signatureName || personalInfo.fullName || 'Kandidat'}
                </p>
                <p className="text-slate-500">Potpis</p>
              </div>
              <div>
                <p className="text-slate-600">
                  <span className="font-semibold">Datum:</span>{' '}
                  {countryCVInfo.declarationDate ||
                    new Date().toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BosniaProfessionalTemplate;
