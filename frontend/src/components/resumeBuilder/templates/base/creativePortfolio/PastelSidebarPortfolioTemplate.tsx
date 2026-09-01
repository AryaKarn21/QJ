import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, getInitials, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const SIDEBAR_IDS = ['skills', 'certifications', 'education', 'languages', 'hobbies'];

/**
 * Creative Portfolio — Pastel Sidebar. A soft pastel-tinted sidebar (not a
 * solid saturated color block like Bold Sidebar/Professional Sidebar)
 * carries a large rounded photo and skill "pill" tags with soft shadows;
 * main column reads as a clean magazine-style project spread.
 */
export const PastelSidebarPortfolioTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const SideLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.15em] first:mt-0" style={{ color: theme.accent }}>{children}</p>
  );
  const MainHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-5">
      <MainHeading>{title}</MainHeading>
      <div className="mt-2 space-y-1 text-[12.5px] text-slate-600">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <div className="flex flex-wrap gap-1.5">
        {resume.skills.map((s, i) => (
          <span key={s._id || i} className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-medium text-slate-600 shadow-sm">{s.name}</span>
        ))}
      </div>
    ),
    certifications: () => (
      <div className="space-y-1.5 text-[11px] text-slate-600">
        {resume.certifications.map((c, i) => (
          <p key={c._id || i} className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm">{c.name}{c.issuer && <span className="block text-slate-400">{c.issuer}</span>}</p>
        ))}
      </div>
    ),
    education: () => (
      <div className="space-y-2 text-[11px] text-slate-600">
        {resume.education.map((edu, i) => (
          <div key={edu._id || i}>
            <p className="font-semibold text-slate-800">{edu.degree}</p>
            <p>{edu.institution}</p>
            <p className="text-slate-400">{edu.endDate}</p>
          </div>
        ))}
      </div>
    ),
    languages: () => (
      <div className="space-y-1 text-[11px] text-slate-600">
        {resume.languages.map((l, i) => <p key={l._id || i}>{l.name} — {l.level}</p>)}
      </div>
    ),
    hobbies: () => <p className="text-[11px] leading-relaxed text-slate-600">{resume.hobbies.join(', ')}</p>,
    summary: () => (
      <section>
        <p className="border-l-2 pl-3 text-[12.5px] italic leading-relaxed text-slate-600" style={{ borderColor: theme.accent }}>{resume.summary}</p>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <MainHeading>Portfolio</MainHeading>
        <div className="mt-2.5 space-y-3">
          {resume.projects.map((p, i) => (
            <div key={p._id || i} className="rounded-xl border border-slate-100 p-3 shadow-sm">
              <p className="text-[13px] font-bold text-slate-900">{p.title}</p>
              {p.description && <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{p.description}</p>}
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
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>)}
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
      <aside className="w-[210px] shrink-0 px-5 py-7" style={{ backgroundColor: theme.accentSoft }}>
        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg font-bold shadow-sm" style={{ color: theme.accent }}>
          {personalInfo.photo ? (
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          ) : (
            getInitials(personalInfo.fullName || 'Your Name')
          )}
        </div>
        <h1 className="mt-4 text-center text-[16px] font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
        <p className="mt-1 text-center text-[11px] font-medium" style={{ color: theme.accent }}>{resume.targetRole || 'Creative Professional'}</p>

        <SideLabel>Contact</SideLabel>
        <div className="space-y-1 text-[11px] text-slate-600">
          {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.website, personalInfo.linkedin].filter(Boolean).map((v, i) => (
            <p key={i} className="break-all">{v}</p>
          ))}
        </div>

        {sidebarSections.map((id) => (
          <React.Fragment key={id}>
            <SideLabel>{id === 'skills' ? 'Skills' : id === 'certifications' ? 'Credentials' : id === 'education' ? 'Education' : id === 'languages' ? 'Languages' : 'Interests'}</SideLabel>
            {sectionRenderers[id]?.()}
          </React.Fragment>
        ))}
      </aside>

      <div className="flex-1 px-7 py-7">
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

export default PastelSidebarPortfolioTemplate;
