const mongoose = require("mongoose");
const Post = require("../models/Post");
const Job = require("../models/Job");
const Jobseeker = require("../models/Jobseeker");
const AiUsageLog = require("../models/AiUsageLog");
const { getGeminiModel, extractJson } = require("../utils/geminiClient");
const { moderateText, detectHiringIntentHeuristic } = require("../utils/aiModeration");

// Best-effort usage logging, reusing the same AiUsageLog collection the
// resume builder already writes to (controllers/aiUsageController.js) so
// all AI feature usage shows up in one admin dashboard rather than a
// second, community-only log table.
function logAiUsage(feature, userId) {
  AiUsageLog.create({ feature, action: "generated", user: userId || null }).catch((e) =>
    console.error(`Failed to log AI usage (${feature}):`, e.message)
  );
}

function friendlyAiError(res, error, fallbackMessage) {
  if (error.code === "GEMINI_NOT_CONFIGURED") {
    return res.status(503).json({ message: "AI features aren't configured yet. Add GEMINI_API_KEY to the backend .env file." });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
}

// --- Caption generation ---------------------------------------------------
// Turns a rough idea ("landed a new job at X", "sharing interview tips")
// into a polished, ready-to-post caption in the requested tone.
const generateCaption = async (req, res) => {
  try {
    const { topic, tone = "professional", postType = "text" } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: "Describe what you want to post about first." });
    }

    const model = getGeminiModel();
    const prompt = `
You are writing a short social post for a professional careers/recruitment
community (similar to LinkedIn). Write a ${tone} caption for a "${postType}"
post about: "${topic.trim()}"

Rules:
- 2-5 short paragraphs max, or fewer for a punchy update.
- Include 2-4 relevant hashtags at the end, written as plain #hashtag words.
- No markdown formatting, no emoji overuse (0-2 max).
- Sound like a real professional wrote it, not an ad.

Return ONLY the caption text, nothing else.
`.trim();

    const result = await model.generateContent(prompt);
    const caption = result.response.text().trim();

    logAiUsage("community_caption", req.user?._id);
    res.json({ caption });
  } catch (error) {
    friendlyAiError(res, error, "Failed to generate caption.");
  }
};

// --- Grammar correction ---------------------------------------------------
const correctGrammar = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Provide text to correct." });
    }

    const model = getGeminiModel();
    const prompt = `
Correct grammar, spelling, and punctuation in the text below. Preserve the
author's tone, meaning, hashtags, and any @[Name](id) mention tokens
EXACTLY as written (never alter what's inside the mention token). Do not
rewrite the message's substance or make it longer than necessary.

Return ONLY raw JSON, no markdown fences, in this exact shape:
{"corrected": string, "changed": boolean}

Text:
"""${text.slice(0, 4000)}"""
`.trim();

    const result = await model.generateContent(prompt);
    const parsed = extractJson(result.response.text());

    logAiUsage("community_grammar", req.user?._id);
    res.json({ corrected: parsed.corrected ?? text, changed: !!parsed.changed });
  } catch (error) {
    friendlyAiError(res, error, "Failed to correct grammar.");
  }
};

// --- Post summarization ---------------------------------------------------
// Summarizes a long post (or an arbitrary block of text) into 1-2
// sentences — used for the "TL;DR" affordance on long posts, and can
// optionally persist the result onto the Post so it's cached for every
// other viewer instead of re-generating per pageview.
const summarizePost = async (req, res) => {
  try {
    const { postId, text } = req.body;
    let contentToSummarize = text;
    let post = null;

    if (postId) {
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: "Invalid post id." });
      }
      post = await Post.findById(postId);
      if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });

      if (post.aiSummary) {
        return res.json({ summary: post.aiSummary, cached: true });
      }
      contentToSummarize = post.content;
    }

    if (!contentToSummarize || !contentToSummarize.trim()) {
      return res.status(400).json({ message: "Nothing to summarize." });
    }

    const model = getGeminiModel();
    const prompt = `
Summarize the following professional community post in 1-2 concise
sentences, written in third person, capturing only the key point (e.g. the
job/company/skill/advice mentioned). No preamble.

Text:
"""${contentToSummarize.slice(0, 6000)}"""
`.trim();

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    if (post) {
      post.aiSummary = summary.slice(0, 600);
      post.aiSummaryGeneratedAt = new Date();
      await post.save();
    }

    logAiUsage("community_summary", req.user?._id);
    res.json({ summary, cached: false });
  } catch (error) {
    friendlyAiError(res, error, "Failed to summarize post.");
  }
};

