/**
 * Cover letter templates — plain, ATS-friendly HTML skeletons (no tables,
 * no colored blocks, no icons) that seed the react-quill editor. Each is a
 * function of the fields the applicant already has available at apply time
 * (job title/company/candidate name) — never invents experience, so the
 * placeholder body paragraph is deliberately generic and clearly marked for
 * the candidate to fill in or generate with AI.
 */

export interface TemplateSeedInput {
  jobTitle: string;
  companyName: string;
  candidateName: string;
}

export interface CoverLetterTemplate {
  id: string;
  label: string;
  description: string;
  build: (input: TemplateSeedInput) => string;
}

const closing = (name: string) => `<p>Thank you for considering my application.</p><p>Best regards,<br/>${name || '[Your Name]'}</p>`;

const subjectAndGreeting = (jobTitle: string, companyName: string) =>
  `<p>Subject: Application for ${jobTitle || '[Job Title]'}</p><p>Dear Hiring Manager${companyName ? ` at ${companyName}` : ''},</p>`;

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = [
  {
    id: 'professional',
    label: 'Professional',
    description: 'A clean, formal structure suitable for most roles.',
    build: ({ jobTitle, companyName, candidateName }) => `
${subjectAndGreeting(jobTitle, companyName)}
<p>I am writing to apply for the ${jobTitle || '[Job Title]'} position at ${companyName || '[Company Name]'}. [Introduce yourself and why you're a strong fit — use "Generate with AI" to draft this from your profile.]</p>
<p>[Second paragraph: relevant experience and skills for this role.]</p>
<p>[Third paragraph: why this company specifically interests you.]</p>
${closing(candidateName)}`.trim(),
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Slightly more conversational tone, still professional.',
    build: ({ jobTitle, companyName, candidateName }) => `
${subjectAndGreeting(jobTitle, companyName)}
<p>When I saw the ${jobTitle || '[Job Title]'} opening at ${companyName || '[Company Name]'}, I knew I had to apply. [Say what specifically excites you about this role.]</p>
<p>[Paragraph: your most relevant accomplishment or skill set.]</p>
<p>[Paragraph: what you'd bring to the team.]</p>
${closing(candidateName)}`.trim(),
  },
  {
    id: 'entry-level',
    label: 'Entry Level',
    description: 'For candidates early in their career, with limited work history.',
    build: ({ jobTitle, companyName, candidateName }) => `
${subjectAndGreeting(jobTitle, companyName)}
<p>I am excited to apply for the ${jobTitle || '[Job Title]'} position at ${companyName || '[Company Name]'}. As someone early in my career, I am eager to bring my skills and enthusiasm to your team. [Mention relevant coursework, projects, or internships.]</p>
<p>[Paragraph: transferable skills and eagerness to learn.]</p>
${closing(candidateName)}`.trim(),
  },
  {
    id: 'experienced',
    label: 'Experienced Professional',
    description: 'Leads with a track record for senior/experienced candidates.',
    build: ({ jobTitle, companyName, candidateName }) => `
${subjectAndGreeting(jobTitle, companyName)}
<p>With a proven track record in my field, I am writing to express my interest in the ${jobTitle || '[Job Title]'} position at ${companyName || '[Company Name]'}. [Summarize your most relevant experience and a key achievement.]</p>
<p>[Paragraph: specific accomplishments relevant to this role.]</p>
<p>[Paragraph: leadership or specialized expertise.]</p>
${closing(candidateName)}`.trim(),
  },
  {
    id: 'career-change',
    label: 'Career Change',
    description: 'Emphasizes transferable skills when switching fields.',
    build: ({ jobTitle, companyName, candidateName }) => `
${subjectAndGreeting(jobTitle, companyName)}
<p>I am writing to apply for the ${jobTitle || '[Job Title]'} position at ${companyName || '[Company Name]'}. While my background is in a different field, I have developed skills that translate directly to this role. [Explain the transition and relevant transferable skills.]</p>
<p>[Paragraph: why you're making this change and what draws you to this role/industry.]</p>
${closing(candidateName)}`.trim(),
  },
  {
    id: 'internship',
    label: 'Internship',
    description: 'For internship or co-op applications.',
    build: ({ jobTitle, companyName, candidateName }) => `
${subjectAndGreeting(jobTitle, companyName)}
<p>I am writing to apply for the ${jobTitle || '[Internship Title]'} internship at ${companyName || '[Company Name]'}. [Mention your field of study and what draws you to this opportunity.]</p>
<p>[Paragraph: relevant coursework, projects, or extracurriculars.]</p>
${closing(candidateName)}`.trim(),
  },
];

export const getTemplateById = (id: string): CoverLetterTemplate =>
  COVER_LETTER_TEMPLATES.find((t) => t.id === id) || COVER_LETTER_TEMPLATES[0];
