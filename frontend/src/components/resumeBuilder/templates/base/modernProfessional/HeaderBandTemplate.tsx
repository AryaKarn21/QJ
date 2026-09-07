import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, skillsAsPlainText } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';
import { ResumePhoto } from '../../shared/ResumePhoto';
import type { PhotoPosition } from '../../variantTypes';

import { ResumeLink } from '../../shared/ResumeLink';
interface TemplateProps {
  resume: Resume;
  photoPosition?: PhotoPosition;
}

/**
 * Modern Professional — Header Band. A full-width colored band carries
 * name, role and contact; photo (when supplied) sits to its left inside
 * the band. Body uses rounded pill date badges and a soft divider rhythm.
 */
export const HeaderBandTemplate: React.FC<TemplateProps> = ({ resume, photoPosition }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const hasPhoto = !!personalInfo.photo && !!photoPosition;
  const shape = photoPosition === 'left-square' ? 'square' : 'circle';

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: theme.accent }}>{children}</h2>
  );
  const DatePill: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    !children ? null : (
      <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px]" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>
        {children}
      </span>
    );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-4">
        <Heading>Summary</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <Heading>Experience</Heading>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold">{exp.role || 'Role'} · {exp.company || 'Company'}</p>
                <DatePill>{formatDateRange(exp.startDate, exp.endDate, exp.current)}</DatePill>
              </div>
              {exp.description && <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed">{exp.description}</p>}
            {exp.link && <ResumeLink href={exp.link} label="Company Link" color={theme.accent} className="mt-0.5 inline-block" />}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-1.5">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-center justify-between">
              <p><span className="font-semibold">{edu.degree || 'Degree'}</span>{edu.institution && <span>, {edu.institution}</span>}</p>
              <DatePill>{edu.startDate}–{edu.endDate}</DatePill>
            {edu.link && <ResumeLink href={edu.link} label="Institution Website" color={theme.accent} className="mt-0.5 inline-block" />}
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-4">
        <Heading>Projects</Heading>
        <div className="mt-1.5 space-y-1.5">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed"><span className="font-semibold">{p.title}.</span> {p.description}</p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-4">
        <Heading>Skills</Heading>
        <p className="mt-1.5 text-[12.5px]">{skillsAsPlainText(resume.skills)}</p>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company} — {formatDateRange(it.startDate, it.endDate, it.current)} {it.link && <ResumeLink href={it.link} label="Company Link" color={theme.accent} />}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)} {v.link && <ResumeLink href={v.link} label="Organization Link" color={theme.accent} />}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`} {c.link && <ResumeLink href={c.link} label="View Credential" color={theme.accent} />}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}{a.description && ` — ${a.description}`} {a.link && <ResumeLink href={a.link} label="View Proof" color={theme.accent} />}</p>)}
      </Extra>
    ),
    publications: () => (
      <Extra title="Publications">
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher} {p.year && `(${p.year})`} {p.link && <ResumeLink href={p.link} label="View Publication" color={theme.accent} />}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider} {t.link && <ResumeLink href={t.link} label="View Course" color={theme.accent} />}</p>)}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution} {s.year && `(${s.year})`} {s.link && <ResumeLink href={s.link} label="View Award" color={theme.accent} />}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization} ({formatDateRange(p.startDate, p.endDate)}) {p.link && <ResumeLink href={p.link} label="Organization Link" color={theme.accent} />}</p>)}
      </Extra>
    ),
    hobbies: () => (
      <Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')} {r.link && <ResumeLink href={r.link} label="Profile" color={theme.accent} />}</p>)}
      </Extra>
    ),
    languages: () => (
      <Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <div className="px-10 py-7 text-white" style={{ backgroundColor: theme.accent }}>
        <div className={`flex items-center ${hasPhoto ? 'gap-4' : ''}`}>
          <ResumePhoto src={hasPhoto ? personalInfo.photo : undefined} shape={shape} size={72} className="border-2 border-white/40" />
          <div>
            <h1 className="text-2xl font-bold">{personalInfo.fullName || 'Your Name'}</h1>
            <p className="mt-0.5 text-sm text-white/85">{resume.targetRole || 'Target Role'}</p>
            <p className="mt-1.5 text-[11.5px] text-white/70">
              {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('   ·   ')}
            </p>
          </div>
        </div>
      </div>
      <div className="px-10 py-6">
        {getVisibleOrderedSections(resume).map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="mt-4">
                <Heading>{custom.title}</Heading>
                <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
                {custom.link && <ResumeLink href={custom.link} label="Learn More" color={theme.accent} />}
              </section>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default HeaderBandTemplate;
