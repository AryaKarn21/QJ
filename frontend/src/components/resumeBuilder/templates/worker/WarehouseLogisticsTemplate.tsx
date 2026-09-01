import React from 'react';
import type { Resume } from '../../resumeApi';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-2.5">
    <div className="w-1 h-4 bg-[#0057a8] rounded-sm flex-shrink-0" />
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0057a8]">{children}</h2>
    <div className="flex-1 h-px bg-[#d0e4f7]" />
  </div>
);

/**
 * Warehouse & Logistics — navy blue scheme, highlights equipment certs,
 * inventory systems, and safety training prominently. ATS-safe single column.
 */
export const WarehouseLogisticsTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mb-5">
        <SectionHeading>Professional Summary</SectionHeading>
        <p className="text-[12.5px] leading-relaxed text-[#333]">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mb-5">
        <SectionHeading>Warehouse Skills &amp; Equipment</SectionHeading>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {resume.skills.map((s, i) => (
            <div key={s._id || i} className="flex items-center gap-1.5 text-[12px]">
              <span className="text-[#0057a8] font-bold">✓</span>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mb-5">
        <SectionHeading>Work Experience</SectionHeading>
        <div className="space-y-4">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold text-[#0057a8]">{exp.role || 'Role'}</p>
                <p className="text-[11px] text-[#666] italic">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px] font-semibold text-[#444]">{exp.company}{exp.location ? ` | ${exp.location}` : ''}</p>
              {exp.description && (
                <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
                  {toBulletLines(exp.description).map((line, li) => (
                    <li key={li} className="text-[12px] leading-relaxed text-[#333]">{line}</li>
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
              <span className="text-[#777]"> — {formatDateRange(it.startDate, it.endDate, it.current)}</span>
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
              <span className="text-[#777]"> — {formatDateRange(v.startDate, v.endDate, v.current)}</span>
            </p>
          ))}
        </div>
      </section>
    ),
    certifications: () => (
      <section className="mb-5">
        <SectionHeading>Licences &amp; Certifications</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          {resume.certifications.map((c, i) => (
            <div key={c._id || i} className="rounded bg-[#e8f2fc] px-3 py-2">
              <p className="text-[12px] font-semibold text-[#0057a8]">{c.name}</p>
              {c.issuer && <p className="text-[11px] text-[#555]">{c.issuer}</p>}
              {c.year && <p className="text-[10.5px] text-[#777]">{c.year}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mb-5">
        <SectionHeading>Education &amp; Training</SectionHeading>
        <div className="space-y-1.5">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-baseline justify-between text-[12.5px]">
              <p>
                <span className="font-semibold">{edu.degree}</span>
                {edu.institution && <span className="text-[#555]">, {edu.institution}</span>}
              </p>
              <p className="text-[11px] text-[#777]">{edu.startDate}–{edu.endDate}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    achievements: () => (
      <section className="mb-5">
        <SectionHeading>Achievements</SectionHeading>
        <div className="space-y-1">
          {resume.achievements.map((a, i) => (
            <p key={a._id || i} className="text-[12.5px]">{a.title} {a.year && <span className="text-[#777]">({a.year})</span>}</p>
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
        <SectionHeading>Additional Trainings</SectionHeading>
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
        <div className="space-y-1">
          {resume.references.map((r, i) => (
            <p key={r._id || i} className="text-[12px]">
              <span className="font-semibold">{r.name}</span>
              {r.company && <span className="text-[#555]">, {r.company}</span>}
              {(r.email || r.phone) && <span className="text-[#777]"> — {[r.email, r.phone].filter(Boolean).join(' | ')}</span>}
            </p>
          ))}
        </div>
      </section>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white text-[#1e1e1e]"
      style={{ fontFamily: 'Calibri, Arial, sans-serif' }}
    >
      {/* Navy Header */}
      <div className="bg-[#0057a8] px-10 py-7 text-white">
        <h1 className="text-[26px] font-bold tracking-wide">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {resume.targetRole && (
          <p className="text-[13px] mt-0.5 text-blue-100 font-medium">{resume.targetRole}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-100">
          {personalInfo.phone && <span>📞 {personalInfo.phone}</span>}
          {personalInfo.email && <span>✉ {personalInfo.email}</span>}
          {personalInfo.location && <span>📍 {personalInfo.location}</span>}
        </div>
      </div>

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

export default WarehouseLogisticsTemplate;
