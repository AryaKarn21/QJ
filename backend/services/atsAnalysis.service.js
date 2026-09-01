// Deterministic, rule-based ATS (Applicant Tracking System) compatibility
// analyzer for a Resume document.
//
// Deliberately NOT AI/Gemini-backed: a scoring feature needs to be fast,
// free, available even when GEMINI_API_KEY isn't configured (see
// resumeAiController.js's friendlyAiError), and reproducible — the same
// resume should always get the same score. It checks structure/content
// completeness, not prose quality (that's what the existing
// generateProfessionalSummary/improveWorkExperience AI features are for).
//
// IMPORTANT — what this is and isn't: every real-world ATS parses résumés
// differently (Workday, Greenhouse, Taleo, iCIMS, ...), and none of them
// publish their exact parsing rules. This module estimates compatibility
// against well-established, common ATS pitfalls (missing sections, no
// contact info, content hidden in a photo-only header, absent keywords,
// unreadable walls of text). It can never guarantee a resume will pass any
// specific company's ATS — `DISCLAIMER` below is always surfaced to the
// user alongside the score so that's never implied.

const DISCLAIMER =
  "This is an estimated ATS-compatibility analysis based on common parsing pitfalls " +
  "(missing sections, contact info, keyword coverage, formatting risk). Every ATS " +
  "parses resumes differently and none publish their exact rules — a high score " +
  "improves your odds but can't guarantee any specific system will pass your resume.";

// Curated, non-exhaustive list of strong resume action verbs. Used only to
// nudge ("start bullets with an action verb"), never to hard-fail a resume —
// plenty of good resumes use verbs not on this list.
const ACTION_VERBS = new Set([
  "led", "built", "developed", "managed", "designed", "implemented", "created",
  "improved", "increased", "reduced", "launched", "coordinated", "analyzed",
  "delivered", "optimized", "streamlined", "automated", "achieved", "spearheaded",
  "directed", "executed", "established", "negotiated", "resolved", "trained",
  "mentored", "presented", "researched", "collaborated", "deployed", "architected",
  "migrated", "authored", "owned", "drove", "scaled", "initiated", "organized",
  "planned", "reviewed", "supervised", "generated", "reduced", "grew", "shipped",
  "engineered", "maintained", "supported", "resolved", "identified", "conducted",
]);

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "at",
  "by", "from", "as", "is", "are", "was", "were", "be", "been", "being", "this",
  "that", "it", "its", "into", "using", "used", "use", "via", "we", "our", "you",
  "your", "will", "shall", "can", "able", "including", "etc",
]);

const tokenize = (text) =>
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

const splitBullets = (description) =>
  (description || "")
    .split(/\r?\n|•|·/)
    .map((line) => line.trim())
    .filter(Boolean);

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

// One category's score, floor/ceilinged to [0,100] with 1 decimal max —
// keeps the API response tidy without pretending to more precision than
// this heuristic actually has.
const clampScore = (n) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));

function buildCategory(key, label, weight, score, status, findings) {
  return { key, label, weight, score: clampScore(score), status, findings };
}

function statusFor(score) {
  if (score >= 80) return "good";
  if (score >= 50) return "warning";
  return "critical";
}

// ── Category 1: Contact information ─────────────────────────────────────────
function scoreContactInfo(resume) {
  const p = resume.personalInfo || {};
  const findings = [];
  let score = 0;

  if (nonEmpty(p.fullName)) score += 25;
  else findings.push({ severity: "critical", message: "Add your full name — most ATS parsers use it as the primary candidate identifier." });

  if (nonEmpty(p.email)) score += 30;
  else findings.push({ severity: "critical", message: "Add an email address — resumes without one are frequently auto-rejected or unreachable." });

  if (nonEmpty(p.phone)) score += 25;
  else findings.push({ severity: "warning", message: "Add a phone number so recruiters have a second way to reach you." });

  if (nonEmpty(p.location)) score += 10;
  else findings.push({ severity: "tip", message: "Add a location (city, country) — many ATS filters search by location." });

  if (nonEmpty(p.linkedin) || nonEmpty(p.github) || nonEmpty(p.website)) score += 10;
  else findings.push({ severity: "tip", message: "Add a LinkedIn, GitHub, or portfolio link to strengthen your profile." });

  return buildCategory("contact", "Contact Information", 15, score, statusFor(score), findings);
}

