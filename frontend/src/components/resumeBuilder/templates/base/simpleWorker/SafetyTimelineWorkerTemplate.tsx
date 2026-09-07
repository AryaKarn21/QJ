import React from 'react';
import type { Resume } from '../../../resumeApi';
import { formatDateRange, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

import { ResumeLink } from '../../shared/ResumeLink';
interface TemplateProps {
  resume: Resume;
}

const SAFETY_YELLOW = '#F2C230';
const SAFETY_DARK = '#1E1E1E';

/**
 * Simple Worker/Labor — Safety Timeline. No photo. High-contrast black and
 * safety-yellow color scheme (construction/warehouse/safety-vest colors,
 * always these two colors regardless of the selected theme), with a
 * left-rail timeline for work history — built for maximum print legibility.
 */
export const SafetyTimelineWorkerTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="inline-block px-2 py-0.5 text-[11.5px] font-black uppercase tracking-wide" style={{ backgroundColor: SAFETY_DARK, color: SAFETY_YELLOW }}>{children}</h2>
  );
  const Rail: React.FC<{ date: string; children: React.ReactNode }> = ({ date, children }) => (
    <div className="flex gap-3">
      <div className="w-[86px] shrink-0 pt-0.5 text-[10.5px] font-bold text-slate-500">{date}</div>
      <div className="flex-1 border-l-4 pl-3" style={{ borderColor: SAFETY_YELLOW }}>{children}</div>
    </div>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 pl-[98px] text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-4">
        <Heading>Summary</Heading>
        <p className="mt-1.5 pl-[98px] text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <Heading>Work History</Heading>
        <div className="mt-2 space-y-3">
          {resume.experience.map((exp, i) => (
            <Rail key={exp._id || i} date={formatDateRange(exp.startDate, exp.endDate, exp.current)}>
              <p className="text-[13px] font-bold">{exp.role || 'Role'}</p>
              <p className="text-[12px] font-semibold text-slate-500">{exp.company}{exp.location && `, ${exp.location}`}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px]">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            {exp.link && <ResumeLink href={exp.link} label="Company Link" color={theme.accent} className="mt-0.5 inline-block" />}
            </Rail>
          ))}
        </div>
      </section>
    ),
    certifications: () => (
      <section className="mt-4">
        <Heading>Safety Certifications</Heading>
        <div className="mt-1.5 flex flex-wrap gap-2 pl-[98px]">
          {resume.certifications.map((c, i) => (
            <span key={c._id || i} className="rounded border-2 px-2 py-0.5 text-[11.5px] font-bold" style={{ borderColor: SAFETY_DARK }}>{c.name}</span>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-4">
        <Heading>Skills</Heading>
        <p className="mt-1.5 pl-[98px] text-[12.5px]">{resume.skills.map((s) => s.name).join(', ')}</p>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-1 pl-[98px]">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12.5px]"><span className="font-bold">{edu.degree}</span>, {edu.institution}</p>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company} {it.link && <ResumeLink href={it.link} label="Company Link" color={theme.accent} />}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Work">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} {v.link && <ResumeLink href={v.link} label="Organization Link" color={theme.accent} />}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`} {a.link && <ResumeLink href={a.link} label="View Proof" color={theme.accent} />}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider} {t.link && <ResumeLink href={t.link} label="View Course" color={theme.accent} />}</p>)}
      </Extra>
    ),
    projects: () => (
      <Extra title="Projects">
        {resume.projects.map((p, i) => <p key={p._id || i}>{p.title}: {p.description} {p.link && <ResumeLink href={p.link} label="View Project" color={theme.accent} />}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization} {p.link && <ResumeLink href={p.link} label="Organization Link" color={theme.accent} />}</p>)}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution} {s.link && <ResumeLink href={s.link} label="View Award" color={theme.accent} />}</p>)}
      </Extra>
    ),
    publications: () => (
      <Extra title="Publications">
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher} {p.link && <ResumeLink href={p.link} label="View Publication" color={theme.accent} />}</p>)}
      </Extra>
    ),
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name} — {[r.email, r.phone].filter(Boolean).join(', ')} {r.link && <ResumeLink href={r.link} label="Profile" color={theme.accent} />}</p>)}
      </Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white text-slate-800" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="px-10 py-6" style={{ backgroundColor: SAFETY_DARK }}>
        <h1 className="text-[26px] font-black uppercase" style={{ color: SAFETY_YELLOW }}>{personalInfo.fullName || 'Your Name'}</h1>
        {resume.targetRole && <p className="mt-0.5 text-[13px] font-bold text-white">{resume.targetRole}</p>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/80">
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
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
                <p className="mt-1.5 pl-[98px] whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
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

export default SafetyTimelineWorkerTemplate;
