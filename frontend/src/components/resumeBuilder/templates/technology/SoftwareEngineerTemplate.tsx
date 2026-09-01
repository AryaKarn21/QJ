import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, groupSkillsByCategory, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[11.5px] font-bold uppercase tracking-wide text-slate-700">{children}</h2>
);

const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-4">
    <Heading>{title}</Heading>
    <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
  </section>
);

/**
 * Software Engineer — skills come before experience (recruiters scan for
 * stack match first), GitHub/portfolio sit right in the header as tags, and
 * projects are placed ahead of education since shipped code usually matters
 * more than the degree for this role.
 */
export const SoftwareEngineerTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const skillGroups = groupSkillsByCategory(resume.skills);

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-4">
        <Heading>Summary</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mt-4">
        <Heading>Skills</Heading>
        <div className="mt-1.5 space-y-1.5">
          {skillGroups.map((g) => (
            <p key={g.category} className="text-[12px]">
              <span className="font-semibold text-slate-600">{g.category}:</span>{' '}
              <span className="font-mono">{g.skills.map((s) => s.name).join(', ')}</span>
            </p>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <Heading>Experience</Heading>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{exp.role || 'Role'} @ {exp.company || 'Company'}</p>
                <p className="whitespace-nowrap text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              {exp.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12.5px] leading-relaxed">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-4">
        <Heading>Projects</Heading>
        <div className="mt-1.5 space-y-2">
          {resume.projects.map((p, i) => (
            <div key={p._id || i}>
              <p className="text-[13px] font-semibold">
                {p.title} {p.link && <span className="font-mono text-[11px] font-normal text-slate-400">— {p.link}</span>}
              </p>
              {p.description && <p className="text-[12.5px] leading-relaxed">{p.description}</p>}
              {p.technologies && <p className="font-mono text-[11px] text-slate-400">{p.technologies}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-1">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12.5px]">
              <span className="font-semibold">{edu.degree}</span>, {edu.institution} ({edu.startDate}–{edu.endDate})
            </p>
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
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>)}
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
    hobbies: () => (
      <Extra title="Hobbies">
        <p>{resume.hobbies.join(', ')}</p>
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (
      <Extra title="Languages">
        <p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
      </Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      <p className="mt-0.5 text-sm" style={{ color: theme.accent }}>{resume.targetRole || 'Target Role'}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
        {[personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).map((v, i) => (
          <span key={i} className="text-slate-500">{v}</span>
        ))}
        {personalInfo.github && (
          <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>{personalInfo.github}</span>
        )}
        {personalInfo.website && (
          <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>{personalInfo.website}</span>
        )}
        {personalInfo.linkedin && <span className="text-slate-500">{personalInfo.linkedin}</span>}
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-4">
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

export default SoftwareEngineerTemplate;
