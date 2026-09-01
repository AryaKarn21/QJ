import type { Resume } from '../resumeApi';
import { THEME_PRESETS } from '../themePresets';
import { BASE_TEMPLATES } from './baseTemplates';
import { makeVariantComponent } from './variantFactory';
import type { TemplateCategory, PhotoPosition } from './variantTypes';
import { photoPositionLabel } from './variantTypes';
import { MinimalAtsTemplate } from './ats/MinimalAtsTemplate';
import { HarvardTemplate } from './ats/HarvardTemplate';
import { StanfordTemplate } from './ats/StanfordTemplate';
import { ClassicProfessionalTemplate } from './ats/ClassicProfessionalTemplate';
import { ReverseChronologicalTemplate } from './ats/ReverseChronologicalTemplate';
import { SingleColumnAtsTemplate } from './ats/SingleColumnAtsTemplate';
import { ModernAtsTemplate } from './ats/ModernAtsTemplate';
import { CompactAtsTemplate } from './ats/CompactAtsTemplate';
import { ExecutiveLeadershipTemplate } from './professional/ExecutiveLeadershipTemplate';
import { CorporateBlueTemplate } from './professional/CorporateBlueTemplate';
import { ElegantTemplate } from './professional/ElegantTemplate';
import { ProfessionalSidebarTemplate } from './professional/ProfessionalSidebarTemplate';
import { BusinessModernTemplate } from './professional/BusinessModernTemplate';
import { PremiumProfessionalTemplate } from './professional/PremiumProfessionalTemplate';
import { IrisSidebarTemplate } from './professional/IrisSidebarTemplate';
import { EuropassStyleTemplate } from './professional/EuropassStyleTemplate';

// Technology
import { SoftwareEngineerTemplate } from './technology/SoftwareEngineerTemplate';
import { FullStackDeveloperTemplate } from './technology/FullStackDeveloperTemplate';
import { AiMlEngineerTemplate } from './technology/AiMlEngineerTemplate';
import { DataAnalystTemplate } from './technology/DataAnalystTemplate';
import { DevOpsEngineerTemplate } from './technology/DevOpsEngineerTemplate';
import { CyberSecurityTemplate } from './technology/CyberSecurityTemplate';
// Student
import { FreshGradTemplate } from './student/FreshGradTemplate';
import { InternshipTemplate } from './student/InternshipTemplate';
import { AcademicScholarTemplate } from './student/AcademicScholarTemplate';
import { CampusLeaderTemplate } from './student/CampusLeaderTemplate';
// Creative
import { PortfolioCreativeTemplate } from './creative/PortfolioCreativeTemplate';
import { BoldSidebarTemplate } from './creative/BoldSidebarTemplate';
import { MinimalistDesignerTemplate } from './creative/MinimalistDesignerTemplate';
// Worker
import { SimpleWorkerTemplate } from './worker/SimpleWorkerTemplate';
import { WarehouseLogisticsTemplate } from './worker/WarehouseLogisticsTemplate';
import { FactoryManufacturingTemplate } from './worker/FactoryManufacturingTemplate';
import { DriverResumeTemplate } from './worker/DriverResumeTemplate';
import { ConstructionTradesTemplate } from './worker/ConstructionTradesTemplate';
import { HospitalityFoodTemplate } from './worker/HospitalityFoodTemplate';
import { HealthcareSupportTemplate } from './worker/HealthcareSupportTemplate';
import { RetailCustomerServiceTemplate } from './worker/RetailCustomerServiceTemplate';

// Re-exported from variantTypes.ts (the base-template generator's shared
// type module) so every existing import of `TemplateCategory` from this
// file keeps working unchanged.
export type { TemplateCategory, PhotoPosition } from './variantTypes';

