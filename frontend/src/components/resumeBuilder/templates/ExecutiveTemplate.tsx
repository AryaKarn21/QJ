import React from 'react';
import type { Resume } from '../resumeApi';
import { getTheme } from '../themePresets';
import { formatDateRange } from './shared/templateUtils';
import { ResumeLink } from './shared/ResumeLink';

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
                {exp.link && <ResumeLink href={exp.link} label="Company Link" color={theme.accent} className="mt-0.5 inline-block" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.internships.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Internships
          </h2>
          <div className="mt-2 space-y-3">
            {resume.internships.map((it, i) => (
              <div key={it._id || i}>
                <p className="text-sm font-bold">
                  {it.role || 'Role'}, {it.company || 'Company'} ({formatDateRange(it.startDate, it.endDate, it.current)})
                </p>
                {it.description && <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{it.description}</p>}
                {it.link && <ResumeLink href={it.link} label="Company Link" color={theme.accent} className="mt-0.5 inline-block" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.volunteering.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Volunteer Experience
          </h2>
          <div className="mt-2 space-y-3">
            {resume.volunteering.map((v, i) => (
              <div key={v._id || i}>
                <p className="text-sm font-bold">
                  {v.role || 'Role'}, {v.organization || 'Organization'} ({formatDateRange(v.startDate, v.endDate, v.current)})
                </p>
                {v.description && <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{v.description}</p>}
                {v.link && <ResumeLink href={v.link} label="Organization Link" color={theme.accent} className="mt-0.5 inline-block" />}
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
                {edu.link && <> · <ResumeLink href={edu.link} label="Institution Website" color={theme.accent} /></>}
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
                {c.link && <> · <ResumeLink href={c.link} label="View Credential" color={theme.accent} /></>}
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
                {p.link && <> · <ResumeLink href={p.link} label="View Project" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.achievements.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Achievements
          </h2>
          <div className="mt-1 space-y-0.5">
            {resume.achievements.map((a, i) => (
              <p key={a._id || i} className="text-sm">
                <span className="font-bold">{a.title}</span>
                {a.year && ` (${a.year})`}
                {a.description && ` — ${a.description}`}
                {a.link && <> · <ResumeLink href={a.link} label="View Proof" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.publications.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Publications
          </h2>
          <div className="mt-1 space-y-0.5">
            {resume.publications.map((p, i) => (
              <p key={p._id || i} className="text-sm">
                {p.title}{p.publisher && `, ${p.publisher}`} {p.year && `(${p.year})`}
                {p.link && <> · <ResumeLink href={p.link} label="View Publication" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.trainings.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Trainings
          </h2>
          <div className="mt-1 space-y-0.5">
            {resume.trainings.map((t, i) => (
              <p key={t._id || i} className="text-sm">
                {t.title}{t.provider && `, ${t.provider}`}
                {t.link && <> · <ResumeLink href={t.link} label="View Course" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.scholarships.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Scholarships
          </h2>
          <div className="mt-1 space-y-0.5">
            {resume.scholarships.map((s, i) => (
              <p key={s._id || i} className="text-sm">
                {s.title}{s.institution && `, ${s.institution}`} {s.year && `(${s.year})`}
                {s.link && <> · <ResumeLink href={s.link} label="View Award" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.positionsOfResponsibility.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Positions of Responsibility
          </h2>
          <div className="mt-1 space-y-0.5">
            {resume.positionsOfResponsibility.map((p, i) => (
              <p key={p._id || i} className="text-sm">
                {p.title}{p.organization && `, ${p.organization}`} ({formatDateRange(p.startDate, p.endDate)})
                {p.link && <> · <ResumeLink href={p.link} label="Organization Link" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.languages.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            Languages
          </h2>
          <p className="mt-1 text-sm">{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
        </section>
      )}

      {resume.customSections.map((cs, i) => (
        <section key={cs._id || i} className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            {cs.title || 'Custom Section'}
          </h2>
          {cs.content && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{cs.content}</p>}
          {cs.link && <ResumeLink href={cs.link} label="Learn More" color={theme.accent} className="mt-0.5 inline-block" />}
        </section>
      ))}

      {resume.references.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase" style={{ color: theme.accent }}>
            References
          </h2>
          <div className="mt-1 space-y-0.5">
            {resume.references.map((r, i) => (
              <p key={r._id || i} className="text-sm">
                <span className="font-bold">{r.name}</span>
                {r.relationship && `, ${r.relationship}`}
                {r.company && `, ${r.company}`}
                {(r.email || r.phone) && ` — ${[r.email, r.phone].filter(Boolean).join(', ')}`}
                {r.link && <> · <ResumeLink href={r.link} label="Profile" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ExecutiveTemplate;