import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, skillsAsPlainText } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Reverse Chronological — a fixed date column runs down the left of every
 * timeline section, so the eye can scan dates independently of content.
 * The one structural idea this whole batch is built around.
 */
export const ReverseChronologicalTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-slate-800">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
      {children}
    </h2>
  );

  const DateColRow: React.FC<{ date: string; children: React.ReactNode }> = ({ date, children }) => (
    <div className="flex gap-3">
      <div className="w-[76px] shrink-0 pt-0.5 text-[10.5px] text-slate-400">{date}</div>
      <div className="flex-1 border-l border-slate-200 pl-3">{children}</div>
    </div>
  );

  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 pl-[91px] text-[12.5px]">{children}</div>
    </section>
  );

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Summary</Heading>
        <p className="mt-1.5 pl-[91px] text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <Heading>Experience</Heading>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <DateColRow key={exp._id || i} date={formatDateRange(exp.startDate, exp.endDate, exp.current)}>
              <p className="text-[13px] font-semibold">{exp.role || 'Role'}</p>
              <p className="text-[12px] text-slate-500">{exp.company}{exp.location && `, ${exp.location}`}</p>
              {exp.description && <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed">{exp.description}</p>}
            </DateColRow>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <section className="mt-5">
        <Heading>Internships</Heading>
        <div className="mt-1.5 space-y-3">
          {resume.internships.map((it, i) => (
            <DateColRow key={it._id || i} date={formatDateRange(it.startDate, it.endDate, it.current)}>
              <p className="text-[13px] font-semibold">{it.role || 'Role'}</p>
              <p className="text-[12px] text-slate-500">{it.company}</p>
              {it.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{it.description}</p>}
            </DateColRow>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <section className="mt-5">
        <Heading>Volunteer Experience</Heading>
        <div className="mt-1.5 space-y-3">
          {resume.volunteering.map((v, i) => (
            <DateColRow key={v._id || i} date={formatDateRange(v.startDate, v.endDate, v.current)}>
              <p className="text-[13px] font-semibold">{v.role || 'Role'}</p>
              <p className="text-[12px] text-slate-500">{v.organization}</p>
              {v.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{v.description}</p>}
            </DateColRow>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-2">
          {resume.education.map((edu, i) => (
            <DateColRow key={edu._id || i} date={`${edu.startDate}–${edu.endDate}`}>
              <p className="text-[13px] font-semibold">{edu.degree || 'Degree'}</p>
              <p className="text-[12px] text-slate-500">{edu.institution}</p>
            </DateColRow>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <Heading>Projects</Heading>
        <div className="mt-1.5 space-y-1.5 pl-[91px]">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed">
              <span className="font-semibold">{p.title}.</span> {p.description}
            </p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-5">
        <Heading>Skills</Heading>
        <p className="mt-1.5 pl-[91px] text-[12.5px]">{skillsAsPlainText(resume.skills)}</p>
      </section>
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
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1 className="text-2xl font-bold">{personalInfo.fullName || 'Your Name'}</h1>
      <p className="mt-0.5 text-sm text-slate-500">{resume.targetRole || 'Target Role'}</p>
      <p className="mt-1.5 text-[11.5px] text-slate-400">
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('  ·  ')}
      </p>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-5">
              <Heading>{custom.title}</Heading>
              <p className="mt-1.5 pl-[91px] whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default ReverseChronologicalTemplate;
