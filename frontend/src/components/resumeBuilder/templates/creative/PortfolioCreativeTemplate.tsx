import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

// Sidebar-locked section ids — render inside the tinted left column.
// Everything else in the manageable-section list renders in the main column.
const SIDEBAR_IDS = ['skills', 'certifications', 'education', 'hobbies'];

/**
 * Portfolio Creative — designed for designers, illustrators, and makers.
 * Large accent header bar, project cards with tech/tool tags, and a clean
 * two-column layout that puts skills and contact in a sidebar.
 */
export const PortfolioCreativeTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const SideLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
      {children}
    </p>
  );

  const MainHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
      {children}
    </h2>
  );

  // Section-wise layout system: one map covering every manageable section
  // used anywhere in this template. Sidebar entries render inside the
  // tinted left column; everything else renders in the main content area.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <div className="mb-5">
        <SideLabel>Skills</SideLabel>
        <div className="space-y-1">
          {resume.skills.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
              <span className="text-slate-700">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    certifications: () => (
      <div className="mb-5">
        <SideLabel>Credentials</SideLabel>
        <div className="space-y-1.5">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i} className="leading-snug text-slate-600">
              {c.name}
              <span className="block text-slate-400">{c.issuer}{c.year && `, ${c.year}`}</span>
            </p>
          ))}
        </div>
      </div>
    ),
    education: () => (
      <div className="mb-5">
        <SideLabel>Education</SideLabel>
        <div className="space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i}>
              <p className="font-semibold leading-snug text-slate-700">{edu.degree}</p>
              <p className="text-slate-500">{edu.institution}</p>
              <p className="text-slate-400">{edu.endDate}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    hobbies: () => (
      <div className="mb-5">
        <SideLabel>Interests</SideLabel>
        <p className="leading-relaxed text-slate-600">{resume.hobbies.join(', ')}</p>
      </div>
    ),
    summary: () => (
      <div className="mb-5">
        <p className="border-l-2 pl-3 text-[12.5px] italic leading-relaxed text-slate-600" style={{ borderColor: theme.accent }}>
          {resume.summary}
        </p>
      </div>
    ),
    projects: () => (
      <div className="mb-5">
        <MainHeading>Portfolio</MainHeading>
        <div className="space-y-4">
          {resume.projects.map((p, i) => (
            <div key={p._id || i} className="rounded-lg border p-3" style={{ borderColor: theme.accentSoft }}>
              <div className="flex items-start justify-between">
                <p className="text-[13px] font-bold text-slate-900">{p.title}</p>
                {p.link && <span className="font-mono text-[10px] text-slate-400">{p.link}</span>}
              </div>
              {p.description && <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{p.description}</p>}
              {p.technologies && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.technologies.split(',').map((t) => (
                    <span key={t} className="rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    experience: () => (
      <div className="mb-5">
        <MainHeading>Experience</MainHeading>
        <div className="space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{exp.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px]" style={{ color: theme.accent }}>{exp.company}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px]">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    internships: () => (
      <div className="mb-5">
        <MainHeading>Internships</MainHeading>
        <div className="space-y-3">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{it.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              </div>
              <p className="text-[12px]" style={{ color: theme.accent }}>{it.company}</p>
              {it.description && <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{it.description}</p>}
            </div>
          ))}
        </div>
      </div>
    ),
    volunteering: () => (
      <div className="mb-5">
        <MainHeading>Volunteer Experience</MainHeading>
        <div className="space-y-3">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{v.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
              </div>
              <p className="text-[12px]" style={{ color: theme.accent }}>{v.organization}</p>
              {v.description && <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{v.description}</p>}
            </div>
          ))}
        </div>
      </div>
    ),
    achievements: () => (
      <div className="mb-5">
        <MainHeading>Recognition</MainHeading>
        <div className="space-y-1">
          {resume.achievements.map((a, i) => (
            <p key={a._id || i} className="text-[12.5px]">
              <span className="mr-1.5" style={{ color: theme.accent }}>✦</span>
              {a.title}{a.year && <span className="text-slate-400"> ({a.year})</span>}
            </p>
          ))}
        </div>
      </div>
    ),
    publications: () => (
      <div className="mb-5">
        <MainHeading>Publications</MainHeading>
        <div className="space-y-1">
          {resume.publications.map((p, i) => <p key={p._id || i} className="text-[12.5px]">{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>)}
        </div>
      </div>
    ),
    trainings: () => (
      <div className="mb-5">
        <MainHeading>Trainings</MainHeading>
        <div className="space-y-1">
          {resume.trainings.map((t, i) => <p key={t._id || i} className="text-[12.5px]">{t.title}, {t.provider}</p>)}
        </div>
      </div>
    ),
    scholarships: () => (
      <div className="mb-5">
        <MainHeading>Scholarships</MainHeading>
        <div className="space-y-1">
          {resume.scholarships.map((s, i) => <p key={s._id || i} className="text-[12.5px]">{s.title}, {s.institution}</p>)}
        </div>
      </div>
    ),
    positionsOfResponsibility: () => (
      <div className="mb-5">
        <MainHeading>Positions of Responsibility</MainHeading>
        <div className="space-y-1">
          {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i} className="text-[12.5px]">{p.title}, {p.organization}</p>)}
        </div>
      </div>
    ),
    languages: () => (
      <div className="mb-5">
        <MainHeading>Languages</MainHeading>
        <p className="text-[12.5px] text-slate-600">{resume.languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</p>
      </div>
    ),
    references: () => (
      <div className="mb-5">
        <MainHeading>References</MainHeading>
        <div className="space-y-1">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12.5px]">{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>
          ))}
        </div>
      </div>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const sidebarSections = visible.filter((id) => SIDEBAR_IDS.includes(id));
  const mainSections = visible.filter((id) => !SIDEBAR_IDS.includes(id));

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white text-slate-800"
      style={{ fontFamily: theme.fontBody }}
    >
      {/* Full-width accent header */}
      <div className="px-8 py-7" style={{ backgroundColor: theme.accent }}>
        <h1 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: theme.fontHeading }}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="mt-1 text-sm font-medium text-white/80">{resume.targetRole || 'Creative Professional'}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-white/70">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.website && <span>{personalInfo.website}</span>}
          {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-44 shrink-0 px-5 py-6 text-[11.5px]" style={{ backgroundColor: theme.accentSoft }}>
          {sidebarSections.map((id) => (
            <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 px-6 py-6">
          {mainSections.map((id) => {
            if (id.startsWith('custom:')) {
              const custom = getCustomSectionContent(resume, id);
              if (!custom) return null;
              return (
                <div key={id} className="mb-5">
                  <MainHeading>{custom.title}</MainHeading>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">{custom.content}</p>
                </div>
              );
            }
            return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
          })}
        </div>
      </div>
    </div>
  );
};

export default PortfolioCreativeTemplate;
