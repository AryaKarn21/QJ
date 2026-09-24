import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { EuropassLogo } from './EuropassLogo';
import { EuropassLanguageSkillsTable, FormattedLanguageItem } from '../../components/EuropassLanguageSkillsTable';

interface Props {
  resume: Resume;
}

// ─────────────────────────────────────────────────────────────────────────
// Palette — restrained, "expensive-looking" premium CV palette. Kept as
// literal hex (not the generic theme.accent system every other template
// uses) because this template's whole identity is this specific muted
// ink/graphite + subtle champagne-gold combination, not a user-selectable
// accent color.
// ─────────────────────────────────────────────────────────────────────────
const INK = '#1F2937'; // primary text / headings
const SLATE = '#4B5563'; // secondary text
const GOLD = '#B08D57'; // accent — used sparingly (dots, hairlines, labels)
const HAIRLINE = '#D9D9D9'; // borders
const PANEL = '#F7F7F5'; // light section background

// Tiny, hand-drawn (not an icon-library import) line icons for the three
// most universal contact fields — kept minimal/monochrome per "subtle and
// professional", matching this file's existing pattern of inline SVG
// (see EuropassLogo.tsx) rather than adding a new icon dependency.
type IconProps = { className?: string; style?: React.CSSProperties };
const PhoneIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 16 16" width="10" height="10" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 2h2.2l1 3-1.6 1.1a8.5 8.5 0 0 0 4.8 4.8l1.1-1.6 3 1v2.2c0 .7-.6 1.2-1.3 1.1A11.5 11.5 0 0 1 2.4 3.3C2.3 2.6 2.8 2 3.5 2Z" />
  </svg>
);
const MailIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 16 16" width="10" height="10" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3.5" width="12" height="9" rx="1.2" />
    <path d="M2.5 4.5 8 8.5l5.5-4" />
  </svg>
);
const PinIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 16 16" width="10" height="10" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 14s4.5-4.2 4.5-7.5A4.5 4.5 0 0 0 3.5 6.5C3.5 9.8 8 14 8 14Z" />
    <circle cx="8" cy="6.5" r="1.6" />
  </svg>
);

