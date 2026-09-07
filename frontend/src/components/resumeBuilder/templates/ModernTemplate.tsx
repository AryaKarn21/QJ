import React from 'react';
import type { Resume } from '../resumeApi';
import { getTheme } from '../themePresets';
import { formatDateRange } from './shared/templateUtils';
import { ResumeLink } from './shared/ResumeLink';

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
                {exp.link && <ResumeLink href={exp.link} label="Company Link" color={theme.accent} className="mt-1 inline-block" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.internships.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Internships
          </h2>
          <div className="mt-2 space-y-3">
            {resume.internships.map((it, i) => (
              <div key={it._id || i}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{it.role || 'Role'} — {it.company || 'Company'}</p>
                  <p className="whitespace-nowrap text-xs text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
                </div>
                {it.description && <p className="mt-1 text-sm leading-relaxed">{it.description}</p>}
                {it.link && <ResumeLink href={it.link} label="Company Link" color={theme.accent} className="mt-1 inline-block" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.volunteering.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Volunteer Experience
          </h2>
          <div className="mt-2 space-y-3">
            {resume.volunteering.map((v, i) => (
              <div key={v._id || i}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{v.role || 'Role'} — {v.organization || 'Organization'}</p>
                  <p className="whitespace-nowrap text-xs text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
                </div>
                {v.description && <p className="mt-1 text-sm leading-relaxed">{v.description}</p>}
                {v.link && <ResumeLink href={v.link} label="Organization Link" color={theme.accent} className="mt-1 inline-block" />}
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
              <div key={edu._id || i}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm">
                    <span className="font-semibold">{edu.degree}</span>
                    {edu.institution && `, ${edu.institution}`}
                  </p>
                  <p className="whitespace-nowrap text-xs text-slate-400">
                    {edu.startDate} – {edu.endDate}
                  </p>
                </div>
                {edu.link && <ResumeLink href={edu.link} label="Institution Website" color={theme.accent} />}
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
                {p.link && <ResumeLink href={p.link} label="View Project" color={theme.accent} className="inline-block" />}
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
                {c.link && <> · <ResumeLink href={c.link} label="View Credential" color={theme.accent} /></>}
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
                {a.link && <> · <ResumeLink href={a.link} label="View Proof" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.publications.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Publications
          </h2>
          <div className="mt-2 space-y-1">
            {resume.publications.map((p, i) => (
              <p key={p._id || i} className="text-sm">
                <span className="font-semibold">{p.title}</span>
                {p.publisher && `, ${p.publisher}`}
                {p.year && ` (${p.year})`}
                {p.link && <> · <ResumeLink href={p.link} label="View Publication" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.trainings.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Trainings
          </h2>
          <div className="mt-2 space-y-1">
            {resume.trainings.map((t, i) => (
              <p key={t._id || i} className="text-sm">
                <span className="font-semibold">{t.title}</span>
                {t.provider && `, ${t.provider}`}
                {t.link && <> · <ResumeLink href={t.link} label="View Course" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.scholarships.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Scholarships
          </h2>
          <div className="mt-2 space-y-1">
            {resume.scholarships.map((s, i) => (
              <p key={s._id || i} className="text-sm">
                <span className="font-semibold">{s.title}</span>
                {s.institution && `, ${s.institution}`}
                {s.year && ` (${s.year})`}
                {s.link && <> · <ResumeLink href={s.link} label="View Award" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.positionsOfResponsibility.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Positions of Responsibility
          </h2>
          <div className="mt-2 space-y-1">
            {resume.positionsOfResponsibility.map((p, i) => (
              <p key={p._id || i} className="text-sm">
                <span className="font-semibold">{p.title}</span>
                {p.organization && `, ${p.organization}`}
                {' '}({formatDateRange(p.startDate, p.endDate)})
                {p.link && <> · <ResumeLink href={p.link} label="Organization Link" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}

      {resume.languages.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            Languages
          </h2>
          <p className="mt-1.5 text-sm">{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
        </section>
      )}

      {resume.customSections.map((cs, i) => (
        <section key={cs._id || i} className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
            {cs.title || 'Custom Section'}
          </h2>
          {cs.content && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{cs.content}</p>}
          {cs.link && <ResumeLink href={cs.link} label="Learn More" color={theme.accent} className="mt-1 inline-block" />}
        </section>
      ))}

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
                {r.link && <> · <ResumeLink href={r.link} label="Profile" color={theme.accent} /></>}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ModernTemplate;