// ── Category 2: Core section coverage ───────────────────────────────────────
function scoreCoreSections(resume) {
  const findings = [];
  let score = 0;

  const hasExperience = (resume.experience || []).some((e) => nonEmpty(e.role) || nonEmpty(e.description));
  const hasEducation = (resume.education || []).some((e) => nonEmpty(e.degree) || nonEmpty(e.institution));
  const hasSkills = (resume.skills || []).length >= 3;
  const hasProjectsOrCerts = (resume.projects || []).length > 0 || (resume.certifications || []).length > 0;
  const hasSummary = nonEmpty(resume.summary);

  if (hasExperience) score += 30;
  else findings.push({ severity: "critical", message: "Add at least one Experience entry — ATS systems and recruiters both expect this section." });

  if (hasEducation) score += 20;
  else findings.push({ severity: "warning", message: "Add an Education entry, even if it's your highest completed level of study." });

  if (hasSkills) score += 25;
  else findings.push({ severity: "critical", message: "List at least 3–5 relevant skills — ATS keyword matching relies heavily on this section." });

  if (hasProjectsOrCerts) score += 15;
  else findings.push({ severity: "tip", message: "Add a project or certification to show applied experience beyond job titles." });

  if (hasSummary) score += 10;
  else findings.push({ severity: "tip", message: "Add a 2–3 sentence professional summary — it helps both ATS keyword scans and human skimmers." });

  return buildCategory("sections", "Core Sections", 25, score, statusFor(score), findings);
}

// ── Category 3: Section structure & formatting risk ─────────────────────────
function scoreStructure(resume) {
  const findings = [];
  let score = 100;

  const hidden = new Set(resume.hiddenSections || []);
  const CRITICAL_SECTIONS = ["experience", "education", "skills"];
  const hiddenCritical = CRITICAL_SECTIONS.filter((s) => hidden.has(s));
  if (hiddenCritical.length > 0) {
    score -= hiddenCritical.length * 25;
    findings.push({
      severity: "critical",
      message: `${hiddenCritical.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ")} ${hiddenCritical.length > 1 ? "are" : "is"} currently hidden from this resume — hidden sections aren't shown or exported at all.`,
    });
  }

  if (!Array.isArray(resume.sectionOrder) || resume.sectionOrder.length === 0) {
    score -= 10;
    findings.push({ severity: "tip", message: "Section order isn't set — using the default order is fine, but double-check it in the editor." });
  }

  if (nonEmpty(resume.personalInfo?.photo)) {
    findings.push({
      severity: "tip",
      message: "A profile photo is set. Most ATS parsers ignore images entirely — make sure no contact/skill information exists ONLY inside the photo area, and consider a photo-free export for maximum-compatibility applications.",
    });
  }

  const isAtsLayout = typeof resume.layout === "string" && /ats/i.test(resume.layout);
  if (!isAtsLayout) {
    findings.push({
      severity: "tip",
      message: "This template isn't from the ATS-optimized category. Multi-column layouts and heavy graphics can confuse some parsers — use \"Download ATS-Safe PDF\" for applications submitted through an ATS.",
    });
  }

  // Hiding Experience/Education/Skills is unambiguously critical regardless
  // of what else scores well — override the generic score-derived status
  // rather than let a good score elsewhere dilute it back to "warning".
  const status = hiddenCritical.length > 0 ? "critical" : statusFor(clampScore(score));
  return buildCategory("structure", "Structure & Formatting Risk", 15, score, status, findings);
}

// ── Category 4: Experience content quality / readability ────────────────────
function scoreExperienceQuality(resume) {
  const findings = [];
  const experiences = (resume.experience || []).filter((e) => nonEmpty(e.role) || nonEmpty(e.description));

  if (experiences.length === 0) {
    return buildCategory("experienceQuality", "Experience Readability", 20, 0, "critical", [
      { severity: "critical", message: "No experience entries to analyze yet — add your work history first." },
    ]);
  }

  let bulletsChecked = 0;
  let bulletsWithVerb = 0;
  let bulletsTooShort = 0;
  let bulletsTooLong = 0;
  let entriesMissingDescription = 0;

  for (const exp of experiences) {
    if (!nonEmpty(exp.description)) {
      entriesMissingDescription += 1;
      continue;
    }
    const bullets = splitBullets(exp.description);
    for (const bullet of bullets) {
      bulletsChecked += 1;
      const words = bullet.split(/\s+/).filter(Boolean);
      const firstWord = (words[0] || "").toLowerCase().replace(/[^a-z]/g, "");
      if (ACTION_VERBS.has(firstWord)) bulletsWithVerb += 1;
      if (words.length < 4) bulletsTooShort += 1;
      if (words.length > 40) bulletsTooLong += 1;
    }
  }

  let score = 100;
  if (entriesMissingDescription > 0) {
    score -= entriesMissingDescription * 20;
    findings.push({
      severity: "warning",
      message: `${entriesMissingDescription} experience ${entriesMissingDescription > 1 ? "entries have" : "entry has"} no description — add 2–4 bullet points of measurable impact for each role.`,
    });
  }
  if (bulletsChecked > 0) {
    const verbRatio = bulletsWithVerb / bulletsChecked;
    if (verbRatio < 0.5) {
      score -= 20;
      findings.push({ severity: "warning", message: "Start more of your experience bullets with a strong action verb (e.g. \"Led\", \"Built\", \"Improved\") instead of \"Responsible for\" or \"Worked on\"." });
    }
    if (bulletsTooShort > 0) {
      score -= 10;
      findings.push({ severity: "tip", message: "Some bullet points are very short — expand them with what you did, how, and the measurable result." });
    }
    if (bulletsTooLong > 0) {
      score -= 10;
      findings.push({ severity: "tip", message: "Some bullet points are long, dense paragraphs — split them into shorter, scannable bullets (ideally under ~30 words each)." });
    }
  }

  return buildCategory("experienceQuality", "Experience Readability", 20, score, statusFor(clampScore(score)), findings);
}

