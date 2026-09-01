import React from 'react';
import type { Resume } from '../../resumeApi';
import { skillsAsPlainText } from '../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[11px] font-normal uppercase tracking-[0.25em] text-stone-500">{children}</h2>
);

const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-6">
    <Heading>{title}</Heading>
    <div className="mt-2 h-px w-full bg-stone-200" />
    <div className="mt-2 space-y-0.5 text-[12.5px] text-stone-700">{children}</div>
  </section>
);

/**
 * Elegant — light font weights, wide letter-spacing, thin hairline
 * dividers, generous whitespace. No bold headers, no color, nothing
 * competing with the content — reads like boutique-agency stationery.
 */
export const ElegantTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const { personalInfo } = resume;

  // Section-wise layout system: each entry renders one manageable section.
  // The body below loops getVisibleOrderedSections(resume) — which already
  // filters out hidden and empty sections — so order/visibility follow
  // exactly what the user configured in the editor's Sections panel.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    summary: () => (
      <section className="mt-8">
        <Heading>Profile</Heading>
        <div className="mt-2 h-px w-full bg-stone-200" />
        <p className="mt-2.5 text-center text-[12.5px] leading-loose text-stone-600">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-6">
        <Heading>Experience</Heading>
        <div className="mt-2 h-px w-full bg-stone-200" />
        <div className="mt-2.5 space-y-4">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i}>
              <div className="flex items-baseline justify-between">
                <p className="text-[13px]">{exp.role || 'Role'} <span className="text-stone-400">— {exp.company || 'Company'}</span></p>
                <p className="whitespace-nowrap text-[11px] text-stone-400">
                  {exp.current ? `${exp.startDate} – Present` : `${exp.startDate} – ${exp.endDate}`}
                </p>
              </div>
              {exp.description && <p className="mt-1 whitespace-pre-line text-[12.5px] leading-loose text-stone-600">{exp.description}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-6">
        <Heading>Education</Heading>
        <div className="mt-2 h-px w-full bg-stone-200" />
        <div className="mt-2.5 space-y-1.5">
          {resume.education.map((edu, i) => (
            <p key={edu._id || i} className="text-[12.5px] text-stone-600">
              {edu.degree}, {edu.institution} <span className="text-stone-400">({edu.startDate}–{edu.endDate})</span>
            </p>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-6">
        <Heading>Projects</Heading>
        <div className="mt-2 h-px w-full bg-stone-200" />
        <div className="mt-2.5 space-y-2">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12.5px] leading-loose text-stone-600">{p.title} — {p.description}</p>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mt-6">
        <Heading>Skills</Heading>
        <div className="mt-2 h-px w-full bg-stone-200" />
        <p className="mt-2.5 text-center text-[12.5px] text-stone-600">{skillsAsPlainText(resume.skills)}</p>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => <p key={it._id || i}>{it.role}, {it.company}</p>)}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => <p key={v._id || i}>{v.role}, {v.organization}</p>)}
      </Extra>
    ),
    certifications: () => (
      <Extra title="Certifications">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}, {c.issuer} {c.year && `(${c.year})`}</p>)}
      </Extra>
    ),
    achievements: () => (
      <Extra title="Achievements">
        {resume.achievements.map((a, i) => <p key={a._id || i}>{a.title} {a.year && `(${a.year})`}</p>)}
      </Extra>
    ),
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
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => <p key={p._id || i}>{p.title}, {p.organization}</p>)}
      </Extra>
    ),
    hobbies: () => (
      <Extra title="Hobbies">
        <p>{resume.hobbies.join(', ')}</p>
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
    languages: () => (
      <Extra title="Languages">
        <p>{resume.languages.map((l) => `${l.name} (${l.level})`).join(', ')}</p>
      </Extra>
    ),
  };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-12 text-stone-800" style={{ fontFamily: 'Georgia, serif', fontWeight: 300 }}>
      <div className="text-center">
        <h1 className="text-2xl font-normal uppercase tracking-[0.3em]">{personalInfo.fullName || 'Your Name'}</h1>
        <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-stone-400">{resume.targetRole || 'Target Role'}</p>
        <p className="mt-3 text-[11.5px] text-stone-500">
          {[personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).join('   |   ')}
        </p>
      </div>

      {getVisibleOrderedSections(resume).map((id) => {
        if (id.startsWith('custom:')) {
          const custom = getCustomSectionContent(resume, id);
          if (!custom) return null;
          return (
            <section key={id} className="mt-6">
              <Heading>{custom.title}</Heading>
              <div className="mt-2 h-px w-full bg-stone-200" />
              <p className="mt-2.5 whitespace-pre-wrap text-center text-[12.5px] leading-loose text-stone-600">{custom.content}</p>
            </section>
          );
        }
        return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
      })}
    </div>
  );
};

export default ElegantTemplate;
