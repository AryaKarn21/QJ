import type { Resume } from '../../resumeApi';

/**
 * Section-wise layout system — single source of truth for section ids,
 * labels, "is this section empty" checks, and section ordering. Every
 * template and the editor's Sections panel import from here rather than
 * duplicating this logic, so there is exactly one place that decides what
 * counts as a manageable section and one place that decides the effective
 * order for a given resume.
 *
 * Personal Info is deliberately NOT in this list — it's rendered as a fixed
 * header by every template (name/contact are structurally different from a
 * body section in essentially every real resume layout, and "hide your own
 * name" isn't a sensible feature). Sections below are the full manageable
 * set: the 13 requested in the spec (summary → languages) plus the
 * pre-existing extras (trainings, scholarships, positionsOfResponsibility,
 * hobbies) that already had data on some resumes before this feature shipped.
 */
export interface SectionDefinition {
  id: string;
  label: string;
  isEmpty: (resume: Resume) => boolean;
}

const isListEmpty = (arr?: unknown[]) => !arr || arr.length === 0;

export const SECTION_DEFS: SectionDefinition[] = [
  { id: 'summary', label: 'Professional Summary', isEmpty: (r) => !r.summary?.trim() },
  { id: 'experience', label: 'Work Experience', isEmpty: (r) => isListEmpty(r.experience) },
  { id: 'internships', label: 'Internships', isEmpty: (r) => isListEmpty(r.internships) },
  { id: 'volunteering', label: 'Volunteer Experience', isEmpty: (r) => isListEmpty(r.volunteering) },
  { id: 'education', label: 'Education', isEmpty: (r) => isListEmpty(r.education) },
  { id: 'projects', label: 'Projects', isEmpty: (r) => isListEmpty(r.projects) },
  { id: 'skills', label: 'Skills', isEmpty: (r) => isListEmpty(r.skills) },
  { id: 'certifications', label: 'Certifications', isEmpty: (r) => isListEmpty(r.certifications) },
  { id: 'achievements', label: 'Achievements', isEmpty: (r) => isListEmpty(r.achievements) },
  { id: 'publications', label: 'Publications', isEmpty: (r) => isListEmpty(r.publications) },
  { id: 'trainings', label: 'Trainings', isEmpty: (r) => isListEmpty(r.trainings) },
  { id: 'scholarships', label: 'Scholarships', isEmpty: (r) => isListEmpty(r.scholarships) },
  {
    id: 'positionsOfResponsibility',
    label: 'Positions of Responsibility',
    isEmpty: (r) => isListEmpty(r.positionsOfResponsibility),
  },
  { id: 'hobbies', label: 'Hobbies', isEmpty: (r) => isListEmpty(r.hobbies) },
  { id: 'references', label: 'References', isEmpty: (r) => isListEmpty(r.references) },
  { id: 'languages', label: 'Languages', isEmpty: (r) => isListEmpty(r.languages) },
];

const SECTION_DEF_MAP = new Map(SECTION_DEFS.map((d) => [d.id, d]));
const KNOWN_SECTION_IDS = new Set(SECTION_DEFS.map((d) => d.id));

export const CUSTOM_SECTION_PREFIX = 'custom:';

export function isCustomSectionId(id: string): boolean {
  return id.startsWith(CUSTOM_SECTION_PREFIX);
}

export function customSectionKey(id: string): string {
  return id.slice(CUSTOM_SECTION_PREFIX.length);
}

export function customSectionId(key: string): string {
  return `${CUSTOM_SECTION_PREFIX}${key}`;
}

/**
 * Starts from resume.sectionOrder, appends any known built-in section
 * missing from it (backward compat — resumes saved before a section id
 * existed, e.g. "volunteering", or before this feature shipped at all and
 * have sectionOrder: [] — every template still renders every section in a
 * sensible default order), appends custom section ids from
 * resume.customSections, and drops stale/unknown ids (e.g. a custom
 * section that was since deleted). This is the ONE function every template
 * and the editor call — no duplicate ordering logic anywhere else.
 */
export function getEffectiveSectionOrder(resume: Resume): string[] {
  const saved = resume.sectionOrder || [];
  const customIds = (resume.customSections || []).map((c) => customSectionId(c._id || ''));
  const customIdSet = new Set(customIds);

  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const id of saved) {
    if (seen.has(id)) continue;
    if (KNOWN_SECTION_IDS.has(id) || customIdSet.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  for (const def of SECTION_DEFS) {
    if (!seen.has(def.id)) {
      ordered.push(def.id);
      seen.add(def.id);
    }
  }
  for (const id of customIds) {
    if (!seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  return ordered;
}

export interface CustomSectionContent {
  id: string;
  title: string;
  content: string;
}

export function getCustomSectionContent(resume: Resume, id: string): CustomSectionContent | null {
  if (!isCustomSectionId(id)) return null;
  const key = customSectionKey(id);
  const section = (resume.customSections || []).find((c) => c._id === key);
  if (!section) return null;
  return { id, title: section.title?.trim() || 'Custom Section', content: section.content || '' };
}

function isSectionEmpty(resume: Resume, id: string): boolean {
  if (isCustomSectionId(id)) {
    const content = getCustomSectionContent(resume, id);
    return !content || (!content.title.trim() && !content.content.trim());
  }
  return SECTION_DEF_MAP.get(id)?.isEmpty(resume) ?? true;
}

/**
 * The effective order filtered to sections that are (a) not in
 * hiddenSections and (b) not empty. This is what guarantees "empty
 * sections don't create blank areas" — every template's body loop should
 * render exactly this list, in this order, and nothing else.
 */
export function getVisibleOrderedSections(resume: Resume): string[] {
  const hidden = new Set(resume.hiddenSections || []);
  return getEffectiveSectionOrder(resume).filter((id) => !hidden.has(id) && !isSectionEmpty(resume, id));
}

export function sectionLabel(resume: Resume, id: string): string {
  if (isCustomSectionId(id)) {
    return getCustomSectionContent(resume, id)?.title || 'Custom Section';
  }
  return SECTION_DEF_MAP.get(id)?.label || id;
}
