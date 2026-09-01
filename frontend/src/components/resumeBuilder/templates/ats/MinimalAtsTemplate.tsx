import React from 'react';
import type { Resume } from '../../resumeApi';
import { formatDateRange, skillsAsPlainText, toBulletLines } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';
import { ResumePhoto } from '../shared/ResumePhoto';

interface TemplateProps {
  resume: Resume;
}

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2.5">
    <h2 className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#1a1a1a]">
      {children}
    </h2>
    <span className="h-px flex-1 bg-[#1a1a1a]/25" />
  </div>
);

const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-5">
    <Heading>{title}</Heading>
    <div className="mt-2 space-y-1 text-[12.5px] leading-relaxed text-[#1a1a1a]">{children}</div>
  </section>
);

const SERIF = '"Cambria", Garamond, Georgia, "Times New Roman", serif';

export const MinimalAtsTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;
  const hasPhoto = !!personalInfo.photo;

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-5">
        <Heading>Summary</Heading>
        <p className="mt-2 text-[12.5px] leading-relaxed">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <Heading>Experience</Heading>
        <div className="mt-2.5 space-y-3.5">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between gap-4 text-[12.5px]">
                <p className="font-semibold">
                  {exp.role || 'Role'}
                  <span className="font-normal">, {exp.company || 'Company'}</span>
                </p>
                <p className="whitespace-nowrap text-[11px] italic text-[#1a1a1a]/65">
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </p>
              </div>
              {exp.description && (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed marker:text-[#1a1a1a]/50">
                  {toBulletLines(exp.description).map((line, li) => (
                    <li key={li}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <section className="mt-5">
        <Heading>Internships</Heading>
        <div className="mt-2.5 space-y-3.5">
          {resume.internships.map((it, i) => (
            <div key={it._id || i}>
              <div className="flex items-baseline justify-between gap-4 text-[12.5px]">
                <p className="font-semibold">
                  {it.role || 'Role'}
                  <span className="font-normal">, {it.company || 'Company'}</span>
                </p>
                <p className="whitespace-nowrap text-[11px] italic text-[#1a1a1a]/65">
                  {formatDateRange(it.startDate, it.endDate, it.current)}
                </p>
              </div>
              {it.description && <p className="mt-1 text-[12.5px] leading-relaxed">{it.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    volunteering: () => (
      <section className="mt-5">
        <Heading>Volunteer Experience</Heading>
        <div className="mt-2.5 space-y-3.5">
          {resume.volunteering.map((v, i) => (
            <div key={v._id || i}>
              <div className="flex items-baseline justify-between gap-4 text-[12.5px]">
                <p className="font-semibold">
                  {v.role || 'Role'}
                  <span className="font-normal">, {v.organization || 'Organization'}</span>
                </p>
                <p className="whitespace-nowrap text-[11px] italic text-[#1a1a1a]/65">
                  {formatDateRange(v.startDate, v.endDate, v.current)}
                </p>
              </div>
              {v.description && <p className="mt-1 text-[12.5px] leading-relaxed">{v.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <Heading>Education</Heading>
        <div className="mt-2.5 space-y-1.5">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-baseline justify-between gap-4 text-[12.5px]">
              <p>
                <span className="font-semibold">{edu.degree || 'Degree'}</span>
                {edu.institution && <span>, {edu.institution}</span>}
              </p>
              <p className="whitespace-nowrap text-[11px] italic text-[#1a1a1a]/65">
                {edu.startDate}–{edu.endDate}
              </p>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <Heading>Projects</Heading>
        <div className="mt-2.5 space-y-1.5">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-relaxed">
              <span className="font-semibold">{p.title}.</span> {p.description}
            </p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-5">
        <Heading>Skills</Heading>
        <p className="mt-2 text-[12.5px] leading-relaxed">{skillsAsPlainText(resume.skills)}</p>
      </section>
    ),
    certifications: () => (
      <section className="mt-5">
        <Heading>Certifications</Heading>
        <div className="mt-2 space-y-1">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i} className="text-[12.5px]">
              {c.name}, {c.issuer} {c.year && `(${c.year})`}
            </p>
          ))}
        </div>
      </section>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => (
          <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}{a.description && ` — ${a.description}`}</p>
        ))}
      </Extra>
    ),
    publications: () => (
      <Extra title="Publications">
        {resume.publications.map((p, i) => (
          <p key={p._id || i}>{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>
        ))}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => (
          <p key={t._id || i}>{t.title}, {t.provider} {t.startDate && `(${t.startDate}${t.endDate ? `–${t.endDate}` : ''})`}</p>
        ))}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => (
          <p key={s._id || i}>{s.title}, {s.institution} {s.year && `(${s.year})`}</p>
        ))}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => (
          <p key={p._id || i}>{p.title}, {p.organization} ({formatDateRange(p.startDate, p.endDate)})</p>
        ))}
      </Extra>
    ),
    hobbies: () => (
      <Extra title="Hobbies">
        <p>{resume.hobbies.join(', ')}</p>
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => (
          <p key={r._id || i}>
            {r.name}{r.relationship && `, ${r.relationship}`}{r.company && `, ${r.company}`}
            {(r.email || r.phone) && ` — ${[r.email, r.phone].filter(Boolean).join(', ')}`}
          </p>
        ))}
      </Extra>
    ),
    languages: () => (
      <section className="mt-5">
        <Heading>Languages</Heading>
        <p className="mt-2 text-[12.5px] leading-relaxed">
          {resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}
        </p>
      </section>
    ),
  };

  return (
    <div
      className="mx-auto w-full max-w-[720px] bg-white p-11 text-[#1a1a1a]"
      style={{ fontFamily: SERIF }}
    >
      {/* Letterhead block — photo on the LEFT, name/contact beside it. With
          no photo, ResumePhoto renders nothing and the block collapses back
          to the classic centered ATS letterhead, so there's no empty gap. */}
      <div className={`flex items-start gap-6 ${hasPhoto ? '' : 'justify-center'}`}>
        <ResumePhoto src={personalInfo.photo} shape="circle" size={80} className="border border-[#1a1a1a]/20" />
        <div className={`flex-1 ${hasPhoto ? 'text-left' : 'text-center'}`}>
          <h1 className="text-[26px] font-bold tracking-[0.01em]">
            {personalInfo.fullName || 'Your Name'}
          </h1>
          {resume.targetRole && (
            <p className="mt-1 text-[12.5px] italic tracking-[0.02em] text-[#1a1a1a]/80">
              {resume.targetRole}
            </p>
          )}
          <p className="mt-2 text-[11px] tracking-[0.02em] text-[#1a1a1a]/70">
            {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin, personalInfo.website]
              .filter(Boolean)
              .join('   ·   ')}
          </p>
        </div>
      </div>

      <div className="mt-4 h-px bg-[#1a1a1a]" />
      <div className="mt-[3px] h-px bg-[#1a1a1a]" />

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-5">
              <Heading>{custom.title}</Heading>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default MinimalAtsTemplate;
