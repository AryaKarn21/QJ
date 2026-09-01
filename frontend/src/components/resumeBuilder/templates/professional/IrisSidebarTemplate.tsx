import React from 'react';
import type { Resume } from '../../resumeApi';
import { getTheme } from '../../themePresets';
import { formatDateRange, getInitials, groupSkillsByCategory } from '../shared/templateUtils';
import { SKILL_LEVELS } from '../../resumeApi';
import { getVisibleOrderedSections, getCustomSectionContent } from '../shared/sections';

interface TemplateProps {
  resume: Resume;
}

// 4-segment proficiency bar — the one visual device this template is built
// around, standing in for the generic skill "chips" every other template
// uses. Beginner/Intermediate/Advanced/Expert map to 1–4 filled segments.
const SkillBar: React.FC<{ level: string; accent: string }> = ({ level, accent }) => {
  const filled = Math.max(1, SKILL_LEVELS.indexOf(level as any) + 1);
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-1.5 w-5 rounded-full"
          style={{ backgroundColor: i < filled ? accent : '#E2E8F0' }}
        />
      ))}
    </div>
  );
};

// Sidebar-locked section ids — render inside the left column. Everything
// else in the manageable-section list renders in the main column.
const SIDEBAR_IDS = ['skills', 'languages', 'certifications', 'hobbies'];

/**
 * Iris Sidebar — the "Novoresume-style" two-column layout: an off-white
 * (not solid-color-block) sidebar with a ring-bordered photo and 4-segment
 * skill/language proficiency bars, paired with a main column where every
 * section heading carries a small colored square marker and a half-width
 * accent underline. Two-column + photo means this one isn't ATS-safe —
 * same trade-off as Professional Sidebar and Bold Sidebar.
 */
