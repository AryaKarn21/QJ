import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

// Sidebar-locked section ids — render inside the bold colored left column.
// Everything else in the manageable-section list renders in the main body.
const SIDEBAR_IDS = ['skills', 'education', 'certifications', 'hobbies'];

/**
 * Bold Sidebar — full-height colored sidebar with name stacked vertically.
 * Strong typographic contrast between sidebar and body. Great for creative
 * directors, brand designers, and marketing professionals.
 */
export const BoldSidebarTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const SideLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-2 mt-4 text-[9.5px] font-bold uppercase tracking-[0.15em] text-white/60 first:mt-0">
      {children}
    </p>
  );

  const BodyHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-5 mb-2">
      <h2 className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">{children}</h2>
      <div className="mt-1 h-[1.5px] w-full bg-slate-100" />
    </div>
  );

  // Section-wise layout system: one map covering every manageable section
  // used anywhere in this template. Sidebar entries render inside the bold
  // colored left column; everything else renders in the main body.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <>
        <SideLabel>Skills</SideLabel>
        <div className="space-y-1">
          {resume.skills.map((s) => (
            <div key={s.name}>
              <p className="text-[11.5px] text-white/90">{s.name}</p>
              {s.level && (
                <div className="mt-0.5 h-1 w-full rounded-full bg-white/20">
                  <div
                    className="h-1 rounded-full bg-white/70"
                    style={{
                      width: s.level === 'Expert' ? '100%' : s.level === 'Advanced' ? '75%' : s.level === 'Intermediate' ? '55%' : '35%',
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    ),
    education: () => (
      <>
        <SideLabel>Education</SideLabel>
        <div className="space-y-2 text-[11px] text-white/80">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i}>
              <p className="font-semibold text-white">{edu.degree}</p>
              <p>{edu.institution}</p>
              <p className="text-white/50">{edu.endDate}</p>
            </div>
          ))}
        </div>
      </>
    ),
    certifications: () => (
      <>
        <SideLabel>Credentials</SideLabel>
        <div className="space-y-1.5 text-[11px] text-white/80">
          {resume.certifications.map((c, i) => (
            <div key={c._id || i}>
              <p className="font-semibold text-white">{c.name}</p>
              <p>{c.issuer}{c.year && `, ${c.year}`}</p>
            </div>
          ))}
        </div>
      </>
    ),
    hobbies: () => (
      <>
        <SideLabel>Interests</SideLabel>
        <p className="text-[11px] text-white/70 leading-relaxed">{resume.hobbies.join(', ')}</p>
      </>
    ),
    summary: () => (
      <p className="text-[12.5px] leading-relaxed text-slate-600">{resume.summary}</p>
    ),
    experience: () => (
      <>
        <BodyHeading>Experience</BodyHeading>
        <div className="space-y-4">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold text-slate-900">{exp.role}</p>
                <p className="shrink-0 text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px] font-semibold" style={{ color: theme.accent }}>{exp.company}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px]">
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
        <BodyHeading>Selected Work</BodyHeading>
        <div className="space-y-3">
          {resume.projects.map((p, i) => (
            <div key={p._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold">{p.title}</p>
                {p.link && <span className="font-mono text-[10px] text-slate-400">{p.link}</span>}
              </div>
              {p.technologies && <p className="text-[11px] font-medium" style={{ color: theme.accent }}>{p.technologies}</p>}
              {p.description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600">{p.description}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    achievements: () => (
      <>
        <BodyHeading>Recognition</BodyHeading>
        <div className="space-y-0.5">
          {resume.achievements.map((a, i) => (
            <p key={a._id || i} className="text-[12.5px]">{a.title}{a.year && <span className="text-slate-400"> · {a.year}</span>}</p>
          ))}
        </div>
      </>
    ),
    publications: () => (
      <>
        <BodyHeading>Publications</BodyHeading>
        <div className="space-y-1.5">
          {resume.publications.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px]">
              <span className="font-semibold">{p.title}</span>
              {p.publisher && <span className="text-slate-500 italic"> — {p.publisher}</span>}
              {p.year && <span className="text-slate-400"> ({p.year})</span>}
            </p>
          ))}
        </div>
      </>
    ),
    internships: () => (
      <>
        <BodyHeading>Internships</BodyHeading>
        <div className="space-y-2">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{it.role} · {it.company}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              </div>
              {it.description && (
                <ul className="mt-0.5 list-disc pl-4 text-[12.5px]">
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
        <BodyHeading>Volunteer Experience</BodyHeading>
        <div className="space-y-2">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{v.role} · {v.organization}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
              </div>
              {v.description && (
                <ul className="mt-0.5 list-disc pl-4 text-[12.5px]">
                  {toBulletLines(v.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </>
    ),
    trainings: () => (
      <>
        <BodyHeading>Trainings</BodyHeading>
        <div className="space-y-0.5">
          {resume.trainings.map((t, i) => <p key={t._id || i} className="text-[12.5px]">{t.title}, {t.provider}</p>)}
        </div>
      </>
    ),
    scholarships: () => (
      <>
        <BodyHeading>Scholarships</BodyHeading>
        <div className="space-y-0.5">
          {resume.scholarships.map((s, i) => <p key={s._id || i} className="text-[12.5px]">{s.title}, {s.institution}</p>)}
        </div>
      </>
    ),
    positionsOfResponsibility: () => (
      <>
        <BodyHeading>Positions of Responsibility</BodyHeading>
        <div className="space-y-0.5">
          {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i} className="text-[12.5px]">{p.title}, {p.organization}</p>)}
        </div>
      </>
    ),
    languages: () => (
      <>
        <BodyHeading>Languages</BodyHeading>
        <p className="text-[12.5px] text-slate-600">{resume.languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</p>
      </>
    ),
    references: () => (
      <>
        <BodyHeading>References</BodyHeading>
        <div className="space-y-0.5">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12.5px]">{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>
          ))}
        </div>
      </>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const sidebarSections = visible.filter((id) => SIDEBAR_IDS.includes(id));
  const mainSections = visible.filter((id) => !SIDEBAR_IDS.includes(id));

  return (
    <div
      className="mx-auto flex w-full max-w-[720px] bg-white text-slate-800"
      style={{ fontFamily: theme.fontBody, minHeight: '900px' }}
    >
      {/* Bold left sidebar */}
      <div
        className="flex w-[180px] shrink-0 flex-col px-5 py-7 text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {/* Name stacked */}
        <div className="mb-6">
          <h1
            className="text-xl font-bold leading-tight tracking-tight"
            style={{ fontFamily: theme.fontHeading }}
          >
            {(personalInfo.fullName || 'Your Name').split(' ').map((word, i) => (
              <span key={i} className="block">{word}</span>
            ))}
          </h1>
          <p className="mt-2 text-[11px] font-medium text-white/70">{resume.targetRole || 'Creative Professional'}</p>
        </div>

        {/* Contact */}
        <SideLabel>Contact</SideLabel>
        <div className="space-y-1 text-[11px] text-white/80">
          {personalInfo.email && <p className="break-all">{personalInfo.email}</p>}
          {personalInfo.phone && <p>{personalInfo.phone}</p>}
          {personalInfo.location && <p>{personalInfo.location}</p>}
          {personalInfo.website && <p className="break-all">{personalInfo.website}</p>}
          {personalInfo.linkedin && <p className="break-all">{personalInfo.linkedin}</p>}
        </div>

        {sidebarSections.map((id) => (
          <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>
        ))}
      </div>

      {/* Main body */}
      <div className="flex-1 px-7 py-7">
        {mainSections.map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <React.Fragment key={id}>
                <BodyHeading>{custom.title}</BodyHeading>
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">{custom.content}</p>
              </React.Fragment>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default BoldSidebarTemplate;
