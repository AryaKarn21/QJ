import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

// Plain white two-column PAGE split (not a colored sidebar) — left narrow
// column carries skills/education, right main column carries the rest.
const LEFT_IDS = ['skills', 'education', 'certifications', 'languages', 'hobbies'];

/**
 * Student/Fresher — Two Column. No photo. A lightweight left column
 * (skills, education, certifications) sits beside the main experience/
 * projects flow — no sidebar background color, just a plain divider line.
 */
export const TwoColumnStudentTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const LeftLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wide first:mt-0" style={{ color: theme.accent }}>{children}</p>
  );
  const MainHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-700">{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <MainHeading>{title}</MainHeading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <div className="flex flex-wrap gap-1 text-[11px]">
        {resume.skills.map((s, i) => <span key={s._id || i} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{s.name}</span>)}
      </div>
    ),
    education: () => (
      <div className="space-y-1.5 text-[11px] text-slate-600">
        {resume.education.map((edu, i) => (
          <div key={edu._id || i}>
            <p className="font-semibold text-slate-800">{edu.degree}</p>
            <p>{edu.institution}</p>
            <p className="text-slate-400">{edu.startDate}–{edu.endDate}</p>
          </div>
        ))}
      </div>
    ),
    certifications: () => (
      <div className="space-y-1 text-[11px] text-slate-600">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}{c.year && ` · ${c.year}`}</p>)}
      </div>
    ),
    languages: () => (
      <div className="space-y-1 text-[11px] text-slate-600">
        {resume.languages.map((l, i) => <p key={l._id || i}>{l.name} — {l.level}</p>)}
      </div>
    ),
    hobbies: () => <p className="text-[11px] text-slate-600">{resume.hobbies.join(', ')}</p>,
    summary: () => (
      <section>
        <MainHeading>About</MainHeading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <MainHeading>Experience</MainHeading>
        <div className="mt-1.5 space-y-2.5">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{exp.role}, {exp.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              {exp.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12.5px]">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <section className="mt-4">
        <MainHeading>Internships</MainHeading>
        <div className="mt-1.5 space-y-2.5">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{it.role}, {it.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              </div>
              {it.description && <p className="text-[12.5px] text-slate-600">{it.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-4">
        <MainHeading>Projects</MainHeading>
        <div className="mt-1.5 space-y-1.5">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed"><span className="font-semibold">{p.title}.</span> {p.description}</p>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Leadership & Activities">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
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
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const leftSections = visible.filter((id) => LEFT_IDS.includes(id));
  const mainSections = visible.filter((id) => !LEFT_IDS.includes(id));
  const leftLabels: Record<string, string> = { skills: 'Skills', education: 'Education', certifications: 'Certifications', languages: 'Languages', hobbies: 'Interests' };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      <p className="mt-0.5 text-sm" style={{ color: theme.accent }}>{resume.targetRole || 'Aspiring Professional'}</p>
      <p className="mt-1.5 text-[11.5px] text-slate-500">
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('   ·   ')}
      </p>

      <div className="mt-5 flex gap-6">
        <div className="w-[160px] shrink-0 border-r border-slate-100 pr-5">
          {leftSections.map((id) => (
            <React.Fragment key={id}>
              <LeftLabel>{leftLabels[id]}</LeftLabel>
              {sectionRenderers[id]?.()}
            </React.Fragment>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          {mainSections.map((id) => {
            if (id.startsWith('custom:')) {
              const custom = getCustomSectionContent(resume, id);
              if (!custom) return null;
              return (
                <section key={id} className="mt-4">
                  <MainHeading>{custom.title}</MainHeading>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
                </section>
              );
            }
            return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
          })}
        </div>
      </div>
    </div>
  );
};

export default TwoColumnStudentTemplate;
