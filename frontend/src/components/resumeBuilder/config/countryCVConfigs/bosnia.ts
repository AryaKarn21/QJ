import { CountryCVConfig } from './types';

export const bosniaConfig: CountryCVConfig = {
  countryCode: 'BA',
  countryName: 'Bosnia & Herzegovina',
  flag: '🇧🇦',
  marketType: 'European-style CV',
  styleSubtitle: 'Professional & structured',
  badge: 'European Adapted',
  description:
    'Clean, professional European-style CV adapted for Bosnia & Herzegovina employers, public institutions, and regional organizations.',
  disclaimer: 'Adapted format commonly used for job applications in Bosnia & Herzegovina.',
  defaultTemplateId: 'ba-professional',
  templateIds: ['ba-professional', 'ba-ats', 'ba-modern'],
  features: {
    hasCEFRGrid: true,
    hasDigitalSkills: true,
    hasGulfFields: false,
    hasDrivingLicense: true,
    hasMemberships: false,
  },
  optionalFields: ['dateOfBirth', 'nationality', 'photo', 'address', 'drivingLicense'],
  sections: [
    {
      id: 'personalInfo',
      name: 'Personal Information',
      description: 'Contact details, city, and optional personal information.',
      required: true,
      helpText: 'Date of birth, nationality, and photograph are optional and never required by default.',
    },
    {
      id: 'summary',
      name: 'Professional Profile',
      description: 'Overview of professional identity, core capabilities, and goals.',
      required: false,
    },
    {
      id: 'experience',
      name: 'Work Experience',
      description: 'Companies, positions, dates, responsibilities, and achievements.',
      required: true,
    },
    {
      id: 'education',
      name: 'Education',
      description: 'Degrees, qualifications, institutions, and dates.',
      required: true,
    },
    {
      id: 'languages',
      name: 'Languages (CEFR Levels)',
      description: 'Native tongue and foreign languages using standard CEFR levels (A1–C2).',
      required: false,
    },
    {
      id: 'digitalSkills',
      name: 'Digital Skills',
      description: 'Computer literacy, applications, frameworks, and tools.',
      required: false,
    },
    {
      id: 'certifications',
      name: 'Certifications',
      description: 'Professional development courses and certificates.',
      required: false,
    },
    {
      id: 'projects',
      name: 'Projects',
      description: 'Key professional initiatives or academic projects.',
      required: false,
    },
    {
      id: 'volunteering',
      name: 'Volunteering',
      description: 'Community involvement and non-profit engagements.',
      required: false,
    },
    {
      id: 'additionalInfo',
      name: 'Additional Information',
      description: 'Driving license categories and professional references.',
      required: false,
    },
  ],
};
