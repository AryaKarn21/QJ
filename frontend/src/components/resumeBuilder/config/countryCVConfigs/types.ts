export interface CefrLanguageLevel {
  language: string;
  listening: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  reading: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  spokenInteraction: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  spokenProduction: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  writing: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export interface ProfessionalMembership {
  organization: string;
  membershipType: string;
  year: string;
}

export interface DrivingLicenseDetails {
  licenseType: string;
  country: string;
  licenseNumber?: string;
  expiryDate: string;
}

export interface CountryCVInfo {
  // European & Shared fields
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  gender?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  drivingLicense?: string;
  declaration?: string;
  motherTongue?: string;
  cefrLanguages?: CefrLanguageLevel[];
  digitalSkills?: string[];
  otherSkills?: string;

  // Qatar & Gulf-region fields
  currentLocation?: string;
  noticePeriod?: string;
  visaStatus?: string;
  availability?: string;
  memberships?: ProfessionalMembership[];
  drivingLicenseDetails?: DrivingLicenseDetails;
}

export interface CountrySectionDefinition {
  id: string;
  name: string;
  description: string;
  required: boolean;
  optional?: boolean;
  helpText?: string;
}

export interface CountryCVConfig {
  countryCode: string; // e.g. 'RO', 'BA', 'QA'
  countryName: string; // e.g. 'Romania'
  flag: string; // e.g. '🇷🇴'
  marketType: string; // e.g. 'European-style CV'
  styleSubtitle: string; // e.g. 'Professional & structured'
  badge: string; // e.g. 'EU Standard'
  description: string; // e.g. 'Tailored for Romanian and European multinational applications.'
  disclaimer: string; // Non-legal wording e.g. 'Adapted format for applications in Romania'
  defaultTemplateId: string;
  templateIds: string[];
  features: {
    hasCEFRGrid: boolean;
    hasDigitalSkills: boolean;
    hasGulfFields: boolean;
    hasDrivingLicense: boolean;
    hasMemberships: boolean;
  };
  optionalFields: string[];
  sections: CountrySectionDefinition[];
}
