import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines, groupSkillsByCategory } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent, sectionLabel } from '../shared/sections';
import { ResumeLink } from '../shared/ResumeLink';
import { EuropassLanguageSkillsTable, FormattedLanguageItem } from '../../components/EuropassLanguageSkillsTable';

interface Props {
  resume: Resume;
}

// ─────────────────────────────────────────────────────────────────────────
// Palette — restrained, document-oriented Europass palette. Literal hex
// (not the generic theme.accent system every marketing-style template
// uses) so the QuickJobs orange brand color can never appear in this CV
// regardless of the user's chosen theme — matching the explicit "no
// orange in the generated document" requirement.
// ─────────────────────────────────────────────────────────────────────────
const NAVY = '#1E3A5F';
const NAVY_DEEP = '#14293F';
const SLATE = '#3F4B5C';
const MUTED = '#64748B';
const HAIRLINE = '#D6DEE7';
const ACCENT_BLUE = '#3B6EA5';
const PANEL = '#F4F7FA';

export const EuropassLegacyTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const headingFont = theme.fontHeading || 'Georgia, "Times New Roman", serif';
  const bodyFont = theme.fontBody || 'Inter, Helvetica, Arial, sans-serif';
  const { personalInfo, countryCVInfo = {} } = resume;

  const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
    <div
      className="flex items-center gap-2 border-b pb-2 mb-3"
      style={{ borderColor: HAIRLINE, breakAfter: 'avoid', pageBreakAfter: 'avoid' }}
    >
      <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ backgroundColor: ACCENT_BLUE }} />
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: NAVY, fontFamily: headingFont }}
      >
        {title}
      </h2>
    </div>
  );

  // ── Personal Information — fixed, aligned label/value grid ──
  const addressValue = [
    countryCVInfo.address,
    countryCVInfo.city,
    countryCVInfo.postalCode,
    countryCVInfo.country || personalInfo.location,
  ]
    .filter(Boolean)
    .join(', ');

  const personalInfoRows: { label: string; value?: string }[] = [
    { label: 'Full Name', value: personalInfo.fullName },
    { label: 'Address', value: addressValue },
    { label: 'Telephone', value: personalInfo.phone },
    { label: 'Email', value: personalInfo.email },
    { label: 'Date of Birth', value: countryCVInfo.dateOfBirth },
    { label: 'Nationality', value: countryCVInfo.nationality },
    { label: 'Place of Birth', value: countryCVInfo.placeOfBirth },
    { label: 'Gender', value: countryCVInfo.gender },
  ].filter((row) => Boolean(row.value && row.value.trim()));

  // ── Language Skills — cefrLanguages (real 5-skill matrix) preferred,
  // falling back to simpleLanguages, falling back to the flat resume.languages
  // list — identical merge precedence to RomaniaProfessionalTemplate, so a
  // resume with only basic language data still shows something sensible.
  const displayLanguages: FormattedLanguageItem[] = (
    countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0
      ? countryCVInfo.cefrLanguages.map((l) => ({
          language: l.language,
          listening: l.listening || 'A2',
          reading: l.reading || 'A2',
          spokenProduction: l.spokenProduction || l.spokenInteraction || 'A2',
          spokenInteraction: l.spokenInteraction || l.spokenProduction || 'A2',
          writing: l.writing || 'A2',
        }))
      : countryCVInfo.simpleLanguages && countryCVInfo.simpleLanguages.length > 0
      ? countryCVInfo.simpleLanguages.map((l) => {
          const lvl = l.cefrLevel || 'A2';
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
          const lvl = l.level || 'A2';
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

  // ── Driving Licence — only rendered if any real data is present, per
  // "no empty placeholder should appear" ──
  const hasDrivingLicence = Boolean(
    countryCVInfo.drivingLicense ||
      (countryCVInfo.drivingLicenseDetails &&
        (countryCVInfo.drivingLicenseDetails.licenseType || countryCVInfo.drivingLicenseDetails.country))
  );

  const declarationText =
    countryCVInfo.declaration && countryCVInfo.declaration.trim()
      ? countryCVInfo.declaration.replace(/BELEIF/gi, 'BELIEF')
      : 'I HEREBY DECLARE THAT THE INFORMATION GIVEN IN THIS CV IS TRUE AND HONEST TO MY KNOWLEDGE AND BELIEF.';

  // ── Skills — document-style grouped list, not colorful pills ──
  const skillGroups = groupSkillsByCategory(resume.skills || []);

  const digitalSkillNames: string[] = [];
  const seenDigital = new Set<string>();
  const addDigital = (raw?: string) => {
    if (!raw) return;
    const clean = raw.replace(/\s*\([^)]*\)/g, '').trim();
    if (clean && !seenDigital.has(clean.toLowerCase())) {
      seenDigital.add(clean.toLowerCase());
      digitalSkillNames.push(clean);
    }
  };
  (countryCVInfo.structuredDigitalSkills || []).forEach((s) => addDigital(typeof s === 'object' ? s.name || s.skill : s));
  (countryCVInfo.digitalSkills || []).forEach((s) => addDigital(s));

  const otherSkillNames: string[] = [];
  const seenOther = new Set<string>();
  const addOther = (raw?: string) => {
    if (!raw) return;
    const clean = raw.trim();
    if (clean && !seenOther.has(clean.toLowerCase())) {
      seenOther.add(clean.toLowerCase());
      otherSkillNames.push(clean);
    }
  };
  (countryCVInfo.structuredSoftwareSkills || []).forEach((s) => addOther(typeof s === 'object' ? s.name || s.skill : s));
  if (countryCVInfo.otherSkills) countryCVInfo.otherSkills.split(/[,|\n]/).forEach((s) => addOther(s));

  // ── Every manageable section, rendered as one atomic break-inside-avoid
  // block per topic (heading + all entries together) — this is what
  // guarantees a section heading is never orphaned from its own entries
  // when A4PageContainer measures and packs these blocks onto pages. ──
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Professional Profile" />
        <p className="text-[11px] leading-[1.6] whitespace-pre-line" style={{ color: SLATE }}>
          {resume.summary}
        </p>
      </section>
    ),
    experience: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Work Experience" />
        <div className="space-y-3.5">
          {(resume.experience || []).map((exp, idx) => {
            const dateStr = formatDateRange(exp.startDate, exp.endDate, exp.current);
            return (
              <div key={exp._id || idx} className="text-[11px]">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="text-[12px] font-bold" style={{ color: NAVY_DEEP }}>
                    {exp.role || 'Role'}
                  </h3>
                  {dateStr && (
                    <span className="text-[10px] font-medium shrink-0" style={{ color: MUTED }}>
                      {dateStr}
                    </span>
                  )}
                </div>
                <p className="font-semibold" style={{ color: SLATE }}>
                  {exp.company}
                  {exp.location && <span className="font-normal"> · {exp.location}</span>}
                </p>
                {exp.description && (
                  <>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                      Main activities and responsibilities
                    </p>
                    <ul className="mt-0.5 space-y-0.5 list-none">
                      {toBulletLines(exp.description).map((line, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-1.5 leading-snug" style={{ color: SLATE }}>
                          <span className="mt-[6px] h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: ACCENT_BLUE }} />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <ResumeLink href={exp.link} label="Company Link" color={ACCENT_BLUE} className="mt-0.5 inline-block" />
              </div>
            );
          })}
        </div>
      </section>
    ),
    internships: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Internships" />
        <div className="space-y-3">
          {(resume.internships || []).map((it, idx) => (
            <div key={it._id || idx} className="text-[11px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className="font-bold" style={{ color: NAVY_DEEP }}>{it.role || 'Role'}</h3>
                <span className="text-[10px] font-medium shrink-0" style={{ color: MUTED }}>
                  {formatDateRange(it.startDate, it.endDate, it.current)}
                </span>
              </div>
              <p className="font-semibold" style={{ color: SLATE }}>{it.company}{it.location && ` · ${it.location}`}</p>
              {it.description && <p className="mt-0.5" style={{ color: SLATE }}>{it.description}</p>}
              <ResumeLink href={it.link} label="Company Link" color={ACCENT_BLUE} className="mt-0.5 inline-block" />
            </div>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Volunteer Experience" />
        <div className="space-y-3">
          {(resume.volunteering || []).map((v, idx) => (
            <div key={v._id || idx} className="text-[11px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className="font-bold" style={{ color: NAVY_DEEP }}>{v.role || 'Role'}</h3>
                <span className="text-[10px] font-medium shrink-0" style={{ color: MUTED }}>
                  {formatDateRange(v.startDate, v.endDate, v.current)}
                </span>
              </div>
              <p className="font-semibold" style={{ color: SLATE }}>{v.organization}{v.location && ` · ${v.location}`}</p>
              {v.description && <p className="mt-0.5" style={{ color: SLATE }}>{v.description}</p>}
              <ResumeLink href={v.link} label="Organization Link" color={ACCENT_BLUE} className="mt-0.5 inline-block" />
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Education and Training" />
        <div className="space-y-3">
          {(resume.education || []).map((edu, idx) => (
            <div key={edu._id || idx} className="text-[11px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h3 className="font-bold" style={{ color: NAVY_DEEP }}>{edu.degree || 'Degree'}</h3>
                <span className="text-[10px] font-medium shrink-0" style={{ color: MUTED }}>
                  {formatDateRange(edu.startDate, edu.endDate)}
                </span>
              </div>
              {edu.institution && <p className="font-semibold" style={{ color: SLATE }}>{edu.institution}</p>}
              {edu.description && <p className="mt-0.5 whitespace-pre-line" style={{ color: SLATE }}>{edu.description}</p>}
              <ResumeLink href={edu.link} label="Institution Website" color={ACCENT_BLUE} className="mt-0.5 inline-block" />
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Projects" />
        <div className="space-y-3">
          {(resume.projects || []).map((p, idx) => (
            <div key={p._id || idx} className="text-[11px]">
              <h3 className="font-bold" style={{ color: NAVY_DEEP }}>{p.title}</h3>
              {p.technologies && (
                <p className="text-[10px]" style={{ color: MUTED }}>{p.technologies}</p>
              )}
              {p.description && <p className="mt-0.5" style={{ color: SLATE }}>{p.description}</p>}
              <ResumeLink href={p.link} label="View Project" color={ACCENT_BLUE} className="mt-0.5 inline-block" />
            </div>
          ))}
        </div>
      </section>
    ),
    skills: () => {
      if (skillGroups.length === 0 && digitalSkillNames.length === 0 && otherSkillNames.length === 0) return null;
      return (
        <section className="break-inside-avoid">
          <SectionHeading title="Skills" />
          <div className="space-y-1.5 text-[11px]">
            {skillGroups.map((group) => (
              <p key={group.category}>
                <span className="font-semibold" style={{ color: NAVY_DEEP }}>{group.category}:</span>{' '}
                <span style={{ color: SLATE }}>{group.skills.map((s) => s.name).join(', ')}</span>
              </p>
            ))}
            {digitalSkillNames.length > 0 && (
              <p>
                <span className="font-semibold" style={{ color: NAVY_DEEP }}>Digital Skills:</span>{' '}
                <span style={{ color: SLATE }}>{digitalSkillNames.join(', ')}</span>
              </p>
            )}
            {otherSkillNames.length > 0 && (
              <p>
                <span className="font-semibold" style={{ color: NAVY_DEEP }}>Additional Skills:</span>{' '}
                <span style={{ color: SLATE }}>{otherSkillNames.join(', ')}</span>
              </p>
            )}
          </div>
        </section>
      );
    },
    certifications: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Certifications" />
        <div className="space-y-1.5 text-[11px]">
          {(resume.certifications || []).map((c, idx) => (
            <div key={c._id || idx} className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-bold" style={{ color: NAVY_DEEP }}>{c.name}</span>
              {c.issuer && <span style={{ color: SLATE }}> — {c.issuer}</span>}
              {c.year && <span style={{ color: MUTED }}> ({c.year})</span>}
              <ResumeLink href={c.link} label="View Credential" color={ACCENT_BLUE} />
            </div>
          ))}
        </div>
      </section>
    ),
    achievements: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Achievements" />
        <div className="space-y-1 text-[11px]" style={{ color: SLATE }}>
          {(resume.achievements || []).map((a, idx) => (
            <p key={a._id || idx}>
              <span className="font-semibold" style={{ color: NAVY_DEEP }}>{a.title}</span>
              {a.year && ` (${a.year})`}{a.description && ` — ${a.description}`}{' '}
              <ResumeLink href={a.link} label="View Proof" color={ACCENT_BLUE} />
            </p>
          ))}
        </div>
      </section>
    ),
    publications: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Publications" />
        <div className="space-y-1 text-[11px]" style={{ color: SLATE }}>
          {(resume.publications || []).map((p, idx) => (
            <p key={p._id || idx}>
              <span className="font-semibold" style={{ color: NAVY_DEEP }}>{p.title}</span>
              {p.publisher && `, ${p.publisher}`}{p.year && ` (${p.year})`}{' '}
              <ResumeLink href={p.link} label="View Publication" color={ACCENT_BLUE} />
            </p>
          ))}
        </div>
      </section>
    ),
    trainings: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Trainings" />
        <div className="space-y-1 text-[11px]" style={{ color: SLATE }}>
          {(resume.trainings || []).map((t, idx) => (
            <p key={t._id || idx}>
              <span className="font-semibold" style={{ color: NAVY_DEEP }}>{t.title}</span>
              {t.provider && `, ${t.provider}`}{' '}
              <ResumeLink href={t.link} label="View Course" color={ACCENT_BLUE} />
            </p>
          ))}
        </div>
      </section>
    ),
    scholarships: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Scholarships" />
        <div className="space-y-1 text-[11px]" style={{ color: SLATE }}>
          {(resume.scholarships || []).map((s, idx) => (
            <p key={s._id || idx}>
              <span className="font-semibold" style={{ color: NAVY_DEEP }}>{s.title}</span>
              {s.institution && `, ${s.institution}`}{s.year && ` (${s.year})`}{' '}
              <ResumeLink href={s.link} label="View Award" color={ACCENT_BLUE} />
            </p>
          ))}
        </div>
      </section>
    ),
    positionsOfResponsibility: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Positions of Responsibility" />
        <div className="space-y-1 text-[11px]" style={{ color: SLATE }}>
          {(resume.positionsOfResponsibility || []).map((p, idx) => (
            <p key={p._id || idx}>
              <span className="font-semibold" style={{ color: NAVY_DEEP }}>{p.title}</span>
              {p.organization && `, ${p.organization}`} ({formatDateRange(p.startDate, p.endDate)}){' '}
              <ResumeLink href={p.link} label="Organization Link" color={ACCENT_BLUE} />
            </p>
          ))}
        </div>
      </section>
    ),
    hobbies: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="Hobbies" />
        <p className="text-[11px]" style={{ color: SLATE }}>{(resume.hobbies || []).join(', ')}</p>
      </section>
    ),
    references: () => (
      <section className="break-inside-avoid">
        <SectionHeading title="References" />
        <div className="space-y-1 text-[11px]" style={{ color: SLATE }}>
          {(resume.references || []).map((ref, idx) => (
            <p key={ref._id || idx}>
              <span className="font-semibold" style={{ color: NAVY_DEEP }}>{ref.name}</span>
              {ref.relationship && `, ${ref.relationship}`} — {[ref.company, ref.email, ref.phone].filter(Boolean).join(', ')}{' '}
              <ResumeLink href={ref.link} label="Profile" color={ACCENT_BLUE} />
            </p>
          ))}
        </div>
      </section>
    ),
  };

  const visible = getVisibleOrderedSections(resume);

  return (
    <div
      className="mx-auto w-full max-w-[800px] bg-white text-xs leading-relaxed print:max-w-none"
      style={{ fontFamily: bodyFont, color: SLATE }}
    >
      {/* ── HEADER: small cropped photo, modest name, target role, compact contact line ── */}
      <header className="border-b p-6 sm:p-8 print:p-6" style={{ borderColor: HAIRLINE }}>
        <div className="flex items-start gap-5">
          {personalInfo.photo && (
            <div className="shrink-0 h-[92px] w-[76px] overflow-hidden rounded-sm border" style={{ borderColor: HAIRLINE }}>
              <img
                src={personalInfo.photo}
                alt={personalInfo.fullName || 'Candidate Photo'}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1
              className="text-[20px] sm:text-[22px] font-semibold leading-tight"
              style={{ color: NAVY_DEEP, fontFamily: headingFont }}
            >
              {personalInfo.fullName || 'Candidate Name'}
            </h1>
            {resume.targetRole && (
              <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: ACCENT_BLUE }}>
                {resume.targetRole}
              </p>
            )}
            {(personalInfo.email || personalInfo.phone) && (
              <p className="mt-2 text-[10.5px]" style={{ color: MUTED }}>
                {[personalInfo.email, personalInfo.phone].filter(Boolean).join('   ·   ')}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ── SECTIONS ── */}
      <div className="p-6 sm:p-8 print:p-6 space-y-3.5">
        {/* Personal Information — fixed, second, aligned label/value grid */}
        {personalInfoRows.length > 0 && (
          <div className="break-inside-avoid">
            <SectionHeading title="Personal Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              {personalInfoRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="font-semibold" style={{ color: MUTED }}>{row.label}</span>
                  <span style={{ color: SLATE }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {visible.map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="break-inside-avoid">
                <SectionHeading title={custom.title || sectionLabel(resume, id)} />
                <p className="text-[11px] whitespace-pre-wrap" style={{ color: SLATE }}>{custom.content}</p>
                <ResumeLink href={custom.link} label="Learn More" color={ACCENT_BLUE} className="mt-0.5 inline-block" />
              </section>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}

        {/* Language Skills — fixed, after the reorderable loop */}
        {(countryCVInfo.motherTongue || displayLanguages.length > 0) && (
          <EuropassLanguageSkillsTable
            motherTongue={countryCVInfo.motherTongue}
            languages={displayLanguages}
            inkColor={NAVY_DEEP}
            slateColor={SLATE}
            accentColor={ACCENT_BLUE}
            hairlineColor={HAIRLINE}
            panelColor={PANEL}
          />
        )}

        {/* Driving Licence — fixed, after Language Skills, only if present */}
        {hasDrivingLicence && (
          <section className="break-inside-avoid">
            <SectionHeading title="Driving Licence" />
            <p className="text-[11px]" style={{ color: SLATE }}>
              <span className="font-semibold" style={{ color: NAVY_DEEP }}>Category:</span>{' '}
              <span className="font-bold" style={{ color: NAVY_DEEP }}>
                {countryCVInfo.drivingLicenseDetails?.licenseType || countryCVInfo.drivingLicense}
              </span>
              {countryCVInfo.drivingLicenseDetails?.country && (
                <span> · Country: {countryCVInfo.drivingLicenseDetails.country}</span>
              )}
              {countryCVInfo.drivingLicenseDetails?.issueDate && (
                <span> · Issue Date: {countryCVInfo.drivingLicenseDetails.issueDate}</span>
              )}
              {countryCVInfo.drivingLicenseDetails?.expiryDate && (
                <span> · Expiry Date: {countryCVInfo.drivingLicenseDetails.expiryDate}</span>
              )}
            </p>
          </section>
        )}

        {/* Declaration — always last, never reorderable, never split across pages */}
        <section className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <SectionHeading title="Declaration" />
          <p
            className="text-[10px] sm:text-[10.5px] leading-relaxed p-3"
            style={{ color: NAVY_DEEP, backgroundColor: PANEL, border: `1px solid ${HAIRLINE}` }}
          >
            {declarationText}
          </p>
        </section>
      </div>
    </div>
  );
};

export default EuropassLegacyTemplate;
