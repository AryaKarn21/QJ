// One-off maintenance script: removes jobs whose `employer` field
// references a User document that no longer exists.
//
// These jobs can never show a real company name — GET /api/jobs
// populates `employer` from that User id, which comes back null once the
// account is deleted, and companyOverride (the per-posting fallback) was
// never filled in for these either. There's nothing to recover: Mongo
// doesn't keep a "last known name" for a dangling ObjectId reference, so
// leaving them shows "Company not available" forever instead of
// fabricating an association to some other, unrelated company.
//
// Safe by default: running with no flags only LISTS what would be
// deleted. Nothing is removed unless you pass --confirm.
//
// Usage:
//   node scripts/deleteOrphanedJobs.js            (dry run — list only)
//   node scripts/deleteOrphanedJobs.js --confirm   (actually deletes)
require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("../models/Job");
const User = require("../models/User");

async function run() {
  const confirm = process.argv.includes("--confirm");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Scanning jobs for dangling employer references...");

  const jobs = await Job.find({}).select("_id title employer companyOverride createdAt status").lean();
  const employerIds = [...new Set(jobs.map((j) => j.employer && String(j.employer)).filter(Boolean))];
  const existingUsers = await User.find({ _id: { $in: employerIds } }).select("_id").lean();
  const existingIds = new Set(existingUsers.map((u) => String(u._id)));

  // Only orphaned by a dangling reference — NOT jobs that simply have no
  // companyOverride but a perfectly valid, existing employer (those are
  // fine; getJobs already populates them correctly).
  const orphaned = jobs.filter((j) => !j.employer || !existingIds.has(String(j.employer)));

  console.log(`Total jobs: ${jobs.length}`);
  console.log(`Orphaned (employer no longer exists): ${orphaned.length}\n`);

  orphaned.forEach((j) => {
    console.log(
      `  ${j._id}  "${j.title}"  status=${j.status}  createdAt=${j.createdAt.toISOString().slice(0, 10)}`
    );
  });

  if (orphaned.length === 0) {
    console.log("\nNothing to delete.");
  } else if (!confirm) {
    console.log(`\nDry run only — nothing deleted. Re-run with --confirm to delete these ${orphaned.length} job(s).`);
  } else {
    const result = await Job.deleteMany({ _id: { $in: orphaned.map((j) => j._id) } });
    console.log(`\nDeleted ${result.deletedCount} job(s).`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error("deleteOrphanedJobs failed:", err);
  process.exit(1);
});
