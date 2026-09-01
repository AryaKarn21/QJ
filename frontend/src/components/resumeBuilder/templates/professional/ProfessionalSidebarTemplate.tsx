import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, getInitials, groupSkillsByCategory } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

// Sidebar-locked section ids — render inside the colored left column.
// Everything else in the manageable-section list renders in the main column.
const SIDEBAR_IDS = ['skills', 'languages', 'certifications'];

/**
 * Professional Sidebar — the classic two-column format: a colored sidebar
 * carries photo, contact, and skills (grouped, with a dedicated Languages
 * block); the main column is a clean chronological read of experience,
 * education, and projects.
 */
export const ProfessionalSidebarTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const skillGroups = groupSkillsByCategory(resume.skills);
  const otherSkillGroups = skillGroups.filter((g) => g.category !== 'Languages');

  const MainHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accent }}>{children}</h2>
  );

  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-5">
      <MainHeading>{title}</MainHeading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  // Section-wise layout system: one map covering every manageable section
  // used anywhere in this template. Sidebar entries render inside the
  // colored left column; everything else renders in the main column.
  // Note: `skills` here renders skill-category groups (unrelated to the
  // genuine CEFR `languages` block below, which reads resume.languages).
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <>
        {otherSkillGroups.length > 0 && (
          <div className="mt-6">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/70">Skills</h2>
            <div className="mt-2 space-y-2">
              {otherSkillGroups.map((g) => (
                <div key={g.category}>
                  <p className="text-[10px] uppercase tracking-wide text-white/60">{g.category}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {g.skills.map((s, i) => (
                      <span key={s._id || i} className="rounded bg-white/15 px-2 py-0.5 text-[11px]">{s.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    ),
    languages: () => (
      <div className="mt-6">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/70">Languages</h2>
        <div className="mt-2 space-y-1 text-[11.5px] text-white/90">
          {resume.languages.map((l, i) => (
            <p key={l._id || i}>{l.name} <span className="text-white/60">— {l.level}</span></p>
          ))}
        </div>
      </div>
    ),
    certifications: () => (
      <div className="mt-6">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/70">Certifications</h2>
        <div className="mt-2 space-y-1 text-[11px] text-white/90">
          {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name} {c.year && `(${c.year})`}</p>)}
        </div>
      </div>
    ),
    summary: () => (
      <section>
        <MainHeading>Summary</MainHeading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <MainHeading>Experience</MainHeading>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{exp.role || 'Role'} — {exp.company || 'Company'}</p>
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
        <MainHeading>Education</MainHeading>
        <div className="mt-1.5 space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i}>
              <p className="text-[13px] font-semibold">{edu.degree || 'Degree'}</p>
              <p className="text-[12px] text-slate-500">{edu.institution} · {edu.startDate}–{edu.endDate}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <MainHeading>Projects</MainHeading>
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
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
      </Extra>
    ),
    hobbies: () => (
      <Extra title="Hobbies">
        <p>{resume.hobbies.join(', ')}</p>
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const sidebarSections = visible.filter((id) => SIDEBAR_IDS.includes(id));
  const mainSections = visible.filter((id) => !SIDEBAR_IDS.includes(id));

  return (
    <div className="mx-auto flex w-full max-w-[720px] bg-white shadow-sm" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <aside className="w-[230px] shrink-0 p-6 text-white" style={{ backgroundColor: theme.accent }}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/15 text-lg font-bold">
          {personalInfo.photo ? (
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          ) : (
            getInitials(personalInfo.fullName || 'Your Name')
          )}
        </div>
        <h1 className="mt-4 text-center text-lg font-bold">{personalInfo.fullName || 'Your Name'}</h1>
        <p className="mt-0.5 text-center text-xs text-white/80">{resume.targetRole || 'Target Role'}</p>

        <div className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/70">Contact</h2>
          <div className="mt-2 space-y-1 text-[11.5px] text-white/90">
            {personalInfo.email && <p className="break-all">{personalInfo.email}</p>}
            {personalInfo.phone && <p>{personalInfo.phone}</p>}
            {personalInfo.location && <p>{personalInfo.location}</p>}
            {personalInfo.linkedin && <p className="break-all">{personalInfo.linkedin}</p>}
            {personalInfo.website && <p className="break-all">{personalInfo.website}</p>}
          </div>
        </div>

        {sidebarSections.map((id) => (
          <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>
        ))}
      </aside>

      <div className="flex-1 p-6">
        {mainSections.map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="mt-5">
                <MainHeading>{custom.title}</MainHeading>
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

export default ProfessionalSidebarTemplate;
