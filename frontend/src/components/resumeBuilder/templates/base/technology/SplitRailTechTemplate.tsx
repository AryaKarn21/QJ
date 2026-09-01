import React from 'react';
import type { Resume } from '../../../resumeApi';
import { getTheme } from '../../../themePresets';
import { formatDateRange, groupSkillsByCategory } from '../../shared/templateUtils';
import { getVisibleOrderedSections, getCustomSectionContent } from '../../shared/sections';
import { ResumePhoto } from '../../shared/ResumePhoto';
import type { PhotoPosition } from '../../variantTypes';

interface TemplateProps {
  resume: Resume;
  photoPosition?: PhotoPosition;
}

// A true two-column PAGE split (not a colored sidebar) — a narrow right
// rail carries skills/certs while the main flow carries everything else.
const RAIL_IDS = ['skills', 'certifications', 'languages'];

/**
 * Software/Technology — Split Rail. Photo sits left in the header; body
 * splits into a wide main column and a narrow plain-white right rail for
 * "Key Skills"/certifications — distinct from Full Stack's in-section
 * two-column skills grid and from any colored-sidebar template.
 */
export const SplitRailTechTemplate: React.FC<TemplateProps> = ({ resume, photoPosition }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const hasPhoto = !!personalInfo.photo && !!photoPosition;
  const shape = photoPosition === 'left-square' ? 'square' : 'circle';
  const skillGroups = groupSkillsByCategory(resume.skills);

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: theme.accent }}>{children}</h2>
  );
  const RailLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400 first:mt-0">{children}</p>
  );
  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-4">
      <Heading>{title}</Heading>
      <div className="mt-1.5 space-y-0.5 text-[12.5px]">{children}</div>
    </section>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <div className="space-y-1.5">
        {skillGroups.map((g) => (
          <div key={g.category}>
            <p className="text-[10px] font-semibold text-slate-400">{g.category}</p>
            <p className="text-[11.5px] text-slate-700">{g.skills.map((s) => s.name).join(', ')}</p>
          </div>
        ))}
      </div>
    ),
    certifications: () => (
      <div className="space-y-1 text-[11px] text-slate-600">
        {resume.certifications.map((c, i) => <p key={c._id || i}>{c.name}{c.year && ` · ${c.year}`}</p>)}
      </div>
    ),
    languages: () => (
      <div className="space-y-1 text-[11px] text-slate-600">
        {resume.languages.map((l, i) => <p key={l._id || i}>{l.name} — {l.level}</p>)}
      </div>
    ),
    summary: () => (
      <section>
        <Heading>Summary</Heading>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">{resume.summary}</p>
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
    hobbies: () => (<Extra title="Hobbies"><p>{resume.hobbies.join(', ')}</p></Extra>),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => <p key={r._id || i}>{r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}</p>)}
      </Extra>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const railSections = visible.filter((id) => RAIL_IDS.includes(id));
  const mainSections = visible.filter((id) => !RAIL_IDS.includes(id));
  const railLabels: Record<string, string> = { skills: 'Skills', certifications: 'Certifications', languages: 'Languages' };

  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-10 text-slate-800" style={{ fontFamily: theme.fontBody }}>
      <div className={`flex items-center ${hasPhoto ? 'gap-4' : ''}`}>
        <ResumePhoto src={hasPhoto ? personalInfo.photo : undefined} shape={shape} size={70} className="border" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{personalInfo.fullName || 'Your Name'}</h1>
          <p className="mt-0.5 text-sm" style={{ color: theme.accent }}>{resume.targetRole || 'Target Role'}</p>
          <p className="mt-1.5 text-[11.5px] text-slate-500">
            {[personalInfo.email, personalInfo.phone, personalInfo.github, personalInfo.location].filter(Boolean).join('   ·   ')}
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-6">
        <div className="min-w-0 flex-1">
          {mainSections.map((id) => {
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
        {railSections.length > 0 && (
          <div className="w-[150px] shrink-0 border-l border-slate-100 pl-5">
            {railSections.map((id) => (
              <React.Fragment key={id}>
                <RailLabel>{railLabels[id]}</RailLabel>
                {sectionRenderers[id]?.()}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitRailTechTemplate;
