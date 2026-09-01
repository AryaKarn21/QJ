import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, skillsAsPlainText } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Software/Technology — Tech Leadership. No photo. For engineering
 * managers/tech leads: an impact-metrics strip pulled from Achievements
 * sits under the header, and Positions of Responsibility is relabeled
 * "Mentorship & Leadership" with its own emphasized treatment.
 */
export const TechLeadershipTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const visibleSections = getVisibleOrderedSections(resume);
  const achievementsVisible = visibleSections.includes('achievements');
  const highlights = achievementsVisible ? resume.achievements.slice(0, 3) : [];
  const remaining = achievementsVisible ? resume.achievements.slice(3) : [];

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
      <section className="mt-4">
        <Heading>Summary</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    positionsOfResponsibility: () => (
      <section className="mt-4">
        <Heading>Mentorship & Leadership</Heading>
        <div className="mt-1.5 space-y-2">
          {resume.positionsOfResponsibility.map((p, i) => (
            <div key={p._id || i} className="rounded-md p-2.5" style={{ backgroundColor: theme.accentSoft }}>
              <p className="text-[12.5px] font-semibold" style={{ color: theme.accent }}>{p.title}, {p.organization}</p>
              {p.description && <p className="mt-0.5 text-[12px] text-slate-600">{p.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mt-4">
        <Heading>Experience</Heading>
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
    skills: () => (
      <section className="mt-4">
        <Heading>Skills</Heading>
        <p className="mt-1.5 text-[12.5px]">{skillsAsPlainText(resume.skills)}</p>
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
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company} — {formatDateRange(it.startDate, it.endDate, it.current)}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
      </Extra>
    ),
    achievements: () =>
      remaining.length > 0 ? (
        <Extra title="More Achievements">
          {remaining.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}</p>)}
        </Extra>
      ) : null,
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
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (<Extra title="Languages"><p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p></Extra>),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
      <p className="mt-0.5 text-sm" style={{ color: theme.accent }}>{resume.targetRole || 'Target Role'}</p>
      <p className="mt-2 text-[11.5px] text-slate-500">
        {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin].filter(Boolean).join('   ·   ')}
      </p>

      {highlights.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {highlights.map((a, i) => (
            <div key={a._id || i} className="rounded-lg border p-2.5 text-center" style={{ borderColor: theme.accentSoft }}>
              <p className="text-[11.5px] font-semibold" style={{ color: theme.accent }}>{a.title}</p>
              {a.year && <p className="text-[10px] text-slate-400">{a.year}</p>}
            </div>
          ))}
        </div>
      )}

      {visibleSections.map((id) => {
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

export default TechLeadershipTemplate;
