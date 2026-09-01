import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Simple Worker/Labor — Friendly. No photo. Big, bold, rounded sans type
 * with generous line-height and icon-bullet skills — built to be easy to
 * scan and easy to read for any frontline role, teal accent.
 */
export const FriendlyWorkerTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-2 space-y-1 text-[13px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-4">
        <Heading>About Me</Heading>
        <p className="mt-2 text-[13px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mt-4">
        <Heading>What I'm Good At</Heading>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {resume.skills.map((s, i) => (
            <div key={s._id || i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-[12.5px]">
              <span style={{ color: theme.accent }}>✓</span> {s.name}
            </div>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <Heading>Work History</Heading>
        <div className="mt-2 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <p className="text-[14px] font-bold">{exp.role || 'Role'}</p>
              <p className="text-[12.5px] font-medium text-slate-500">{exp.company}{exp.location && `, ${exp.location}`} · {formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    certifications: () => (
      <section className="mt-4">
        <Heading>My Certificates</Heading>
        <div className="mt-2 flex flex-wrap gap-2">
          {resume.certifications.map((c, i) => (
            <span key={c._id || i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[12.5px]">{c.name}{c.year && ` (${c.year})`}</span>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <Heading>Education</Heading>
        <div className="mt-2 space-y-1">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[13px]"><span className="font-bold">{edu.degree}</span>, {edu.institution}</p>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Work">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </Extra>
    ),
    projects: () => (
      <Extra title="Projects">
        {resume.projects.map((p, i) => <p key={p._id || i}>{p.title}: {p.description}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution}</p>)}
      </Extra>
    ),
    publications: () => (
      <Extra title="Publications">
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher}</p>)}
      </Extra>
    ),
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: 'Verdana, Tahoma, sans-serif' }}>
      <h1 className="text-[28px] font-black text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      {resume.targetRole && <p className="mt-0.5 text-[14px] font-bold" style={{ color: theme.accent }}>{resume.targetRole}</p>}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium text-slate-600">
        {personalInfo.phone && <span>📞 {personalInfo.phone}</span>}
        {personalInfo.email && <span>✉️ {personalInfo.email}</span>}
        {personalInfo.location && <span>📍 {personalInfo.location}</span>}
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-4">
              <Heading>{custom.title}</Heading>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default FriendlyWorkerTemplate;
