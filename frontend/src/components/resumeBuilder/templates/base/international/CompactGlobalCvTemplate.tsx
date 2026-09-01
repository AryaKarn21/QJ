import React from 'react';
import type { Resume } from '../../../resumeApi';
import { formatDateRange, skillsAsPlainText } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * International/CV Style — Compact Global. No photo. Small type, dense
 * spacing built to stay multi-page-safe for long international careers;
 * contact line orders location before email/phone (a common non-US CV
 * convention) and dates are right-aligned in a fixed-width column.
 */
export const CompactGlobalCvTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="border-b border-slate-300 pb-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-700">{children}</h2>
  );
  const Row: React.FC<{ date: string; children: React.ReactNode }> = ({ date, children }) => (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0 flex-1">{children}</div>
      <p className="w-20 shrink-0 text-right text-[10px] text-slate-400">{date}</p>
    </div>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-3">
      <Heading>{title}</Heading>
      <div className="mt-1 space-y-0.5 text-[11.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-3">
        <Heading>Profile</Heading>
        <p className="mt-1 text-[11.5px] leading-snug">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-3">
        <Heading>Work Experience</Heading>
        <div className="mt-1 space-y-1.5">
          {resume.experience.map((exp, i) => (
            <Row key={exp._id || i} date={formatDateRange(exp.startDate, exp.endDate, exp.current)}>
              <p className="text-[11.5px]"><span className="font-semibold">{exp.role || 'Role'}</span>, {exp.company || 'Company'}</p>
              {exp.description && <p className="text-[11px] leading-snug text-slate-600">{exp.description}</p>}
            </Row>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-3">
        <Heading>Education</Heading>
        <div className="mt-1 space-y-1">
          {resume.education.map((edu, i) => (
            <Row key={edu._id || i} date={`${edu.startDate}–${edu.endDate}`}>
              <p className="text-[11.5px]"><span className="font-semibold">{edu.degree}</span>, {edu.institution}</p>
            </Row>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-3">
        <Heading>Skills</Heading>
        <p className="mt-1 text-[11.5px]">{skillsAsPlainText(resume.skills)}</p>
      </section>
    ),
    languages: () => (
      <section className="mt-3">
        <Heading>Languages</Heading>
        <p className="mt-1 text-[11.5px]">{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
      </section>
    ),
    projects: () => (
      <Extra title="Projects">
        {resume.projects.map((p, i) => <p key={p._id || i}><span className="font-semibold">{p.title}.</span> {p.description}</p>)}
      </Extra>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization}</p>)}
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
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-9 text-slate-800" style={{ fontFamily: '"Calibri", Arial, sans-serif' }}>
      <h1 className="text-[20px] font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      {resume.targetRole && <p className="text-[11.5px] text-slate-500">{resume.targetRole}</p>}
      <p className="mt-1 text-[10.5px] text-slate-500">
        {[personalInfo.location, personalInfo.email, personalInfo.phone].filter(Boolean).join('   ·   ')}
      </p>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-3">
              <Heading>{custom.title}</Heading>
              <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-snug">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default CompactGlobalCvTemplate;
