const Resume = require("../models/Resume");
const AiUsageLog = require("../models/AiUsageLog");
const {
  generateProfessionalSummary,
  generateOccupationSuggestions,
  improveWorkExperience,
  translateResumeFields,
} = require("../services/resumeAI.service");
const { analyzeResumeAts } = require("../services/atsAnalysis.service");
const { listCategories } = require("../data/occupations");
const { getGeminiModel } = require("../utils/geminiClient");

function logAiUsage(feature, userId) {
  AiUsageLog.create({ feature, action: "generated", user: userId || null }).catch((e) =>
    console.error(`Failed to log AI usage (${feature}):`, e.message)
  );
}

function friendlyAiError(res, error, fallbackMessage) {
  if (error.code === "GEMINI_NOT_CONFIGURED") {
    return res.status(503).json({
      message: "AI features aren't configured yet. Add GEMINI_API_KEY to the backend .env file.",
    });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
}

// POST /api/resumes/ai/:resumeId/summary
const generateSummary = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { action = "generate", targetRole } = req.body;

    if (!["generate", "improve", "shorten", "expand"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use generate, improve, shorten, or expand." });
    }

    const resume = await Resume.findById(resumeId).lean();
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    if (String(resume.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You don't have access to this resume." });
    }

    if (["improve", "shorten", "expand"].includes(action) && !resume.summary?.trim()) {
      return res.status(400).json({
        message: "There's no existing summary to work from yet — use 'generate' first.",
      });
    }

    const summary = await generateProfessionalSummary(resume, action, targetRole);
    logAiUsage("resume_summary", req.user?._id);
    res.json({ summary });
  } catch (error) {
    friendlyAiError(res, error, "Failed to generate summary.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/resumes/ai/:resumeId/autofill
// body: { rawInput: string, targetRole?: string }
// ─────────────────────────────────────────────────────────────────────────────
const autoFillResume = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { rawInput, targetRole } = req.body;

    if (!rawInput || rawInput.trim().length < 20) {
      return res.status(400).json({ message: "Please provide more information so AI can build your resume." });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    if (String(resume.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You don't have access to this resume." });
    }

    const model = getGeminiModel();

    const prompt = `
You are an expert resume writer and parser. A candidate has provided their background information in free-form text.
Your job is to convert this into a structured, professional resume JSON.

Candidate information:
"""
${rawInput.trim()}
"""

${targetRole ? `Target job role: "${targetRole}"` : ""}

Parse the information and return ONLY a valid JSON object matching this exact structure.
Do not include any explanation, markdown, or code fences — ONLY the raw JSON object.

Rules:
- Fill every field you can extract from the text.
- For summary: write a concise 2-3 sentence professional summary in resume style (no "I"), tailored to the target role if provided.
- For skills: extract all mentioned technologies, tools, and soft skills. Each skill needs name, category (one of: Programming Languages, Frameworks, Databases, Cloud, DevOps, AI/ML, Soft Skills, Languages, Other), and level (one of: Beginner, Intermediate, Advanced, Expert — estimate from context).
- For experience: extract each job separately. If dates aren't mentioned use empty string. Set current:true only for the most recent job if they said "currently" or "present".
- For education: extract all degrees/courses.
- For certifications: extract any mentioned certificates, licences, or courses completed.
- For projects: extract any mentioned projects with title and description.
- If a field has no information, use an empty array [] or empty string "".
- personalInfo.fullName, email, phone, location — extract if mentioned.

Return this exact JSON shape:
{
  "targetRole": "string",
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "website": "string"
  },
  "summary": "string",
  "experience": [
    {
      "role": "string",
      "company": "string",
      "location": "string",
      "startDate": "string",
      "endDate": "string",
      "current": false,
      "description": "string"
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "startDate": "string",
      "endDate": "string",
      "description": "string"
    }
  ],
  "skills": [
    {
      "name": "string",
      "category": "Other",
      "level": "Intermediate"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "year": "string"
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "link": ""
    }
  ]
}
`.trim();

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Gemini returned invalid JSON:", raw);
      return res.status(500).json({ message: "AI returned an unexpected format. Please try again." });
    }

    const updatableFields = [
      "targetRole", "personalInfo", "summary", "experience",
      "education", "skills", "certifications", "projects",
    ];

    for (const field of updatableFields) {
      if (parsed[field] !== undefined && parsed[field] !== null) {
        if (field === "personalInfo") {
          resume.personalInfo = { ...resume.personalInfo.toObject?.() ?? resume.personalInfo, ...parsed[field] };
        } else {
          resume[field] = parsed[field];
        }
      }
    }

    await resume.save();

    logAiUsage("resume_autofill", req.user?._id);
    res.json({ resume });
  } catch (error) {
    friendlyAiError(res, error, "Failed to auto-fill resume.");
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/resumes/ai/:resumeId/occupation-suggestions
// ─────────────────────────────────────────────────────────────────────────
const getOccupationSuggestions = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { targetRole, languageStyle = "professional" } = req.body;

    if (!targetRole || !targetRole.trim()) {
      return res.status(400).json({ message: "Please provide a target job role." });
    }
    if (!["professional", "simple"].includes(languageStyle)) {
      return res.status(400).json({ message: "languageStyle must be 'professional' or 'simple'." });
    }

    const resume = await Resume.findById(resumeId).lean();
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    if (String(resume.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You don't have access to this resume." });
    }

    const suggestions = await generateOccupationSuggestions(
      targetRole,
      { experience: resume.experience },
      languageStyle
    );

    logAiUsage("resume_occupation_suggestions", req.user?._id);
    res.json({ suggestions });
  } catch (error) {
    friendlyAiError(res, error, "Failed to generate occupation suggestions.");
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/resumes/ai/:resumeId/improve-experience
// ─────────────────────────────────────────────────────────────────────────
const improveExperienceEntry = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { experienceIndex, languageStyle = "professional" } = req.body;

    if (typeof experienceIndex !== "number") {
      return res.status(400).json({ message: "experienceIndex is required." });
    }

    const resume = await Resume.findById(resumeId).lean();
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    if (String(resume.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You don't have access to this resume." });
    }

    const entry = (resume.experience || [])[experienceIndex];
    if (!entry) {
      return res.status(404).json({ message: "That experience entry doesn't exist on this resume." });
    }

    const bullets = await improveWorkExperience(entry, languageStyle);
    logAiUsage("resume_improve_experience", req.user?._id);
    res.json({ bullets });
  } catch (error) {
    friendlyAiError(res, error, "Failed to improve experience description.");
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/resumes/ai/:resumeId/translate
// ─────────────────────────────────────────────────────────────────────────
const translateContent = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { targetLanguage, fields } = req.body;

    const resume = await Resume.findById(resumeId).lean();
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    if (String(resume.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You don't have access to this resume." });
    }

    const translated = await translateResumeFields(fields, targetLanguage);
    logAiUsage("resume_translate", req.user?._id);
    res.json({ translated });
  } catch (error) {
    friendlyAiError(res, error, "Failed to translate resume content.");
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/resumes/ai/occupation-categories
// ─────────────────────────────────────────────────────────────────────────
const getOccupationCategories = async (req, res) => {
  res.json({ categories: listCategories() });
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/resumes/ai/occupation-suggestions/preview
// body: { targetRole: string, experienceText?: string, languageStyle?: "professional"|"simple" }
// Usable BEFORE a resume exists yet — e.g. the AiResumeBuilder intake form.
// ─────────────────────────────────────────────────────────────────────────
const previewOccupationSuggestions = async (req, res) => {
  try {
    const { targetRole, experienceText = "", languageStyle = "professional" } = req.body;

    if (!targetRole || !targetRole.trim()) {
      return res.status(400).json({ message: "Please provide a target job role." });
    }
    if (!["professional", "simple"].includes(languageStyle)) {
      return res.status(400).json({ message: "languageStyle must be 'professional' or 'simple'." });
    }

    const context = experienceText.trim()
      ? { experience: [{ role: targetRole, description: experienceText.trim() }] }
      : {};

    const suggestions = await generateOccupationSuggestions(targetRole, context, languageStyle);

    logAiUsage("resume_occupation_suggestions_preview", req.user?._id);
    res.json({ suggestions });
  } catch (error) {
    friendlyAiError(res, error, "Failed to generate occupation suggestions.");
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/resumes/ai/improve-experience/preview
// body: { targetRole?: string, description: string, languageStyle?: "professional"|"simple" }
// ─────────────────────────────────────────────────────────────────────────
const previewImproveExperience = async (req, res) => {
  try {
    const { targetRole = "", description, languageStyle = "professional" } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Please describe your work experience first." });
    }

    const bullets = await improveWorkExperience({ role: targetRole, description }, languageStyle);
    logAiUsage("resume_improve_experience_preview", req.user?._id);
    res.json({ bullets });
  } catch (error) {
    friendlyAiError(res, error, "Failed to improve experience description.");
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/resumes/ai/:resumeId/ats-analysis?jobDescription=...
//
// Rule-based, NOT Gemini-backed (see atsAnalysis.service.js) — unlike every
// other handler in this file it never calls friendlyAiError/GEMINI_NOT_CONFIGURED
// because it has no AI dependency to be unconfigured. Always available.
// ─────────────────────────────────────────────────────────────────────────
const getAtsAnalysis = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const resume = await Resume.findById(resumeId).lean();
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    if (String(resume.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You don't have access to this resume." });
    }

    const jobDescription = typeof req.query.jobDescription === "string" ? req.query.jobDescription.slice(0, 5000) : "";
    const analysis = analyzeResumeAts(resume, jobDescription);
    res.json({ analysis });
  } catch (error) {
    console.error("Failed to run ATS analysis:", error);
    res.status(500).json({ message: "Failed to run ATS analysis." });
  }
};

module.exports = {
  generateSummary,
  autoFillResume,
  getOccupationSuggestions,
  improveExperienceEntry,
  translateContent,
  getOccupationCategories,
  previewOccupationSuggestions,
  previewImproveExperience,
  getAtsAnalysis,
};