// Standardized datasets for European CV Builder (Languages, Skills, Proficiency, Driving Licenses)

export interface SimpleLanguageEntry {
  language: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | '';
}

export interface StructuredSkillEntry {
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | '';
}

export const LANGUAGES_LIST: string[] = [
  'English',
  'Nepali',
  'Hindi',
  'Arabic',
  'Romanian',
  'Bosnian',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
  'Chinese (Mandarin)',
  'Russian',
  'Urdu',
  'Bengali',
  'Turkish',
  'Dutch',
  'Polish',
  'Greek',
  'Swedish',
  'Tagalog / Filipino',
  'Tamil',
  'Sinhala',
];

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const DIGITAL_SKILLS_LIST: string[] = [
  'Microsoft Office',
  'Google Workspace',
  'Data Entry',
  'Email & Workplace Communication',
  'Internet Research & Web Navigation',
  'Digital Marketing',
  'Social Media Management',
  'Cloud Computing',
  'Database Management',
  'Graphic Design',
  'Video Editing',
  'Cybersecurity Fundamentals',
  'Computer Networking',
  'ERP Systems',
  'POS (Point of Sale) Operations',
  'IT Support & Troubleshooting',
  'Content Management (CMS)',
  'Web Development',
];

export const SOFTWARE_SKILLS_LIST: string[] = [
  'Microsoft Excel',
  'Microsoft Word',
  'Microsoft PowerPoint',
  'Adobe Photoshop',
  'Adobe Illustrator',
  'Canva',
  'AutoCAD',
  'Figma',
  'VS Code',
  'Visual Studio',
  'IntelliJ IDEA',
  'Git / GitHub',
  'Docker',
  'Postman',
  'MySQL',
  'PostgreSQL',
  'MongoDB',
  'SAP ERP',
  'QuickBooks',
  'Trello / Jira',
  'Slack / Zoom',
];

export const SKILL_PROFICIENCIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

export const DRIVING_LICENSE_TYPES: string[] = [
  'Light Vehicle (Category B)',
  'Motorcycle (Category A/A1/A2)',
  'Medium Vehicle (Category C1)',
  'Heavy Goods Vehicle / Truck (Category C)',
  'Bus / Passenger Transport (Category D)',
  'Articulated Vehicle (Category E / CE)',
  'GCC Light Vehicle Driving License',
  'GCC Heavy Vehicle Driving License',
  'Forklift / Heavy Machinery Operator',
];