// ── Category 5: Skills & keyword coverage ────────────────────────────────────
function scoreSkillsKeywords(resume) {
  const findings = [];
  const skills = resume.skills || [];
  let score = 0;

  if (skills.length >= 8) score += 60;
  else if (skills.length >= 5) score += 45;
  else if (skills.length >= 3) score += 25;
  else findings.push({ severity: "critical", message: "Add more skills — aim for at least 5–8 relevant, specific skills (not just generic soft skills)." });

  const categories = new Set(skills.map((s) => s.category).filter(Boolean));
  if (categories.size >= 2) score += 15;
  else if (skills.length > 0) findings.push({ severity: "tip", message: "Group skills into categories (e.g. Programming Languages, Tools) for easier scanning." });

  // Cross-check: do any skills actually show up in the experience/summary
  // text? A resume that lists "Python" as a skill but never mentions it in
  // any bullet reads as keyword-stuffing to both ATS relevance scoring and
  // a human reviewer.
  const bodyText = [
    resume.summary,
    ...(resume.experience || []).map((e) => e.description),
    ...(resume.projects || []).map((p) => `${p.title} ${p.description} ${p.technologies}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (skills.length > 0 && bodyText.trim().length > 0) {
    const mentioned = skills.filter((s) => nonEmpty(s.name) && bodyText.includes(s.name.toLowerCase()));
    const mentionRatio = mentioned.length / skills.length;
    if (mentionRatio >= 0.4) score += 25;
    else {
      score += Math.round(mentionRatio * 25);
      findings.push({
        severity: "tip",
        message: "Most listed skills never appear in your Experience/Projects text — mentioning key skills in context (not just as a list) improves keyword relevance.",
      });
    }
  } else if (skills.length > 0) {
    score += 10;
  }

  return buildCategory("skillsKeywords", "Skills & Keyword Coverage", 15, score, statusFor(clampScore(score)), findings);
}

// ── Category 6 (conditional): job-description / target-role relevance ──────
function scoreJdRelevance(resume, jobText) {
  const jdTokens = new Set(tokenize(jobText));
  if (jdTokens.size === 0) return null;

  const resumeText = [
    resume.summary,
    resume.targetRole,
    ...(resume.skills || []).map((s) => s.name),
    ...(resume.experience || []).map((e) => `${e.role} ${e.description}`),
    ...(resume.projects || []).map((p) => `${p.title} ${p.description} ${p.technologies}`),
  ]
    .filter(Boolean)
    .join(" ");
  const resumeTokens = new Set(tokenize(resumeText));

  const matched = [...jdTokens].filter((t) => resumeTokens.has(t));
  const missing = [...jdTokens].filter((t) => !resumeTokens.has(t)).slice(0, 15);
  const coverage = matched.length / jdTokens.size;
  const score = Math.round(coverage * 100);

  const findings = [];
  if (missing.length > 0) {
    findings.push({
      severity: score < 50 ? "critical" : "tip",
      message: `Consider naturally working these job-description keywords into your resume where truthful: ${missing.slice(0, 10).join(", ")}.`,
    });
  } else {
    findings.push({ severity: "tip", message: "Great keyword overlap with this job description." });
  }

  return {
    ...buildCategory("jdRelevance", "Job Description Match", 20, score, statusFor(score), findings),
    matchedKeywords: matched.sort(),
    missingKeywords: missing.sort(),
  };
}

/**
 * Analyze a Resume document (plain object or Mongoose doc/lean) for
 * estimated ATS compatibility. `jobText` is optional free text (a pasted
 * job description, or just `resume.targetRole` as a fallback) used only
 * for the keyword-relevance category — every other category is scored
 * purely from the resume's own content.
 */
function analyzeResumeAts(resume, jobText) {
  const categories = [
    scoreContactInfo(resume),
    scoreCoreSections(resume),
    scoreStructure(resume),
    scoreExperienceQuality(resume),
    scoreSkillsKeywords(resume),
  ];

  const jdCategory = scoreJdRelevance(resume, jobText || resume.targetRole);
  if (jdCategory) categories.push(jdCategory);

  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const overallScore = clampScore(
    categories.reduce((sum, c) => sum + (c.score * c.weight) / totalWeight, 0)
  );

  const suggestions = categories
    .flatMap((c) => c.findings.map((f) => ({ ...f, category: c.key })))
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, tip: 2 };
      return order[a.severity] - order[b.severity];
    });

  return {
    overallScore,
    status: statusFor(overallScore),
    disclaimer: DISCLAIMER,
    categories: categories.map(({ key, label, weight, score, status, findings }) => ({
      key,
      label,
      weight,
      score,
      status,
      findingCount: findings.length,
    })),
    suggestions,
    jdKeywords: jdCategory ? { matched: jdCategory.matchedKeywords, missing: jdCategory.missingKeywords } : null,
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = { analyzeResumeAts, DISCLAIMER };
