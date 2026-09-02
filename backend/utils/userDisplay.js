// Builds a small, consistent "who posted/commented/liked this" object from
// a raw User document (any role). Community controllers `.lean()` author
// lookups and pass the plain object here rather than each duplicating the
// per-role avatar-field logic that controllers/blogController.js already
// has to do (jobseeker.profilePic vs employer.companyLogo etc.).
function buildAuthorSnapshot(userDoc) {
  if (!userDoc) return null;

  const avatar =
    userDoc.role === "employer"
      ? userDoc.companyLogo || null
      : userDoc.profilePic || null;

  const headline =
    userDoc.role === "employer"
      ? userDoc.industryType || userDoc.headline || "Company"
      : userDoc.role === "recruiter"
      ? [userDoc.designation, userDoc.companyName].filter(Boolean).join(" at ") || "Recruiter"
      : userDoc.role === "mentor"
      ? [userDoc.currentRole, userDoc.currentCompany].filter(Boolean).join(" at ") || "Mentor"
      : userDoc.headline || "";

  return {
    _id: userDoc._id,
    name: userDoc.name,
    role: userDoc.role,
    avatar,
    headline,
    isVerified: !!userDoc.isVerified,
    // Additive fields for the Profile / Followers / Following pages —
    // every existing caller of buildAuthorSnapshot (post cards, comment
    // rows, mention search, etc.) keeps working unchanged since it just
    // reads the fields above; these are simply extra keys on the object.
    bio: userDoc.bio || "",
    socialLinks: userDoc.socialLinks || null,
    joinedAt: userDoc.createdAt || null,
    // `name` already IS the company name for employer accounts (see
    // Employer Profile page), so surface it explicitly under a role-
    // agnostic key the UI can check without re-deriving the convention.
    company: userDoc.role === "employer" ? userDoc.name : null,
    // Employer-only "About" fields — already exist on Employer.js, just
    // weren't surfaced through the public snapshot before. undefined for
    // non-employers, which JSON.stringify simply omits.
    ...(userDoc.role === "employer"
      ? {
          description: userDoc.description || "",
          website: userDoc.website || "",
          industryType: userDoc.industryType || "",
          companySize: userDoc.companySize || "",
          address: userDoc.address || "",
          establishedDate: userDoc.establishedDate || null,
          // Company Profile page fields (Phase 3) — same "already exists
          // on Employer.js, just wasn't surfaced through the public
          // snapshot before" as the fields above.
          coverPhoto: userDoc.coverPhoto || "",
          mission: userDoc.mission || "",
          culture: userDoc.culture || "",
          companyLocations: userDoc.companyLocations || [],
          companyBenefits: userDoc.companyBenefits || [],
        }
      : {}),
  };
}

module.exports = { buildAuthorSnapshot };