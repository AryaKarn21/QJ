import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { ResumeLink } from '../shared/ResumeLink';

interface Props {
  resume: Resume;
}

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const RomaniaProfessionalTemplate: React.FC<Props> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo, countryCVInfo = {} } = resume;

  return (
    <div
      className="mx-auto min-h-[1050px] w-full max-w-[800px] bg-white text-slate-800 shadow-sm print:shadow-none font-sans leading-relaxed"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Top Header Bar */}
      <div className="border-b-4 border-slate-800 p-8 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {personalInfo.fullName || 'Your Name'}
            </h1>
            <p className="mt-1 text-sm sm:text-base font-semibold text-orange-600">
              {resume.targetRole || 'Professional Title'}
            </p>
          </div>

          {personalInfo.photo && (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm">
              <img
                src={personalInfo.photo}
                alt={personalInfo.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Left Column (Personal info, Languages, Skills) */}
        <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/70 p-6 space-y-6">
          {/* Contact Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
              Contact & Details
            </h3>
            <div className="space-y-1.5 text-xs text-slate-600">
              {personalInfo.email && (
                <p className="break-words">
                  <span className="font-semibold text-slate-700">Email:</span> {personalInfo.email}
                </p>
              )}
              {personalInfo.phone && (
                <p>
                  <span className="font-semibold text-slate-700">Phone:</span> {personalInfo.phone}
                </p>
              )}
              {(personalInfo.location || countryCVInfo.city || countryCVInfo.country) && (
                <p>
                  <span className="font-semibold text-slate-700">Location:</span>{' '}
                  {[countryCVInfo.address, countryCVInfo.city, countryCVInfo.country || personalInfo.location]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {countryCVInfo.nationality && (
                <p>
                  <span className="font-semibold text-slate-700">Nationality:</span> {countryCVInfo.nationality}
                </p>
              )}
              {countryCVInfo.dateOfBirth && (
                <p>
                  <span className="font-semibold text-slate-700">Date of Birth:</span> {countryCVInfo.dateOfBirth}
                </p>
              )}
              {countryCVInfo.drivingLicense && (
                <p>
                  <span className="font-semibold text-slate-700">Driving License:</span> {countryCVInfo.drivingLicense}
                </p>
              )}
              {personalInfo.linkedin && (
                <div className="pt-1">
                  <ResumeLink url={personalInfo.linkedin} label="LinkedIn Profile" />
                </div>
              )}
              {personalInfo.website && (
                <div>
                  <ResumeLink url={personalInfo.website} label="Portfolio" />
                </div>
              )}
            </div>
          </div>

          {/* Languages Section with CEFR */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
              Language Skills
            </h3>
            {countryCVInfo.motherTongue && (
              <div className="mb-2 text-xs">
                <span className="text-slate-500 font-medium">Mother tongue:</span>{' '}
                <span className="font-semibold text-slate-800">{countryCVInfo.motherTongue}</span>
              </div>
            )}

            {/* CEFR languages breakdown or fallback languages */}
            {countryCVInfo.cefrLanguages && countryCVInfo.cefrLanguages.length > 0 ? (
              <div className="space-y-3">
                {countryCVInfo.cefrLanguages.map((l, i) => (
                  <div key={i} className="rounded-lg bg-white p-2.5 border border-slate-200 text-xs shadow-2xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>{l.language}</span>
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                        CEFR {l.listening}
                      </span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] text-slate-500">
                      <div>Listening: <span className="font-medium text-slate-700">{l.listening}</span></div>
                      <div>Reading: <span className="font-medium text-slate-700">{l.reading}</span></div>
                      <div>Spoken: <span className="font-medium text-slate-700">{l.spokenInteraction}</span></div>
                      <div>Writing: <span className="font-medium text-slate-700">{l.writing}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : resume.languages && resume.languages.length > 0 ? (
              <div className="space-y-2">
                {resume.languages.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{l.name}</span>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
                      {l.level}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Digital Skills */}
          {(countryCVInfo.digitalSkills?.length || 0) > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                Digital Skills
              </h3>
              <div className="flex flex-wrap gap-1">
                {countryCVInfo.digitalSkills!.map((skill, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* General Skills */}
          {resume.skills && resume.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                Core Competencies
              </h3>
              <div className="flex flex-wrap gap-1">
                {resume.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 shadow-2xs"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Other Skills */}
          {countryCVInfo.otherSkills && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-1">
                Other Skills
              </h3>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                {countryCVInfo.otherSkills}
              </p>
            </div>
          )}
        </div>

        {/* Right Main Column (Profile, Experience, Education, Projects) */}
        <div className="md:col-span-8 p-6 space-y-6">
          {/* Professional Profile */}
          {resume.summary && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 mb-2">
                Professional Profile
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {resume.summary}
              </p>
            </section>
          )}

          {/* Work Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 mb-3">
                Work Experience
              </h2>
              <div className="space-y-4">
                {resume.experience.map((exp, i) => (
                  <div key={exp._id || i} className="relative pl-3 border-l-2 border-orange-500">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">{exp.role}</h3>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600">
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
                        <ResumeLink url={exp.link} label="Project / Role details" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education and Training */}
          {resume.education && resume.education.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 mb-3">
                Education & Training
              </h2>
              <div className="space-y-3">
                {resume.education.map((edu, i) => (
                  <div key={edu._id || i} className="relative pl-3 border-l-2 border-slate-300">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">{edu.degree}</h3>
                      <span className="text-[11px] font-medium text-slate-500">
                        {edu.startDate} – {edu.endDate}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{edu.institution}</p>
                    {edu.description && (
                      <p className="mt-1 text-xs text-slate-500">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 mb-2">
                Certifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {resume.certifications.map((c, i) => (
                  <div key={c._id || i} className="rounded border border-slate-200 p-2 bg-slate-50">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-slate-500 text-[11px]">{c.issuer} {c.year ? `(${c.year})` : ''}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 mb-2">
                Key Projects
              </h2>
              <div className="space-y-2.5">
                {resume.projects.map((p, i) => (
                  <div key={p._id || i} className="text-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">{p.title}</h3>
                      {p.link && <ResumeLink url={p.link} label="Link" />}
                    </div>
                    {p.technologies && (
                      <p className="text-[11px] font-medium text-orange-600">
                        Technologies: {p.technologies}
                      </p>
                    )}
                    {p.description && <p className="text-slate-600 mt-0.5">{p.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