export interface TemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  atsFriendly: boolean;
  description: string;
  component: React.FC<{ resume: Resume }>;
  // Additive metadata (Phase 3/4): populated on every generated (base ×
  // theme × photo-position) template and on the hand-written templates
  // that are known to support a photo; optional so the many hand-written
  // entries below that predate this metadata still satisfy the type.
  bestFor?: string[];
  photoSupported?: boolean;
  photoLayout?: PhotoPosition | 'none';
  // Only set on generated (base × theme × photo) variants. Every color
  // variant of the same base structure/photo-layout combo shares the same
  // `groupId` — TemplateGallery uses this to show ONE card per
  // structurally-distinct template with a color-swatch picker, instead of
  // a separate full card per color (which is what made the gallery feel
  // like "many templates that are all the same"). `baseName`/`themeId`
  // are the display name of the underlying structure and the specific
  // color preset this entry uses, respectively.
  groupId?: string;
  baseName?: string;
  themeId?: string;
  // False only on templates with an intentionally fixed typographic
  // identity — named historical formats (Harvard/Stanford Resume) where
  // the font IS the format, and the Worker category's deliberately simple
  // fixed sans-serif (accessibility choice for a low-literacy audience).
  // Defaults to true (undefined === customizable) so every generated
  // variant and the rest of the hand-written set need no change.
  fontCustomizable?: boolean;
}

/**
 * Every template is its own component with its own structure — no two
 * entries here share a rendering component. Color accents are layered on
 * top via `theme` (see themePresets.ts) where a template chooses to use
 * them; they do not define what a "template" is. TemplateGallery and
 * TemplateRenderer both read from this list — add an entry here as more
 * categories get built and both pick it up automatically.
 */
