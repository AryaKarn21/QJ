/**
 * Translation layer for resume field labels.
 *
 * Do NOT hardcode label strings inside template components. Instead, templates
 * should call `getLabel(key, languageMode)` (or the `useResumeLabels` hook)
 * so every template automatically supports English, Nepali, and
 * English+Nepali display without per-component changes.
 *
 * Adding a new language later (Hindi, Bengali, Arabic, Urdu, Tamil,
 * Malayalam, Sinhala, Filipino, Indonesian...) means adding one entry to
 * `SUPPORTED_LANGUAGES` and one column to `LABELS` below — no component
 * rewrites required.
 */

export type LanguageCode = 'en' | 'ne';
// Extend here, e.g. 'hi' | 'bn' | 'ar' | 'ur' | 'ta' | 'ml' | 'si' | 'fil' | 'id'

export type LanguageMode = LanguageCode | 'bilingual';
// 'bilingual' = show as "English / Nepali" per the spec's Step 4 option

export const SUPPORTED_LANGUAGES: { code: LanguageCode; labelEn: string; nativeLabel: string }[] = [
  { code: 'en', labelEn: 'English', nativeLabel: 'English' },
  { code: 'ne', labelEn: 'Nepali', nativeLabel: 'नेपाली' },
];

type LabelKey =
  | 'fullName' | 'photo' | 'dateOfBirth' | 'nationality' | 'passportNumber' | 'contactNumber'
  | 'jobPosition' | 'yearsOfExperience' | 'previousCompany' | 'country' | 'mainResponsibilities'
  | 'workExperience' | 'education' | 'skills' | 'languages' | 'certifications'
  | 'personalInformation' | 'workInformation';

const LABELS: Record<LabelKey, Record<LanguageCode, string>> = {
  fullName: { en: 'Full Name', ne: 'पूरा नाम' },
  photo: { en: 'Photo', ne: 'फोटो' },
  dateOfBirth: { en: 'Date of Birth', ne: 'जन्म मिति' },
  nationality: { en: 'Nationality', ne: 'राष्ट्रियता' },
  passportNumber: { en: 'Passport Number', ne: 'राहदानी नम्बर' },
  contactNumber: { en: 'Contact Number', ne: 'सम्पर्क नम्बर' },
  jobPosition: { en: 'Job Position', ne: 'पद' },
  yearsOfExperience: { en: 'Years of Experience', ne: 'अनुभवका वर्षहरू' },
  previousCompany: { en: 'Previous Company', ne: 'अघिल्लो कम्पनी' },
  country: { en: 'Country', ne: 'देश' },
  mainResponsibilities: { en: 'Main Responsibilities', ne: 'मुख्य जिम्मेवारीहरू' },
  workExperience: { en: 'Work Experience', ne: 'कार्य अनुभव' },
  education: { en: 'Education', ne: 'शैक्षिक योग्यता' },
  skills: { en: 'Skills', ne: 'सीप' },
  languages: { en: 'Languages', ne: 'भाषाहरू' },
  certifications: { en: 'Certifications', ne: 'प्रमाणपत्रहरू' },
  personalInformation: { en: 'Personal Information', ne: 'व्यक्तिगत जानकारी' },
  workInformation: { en: 'Work Information', ne: 'कार्य जानकारी' },
};

/** Returns the label for a field given the resume's language mode. */
export function getLabel(key: LabelKey, mode: LanguageMode): string {
  if (mode === 'bilingual') return `${LABELS[key].en} / ${LABELS[key].ne}`;
  return LABELS[key][mode] ?? LABELS[key].en;
}