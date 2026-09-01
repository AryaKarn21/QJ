// Shared types for the base-template × theme × photo-position generator
// (see registry.ts's generateTemplateVariants and templates/baseTemplates.ts).
// Kept in its own file (rather than inside registry.ts) so base template
// components — which live several folders deep — can import just the type
// without pulling in the full registry/theme-preset dependency graph.

/**
 * Where a photo-capable base template places the profile photo. Non-sidebar
 * bases offer 'left-circle'/'left-square' (photo beside the name/contact
 * header); sidebar-structured bases offer only 'left-sidebar' (photo lives
 * in the sidebar column, which is already the left side of the page).
 */
export type PhotoPosition = 'left-circle' | 'left-square' | 'left-sidebar';

// The 6 gallery filter categories the request explicitly asks for (All/
// ATS/Professional/Technology/Student/Creative/Worker). New archetypes
// (Academic, International, Sales/Marketing, Manager/Leadership, Designer)
// map onto these via `bestFor` tags rather than adding new top-level
// categories, so the existing filter set never needs to change. Defined
// here (not in registry.ts) so base template definitions can reference it
// without importing the full registry module.
export type TemplateCategory = 'ATS' | 'Professional' | 'Technology' | 'Student' | 'Creative' | 'Worker';

export function photoPositionLabel(pos: PhotoPosition): string {
  switch (pos) {
    case 'left-circle':
      return 'Circular Photo';
    case 'left-square':
      return 'Square Photo';
    case 'left-sidebar':
      return 'Sidebar Photo';
    default:
      return 'Photo';
  }
}
