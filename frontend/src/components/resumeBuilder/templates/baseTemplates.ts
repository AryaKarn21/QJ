import type { Resume } from '../resumeApi';
import type { PhotoPosition, TemplateCategory } from './variantTypes';

// Modern Professional
import { HeaderBandTemplate } from './base/modernProfessional/HeaderBandTemplate';
import { SplitHeaderTemplate } from './base/modernProfessional/SplitHeaderTemplate';
import { TimelineRailTemplate } from './base/modernProfessional/TimelineRailTemplate';
// Minimal Executive
import { WhitespaceExecutiveTemplate } from './base/minimalExecutive/WhitespaceExecutiveTemplate';
import { FramedExecutiveTemplate } from './base/minimalExecutive/FramedExecutiveTemplate';
// Clean Corporate
import { CorporateMemoTemplate } from './base/cleanCorporate/CorporateMemoTemplate';
import { CorporatePhotoCardTemplate } from './base/cleanCorporate/CorporatePhotoCardTemplate';
// Creative Portfolio
import { BoldHeroPortfolioTemplate } from './base/creativePortfolio/BoldHeroPortfolioTemplate';
import { PastelSidebarPortfolioTemplate } from './base/creativePortfolio/PastelSidebarPortfolioTemplate';
import { AsymmetricPortfolioTemplate } from './base/creativePortfolio/AsymmetricPortfolioTemplate';
// Software/Technology
import { ChangelogTechTemplate } from './base/technology/ChangelogTechTemplate';
import { SplitRailTechTemplate } from './base/technology/SplitRailTechTemplate';
import { TechLeadershipTemplate } from './base/technology/TechLeadershipTemplate';
// Student/Fresher
import { ColorTabStudentTemplate } from './base/studentFresher/ColorTabStudentTemplate';
import { CampusCardStudentTemplate } from './base/studentFresher/CampusCardStudentTemplate';
import { TwoColumnStudentTemplate } from './base/studentFresher/TwoColumnStudentTemplate';
// Academic
import { MarginNotesAcademicTemplate } from './base/academic/MarginNotesAcademicTemplate';
import { NumberedAcademicTemplate } from './base/academic/NumberedAcademicTemplate';
// Designer/Creative
import { SoftSidebarDesignerTemplate } from './base/designer/SoftSidebarDesignerTemplate';
import { MoodboardDesignerTemplate } from './base/designer/MoodboardDesignerTemplate';
import { TypographicDesignerTemplate } from './base/designer/TypographicDesignerTemplate';
// Sales/Marketing
import { QuotaMetricsSalesTemplate } from './base/salesMarketing/QuotaMetricsSalesTemplate';
import { TestimonialSalesTemplate } from './base/salesMarketing/TestimonialSalesTemplate';
// Manager/Leadership
import { OrgStatsManagerTemplate } from './base/managerLeadership/OrgStatsManagerTemplate';
import { PhilosophyManagerTemplate } from './base/managerLeadership/PhilosophyManagerTemplate';
// Simple Worker/Labor
import { FriendlyWorkerTemplate } from './base/simpleWorker/FriendlyWorkerTemplate';
import { SafetyTimelineWorkerTemplate } from './base/simpleWorker/SafetyTimelineWorkerTemplate';
import { IdBadgeWorkerTemplate } from './base/simpleWorker/IdBadgeWorkerTemplate';
// International/CV style
import { EuroSidebarCvTemplate } from './base/international/EuroSidebarCvTemplate';
import { FormalGlobalCvTemplate } from './base/international/FormalGlobalCvTemplate';
import { NumberedGlobalCvTemplate } from './base/international/NumberedGlobalCvTemplate';
import { CompactGlobalCvTemplate } from './base/international/CompactGlobalCvTemplate';

export interface BaseTemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  atsFriendly: boolean;
  description: string;
  bestFor: string[];
  supportsPhoto: boolean;
  /** Empty when supportsPhoto is false. */
  photoPositions: PhotoPosition[];
  component: React.FC<{ resume: Resume; photoPosition?: PhotoPosition }>;
}

/**
 * 32 hand-built base structures — each one a genuinely different layout,
 * not a palette clone (see the individual component files' doc comments
 * for what makes each one structurally distinct). registry.ts's
 * generateTemplateVariants() crosses every entry here with every theme
 * preset (and, for photo-capable bases, every applicable photo position)
 * to produce the full selectable template registry. Add a new base
 * structure here — nowhere else — to add ~30-35 more selectable templates
 * to the gallery for free.
 */
