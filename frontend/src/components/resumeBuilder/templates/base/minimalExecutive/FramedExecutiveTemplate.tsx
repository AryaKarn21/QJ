import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, skillsAsPlainText } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';
import { ResumePhoto } from '../../shared/ResumePhoto';
import type { PhotoPosition } from '../../variantTypes';

interface TemplateProps {
  resume: Resume;
  photoPosition?: PhotoPosition;
}

/**
 * Minimal Executive — Framed Photo. Photo sits inside a thin bordered frame
 * to the left of the name, echoing an official portrait rather than a
 * casual headshot. Otherwise shares the Whitespace variant's restrained,
 * serif-leaning executive tone.
 */
export const FramedExecutiveTemplate: React.FC<TemplateProps> = ({ resume, photoPosition }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const hasPhoto = !!personalInfo.photo && !!photoPosition;
  const shape = photoPosition === 'left-square' ? 'square' : 'circle';

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[10.5px] font-medium uppercase tracking-[0.25em] text-slate-400">{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-7">
      <Heading>{title}</Heading>
      <div className="mt-2.5 space-y-1 text-[12.5px] text-slate-600">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-7">
        <Heading>Executive Summary</Heading>
        <p className="mt-2.5 text-[13px] leading-loose text-slate-700">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-7">
        <Heading>Experience</Heading>
        <div className="mt-2.5 space-y-4">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i} className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[13.5px] font-semibold text-slate-900">{exp.role || 'Role'}</p>
                <p className="text-[12px]" style={{ color: theme.accent }}>{exp.company || 'Company'}</p>
                {exp.description && <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{exp.description}</p>}
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-7">
        <Heading>Education</Heading>
        <div className="mt-2.5 space-y-1.5">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-baseline justify-between">
              <p className="text-[12.5px] font-medium text-slate-800">{edu.degree}, {edu.institution}</p>
              <p className="text-[11px] text-slate-400">{edu.startDate}–{edu.endDate}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-7">
        <Heading>Key Initiatives</Heading>
        <div className="mt-2.5 space-y-1.5">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">{p.title}.</span> {p.description}</p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-7">
        <Heading>Core Competencies</Heading>
        <p className="mt-2.5 text-[12.5px] leading-loose text-slate-600">{skillsAsPlainText(resume.skills)}</p>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company} — {formatDateRange(it.startDate, it.endDate, it.current)}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Board & Volunteer Roles">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}{a.description && ` — ${a.description}`}</p>)}
      </Extra>
    ),
    publications: () => (
      <Extra title="Publications">
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution} {s.year && `(${s.year})`}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization} ({formatDateRange(p.startDate, p.endDate)})</p>)}
      </Extra>
    ),
    hobbies: () => (<Extra title="Interests"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white px-12 py-12 text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <div className={`flex items-center ${hasPhoto ? 'gap-5' : ''} border-b pb-6`} style={{ borderColor: theme.accentSoft }}>
        <ResumePhoto src={hasPhoto ? personalInfo.photo : undefined} shape={shape} size={80} className="border-2 p-0.5" />
        <div>
          <h1 className="text-[24px] font-light uppercase tracking-[0.12em] text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
          <p className="mt-1.5 text-[11.5px] uppercase tracking-[0.18em]" style={{ color: theme.accent }}>{resume.targetRole || 'Target Role'}</p>
          <p className="mt-2 text-[11px] text-slate-400">
            {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('   ·   ')}
          </p>
        </div>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-7">
              <Heading>{custom.title}</Heading>
              <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-loose text-slate-700">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default FramedExecutiveTemplate;