// The original 37 hand-written, individually-coded templates — unchanged,
// still fully selectable, still the templates PDF export / preview /
// TemplateRenderer resolve exactly as before. `generateTemplateVariants()`
// below is appended AFTER this array, not merged into it, so this list
// stays a clean, readable reference of the hand-written set on its own.
const HAND_WRITTEN_TEMPLATES: TemplateDefinition[] = [
  // ── ATS ──────────────────────────────────────────────────────────────────
  {
    id: 'ats-minimal',
    name: 'Minimal ATS',
    category: 'ATS',
    atsFriendly: true,
    description: 'Zero decoration, maximum parser safety. Serif, black text, no color.',
    component: MinimalAtsTemplate,
    fontCustomizable: false,
    photoSupported: true,
    photoLayout: 'left-circle',
  },

  {
    id: 'ats-harvard',
    name: 'Harvard Resume',
    category: 'ATS',
    atsFriendly: true,
    description: 'The classic Harvard OCS format — centered header, underlined section titles.',
    component: HarvardTemplate,
    fontCustomizable: false,
  },
  {
    id: 'ats-stanford',
    name: 'Stanford Resume',
    category: 'ATS',
    atsFriendly: true,
    description: 'Sans-serif academic style with full-width rules and real bullet lists.',
    component: StanfordTemplate,
    fontCustomizable: false,
  },
  {
    id: 'ats-classic-professional',
    name: 'Classic Professional',
    category: 'ATS',
    atsFriendly: true,
    description: 'Traditional business resume with a subtle accent color and left-border headings.',
    component: ClassicProfessionalTemplate,
  },
  {
    id: 'ats-reverse-chronological',
    name: 'Reverse Chronological',
    category: 'ATS',
    atsFriendly: true,
    description: 'Fixed date column down the left side — built for a clean timeline read.',
    component: ReverseChronologicalTemplate,
  },
  {
    id: 'ats-single-column',
    name: 'Single Column ATS',
    category: 'ATS',
    atsFriendly: true,
    description: 'The plainest possible layout — reads like a well-formatted Word document.',
    component: SingleColumnAtsTemplate,
    fontCustomizable: false,
  },
  {
    id: 'ats-modern',
    name: 'Modern ATS',
    category: 'ATS',
    atsFriendly: true,
    description: 'Still fully parser-safe, but with rounded skill chips and a colored accent.',
    component: ModernAtsTemplate,
  },
  {
    id: 'ats-compact',
    name: 'Compact ATS',
    category: 'ATS',
    atsFriendly: true,
    description: 'Dense, small-type layout built to fit a long career onto one page.',
    component: CompactAtsTemplate,
  },

  // ── Professional ─────────────────────────────────────────────────────────
  {
    id: 'pro-executive',
    name: 'Executive',
    category: 'Professional',
    atsFriendly: true,
    description: 'Large header, leadership and achievements pulled up ahead of daily experience.',
    component: ExecutiveLeadershipTemplate,
  },
  {
    id: 'pro-corporate-blue',
    name: 'Corporate Blue',
    category: 'Professional',
    atsFriendly: true,
    description: 'A fixed navy banner header — bold, traditional corporate identity.',
    component: CorporateBlueTemplate,
    fontCustomizable: false,
  },
  {
    id: 'pro-elegant',
    name: 'Elegant',
    category: 'Professional',
    atsFriendly: true,
    description: 'Refined serif, wide letter-spacing, hairline dividers, lots of whitespace.',
    component: ElegantTemplate,
    fontCustomizable: false,
  },
  {
    id: 'pro-sidebar',
    name: 'Professional Sidebar',
    category: 'Professional',
    atsFriendly: false,
    description: 'Photo, contact, skills and languages in a colored sidebar; timeline on the right.',
    component: ProfessionalSidebarTemplate,
    photoSupported: true,
    photoLayout: 'left-sidebar',
  },
  {
    id: 'pro-business-modern',
    name: 'Business Modern',
    category: 'Professional',
    atsFriendly: true,
    description: 'Full-width rule headings, colored underline accent, no sidebar or color blocks.',
    component: BusinessModernTemplate,
  },
  {
    id: 'pro-premium',
    name: 'Premium Professional',
    category: 'Professional',
    atsFriendly: true,
    description: 'Dark header block, serif name, short accent underlines beneath each section.',
    component: PremiumProfessionalTemplate,
  },
  {
    id: 'pro-iris-sidebar',
    name: 'Iris Sidebar',
    category: 'Professional',
    atsFriendly: false,
    description: 'Two-column profile-card layout — off-white sidebar with ring-bordered photo and 4-segment skill bars.',
    component: IrisSidebarTemplate,
    photoSupported: true,
    photoLayout: 'left-sidebar',
  },
    {
    id: 'pro-europass',
    name: 'Europass Style',
    category: 'Professional',
    atsFriendly: true,
    description: 'Referenced from the official EU Europass CV editor — a compact personal-details sidebar plus a genuine CEFR-rated Language Skills section (A1–C2 / Native).',
    component: EuropassStyleTemplate,
    photoSupported: true,
    photoLayout: 'left-sidebar',
  },

  // ── Technology ───────────────────────────────────────────────────────────
  {
    id: 'tech-software-engineer',
    name: 'Software Engineer',
    category: 'Technology',
    atsFriendly: true,
    description: 'Skills-first layout with GitHub/portfolio tags in the header. Projects before education.',
    component: SoftwareEngineerTemplate,
  },
  {
    id: 'tech-fullstack',
    name: 'Full Stack Developer',
    category: 'Technology',
    atsFriendly: true,
    description: 'Dual-column skills panel, tech stack chips, GitHub prominently in the header.',
    component: FullStackDeveloperTemplate,
    photoSupported: true,
    photoLayout: 'left-circle',
  },
  {
    id: 'tech-ai-ml',
    name: 'AI / ML Engineer',
    category: 'Technology',
    atsFriendly: true,
    description: 'Research-forward layout — papers, models, and open-source contributions up front.',
    component: AiMlEngineerTemplate,
  },
  {
    id: 'tech-data-analyst',
    name: 'Data Analyst',
    category: 'Technology',
    atsFriendly: true,
    description: 'Metrics-heavy format: impact numbers pulled into the header summary line.',
    component: DataAnalystTemplate,
  },
  {
    id: 'tech-devops',
    name: 'DevOps Engineer',
    category: 'Technology',
    atsFriendly: true,
    description: 'Infrastructure-focused with tool certifications and cloud platforms surfaced early.',
    component: DevOpsEngineerTemplate,
  },
  {
    id: 'tech-cyber',
    name: 'Cyber Security',
    category: 'Technology',
    atsFriendly: true,
    description: 'Clearance level, certifications (CISSP, CEH), and CVE disclosures at the top.',
    component: CyberSecurityTemplate,
    fontCustomizable: false,
  },

  // ── Student ──────────────────────────────────────────────────────────────
  {
    id: 'student-fresh-grad',
    name: 'Fresh Graduate',
    category: 'Student',
    atsFriendly: true,
    description: 'Education and projects lead — built for new grads with no full-time experience yet.',
    component: FreshGradTemplate,
  },
  {
    id: 'student-internship',
    name: 'Internship Ready',
    category: 'Student',
    atsFriendly: true,
    description: 'Compact one-pager optimised for internship applications. GPA and coursework included.',
    component: InternshipTemplate,
  },
  {
    id: 'student-academic',
    name: 'Academic Scholar',
    category: 'Student',
    atsFriendly: true,
    description: 'Research, publications, scholarships and academic honours take the spotlight.',
    component: AcademicScholarTemplate,
  },
  {
    id: 'student-campus-leader',
    name: 'Campus Leader',
    category: 'Student',
    atsFriendly: true,
    description: 'Positions of responsibility and extra-curriculars elevated alongside academics.',
    component: CampusLeaderTemplate,
  },

  // ── Creative ─────────────────────────────────────────────────────────────
  {
    id: 'creative-portfolio',
    name: 'Portfolio Creative',
    category: 'Creative',
    atsFriendly: false,
    description: 'Accent header bar, project cards with tech tags — made for designers and makers.',
    component: PortfolioCreativeTemplate,
  },
  {
    id: 'creative-bold-sidebar',
    name: 'Bold Sidebar',
    category: 'Creative',
    atsFriendly: false,
    description: 'Full-height colored sidebar with name stacked vertically; bold typographic contrast.',
    component: BoldSidebarTemplate,
  },
  {
    id: 'creative-minimalist',
    name: 'Minimalist Designer',
    category: 'Creative',
    atsFriendly: false,
    description: 'Ultra-clean whitespace, thin rules, lowercase headings — less is more.',
    component: MinimalistDesignerTemplate,
  },

  // ── Worker ───────────────────────────────────────────────────────────────
  {
    id: 'worker-simple',
    name: 'Simple Worker',
    category: 'Worker',
    atsFriendly: true,
    description: 'Clean one-page layout with orange accents — perfect for any frontline or general role.',
    component: SimpleWorkerTemplate,
    fontCustomizable: false,
  },
  {
    id: 'worker-warehouse',
    name: 'Warehouse & Logistics',
    category: 'Worker',
    atsFriendly: true,
    description: 'Navy blue, highlights forklift certs, inventory systems, and safety training.',
    component: WarehouseLogisticsTemplate,
    fontCustomizable: false,
  },
  {
    id: 'worker-factory',
    name: 'Factory & Manufacturing',
    category: 'Worker',
    atsFriendly: true,
    description: 'Bold red accent, emphasises machines operated, production, and QC experience.',
    component: FactoryManufacturingTemplate,
    fontCustomizable: false,
  },
  {
    id: 'worker-driver',
    name: 'Driver Resume',
    category: 'Worker',
    atsFriendly: true,
    description: 'Dark blue, highlights licence type, vehicle categories, routes, and safety record.',
    component: DriverResumeTemplate,
    fontCustomizable: false,
  },
  {
    id: 'worker-construction',
    name: 'Construction & Trades',
    category: 'Worker',
    atsFriendly: true,
    description: 'Earthy orange and slate, highlights trade skills, tools, projects, and certifications.',
    component: ConstructionTradesTemplate,
    fontCustomizable: false,
  },
  {
    id: 'worker-hospitality',
    name: 'Hospitality & Food Service',
    category: 'Worker',
    atsFriendly: true,
    description: 'Warm cream and brown, highlights customer service, food safety, and hospitality skills.',
    component: HospitalityFoodTemplate,
    fontCustomizable: false,
  },
  {
    id: 'worker-healthcare',
    name: 'Healthcare Support',
    category: 'Worker',
    atsFriendly: true,
    description: 'Teal-green, professional and calming — highlights patient care and caregiving experience.',
    component: HealthcareSupportTemplate,
    fontCustomizable: false,
  },
  {
    id: 'worker-retail',
    name: 'Retail & Customer Service',
    category: 'Worker',
    atsFriendly: true,
    description: 'Modern purple, highlights customer interaction, sales, and service skills.',
    component: RetailCustomerServiceTemplate,
    fontCustomizable: false,
  },
];