export const BASE_TEMPLATES: BaseTemplateDefinition[] = [
  // ── Modern Professional ──────────────────────────────────────────────
  {
    id: 'base-modern-headerband',
    name: 'Modern Professional (Header Band)',
    category: 'Professional',
    atsFriendly: true,
    description: 'A full-width colored header band carries name, role and contact; rounded pill date badges throughout.',
    bestFor: ['Professional', 'Modern'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: HeaderBandTemplate,
  },
  {
    id: 'base-modern-splitheader',
    name: 'Modern Professional (Split Header)',
    category: 'Professional',
    atsFriendly: true,
    description: 'A genuinely two-column header — name/photo on the left, contact details right-aligned behind a vertical rule.',
    bestFor: ['Professional', 'Modern'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: SplitHeaderTemplate,
  },
  {
    id: 'base-modern-timeline',
    name: 'Modern Professional (Timeline Rail)',
    category: 'Professional',
    atsFriendly: true,
    description: 'A single connected vertical rail with dots runs through every dated section — no photo, ATS-safe.',
    bestFor: ['Professional', 'Modern'],
    supportsPhoto: false,
    photoPositions: [],
    component: TimelineRailTemplate,
  },
  // ── Minimal Executive ─────────────────────────────────────────────────
  {
    id: 'base-executive-whitespace',
    name: 'Minimal Executive (Whitespace)',
    category: 'Professional',
    atsFriendly: true,
    description: 'Extreme whitespace, centered wide-tracked name, no color blocks — restraint built for C-suite applications.',
    bestFor: ['Executive', 'Professional'],
    supportsPhoto: false,
    photoPositions: [],
    component: WhitespaceExecutiveTemplate,
  },
  {
    id: 'base-executive-framed',
    name: 'Minimal Executive (Framed Photo)',
    category: 'Professional',
    atsFriendly: true,
    description: 'A thin bordered frame around the photo evokes an official portrait, paired with a restrained serif-leaning layout.',
    bestFor: ['Executive', 'Professional'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: FramedExecutiveTemplate,
  },
  // ── Clean Corporate ───────────────────────────────────────────────────
  {
    id: 'base-corporate-memo',
    name: 'Clean Corporate (Memo Style)',
    category: 'Professional',
    atsFriendly: true,
    description: 'A light gray letterhead banner and left-accent-bar sections read like an internal corporate memo. No photo.',
    bestFor: ['Corporate', 'Professional'],
    supportsPhoto: false,
    photoPositions: [],
    component: CorporateMemoTemplate,
  },
  {
    id: 'base-corporate-photocard',
    name: 'Clean Corporate (Photo Card)',
    category: 'Professional',
    atsFriendly: true,
    description: 'Photo left in the header; contact details sit in a boxed card, skills render as a bordered grid.',
    bestFor: ['Corporate', 'Professional'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: CorporatePhotoCardTemplate,
  },
  // ── Creative Portfolio ────────────────────────────────────────────────
  {
    id: 'base-portfolio-boldhero',
    name: 'Creative Portfolio (Bold Hero)',
    category: 'Creative',
    atsFriendly: false,
    description: 'Huge display-size hero name with photo beside it; projects render as a 2-column card grid.',
    bestFor: ['Creative', 'Designer', 'Portfolio'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: BoldHeroPortfolioTemplate,
  },
  {
    id: 'base-portfolio-pastelsidebar',
    name: 'Creative Portfolio (Pastel Sidebar)',
    category: 'Creative',
    atsFriendly: false,
    description: 'A soft pastel-tinted sidebar with a rounded photo and skill pill tags; magazine-style main column.',
    bestFor: ['Creative', 'Designer', 'Portfolio'],
    supportsPhoto: true,
    photoPositions: ['left-sidebar'],
    component: PastelSidebarPortfolioTemplate,
  },
  {
    id: 'base-portfolio-asymmetric',
    name: 'Creative Portfolio (Asymmetric)',
    category: 'Creative',
    atsFriendly: false,
    description: 'Bold geometric offset dividers and an asymmetric masonry-style project grid. No photo.',
    bestFor: ['Creative', 'Designer', 'Portfolio'],
    supportsPhoto: false,
    photoPositions: [],
    component: AsymmetricPortfolioTemplate,
  },
  // ── Software/Technology ───────────────────────────────────────────────
  {
    id: 'base-tech-changelog',
    name: 'Software/Technology (Changelog Style)',
    category: 'Technology',
    atsFriendly: true,
    description: 'Experience formatted like a git changelog with monospace dates and inline stack badges. No photo.',
    bestFor: ['Developer', 'Technology'],
    supportsPhoto: false,
    photoPositions: [],
    component: ChangelogTechTemplate,
  },
  {
    id: 'base-tech-splitrail',
    name: 'Software/Technology (Split Rail)',
    category: 'Technology',
    atsFriendly: true,
    description: 'Photo left in the header; a plain white right rail carries skills/certifications beside the main column.',
    bestFor: ['Developer', 'Technology'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: SplitRailTechTemplate,
  },
  {
    id: 'base-tech-leadership',
    name: 'Software/Technology (Tech Leadership)',
    category: 'Technology',
    atsFriendly: true,
    description: 'For engineering managers/tech leads — an impact-metrics strip and a "Mentorship & Leadership" section up front.',
    bestFor: ['Tech Lead', 'Engineering Manager', 'Technology'],
    supportsPhoto: false,
    photoPositions: [],
    component: TechLeadershipTemplate,
  },
  // ── Student/Fresher ───────────────────────────────────────────────────
  {
    id: 'base-student-colortab',
    name: 'Student/Fresher (Color Tab)',
    category: 'Student',
    atsFriendly: true,
    description: 'Small colored square tabs before every heading; minimal single column for a first resume. No photo.',
    bestFor: ['Student', 'Fresher'],
    supportsPhoto: false,
    photoPositions: [],
    component: ColorTabStudentTemplate,
  },
  {
    id: 'base-student-campuscard',
    name: 'Student/Fresher (Campus Card)',
    category: 'Student',
    atsFriendly: true,
    description: 'Photo inside a bordered "ID card" box beside the name — university-directory styling.',
    bestFor: ['Student', 'Fresher'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: CampusCardStudentTemplate,
  },
  {
    id: 'base-student-twocolumn',
    name: 'Student/Fresher (Two Column)',
    category: 'Student',
    atsFriendly: true,
    description: 'A plain white two-column page split — no colored sidebar, just a divider line. No photo.',
    bestFor: ['Student', 'Fresher'],
    supportsPhoto: false,
    photoPositions: [],
    component: TwoColumnStudentTemplate,
  },
  // ── Academic ──────────────────────────────────────────────────────────
  {
    id: 'base-academic-marginnotes',
    name: 'Academic (Margin Notes)',
    category: 'Student',
    atsFriendly: true,
    description: 'A narrow left margin column annotates every dated entry with its year, like a formal academic CV.',
    bestFor: ['Academic', 'Researcher', 'Student'],
    supportsPhoto: false,
    photoPositions: [],
    component: MarginNotesAcademicTemplate,
  },
  {
    id: 'base-academic-numbered',
    name: 'Academic (Numbered Sections)',
    category: 'Student',
    atsFriendly: true,
    description: 'Every section carries a running number, a grant/CV convention; dense and compact for long publication lists.',
    bestFor: ['Academic', 'Researcher', 'Student'],
    supportsPhoto: false,
    photoPositions: [],
    component: NumberedAcademicTemplate,
  },
  // ── Designer/Creative ─────────────────────────────────────────────────
  {
    id: 'base-designer-softsidebar',
    name: 'Designer/Creative (Soft Sidebar)',
    category: 'Creative',
    atsFriendly: false,
    description: 'A dark charcoal sidebar with a large circular photo and rounded skill dots; thin-rule main column.',
    bestFor: ['Designer', 'Creative'],
    supportsPhoto: true,
    photoPositions: ['left-sidebar'],
    component: SoftSidebarDesignerTemplate,
  },
  {
    id: 'base-designer-moodboard',
    name: 'Designer/Creative (Moodboard)',
    category: 'Creative',
    atsFriendly: false,
    description: 'Photo left with a small color-swatch row beside the name; projects render as horizontal tag-rail cards.',
    bestFor: ['Designer', 'Creative'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: MoodboardDesignerTemplate,
  },
  {
    id: 'base-designer-typographic',
    name: 'Designer/Creative (Typographic)',
    category: 'Creative',
    atsFriendly: false,
    description: 'Huge single-word-per-line hero name — typography alone carries the design. No photo, no color blocks.',
    bestFor: ['Designer', 'Creative'],
    supportsPhoto: false,
    photoPositions: [],
    component: TypographicDesignerTemplate,
  },
  // ── Sales/Marketing ───────────────────────────────────────────────────
  {
    id: 'base-sales-quotametrics',
    name: 'Sales/Marketing (Quota Metrics)',
    category: 'Professional',
    atsFriendly: true,
    description: 'Photo left; achievements pull into a green upward-trend results strip right under the header.',
    bestFor: ['Sales', 'Marketing'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: QuotaMetricsSalesTemplate,
  },
  {
    id: 'base-sales-testimonial',
    name: 'Sales/Marketing (Testimonial)',
    category: 'Professional',
    atsFriendly: true,
    description: 'Summary renders as a large pull-quote in a tinted box — a persuasive, marketing-forward opener. No photo.',
    bestFor: ['Sales', 'Marketing'],
    supportsPhoto: false,
    photoPositions: [],
    component: TestimonialSalesTemplate,
  },
  // ── Manager/Leadership ────────────────────────────────────────────────
  {
    id: 'base-manager-orgstats',
    name: 'Manager/Leadership (Org Stats)',
    category: 'Professional',
    atsFriendly: true,
    description: 'Photo left in a bold navy header; a "Leadership Track Record" section is promoted right under it.',
    bestFor: ['Manager', 'Leadership'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: OrgStatsManagerTemplate,
  },
  {
    id: 'base-manager-philosophy',
    name: 'Manager/Leadership (Philosophy)',
    category: 'Professional',
    atsFriendly: true,
    description: 'The summary is framed as a bordered "Leadership Philosophy" statement. No photo, formal single column.',
    bestFor: ['Manager', 'Leadership'],
    supportsPhoto: false,
    photoPositions: [],
    component: PhilosophyManagerTemplate,
  },
  // ── Simple Worker/Labor ───────────────────────────────────────────────
  {
    id: 'base-worker-friendly',
    name: 'Simple Worker/Labor (Friendly)',
    category: 'Worker',
    atsFriendly: true,
    description: 'Big, bold, rounded type with icon-bullet skills — easy to scan for any frontline role. No photo.',
    bestFor: ['Worker', 'Labor'],
    supportsPhoto: false,
    photoPositions: [],
    component: FriendlyWorkerTemplate,
  },
  {
    id: 'base-worker-safetytimeline',
    name: 'Simple Worker/Labor (Safety Timeline)',
    category: 'Worker',
    atsFriendly: true,
    description: 'High-contrast black and safety-yellow color scheme with a left-rail work-history timeline. No photo.',
    bestFor: ['Worker', 'Labor', 'Construction'],
    supportsPhoto: false,
    photoPositions: [],
    component: SafetyTimelineWorkerTemplate,
  },
  {
    id: 'base-worker-idbadge',
    name: 'Simple Worker/Labor (ID Badge)',
    category: 'Worker',
    atsFriendly: true,
    description: 'Photo renders inside a bordered ID-badge box — for roles where a photo is expected (security, care, driving).',
    bestFor: ['Worker', 'Labor', 'Driver', 'Security'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: IdBadgeWorkerTemplate,
  },
  // ── International/CV style ────────────────────────────────────────────
  {
    id: 'base-intl-eurosidebar',
    name: 'International/CV Style (Euro Sidebar)',
    category: 'ATS',
    atsFriendly: true,
    description: 'A navy "Personal Data" sidebar in the formal European CV convention, all-caps field labels.',
    bestFor: ['International', 'CV', 'Europe'],
    supportsPhoto: true,
    photoPositions: ['left-sidebar'],
    component: EuroSidebarCvTemplate,
  },
  {
    id: 'base-intl-formalglobal',
    name: 'International/CV Style (Formal Global)',
    category: 'ATS',
    atsFriendly: true,
    description: 'A centered "Curriculum Vitae" document title with the photo top-left — the NGO/UN-style formal CV format.',
    bestFor: ['International', 'CV', 'NGO'],
    supportsPhoto: true,
    photoPositions: ['left-circle', 'left-square'],
    component: FormalGlobalCvTemplate,
  },
  {
    id: 'base-intl-numberedglobal',
    name: 'International/CV Style (Numbered Global)',
    category: 'ATS',
    atsFriendly: true,
    description: 'Every section is numbered — the UN/NGO "Common CV" convention, fully ATS-safe. No photo.',
    bestFor: ['International', 'CV'],
    supportsPhoto: false,
    photoPositions: [],
    component: NumberedGlobalCvTemplate,
  },
  {
    id: 'base-intl-compactglobal',
    name: 'International/CV Style (Compact Global)',
    category: 'ATS',
    atsFriendly: true,
    description: 'Small dense type built to stay multi-page-safe for long international careers; location-first contact line.',
    bestFor: ['International', 'CV'],
    supportsPhoto: false,
    photoPositions: [],
    component: CompactGlobalCvTemplate,
  },
];
