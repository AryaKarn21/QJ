import React from 'react';
import type { Resume } from '../../resumeApi';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';

interface Props {
  resume: Resume;
}

export const RomaniaAtsTemplate: React.FC<Props> = ({ resume }) => {
  const { personalInfo, countryCVInfo = {} } = resume;

  return (
    <div className="mx-auto min-h-[1050px] w-full max-w-[800px] bg-white text-slate-900 p-8 sm:p-12 font-serif leading-normal shadow-sm print:shadow-none">
      {/* Header */}
      <div className="border-b border-slate-900 pb-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-black uppercase">
          {personalInfo.fullName || 'YOUR NAME'}
        </h1>
        {resume.targetRole && (
          <p className="text-sm font-semibold text-slate-800 mt-0.5">{resume.targetRole}</p>
        )}
        <div className="mt-2 text-xs text-slate-700 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>• {personalInfo.phone}</span>}
          {(personalInfo.location || countryCVInfo.city || countryCVInfo.country) && (
            <span>
              • {[countryCVInfo.city, countryCVInfo.country || personalInfo.location].filter(Boolean).join(', ')}
            </span>
          )}
          {countryCVInfo.nationality && <span>• Nationality: {countryCVInfo.nationality}</span>}
          {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
        </div>
      </div>

      {/* Profile */}
      {resume.summary && (
        <section className="mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-slate-400 pb-0.5 mb-1.5">
            Professional Summary
          </h2>
          <p className="text-xs text-slate-800 leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {/* Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-slate-400 pb-0.5 mb-2">
            Work Experience
          </h2>
          <div className="space-y-3">
            {resume.experience.map((exp, i) => (
              <div key={exp._id || i}>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-bold text-slate-950">{exp.role}</span>
                  <span className="text-slate-600 font-medium">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs italic text-slate-700">
                  <span>{exp.company}</span>
                  {exp.location && <span>{exp.location}</span>}
                </div>
                {exp.description && (
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-800 space-y-0.5">
                    {toBulletLines(exp.description).map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <section className="mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-slate-400 pb-0.5 mb-2">
            Education and Training
          </h2>
          <div className="space-y-2.5">
            {resume.education.map((edu, i) => (
              <div key={edu._id || i} className="text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-950">{edu.degree}</span>
                  <span className="text-slate-600">
                    {edu.startDate} – {edu.endDate}
                  </span>
                </div>
                <p className="italic text-slate-700">{edu.institution}</p>
                {edu.description && <p className="mt-0.5 text-slate-700">{edu.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Languages (CEFR) */}
      <section className="mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-slate-400 pb-0.5 mb-1.5">
          Languages
        </h2>
        <div className="text-xs text-slate-800 space-y-1">
          {countryCVInfo.motherTongue && (
            <p><strong>Mother Tongue:</strong> {countryCVInfo.motherTongue}</p>
          )}
          {countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0 ? (
            <div className="space-y-0.5">
              {countryCVInfo.cefrLanguages.map((l, i) => (
                <p key={i}>
                  <strong>{l.language}:</strong> CEFR Level {l.listening} (Listening: {l.listening}, Reading: {l.reading}, Spoken: {l.spokenInteraction}, Writing: {l.writing})
                </p>
              ))}
            </div>
          ) : resume.languages && resume.languages.length > 0 ? (
            <p>
              {resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}
            </p>
          ) : null}
        </div>
      </section>

      {/* Skills */}
      {(countryCVInfo.digitalSkills?.length || 0) > 0 || (resume.skills?.length || 0) > 0 ? (
        <section className="mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-slate-400 pb-0.5 mb-1.5">
            Skills & Competencies
          </h2>
          <div className="text-xs text-slate-800 space-y-1">
            {countryCVInfo.digitalSkills && countryCVInfo.digitalSkills.length > 0 && (
              <p><strong>Digital Skills:</strong> {countryCVInfo.digitalSkills.join(', ')}</p>
            )}
            {resume.skills && resume.skills.length > 0 && (
              <p><strong>Technical & Professional:</strong> {resume.skills.map((s) => s.name).join(', ')}</p>
            )}
            {countryCVInfo.drivingLicense && (
              <p><strong>Driving License:</strong> {countryCVInfo.drivingLicense}</p>
            )}
          </div>
        </section>
      ) : null}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <section className="mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black border-b border-slate-400 pb-0.5 mb-1.5">
            Certifications
          </h2>
          <ul className="list-disc pl-4 text-xs text-slate-800 space-y-0.5">
            {resume.certifications.map((c, i) => (
              <li key={c._id || i}>
                <strong>{c.name}</strong> — {c.issuer} {c.year ? `(${c.year})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
