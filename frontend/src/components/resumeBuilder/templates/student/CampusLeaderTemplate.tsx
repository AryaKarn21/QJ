import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, groupSkillsByCategory, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Campus Leader — leadership, extracurriculars and positions of
 * responsibility are elevated to the same level as academics. Designed
 * for students applying to management trainee, consulting, and leadership
 * programmes where personality and initiative matter as much as grades.
 */
export const CampusLeaderTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const skillGroups = groupSkillsByCategory(resume.skills);

  const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-5 flex items-center gap-3">
      <div className="h-5 w-1 rounded-full" style={{ backgroundColor: theme.accent }} />
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{children}</h2>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <>
        <SectionHeading>Profile</SectionHeading>
        <p className="mt-2 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </>
    ),
    positionsOfResponsibility: () => (
      <>
        <SectionHeading>Leadership & Positions</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.positionsOfResponsibility.map((p, i) => (
            <div key={p._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold" style={{ color: theme.accent }}>{p.title}</p>
                {p.startDate && <p className="text-[11px] text-slate-400">{formatDateRange(p.startDate, p.endDate, p.current)}</p>}
              </div>
              <p className="text-[12px] font-medium text-slate-600">{p.organization}</p>
              {p.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12.5px]">
                  {toBulletLines(p.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </>
    ),
    education: () => (
      <>
        <SectionHeading>Education</SectionHeading>
        <div className="mt-2 space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-semibold">{edu.degree}</p>
                <p className="text-[12px] text-slate-500">{edu.institution}</p>
                {edu.description && <p className="text-[11.5px] italic text-slate-400">{edu.description}</p>}
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">{edu.startDate} – {edu.endDate}</p>
            </div>
          ))}
        </div>
      </>
    ),
    achievements: () => (
      <>
        <SectionHeading>Awards & Recognition</SectionHeading>
        <div className="mt-2 space-y-1">
          {resume.achievements.map((a, i) => (
            <div key={a._id || i} className="flex items-baseline justify-between">
              <p className="text-[12.5px]"><span className="mr-2" style={{ color: theme.accent }}>▸</span>{a.title}</p>
              {a.year && <p className="shrink-0 text-[11px] text-slate-400">{a.year}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    internships: () => (
      <>
        <SectionHeading>Internships</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{it.role} · {it.company}</p>
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
      </>
    ),
    volunteering: () => (
      <>
        <SectionHeading>Volunteer Experience</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{v.role} · {v.organization}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
              </div>
              {v.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12.5px]">
                  {toBulletLines(v.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </>
    ),
    experience: () => (
      <>
        <SectionHeading>Experience</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{exp.role} · {exp.company}</p>
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
      </>
    ),
    projects: () => (
      <>
        <SectionHeading>Projects & Initiatives</SectionHeading>
        <div className="mt-2 space-y-2">
          {resume.projects.map((p, i) => (
            <div key={p._id || i}>
              <p className="text-[13px] font-semibold">{p.title}</p>
              {p.description && <p className="text-[12.5px] leading-relaxed">{p.description}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    skills: () => (
      <>
        <SectionHeading>Skills</SectionHeading>
        <div className="mt-2 space-y-1">
          {skillGroups.map((g) => (
            <p key={g.category} className="text-[12px]">
              <span className="font-semibold text-slate-600">{g.category}: </span>
              <span>{g.skills.map((s) => s.name).join(', ')}</span>
            </p>
          ))}
        </div>
      </>
    ),
    certifications: () => (
      <>
        <SectionHeading>Certifications</SectionHeading>
        <div className="mt-2 space-y-0.5">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i} className="text-[12.5px]">{c.name} — <span className="text-slate-500">{c.issuer}{c.year && `, ${c.year}`}</span></p>
          ))}
        </div>
      </>
    ),
    publications: () => (
      <>
        <SectionHeading>Publications</SectionHeading>
        <div className="mt-2 space-y-0.5">
          {resume.publications.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px]">{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>
          ))}
        </div>
      </>
    ),
    trainings: () => (
      <>
        <SectionHeading>Trainings</SectionHeading>
        <div className="mt-2 space-y-0.5">
          {resume.trainings.map((t, i) => <p key={t._id || i} className="text-[12.5px]">{t.title}, {t.provider}</p>)}
        </div>
      </>
    ),
    scholarships: () => (
      <>
        <SectionHeading>Scholarships</SectionHeading>
        <div className="mt-2 space-y-0.5">
          {resume.scholarships.map((s, i) => <p key={s._id || i} className="text-[12.5px]">{s.title}, {s.institution} {s.year && `(${s.year})`}</p>)}
        </div>
      </>
    ),
    languages: () => (
      <>
        <SectionHeading>Languages</SectionHeading>
        <p className="mt-2 text-[12.5px] text-slate-600">{resume.languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</p>
      </>
    ),
    references: () => (
      <>
        <SectionHeading>References</SectionHeading>
        <div className="mt-2 space-y-1">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12.5px]">{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>
          ))}
        </div>
      </>
    ),
    hobbies: () => (
      <>
        <SectionHeading>Interests</SectionHeading>
        <p className="mt-2 text-[12.5px] text-slate-600">{resume.hobbies.join(' · ')}</p>
      </>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white text-slate-800"
      style={{ fontFamily: theme.fontBody }}
    >
      {/* Accent top bar */}
      <div className="h-2 w-full" style={{ backgroundColor: theme.accent }} />

      <div className="px-10 py-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-bold leading-tight" style={{ fontFamily: theme.fontHeading, color: theme.accent }}>
              {personalInfo.fullName || 'Your Name'}
            </h1>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              {resume.targetRole || 'Target Role'}
            </p>
          </div>
          <div className="text-right text-[11.5px] text-slate-400 space-y-0.5">
            {personalInfo.email && <p>{personalInfo.email}</p>}
            {personalInfo.phone && <p>{personalInfo.phone}</p>}
            {personalInfo.location && <p>{personalInfo.location}</p>}
            {personalInfo.linkedin && <p>{personalInfo.linkedin}</p>}
          </div>
        </div>

        {getVisibleOrderedSections(resume).map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <React.Fragment key={id}>
                <SectionHeading>{custom.title}</SectionHeading>
                <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
              </React.Fragment>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default CampusLeaderTemplate;
