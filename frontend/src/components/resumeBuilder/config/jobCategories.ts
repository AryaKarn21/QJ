import type { TemplateCategory } from '../templates/registry';

/**
 * Manpower/recruitment job categories.
 *
 * This file is intentionally separate from the backend's existing
 * `JobCategory` model (backend/models/JobCategory.js), which categorizes
 * job *listings* and is unrelated to this — don't mix the two up. This
 * file only exists on the frontend, as plain config, not a database model.
 *
 * This is also deliberately separate from `TemplateCategory` (registry.ts).
 * `TemplateCategory` groups *layout components* (ATS, Worker, Technology...).
 * `JobCategory` groups *what the candidate does* (Electrician, Driver, Cleaner...).
 *
 * Many JobCategories map to the same TemplateCategory ("Worker") because they
 * share the same simplified, low-literacy-friendly layout family — that's the
 * point of the layout × theme system in themePresets.ts: we don't need a
 * bespoke component per job title, just a sensible default template per job
 * category, which staff can still override in Step 2 of the builder.
 *
 * To add a new job category later: add one entry here. Nothing else in the
 * app needs to change — TemplateGallery, the category filter dropdown, and
 * the builder's Step 1 all read from this array.
 */

export interface JobCategory {
  /** Stable slug, used as the DB value and in URLs/filters. Never rename once in use — add a new id instead. */
  id: string;
  /** English label shown to staff. */
  labelEn: string;
  /** Nepali label shown to staff (falls back to English in the UI if missing). */
  labelNe: string;
  /** Default TemplateCategory to pre-select in Step 2 of the builder. */
  defaultTemplateCategory: TemplateCategory;
  /** Suggested selectable skill chips for this category (see SimpleSkillChip pattern, section 4 of spec). */
  suggestedSkills?: { en: string; ne: string }[];
}