export const IrisSidebarTemplate: React.FC<TemplateProps> = ({ resume }) => {
  const theme = getTheme(resume.theme, resume.fontFamily);
  const { personalInfo } = resume;
  const skillGroups = groupSkillsByCategory(resume.skills);
  const otherSkillGroups = skillGroups.filter((g) => g.category !== 'Languages');

  const SideLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-2.5 mt-6 text-[10px] font-bold uppercase tracking-[0.14em] first:mt-0" style={{ color: theme.accent }}>
      {children}
    </p>
  );

  const MainHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: theme.accent }} />
      <h2 className="text-[12px] font-bold uppercase tracking-wide text-slate-800">{children}</h2>
      <span className="h-px flex-1" style={{ backgroundColor: theme.accentSoft }} />
    </div>
  );

  const Extra: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mt-5">
      <MainHeading>{title}</MainHeading>
      <div className="mt-2 space-y-0.5 text-[12px] text-slate-700">{children}</div>
    </section>
  );

  // Section-wise layout system: one map covering every manageable section
  // used anywhere in this template. Sidebar entries render inside the left
  // column; everything else renders in the main column.
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    skills: () => (
      <>
        {otherSkillGroups.length > 0 && (
          <>
            <SideLabel>Skills</SideLabel>
            <div className="space-y-2.5">
              {otherSkillGroups.flatMap((g) => g.skills).map((s, i) => (
                <div key={s._id || i}>
                  <p className="text-[11px] font-medium text-slate-700">{s.name}</p>
                  <div className="mt-1">
                    <SkillBar level={s.level} accent={theme.accent} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    ),
    languages: () => (
      <>
        <SideLabel>Languages</SideLabel>
        <div className="space-y-2.5">
          {resume.languages.map((lang, i) => (
            <div key={lang._id || i}>
              <div className="flex items-baseline justify-between text-[11px]">
                <p className="font-medium text-slate-700">{lang.name}</p>
                <span className="text-[10px] text-slate-400">{lang.level}</span>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
    certifications: () => (
      <>
        <SideLabel>Certifications</SideLabel>
        <div className="space-y-1 text-[10.5px] text-slate-600">
          {resume.certifications.map((c, i) => (
            <p key={c._id || i}>{c.name}{c.year && ` · ${c.year}`}</p>
          ))}
        </div>
      </>
    ),
    hobbies: () => (
      <>
        <SideLabel>Hobbies</SideLabel>
        <p className="text-[11px] text-slate-600">{resume.hobbies.join(', ')}</p>
      </>
    ),
    summary: () => (
      <section>
        <MainHeading>Profile</MainHeading>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700">{resume.summary}</p>
      </section>
    ),
    experience: () => (
      <section className="mt-5">
        <MainHeading>Experience</MainHeading>
        <div className="mt-2.5 space-y-4">
          {resume.experience.map((exp, i) => (
            <div key={exp._id || i} className="relative border-l-2 pl-4" style={{ borderColor: theme.accentSoft }}>
              <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-semibold text-slate-900">{exp.role || 'Role'}</p>
                <p className="whitespace-nowrap text-[11px] text-slate-400">
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </p>
              </div>
              <p className="text-[11.5px] font-medium" style={{ color: theme.accent }}>
                {exp.company}{exp.location && ` · ${exp.location}`}
              </p>
              {exp.description && (
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-slate-700">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    ),
    education: () => (
      <section className="mt-5">
        <MainHeading>Education</MainHeading>
        <div className="mt-2.5 space-y-2">
          {resume.education.map((edu, i) => (
            <div key={edu._id || i} className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[12.5px] font-semibold text-slate-900">{edu.degree || 'Degree'}</p>
                <p className="text-[11.5px] text-slate-500">{edu.institution}</p>
              </div>
              <p className="whitespace-nowrap text-[11px] text-slate-400">{edu.startDate}–{edu.endDate}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: () => (
      <section className="mt-5">
        <MainHeading>Projects</MainHeading>
        <div className="mt-2.5 space-y-2">
          {resume.projects.map((p, i) => (
            <p key={p._id || i} className="text-[12px] leading-relaxed text-slate-700">
              <span className="font-semibold text-slate-900">{p.title}.</span> {p.description}
            </p>
          ))}
        </div>
      </section>
    ),
    internships: () => (
      <Extra title="Internships">
        {resume.internships.map((it, i) => (
          <p key={it._id || i}>{it.role}, {it.company} — {formatDateRange(it.startDate, it.endDate, it.current)}</p>
        ))}
      </Extra>
    ),
    volunteering: () => (
      <Extra title="Volunteer Experience">
        {resume.volunteering.map((v, i) => (
          <p key={v._id || i}>{v.role}, {v.organization} — {formatDateRange(v.startDate, v.endDate, v.current)}</p>
        ))}
      </Extra>
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
        {resume.publications.map((p, i) => <p key={p._id || i}>{p.title}, {p.publisher} {p.year && `(${p.year})`}</p>)}
      </Extra>
    ),
    trainings: () => (
      <Extra title="Trainings">
        {resume.trainings.map((t, i) => <p key={t._id || i}>{t.title}, {t.provider}</p>)}
      </Extra>
    ),
    scholarships: () => (
      <Extra title="Scholarships">
        {resume.scholarships.map((s, i) => <p key={s._id || i}>{s.title}, {s.institution} {s.year && `(${s.year})`}</p>)}
      </Extra>
    ),
    positionsOfResponsibility: () => (
      <Extra title="Positions of Responsibility">
        {resume.positionsOfResponsibility.map((p, i) => (
          <p key={p._id || i}>{p.title}, {p.organization} ({formatDateRange(p.startDate, p.endDate)})</p>
        ))}
      </Extra>
    ),
    references: () => (
      <Extra title="References">
        {resume.references.map((r, i) => (
          <p key={r._id || i}>
            {r.name}{r.relationship && `, ${r.relationship}`} — {[r.email, r.phone].filter(Boolean).join(', ')}
          </p>
        ))}
      </Extra>
    ),
  };

  const visible = getVisibleOrderedSections(resume);
  const sidebarSections = visible.filter((id) => SIDEBAR_IDS.includes(id));
  const mainSections = visible.filter((id) => !SIDEBAR_IDS.includes(id));

  return (
    <div
      className="mx-auto flex w-full max-w-[720px] bg-white text-slate-800"
      style={{ fontFamily: theme.fontBody, minHeight: '900px' }}
    >
      {/* Off-white sidebar — the thing that differentiates this from the
          two solid-color-block sidebars already in the gallery. */}
      <aside className="w-[230px] shrink-0 bg-slate-50 px-6 py-8">
        <div
          className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white text-xl font-bold"
          style={{ border: `3px solid ${theme.accent}`, color: theme.accent }}
        >
          {personalInfo.photo ? (
            <img src={personalInfo.photo} alt={personalInfo.fullName} className="h-full w-full object-cover" />
          ) : (
            getInitials(personalInfo.fullName || 'Your Name')
          )}
        </div>
        <h1 className="mt-4 text-center text-[17px] font-bold leading-tight text-slate-900">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        {resume.targetRole && (
          <p
            className="mx-auto mt-1.5 w-fit rounded-full px-2.5 py-0.5 text-center text-[10.5px] font-semibold"
            style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
          >
            {resume.targetRole}
          </p>
        )}

        <SideLabel>Contact</SideLabel>
        <div className="space-y-1.5 text-[11px] text-slate-600">
          {[personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin, personalInfo.website]
            .filter(Boolean)
            .map((v, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: theme.accent }} />
                <span className="break-all">{v}</span>
              </div>
            ))}
        </div>

        {sidebarSections.map((id) => (
          <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>
        ))}
      </aside>

      {/* Main column */}
      <div className="flex-1 px-7 py-8">
        {mainSections.map((id) => {
          if (id.startsWith('custom:')) {
            const custom = getCustomSectionContent(resume, id);
            if (!custom) return null;
            return (
              <section key={id} className="mt-5">
                <MainHeading>{custom.title}</MainHeading>
                <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">{custom.content}</p>
              </section>
            );
          }
          return <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default IrisSidebarTemplate;
