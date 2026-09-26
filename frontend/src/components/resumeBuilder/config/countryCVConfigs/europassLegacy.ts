import { CountryCVConfig } from './types';

// Not a real country — a pseudo-config so the "Europass Legacy" template can
// reuse the existing CountrySpecificFieldsEditor (CEFR languages, driving
// licence, declaration, personal-info extras) without being added to
// SUPPORTED_COUNTRIES (which would incorrectly surface it in the RO/BA/QA
// country-flag picker). See config/countryCVConfigs/index.ts's
// EXTENDED_FIELD_TEMPLATE_CONFIGS side-map for how this is wired in.
export const europassLegacyConfig: CountryCVConfig = {
  countryCode: 'EU',
  countryName: 'Europass Legacy',
  flag: '🇪🇺',
  marketType: 'Europass-style CV',
  styleSubtitle: 'Structured, ATS-friendly, document-first',
  badge: 'Europass Format',
  description:
    'A structured, document-style CV matching the classic Europass CV editor layout — personal information grid, chronological experience and education, and a full 5-skill CEFR language matrix.',
  disclaimer:
    "Recreated in QuickJobs' own visual style; not affiliated with or endorsed by the European Union / europa.eu.",
  defaultTemplateId: 'pro-europass-legacy',
  templateIds: ['pro-europass-legacy'],
  features: {
    hasCEFRGrid: true,
    hasDigitalSkills: true,
    hasGulfFields: false,
    hasDrivingLicense: true,
    hasMemberships: false,
  },
  optionalFields: ['dateOfBirth', 'photo', 'address', 'drivingLicense'],
  sections: [
    {
      id: 'personalInfo',
      name: 'Personal Information',
      description: 'Contact details, location, and personal data.',
      required: true,
      helpText: 'Nationality is mandatory. Date of birth and photo are optional depending on employer requirements.',
    },
    {
      id: 'summary',
      name: 'Professional Profile',
      description: 'A concise summary of your career background and key qualifications.',
      required: false,
    },
    {
      id: 'experience',
      name: 'Work Experience',
      description: 'Reverse chronological employment history highlighting key responsibilities and achievements.',
      required: true,
    },
    {
      id: 'education',
      name: 'Education and Training',
      description: 'Academic degrees, vocational training, and qualifications.',
      required: true,
    },
    {
      id: 'languages',
      name: 'Language Skills (CEFR)',
      description: 'Mother tongue and additional languages rated independently for listening, reading, speaking, and writing (A1 to C2).',
      required: false,
      helpText: 'Common European Framework of Reference (CEFR) standard.',
    },
    {
      id: 'digitalSkills',
      name: 'Digital Skills',
      description: 'Technical software, programming languages, platforms, and tools.',
      required: false,
    },
    {
      id: 'otherSkills',
      name: 'Communication & Interpersonal Skills',
      description: 'Organizational, leadership, and managerial competencies.',
      required: false,
    },
    {
      id: 'certifications',
      name: 'Certifications & Accreditations',
      description: 'Professional certificates and industry licenses.',
      required: false,
    },
    {
      id: 'projects',
      name: 'Projects',
      description: 'Notable professional or academic projects.',
      required: false,
    },
    {
      id: 'additionalInfo',
      name: 'Additional Information',
      description: 'Driving license, publications, conferences, and volunteering.',
      required: false,
    },
  ],
};
