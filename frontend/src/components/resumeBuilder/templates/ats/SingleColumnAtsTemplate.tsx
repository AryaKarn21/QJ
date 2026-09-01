import React from 'react';
import type { Resume } from '../../resumeApi';
import { formatDateRange, skillsAsPlainText } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="border-b-2 border-slate-800 pb-1 text-[12.5px] font-bold uppercase tracking-[0.08em] text-slate-800">
    {children}
  </h2>
);

const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-5">
    <Heading>{title}</Heading>
    <div className="mt-2 space-y-1 text-[12.5px]">{children}</div>
  </section>
);

/**
 * Single Column ATS — still deliberately plain (single column, sans-serif,
 * no accent color, the layout a big-company ATS parses most reliably), but
 * executed like an intentional business document rather than an unstyled
 * one: a real letterhead header instead of stacked raw lines, a heavier
 * rule under each heading for actual contrast (not a hairline that
 * disappears at print resolution), and a consistent gray scale instead of
 * default browser black/gray.
 */
export const SingleColumnAtsTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Summary</Heading>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <Heading>Work Experience</Heading>
        <div className="mt-2 space-y-3.5">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[13px] font-bold">{exp.role || 'Role'}</p>
                <p className="whitespace-nowrap text-[11.5px] font-medium text-slate-500">
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </p>
              </div>
              <p className="text-[12px] font-semibold text-slate-500">
                {exp.company}
                {exp.location && `, ${exp.location}`}
              </p>
              {exp.description && (
                <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700">
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <Heading>Education</Heading>
        <div className="mt-2 space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-baseline justify-between gap-4">
              <p className="text-[13px] font-bold">{edu.degree || 'Degree'}</p>
              <p className="whitespace-nowrap text-[11.5px] font-medium text-slate-500">
                {edu.startDate}–{edu.endDate}
              </p>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <Heading>Projects</Heading>
        <div className="mt-2 space-y-2">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed text-slate-700">
              <span className="font-bold text-slate-900">{p.title}.</span> {p.description}
            </p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-5">
        <Heading>Skills</Heading>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700">{skillsAsPlainText(resume.skills)}</p>
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
      className="mx-auto w-full max-w-[720px] bg-white p-11 text-slate-900"
      style={{ fontFamily: '"Calibri", "Segoe UI", Arial, Helvetica, sans-serif' }}
    >
      <div className="border-b-[3px] border-slate-900 pb-3">
        <h1 className="text-[24px] font-bold tracking-tight">{personalInfo.fullName || 'Your Name'}</h1>
        {resume.targetRole && <p className="mt-0.5 text-[13px] font-medium text-slate-600">{resume.targetRole}</p>}
        <p className="mt-1.5 text-[12px] text-slate-500">
          {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin]
            .filter(Boolean)
            .join('   |   ')}
        </p>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-5">
              <Heading>{custom.title}</Heading>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default SingleColumnAtsTemplate;
