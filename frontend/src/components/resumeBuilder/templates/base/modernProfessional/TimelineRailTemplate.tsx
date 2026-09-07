import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, skillsAsPlainText } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

import { ResumeLink } from '../../shared/ResumeLink';
interface TemplateProps {
  resume: Resume;
}

/**
 * Modern Professional — Timeline Rail. No photo (ATS-safe, clean). A single
 * vertical rail with connecting dots runs through every dated section
 * (experience, education, internships, volunteering) — the one structural
 * idea this variant is built around, distinct from Header Band/Split Header.
 */
export const TimelineRailTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: theme.accent }}>{children}</h2>
  );
  const Rail: React.FC<{ date: string; children: React.ReactNode }> = ({ date, children }) => (
    <div className="relative pl-5">
      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
      <span className="absolute left-[3px] top-3.5 bottom-0 w-px" style={{ backgroundColor: theme.accentSoft }} />
      <div className="flex items-baseline justify-between">
        {children}
      </div>
      <p className="text-[11px] text-slate-400">{date}</p>
    </div>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 pl-5 text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Summary</Heading>
        <p className="mt-1.5 pl-5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <Heading>Experience</Heading>
        <div className="mt-2 space-y-4">
          {resume.experience.map((exp, i) => (
            <Rail key={exp._id || i} date={formatDateRange(exp.startDate, exp.endDate, exp.current)}>
              <p className="text-[13px] font-semibold">{exp.role || 'Role'} · {exp.company || 'Company'}</p>
            {exp.link && <ResumeLink href={exp.link} label="Company Link" color={theme.accent} className="mt-0.5 inline-block" />}
            </Rail>
          ))}
          {resume.experience.map((exp, i) =>
            exp.description ? (
              <p key={`d-${exp._id || i}`} className="-mt-3 pl-5 text-[12.5px] leading-relaxed">{exp.description}</p>
            ) : null
          )}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <Heading>Education</Heading>
        <div className="mt-2 space-y-4">
          {resume.education.map((edu, i) => (
            <Rail key={edu._id || i} date={`${edu.startDate}–${edu.endDate}`}>
              <p className="text-[13px] font-semibold">{edu.degree || 'Degree'}, {edu.institution}</p>
            {edu.link && <ResumeLink href={edu.link} label="Institution Website" color={theme.accent} className="mt-0.5 inline-block" />}
            </Rail>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <Heading>Projects</Heading>
        <div className="mt-1.5 space-y-1.5 pl-5">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed"><span className="font-semibold">{p.title}.</span> {p.description}</p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-5">
        <Heading>Skills</Heading>
        <p className="mt-1.5 pl-5 text-[12.5px]">{skillsAsPlainText(resume.skills)}</p>
      </section>
    ),
    internships: () => (
      <section className="mt-5">
        <Heading>Internships</Heading>
        <div className="mt-2 space-y-4">
          {resume.internships.map((it, i) => (
            <Rail key={it._id || i} date={formatDateRange(it.startDate, it.endDate, it.current)}>
              <p className="text-[13px] font-semibold">{it.role || 'Role'}, {it.company}</p>
            {it.link && <ResumeLink href={it.link} label="Company Link" color={theme.accent} className="mt-0.5 inline-block" />}
            </Rail>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <section className="mt-5">
        <Heading>Volunteer Experience</Heading>
        <div className="mt-2 space-y-4">
          {resume.volunteering.map((v, i) => (
            <Rail key={v._id || i} date={formatDateRange(v.startDate, v.endDate, v.current)}>
              <p className="text-[13px] font-semibold">{v.role || 'Role'}, {v.organization}</p>
            {v.link && <ResumeLink href={v.link} label="Organization Link" color={theme.accent} className="mt-0.5 inline-block" />}
            </Rail>
          ))}
        </div>
      </section>
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
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')} {r.link && <ResumeLink href={r.link} label="Profile" color={theme.accent} />}</p>)}
      </Extra>
    ),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      <p className="mt-0.5 text-sm" style={{ color: theme.accent }}>{resume.targetRole || 'Target Role'}</p>
      <p className="mt-1.5 text-[11.5px] text-slate-500">
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('   ·   ')}
      </p>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-5">
              <Heading>{custom.title}</Heading>
              <p className="mt-1.5 pl-5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
              {custom.link && <ResumeLink href={custom.link} label="Learn More" color={theme.accent} />}
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default TimelineRailTemplate;
