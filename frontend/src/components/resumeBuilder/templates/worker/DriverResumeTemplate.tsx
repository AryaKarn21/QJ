import React from 'react';
import type { Resume } from '../../resumeApi';
import { formatDateRange, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 mb-2.5">
    <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1a5276] whitespace-nowrap">
      {children}
    </h2>
    <div className="flex-1 h-[1.5px] bg-[#1a5276]" />
  </div>
);

const InfoChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[#eaf4fb] border border-[#aed6f1] rounded px-3 py-2">
    <p className="text-[10px] font-bold uppercase text-[#1a5276] tracking-wide">{label}</p>
    <p className="text-[12.5px] font-semibold text-[#1e1e1e] mt-0.5">{value}</p>
  </div>
);

/**
 * Driver Resume — dark blue, emphasises licence type, vehicle categories,
 * years of experience, and safety record via info chips at the top.
 */
export const DriverResumeTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;
  const visibleSections = getVisibleOrderedSections(resume);
  const certificationsVisible = visibleSections.includes('certifications');

  // Pull licence-related certs out for the info strip — only shown when the
  // Certifications section itself is visible (they're a subset of that data).
  const licenceCerts = certificationsVisible
    ? resume.certifications.filter((c) => /licen[cs]e|licence|permit|endorsement/i.test(c.name))
    : [];
  const otherCerts = certificationsVisible
    ? resume.certifications.filter((c) => !licenceCerts.includes(c))
    : [];

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  // `certifications` only renders the non-licence certs here, since licence
  // certs are pulled into the info strip above the loop.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mb-5">
        <SectionHeading>Driver Profile</SectionHeading>
        <p className="text-[12.5px] leading-relaxed text-[#333]">{resume.summary}</p>
      </section>
    ),
    skills: () => (
      <section className="mb-5">
        <SectionHeading>Driving Skills &amp; Expertise</SectionHeading>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {resume.skills.map((s, i) => (
            <div key={s._id || i} className="flex items-center gap-2 text-[12px]">
              <span className="text-[#1a5276]">▸</span>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mb-5">
        <SectionHeading>Driving Experience</SectionHeading>
        <div className="space-y-4">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-bold text-[#1a5276]">{exp.role || 'Role'}</p>
                <p className="text-[11px] text-[#777] italic">{formatDateRange(exp.startDate, exp.endDate, exp.current)}</p>
              </div>
              <p className="text-[12px] font-semibold text-[#444]">{exp.company}{exp.location ? ` — ${exp.location}` : ''}</p>
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
    certifications: () =>
      otherCerts.length > 0 ? (
        <section className="mb-5">
          <SectionHeading>Certifications &amp; Training</SectionHeading>
          <div className="space-y-1">
            {otherCerts.map((c, i) => (
              <p key={c._id || i} className="text-[12.5px]">
                <span className="font-semibold">{c.name}</span>
                {c.issuer && <span className="text-[#555]"> — {c.issuer}</span>}
                {c.year && <span className="text-[#777]"> ({c.year})</span>}
              </p>
            ))}
          </div>
        </section>
      ) : null,
    education: () => (
      <section className="mb-5">
        <SectionHeading>Education</SectionHeading>
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
      className="mx-auto w-full max-w-[720px] bg-white text-[#1e1e1e]"
      style={{ fontFamily: 'Trebuchet MS, Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="bg-[#1a5276] text-white px-10 py-7">
        <h1 className="text-[28px] font-bold">{personalInfo.fullName || 'Your Name'}</h1>
        {resume.targetRole && (
          <p className="text-[13.5px] mt-0.5 text-[#aed6f1] font-semibold">{resume.targetRole}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#d6eaf8]">
          {personalInfo.phone && <span>📞 {personalInfo.phone}</span>}
          {personalInfo.email && <span>✉ {personalInfo.email}</span>}
          {personalInfo.location && <span>📍 {personalInfo.location}</span>}
        </div>
      </div>

      {/* Licence Info Strip */}
      {licenceCerts.length > 0 && (
        <div className="bg-[#f0f8ff] border-b border-[#aed6f1] px-10 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {licenceCerts.map((c, i) => (
              <InfoChip key={i} label={c.issuer || 'Licence'} value={c.name} />
            ))}
          </div>
        </div>
      )}

      <div className="px-10 py-7">
        {visibleSections.map((id) => {
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

export default DriverResumeTemplate;
