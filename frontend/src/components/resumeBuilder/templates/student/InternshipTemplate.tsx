import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, groupSkillsByCategory, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Internship Ready — tight one-pager built for internship applications.
 * Compact line heights, a two-column skills section, GPA/coursework in
 * education. No wasted space anywhere.
 */
export const InternshipTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const skillGroups = groupSkillsByCategory(resume.skills);

  const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 flex items-center gap-2">
      <h2 className="shrink-0 text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
        {children}
      </h2>
      <div className="h-px w-full" style={{ backgroundColor: theme.accentSoft }} />
    </div>
  );

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <>
        <SectionHeading>Objective</SectionHeading>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{resume.summary}</p>
      </>
    ),
    education: () => (
      <>
        <SectionHeading>Education</SectionHeading>
        <div className="mt-1 space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-start justify-between">
              <div>
                <p className="text-[12.5px] font-semibold">{edu.degree}</p>
                <p className="text-[11.5px] text-slate-500">{edu.institution}</p>
                {edu.description && <p className="text-[11px] text-slate-400 italic">{edu.description}</p>}
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">{edu.startDate} – {edu.endDate}</p>
            </div>
          ))}
        </div>
      </>
    ),
    skills: () => (
      <>
        <SectionHeading>Skills</SectionHeading>
        <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1">
          {skillGroups.map((g) => (
            <div key={g.category} className="text-[11.5px]">
              <span className="font-semibold text-slate-600">{g.category}: </span>
              <span className="text-slate-700">{g.skills.map((s) => s.name).join(', ')}</span>
            </div>
          ))}
        </div>
      </>
    ),
    projects: () => (
      <>
        <SectionHeading>Projects</SectionHeading>
        <div className="mt-1 space-y-2">
          {resume.projects.map((p, i) => (
            <div key={p._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[12.5px] font-semibold">{p.title}</p>
                {p.link && <span className="font-mono text-[10px] text-slate-400">{p.link}</span>}
              </div>
              {p.technologies && <p className="font-mono text-[10.5px]" style={{ color: theme.accent }}>{p.technologies}</p>}
              {p.description && <p className="text-[12px] leading-snug text-slate-600">{p.description}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    internships: () => (
      <>
        <SectionHeading>Internship Experience</SectionHeading>
        <div className="mt-1 space-y-2">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[12.5px] font-semibold">{it.role}, {it.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              </div>
              {it.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12px]">
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
        <div className="mt-1 space-y-2">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[12.5px] font-semibold">{v.role}, {v.organization}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
              </div>
              {v.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12px]">
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
        <SectionHeading>Work Experience</SectionHeading>
        <div className="mt-1 space-y-2">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[12.5px] font-semibold">{exp.role}, {exp.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              {exp.description && (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12px]">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </>
    ),
    positionsOfResponsibility: () => (
      <>
        <SectionHeading>Campus Involvement</SectionHeading>
        <div className="mt-1 space-y-0.5">
          {resume.positionsOfResponsibility.map((p, i) => (
            <p key={p._id || i} className="text-[12px]">
              <span className="font-semibold">{p.title}</span>, {p.organization}
              {p.startDate && <span className="text-slate-400"> · {formatDateRange(p.startDate, p.endDate, p.current)}</span>}
            </p>
          ))}
        </div>
      </>
    ),
    certifications: () => (
      <>
        <SectionHeading>Certifications</SectionHeading>
        <div className="mt-1 space-y-0.5">
          {resume.certifications.map((c, i) => <p key={c._id || i} className="text-[12px]">{c.name} — {c.issuer}{c.year && `, ${c.year}`}</p>)}
        </div>
      </>
    ),
    achievements: () => (
      <>
        <SectionHeading>Awards & Achievements</SectionHeading>
        <div className="mt-1 space-y-0.5">
          {resume.achievements.map((a, i) => <p key={a._id || i} className="text-[12px]">{a.title}{a.year && <span className="text-slate-400"> ({a.year})</span>}</p>)}
        </div>
      </>
    ),
    publications: () => (
      <>
        <SectionHeading>Publications</SectionHeading>
        <div className="mt-1 space-y-0.5">
          {resume.publications.map((p, i) => <p key={p._id || i} className="text-[12px]">{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>)}
        </div>
      </>
    ),
    trainings: () => (
      <>
        <SectionHeading>Trainings</SectionHeading>
        <div className="mt-1 space-y-0.5">
          {resume.trainings.map((t, i) => <p key={t._id || i} className="text-[12px]">{t.title}, {t.provider}</p>)}
        </div>
      </>
    ),
    scholarships: () => (
      <>
        <SectionHeading>Scholarships</SectionHeading>
        <div className="mt-1 space-y-0.5">
          {resume.scholarships.map((s, i) => <p key={s._id || i} className="text-[12px]">{s.title}, {s.institution}</p>)}
        </div>
      </>
    ),
    languages: () => (
      <>
        <SectionHeading>Languages</SectionHeading>
        <p className="mt-1 text-[12px] text-slate-600">{resume.languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</p>
      </>
    ),
    references: () => (
      <>
        <SectionHeading>References</SectionHeading>
        <div className="mt-1 space-y-0.5">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12px]">{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>
          ))}
        </div>
      </>
    ),
    hobbies: () => (
      <>
        <SectionHeading>Interests</SectionHeading>
        <p className="mt-1 text-[12px] text-slate-600">{resume.hobbies.join(' · ')}</p>
      </>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white px-9 py-8 text-slate-800"
      style={{ fontFamily: theme.fontBody }}
    >
      {/* Header — compact */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: theme.fontHeading, color: theme.accent }}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {[personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-0.5 text-[11.5px] text-slate-400">
          {[personalInfo.linkedin, personalInfo.github, personalInfo.website].filter(Boolean).join(' · ')}
        </p>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <React.Fragment key={id}>
              <SectionHeading>{custom.title}</SectionHeading>
              <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">{custom.content}</p>
            </React.Fragment>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default InternshipTemplate;
