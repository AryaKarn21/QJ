import React from 'react';
import type { Resume } from '../resumeApi';
import { getTheme } from '../themePresets';

interface TemplateProps {
  resume: Resume;
}

/**
 * Deliberately plain: no columns, no icons, no background colors on text
 * blocks, minimal font variation. This is the layout to recommend when
 * ATS-compatibility matters more than visual flair — most ATS parsers
 * struggle with multi-column layouts and heavy styling.
 */
export const ExecutiveTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white p-10"
      style={{ fontFamily: theme.fontBody, color: theme.text }}
    >
      <div className="border-b-2 pb-3" style={{ borderColor: theme.accent }}>
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="mt-1 text-sm">{resume.targetRole || 'Target Role'}</p>
        <p className="mt-1 text-xs text-slate-500">
          {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin]
            .filter(Boolean)
            .join('  |  ')}
        </p>
      </div>

      {resume.summary && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Professional Summary
          </h2>
          <p className="mt-1 text-sm leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Professional Experience
          </h2>
          <div className="mt-2 space-y-3">
            {resume.experience.map((exp, i) => (
              <div key={exp._id || i}>
                <p className="text-sm font-bold">
                  {exp.role || 'Role'}, {exp.company || 'Company'} ({exp.startDate} – {exp.current ? 'Present' : exp.endDate})
                </p>
                {exp.description && (
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Education
          </h2>
          <div className="mt-2 space-y-1">
            {resume.education.map((edu, i) => (
              <p key={edu._id || i} className="text-sm">
                {edu.degree || 'Degree'}, {edu.institution} ({edu.startDate}–{edu.endDate})
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Skills
          </h2>
          <p className="mt-1 text-sm">{resume.skills.join(', ')}</p>
        </section>
      )}

      {resume.certifications.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Certifications
          </h2>
          <div className="mt-1 space-y-0.5">
            {resume.certifications.map((c, i) => (
              <p key={c._id || i} className="text-sm">
                {c.name}, {c.issuer} {c.year && `(${c.year})`}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.projects.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Projects
          </h2>
          <div className="mt-2 space-y-1.5">
            {resume.projects.map((p, i) => (
              <p key={p._id || i} className="text-sm">
                <span className="font-bold">{p.title}.</span> {p.description}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ExecutiveTemplate;