import React from 'react';
import type { Resume } from '../resumeApi';
import type { PhotoPosition } from './variantTypes';

/**
 * Wraps a base-structure template component (which takes an optional
 * `photoPosition` prop and reads color/font from `resume.theme` via the
 * existing `getTheme()` mechanism every template already uses) into a
 * plain `React.FC<{ resume: Resume }>` — the shape `TemplateDefinition`
 * requires — for one specific (theme, photoPosition) combination.
 *
 * This is the one place a "theme" gets forced onto a resume for rendering
 * purposes: it clones the resume with `theme` overridden to the variant's
 * fixed theme id, so the base component's `getTheme(resume.theme, resume.fontFamily)` call
 * resolves to exactly that preset regardless of what `resume.theme` is
 * persisted as in the database. See registry.ts's generateTemplateVariants
 * for how this is invoked across the full base × theme × photo-position
 * cross product.
 */
export function makeVariantComponent(
  Base: React.FC<{ resume: Resume; photoPosition?: PhotoPosition }>,
  themeId: string,
  photoPosition?: PhotoPosition
): React.FC<{ resume: Resume }> {
  const Wrapped: React.FC<{ resume: Resume }> = ({ resume }) => (
    <Base resume={{ ...resume, theme: themeId }} photoPosition={photoPosition} />
  );
  Wrapped.displayName = `Variant(${Base.displayName || Base.name || 'Base'}, ${themeId}${photoPosition ? `, ${photoPosition}` : ''})`;
  return Wrapped;
}
