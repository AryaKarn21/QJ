import { useQuery } from '@tanstack/react-query';
import { getHomepageContent } from '../api/cmsPublicApi';

interface SectionDefaults {
  heading: string;
  highlightedText?: string;
  description?: string;
  badgeText?: string;
  buttonText?: string;
  buttonLink?: string;
}

/**
 * Reads one homepage section's CMS-managed heading/description/button
 * copy (backend/models/HomepageContent.js's `sections` array), keyed by a
 * fixed section `key` matching CmsHub.tsx's HOMEPAGE_SECTION_KEYS. Follows
 * the same "CMS overrides a hardcoded default" pattern Hero.tsx already
 * uses — a missing key, an unpublished draft, or the request still
 * loading all fall back to `defaults`, so the section never renders
 * blank waiting on this fetch.
 *
 * Uses the same `['homepage-content']` query key Hero.tsx/CallToAction.tsx
 * use (see those files) so all homepage consumers share one cached
 * request instead of each firing its own.
 */
export function useHomepageSection(key: string, defaults: SectionDefaults) {
  const { data } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: getHomepageContent,
    retry: false,
  });

  const section = data && 'sections' in data ? data.sections?.find((s) => s.key === key) : undefined;
  const isActive = section?.isActive !== false;

  return {
    isActive,
    heading: section?.heading || defaults.heading,
    highlightedText: section?.highlightedText || defaults.highlightedText || '',
    description: section?.description || defaults.description || '',
    badgeText: section?.badgeText || defaults.badgeText || '',
    buttonText: section?.buttonText || defaults.buttonText || '',
    buttonLink: section?.buttonLink || defaults.buttonLink || '',
  };
}
