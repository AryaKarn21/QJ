/**
 * One-time migration: backfills the new worker-friendly fields
 * (workerCategoryId, languageMode, workerInfo, client, job) onto resumes
 * created before this feature existed. Purely additive — never touches
 * existing fields (personalInfo, experience, education, etc.), so no
 * existing resume changes visually or in content. Safe to re-run.
 *
 * Usage (from the backend/ folder):
 *   node scripts/migrateResumeWorkerFields.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const WORKER_INFO_DEFAULTS = {
  dateOfBirth: "",
  nationality: "",
  passportNumber: "",
  jobPosition: "",
  yearsOfExperience: "",
  previousCompany: "",
  country: "",
  mainResponsibilities: "",
  simpleSkills: [],
};

async function migrate() {
  await connectDB();
  const collection = mongoose.connection.collection("resumes");

  // Only touch documents that don't already have the new fields.
  const cursor = collection.find({
    $or: [
      { workerCategoryId: { $exists: false } },
      { languageMode: { $exists: false } },
      { workerInfo: { $exists: false } },
    ],
  });

  let scanned = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    const update = {};
    if (doc.workerCategoryId === undefined) update.workerCategoryId = "";
    if (doc.languageMode === undefined) update.languageMode = "en";
    if (doc.workerInfo === undefined) update.workerInfo = WORKER_INFO_DEFAULTS;
    if (doc.client === undefined) update.client = null;
    if (doc.job === undefined) update.job = null;

    if (Object.keys(update).length === 0) continue;

    await collection.updateOne({ _id: doc._id }, { $set: update });
    updated++;
  }

  console.log(`Scanned ${scanned} resumes, backfilled ${updated}.`);
  await mongoose.connection.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});