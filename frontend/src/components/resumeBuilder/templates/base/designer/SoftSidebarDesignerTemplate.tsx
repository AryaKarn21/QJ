import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, getInitials, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const SIDEBAR_IDS = ['skills', 'certifications', 'languages', 'hobbies'];

/**
 * Designer/Creative — Soft Sidebar. A dark charcoal (not brand-colored)
 * sidebar with a large circular photo and rounded skill "dots"; main
 * column favors big project titles with thin rule separators — distinct
 * from Creative Portfolio's Pastel Sidebar (light background vs dark here).
 */
export const SoftSidebarDesignerTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const SideLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 first:mt-0">{children}</p>
  );
  const MainHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-800">{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-5">
      <MainHeading>{title}</MainHeading>
      <div className="mt-2 space-y-1 text-[12.5px] text-slate-600">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <div className="space-y-1.5">
        {resume.skills.map((s, i) => (
          <div key={s._id || i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
            <span className="text-[11.5px] text-white/85">{s.name}</span>
          </div>
        ))}
      </div>
    ),
    certifications: () => (
      <div className="space-y-1.5 text-[11px] text-white/70">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}{c.year && ` · ${c.year}`}</p>)}
      </div>
    ),
    languages: () => (
      <div className="space-y-1 text-[11px] text-white/70">
        {resume.languages.map((l, i) => <p key={l._id || i}>{l.name} — {l.level}</p>)}
      </div>
    ),
    hobbies: () => <p className="text-[11px] leading-relaxed text-white/70">{resume.hobbies.join(', ')}</p>,
    summary: () => (
      <section>
        <p className="text-[12.5px] italic leading-relaxed text-slate-600">{resume.summary}</p>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <MainHeading>Selected Work</MainHeading>
        <div className="mt-2.5 space-y-3">
          {resume.projects.map((p, i) => (
            <div key={p._id || i} className="border-b border-slate-100 pb-2.5">
              <p className="text-[15px] font-bold text-slate-900">{p.title}</p>
              {p.description && <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{p.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <MainHeading>Experience</MainHeading>
        <div className="mt-2.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-semibold">{exp.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px]" style={{ color: theme.accent }}>{exp.company}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] text-slate-600">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
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
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Recognition">
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
    education: () => (
      <Extra title="Education">
        {resume.education.map((edu, i) => <p key={edu._id || i}><span className="font-semibold">{edu.degree}</span>, {edu.institution}</p>)}
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const sidebarSections = visible.filter((id) => SIDEBAR_IDS.includes(id));
  const mainSections = visible.filter((id) => !SIDEBAR_IDS.includes(id));

  return (
    <div className="mx-auto flex w-full max-w-[720px] bg-white text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <aside className="w-[220px] shrink-0 bg-slate-900 px-6 py-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-bold text-white">
          {personalInfo.photo ? (
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          ) : (
            getInitials(personalInfo.fullName || 'Your Name')
          )}
        </div>
        <h1 className="mt-4 text-center text-[16px] font-bold text-white">{personalInfo.fullName || 'Your Name'}</h1>
        <p className="mt-1 text-center text-[11px] font-medium" style={{ color: theme.accent }}>{resume.targetRole || 'Creative Professional'}</p>

        <SideLabel>Contact</SideLabel>
        <div className="space-y-1 text-[11px] text-white/70">
          {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.website].filter(Boolean).map((v, i) => (
            <p key={i} className="break-all">{v}</p>
          ))}
        </div>

        {sidebarSections.map((id) => (
          <React.Fragment key={id}>
            <SideLabel>{id === 'skills' ? 'Skills' : id === 'certifications' ? 'Credentials' : id === 'languages' ? 'Languages' : 'Interests'}</SideLabel>
            {sectionRenderers[id]?.()}
          </React.Fragment>
        ))}
      </aside>

      <div className="flex-1 px-7 py-8">
        {mainSections.map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="mt-5">
                <MainHeading>{custom.title}</MainHeading>
                <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">{custom.content}</p>
              </section>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default SoftSidebarDesignerTemplate;
