import type { SkillEntry } from '../../resumeApi';

const CATEGORY_ORDER = [
  'Programming Languages',
  'Frameworks',
  'Databases',
  'Cloud',
  'DevOps',
  'AI/ML',
  'Soft Skills',
  'Languages',
  'Other',
];

export function formatDateRange(start?: string, end?: string, current?: boolean): string {
  const from = start || '';
  const to = current ? 'Present' : end || '';
  if (!from && !to) return '';
  if (from && !to) return from;
  if (!from && to) return to;
  return `${from} – ${to}`;
}

export interface SkillGroup {
  category: string;
  skills: SkillEntry[];
}

export function groupSkillsByCategory(skills: SkillEntry[]): SkillGroup[] {
  const groups = new Map<string, SkillEntry[]>();
  skills.forEach((s) => {
    const key = s.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  });
  return CATEGORY_ORDER.filter((c) => groups.has(c)).map((category) => ({
    category,
    skills: groups.get(category)!,
  }));
}

export function skillsAsPlainText(skills: SkillEntry[]): string {
  return skills.map((s) => (s.level ? `${s.name} (${s.level})` : s.name)).join(', ');
}

// Splits a free-text description into bullet lines. Users type one point
// per line in the editor; templates that render real <li> bullets use this.
export function toBulletLines(description?: string): string[] {
  if (!description) return [];
  return description
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}