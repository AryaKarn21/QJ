import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Academic Scholar — research publications, scholarships and academic
 * honours take the spotlight. Designed for graduate school applications,
 * fellowships, and research-track roles. Serif-driven, serious layout.
 */
export const AcademicScholarTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-6">
      <h2
        className="pb-1 text-[11.5px] font-bold uppercase tracking-widest"
        style={{ color: theme.accent, borderBottom: `1.5px solid ${theme.accent}` }}
      >
        {children}
      </h2>
    </div>
  );

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <>
        <SectionHeading>Research Statement</SectionHeading>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700 italic">{resume.summary}</p>
      </>
    ),
    education: () => (
      <>
        <SectionHeading>Education</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-900">{edu.degree}</p>
                <p className="text-[12px] text-slate-600">{edu.institution}</p>
                {edu.description && <p className="mt-0.5 text-[11.5px] italic text-slate-400">{edu.description}</p>}
              </div>
              <p className="shrink-0 text-[11.5px] text-slate-400">{edu.startDate} – {edu.endDate}</p>
            </div>
          ))}
        </div>
      </>
    ),
    publications: () => (
      <>
        <SectionHeading>Publications</SectionHeading>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          {resume.publications.map((p, i) => (
            <li key={p._id || i} className="text-[12.5px] leading-relaxed">
              <span className="font-semibold">{p.title}</span>
              {p.publisher && <span className="italic text-slate-500"> — {p.publisher}</span>}
              {p.year && <span className="text-slate-400"> ({p.year})</span>}
              {p.link && <span className="block font-mono text-[11px] text-slate-400">{p.link}</span>}
            </li>
          ))}
        </ol>
      </>
    ),
    scholarships: () => (
      <>
        <SectionHeading>Scholarships & Fellowships</SectionHeading>
        <div className="mt-2 space-y-1.5">
          {resume.scholarships.map((s, i) => (
            <div key={s._id || i} className="flex items-baseline justify-between">
              <div>
                <p className="text-[12.5px] font-semibold">{s.title}</p>
                <p className="text-[12px] text-slate-500 italic">{s.institution}</p>
              </div>
              {s.year && <p className="shrink-0 text-[11px] text-slate-400">{s.year}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    achievements: () => (
      <>
        <SectionHeading>Honours & Awards</SectionHeading>
        <div className="mt-2 space-y-1">
          {resume.achievements.map((a, i) => (
            <div key={a._id || i} className="flex items-baseline justify-between">
              <p className="text-[12.5px]">{a.title}</p>
              {a.year && <p className="shrink-0 text-[11px] text-slate-400">{a.year}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    projects: () => (
      <>
        <SectionHeading>Research Projects</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.projects.map((p, i) => (
            <div key={p._id || i}>
              <p className="text-[13px] font-bold">{p.title}</p>
              {p.technologies && <p className="text-[11.5px] italic text-slate-500">{p.technologies}</p>}
              {p.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{p.description}</p>}
              {p.link && <p className="font-mono text-[11px] text-slate-400">{p.link}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    experience: () => (
      <>
        <SectionHeading>Academic & Professional Experience</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold">{exp.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px] italic text-slate-500">{exp.company}{exp.location && `, ${exp.location}`}</p>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed">
                  {toBulletLines(exp.description).map((line, li) => <li key={li}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </>
    ),
    internships: () => (
      <>
        <SectionHeading>Internships</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold">{it.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(it.startDate, it.endDate, it.current)}</p>
              </div>
              <p className="text-[12px] italic text-slate-500">{it.company}</p>
              {it.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{it.description}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    volunteering: () => (
      <>
        <SectionHeading>Volunteer Experience</SectionHeading>
        <div className="mt-2 space-y-3">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold">{v.role}</p>
                <p className="text-[11px] text-slate-400">{formatDateRange(v.startDate, v.endDate, v.current)}</p>
              </div>
              <p className="text-[12px] italic text-slate-500">{v.organization}</p>
              {v.description && <p className="mt-0.5 text-[12.5px] leading-relaxed">{v.description}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    positionsOfResponsibility: () => (
      <>
        <SectionHeading>Positions of Responsibility</SectionHeading>
        <div className="mt-2 space-y-1">
          {resume.positionsOfResponsibility.map((p, i) => (
            <div key={p._id || i} className="flex items-baseline justify-between">
              <p className="text-[12.5px]"><span className="font-semibold">{p.title}</span>, {p.organization}</p>
              {p.startDate && <p className="shrink-0 text-[11px] text-slate-400">{formatDateRange(p.startDate, p.endDate, p.current)}</p>}
            </div>
          ))}
        </div>
      </>
    ),
    trainings: () => (
      <>
        <SectionHeading>Courses & Trainings</SectionHeading>
        <div className="mt-2 space-y-0.5">
          {resume.trainings.map((t, i) => (
            <p key={t._id || i} className="text-[12.5px]">{t.title} — <span className="italic text-slate-500">{t.provider}</span></p>
          ))}
        </div>
      </>
    ),
    certifications: () => (
      <>
        <SectionHeading>Certifications</SectionHeading>
        <div className="mt-2 space-y-0.5">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i} className="text-[12.5px]">{c.name} — <span className="italic text-slate-500">{c.issuer}{c.year && `, ${c.year}`}</span></p>
          ))}
        </div>
      </>
    ),
    skills: () => (
      <>
        <SectionHeading>Technical Skills</SectionHeading>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700">{resume.skills.map((s) => s.name).join(' · ')}</p>
      </>
    ),
    languages: () => (
      <>
        <SectionHeading>Languages</SectionHeading>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700">{resume.languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</p>
      </>
    ),
    hobbies: () => (
      <>
        <SectionHeading>Interests</SectionHeading>
        <p className="mt-2 text-[12.5px] text-slate-600">{resume.hobbies.join(', ')}</p>
      </>
    ),
    references: () => (
      <>
        <SectionHeading>References</SectionHeading>
        <div className="mt-2 space-y-1">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12.5px]">
              <span className="font-semibold">{r.name}</span>
              {r.relationship && <span className="italic text-slate-500">, {r.relationship}</span>}
              {(r.email || r.phone) && <span className="text-slate-400"> — {[r.email, r.phone].filter(Boolean).join(', ')}</span>}
            </p>
          ))}
        </div>
      </>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white px-10 py-10 text-slate-800"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {resume.targetRole && (
          <p className="mt-1 text-sm italic text-slate-500">{resume.targetRole}</p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11.5px] text-slate-500">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.website && <span>{personalInfo.website}</span>}
          {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
        </div>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <React.Fragment key={id}>
              <SectionHeading>{custom.title}</SectionHeading>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">{custom.content}</p>
            </React.Fragment>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default AcademicScholarTemplate;
