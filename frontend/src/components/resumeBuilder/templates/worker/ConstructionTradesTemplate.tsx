import React from 'react';
import type { Resume } from '../../resumeApi';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-3 h-3 border-2 border-[#e67e22] rotate-45 flex-shrink-0" />
    <h2 className="text-[11.5px] font-extrabold uppercase tracking-[0.15em] text-[#2c3e50]">
      {children}
    </h2>
    <div className="flex-1 h-px bg-[#e67e22]/40" />
  </div>
);

/**
 * Construction & Skilled Trades — earthy orange and dark slate, highlights
 * trade skills, tools/equipment, site projects, and safety certifications.
 */
export const ConstructionTradesTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mb-5">
        <SectionHeading>Trade Summary</SectionHeading>
        <p className="text-[12.5px] leading-relaxed text-[#333]">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mb-5">
        <SectionHeading>Trade Skills &amp; Tools</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((s, i) => (
            <span key={s._id || i} className="rounded-sm border-l-2 border-[#e67e22] bg-[#fef9f5] px-2.5 py-1 text-[12px] font-medium">
              {s.name}
            </span>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mb-5">
        <SectionHeading>Work History</SectionHeading>
        <div className="space-y-4">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i} className="border-l-2 border-[#e67e22]/30 pl-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold text-[#2c3e50]">{exp.role || 'Role'}</p>
                <p className="text-[11px] text-[#888] italic">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px] font-semibold text-[#e67e22]">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
              {exp.description && (
                <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
                  {toBulletLines(exp.description).map((line, li) => (
                    <li key={li} className="text-[12px] leading-relaxed">{line}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <section className="mb-5">
        <SectionHeading>Internships</SectionHeading>
        <div className="space-y-1">
          {resume.internships.map((it, i) => (
            <p key={it._id || i} className="text-[12.5px]">
              <span className="font-semibold">{it.role}</span>, {it.company}
              <span className="text-[#888]"> — {formatDateRange(it.startDate, it.endDate, it.current)}</span>
            </p>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <section className="mb-5">
        <SectionHeading>Volunteer Experience</SectionHeading>
        <div className="space-y-1">
          {resume.volunteering.map((v, i) => (
            <p key={v._id || i} className="text-[12.5px]">
              <span className="font-semibold">{v.role}</span>, {v.organization}
              <span className="text-[#888]"> — {formatDateRange(v.startDate, v.endDate, v.current)}</span>
            </p>
          ))}
        </div>
      </section>
    ),
    certifications: () => (
      <section className="mb-5">
        <SectionHeading>Certifications &amp; Licences</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          {resume.certifications.map((c, i) => (
            <div key={c._id || i} className="flex items-start gap-2 rounded bg-[#f0f0f0] px-3 py-2">
              <span className="text-[#e67e22] font-bold mt-0.5">✓</span>
              <div>
                <p className="text-[12px] font-semibold">{c.name}</p>
                {c.issuer && <p className="text-[11px] text-[#666]">{c.issuer}</p>}
                {c.year && <p className="text-[10.5px] text-[#888]">{c.year}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mb-5">
        <SectionHeading>Education &amp; Apprenticeship</SectionHeading>
        {resume.education.map((edu, i) => (
          <div key={edu._id || i} className="flex items-baseline justify-between text-[12.5px] mb-1">
            <p>
              <span className="font-semibold">{edu.degree}</span>
              {edu.institution && <span className="text-[#555]">, {edu.institution}</span>}
            </p>
            <p className="text-[11px] text-[#777]">{edu.startDate}–{edu.endDate}</p>
          </div>
        ))}
      </section>
    ),
    achievements: () => (
      <section className="mb-5">
        <SectionHeading>Achievements</SectionHeading>
        <div className="space-y-1">
          {resume.achievements.map((a, i) => (
            <p key={a._id || i} className="text-[12.5px]">{a.title} {a.year && <span className="text-[#888]">({a.year})</span>}</p>
          ))}
        </div>
      </section>
    ),
    publications: () => (
      <section className="mb-5">
        <SectionHeading>Publications</SectionHeading>
        <div className="space-y-1">
          {resume.publications.map((p, i) => <p key={p._id || i} className="text-[12.5px]">{p.title}, {p.publisher}</p>)}
        </div>
      </section>
    ),
    trainings: () => (
      <section className="mb-5">
        <SectionHeading>Trainings</SectionHeading>
        <div className="space-y-1">
          {resume.trainings.map((t, i) => <p key={t._id || i} className="text-[12.5px]">{t.title}, {t.provider}</p>)}
        </div>
      </section>
    ),
    scholarships: () => (
      <section className="mb-5">
        <SectionHeading>Scholarships</SectionHeading>
        <div className="space-y-1">
          {resume.scholarships.map((s, i) => <p key={s._id || i} className="text-[12.5px]">{s.title}, {s.institution}</p>)}
        </div>
      </section>
    ),
    positionsOfResponsibility: () => (
      <section className="mb-5">
        <SectionHeading>Positions of Responsibility</SectionHeading>
        <div className="space-y-1">
          {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i} className="text-[12.5px]">{p.title}, {p.organization}</p>)}
        </div>
      </section>
    ),
    languages: () => (
      <section className="mb-5">
        <SectionHeading>Languages</SectionHeading>
        <p className="text-[12.5px] text-[#333]">{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
      </section>
    ),
    hobbies: () => (
      <section className="mb-5">
        <SectionHeading>Hobbies</SectionHeading>
        <p className="text-[12.5px] text-[#333]">{resume.hobbies.join(', ')}</p>
      </section>
    ),
    references: () => (
      <section>
        <SectionHeading>References</SectionHeading>
        {resume.references.map((r, i) => (
          <p key={r._id || i} className="text-[12px] mb-1">
            <span className="font-semibold">{r.name}</span>
            {r.company && <span className="text-[#555]">, {r.company}</span>}
            {(r.email || r.phone) && <span className="text-[#777]"> — {[r.email, r.phone].filter(Boolean).join(' | ')}</span>}
          </p>
        ))}
      </section>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white text-[#2c2c2c]"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Header */}
      <div
        className="px-10 py-7"
        style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #3d5a73 100%)' }}
      >
        <h1 className="text-[27px] font-extrabold text-white uppercase tracking-wide">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {resume.targetRole && (
          <p className="text-[14px] mt-1 font-bold text-[#e67e22]">{resume.targetRole}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-300">
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
        </div>
      </div>

      {/* Orange rule */}
      <div className="h-1.5 bg-[#e67e22]" />

      <div className="px-10 py-7">
        {getVisibleOrderedSections(resume).map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="mb-5">
                <SectionHeading>{custom.title}</SectionHeading>
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#333]">{custom.content}</p>
              </section>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default ConstructionTradesTemplate;
