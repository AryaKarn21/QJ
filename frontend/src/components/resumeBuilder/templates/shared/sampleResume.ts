import type { Resume } from '../../resumeApi';

/**
 * Static sample data used ONLY for template thumbnails/previews in the
 * gallery — never sent to the backend. Lets a template card show what the
 * layout actually looks like with real content instead of a screenshot
 * that goes stale the moment a template's code changes.
 */
export const SAMPLE_RESUME: Resume = {
  _id: 'sample',
  user: 'sample',
  title: 'Sample',
  targetRole: 'Senior Product Analyst',
  layout: 'ats-minimal',
  theme: 'navy',
  fontFamily: 'theme-default',
  fontScale: 1,
  spacing: 'standard',
  personalInfo: {
    fullName: 'Jordan Lee',
    email: 'jordan.lee@email.com',
    phone: '(555) 012-3456',
    location: 'Austin, TX',
    linkedin: 'linkedin.com/in/jordanlee',
    website: 'jordanlee.dev',
    photo: '',
    github: 'github.com/jordanlee',
  },
  summary:
    'Results-driven analyst with 5+ years turning messy data into decisions that moved the needle on retention and revenue.',
  experience: [
    {
      role: 'Senior Product Analyst',
      company: 'Northbeam Systems',
      location: 'Austin, TX',
      startDate: 'Jun 2022',
      endDate: '',
      current: true,
      description:
        'Led churn analysis that informed a pricing change, reducing churn 14%.\nBuilt a self-serve dashboard used by 40+ stakeholders weekly.',
    },
    {
      role: 'Data Analyst',
      company: 'Lumen Retail Co.',
      location: 'Remote',
      startDate: 'Jul 2019',
      endDate: 'May 2022',
      current: false,
      description:
        'Owned weekly reporting for the merchandising team.\nAutomated a manual reconciliation process, saving 6 hours/week.',
    },
  ],
  internships: [
    {
      role: 'Data Intern',
      company: 'Beacon Analytics',
      location: 'Remote',
      startDate: 'May 2018',
      endDate: 'Aug 2018',
      current: false,
      description: 'Cleaned and modeled survey data for a client-facing report.',
    },
  ],
  education: [
    {
      degree: 'B.S. in Statistics',
      institution: 'University of Texas at Austin',
      startDate: '2015',
      endDate: '2019',
      description: '',
    },
  ],
  projects: [
    {
      title: 'Open Retention Cohort Tool',
      description: 'Open-source cohort analysis tool used by three YC startups.',
      link: 'github.com/jordanlee/cohort-tool',
       technologies: 'Python, Pandas, PostgreSQL',
    },
  ],
  skills: [
    { name: 'SQL', category: 'Programming Languages', level: 'Expert' },
    { name: 'Python', category: 'Programming Languages', level: 'Advanced' },
    { name: 'Looker', category: 'Cloud', level: 'Advanced' },
    { name: 'Stakeholder Communication', category: 'Soft Skills', level: 'Expert' },
    { name: 'Spanish', category: 'Languages', level: 'Advanced' },
  ],

    languages: [
    { _id: 'l1', name: 'English', level: 'C1' },
    { _id: 'l2', name: 'Nepali', level: 'Native' },
    { _id: 'l3', name: 'Hindi', level: 'B2' },
  ],

  
  certifications: [{ name: 'Google Data Analytics', issuer: 'Google', year: '2021' }],
  achievements: [{ title: 'Spot Award for Q3 Churn Project', description: '', year: '2023' }],
  publications: [],
  trainings: [
    { title: 'Advanced SQL for Analysts', provider: 'DataCamp', startDate: '2021', endDate: '2021', description: '' },
  ],
  scholarships: [],
  positionsOfResponsibility: [],
  hobbies: ['Chess', 'Trail running'],
  references: [],
  volunteering: [
    {
      role: 'Weekend Mentor',
      organization: 'Code for Austin',
      location: 'Austin, TX',
      startDate: 'Jan 2021',
      endDate: '',
      current: true,
      description: 'Mentor early-career analysts transitioning into data roles.',
    },
  ],
  customSections: [],
  sectionOrder: [],
  hiddenSections: [],
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};