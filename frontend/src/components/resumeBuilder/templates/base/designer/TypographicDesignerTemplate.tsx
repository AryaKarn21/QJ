import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Designer/Creative — Typographic. No photo. Ultra-bold, huge single-word-
 * per-line hero name (monochrome + one accent color for the role line
 * only) — letting typography alone carry the design, no color blocks,
 * no sidebar, no cards.
 */
export const TypographicDesignerTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const nameWords = (personalInfo.fullName || 'Your Name').split(' ');

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-6">
      <Heading>{title}</Heading>
      <div className="mt-2 space-y-1 text-[12.5px] text-slate-600">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-6">
        <p className="text-[13.5px] leading-relaxed text-slate-700">{resume.summary}</p>
      </section>
    ),
    projects: () => (
      <section className="mt-6">
        <Heading>Work</Heading>
        <div className="mt-2.5 space-y-3">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[13px] leading-relaxed text-slate-700">
              <span className="font-black text-slate-900">{p.title}</span> — {p.description}
            </p>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-6">
        <Heading>Experience</Heading>
        <div className="mt-2.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold text-slate-900">{exp.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px] font-semibold" style={{ color: theme.accent }}>{exp.company}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] text-slate-600">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-6">
        <Heading>Skills</Heading>
        <p className="mt-2 text-[13px] font-medium leading-loose text-slate-700">{resume.skills.map((s) => s.name).join('  /  ')}</p>
      </section>
    ),
    education: () => (
      <section className="mt-6">
        <Heading>Education</Heading>
        <div className="mt-2 space-y-1">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12.5px] text-slate-600"><span className="font-bold text-slate-900">{edu.degree}</span>, {edu.institution}</p>
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
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Recognition">
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
    hobbies: () => (<Extra title="Interests"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white px-10 py-10 text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <h1 className="text-[44px] font-black uppercase leading-[0.92] tracking-tight text-slate-900">
        {nameWords.map((w, i) => <span key={i} className="block">{w}</span>)}
      </h1>
      <p className="mt-2 text-[13px] font-bold" style={{ color: theme.accent }}>{resume.targetRole || 'Creative Professional'}</p>
      <p className="mt-1.5 text-[11px] text-slate-400">
        {[personalInfo.email, personalInfo.phone, personalInfo.website, personalInfo.location].filter(Boolean).join('   ·   ')}
      </p>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-6">
              <Heading>{custom.title}</Heading>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default TypographicDesignerTemplate;
