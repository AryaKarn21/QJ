/**
 * Migration: seed CompanyMember records from existing Recruiter → employer links.
 *
 * Usage (from the backend/ folder):
 *   node scripts/migrateRecruitersToCompanyMembers.js
 *
 * Dry-run (preview without writing):
 *   DRY_RUN=true node scripts/migrateRecruitersToCompanyMembers.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const DRY_RUN = process.env.DRY_RUN === "true";

async function migrate() {
  await connectDB();
  console.log(
    `\n🔍  Starting CompanyMember migration${DRY_RUN ? " [DRY RUN — nothing will be written]" : ""}…\n`
  );

  const usersCol = mongoose.connection.collection("users");
  const membersCol = mongoose.connection.collection("companymembers");

  const recruiters = await usersCol
    .find({ role: "recruiter", employer: { $exists: true, $ne: null } })
    .toArray();

  console.log(`  Found ${recruiters.length} recruiter(s) with an employer link.\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const recruiter of recruiters) {
    const companyId = recruiter.employer;
    const userId    = recruiter._id;

    const employer = await usersCol.findOne({ _id: companyId, role: "employer" });
    if (!employer) {
      console.warn(`  ⚠️  Recruiter ${recruiter.name} (${userId}) → employer ${companyId} not found. Skipping.`);
      skipped++;
      continue;
    }

    const existing = await membersCol.findOne({ company: companyId, user: userId });
    if (existing) {
      console.log(`  ↩  Skipping ${recruiter.name} @ ${employer.name} — CompanyMember already exists.`);
      skipped++;
      continue;
    }

    const doc = {
      company:     companyId,
      user:        userId,
      designation: recruiter.designation || "Recruiter",
      department:  recruiter.department  || "Human Resources",
      joinedAt:    recruiter.createdAt   || new Date(),
      status:      recruiter.isActive === false ? "Inactive" : "Active",
      createdAt:   new Date(),
      updatedAt:   new Date(),
    };

    console.log(
      `  ${DRY_RUN ? "[DRY] " : ""}✅  ${recruiter.name} → ${employer.name}` +
      `  (${doc.designation} / ${doc.department} / ${doc.status})`
    );

    if (!DRY_RUN) {
      try {
        await membersCol.insertOne(doc);
        created++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`       ↩  Duplicate key — skipped.`);
          skipped++;
        } else {
          console.error(`       ❌  Insert failed:`, err.message);
          errors++;
        }
      }
    } else {
      created++;
    }
  }

  console.log(`
📊  Migration complete${DRY_RUN ? " (DRY RUN)" : ""}:
    Created : ${created}
    Skipped : ${skipped}
    Errors  : ${errors}
`);

  await mongoose.disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

migrate().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});