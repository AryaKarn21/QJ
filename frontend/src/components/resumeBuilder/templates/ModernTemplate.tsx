import React from 'react';
import type { Resume } from '../resumeApi';
import { getTheme } from '../themePresets';

interface TemplateProps {
  resume: Resume;
}

export const ModernTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white p-10 shadow-sm"
      style={{ fontFamily: theme.fontBody, color: theme.text }}
    >
      {/* Header — name + photo side by side */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold" style={{ fontFamily: theme.fontHeading, color: theme.accent }}>
            {personalInfo.fullName || 'Your Name'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{resume.targetRole || 'Target Role'}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>· {personalInfo.phone}</span>}
            {personalInfo.location && <span>· {personalInfo.location}</span>}
            {personalInfo.linkedin && <span>· {personalInfo.linkedin}</span>}
            {personalInfo.website && <span>· {personalInfo.website}</span>}
            {personalInfo.github && <span>· {personalInfo.github}</span>}
          </div>
        </div>
        {personalInfo.photo && (
          <img
            src={personalInfo.photo}
            alt={personalInfo.fullName}
            className="h-20 w-20 rounded-full object-cover border-2 shrink-0"
            style={{ borderColor: theme.accent }}
          />
        )}
      </div>

      <div className="mt-4 h-px" style={{ backgroundColor: theme.accent + '40' }} />

      {resume.summary && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Summary
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed">{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Experience
          </h2>
          <div className="mt-2 space-y-4">
            {resume.experience.map((exp, i) => (
              <div key={exp._id || i}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{exp.role || 'Role'} — {exp.company || 'Company'}</p>
                  <p className="whitespace-nowrap text-xs text-slate-400">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </p>
                </div>
                {exp.location && <p className="text-xs text-slate-400">{exp.location}</p>}
                {exp.description && <p className="mt-1 text-sm leading-relaxed">{exp.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Education
          </h2>
          <div className="mt-2 space-y-2">
            {resume.education.map((edu, i) => (
              <div key={edu._id || i} className="flex items-baseline justify-between">
                <p className="text-sm">
                  <span className="font-semibold">{edu.degree}</span>
                  {edu.institution && `, ${edu.institution}`}
                </p>
                <p className="whitespace-nowrap text-xs text-slate-400">
                  {edu.startDate} – {edu.endDate}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Skills
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {resume.skills.map((skill, i) => (
              <span
                key={i}
                className="rounded px-2 py-0.5 text-xs"
                style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
              >
                {typeof skill === 'string' ? skill : skill.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {resume.projects.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Projects
          </h2>
          <div className="mt-2 space-y-2">
            {resume.projects.map((p, i) => (
              <div key={p._id || i}>
                <p className="text-sm font-semibold">{p.title}</p>
                {p.description && <p className="text-sm text-slate-600">{p.description}</p>}
                {p.link && <a href={p.link} className="text-xs" style={{ color: theme.accent }}>{p.link}</a>}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.certifications.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Certifications
          </h2>
          <div className="mt-2 space-y-1">
            {resume.certifications.map((c, i) => (
              <p key={c._id || i} className="text-sm">
                <span className="font-semibold">{c.name}</span>
                {c.issuer && ` — ${c.issuer}`}
                {c.year && ` (${c.year})`}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.achievements.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Achievements
          </h2>
          <div className="mt-2 space-y-1">
            {resume.achievements.map((a, i) => (
              <p key={a._id || i} className="text-sm">
                <span className="font-semibold">{a.title}</span>
                {a.year && ` (${a.year})`}
                {a.description && ` — ${a.description}`}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.hobbies.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Hobbies
          </h2>
          <p className="mt-1.5 text-sm">{resume.hobbies.join(', ')}</p>
        </section>
      )}

      {resume.references.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            References
          </h2>
          <div className="mt-2 space-y-1">
            {resume.references.map((r, i) => (
              <p key={r._id || i} className="text-sm">
                <span className="font-semibold">{r.name}</span>
                {r.relationship && `, ${r.relationship}`}
                {r.company && `, ${r.company}`}
                {(r.email || r.phone) && ` — ${[r.email, r.phone].filter(Boolean).join(', ')}`}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ModernTemplate;