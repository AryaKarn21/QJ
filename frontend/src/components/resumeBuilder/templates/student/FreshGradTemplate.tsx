import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, groupSkillsByCategory, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const Rule: React.FC<{ color: string }> = ({ color }) => (
  <div className="mt-0.5 mb-2 h-[2px] w-8 rounded" style={{ backgroundColor: color }} />
);

/**
 * Fresh Graduate — Education and Projects lead because new grads rarely
 * have full-time experience. GPA field sits inline with the degree. Skills
 * use a clean chip row. Internships are promoted above regular experience.
 */
export const FreshGradTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const skillGroups = groupSkillsByCategory(resume.skills);

  const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-5">
      <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
        {children}
      </h2>
      <Rule color={theme.accent} />
    </div>
  );

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <>
        <SectionHeading>About Me</SectionHeading>
        <p className="text-[12.5px] leading-relaxed text-slate-700">{resume.summary}</p>
      </>
    ),
    education: () => (
      <>
        <SectionHeading>Education</SectionHeading>
        <div className="space-y-3">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold text-slate-900">{edu.degree}</p>
                <p className="text-[11px] text-slate-400">{edu.startDate} – {edu.endDate}</p>
              </div>
              <p className="text-[12px] text-slate-600">{edu.institution}</p>
              {edu.description && <p className="mt-0.5 text-[12px] text-slate-500 italic">{edu.description}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    skills: () => (
      <>
        <SectionHeading>Skills</SectionHeading>
        <div className="space-y-1.5">
          {skillGroups.map((g) => (
            <div key={g.category} className="flex gap-2 text-[12px]">
              <span className="w-36 shrink-0 font-semibold text-slate-600">{g.category}</span>
              <div className="flex flex-wrap gap-1">
                {g.skills.map((s) => (
                  <span key={s.name} className="rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    ),
    projects: () => (
      <>
        <SectionHeading>Projects</SectionHeading>
        <div className="space-y-3">
          {resume.projects.map((p, i) => (
            <div key={p._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold text-slate-900">{p.title}</p>
                {p.link && <span className="font-mono text-[10.5px] text-slate-400">{p.link}</span>}
              </div>
              {p.technologies && <p className="font-mono text-[11px]" style={{ color: theme.accent }}>{p.technologies}</p>}
              {p.description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-700">{p.description}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    internships: () => (
      <>
        <SectionHeading>Internships</SectionHeading>
        <div className="space-y-3">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold text-slate-900">{it.role} · {it.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              </div>
              <p className="text-[12px] text-slate-500">{it.location}</p>
              {it.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-relaxed">
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
        <div className="space-y-3">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold text-slate-900">{v.role} · {v.organization}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
              </div>
              {v.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-relaxed">
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
        <div className="space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold text-slate-900">{exp.role} · {exp.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-relaxed">
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
        <SectionHeading>Leadership & Activities</SectionHeading>
        <div className="space-y-1">
          {resume.positionsOfResponsibility.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px]">
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
        <div className="space-y-0.5">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i} className="text-[12.5px]">{c.name} — <span className="text-slate-500">{c.issuer}{c.year && `, ${c.year}`}</span></p>
          ))}
        </div>
      </>
    ),
    achievements: () => (
      <>
        <SectionHeading>Honours & Awards</SectionHeading>
        <div className="space-y-0.5">
          {resume.achievements.map((a, i) => (
            <p key={a._id || i} className="text-[12.5px]">{a.title}{a.year && <span className="text-slate-400"> ({a.year})</span>}</p>
          ))}
        </div>
      </>
    ),
    publications: () => (
      <>
        <SectionHeading>Publications</SectionHeading>
        <div className="space-y-0.5">
          {resume.publications.map((p, i) => <p key={p._id || i} className="text-[12.5px]">{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>)}
        </div>
      </>
    ),
    trainings: () => (
      <>
        <SectionHeading>Trainings</SectionHeading>
        <div className="space-y-0.5">
          {resume.trainings.map((t, i) => <p key={t._id || i} className="text-[12.5px]">{t.title}, {t.provider}</p>)}
        </div>
      </>
    ),
    scholarships: () => (
      <>
        <SectionHeading>Scholarships</SectionHeading>
        <div className="space-y-0.5">
          {resume.scholarships.map((s, i) => (
            <p key={s._id || i} className="text-[12.5px]">{s.title} — <span className="text-slate-500">{s.institution}</span></p>
          ))}
        </div>
      </>
    ),
    languages: () => (
      <>
        <SectionHeading>Languages</SectionHeading>
        <p className="text-[12.5px] text-slate-600">{resume.languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</p>
      </>
    ),
    references: () => (
      <>
        <SectionHeading>References</SectionHeading>
        <div className="space-y-0.5">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12.5px]">{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>
          ))}
        </div>
      </>
    ),
    hobbies: () => (
      <>
        <SectionHeading>Interests</SectionHeading>
        <p className="text-[12.5px] text-slate-600">{resume.hobbies.join(' · ')}</p>
      </>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white px-10 py-9 text-slate-800"
      style={{ fontFamily: theme.fontBody }}
    >
      {/* Header */}
      <div className="border-b-2 pb-4" style={{ borderColor: theme.accent }}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: theme.fontHeading }}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="mt-0.5 text-sm font-medium" style={{ color: theme.accent }}>
          {resume.targetRole || 'Target Role'}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-slate-500">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
          {personalInfo.github && <span>{personalInfo.github}</span>}
          {personalInfo.website && <span>{personalInfo.website}</span>}
        </div>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <React.Fragment key={id}>
              <SectionHeading>{custom.title}</SectionHeading>
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">{custom.content}</p>
            </React.Fragment>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default FreshGradTemplate;
