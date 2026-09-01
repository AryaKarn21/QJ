import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, groupSkillsByCategory, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Compact ATS — built to fit a long career onto one page. Small type
 * throughout, gray label-strip headings, comma-dense skill lines by
 * category instead of chips, bullet points joined inline instead of stacked.
 */
export const CompactAtsTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-700">{children}</h2>
  );

  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-2.5">
      <Heading>{title}</Heading>
      <div className="mt-1 space-y-0.5 text-[11.5px]">{children}</div>
    </section>
  );

  const skillGroups = groupSkillsByCategory(resume.skills);

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-2.5">
        <Heading>Summary</Heading>
        <p className="mt-1 text-[11.5px] leading-snug">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-2.5">
        <Heading>Experience</Heading>
        <div className="mt-1 space-y-2">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i} className="text-[11.5px]">
              <p className="font-bold">
                {exp.role || 'Role'}, {exp.company || 'Company'}{' '}
                <span className="font-normal text-slate-400">({formatDateRange(exp.startDate, exp.endDate, exp.current)})</span>
              </p>
              {exp.description && <p className="leading-snug text-slate-700">{toBulletLines(exp.description).join(' · ')}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <section className="mt-2.5">
        <Heading>Internships</Heading>
        <div className="mt-1 space-y-1 text-[11.5px]">
          {resume.internships.map((it, i) => (
            <p key={it._id || i}>
              <span className="font-bold">{it.role}, {it.company}</span> ({formatDateRange(it.startDate, it.endDate, it.current)})
            </p>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <section className="mt-2.5">
        <Heading>Volunteer Experience</Heading>
        <div className="mt-1 space-y-1 text-[11.5px]">
          {resume.volunteering.map((v, i) => (
            <p key={v._id || i}>
              <span className="font-bold">{v.role}, {v.organization}</span> ({formatDateRange(v.startDate, v.endDate, v.current)})
            </p>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-2.5">
        <Heading>Education</Heading>
        <div className="mt-1 space-y-0.5 text-[11.5px]">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i}><span className="font-bold">{edu.degree}</span>, {edu.institution} ({edu.startDate}–{edu.endDate})</p>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-2.5">
        <Heading>Projects</Heading>
        <div className="mt-1 space-y-0.5 text-[11.5px]">
          {resume.projects.map((p, i) => (
            <p key={p._id || i}><span className="font-bold">{p.title}:</span> {p.description}</p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-2.5">
        <Heading>Skills</Heading>
        <div className="mt-1 space-y-0.5 text-[11.5px]">
          {skillGroups.map((g) => (
            <p key={g.category}><span className="font-bold">{g.category}:</span> {g.skills.map((s) => s.name).join(', ')}</p>
          ))}
        </div>
      </section>
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
    <div className="mx-auto w-full max-w-[720px] bg-white p-8 text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <p className="text-[13px]">
        <span className="text-base font-bold" style={{ color: theme.accent }}>{personalInfo.fullName || 'Your Name'}</span>
        {resume.targetRole && <> · {resume.targetRole}</>}
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).map((v, i) => (
          <React.Fragment key={i}> · {v}</React.Fragment>
        ))}
      </p>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-2.5">
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

export default CompactAtsTemplate;
