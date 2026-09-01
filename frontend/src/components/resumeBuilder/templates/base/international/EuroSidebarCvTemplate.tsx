import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, getInitials } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const SIDEBAR_IDS = ['skills', 'certifications', 'languages'];

/**
 * International/CV Style — Euro Sidebar. A navy "Personal Data" sidebar
 * carries photo + contact in the formal European CV convention (all-caps
 * field labels), separate from the existing Europass Style template's
 * off-white sidebar — this one uses a solid navy block and different
 * section ordering emphasis.
 */
export const EuroSidebarCvTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const SideLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-2 mt-5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50 first:mt-0">{children}</p>
  );
  const MainHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="border-b pb-1 text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: theme.accentSoft, color: theme.accent }}>{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <MainHeading>{title}</MainHeading>
      <div className="mt-1.5 space-y-0.5 text-[12px] text-slate-600">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <div className="flex flex-wrap gap-1">
        {resume.skills.map((s, i) => <span key={s._id || i} className="rounded bg-white/10 px-1.5 py-0.5 text-[10.5px] text-white/90">{s.name}</span>)}
      </div>
    ),
    certifications: () => (
      <div className="space-y-1 text-[11px] text-white/80">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}{c.year && ` (${c.year})`}</p>)}
      </div>
    ),
    languages: () => (
      <div className="space-y-1 text-[11px] text-white/80">
        {resume.languages.map((l, i) => <p key={l._id || i}>{l.name} — {l.level}</p>)}
      </div>
    ),
    summary: () => (
      <section>
        <MainHeading>Profile</MainHeading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-700">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <MainHeading>Work Experience</MainHeading>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              <p className="text-[13px] font-semibold">{exp.role || 'Role'}</p>
              <p className="text-[12px] text-slate-500">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
              {exp.description && <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed">{exp.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <MainHeading>Education and Training</MainHeading>
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
        <MainHeading>Projects</MainHeading>
        <div className="mt-1.5 space-y-2">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px]"><span className="font-semibold">{p.title}.</span> {p.description}</p>
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
      <Extra title="Additional Trainings">
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
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
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
    <div className="mx-auto flex w-full max-w-[720px] bg-white text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <aside className="w-[210px] shrink-0 bg-[#1e3a5f] px-5 py-7">
        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-md bg-white/10 text-base font-bold text-white">
          {personalInfo.photo ? (
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          ) : (
            getInitials(personalInfo.fullName || 'Your Name')
          )}
        </div>
        <SideLabel>Personal Data</SideLabel>
        <div className="space-y-1 text-[11px] text-white/85">
          <p className="font-semibold text-white">{personalInfo.fullName || 'Your Name'}</p>
          {personalInfo.email && <p className="break-all">{personalInfo.email}</p>}
          {personalInfo.phone && <p>{personalInfo.phone}</p>}
          {personalInfo.location && <p>{personalInfo.location}</p>}
          {personalInfo.linkedin && <p className="break-all">{personalInfo.linkedin}</p>}
        </div>

        {sidebarSections.map((id) => (
          <React.Fragment key={id}>
            <SideLabel>{id === 'skills' ? 'Skills' : id === 'certifications' ? 'Certifications' : 'Language Skills'}</SideLabel>
            {sectionRenderers[id]?.()}
          </React.Fragment>
        ))}
      </aside>

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold" style={{ color: theme.accent }}>{personalInfo.fullName || 'Your Name'}</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{resume.targetRole || 'Target Role'}</p>

        {mainSections.map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="mt-4">
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

export default EuroSidebarCvTemplate;
