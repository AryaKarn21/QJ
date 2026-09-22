import { CountryCVConfig } from './types';

export const romaniaConfig: CountryCVConfig = {
  countryCode: 'RO',
  countryName: 'Romania',
  flag: '🇷🇴',
  marketType: 'European-style CV',
  styleSubtitle: 'Professional & structured',
  badge: 'EU Recommended Format',
  description:
    'Structured European-style format tailored for Romanian employers and multinational companies operating in Romania.',
  disclaimer: 'Adapted format commonly recommended for job applications in Romania and the European Union.',
  defaultTemplateId: 'ro-professional',
  templateIds: ['ro-professional', 'ro-structured', 'ro-ats', 'ro-modern'],
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
      description: 'Contact details, location, and optional personal data.',
      required: true,
      helpText: 'Date of birth, nationality, and photo are optional depending on employer requirements.',
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
      description: 'Mother tongue and additional languages rated by CEFR levels (A1 to C2).',
      required: false,
      helpText: 'Common European Framework of Reference (CEFR) standard for listening, reading, speaking, and writing.',
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
