import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { ResumeLink } from '../shared/ResumeLink';

interface Props {
  resume: Resume;
}

export const QatarProfessionalTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo, countryCVInfo = {} } = resume;

  const hasRecruiterSnapshot =
    countryCVInfo.currentLocation ||
    countryCVInfo.nationality ||
    countryCVInfo.visaStatus ||
    countryCVInfo.noticePeriod ||
    countryCVInfo.availability ||
    countryCVInfo.drivingLicense;

  return (
    <div
      className="mx-auto min-h-[1050px] w-full max-w-[800px] bg-white text-slate-800 p-8 sm:p-10 shadow-sm print:shadow-none font-sans"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 uppercase">
            {personalInfo.fullName || 'Candidate Name'}
          </h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-orange-600">
            {resume.targetRole || 'Professional Title / Target Role'}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {personalInfo.email && <p><span className="font-semibold text-slate-800">Email:</span> {personalInfo.email}</p>}
            {personalInfo.phone && <p><span className="font-semibold text-slate-800">Mobile:</span> {personalInfo.phone}</p>}
            {countryCVInfo.dateOfBirth && <p><span className="font-semibold text-slate-800">DOB:</span> {countryCVInfo.dateOfBirth}</p>}
            {countryCVInfo.placeOfBirth && <p><span className="font-semibold text-slate-800">Birthplace:</span> {countryCVInfo.placeOfBirth}</p>}
            {countryCVInfo.nationality && <p><span className="font-semibold text-slate-800">Nationality:</span> {countryCVInfo.nationality}</p>}
            {countryCVInfo.gender && <p><span className="font-semibold text-slate-800">Gender:</span> {countryCVInfo.gender}</p>}
            {countryCVInfo.passportNumber && <p><span className="font-semibold text-slate-800">Passport:</span> {countryCVInfo.passportNumber}</p>}
            {(countryCVInfo.currentLocation || personalInfo.location) && (
              <p><span className="font-semibold text-slate-800">Location:</span> {countryCVInfo.currentLocation || personalInfo.location}</p>
            )}
            {personalInfo.linkedin && (
              <div className="pt-0.5">
                <ResumeLink url={personalInfo.linkedin} label="LinkedIn Profile" />
              </div>
            )}
          </div>
        </div>

        {personalInfo.photo && (
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm">
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* Recruiter Snapshot Card (Gulf standard) */}
      {hasRecruiterSnapshot && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/50 p-3.5 text-xs shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-800 mb-2">
            Recruiter Snapshot & Candidate Status
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-slate-700">
            {countryCVInfo.currentLocation && (
              <div>
                <span className="font-semibold text-slate-900">Current Location:</span> {countryCVInfo.currentLocation}
              </div>
            )}
            {countryCVInfo.nationality && (
              <div>
                <span className="font-semibold text-slate-900">Nationality:</span> {countryCVInfo.nationality}
              </div>
            )}
            {countryCVInfo.visaStatus && (
              <div>
                <span className="font-semibold text-slate-900">Visa / Work Status:</span> {countryCVInfo.visaStatus}
              </div>
            )}
            {countryCVInfo.noticePeriod && (
              <div>
                <span className="font-semibold text-slate-900">Notice Period:</span> {countryCVInfo.noticePeriod}
              </div>
            )}
            {countryCVInfo.availability && (
              <div>
                <span className="font-semibold text-slate-900">Earliest Availability:</span> {countryCVInfo.availability}
              </div>
            )}
            {countryCVInfo.drivingLicense && (
              <div>
                <span className="font-semibold text-slate-900">Driving License:</span> {countryCVInfo.drivingLicense}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Summary */}
      {resume.summary && (
        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-orange-500 pb-1 mb-2">
            Executive Summary
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {/* Core Competencies (Skill chips) */}
      {resume.skills && resume.skills.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-orange-500 pb-1 mb-2">
            Core Competencies & Key Skills
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.map((s, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Professional Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-orange-500 pb-1 mb-3">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {resume.experience.map((exp, i) => (
              <div key={exp._id || i} className="relative pl-3.5 border-l-2 border-slate-300">
                <div className="flex flex-wrap justify-between items-baseline gap-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{exp.role}</h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-orange-600">
                  {exp.company}
                  {exp.location ? ` • ${exp.location}` : ''}
                </p>
                {exp.description && (
                  <div className="mt-1.5 text-xs text-slate-600 space-y-1">
                    {toBulletLines(exp.description).map((line, lIdx) => (
                      <p key={lIdx} className="flex items-start gap-1.5">
                        <span className="text-orange-500 font-bold">•</span>
                        <span>{line}</span>
                      </p>
                    ))}
                  </div>
                )}
                {exp.link && (
                  <div className="mt-1">
                    <ResumeLink url={exp.link} label="Role details / Project reference" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-orange-500 pb-1 mb-2.5">
            Education & Academic Credentials
          </h2>
          <div className="space-y-2.5">
            {resume.education.map((edu, i) => (
              <div key={edu._id || i} className="text-xs flex justify-between items-baseline">
                <div>
                  <p className="font-bold text-slate-900">{edu.degree}</p>
                  <p className="text-slate-600">{edu.institution}</p>
                </div>
                <span className="text-slate-500 font-medium shrink-0">
                  {edu.startDate} – {edu.endDate}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications & Professional Memberships */}
      {((resume.certifications?.length || 0) > 0 || (countryCVInfo.memberships?.length || 0) > 0) && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {resume.certifications && resume.certifications.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-orange-500 pb-1 mb-2">
                Certifications
              </h2>
              <div className="space-y-1.5 text-xs">
                {resume.certifications.map((c, i) => (
                  <div key={c._id || i} className="rounded border border-slate-200 p-2 bg-slate-50">
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-[11px] text-slate-500">{c.issuer} {c.year ? `(${c.year})` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {countryCVInfo.memberships && countryCVInfo.memberships.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-orange-500 pb-1 mb-2">
                Professional Memberships
              </h2>
              <div className="space-y-1.5 text-xs">
                {countryCVInfo.memberships.map((m, i) => (
                  <div key={i} className="rounded border border-slate-200 p-2 bg-slate-50">
                    <p className="font-bold text-slate-800">{m.organization}</p>
                    <p className="text-[11px] text-slate-500">{m.membershipType} {m.year ? `• ${m.year}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Languages */}
      {resume.languages && resume.languages.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-orange-500 pb-1 mb-2">
            Languages
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {resume.languages.map((l, i) => (
              <span key={i} className="rounded border border-slate-200 px-2.5 py-1 text-slate-700">
                <strong className="text-slate-900">{l.name}:</strong> {l.level}
              </span>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
