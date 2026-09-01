import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Academic — Numbered. No photo. Every section heading carries a running
 * number (1. Education, 2. Publications, ...), a convention borrowed from
 * formal academic/grant CVs, dense and compact for long publication lists.
 */
export const NumberedAcademicTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  let counter = 0;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    counter += 1;
    return (
      <h2 className="text-[11.5px] font-bold tracking-wide" style={{ color: theme.accent }}>
        {counter}. {children}
      </h2>
    );
  };
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 text-[12px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-4">
        <Heading>Research Statement</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-1">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12px]"><span className="font-semibold">{edu.degree}</span>, {edu.institution} ({edu.startDate}–{edu.endDate})</p>
          ))}
        </div>
      </section>
    ),
    publications: () => (
      <section className="mt-4">
        <Heading>Publications</Heading>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[12px]">
          {resume.publications.map((p, i) => (
            <li key={p._id || i}>{p.title}{p.publisher && `, ${p.publisher}`}{p.year && ` (${p.year})`}</li>
          ))}
        </ol>
      </section>
    ),
    scholarships: () => (
      <section className="mt-4">
        <Heading>Grants & Fellowships</Heading>
        <div className="mt-1.5 space-y-1 text-[12px]">
          {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution} {s.year && `(${s.year})`}</p>)}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <Heading>Academic Appointments</Heading>
        <div className="mt-1.5 space-y-1.5 text-[12px]">
          {resume.experience.map((exp, i) => (
            <p key={exp._id || i}><span className="font-semibold">{exp.role}</span>, {exp.company} ({formatDateRange(exp.startDate, exp.endDate, exp.current)})</p>
          ))}
        </div>
      </section>
    ),
    achievements: () => (
      <section className="mt-4">
        <Heading>Honours & Awards</Heading>
        <div className="mt-1.5 space-y-1 text-[12px]">
          {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}</p>)}
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
    trainings: () => (
      <Extra title="Courses & Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Service & Positions">
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
    <div className="mx-auto w-full max-w-[720px] bg-white px-10 py-9 text-slate-800" style={{ fontFamily: 'Georgia, serif' }}>
      <h1 className="text-[22px] font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      {resume.targetRole && <p className="mt-0.5 text-[13px] italic text-slate-500">{resume.targetRole}</p>}
      <p className="mt-1.5 text-[11px] text-slate-500">
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.website].filter(Boolean).join('   ·   ')}
      </p>

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

export default NumberedAcademicTemplate;
