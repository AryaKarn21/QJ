/**
 * services/coverLetterAI.service.js
 *
 * Cover Letter AI Assistant — follows the same shape as
 * resumeAI.service.js: build a factual context block from what the
 * request actually provided, never invent facts, call the existing
 * shared Gemini client (utils/geminiClient.js), return clean text.
 * Controllers stay thin (validate, call here, log usage, respond).
 */

const { getGeminiModel } = require("../utils/geminiClient");

// One prompt-instruction per action, same pattern as resumeAI.service.js's
// SUMMARY_ACTIONS map.
const ACTIONS = {
  generate: "Write a complete, original cover letter from scratch based on the context below.",
  improve: "Improve the existing cover letter below — sharpen the language, tighten weak sentences, and make it more compelling. Keep the same structure, tone, and every factual claim exactly as given.",
  rewrite: "Rewrite the existing cover letter below with fresh phrasing while preserving its structure and every fact — don't just reword a sentence at a time, restructure for better flow if it helps.",
  concise: "Make the existing cover letter below significantly more concise — cut filler, redundant phrases, and weak sentences. Preserve every factual claim and the overall structure (subject/greeting/body/closing).",
  professional: "Rewrite the existing cover letter below to sound more professional and polished, appropriate for a formal job application. Preserve every factual claim.",
  persuasive: "Rewrite the existing cover letter below to be more persuasive and confident, emphasizing the candidate's genuine strengths from the context — without exaggerating or inventing anything not already present.",
  grammar: "Fix grammar, spelling, and punctuation errors in the existing cover letter below. Do not change the meaning, tone, structure, or any facts — this is a proofreading pass only.",
  customize: "Rewrite the existing cover letter below to be more specifically tailored to this exact job and company — reference the job description's actual requirements where the candidate's real skills/experience genuinely match. Do not invent a match that isn't supported by the context.",
};

const VALID_ACTIONS = Object.keys(ACTIONS);

const TONE_INSTRUCTIONS = {
  professional: "Formal, polished, businesslike tone.",
  friendly: "Warm but still professional tone — approachable, not stiff.",
  confident: "Confident and direct tone, without sounding arrogant.",
  enthusiastic: "Genuinely enthusiastic tone about the role and company, grounded in real reasons from the context.",
};

/**
 * @param {object} input
 * @param {string} input.action - one of VALID_ACTIONS
 * @param {string} [input.jobTitle]
 * @param {string} [input.companyName]
 * @param {string} [input.jobDescription]
 * @param {string} [input.candidateProfile] - free-text summary of the candidate (headline/bio)
 * @param {string[]} [input.candidateSkills]
 * @param {string} [input.candidateExperience] - free-text summary of relevant experience
 * @param {string} [input.resumeText] - flattened text from the candidate's resume, if available
 * @param {string} [input.tone] - one of TONE_INSTRUCTIONS' keys
 * @param {string} [input.existingCoverLetter] - required for every action except "generate"
 * @param {string} [input.candidateName]
 * @returns {Promise<string>} the generated/edited cover letter, plain text
 */
async function runCoverLetterAction(input) {
  const {
    action,
    jobTitle,
    companyName,
    jobDescription,
    candidateProfile,
    candidateSkills,
    candidateExperience,
    resumeText,
    tone,
    existingCoverLetter,
    candidateName,
  } = input;

  if (!VALID_ACTIONS.includes(action)) {
    const err = new Error(`Invalid action. Use one of: ${VALID_ACTIONS.join(", ")}.`);
    err.status = 400;
    throw err;
  }

  const needsExisting = action !== "generate";
  if (needsExisting && !(existingCoverLetter || "").trim()) {
    const err = new Error("There's no existing cover letter to work from yet — use 'generate' first.");
    err.status = 400;
    throw err;
  }

  const skillsLine = Array.isArray(candidateSkills) && candidateSkills.length
    ? candidateSkills.slice(0, 25).join(", ")
    : "(no skills listed)";

  const contextBlock = `
Job title applying for: ${jobTitle || "(not provided)"}
Company: ${companyName || "(not provided)"}
Job description (excerpt): ${jobDescription ? jobDescription.slice(0, 2000) : "(not provided)"}

Candidate name: ${candidateName || "(not provided)"}
Candidate profile/headline: ${candidateProfile || "(not provided)"}
Candidate skills: ${skillsLine}
Candidate experience summary: ${candidateExperience || "(not provided)"}
${resumeText ? `Candidate resume excerpt:\n${resumeText.slice(0, 3000)}` : ""}
`.trim();

  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const instruction = ACTIONS[action];

  const model = getGeminiModel();
  const prompt = `
You are an expert career writer helping a job seeker with their cover letter.

${instruction}

Tone: ${toneInstruction}

CRITICAL SAFETY RULES — you MUST follow these exactly:
- NEVER invent candidate experience, employers, job titles, degrees, certifications, achievements, dates, or skills that are not present in the context below or in the existing letter.
- If information needed to make a specific claim is missing from the context, write naturally and generically instead of fabricating specifics (e.g. say "my relevant experience" rather than inventing a company name or number of years).
- Do not invent facts about the company beyond what's given in the job description/company name.
- Keep the letter to roughly 250-400 words unless the "concise" action was requested (then shorter).
- Format as a real cover letter: a "Subject: Application for [Job Title]" line, a greeting ("Dear Hiring Manager," or the company name if no specific person is known), 2-4 body paragraphs, and a closing ("Best regards," followed by the candidate's name if known).
- Plain text only — no markdown formatting, no asterisks, no bullet points, no code fences.

Context (factual — use only what's here, don't contradict it):
${contextBlock}

${existingCoverLetter ? `Existing cover letter to work from:\n"""\n${existingCoverLetter.slice(0, 6000)}\n"""` : ""}

Return ONLY the cover letter text, nothing else — no preamble, no explanation, no notes about what you changed.
`.trim();

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { runCoverLetterAction, VALID_ACTIONS };
