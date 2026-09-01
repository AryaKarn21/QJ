const mongoose = require("mongoose");

const ExperienceSchema = new mongoose.Schema(
  {
    role: { type: String, default: "" },
    company: { type: String, default: "" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    location: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    current: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const EducationSchema = new mongoose.Schema(
  {
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    link: { type: String, default: "" },
     technologies: { type: String, default: "" }, // comma-separated, e.g. "React, Node, PostgreSQL" 
  },
  { _id: true }
);

const CertificationSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    issuer: { type: String, default: "" },
    year: { type: String, default: "" },
  },
  { _id: true }
);

const InternshipSchema = new mongoose.Schema(
  {
    role: { type: String, default: "" },
    company: { type: String, default: "" },
    location: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    current: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const TrainingSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    provider: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const AchievementSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    year: { type: String, default: "" },
  },
  { _id: true }
);

const PublicationSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    publisher: { type: String, default: "" },
    link: { type: String, default: "" },
    year: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const ScholarshipSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    institution: { type: String, default: "" },
    amount: { type: String, default: "" },
    year: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const PositionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    organization: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const ReferenceSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    relationship: { type: String, default: "" },
    company: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: true }
);

// Volunteer Experience — mirrors ExperienceSchema/InternshipSchema shape.
// Added alongside the section-wise layout system so "Volunteer Experience"
// has a real home instead of being crammed into experience[]/positionsOfResponsibility[].
const VolunteerSchema = new mongoose.Schema(
  {
    role: { type: String, default: "" },
    organization: { type: String, default: "" },
    location: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    current: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { _id: true }
);

// User-defined section (spec: "Custom Section" with title + content). One
// resume can have several; each participates in sectionOrder via the id
// `custom:<_id>` so it can be reordered/hidden exactly like a built-in section.
const CustomSectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    content: { type: String, default: "" },
  },
  { _id: true }
);

// Europass-style CEFR language proficiency — distinct from the generic
// skills[] "Languages" category (which uses Beginner/Intermediate/Advanced/
// Expert). This uses the real Common European Framework scale so the
// Europass-style template can show an authentic proficiency badge per
// language, same as the official Europass CV editor.
const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"];

const LanguageSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    level: { type: String, enum: LANGUAGE_LEVELS, default: "B1" },
  },
  { _id: true }
);


// Skills used to be a flat string array. They're now objects so a skill can
// carry a category + proficiency level. See backend/scripts/migrateResumeSkills.js
// for converting resumes created before this change.
const SKILL_CATEGORIES = [
  "Programming Languages",
  "Frameworks",
  "Databases",
  "Cloud",
  "DevOps",
  "AI/ML",
  "Soft Skills",
  "Languages",
  "Other",
];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

const SkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: SKILL_CATEGORIES, default: "Other" },
    level: { type: String, enum: SKILL_LEVELS, default: "Intermediate" },
  },
  { _id: true }
);

const ResumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Meta — lets a user keep several resumes (e.g. "Frontend role", "PM role")
    title: { type: String, default: "Untitled Resume", trim: true },
    targetRole: { type: String, default: "" },

    // Free-form template id (e.g. "ats-harvard", "pro-sidebar") — see the
    // frontend template registry for the full list. Not an enum: new
    // templates can be added there without a schema/migration change here.
    layout: { type: String, default: "ats-minimal" },
    theme: { type: String, default: "violet" },

    // Independent typography/density customization (spec: "Font
    // customization, Font size customization, Spacing customization") —
    // separate from `theme`, which only ever controlled color (+ one of 2
    // baked-in font pairings). All optional/string-or-number with sane
    // defaults so existing resumes render identically until a user
    // actively changes one. Free-form strings, not enums, matching the
    // `layout`/`theme` convention above — new presets can be added in
    // frontend/src/components/resumeBuilder/themePresets.ts without a
    // schema change here.
    fontFamily: { type: String, default: "theme-default" },
    // 0.85–1.15 — applied as a uniform zoom/scale on both the live
    // preview and the exported PDF (raster and ATS-safe text paths).
    fontScale: { type: Number, default: 1, min: 0.85, max: 1.15 },
    spacing: { type: String, enum: ["compact", "standard", "relaxed"], default: "standard" },

    // Manpower job category slug — see frontend/src/components/resumeBuilder/config/workerCategories.ts
    // for the full list. Named `workerCategoryId`, NOT `jobCategoryId`, to
    // avoid colliding with the existing `JobCategory` model (job-listing
    // categories, unrelated). Plain string, not a ref/enum, so new
    // categories can be added in workerCategories.ts without a migration here.
    // Optional so existing resumes are unaffected.
    workerCategoryId: { type: String, default: "" },

    // 'en' | 'ne' | 'bilingual' — see resumeI18n.ts. Defaults to 'en' so
    // existing resumes render exactly as before.
    languageMode: { type: String, enum: ["en", "ne", "bilingual"], default: "en" },

    // Simplified worker fields (spec: "Worker-Friendly Resume Templates").
    // Kept as a separate sub-object rather than overloading personalInfo/
    // experience, so the low-literacy quick-builder form can read/write
    // this alone without touching the detailed experience[]/education[]
    // arrays used by the full editor.
    workerInfo: {
      dateOfBirth: { type: String, default: "" },
      nationality: { type: String, default: "" },
      passportNumber: { type: String, default: "" },
      jobPosition: { type: String, default: "" },
      yearsOfExperience: { type: String, default: "" },
      previousCompany: { type: String, default: "" },
      country: { type: String, default: "" },
      mainResponsibilities: { type: String, default: "" },
      // Selectable skill chips (name only, no category/level) — distinct
      // from the detailed `skills` array below, for workers who can tick
      // boxes but shouldn't be asked to write descriptions.
      simpleSkills: [{ type: String }],
    },

    // Optional links into the existing CRM entities, so a resume can be
    // tied to who it's for and where it's going. All optional — set only
    // when the resume is created from a client/job context. `client` points
    // at the existing `Employer` model (there is no separate Client model
    // in this codebase); `job` points at the existing `Job` model. No
    // duplicate entities created.
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", default: null },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },

    // Content
    personalInfo: {
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      website: { type: String, default: "" },
      photo: { type: String, default: "" }, 
      // data URL or hosted image URL; optional
       github: { type: String, default: "" },
    },
    summary: { type: String, default: "" },
    experience: [ExperienceSchema],
    internships: [InternshipSchema],
    education: [EducationSchema],
    projects: [ProjectSchema],
    skills: [SkillSchema],
    certifications: [CertificationSchema],
    achievements: [AchievementSchema],
    publications: [PublicationSchema],
    trainings: [TrainingSchema],
    scholarships: [ScholarshipSchema],
    positionsOfResponsibility: [PositionSchema],
    hobbies: [{ type: String }],
    references: [ReferenceSchema],
    languages: [LanguageSchema],
    volunteering: [VolunteerSchema],
    // User-defined sections (title + free text). Each participates in
    // sectionOrder as `custom:<_id>`.
    customSections: [CustomSectionSchema],

    // Drives section order for the show/hide + reorder section system.
    // Section-wise layout system: order is this array; visibility is
    // "not present in hiddenSections". Both fields are purely additive —
    // resumes saved before this feature existed simply get `hiddenSections: []`
    // (nothing hidden) via the schema default, i.e. identical to today's
    // behavior. See frontend templates/shared/sections.ts for the single
    // shared function (getEffectiveSectionOrder) that normalizes this array
    // for resumes missing newer section ids (e.g. "volunteering").
    sectionOrder: {
      type: [String],
      default: [
        "summary",
        "experience",
        "internships",
        "volunteering",
        "education",
        "projects",
        "skills",
        "certifications",
        "achievements",
        "publications",
        "trainings",
        "scholarships",
        "positionsOfResponsibility",
        "hobbies",
        "references",
        "languages",
      ],
    },
    hiddenSections: { type: [String], default: [] },

    status: { type: String, enum: ["draft", "final"], default: "draft" },
  },
  { timestamps: true }
);

ResumeSchema.index({ user: 1, updatedAt: -1 });

const Resume = mongoose.model("Resume", ResumeSchema);
Resume.SKILL_CATEGORIES = SKILL_CATEGORIES;
Resume.SKILL_LEVELS = SKILL_LEVELS;
Resume.LANGUAGE_LEVELS = LANGUAGE_LEVELS;

module.exports = Resume;