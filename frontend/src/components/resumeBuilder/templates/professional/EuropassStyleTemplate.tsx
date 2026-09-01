import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, getInitials } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

// CEFR levels run A1 (lowest) through C2 (highest); "Native" sits above C2.
// Used to size the little proficiency bar next to each language, the same
// visual idea as the official Europass CV editor's language grid.
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];

const LevelBar: React.FC<{ level: string; accent: string }> = ({ level, accent }) => {
  const filled = Math.max(LEVEL_ORDER.indexOf(level), 0) + 1;
  return (
    <div className="flex gap-0.5">
      {LEVEL_ORDER.slice(0, 6).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-3 rounded-sm"
          style={{ backgroundColor: i < filled ? accent : '#e2e8f0' }}
        />
      ))}
    </div>
  );
};

// Sidebar-locked section ids for this template — these render inside the
// left personal-details column, in whatever relative order
// getVisibleOrderedSections produces, rather than in the main CV body.
const SIDEBAR_IDS = ['languages', 'skills', 'certifications'];

/**
 * Europass Style — referenced from the official EU Europass CV editor
 * (europa.eu/europass). Distinguishing features carried over: a compact
 * left-column personal-details block (photo, contact, nationality-style
 * fields folded into location), and a genuine Language Skills section
 * using CEFR levels (A1–C2 / Native) rather than the generic skill-level
 * scale used elsewhere in this app.
 */
export const EuropassStyleTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2
      className="border-b-2 pb-1 text-[11px] font-bold uppercase tracking-wider"
      style={{ borderColor: theme.accent, color: theme.accent }}
    >
      {children}
    </h2>
  );

  const SideTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
      {children}
    </h3>
  );

  const MainExtra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-1.5 space-y-0.5 text-[12px] text-slate-600">{children}</div>
    </section>
  );

  // Section-wise layout system: one map covering every manageable section
  // used anywhere in this template. Sidebar entries render inside the
  // left column; everything else renders in the main CV body.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    languages: () => (
      <div className="mt-5">
        <SideTitle>Language Skills</SideTitle>
        <div className="mt-2 space-y-2">
          {resume.languages.map((lang, i) => (
            <div key={lang._id || i}>
              <div className="flex items-baseline justify-between text-[11.5px]">
                <span className="font-medium">{lang.name}</span>
                <span className="text-[10px] text-slate-400">{lang.level}</span>
              </div>
              <div className="mt-0.5">
                <LevelBar level={lang.level} accent={theme.accent} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    skills: () => (
      <div className="mt-5">
        <SideTitle>Skills</SideTitle>
        <div className="mt-2 flex flex-wrap gap-1">
          {resume.skills
            .filter((s) => s.category !== 'Languages')
            .map((s, i) => (
              <span key={s._id || i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-600">
                {s.name}
              </span>
            ))}
        </div>
      </div>
    ),
    certifications: () => (
      <div className="mt-5">
        <SideTitle>Certifications</SideTitle>
        <div className="mt-2 space-y-1 text-[11px] text-slate-600">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i}>{c.name} {c.year && `(${c.year})`}</p>
          ))}
        </div>
      </div>
    ),
    summary: () => (
      <section className="mt-4">
        <SectionTitle>About Me</SectionTitle>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <SectionTitle>Work Experience</SectionTitle>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              <p className="text-[13px] font-semibold">{exp.role || 'Role'}</p>
              <p className="text-[12px] text-slate-500">{exp.company || 'Company'}{exp.location ? ` · ${exp.location}` : ''}</p>
              {exp.description && <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed">{exp.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <section className="mt-4">
        <SectionTitle>Internships</SectionTitle>
        <div className="mt-1.5 space-y-3">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              <p className="text-[13px] font-semibold">{it.role || 'Role'}</p>
              <p className="text-[12px] text-slate-500">{it.company || 'Company'}</p>
              {it.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{it.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <section className="mt-4">
        <SectionTitle>Volunteer Experience</SectionTitle>
        <div className="mt-1.5 space-y-3">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <p className="text-[11px] text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
              <p className="text-[13px] font-semibold">{v.role || 'Role'}</p>
              <p className="text-[12px] text-slate-500">{v.organization || 'Organization'}</p>
              {v.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{v.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <SectionTitle>Education and Training</SectionTitle>
        <div className="mt-1.5 space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i}>
              <p className="text-[11px] text-slate-400">{formatDateRange(edu.startDate, edu.endDate, false)}</p>
              <p className="text-[13px] font-semibold">{edu.degree || 'Degree'}</p>
              <p className="text-[12px] text-slate-500">{edu.institution}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-4">
        <SectionTitle>Projects</SectionTitle>
        <div className="mt-1.5 space-y-2">
          {resume.projects.map((p, i) => (
            <div key={p._id || i}>
              <p className="text-[13px] font-semibold">{p.title}</p>
              {p.description && <p className="text-[12.5px] leading-relaxed">{p.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    achievements: () => (
      <MainExtra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}{a.description && ` — ${a.description}`}</p>)}
      </MainExtra>
    ),
    publications: () => (
      <MainExtra title="Publications">
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>)}
      </MainExtra>
    ),
    trainings: () => (
      <MainExtra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </MainExtra>
    ),
    scholarships: () => (
      <MainExtra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution} {s.year && `(${s.year})`}</p>)}
      </MainExtra>
    ),
    positionsOfResponsibility: () => (
      <MainExtra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization} ({formatDateRange(p.startDate, p.endDate)})</p>)}
      </MainExtra>
    ),
    hobbies: () => (
      <MainExtra title="Hobbies">
        <p>{resume.hobbies.join(', ')}</p>
      </MainExtra>
    ),
    references: () => (
      <MainExtra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </MainExtra>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const sidebarSections = visible.filter((id) => SIDEBAR_IDS.includes(id));
  const mainSections = visible.filter((id) => !SIDEBAR_IDS.includes(id));

  return (
    <div
      className="mx-auto flex w-full max-w-[720px] bg-white text-slate-800"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Left column — personal details, Europass-style */}
      <aside className="w-[210px] shrink-0 border-r border-slate-200 p-5">
        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-base font-bold text-slate-400">
          {personalInfo.photo ? (
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          ) : (
            getInitials(personalInfo.fullName || 'Your Name')
          )}
        </div>

        <div className="mt-4">
          <SideTitle>Personal Information</SideTitle>
          <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-600">
            {personalInfo.email && <p className="break-all">{personalInfo.email}</p>}
            {personalInfo.phone && <p>{personalInfo.phone}</p>}
            {personalInfo.location && <p>{personalInfo.location}</p>}
            {personalInfo.linkedin && <p className="break-all">{personalInfo.linkedin}</p>}
            {personalInfo.website && <p className="break-all">{personalInfo.website}</p>}
            {personalInfo.github && <p className="break-all">{personalInfo.github}</p>}
          </div>
        </div>

        {sidebarSections.map((id) => (
          <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>
        ))}
      </aside>

      {/* Right column — chronological CV body */}
      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold" style={{ color: theme.accent }}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{resume.targetRole || 'Target Role'}</p>

        {mainSections.map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="mt-4">
                <SectionTitle>{custom.title}</SectionTitle>
                <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
              </section>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default EuropassStyleTemplate;
