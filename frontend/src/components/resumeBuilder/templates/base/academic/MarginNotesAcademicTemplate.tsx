import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Academic — Margin Notes. No photo. A narrow left margin column carries
 * just the year/date for every dated entry (education, experience,
 * publications), like annotations beside a formal academic CV — distinct
 * from the existing Academic Scholar template's centered header layout.
 */
export const MarginNotesAcademicTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: theme.accent }}>{children}</h2>
  );
  const MarginRow: React.FC<{ year: string; children: React.ReactNode }> = ({ year, children }) => (
    <div className="flex gap-4">
      <p className="w-14 shrink-0 pt-0.5 text-[11px] text-slate-400">{year}</p>
      <div className="flex-1 border-l border-slate-100 pl-4">{children}</div>
    </div>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-5">
      <Heading>{title}</Heading>
      <div className="mt-2 space-y-1 pl-[72px] text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Research Interests</Heading>
        <p className="mt-2 pl-[72px] text-[12.5px] leading-relaxed italic">{resume.summary}</p>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <Heading>Education</Heading>
        <div className="mt-2 space-y-2">
          {resume.education.map((edu, i) => (
            <MarginRow key={edu._id || i} year={edu.endDate || edu.startDate}>
              <p className="text-[12.5px] font-semibold">{edu.degree}, {edu.institution}</p>
            </MarginRow>
          ))}
        </div>
      </section>
    ),
    publications: () => (
      <section className="mt-5">
        <Heading>Publications</Heading>
        <div className="mt-2 space-y-2">
          {resume.publications.map((p, i) => (
            <MarginRow key={p._id || i} year={p.year}>
              <p className="text-[12.5px]"><span className="font-semibold">{p.title}</span>{p.publisher && <span className="italic text-slate-500"> — {p.publisher}</span>}</p>
            </MarginRow>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <Heading>Academic Experience</Heading>
        <div className="mt-2 space-y-2">
          {resume.experience.map((exp, i) => (
            <MarginRow key={exp._id || i} year={formatDateRange(exp.startDate, exp.endDate, exp.current)}>
              <p className="text-[12.5px] font-semibold">{exp.role}, {exp.company}</p>
              {exp.description && <p className="mt-0.5 text-[12px] text-slate-600">{exp.description}</p>}
            </MarginRow>
          ))}
        </div>
      </section>
    ),
    scholarships: () => (
      <section className="mt-5">
        <Heading>Grants & Fellowships</Heading>
        <div className="mt-2 space-y-2">
          {resume.scholarships.map((s, i) => (
            <MarginRow key={s._id || i} year={s.year}>
              <p className="text-[12.5px]"><span className="font-semibold">{s.title}</span> — {s.institution}</p>
            </MarginRow>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <Extra title="Research Projects">
        {resume.projects.map((p, i) => <p key={p._id || i}><span className="font-semibold">{p.title}.</span> {p.description}</p>)}
      </Extra>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company} — {formatDateRange(it.startDate, it.endDate, it.current)}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Honours & Awards">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Courses & Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
      </Extra>
    ),
    skills: () => (
      <Extra title="Technical Skills"><p>{resume.skills.map((s) => s.name).join(' · ')}</p></Extra>
    ),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
    hobbies: () => (<Extra title="Interests"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white px-10 py-10 text-slate-800" style={{ fontFamily: 'Georgia, serif' }}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
        {resume.targetRole && <p className="mt-0.5 text-sm italic text-slate-500">{resume.targetRole}</p>}
        <p className="mt-1.5 text-[11.5px] text-slate-500">
          {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.website].filter(Boolean).join('   ·   ')}
        </p>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-5">
              <Heading>{custom.title}</Heading>
              <p className="mt-2 pl-[72px] whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default MarginNotesAcademicTemplate;