/**
 * Composes the full base × theme × photo-position cross product into
 * individually selectable TemplateDefinition entries — this is what takes
 * the registry from 37 hand-written templates past 1500 total, using the
 * 32 genuinely-distinct base structures in baseTemplates.ts (not palette
 * clones of each other) combined with the 36 color/font theme presets in
 * themePresets.ts. Each entry's `component` is a small wrapper
 * (makeVariantComponent) that forces the resume it renders to use that
 * variant's fixed theme id, so the same base component naturally renders
 * differently per entry via the `getTheme(resume.theme)` call every
 * template already makes — no per-variant JSX duplication.
 */
function generateTemplateVariants(): TemplateDefinition[] {
  const variants: TemplateDefinition[] = [];

  for (const base of BASE_TEMPLATES) {
    for (const theme of THEME_PRESETS) {
      if (!base.supportsPhoto || base.photoPositions.length === 0) {
        variants.push({
          id: `${base.id}--${theme.id}`,
          name: `${base.name} — ${theme.name}`,
          category: base.category,
          atsFriendly: base.atsFriendly,
          description: base.description,
          bestFor: base.bestFor,
          photoSupported: false,
          photoLayout: 'none',
          groupId: base.id,
          baseName: base.name,
          themeId: theme.id,
          component: makeVariantComponent(base.component, theme.id),
        });
        continue;
      }

      for (const pos of base.photoPositions) {
        variants.push({
          id: `${base.id}--${theme.id}--${pos}`,
          name: `${base.name} — ${theme.name} (${photoPositionLabel(pos)})`,
          category: base.category,
          atsFriendly: base.atsFriendly,
          description: base.description,
          bestFor: base.bestFor,
          photoSupported: true,
          photoLayout: pos,
          groupId: `${base.id}--${pos}`,
          baseName: base.photoPositions.length > 1 ? `${base.name} (${photoPositionLabel(pos)})` : base.name,
          themeId: theme.id,
          component: makeVariantComponent(base.component, theme.id, pos),
        });
      }
    }
  }

  return variants;
}

const GENERATED_TEMPLATES: TemplateDefinition[] = generateTemplateVariants();

/**
 * Every template a user can select in the gallery: the 37 hand-written
 * templates plus every generated base × theme × photo-position variant.
 * `getTemplateById`/`getTemplatesByCategory` below need no changes to
 * support this — they already just search whatever array this is.
 */
export const TEMPLATE_REGISTRY: TemplateDefinition[] = [...HAND_WRITTEN_TEMPLATES, ...GENERATED_TEMPLATES];

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): TemplateDefinition[] {
  return TEMPLATE_REGISTRY.filter((t) => t.category === category);
}