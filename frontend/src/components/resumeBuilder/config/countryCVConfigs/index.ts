import { CountryCVConfig } from './types';
import { romaniaConfig } from './romania';
import { bosniaConfig } from './bosnia';
import { qatarConfig } from './qatar';

export * from './types';
export { romaniaConfig } from './romania';
export { bosniaConfig } from './bosnia';
export { qatarConfig } from './qatar';

export const COUNTRY_CV_CONFIGS: Record<string, CountryCVConfig> = {
  RO: romaniaConfig,
  BA: bosniaConfig,
  QA: qatarConfig,
};

export const SUPPORTED_COUNTRIES = [romaniaConfig, bosniaConfig, qatarConfig];

export function getCountryConfig(countryCode?: string | null): CountryCVConfig | null {
  if (!countryCode) return null;
  const normalized = countryCode.toUpperCase();
  return COUNTRY_CV_CONFIGS[normalized] || null;
}

export function getAllCountries(): CountryCVConfig[] {
  return SUPPORTED_COUNTRIES;
}

export function isCountryTemplate(templateId: string): boolean {
  return SUPPORTED_COUNTRIES.some((c) => c.templateIds.includes(templateId));
}

export function getCountryByTemplateId(templateId: string): CountryCVConfig | null {
  return SUPPORTED_COUNTRIES.find((c) => c.templateIds.includes(templateId)) || null;
}
