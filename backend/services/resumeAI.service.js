/**
 * services/resumeAI.service.js
 *
 * Reusable service layer for AI Resume Builder features. Every function
 * here calls the existing shared Gemini client (utils/geminiClient.js —
 * the same one communityAiController.js uses) rather than creating a
 * second client instance. Controllers stay thin: they validate input,
 * call a function here, log usage, and respond.
 *
 * Phase 1 implements the Professional Summary Generator. Additional
 * resume AI features (Experience Generator, Project Description
 * Generator, Resume Review, ATS Optimization, Resume vs Job Match,
 * Cover Letter Generator, Interview Prep, Career Coach) should each get
 * their own function in this file, following the same shape:
 * build a prompt from real resume data, call the model, return clean text
 * or parsed JSON — never duplicate the getGeminiModel() call itself.
 */

const { getGeminiModel, extractJson } = require("../utils/geminiClient");
const { findOccupation } = require("../data/occupations");

/**
 * Builds a compact, factual context block from the parts of a resume
 * that are relevant to summary generation, so the model writes from the
 * person's actual experience/skills/education instead of inventing
 * generic filler.
 */
function buildResumeContext(resume) {
  const experienceLines = (resume.experience || [])
    .slice(0, 5)
    .map((e) => `- ${e.role || "Role"} at ${e.company || "Company"} (${e.startDate || "?"}–${e.current ? "Present" : e.endDate || "?"})`)
    .join("\n");

  const educationLines = (resume.education || [])
    .slice(0, 3)
    .map((e) => `- ${e.degree || "Degree"}, ${e.institution || "Institution"}`)
    .join("\n");

  const skillNames = (resume.skills || [])
    .map((s) => (typeof s === "string" ? s : s.name))
    .filter(Boolean)
    .slice(0, 20)
    .join(", ");

  return {
    experienceLines: experienceLines || "(no experience entries yet)",
    educationLines: educationLines || "(no education entries yet)",
    skillNames: skillNames || "(no skills listed yet)",
  };
}

const SUMMARY_ACTIONS = {
  generate: "Write a fresh professional summary from scratch based on the context below.",
  improve: "Rewrite the existing summary below to be more compelling, specific, and professional — keep the same core facts, don't invent new ones.",
  shorten: "Shorten the existing summary below to 1-2 tight sentences while keeping the strongest, most specific points.",
  expand: "Expand the existing summary below to 3-4 sentences, adding relevant detail drawn from the context (not invented facts).",
};

/**
 * Generates, improves, shortens, or expands a resume's professional
 * summary.
 *
 * @param {object} resume - the resume document (experience/education/skills read from it)
 * @param {"generate"|"improve"|"shorten"|"expand"} action
 * @param {string} [targetRole] - optional target role/persona, e.g. "Full Stack Developer", "Fresher"
 * @returns {Promise<string>} the generated summary text
 */
