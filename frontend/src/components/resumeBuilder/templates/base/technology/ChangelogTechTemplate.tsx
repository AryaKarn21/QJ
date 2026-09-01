import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, groupSkillsByCategory } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Software/Technology — Changelog Style. No photo. Experience entries are
 * formatted like a git changelog (monospace date + version-style bullet),
 * and skills render as inline "stack badges" — a structurally different
 * idea from every other technology template (Software Engineer, Full
 * Stack, AI/ML, Data Analyst, DevOps, Cyber Security).
 */
export const ChangelogTechTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const skillGroups = groupSkillsByCategory(resume.skills);

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-500">## {children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-5">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>About</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mt-5">
        <Heading>Stack</Heading>
        <div className="mt-1.5 space-y-1.5">
          {skillGroups.map((g) => (
            <div key={g.category} className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="font-mono font-semibold text-slate-500">{g.category}:</span>
              {g.skills.map((s, i) => (
                <span key={s._id || i} className="rounded px-1.5 py-0.5 font-mono text-[10.5px]" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>{s.name}</span>
              ))}
            </div>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <Heading>Experience</Heading>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i} className="border-l-2 pl-3" style={{ borderColor: theme.accentSoft }}>
              <p className="font-mono text-[10.5px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              <p className="text-[13px] font-semibold">
                <span style={{ color: theme.accent }}>+</span> {exp.role || 'Role'} <span className="text-slate-400">@ {exp.company || 'Company'}</span>
              </p>
              {exp.description && <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed text-slate-600">{exp.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <Heading>Projects</Heading>
        <div className="mt-1.5 space-y-1.5">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed"><span className="font-mono font-semibold" style={{ color: theme.accent }}>{p.title}</span> — {p.description}</p>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-1">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12.5px]"><span className="font-semibold">{edu.degree}</span>, {edu.institution} ({edu.startDate}–{edu.endDate})</p>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company} — {formatDateRange(it.startDate, it.endDate, it.current)}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}</p>)}
      </Extra>
    ),
    publications: () => (
      <Extra title="Publications">
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
      </Extra>
    ),
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
      <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: theme.fontBody }}>{personalInfo.fullName || 'Your Name'}</h1>
      <p className="mt-0.5 text-sm" style={{ color: theme.accent, fontFamily: theme.fontBody }}>{resume.targetRole || 'Target Role'}</p>
      <p className="mt-2 text-[11px] text-slate-500">
        {[personalInfo.email, personalInfo.phone, personalInfo.github, personalInfo.website].filter(Boolean).join('  ·  ')}
      </p>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-5">
              <Heading>{custom.title}</Heading>
              <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default ChangelogTechTemplate;
