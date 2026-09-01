const mongoose = require("mongoose");

// Shared enums/validation for the QuickJobs career-status system (the
// "Open to Work"/"Hiring"-equivalent feature, using QuickJobs' own
// terminology — see the Jobseeker.js/Employer.js `profileStatus` field
// this backs). Centralized here so the Mongoose schemas, the two
// role-specific controllers, and any future consumer (search filters,
// admin tooling) all validate against exactly the same allow-lists —
// never duplicate these arrays.
const JOBSEEKER_STATUSES = [
  "OPEN_TO_OPPORTUNITIES",
  "ACTIVELY_SEEKING",
  "AVAILABLE_FOR_OFFERS",
  "NOT_CURRENTLY_LOOKING",
];

const EMPLOYER_STATUSES = [
  "ACTIVELY_HIRING",
  "RECRUITING_CANDIDATES",
  "OPEN_TO_APPLICANTS",
  "NOT_CURRENTLY_HIRING",
];

// "Not currently looking/hiring" is the deliberately inert default — new
// accounts and pre-existing accounts backfilled by the migration both land
// here, never on an "actively looking/hiring" state the user never chose
// (see backfillProfileStatus.js and section 12 of the spec this
// implements: "Do not automatically claim users are looking for work/
// hiring unless they explicitly select it").
const JOBSEEKER_DEFAULT_STATUS = "NOT_CURRENTLY_LOOKING";
const EMPLOYER_DEFAULT_STATUS = "NOT_CURRENTLY_HIRING";

const VISIBILITY_OPTIONS = ["public", "network", "private"];
const DEFAULT_VISIBILITY = "public";

const MAX_LIST_ITEMS = 10;
const MAX_ITEM_LENGTH = 60;

// Applied server-side to targetRoles/preferredLocations/employmentTypes on
// every save — never trust an array's length or contents from the client.
// Trims, drops empties/duplicates, and caps both the count and the length
// of each entry so a crafted payload can't stuff an unbounded array (or a
// multi-KB single "role") into the document.
function sanitizeStringList(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().slice(0, MAX_ITEM_LENGTH);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

// Jobseeker.js and Employer.js need the identical shape (same field names,
// same sub-document behavior) with only the `status` enum/default and
// `statusType` literal differing — a factory keeps that shape defined once
// instead of hand-copied into both discriminator schemas.
function buildProfileStatusField(statusType, statusEnum, defaultStatus) {
  return {
    // A plain-object nested-path shorthand still gets Mongoose's automatic
    // `_id` (it's treated as a single embedded subdocument) unless it's an
    // explicit Schema with `_id: false` — this is one object per user, not
    // an array element, so it doesn't need its own identity.
    type: new mongoose.Schema(
      {
        statusType: { type: String, enum: [statusType], default: statusType },
        status: { type: String, enum: statusEnum, default: defaultStatus },
        targetRoles: { type: [String], default: [] },
        preferredLocations: { type: [String], default: [] },
        employmentTypes: { type: [String], default: [] },
        visibility: { type: String, enum: VISIBILITY_OPTIONS, default: DEFAULT_VISIBILITY },
        // Deliberately null (not defaulted to the creation date) until the
        // user actually saves a status themselves — the frontend badge
        // uses "updatedAt is null" as its "you haven't set this yet"
        // signal (see ProfileStatusBadge.tsx), which a Date.now()-on-
        // create default would erase for every brand-new account.
        updatedAt: { type: Date, default: null },
      },
      { _id: false }
    ),
    default: () => ({
      statusType,
      status: defaultStatus,
      targetRoles: [],
      preferredLocations: [],
      employmentTypes: [],
      visibility: DEFAULT_VISIBILITY,
      updatedAt: null,
    }),
  };
}

module.exports = {
  JOBSEEKER_STATUSES,
  EMPLOYER_STATUSES,
  JOBSEEKER_DEFAULT_STATUS,
  EMPLOYER_DEFAULT_STATUS,
  VISIBILITY_OPTIONS,
  DEFAULT_VISIBILITY,
  MAX_LIST_ITEMS,
  MAX_ITEM_LENGTH,
  sanitizeStringList,
  buildProfileStatusField,
};
