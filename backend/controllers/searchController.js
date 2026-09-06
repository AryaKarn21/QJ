const User = require("../models/User");
const {
  PUBLIC_PROFILE_FIELDS,
  attachCurrentCompany,
  escapeRegex,
} = require("./followController");
const { buildAuthorSnapshot } = require("../utils/userDisplay");

// General-purpose Community search (people + companies), generalizing the
// narrow, uncapped-pagination `searchMentionableUsers` typeahead
// (followController.js — built for the @mention composer, 8-20 result
// cap, name-only match) into a real paginated search results page. Reuses
// that same controller's exported PUBLIC_PROFILE_FIELDS/escapeRegex/
// attachCurrentCompany rather than redefining them, so "which fields are
// safe to show about another user" stays defined in exactly one place.

// Extends the shared allowlist with the fields a search RESULT card needs
// that the @mention typeahead never did (skills/experiences/qualifications
// for "React Developer"-style matching and display) — additive, and kept
// local to this controller so it doesn't change what any existing caller
// of PUBLIC_PROFILE_SELECT gets back.
const SEARCH_PROFILE_FIELDS = {
  ...PUBLIC_PROFILE_FIELDS,
  skills: 1,
  experiences: 1,
  qualifications: 1,
};
const SEARCH_PROFILE_SELECT = Object.keys(SEARCH_PROFILE_FIELDS).join(" ");

function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Shapes a raw (extended-select) User doc into what the search results UI
 * needs: buildAuthorSnapshot's existing fields plus skills/location, so
 * jobseeker/employer/recruiter/mentor cards can all render consistently.
 */
function buildSearchResult(userDoc) {
  const snapshot = buildAuthorSnapshot(userDoc);
  return {
    ...snapshot,
    skills: Array.isArray(userDoc.skills) ? userDoc.skills.slice(0, 12) : [],
    // Jobseeker/recruiter/mentor accounts have no dedicated `location`
    // field today (only Employer.address does) — surfaced under one
        // role-agnostic key so the frontend doesn't need role-specific logic,
    // simply empty for roles that don't have one yet.
    location: userDoc.role === "employer" ? userDoc.address || "" : "",
  };
}

// GET /api/community/search?q=&type=people|companies&skills=&location=&page=&limit=
const searchCommunity = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const type = req.query.type === "companies" ? "companies" : "people";
    const skillsFilter = (req.query.skills || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const location = (req.query.location || "").trim();
    const { page, limit, skip } = parsePagination(req);

    if (!q && skillsFilter.length === 0 && !location) {
      return res.json({ results: [], page, limit, total: 0, totalPages: 1 });
    }

    const roleFilter = type === "companies" ? "employer" : { $in: ["jobseeker", "employer", "recruiter", "mentor"] };
    const andClauses = [
      { role: roleFilter },
      { isActive: { $ne: false } },
      { _id: { $ne: req.user._id } },
    ];

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      andClauses.push({
        $or: [
          { name: regex },
          { headline: regex },
          { industryType: regex },
          { "experiences.jobPosition": regex },
          { skills: regex },
        ],
      });
    }
    if (skillsFilter.length > 0) {
      andClauses.push({ skills: { $in: skillsFilter.map((s) => new RegExp(`^${escapeRegex(s)}$`, "i")) } });
    }
    if (location) {
      andClauses.push({ address: new RegExp(escapeRegex(location), "i") });
    }

    const filter = { $and: andClauses };

    const [users, total] = await Promise.all([
      User.find(filter).select(SEARCH_PROFILE_SELECT).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    const withCompany = await attachCurrentCompany(users);
    const results = withCompany.map(buildSearchResult);

    res.json({
      results,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error("Error searching community:", error);
    res.status(500).json({ message: "Search failed. Please try again." });
  }
};

module.exports = { searchCommunity };