export const RomaniaProfessionalTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  // theme.fontHeading / theme.fontBody (not theme.fontFamily, which doesn't
  // exist on ThemePreset) is the real font-pairing surface this app's
  // "Font customization" control writes to — every other template reads
  // these two off getTheme()'s result; this file previously read a
  // nonexistent theme.fontFamily, which is why the font-family picker had
  // no visible effect here. Fixed as part of this pass, not a new field.
  const headingFont = theme.fontHeading || 'Georgia, "Times New Roman", serif';
  const bodyFont = theme.fontBody || 'Inter, Helvetica, Arial, sans-serif';
  const { personalInfo = {} as any, countryCVInfo = {} } = resume;

  // Personal metadata items for European header
  const metaItems: { label: string; value?: string }[] = [
    { label: 'Passport', value: countryCVInfo.passportNumber },
    { label: 'Date of birth', value: countryCVInfo.dateOfBirth },
    { label: 'Place of birth', value: countryCVInfo.placeOfBirth },
    { label: 'Nationality', value: countryCVInfo.nationality },
    { label: 'Gender', value: countryCVInfo.gender },
  ].filter((item) => Boolean(item.value && item.value.trim()));

  const addressValue = [
    countryCVInfo.address,
    countryCVInfo.city,
    countryCVInfo.postalCode,
    countryCVInfo.country || personalInfo.location,
  ]
    .filter(Boolean)
    .join(', ');

  const hasDrivingLicense = Boolean(
    countryCVInfo.drivingLicense ||
      (countryCVInfo.drivingLicenseDetails &&
        (countryCVInfo.drivingLicenseDetails.licenseType || countryCVInfo.drivingLicenseDetails.country))
  );

  const declarationText =
    countryCVInfo.declaration && countryCVInfo.declaration.trim()
      ? countryCVInfo.declaration.replace(/BELEIF/gi, 'BELIEF')
      : 'I HEREBY DECLARE THAT THE INFORMATION GIVEN IN THIS CV IS TRUE AND HONEST TO MY KNOWLEDGE AND BELIEF.';

  // Section heading used identically across every section — a small gold
  // dot + hairline, set in the heading font, consistent capitalization and
  // spacing so every section reads as one design system (not per-section
  // one-offs).
  const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
    <div
      className="flex items-center gap-2 border-b pb-2 mb-3"
      style={{ borderColor: HAIRLINE, breakAfter: 'avoid', pageBreakAfter: 'avoid' }}
    >
      <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
      <h2
        className="text-[11.5px] font-bold uppercase tracking-[0.12em]"
        style={{ color: INK, fontFamily: headingFont }}
      >
        {title}
      </h2>
    </div>
  );

  return (
    <div
      className="mx-auto w-full max-w-[800px] bg-white text-xs leading-relaxed print:max-w-none shadow-sm print:shadow-none"
      style={{ fontFamily: bodyFont, color: SLATE }}
    >
      {/* ── HEADER: photo, name/title hierarchy, and a structured contact grid ── */}
      <header className="border-b p-6 sm:p-8 print:p-6" style={{ backgroundColor: PANEL, borderColor: HAIRLINE }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Candidate Photo */}
          <div className="shrink-0">
            {personalInfo.photo ? (
              <div
                className="h-24 w-24 sm:h-[104px] sm:w-[104px] rounded-full overflow-hidden bg-white"
                style={{ boxShadow: `0 0 0 3px #ffffff, 0 0 0 4px ${HAIRLINE}, 0 0 0 6px ${GOLD}22` }}
              >
                <img
                  src={personalInfo.photo}
                  alt={personalInfo.fullName || 'Candidate Photo'}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="h-24 w-24 sm:h-[104px] sm:w-[104px] rounded-full flex items-center justify-center font-bold text-lg bg-white"
                style={{ boxShadow: `0 0 0 3px #ffffff, 0 0 0 4px ${HAIRLINE}, 0 0 0 6px ${GOLD}22`, color: SLATE }}
              >
                {(personalInfo.fullName || 'CV').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name, title, and contact block */}
          <div className="flex-1 min-w-0 w-full text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <p
                  className="text-[9.5px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: GOLD }}
                >
                  Curriculum Vitae
                </p>
                <h1
                  className="mt-1 text-[26px] sm:text-[30px] font-bold leading-[1.15] tracking-tight"
                  style={{ color: INK, fontFamily: headingFont }}
                >
                  {personalInfo.fullName || 'Candidate Name'}
                </h1>
                {resume.targetRole && (
                  <p
                    className="mt-1 text-[11.5px] sm:text-[12.5px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: SLATE }}
                  >
                    {resume.targetRole}
                  </p>
                )}
              </div>

              {resume.showLogo !== 'none' && resume.showLogo !== 'no' && (
                <div className="shrink-0 self-center sm:self-start pt-0.5">
                  <EuropassLogo width={118} height={28} />
                </div>
              )}
            </div>

            {/* Structured contact grid — replaces a single run-on paragraph
                with clearly separated, scannable fields. */}
            {(personalInfo.email || personalInfo.phone || addressValue || metaItems.length > 0) && (
              <div className="mt-4 pt-3 border-t" style={{ borderColor: HAIRLINE }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[10.5px] justify-items-center sm:justify-items-start">
                  {personalInfo.phone && (
                    <div className="flex items-center gap-1.5">
                      <PhoneIcon className="shrink-0" style={{ color: GOLD } as React.CSSProperties} />
                      <span style={{ color: SLATE }}>{personalInfo.phone}</span>
                    </div>
                  )}
                  {personalInfo.email && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MailIcon className="shrink-0" style={{ color: GOLD } as React.CSSProperties} />
                      <span className="break-all" style={{ color: SLATE }}>{personalInfo.email}</span>
                    </div>
                  )}
                  {addressValue && (
                    <div className="flex items-center gap-1.5 sm:col-span-2 min-w-0">
                      <PinIcon className="shrink-0" style={{ color: GOLD } as React.CSSProperties} />
                      <span style={{ color: SLATE }}>{addressValue}</span>
                    </div>
                  )}
                </div>

                {metaItems.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-[9.5px]">
                    {metaItems.map((item) => (
                      <span key={item.label}>
                        <span className="font-semibold" style={{ color: INK }}>{item.label}:</span>{' '}
                        <span style={{ color: SLATE }}>{item.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── SECTIONS ── */}
      <div className="p-6 sm:p-8 print:p-6 space-y-3.5">
        {/* 1. ABOUT ME */}
        {resume.summary && (
          <section className="break-inside-avoid">
            <SectionHeading title="About Me" />
            <p className="text-[11.5px] leading-[1.7] whitespace-pre-line" style={{ color: SLATE }}>
              {resume.summary}
            </p>
          </section>
        )}

        {/* 2. EDUCATION & TRAINING */}
        {resume.education && resume.education.length > 0 && (
          <section className="break-inside-avoid">
            <SectionHeading title="Education & Training" />
            <div className="space-y-3">
              {resume.education.map((edu, idx) => {
                const dateStr = formatDateRange(edu.startDate, edu.endDate);
                const locStr = [edu.location || edu.city, edu.country].filter(Boolean).join(', ');
                const headerMeta = [dateStr, locStr].filter(Boolean).join(' — ');

                return (
                  <div key={idx} className="flex gap-3 text-[11px]">
                    <span className="mt-1.5 h-[5px] w-[5px] rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <h3 className="font-bold" style={{ color: INK }}>
                          {edu.degree || 'Degree'}
                        </h3>
                        {headerMeta && (
                          <span className="text-[10px] font-medium uppercase tracking-wide shrink-0" style={{ color: GOLD }}>
                            {headerMeta}
                          </span>
                        )}
                      </div>
                      {edu.institution && <p className="font-medium" style={{ color: SLATE }}>{edu.institution}</p>}
                      {edu.fieldOfStudy && (
                        <p className="mt-0.5" style={{ color: SLATE }}>Field of study: {edu.fieldOfStudy}</p>
                      )}
                      {edu.description && (
                        <p className="mt-0.5" style={{ color: SLATE }}>{edu.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. WORK EXPERIENCE */}
        {resume.experience && resume.experience.length > 0 && (
          <section className="break-inside-avoid">
            <SectionHeading title="Work Experience" />
            <div className="space-y-4">
              {resume.experience.map((exp, idx) => {
                const jobTitle = exp.title || (exp as any).role || '';
                const dateStr = formatDateRange(exp.startDate, exp.endDate, exp.current);
                const locStr = [exp.location || exp.city, exp.country].filter(Boolean).join(', ');

                return (
                  <div key={idx} className="flex gap-3 text-[11px]">
                    <span className="mt-1.5 h-[5px] w-[5px] rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <h3 className="text-[12.5px] font-bold" style={{ color: INK }}>
                          {jobTitle || 'Role'}
                        </h3>
                        {dateStr && (
                          <span className="text-[10px] font-medium uppercase tracking-wide shrink-0" style={{ color: GOLD }}>
                            {dateStr}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold" style={{ color: SLATE }}>
                        {exp.company}
                        {locStr && <span className="font-normal"> · {locStr}</span>}
                      </p>
                      {exp.description && (
                        <ul className="mt-1.5 space-y-1 list-none">
                          {toBulletLines(exp.description).map((line, bIdx) => (
                            <li key={bIdx} className="flex items-start gap-1.5 leading-snug" style={{ color: SLATE }}>
                              <span className="mt-[5px] h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: HAIRLINE }} />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. SKILLS — clean, ATS-friendly two-column grid (no percentage
            bars/decorative meters), replacing a single dense pipe-joined
            line with clearly separated, scannable entries. */}
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
              <SectionHeading title="Skills" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                {allSkillNames.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-2 min-w-0">
                    <span className="h-[4px] w-[4px] rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
                    <span style={{ color: SLATE }}>{skill}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* 5. LANGUAGE SKILLS (EUROPASS 5-SKILL CEFR MATRIX) */}
        {(countryCVInfo.motherTongue ||
          (countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0) ||
          (countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0) ||
          (resume.languages && resume.languages.length > 0)) && (() => {
          const displayLanguages: FormattedLanguageItem[] = (
            countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0
              ? countryCVInfo.cefrLanguages.map((l) => ({
                  language: l.language,
                  listening: l.listening || 'A2',
                  reading: l.reading || 'A2',
                  spokenProduction: l.spokenProduction || l.spokenInteraction || 'A2',
                  spokenInteraction: l.spokenInteraction || l.spokenProduction || 'A2',
                  writing: l.writing || 'A2',
                  cefrLevel: l.listening || 'A2',
                }))
              : countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0
              ? countryCVInfo.simpleLanguages.map((l) => {
                  const lvl = l.cefrLevel || (l as any).level || 'A2';
                  return {
                    language: l.language,
                    listening: lvl,
                    reading: lvl,
                    spokenProduction: lvl,
                    spokenInteraction: lvl,
                    writing: lvl,
                    cefrLevel: lvl,
                  };
                })
              : (resume.languages || []).map((l) => {
                  const lvl = l.level || 'A2';
                  return {
                    language: l.name,
                    listening: lvl,
                    reading: lvl,
                    spokenProduction: lvl,
                    spokenInteraction: lvl,
                    writing: lvl,
                    cefrLevel: lvl,
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
            <SectionHeading title="Certifications" />
            <div className="space-y-1.5">
              {resume.certifications.map((c, idx) => (
                <div key={idx} className="flex items-baseline gap-2 text-[11px]">
                  <span className="h-[4px] w-[4px] rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
                  <span className="font-bold" style={{ color: INK }}>{c.name}</span>
                  {c.issuer && <span style={{ color: SLATE }}> — {c.issuer}</span>}
                  {c.year && <span style={{ color: SLATE }}> ({c.year})</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. DRIVING LICENSE (if provided) */}
        {hasDrivingLicense && (
          <section className="break-inside-avoid">
            <SectionHeading title="Driving License" />
            <p className="text-[11px]" style={{ color: SLATE }}>
              <span className="font-semibold" style={{ color: INK }}>License Category:</span>{' '}
              <span className="font-bold" style={{ color: INK }}>
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
          </section>
        )}

        {/* 8. DECLARATION */}
        <section className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <SectionHeading title="Declaration" />
          <p
            className="text-[10px] sm:text-[10.5px] font-semibold leading-relaxed rounded-md p-3"
            style={{ color: INK, backgroundColor: PANEL, border: `1px solid ${HAIRLINE}` }}
          >
            {declarationText}
          </p>
        </section>
      </div>
    </div>
  );
};

export default RomaniaProfessionalTemplate;
