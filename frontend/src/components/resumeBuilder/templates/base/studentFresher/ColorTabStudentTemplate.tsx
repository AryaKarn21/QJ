import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Student/Fresher — Color Tab. No photo. Each heading carries a small
 * colored square "tab" before the label; minimal single column, generous
 * spacing for a first resume with limited content.
 */
export const ColorTabStudentTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: theme.accent }} />
      <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-700">{children}</h2>
    </div>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 pl-4 text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-4">
        <Heading>About Me</Heading>
        <p className="mt-1.5 pl-4 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-2 pl-4">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-baseline justify-between">
              <p className="text-[13px] font-semibold">{edu.degree}</p>
              <p className="text-[11px] text-slate-400">{edu.startDate}–{edu.endDate}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-4">
        <Heading>Skills</Heading>
        <div className="mt-1.5 flex flex-wrap gap-1.5 pl-4">
          {resume.skills.map((s, i) => (
            <span key={s._id || i} className="rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>{s.name}</span>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-4">
        <Heading>Projects</Heading>
        <div className="mt-1.5 space-y-1.5 pl-4">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed"><span className="font-semibold">{p.title}.</span> {p.description}</p>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <section className="mt-4">
        <Heading>Internships</Heading>
        <div className="mt-1.5 space-y-2 pl-4">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{it.role}, {it.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              </div>
              {it.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12.5px]">
                  {toBulletLines(it.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>)}
      </Extra>
    ),
    experience: () => (
      <Extra title="Work Experience">
        {resume.experience.map((exp, i) => <p key={exp._id || i}>{exp.role}, {exp.company} — {formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Leadership & Activities">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
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
    hobbies: () => (<Extra title="Interests"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      <p className="mt-0.5 text-sm" style={{ color: theme.accent }}>{resume.targetRole || 'Aspiring Professional'}</p>
      <p className="mt-1.5 text-[11.5px] text-slate-500">
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('   ·   ')}
      </p>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-4">
              <Heading>{custom.title}</Heading>
              <p className="mt-1.5 pl-4 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default ColorTabStudentTemplate;
