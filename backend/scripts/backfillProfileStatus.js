// One-off migration: seeds `profileStatus` on every existing Jobseeker/
// Employer document that doesn't have one yet (accounts created before
// this feature shipped — brand-new accounts get it automatically from
// the schema default in Jobseeker.js/Employer.js).
//
// Every backfilled user lands on the deliberately inert default —
// NOT_CURRENTLY_LOOKING / NOT_CURRENTLY_HIRING — never on an "actively
// looking/hiring" state nobody chose. See utils/profileStatus.js.
//
// Safe to re-run any number of times: the `profileStatus: { $exists: false }`
// filter means an account that already has a status (backfilled or
// user-set) is never touched again.
//
// Usage: node scripts/backfillProfileStatus.js
require("dotenv").config();
const mongoose = require("mongoose");
const Jobseeker = require("../models/Jobseeker");
const Employer = require("../models/Employer");
const {
  JOBSEEKER_DEFAULT_STATUS,
  EMPLOYER_DEFAULT_STATUS,
} = require("../utils/profileStatus");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Backfilling profileStatus for existing users...");

  const defaultStatus = (statusType, status) => ({
    statusType,
    status,
    targetRoles: [],
    preferredLocations: [],
    employmentTypes: [],
    visibility: "public",
    updatedAt: null,
  });

  const jobseekerResult = await Jobseeker.updateMany(
    { profileStatus: { $exists: false } },
    { $set: { profileStatus: defaultStatus("JOB_SEEKER", JOBSEEKER_DEFAULT_STATUS) } }
  );
  console.log(`Jobseekers updated: ${jobseekerResult.modifiedCount}`);

  const employerResult = await Employer.updateMany(
    { profileStatus: { $exists: false } },
    { $set: { profileStatus: defaultStatus("EMPLOYER", EMPLOYER_DEFAULT_STATUS) } }
  );
  console.log(`Employers updated: ${employerResult.modifiedCount}`);

  console.log("Done.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
