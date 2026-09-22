import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { ResumeLink } from '../shared/ResumeLink';

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
          <span className="text-[11px] font-bold uppercase tracking-widest text-orange-600">Curriculum Vitae</span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          <p className="mt-1 text-base font-semibold text-slate-700">
            {resume.targetRole || 'Professional Title'}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            {personalInfo.email && (
              <p><span className="font-semibold text-slate-800">Email:</span> {personalInfo.email}</p>
            )}
            {personalInfo.phone && (
              <p><span className="font-semibold text-slate-800">Phone:</span> {personalInfo.phone}</p>
            )}
            {(personalInfo.location || countryCVInfo.city || countryCVInfo.country) && (
              <p>
                <span className="font-semibold text-slate-800">Address:</span>{' '}
                {[countryCVInfo.address, countryCVInfo.city, countryCVInfo.country || personalInfo.location]
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
            {countryCVInfo.drivingLicense && (
              <p><span className="font-semibold text-slate-800">Driving Licence:</span> {countryCVInfo.drivingLicense}</p>
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

      {/* Languages (CEFR Matrix) */}
      <div className="mt-6 border-b border-slate-200 pb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
          Language Skills
        </h2>
        <div className="pl-4 space-y-3">
          {countryCVInfo.motherTongue && (
            <p className="text-xs">
              <span className="font-bold text-slate-700">Mother tongue(s):</span>{' '}
              <span className="font-medium text-slate-900">{countryCVInfo.motherTongue}</span>
            </p>
          )}

          {countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Other Language</th>
                    <th className="py-2 px-2">Listening</th>
                    <th className="py-2 px-2">Reading</th>
                    <th className="py-2 px-2">Interaction</th>
                    <th className="py-2 px-2">Production</th>
                    <th className="py-2 px-2">Writing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {countryCVInfo.cefrLanguages.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 font-medium text-slate-700">
                      <td className="py-2 px-3 font-semibold text-slate-900">{l.language}</td>
                      <td className="py-2 px-2 text-orange-600 font-bold">{l.listening}</td>
                      <td className="py-2 px-2 text-orange-600 font-bold">{l.reading}</td>
                      <td className="py-2 px-2 text-orange-600 font-bold">{l.spokenInteraction}</td>
                      <td className="py-2 px-2 text-orange-600 font-bold">{l.spokenProduction}</td>
                      <td className="py-2 px-2 text-orange-600 font-bold">{l.writing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[10px] text-slate-400 italic">
                Levels: A1 and A2: Basic user - B1 and B2: Independent user - C1 and C2: Proficient user
              </p>
            </div>
          ) : resume.languages && resume.languages.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {resume.languages.map((l, i) => (
                <span key={i} className="rounded border border-slate-200 px-2.5 py-1 text-slate-700">
                  <strong className="text-slate-900">{l.name}:</strong> {l.level}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Digital Skills & Other Skills */}
      {((countryCVInfo.digitalSkills?.length || 0) > 0 || (resume.skills?.length || 0) > 0 || countryCVInfo.otherSkills) && (
        <div className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
            Digital & Technical Skills
          </h2>
          <div className="pl-4 space-y-3">
            {countryCVInfo.digitalSkills && countryCVInfo.digitalSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {countryCVInfo.digitalSkills.map((s, idx) => (
                  <span key={idx} className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800">
                    {s}
                  </span>
                ))}
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