async function generateProfessionalSummary(resume, action, targetRole) {
  const instruction = SUMMARY_ACTIONS[action] || SUMMARY_ACTIONS.generate;
  const { experienceLines, educationLines, skillNames } = buildResumeContext(resume);
  const existingSummary = (resume.summary || "").trim();

  const model = getGeminiModel();
  const prompt = `
You are an expert resume writer. ${instruction}

Rules:
- 2nd person is wrong — write in 1st-person-implied resume style (no "I"), e.g. "Full-stack developer with 3 years..." not "I am a full-stack developer..."
- No clichés like "results-driven", "team player", "passionate professional" unless clearly backed by the context.
- Be concrete: mention real technologies/skills from the context below where relevant.
- Plain text only, no markdown, no bullet points, no quotes around the output.
- Keep it tight — this sits at the top of a resume, not a cover letter.
${targetRole ? `- Tailor tone/keywords toward this target role: "${targetRole}".` : ""}

Context — actual resume data (use it, don't contradict it):
Experience:
${experienceLines}

Education:
${educationLines}

Skills: ${skillNames}

${existingSummary ? `Existing summary to work from:\n"""${existingSummary}"""` : ""}

Return ONLY the summary text, nothing else — no preamble, no explanation.
`.trim();

  const result = await model.generateContent(prompt);
  return result.response.text().trim().replace(/^["']|["']$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────
// Occupation-aware suggestions (spec: sections 1–5, 9)
// Generates Profile, Skills (technical/tools/soft), Responsibilities,
// Keywords, optional Certifications/Languages for a given target job role.
// Uses the curated occupation database as a factual anchor when the role
// matches a known entry; falls back to pure Gemini generation (still
// constrained by the safety rules below) for any other role.
// ─────────────────────────────────────────────────────────────────────────

const LANGUAGE_STYLE_INSTRUCTIONS = {
  professional: "Use clear professional English suitable for a resume sent to an employer.",
  simple: "Use very simple, short sentences. Avoid difficult words. Someone with basic English reading ability should understand every sentence easily.",
};

/**
 * @param {string} targetRole - the job role text the user typed in, e.g. "Plumber"
 * @param {object} [context] - optional extra context the user already entered
 * @param {Array}  [context.experience] - existing experience entries (role/company/years/description)
 * @param {"professional"|"simple"} [languageStyle]
 * @returns {Promise<object>} { profile, skills: {technical, tools, soft}, responsibilities, keywords, certifications, languages }
 */
async function generateOccupationSuggestions(targetRole, context = {}, languageStyle = "professional") {
  if (!targetRole || !targetRole.trim()) {
    throw new Error("targetRole is required");
  }

  const occupation = findOccupation(targetRole);
  const styleInstruction = LANGUAGE_STYLE_INSTRUCTIONS[languageStyle] || LANGUAGE_STYLE_INSTRUCTIONS.professional;

  const experienceLines = (context.experience || [])
    .slice(0, 5)
    .map((e) => `- ${e.role || targetRole} at ${e.company || "(company not provided)"} (${e.startDate || "?"}–${e.current ? "Present" : e.endDate || "?"}): ${e.description || "(no description provided)"}`)
    .join("\n");

  const hasRealExperience = (context.experience || []).length > 0;

  const anchorBlock = occupation
    ? `
Known reference data for this occupation (use as a strong basis, adapt naturally, don't just copy verbatim):
Category: ${occupation.category}
Typical skills: ${occupation.skills.join(", ")}
Typical tools/equipment: ${occupation.tools.join(", ")}
Typical responsibilities: ${occupation.responsibilities.join("; ")}
Typical keywords: ${occupation.keywords.join(", ")}
Common certifications (only mention if user has them — see rules below): ${occupation.certifications.join(", ") || "none listed"}
`.trim()
    : `No reference data on file for "${targetRole}" — use your own knowledge of this occupation. Stay realistic and specific to the actual trade/role, not generic office skills.`;

  const model = getGeminiModel();
  const prompt = `
You are helping a manpower/recruitment agency build a resume for a worker whose target job role is: "${targetRole}".

${anchorBlock}

${hasRealExperience ? `The worker's actual work experience as entered by staff:\n${experienceLines}` : "The worker has not entered any work experience yet — treat them as a fresher/entry-level candidate for this role. Do not invent experience."}

Style instruction: ${styleInstruction}

CRITICAL SAFETY RULES — you MUST follow these:
- Never invent or assume specific years of experience, company names, employment dates, certifications, licenses, or degrees the user did not provide.
- If the worker has no experience entered, write the profile for a motivated beginner/fresher — do NOT claim they are "experienced" or "skilled" with specific years.
- Only include items in "certifications" or "languages" if they are realistic, commonly-held, non-fabricated possibilities for this role — the output must be clearly optional suggestions, not asserted facts. The frontend will let the user choose whether to add them.
- Do not overload with unnecessary soft skills — pick only the most relevant 2-4.

Generate a JSON object with this exact shape and nothing else (no markdown, no code fences, no explanation):
{
  "profile": "3-5 sentence professional profile summary, written in resume style (no 'I'), honest about experience level",
  "skills": {
    "technical": ["6-10 occupation-specific practical skills"],
    "tools": ["6-10 tools/equipment/materials/systems actually used in this occupation — NOT generic computer software unless the role is computer-based"],
    "soft": ["2-4 realistic soft skills relevant to this role, e.g. Teamwork, Reliability, Time Management, Problem Solving, Workplace Safety, Attention to Detail"]
  },
  "responsibilities": ["4-8 realistic day-to-day responsibilities for this role, written as resume bullet points starting with an action verb"],
  "keywords": ["6-10 short keywords/phrases recruiters would search for this role"],
  "certifications": ["0-3 OPTIONAL certifications commonly relevant to this role — clearly generic suggestions, not claims the worker holds them"],
  "languages": ["0-3 OPTIONAL languages commonly useful for this role/market, e.g. English, Hindi, Nepali, Arabic"]
}
`.trim();

  const result = await model.generateContent(prompt);
  const parsed = extractJson(result.response.text());

  return {
    ...parsed,
    _matchedOccupation: occupation ? occupation.jobTitle : null,
    _category: occupation ? occupation.category : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Improve a single work experience description (spec section 2)
// Rewrites into clean resume bullet language WITHOUT adding facts the user
// didn't provide — no invented companies, dates, tools, or achievements.
// ─────────────────────────────────────────────────────────────────────────

/**
 * @param {object} entry - { role, company, startDate, endDate, current, description }
 * @param {"professional"|"simple"} [languageStyle]
 * @returns {Promise<string[]>} array of improved bullet point strings
 */
async function improveWorkExperience(entry, languageStyle = "professional") {
  if (!entry || !entry.description || !entry.description.trim()) {
    throw new Error("An existing description is required to improve — nothing to work from.");
  }

  const styleInstruction = LANGUAGE_STYLE_INSTRUCTIONS[languageStyle] || LANGUAGE_STYLE_INSTRUCTIONS.professional;
  const model = getGeminiModel();

  const prompt = `
Rewrite the following work experience description into 3-6 clean, professional resume bullet points.

Role: ${entry.role || "(not specified)"}
Company: ${entry.company || "(not specified)"}

Original description written by the worker or staff:
"""
${entry.description.trim()}
"""

Style instruction: ${styleInstruction}

CRITICAL RULES:
- Only rephrase and organize what is ALREADY stated above. Do not add tools, achievements, metrics, dates, or responsibilities that are not mentioned or clearly implied by the original text.
- Each bullet should start with an action verb (Installed, Repaired, Operated, Assisted, Cleaned, Maintained, etc.).
- Keep it concrete and simple — no corporate jargon.

Return ONLY a JSON array of strings, nothing else. Example: ["Installed water supply pipes in residential buildings.", "Repaired leaking joints and damaged fittings."]
`.trim();

  const result = await model.generateContent(prompt);
  return extractJson(result.response.text());
}

// ─────────────────────────────────────────────────────────────────────────
// Translate resume field values (spec section 7)
// Translates a flat map of {fieldKey: text} into the target language while
// preserving the keys, so structured resume data is never destroyed by
// translation — only the string values change.
// ─────────────────────────────────────────────────────────────────────────

const SUPPORTED_TRANSLATION_LANGUAGES = ["English", "Nepali", "Hindi", "Bengali", "Urdu", "Arabic"];

/**
 * @param {Record<string,string|string[]>} fields - e.g. { profile: "...", skills: ["...", "..."] }
 * @param {string} targetLanguage - one of SUPPORTED_TRANSLATION_LANGUAGES
 * @returns {Promise<Record<string,string|string[]>>} same keys, translated values
 */
async function translateResumeFields(fields, targetLanguage) {
  if (!SUPPORTED_TRANSLATION_LANGUAGES.includes(targetLanguage)) {
    throw new Error(`Unsupported language: ${targetLanguage}. Supported: ${SUPPORTED_TRANSLATION_LANGUAGES.join(", ")}`);
  }
  if (!fields || Object.keys(fields).length === 0) {
    throw new Error("No fields provided to translate.");
  }

  const model = getGeminiModel();
  const prompt = `
Translate the values in this JSON object into ${targetLanguage}. Keep the exact same keys and the exact same structure (if a value is an array, return an array of the same length, translated item by item). Do not translate the keys. Do not add, remove, or reorder fields. Do not add explanations.

Input JSON:
${JSON.stringify(fields, null, 2)}

Return ONLY the translated JSON object, nothing else.
`.trim();

  const result = await model.generateContent(prompt);
  return extractJson(result.response.text());
}

module.exports = {
  generateProfessionalSummary,
  generateOccupationSuggestions,
  improveWorkExperience,
  translateResumeFields,
};