import { CountryCVConfig } from './types';
import { romaniaConfig } from './romania';
import { bosniaConfig } from './bosnia';
import { qatarConfig } from './qatar';
import { europassLegacyConfig } from './europassLegacy';

export * from './types';
export { romaniaConfig } from './romania';
export { bosniaConfig } from './bosnia';
export { qatarConfig } from './qatar';
export { europassLegacyConfig } from './europassLegacy';

export const COUNTRY_CV_CONFIGS: Record<string, CountryCVConfig> = {
  RO: romaniaConfig,
  BA: bosniaConfig,
  QA: qatarConfig,
};

export const SUPPORTED_COUNTRIES = [romaniaConfig, bosniaConfig, qatarConfig];

// Configs that need the extended-fields editor (CEFR languages, driving
// licence, declaration, personal-info extras) but must NOT appear in the
// RO/BA/QA country-flag picker (CountrySelectionHub.tsx / MyResumes.tsx,
// the only consumers of SUPPORTED_COUNTRIES) — reached as a normal template
// pick instead of a "choose your country" step.
const EXTENDED_FIELD_TEMPLATE_CONFIGS: Record<string, CountryCVConfig> = {
  EU: europassLegacyConfig,
};

export function getCountryConfig(countryCode?: string | null): CountryCVConfig | null {
  if (!countryCode) return null;
  const normalized = countryCode.toUpperCase();
  return COUNTRY_CV_CONFIGS[normalized] || EXTENDED_FIELD_TEMPLATE_CONFIGS[normalized] || null;
}

export function getAllCountries(): CountryCVConfig[] {
  return SUPPORTED_COUNTRIES;
}

export function isCountryTemplate(templateId: string): boolean {
  return SUPPORTED_COUNTRIES.some((c) => c.templateIds.includes(templateId));
}

export function getCountryByTemplateId(templateId: string): CountryCVConfig | null {
  return (
    SUPPORTED_COUNTRIES.find((c) => c.templateIds.includes(templateId)) ||
    Object.values(EXTENDED_FIELD_TEMPLATE_CONFIGS).find((c) => c.templateIds.includes(templateId)) ||
    null
  );
}