// --- Content moderation (manual/on-demand check) --------------------------
// The automatic check already runs on every create/edit (utils/aiModeration.js);
// this endpoint exposes the same check directly so the composer can warn a
// user BEFORE they submit, instead of only after.
const checkModeration = async (req, res) => {
  try {
    const { text } = req.body;
    const result = await moderateText(text || "");
    res.json(result);
  } catch (error) {
    friendlyAiError(res, error, "Failed to run moderation check.");
  }
};

// --- Hiring detection -------------------------------------------------
// Confirms (via AI, backed by a keyword heuristic that always runs even
// without GEMINI_API_KEY) whether a piece of text reads like a hiring
// announcement, so the composer can prompt "Post this as a Hiring post
// instead?" before submission.
const detectHiringIntent = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.json({ isHiring: false, confidence: 0, suggestedRoles: [] });
    }

    const heuristicMatch = detectHiringIntentHeuristic(text);

    try {
      const model = getGeminiModel();
      const prompt = `
Does the following post read like a job-hiring announcement (a company or
recruiter announcing open roles), as opposed to a regular career update or
opinion? If yes, extract any role titles mentioned.

Return ONLY raw JSON, no markdown fences:
{"isHiring": boolean, "confidence": number (0-1), "suggestedRoles": string[]}

Text:
"""${text.slice(0, 3000)}"""
`.trim();
      const result = await model.generateContent(prompt);
      const parsed = extractJson(result.response.text());

      logAiUsage("community_hiring_detect", req.user?._id);
      return res.json({
        isHiring: !!parsed.isHiring || heuristicMatch,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : heuristicMatch ? 0.6 : 0,
        suggestedRoles: Array.isArray(parsed.suggestedRoles) ? parsed.suggestedRoles.slice(0, 10) : [],
      });
    } catch (aiError) {
      // AI not configured/failed — fall back to the always-available
      // keyword heuristic rather than erroring the whole request out.
      return res.json({ isHiring: heuristicMatch, confidence: heuristicMatch ? 0.5 : 0, suggestedRoles: [] });
    }
  } catch (error) {
    friendlyAiError(res, error, "Failed to analyze text.");
  }
};

// --- Job recommendations ---------------------------------------------------
// Hybrid approach: first narrow to candidate jobs with a fast DB query on
// skill/category overlap (works with zero AI configuration), then, if
// Gemini is available, ask it to rank and explain the top matches in
// plain language. Always returns a usable list either way.
const getJobRecommendations = async (req, res) => {
  try {
    const jobseeker = await Jobseeker.findById(req.user._id).lean();
    const skills = (jobseeker?.skills || []).filter(Boolean);

    const candidateQuery = {
      status: "Active",
      deadline: { $gte: new Date() },
    };
    if (skills.length) {
      const skillRegexes = skills.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      candidateQuery.$or = [{ title: { $in: skillRegexes } }, { jobcategory: { $in: skillRegexes } }, { description: { $in: skillRegexes } }];
    }

    const candidates = await Job.find(candidateQuery).sort({ createdAt: -1 }).limit(20).lean();

    if (candidates.length === 0) {
      return res.json({ recommendations: [], reason: skills.length ? "No open matches for your current skills right now." : "Add skills to your profile for personalized recommendations." });
    }

    let ranked = candidates.slice(0, 8).map((job) => ({ job, reason: skills.length ? `Matches your listed skills.` : "Recently posted." }));

    if (skills.length) {
      try {
        const model = getGeminiModel();
        const prompt = `
A job seeker has these skills: ${skills.join(", ")}.
Here are candidate job postings (id, title, category):
${candidates.map((j, i) => `${i}. id=${j._id} title="${j.title}" category="${j.jobcategory}"`).join("\n")}

Pick the best 5 matches for this job seeker and briefly explain each match
in one short sentence.

Return ONLY raw JSON, no markdown fences:
{"matches": [{"id": string, "reason": string}]}
`.trim();
        const result = await model.generateContent(prompt);
        const parsed = extractJson(result.response.text());
        const jobMap = new Map(candidates.map((j) => [String(j._id), j]));

        const aiRanked = (parsed.matches || [])
          .map((m) => (jobMap.has(m.id) ? { job: jobMap.get(m.id), reason: m.reason } : null))
          .filter(Boolean);

        if (aiRanked.length) ranked = aiRanked;
        logAiUsage("community_job_recs", req.user?._id);
      } catch (aiError) {
        // Fall back silently to the skill-matched list computed above.
      }
    }

    res.json({ recommendations: ranked });
  } catch (error) {
    console.error("Error generating job recommendations:", error);
    res.status(500).json({ message: "Failed to load job recommendations." });
  }
};

module.exports = {
  generateCaption,
  correctGrammar,
  summarizePost,
  checkModeration,
  detectHiringIntent,
  getJobRecommendations,
};
