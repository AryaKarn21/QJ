import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

/**
 * Minimalist Designer — ultra-clean whitespace, thin hairline rules, all-
 * lowercase section headings, generous margins. Less is more. For UX/UI
 * designers, typographers, and brand creatives who let the layout speak.
 */
export const MinimalistDesignerTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-4">
        <p className="shrink-0 text-[10px] tracking-[0.25em] text-slate-400">{title.toLowerCase()}</p>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      {children}
    </div>
  );

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <Section title="about">
        <p className="text-[13px] font-light leading-loose text-slate-600">{resume.summary}</p>
      </Section>
    ),
    experience: () => (
      <Section title="experience">
        <div className="space-y-5">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 pt-0.5 text-[10.5px] text-slate-300">
                {formatDateRange(exp.startDate, exp.endDate, exp.current)}
              </p>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-slate-900">{exp.role}</p>
                <p className="text-[12px] text-slate-400">{exp.company}</p>
                {exp.description && (
                  <ul className="mt-1.5 space-y-0.5 text-[12.5px] font-light leading-relaxed text-slate-600">
                    {toBulletLines(exp.description).map((line, li) => (
                      <li key={li} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    ),
    projects: () => (
      <Section title="work">
        <div className="space-y-4">
          {resume.projects.map((p, i) => (
            <div key={p._id || i} className="flex gap-6">
              <div className="w-20 shrink-0">
                {p.link && <p className="break-all font-mono text-[9.5px] text-slate-300">{p.link}</p>}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-slate-900">{p.title}</p>
                {p.technologies && <p className="text-[11px] tracking-wide" style={{ color: theme.accent }}>{p.technologies}</p>}
                {p.description && <p className="mt-0.5 text-[12.5px] font-light leading-relaxed text-slate-500">{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </Section>
    ),
    skills: () => (
      <Section title="skills">
        <p className="text-[12.5px] font-light leading-loose text-slate-600">
          {resume.skills.map((s) => s.name).join('   ·   ')}
        </p>
      </Section>
    ),
    education: () => (
      <Section title="education">
        <div className="space-y-3">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 pt-0.5 text-[10.5px] text-slate-300">{edu.endDate}</p>
              <div>
                <p className="text-[13px] font-medium text-slate-900">{edu.degree}</p>
                <p className="text-[12px] text-slate-400">{edu.institution}</p>
                {edu.description && <p className="text-[11.5px] font-light text-slate-400 italic">{edu.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </Section>
    ),
    internships: () => (
      <Section title="internships">
        <div className="space-y-3">
          {resume.internships.map((it, i) => (
            <div key={it._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 pt-0.5 text-[10.5px] text-slate-300">
                {formatDateRange(it.startDate, it.endDate, it.current)}
              </p>
              <div>
                <p className="text-[13px] font-medium">{it.role}</p>
                <p className="text-[12px] text-slate-400">{it.company}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    ),
    volunteering: () => (
      <Section title="volunteering">
        <div className="space-y-3">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 pt-0.5 text-[10.5px] text-slate-300">
                {formatDateRange(v.startDate, v.endDate, v.current)}
              </p>
              <div>
                <p className="text-[13px] font-medium">{v.role}</p>
                <p className="text-[12px] text-slate-400">{v.organization}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    ),
    achievements: () => (
      <Section title="recognition">
        <div className="space-y-1">
          {resume.achievements.map((a, i) => (
            <div key={a._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 text-[10.5px] text-slate-300">{a.year}</p>
              <p className="text-[12.5px] font-light text-slate-600">{a.title}</p>
            </div>
          ))}
        </div>
      </Section>
    ),
    certifications: () => (
      <Section title="credentials">
        <div className="space-y-1">
          {resume.certifications.map((c, i) => (
            <div key={c._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 text-[10.5px] text-slate-300">{c.year}</p>
              <p className="text-[12.5px] font-light text-slate-600">{c.name} — {c.issuer}</p>
            </div>
          ))}
        </div>
      </Section>
    ),
    publications: () => (
      <Section title="publications">
        <div className="space-y-1">
          {resume.publications.map((p, i) => (
            <div key={p._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 text-[10.5px] text-slate-300">{p.year}</p>
              <p className="text-[12.5px] font-light text-slate-600">{p.title} — {p.publisher}</p>
            </div>
          ))}
        </div>
      </Section>
    ),
    trainings: () => (
      <Section title="trainings">
        <div className="space-y-1">
          {resume.trainings.map((t, i) => (
            <p key={t._id || i} className="text-[12.5px] font-light text-slate-600">{t.title} — {t.provider}</p>
          ))}
        </div>
      </Section>
    ),
    scholarships: () => (
      <Section title="scholarships">
        <div className="space-y-1">
          {resume.scholarships.map((s, i) => (
            <div key={s._id || i} className="flex gap-6">
              <p className="w-20 shrink-0 text-[10.5px] text-slate-300">{s.year}</p>
              <p className="text-[12.5px] font-light text-slate-600">{s.title} — {s.institution}</p>
            </div>
          ))}
        </div>
      </Section>
    ),
    positionsOfResponsibility: () => (
      <Section title="positions of responsibility">
        <div className="space-y-1">
          {resume.positionsOfResponsibility.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] font-light text-slate-600">{p.title} — {p.organization}</p>
          ))}
        </div>
      </Section>
    ),
    languages: () => (
      <Section title="languages">
        <p className="text-[12.5px] font-light leading-loose text-slate-600">
          {resume.languages.map((l) => `${l.name} (${l.level})`).join('   ·   ')}
        </p>
      </Section>
    ),
    references: () => (
      <Section title="references">
        <div className="space-y-1">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12.5px] font-light text-slate-600">
              {r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}
            </p>
          ))}
        </div>
      </Section>
    ),
    hobbies: () => (
      <Section title="interests">
        <p className="text-[12.5px] font-light leading-loose text-slate-600">{resume.hobbies.join('   ·   ')}</p>
      </Section>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white px-14 py-12 text-slate-800"
      style={{ fontFamily: theme.fontBody }}
    >
      {/* Header — wide open, minimal */}
      <div className="mb-2 flex items-end justify-between">
        <h1
          className="text-[32px] font-light tracking-tight text-slate-900"
          style={{ fontFamily: theme.fontHeading }}
        >
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <div className="text-right text-[11px] text-slate-400 space-y-0.5 leading-relaxed">
          {personalInfo.email && <p>{personalInfo.email}</p>}
          {personalInfo.phone && <p>{personalInfo.phone}</p>}
          {personalInfo.website && <p>{personalInfo.website}</p>}
        </div>
      </div>

      {/* Role + location as a subtitle line */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <p className="text-[12px] tracking-wide text-slate-400">
          {resume.targetRole || 'Creative Professional'}
          {personalInfo.location && <span> · {personalInfo.location}</span>}
        </p>
        <p className="text-[11px] text-slate-400">
          {[personalInfo.linkedin, personalInfo.github].filter(Boolean).join(' · ')}
        </p>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <Section key={id} title={custom.title}>
              <p className="whitespace-pre-wrap text-[12.5px] font-light leading-loose text-slate-600">{custom.content}</p>
            </Section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default MinimalistDesignerTemplate;