export const JOB_CATEGORIES: JobCategory[] = [
  { id: 'construction-worker', labelEn: 'Construction Worker', labelNe: 'निर्माण कामदार', defaultTemplateCategory: 'Worker',
    suggestedSkills: [{ en: 'Scaffolding', ne: 'स्काफोल्डिङ' }, { en: 'Concrete Work', ne: 'कंक्रिट काम' }, { en: 'Site Safety', ne: 'साइट सुरक्षा' }] },
  { id: 'general-worker', labelEn: 'General Worker', labelNe: 'सामान्य कामदार', defaultTemplateCategory: 'Worker' },
  { id: 'factory-worker', labelEn: 'Factory Worker', labelNe: 'कारखाना कामदार', defaultTemplateCategory: 'Worker' },
  { id: 'cleaner', labelEn: 'Cleaner', labelNe: 'सरसफाइ कर्मचारी', defaultTemplateCategory: 'Worker' },
  { id: 'security-guard', labelEn: 'Security Guard', labelNe: 'सुरक्षा गार्ड', defaultTemplateCategory: 'Worker' },
  { id: 'driver', labelEn: 'Driver', labelNe: 'चालक', defaultTemplateCategory: 'Worker' },
  { id: 'heavy-vehicle-driver', labelEn: 'Heavy Vehicle Driver', labelNe: 'भारी सवारी चालक', defaultTemplateCategory: 'Worker' },
  { id: 'light-vehicle-driver', labelEn: 'Light Vehicle Driver', labelNe: 'हल्का सवारी चालक', defaultTemplateCategory: 'Worker' },
  { id: 'electrician', labelEn: 'Electrician', labelNe: 'इलेक्ट्रिशियन', defaultTemplateCategory: 'Worker',
    suggestedSkills: [{ en: 'Electrical Wiring', ne: 'विद्युतीय वायरिङ' }, { en: 'Panel Installation', ne: 'प्यानल जडान' }] },
  { id: 'plumber', labelEn: 'Plumber', labelNe: 'प्लम्बर', defaultTemplateCategory: 'Worker',
    suggestedSkills: [{ en: 'Pipe Installation', ne: 'पाइप जडान' }, { en: 'Leak Repair', ne: 'चुहावट मर्मत' }] },
  { id: 'welder', labelEn: 'Welder', labelNe: 'वेल्डर', defaultTemplateCategory: 'Worker',
    suggestedSkills: [{ en: 'Welding', ne: 'वेल्डिङ' }, { en: 'Metal Cutting', ne: 'धातु काट्ने' }] },
  { id: 'carpenter', labelEn: 'Carpenter', labelNe: 'सिकर्मी', defaultTemplateCategory: 'Worker' },
  { id: 'mason', labelEn: 'Mason', labelNe: 'राजमिस्त्री', defaultTemplateCategory: 'Worker' },
  { id: 'steel-fixer', labelEn: 'Steel Fixer', labelNe: 'स्टिल फिक्सर', defaultTemplateCategory: 'Worker' },
  { id: 'hvac-technician', labelEn: 'HVAC Technician', labelNe: 'एचभीएसी प्राविधिक', defaultTemplateCategory: 'Worker' },
  { id: 'mechanic', labelEn: 'Mechanic', labelNe: 'मेकानिक', defaultTemplateCategory: 'Worker' },
  { id: 'machine-operator', labelEn: 'Machine Operator', labelNe: 'मेसिन अपरेटर', defaultTemplateCategory: 'Worker',
    suggestedSkills: [{ en: 'Machine Operation', ne: 'मेसिन सञ्चालन' }] },
  { id: 'forklift-operator', labelEn: 'Forklift Operator', labelNe: 'फोर्कलिफ्ट अपरेटर', defaultTemplateCategory: 'Worker' },
  { id: 'warehouse-worker', labelEn: 'Warehouse Worker', labelNe: 'गोदाम कामदार', defaultTemplateCategory: 'Worker' },
  { id: 'helper', labelEn: 'Helper', labelNe: 'सहयोगी', defaultTemplateCategory: 'Worker' },
  { id: 'hotel-staff', labelEn: 'Hotel Staff', labelNe: 'होटल कर्मचारी', defaultTemplateCategory: 'Worker' },
  { id: 'restaurant-staff', labelEn: 'Restaurant Staff', labelNe: 'रेस्टुरेन्ट कर्मचारी', defaultTemplateCategory: 'Worker' },
  { id: 'waiter', labelEn: 'Waiter', labelNe: 'वेटर', defaultTemplateCategory: 'Worker' },
  { id: 'chef', labelEn: 'Chef', labelNe: 'रसोइयाँ', defaultTemplateCategory: 'Worker' },
  { id: 'kitchen-helper', labelEn: 'Kitchen Helper', labelNe: 'भान्सा सहयोगी', defaultTemplateCategory: 'Worker' },
  { id: 'housekeeping', labelEn: 'Housekeeping', labelNe: 'हाउसकिपिङ', defaultTemplateCategory: 'Worker' },
  { id: 'caregiver', labelEn: 'Caregiver', labelNe: 'हेरचाहकर्ता', defaultTemplateCategory: 'Worker' },
  { id: 'nurse', labelEn: 'Nurse', labelNe: 'नर्स', defaultTemplateCategory: 'Professional' },
  { id: 'technician', labelEn: 'Technician', labelNe: 'प्राविधिक', defaultTemplateCategory: 'Worker' },
  { id: 'engineer', labelEn: 'Engineer', labelNe: 'इन्जिनियर', defaultTemplateCategory: 'Professional' },
  { id: 'it-computer', labelEn: 'IT / Computer', labelNe: 'आईटी / कम्प्युटर', defaultTemplateCategory: 'Technology' },
  { id: 'office-staff', labelEn: 'Office Staff', labelNe: 'कार्यालय कर्मचारी', defaultTemplateCategory: 'Professional' },
  { id: 'accountant', labelEn: 'Accountant', labelNe: 'लेखापाल', defaultTemplateCategory: 'Professional' },
  { id: 'sales', labelEn: 'Sales', labelNe: 'बिक्री', defaultTemplateCategory: 'Professional' },
  { id: 'marketing', labelEn: 'Marketing', labelNe: 'मार्केटिङ', defaultTemplateCategory: 'Professional' },
  { id: 'supervisor', labelEn: 'Supervisor', labelNe: 'सुपरभाइजर', defaultTemplateCategory: 'Professional' },
  { id: 'manager', labelEn: 'Manager', labelNe: 'व्यवस्थापक', defaultTemplateCategory: 'Professional' },
  { id: 'agriculture-worker', labelEn: 'Agriculture Worker', labelNe: 'कृषि कामदार', defaultTemplateCategory: 'Worker' },
  { id: 'farm-worker', labelEn: 'Farm Worker', labelNe: 'फार्म कामदार', defaultTemplateCategory: 'Worker' },
  { id: 'gardener', labelEn: 'Gardener', labelNe: 'माली', defaultTemplateCategory: 'Worker' },
  { id: 'security-facility-management', labelEn: 'Security / Facility Management', labelNe: 'सुरक्षा / सुविधा व्यवस्थापन', defaultTemplateCategory: 'Professional' },
  { id: 'domestic-worker', labelEn: 'Domestic Worker', labelNe: 'घरेलु कामदार', defaultTemplateCategory: 'Worker' },
  { id: 'other', labelEn: 'Other', labelNe: 'अन्य', defaultTemplateCategory: 'Worker' },
];

export function getJobCategoryById(id: string): JobCategory | undefined {
  return JOB_CATEGORIES.find((c) => c.id === id);
}