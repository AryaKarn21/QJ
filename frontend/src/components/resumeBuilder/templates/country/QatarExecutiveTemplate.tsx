import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { ResumeLink } from '../shared/ResumeLink';

interface Props {
  resume: Resume;
}

export const QatarExecutiveTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo, countryCVInfo = {} } = resume;

  return (
    <div
      className="mx-auto min-h-[1050px] w-full max-w-[800px] bg-white text-slate-800 p-8 sm:p-12 shadow-sm print:shadow-none font-sans"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Header Banner with Navy and Orange styling */}
      <div className="border-b-4 border-slate-900 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-orange-600">
              Executive Profile • Gulf Region
            </span>
            <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              {personalInfo.fullName || 'Executive Candidate'}
            </h1>
            <p className="mt-1 text-base font-bold text-slate-700">
              {resume.targetRole || 'Senior Executive / Director'}
            </p>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-600">
              {personalInfo.email && <p><span className="font-semibold text-slate-900">Email:</span> {personalInfo.email}</p>}
              {personalInfo.phone && <p><span className="font-semibold text-slate-900">Mobile:</span> {personalInfo.phone}</p>}
              {(countryCVInfo.currentLocation || personalInfo.location) && (
                <p><span className="font-semibold text-slate-900">Location:</span> {countryCVInfo.currentLocation || personalInfo.location}</p>
              )}
              {countryCVInfo.nationality && (
                <p><span className="font-semibold text-slate-900">Nationality:</span> {countryCVInfo.nationality}</p>
              )}
              {countryCVInfo.visaStatus && (
                <p><span className="font-semibold text-slate-900">Status:</span> {countryCVInfo.visaStatus}</p>
              )}
              {countryCVInfo.noticePeriod && (
                <p><span className="font-semibold text-slate-900">Notice:</span> {countryCVInfo.noticePeriod}</p>
              )}
            </div>
          </div>

          {personalInfo.photo && (
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-slate-800 shadow-md">
              <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {resume.summary && (
        <section className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2">
            Executive Summary
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {/* Core Leadership & Functional Competencies Grid */}
      {resume.skills && resume.skills.length > 0 && (
        <section className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-3">
            Core Leadership & Strategic Competencies
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {resume.skills.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded bg-slate-50 border border-slate-200 px-3 py-1.5 font-medium text-slate-800">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <span className="truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Career History / Executive Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mt-6 border-b border-slate-200 pb-5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-4">
            Professional Career History
          </h2>
          <div className="space-y-5">
            {resume.experience.map((exp, i) => (
              <div key={exp._id || i} className="relative pl-4 border-l-2 border-slate-900">
                <div className="flex flex-wrap justify-between items-baseline gap-1">
                  <h3 className="text-sm font-bold text-slate-900">{exp.role}</h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <p className="text-xs font-bold text-orange-600">
                  {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                </p>
                {exp.description && (
                  <div className="mt-2 text-xs text-slate-700 space-y-1.5">
                    {toBulletLines(exp.description).map((line, lIdx) => (
                      <p key={lIdx} className="flex items-start gap-2">
                        <span className="text-slate-400 font-bold mt-0.5">•</span>
                        <span>{line}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education & Professional Memberships */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {resume.education && resume.education.length > 0 && (
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Education & Degrees
            </h2>
            <div className="space-y-2 text-xs">
              {resume.education.map((edu, i) => (
                <div key={edu._id || i}>
                  <p className="font-bold text-slate-900">{edu.degree}</p>
                  <p className="text-slate-600">{edu.institution} ({edu.startDate} – {edu.endDate})</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {countryCVInfo.memberships && countryCVInfo.memberships.length > 0 && (
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Professional Affiliations
            </h2>
            <div className="space-y-2 text-xs">
              {countryCVInfo.memberships.map((m, i) => (
                <div key={i}>
                  <p className="font-bold text-slate-900">{m.organization}</p>
                  <p className="text-slate-600">{m.membershipType} {m.year ? `(${m.year})` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
