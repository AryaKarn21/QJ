import type { Resume } from '../../resumeApi';

export interface ValidationField {
  id: string;
  label: string;
  isComplete: boolean;
  isRequired: boolean;
  errorMessage?: string;
}

export interface CVValidationResult {
  isValid: boolean;
  percentage: number;
  completedCount: number;
  totalRequiredCount: number;
  missingFields: string[];
  fields: ValidationField[];
}

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const isValidDateOfBirth = (dob: string): { valid: boolean; message?: string } => {
  if (!dob || !dob.trim()) {
    return { valid: false, message: 'Date of birth is required' };
  }

  // Support DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const raw = dob.trim();
  let parsedDate: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    parsedDate = new Date(raw);
  } else if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(raw)) {
    const parts = raw.split(/[/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    parsedDate = new Date(year, month, day);
  } else {
    parsedDate = new Date(raw);
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return { valid: false, message: 'Invalid date format. Use DD/MM/YYYY' };
  }

  const now = new Date();
  if (parsedDate > now) {
    return { valid: false, message: 'Date of birth cannot be in the future' };
  }

  return { valid: true };
};

export const validateCountryCV = (resume: Resume, templateHasPhoto: boolean = true): CVValidationResult => {
  const p = resume.personalInfo || ({} as any);
  const c = resume.countryCVInfo || {};

  const dobValidation = isValidDateOfBirth(c.dateOfBirth || '');
  const emailValid = Boolean(p.email && isValidEmail(p.email));
  const phoneValid = Boolean(p.phone && p.phone.trim().length >= 6);
  const fullNameValid = Boolean(p.fullName && p.fullName.trim().length >= 2);
  const targetRoleValid = Boolean((resume.targetRole && resume.targetRole.trim().length >= 2) || (resume.title && resume.title !== 'Untitled Resume'));
  const placeOfBirthValid = Boolean(c.placeOfBirth && c.placeOfBirth.trim().length >= 2);
  const nationalityValid = Boolean(c.nationality && c.nationality.trim().length >= 2);
  const genderValid = Boolean(c.gender && c.gender.trim().length >= 2);
  const addressValid = Boolean((c.address && c.address.trim().length >= 2) || (p.location && p.location.trim().length >= 2));
  const cityValid = Boolean(c.city && c.city.trim().length >= 2);
  const countryValid = Boolean(c.country && c.country.trim().length >= 2);
  const summaryValid = Boolean(resume.summary && resume.summary.trim().length >= 15);
  const photoValid = !templateHasPhoto || Boolean(p.photo && p.photo.trim().length > 0);
  
  const experienceValid = Boolean(resume.experience && resume.experience.length > 0 && resume.experience.some(e => e.company && e.title));
  const educationValid = Boolean(resume.education && resume.education.length > 0 && resume.education.some(ed => ed.institution || ed.degree));
  const languagesValid = Boolean(c.motherTongue && c.motherTongue.trim().length >= 2) || (Boolean(resume.languages && resume.languages.length > 0));
  const skillsValid = Boolean((resume.skills && resume.skills.length > 0) || (c.digitalSkills && c.digitalSkills.length > 0));

  const fields: ValidationField[] = [
    { id: 'fullName', label: 'Full Name', isRequired: true, isComplete: fullNameValid },
    { id: 'professionalTitle', label: 'Professional Title', isRequired: true, isComplete: targetRoleValid },
    { id: 'dateOfBirth', label: 'Date of Birth', isRequired: true, isComplete: dobValidation.valid, errorMessage: dobValidation.message },
    { id: 'placeOfBirth', label: 'Place of Birth', isRequired: true, isComplete: placeOfBirthValid },
    { id: 'nationality', label: 'Nationality', isRequired: true, isComplete: nationalityValid },
    { id: 'gender', label: 'Gender', isRequired: true, isComplete: genderValid },
    { id: 'phone', label: 'Phone Number', isRequired: true, isComplete: phoneValid },
    { id: 'email', label: 'Email', isRequired: true, isComplete: emailValid },
    { id: 'address', label: 'Address', isRequired: true, isComplete: addressValid },
    { id: 'city', label: 'City', isRequired: true, isComplete: cityValid },
    { id: 'country', label: 'Country', isRequired: true, isComplete: countryValid },
    { id: 'summary', label: 'About Me / Professional Summary', isRequired: true, isComplete: summaryValid },
    { id: 'workExperience', label: 'Work Experience', isRequired: true, isComplete: experienceValid },
    { id: 'education', label: 'Education & Training', isRequired: true, isComplete: educationValid },
    { id: 'languages', label: 'Language Skills (Mother Tongue)', isRequired: true, isComplete: languagesValid },
    { id: 'skills', label: 'Skills', isRequired: true, isComplete: skillsValid },
  ];

  if (templateHasPhoto) {
    fields.push({ id: 'photo', label: 'Profile Photo', isRequired: true, isComplete: photoValid });
  }

  // Driving license is explicitly optional — NOT in total required count, NOT in missing list
  const requiredFields = fields.filter((f) => f.isRequired);
  const completedCount = requiredFields.filter((f) => f.isComplete).length;
  const totalRequiredCount = requiredFields.length;
  const percentage = Math.round((completedCount / totalRequiredCount) * 100);
  const missingFields = requiredFields.filter((f) => !f.isComplete).map((f) => f.label);

  return {
    isValid: missingFields.length === 0,
    percentage,
    completedCount,
    totalRequiredCount,
    missingFields,
    fields,
  };
};
