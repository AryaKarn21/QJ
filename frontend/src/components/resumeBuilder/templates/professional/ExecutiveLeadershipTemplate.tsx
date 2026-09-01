import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, skillsAsPlainText } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Executive — large, confident header; leadership and achievements are
 * pulled up ahead of the day-to-day experience list, which is how senior
 * candidates are usually expected to present themselves.
 */
export const ExecutiveLeadershipTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[13px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.accent }}>
      {children}
    </h2>
  );

  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-5">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  // Note: positionsOfResponsibility keeps its special "Leadership" heading
  // and achievements keeps its own detailed treatment, matching this
  // template's original senior-candidate-first emphasis.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Professional Summary</Heading>
        <p className="mt-1.5 text-[13px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    positionsOfResponsibility: () => (
      <section className="mt-5">
        <Heading>Leadership</Heading>
        <div className="mt-1.5 space-y-2">
          {resume.positionsOfResponsibility.map((p, i) => (
            <div key={p._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{p.title || 'Role'}, {p.organization || 'Organization'}</p>
                <p className="whitespace-nowrap text-[11px] text-slate-400">{formatDateRange(p.startDate, p.endDate)}</p>
              </div>
              {p.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{p.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    achievements: () => (
      <section className="mt-5">
        <Heading>Achievements</Heading>
        <div className="mt-1.5 space-y-1">
          {resume.achievements.map((a, i) => (
            <p key={a._id || i} className="text-[12.5px] leading-relaxed">
              <span className="font-semibold">{a.title}</span> {a.year && `(${a.year})`}{a.description && ` — ${a.description}`}
            </p>
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
                <p className="text-[13.5px] font-semibold">{exp.role || 'Role'} — {exp.company || 'Company'}</p>
                <p className="whitespace-nowrap text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
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
        <div className="mt-1.5 space-y-1">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12.5px]">
              <span className="font-semibold">{edu.degree}</span>, {edu.institution} ({edu.startDate}–{edu.endDate})
            </p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-5">
        <Heading>Skills</Heading>
        <p className="mt-1.5 text-[12.5px]">{skillsAsPlainText(resume.skills)}</p>
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
    projects: () => (
      <Extra title="Projects">
        {resume.projects.map((p, i) => <p key={p._id || i}><span className="font-semibold">{p.title}.</span> {p.description}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
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
    hobbies: () => (
      <Extra title="Hobbies">
        <p>{resume.hobbies.join(', ')}</p>
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (
      <Extra title="Languages">
        <p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
      </Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10" style={{ fontFamily: 'Inter, Arial, sans-serif', color: theme.text }}>
      <div className="border-b-4 pb-4" style={{ borderColor: theme.accent }}>
        <h1 className="text-[34px] font-extrabold leading-tight text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
        <p className="mt-1 text-base font-medium" style={{ color: theme.accent }}>{resume.targetRole || 'Target Role'}</p>
        <p className="mt-2 text-[12px] text-slate-500">
          {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('   ·   ')}
        </p>
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

export default ExecutiveLeadershipTemplate;
