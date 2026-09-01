import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, groupSkillsByCategory } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Modern ATS — still fully parser-safe (single column, real text, no
 * tables), but with rounded badge headings and grouped skill chips. The
 * one template in this batch that leans into visual polish.
 */
export const ModernAtsTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2
      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
    >
      {children}
    </h2>
  );

  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  const skillGroups = groupSkillsByCategory(resume.skills);

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Summary</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mt-5">
        <Heading>Skills</Heading>
        <div className="mt-2 space-y-2">
          {skillGroups.map((g) => (
            <div key={g.category}>
              <p className="text-[10.5px] font-semibold text-slate-400">{g.category}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {g.skills.map((s, i) => (
                  <span
                    key={s._id || i}
                    className="rounded-full px-2.5 py-0.5 text-[11.5px]"
                    style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
                  >
                    {s.name} <span className="opacity-60">· {s.level}</span>
                  </span>
                ))}
              </div>
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
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{exp.role || 'Role'} @ {exp.company || 'Company'}</p>
                <p className="whitespace-nowrap text-[11px] text-slate-400">
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </p>
              </div>
              {exp.description && <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed">{exp.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-baseline justify-between">
              <p className="text-[13px] font-semibold">{edu.degree || 'Degree'}</p>
              <p className="whitespace-nowrap text-[11px] text-slate-400">{edu.startDate}–{edu.endDate}</p>
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
            <p key={p._id || i} className="text-[12.5px] leading-relaxed">
              <span className="font-semibold">{p.title}.</span> {p.description}
            </p>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => (
          <p key={it._id || i}>{it.role}, {it.company} — {formatDateRange(it.startDate, it.endDate, it.current)}</p>
        ))}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => (
          <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>
        ))}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => (
          <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}{a.description && ` — ${a.description}`}</p>
        ))}
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
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution} {s.year && `(${s.year})`}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => (
          <p key={p._id || i}>{p.title}, {p.organization} ({formatDateRange(p.startDate, p.endDate)})</p>
        ))}
      </Extra>
    ),
    hobbies: () => (
      <Extra title="Hobbies">
        <p>{resume.hobbies.join(', ')}</p>
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => (
          <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>
        ))}
      </Extra>
    ),
    languages: () => (
      <Extra title="Languages">
        <p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
      </Extra>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] rounded-xl bg-white p-10 shadow-sm"
      style={{ fontFamily: 'Inter, Arial, sans-serif', color: theme.text }}
    >
      <h1 className="text-2xl font-bold" style={{ color: theme.accent }}>{personalInfo.fullName || 'Your Name'}</h1>
      {resume.targetRole && (
        <span
          className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
        >
          {resume.targetRole}
        </span>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin, personalInfo.website]
          .filter(Boolean)
          .map((v, i) => (
            <span key={i}>{v}</span>
          ))}
      </div>

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

export default ModernAtsTemplate;
