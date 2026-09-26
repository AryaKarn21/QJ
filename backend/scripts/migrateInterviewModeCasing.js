// One-off maintenance script: collapses the legacy lowercase
// Application.interview.mode values ("video"/"phone"/"in-person") into
// their canonical, current-enum casing ("Video Call"/"Phone Call"/
// "In-Person") so the enum can be tightened to just the 3 canonical
// values without rejecting existing documents.
//
// Run this BEFORE deploying the schema change that removes the lowercase
// variants from Application.js's interview.mode enum.
//
// Safe to re-run any number of times — matches only the lowercase values,
// so a second run finds nothing left to update.
//
// Usage: node scripts/migrateInterviewModeCasing.js
require("dotenv").config();
const mongoose = require("mongoose");
const Application = require("../models/Application");

const CASING_MAP = {
  video: "Video Call",
  phone: "Phone Call",
  "in-person": "In-Person",
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Migrating interview.mode casing...");

  let totalModified = 0;
  for (const [legacyValue, canonicalValue] of Object.entries(CASING_MAP)) {
    const result = await Application.updateMany(
      { "interview.mode": legacyValue },
      { $set: { "interview.mode": canonicalValue } }
    );
    console.log(`  "${legacyValue}" -> "${canonicalValue}": ${result.modifiedCount} document(s)`);
    totalModified += result.modifiedCount;
  }

  console.log(`Done. ${totalModified} document(s) updated.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
