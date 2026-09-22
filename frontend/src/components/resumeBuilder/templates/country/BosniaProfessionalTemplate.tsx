import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { ResumeLink } from '../shared/ResumeLink';

interface Props {
  resume: Resume;
}

export const BosniaProfessionalTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo, countryCVInfo = {} } = resume;

  return (
    <div
      className="mx-auto min-h-[1050px] w-full max-w-[800px] bg-white text-slate-800 p-8 sm:p-10 shadow-sm print:shadow-none font-sans"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b-2 border-slate-800 pb-6">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {personalInfo.fullName || 'Vaše Ime'}
          </h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-orange-600">
            {resume.targetRole || 'Stručni Naziv / Pozicija'}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {personalInfo.email && <p><span className="font-semibold text-slate-700">Email:</span> {personalInfo.email}</p>}
            {personalInfo.phone && <p><span className="font-semibold text-slate-700">Telefon:</span> {personalInfo.phone}</p>}
            {(countryCVInfo.city || personalInfo.location) && (
              <p><span className="font-semibold text-slate-700">Lokacija:</span> {countryCVInfo.city || personalInfo.location}</p>
            )}
            {countryCVInfo.nationality && (
              <p><span className="font-semibold text-slate-700">Nacionalnost:</span> {countryCVInfo.nationality}</p>
            )}
            {countryCVInfo.dateOfBirth && (
              <p><span className="font-semibold text-slate-700">Datum rođenja:</span> {countryCVInfo.dateOfBirth}</p>
            )}
            {countryCVInfo.drivingLicense && (
              <p><span className="font-semibold text-slate-700">Vozačka dozvola:</span> {countryCVInfo.drivingLicense}</p>
            )}
          </div>
          {personalInfo.linkedin && (
            <div className="mt-2 text-xs">
              <ResumeLink url={personalInfo.linkedin} label="LinkedIn Profil" />
            </div>
          )}
        </div>

        {personalInfo.photo && (
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm">
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* Profile */}
      {resume.summary && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
            Profesionalni Profil
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {/* Work Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-3">
            Radno Iskustvo
          </h2>
          <div className="space-y-4">
            {resume.experience.map((exp, i) => (
              <div key={exp._id || i} className="relative pl-3 border-l-2 border-orange-500">
                <div className="flex flex-wrap justify-between items-baseline gap-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{exp.role}</h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <p className="text-xs font-medium text-orange-600">
                  {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                </p>
                {exp.description && (
                  <div className="mt-1 text-xs text-slate-600 space-y-1">
                    {toBulletLines(exp.description).map((b, bIdx) => (
                      <p key={bIdx} className="flex items-start gap-1.5">
                        <span className="text-slate-400 font-bold">•</span>
                        <span>{b}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-3">
            Obrazovanje i Obuka
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu, i) => (
              <div key={edu._id || i} className="relative pl-3 border-l-2 border-slate-300 text-xs">
                <div className="flex flex-wrap justify-between items-baseline gap-1">
                  <h3 className="font-bold text-slate-900">{edu.degree}</h3>
                  <span className="text-[11px] text-slate-500">{edu.startDate} – {edu.endDate}</span>
                </div>
                <p className="text-slate-600">{edu.institution}</p>
                {edu.description && <p className="mt-1 text-slate-500">{edu.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Languages (CEFR) */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2.5">
          Jezičke Vještine
        </h2>
        <div className="text-xs space-y-2">
          {countryCVInfo.motherTongue && (
            <p>
              <span className="font-bold text-slate-700">Maternji jezik:</span>{' '}
              <span className="font-medium text-slate-900">{countryCVInfo.motherTongue}</span>
            </p>
          )}
          {countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {countryCVInfo.cefrLanguages.map((l, i) => (
                <div key={i} className="rounded border border-slate-200 p-2 bg-slate-50 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{l.language}</span>
                    <span className="text-orange-600">CEFR {l.listening}</span>
                  </div>
                  <div className="mt-0.5 text-slate-500 flex gap-2">
                    <span>Čitanje: {l.reading}</span>
                    <span>Pisanje: {l.writing}</span>
                    <span>Govor: {l.spokenInteraction}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : resume.languages && resume.languages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {resume.languages.map((l, i) => (
                <span key={i} className="rounded border border-slate-200 px-2 py-0.5 text-slate-700">
                  <strong>{l.name}:</strong> {l.level}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Digital Skills & Certifications */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {(countryCVInfo.digitalSkills?.length || 0) > 0 || (resume.skills?.length || 0) > 0 ? (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Vještine i Tehnologije
            </h2>
            <div className="flex flex-wrap gap-1">
              {(countryCVInfo.digitalSkills || resume.skills.map((s) => s.name)).map((sk, idx) => (
                <span key={idx} className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                  {sk}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {resume.certifications && resume.certifications.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Certifikati
            </h2>
            <div className="space-y-1 text-xs text-slate-700">
              {resume.certifications.map((c, i) => (
                <p key={c._id || i}>
                  <strong className="text-slate-900">{c.name}</strong> ({c.issuer})
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Volunteering & References */}
      {resume.volunteering && resume.volunteering.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
            Volontiranje i Društveni Angažman
          </h2>
          <div className="space-y-1 text-xs text-slate-700">
            {resume.volunteering.map((v, i) => (
              <p key={v._id || i}>
                <strong className="text-slate-900">{v.role}</strong> — {v.organization}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
