import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, toBulletLines } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';
import { ResumePhoto } from '../../shared/ResumePhoto';
import type { PhotoPosition } from '../../variantTypes';

interface TemplateProps {
  resume: Resume;
  photoPosition?: PhotoPosition;
}

/**
 * Simple Worker/Labor — ID Badge. Photo renders inside a bordered "ID
 * badge" box beside the name — appropriate for roles where a photo is
 * expected (security guard, caregiver, driver, hospitality staff) rather
 * than a casual portrait placement.
 */
export const IdBadgeWorkerTemplate: React.FC<TemplateProps> = ({ resume, photoPosition }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const hasPhoto = !!personalInfo.photo && !!photoPosition;
  const shape = photoPosition === 'left-square' ? 'square' : 'circle';

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: theme.accent }}>{children}</h2>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Summary</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mt-4">
        <Heading>Skills</Heading>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {resume.skills.map((s, i) => (
            <span key={s._id || i} className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ backgroundColor: theme.accentSoft, color: theme.accent }}>{s.name}</span>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <Heading>Work Experience</Heading>
        <div className="mt-1.5 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold">{exp.role || 'Role'}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px] font-semibold text-slate-500">{exp.company}{exp.location && `, ${exp.location}`}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px]">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    certifications: () => (
      <section className="mt-4">
        <Heading>Certifications & Licences</Heading>
        <div className="mt-1.5 space-y-1">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i} className="text-[12.5px]"><span className="font-semibold">{c.name}</span>{c.issuer && <span className="text-slate-500"> — {c.issuer}</span>}{c.year && <span className="text-slate-400"> ({c.year})</span>}</p>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-4">
        <Heading>Education</Heading>
        <div className="mt-1.5 space-y-1">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12.5px]"><span className="font-semibold">{edu.degree}</span>, {edu.institution}</p>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Work">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </Extra>
    ),
    projects: () => (
      <Extra title="Projects">
        {resume.projects.map((p, i) => <p key={p._id || i}>{p.title}: {p.description}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution}</p>)}
      </Extra>
    ),
    publications: () => (
      <Extra title="Publications">
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher}</p>)}
      </Extra>
    ),
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
      <div className={`flex items-center rounded-lg border-2 p-3 ${hasPhoto ? 'gap-4' : ''}`} style={{ borderColor: theme.accent }}>
        <ResumePhoto src={hasPhoto ? personalInfo.photo : undefined} shape={shape} size={68} className="border" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
          <p className="text-[12px] font-semibold" style={{ color: theme.accent }}>{resume.targetRole || 'Target Role'}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {[personalInfo.phone, personalInfo.email, personalInfo.location].filter(Boolean).join('   ·   ')}
          </p>
        </div>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-4">
              <Heading>{custom.title}</Heading>
              <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default IdBadgeWorkerTemplate;
