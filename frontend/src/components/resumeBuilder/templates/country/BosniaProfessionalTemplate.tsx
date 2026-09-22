import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { EuropassLogo } from './EuropassLogo';

interface Props {
  resume: Resume;
}

export const BosniaProfessionalTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo = {} as any, countryCVInfo = {} } = resume;

  // Personal metadata items for European header
  const metaItems: { label: string; value?: string }[] = [
    { label: 'Pasoš / ID', value: countryCVInfo.passportNumber },
    { label: 'Datum rođenja', value: countryCVInfo.dateOfBirth },
    { label: 'Mjesto rođenja', value: countryCVInfo.placeOfBirth },
    { label: 'Nacionalnost', value: countryCVInfo.nationality },
    { label: 'Spol', value: countryCVInfo.gender },
    { label: 'Telefon', value: personalInfo.phone },
    { label: 'Email', value: personalInfo.email },
    {
      label: 'Adresa',
      value: [countryCVInfo.address, countryCVInfo.city, countryCVInfo.country || personalInfo.location]
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
      : 'IZJAVLJUJEM DA SU SVI PODACI NAVEDENI U OVOM ŽIVOTOPISU POTPUNI, ISTINITI I TAČNI PREMA MOM NAJBOLJEM ZNANJU.';

  return (
    <div
      className="mx-auto min-h-[1050px] w-full max-w-[800px] bg-white text-slate-800 p-8 sm:p-10 shadow-sm print:shadow-none print:p-6 font-sans text-xs leading-relaxed"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-start gap-5">
          {/* Candidate Photo */}
          {personalInfo.photo ? (
            <div className="h-24 w-24 sm:h-26 sm:w-26 shrink-0 overflow-hidden rounded-full border-2 border-slate-300 shadow-2xs">
              <img
                src={personalInfo.photo}
                alt={personalInfo.fullName || 'Kandidat'}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-24 w-24 sm:h-26 sm:w-26 shrink-0 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
              {(personalInfo.fullName || 'CV').slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Candidate Name & Personal Information Line */}
          <div className="space-y-1.5 max-w-[430px]">
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
              {personalInfo.fullName || 'Ime i Prezime'}
            </h1>
            {resume.targetRole && (
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                {resume.targetRole}
              </p>
            )}

            {/* Pipe-separated Personal Information */}
            <div className="text-[11px] text-slate-600 leading-normal pt-1">
              {metaItems.map((item, idx) => (
                <span key={item.label}>
                  <span className="font-semibold text-slate-800">{item.label}:</span> {item.value}
                  {idx < metaItems.length - 1 && <span className="mx-1.5 text-slate-400">|</span>}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* TOP-RIGHT European / Europass Logo */}
        <div className="shrink-0 pt-0.5">
          <EuropassLogo width={138} height={34} />
        </div>
      </div>

      {/* ── SECTIONS ── */}
      <div className="space-y-5 mt-6">
        {/* 1. O MENI (ABOUT ME) */}
        {resume.summary && (
          <section>
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1 mb-2.5">
              <span className="text-slate-400 text-xs">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">O MENI</h2>
            </div>
            <p className="text-[11.5px] text-slate-700 leading-relaxed whitespace-pre-line">
              {resume.summary}
            </p>
          </section>
        )}

        {/* 2. OBRAZOVANJE I OSPOSOBLJAVANJE (EDUCATION & TRAINING) */}
        {resume.education && resume.education.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1 mb-2.5">
              <span className="text-slate-400 text-xs">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                OBRAZOVANJE I OSPOSOBLJAVANJE
              </h2>
            </div>
            <div className="space-y-3.5">
              {resume.education.map((edu, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="text-[11px] font-medium text-slate-500">
                    {formatDateRange(edu.startDate, edu.endDate)}
                    {(edu.location || edu.city || edu.country) && (
                      <span className="uppercase">
                        {' '}
                        — {[edu.location || edu.city, edu.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-900">
                    {edu.degree || 'Obrazovanje'} — {edu.institution}
                  </div>
                  {edu.fieldOfStudy && (
                    <div className="text-[11px] text-slate-600">Smjer / Područje: {edu.fieldOfStudy}</div>
                  )}
                  {edu.description && (
                    <div className="text-[11px] text-slate-600">EQF Nivo: {edu.description}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. RADNO ISKUSTVO (WORK EXPERIENCE) */}
        {resume.experience && resume.experience.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1 mb-2.5">
              <span className="text-slate-400 text-xs">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                RADNO ISKUSTVO
              </h2>
            </div>
            <div className="space-y-4">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-[11px] font-medium text-slate-500">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    {(exp.location || exp.city || exp.country) && (
                      <span className="uppercase">
                        {' '}
                        — {[exp.location || exp.city, exp.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-900">
                    {exp.title} — {exp.company}
                  </div>
                  {exp.description && (
                    <ul className="list-disc list-outside pl-4 space-y-1 text-[11px] text-slate-700">
                      {toBulletLines(exp.description).map((line, bIdx) => (
                        <li key={bIdx}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. VJEŠTINE (SKILLS) */}
        {((resume.skills && resume.skills.length > 0) ||
          (countryCVInfo.digitalSkills && countryCVInfo.digitalSkills.length > 0)) && (
          <section>
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1 mb-2.5">
              <span className="text-slate-400 text-xs">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">VJEŠTINE</h2>
            </div>
            <div className="text-[11.5px] text-slate-700 leading-relaxed">
              {[
                ...(resume.skills || []).map((s) => (typeof s === 'string' ? s : s.name)),
                ...(countryCVInfo.digitalSkills || []),
              ]
                .filter(Boolean)
                .join(' | ')}
            </div>
          </section>
        )}

        {/* 5. JEZIČKE VJEŠTINE (LANGUAGE SKILLS - CEFR TABLE) */}
        {(countryCVInfo.motherTongue || (countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0)) && (
          <section>
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1 mb-2.5">
              <span className="text-slate-400 text-xs">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                JEZIČKE VJEŠTINE
              </h2>
            </div>

            {countryCVInfo.motherTongue && (
              <p className="text-[11.5px] font-medium text-slate-800 mb-2.5">
                Maternji jezik: <span className="font-bold uppercase">{countryCVInfo.motherTongue}</span>
              </p>
            )}

            {countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0 && (
              <div className="overflow-x-auto border-t border-b border-slate-300 py-2">
                <table className="w-full text-center text-[10.5px]">
                  <thead>
                    <tr className="border-b border-slate-200 font-bold uppercase text-slate-800">
                      <th className="py-1 text-left w-24"></th>
                      <th colSpan={2} className="py-1 border-r border-slate-200">
                        RAZUMIJEVANJE
                      </th>
                      <th colSpan={2} className="py-1 border-r border-slate-200">
                        GOVOR
                      </th>
                      <th className="py-1">PISANJE</th>
                    </tr>
                    <tr className="text-[9.5px] text-slate-500 border-b border-slate-200">
                      <th className="py-1 text-left"></th>
                      <th className="py-1 font-normal">Slušanje</th>
                      <th className="py-1 font-normal border-r border-slate-200">Čitanje</th>
                      <th className="py-1 font-normal">Govorna produkcija</th>
                      <th className="py-1 font-normal border-r border-slate-200">Govorna interakcija</th>
                      <th className="py-1 font-normal">Pisanje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countryCVInfo.cefrLanguages.map((lang, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 font-medium">
                        <td className="py-1.5 text-left font-bold uppercase text-slate-900">
                          {lang.language}
                        </td>
                        <td className="py-1.5 text-slate-700">{lang.listening}</td>
                        <td className="py-1.5 text-slate-700 border-r border-slate-100">{lang.reading}</td>
                        <td className="py-1.5 text-slate-700">{lang.spokenProduction}</td>
                        <td className="py-1.5 text-slate-700 border-r border-slate-100">
                          {lang.spokenInteraction}
                        </td>
                        <td className="py-1.5 text-slate-700">{lang.writing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[9px] text-slate-400 italic mt-1.5">
                  Nivoi: A1 i A2: Osnovni korisnik — B1 i B2: Samostalni korisnik — C1 i C2: Iskusni korisnik
                </p>
              </div>
            )}
          </section>
        )}

        {/* 6. VOZAČKA DOZVOLA (DRIVING LICENSE — ONLY IF PROVIDED) */}
        {hasDrivingLicense && (
          <section>
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1 mb-2.5">
              <span className="text-slate-400 text-xs">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                VOZAČKA DOZVOLA
              </h2>
            </div>
            <div className="text-[11.5px] text-slate-700">
              <p>
                <span className="font-semibold text-slate-800">Dozvola:</span>{' '}
                {countryCVInfo.drivingLicenseDetails?.licenseType || countryCVInfo.drivingLicense}
                {countryCVInfo.drivingLicenseDetails?.country && (
                  <span> ({countryCVInfo.drivingLicenseDetails.country})</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.licenseNumber && (
                  <span> • Broj: {countryCVInfo.drivingLicenseDetails.licenseNumber}</span>
                )}
                {countryCVInfo.drivingLicenseDetails?.expiryDate && (
                  <span> • Važi do: {countryCVInfo.drivingLicenseDetails.expiryDate}</span>
                )}
              </p>
            </div>
          </section>
        )}

        {/* 7. IZJAVA (DECLARATION) */}
        {declarationText && (
          <section className="pt-2">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1 mb-2">
              <span className="text-slate-400 text-xs">●</span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                IZJAVA
              </h2>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-700 uppercase tracking-wide">
              {declarationText}
            </p>
          </section>
        )}
      </div>
    </div>
  );
};
