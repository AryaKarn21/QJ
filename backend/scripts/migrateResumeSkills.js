/**
 * One-time migration: converts Resume.skills from string[] to the new
 * object[] format ({ name, category, level }) introduced alongside
 * categorized skills. Safe to re-run — already-migrated resumes are skipped.
 *
 * Usage (from the backend/ folder):
 *   node scripts/migrateResumeSkills.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function migrate() {
  await connectDB();
  const collection = mongoose.connection.collection("resumes");
  const cursor = collection.find({ skills: { $type: "array" } });

  let scanned = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    const skills = doc.skills || [];
    const needsMigration = skills.some((s) => typeof s === "string");
    if (!needsMigration) continue;

    const migrated = skills.map((s) =>
      typeof s === "string" ? { name: s, category: "Other", level: "Intermediate" } : s
    );

    await collection.updateOne({ _id: doc._id }, { $set: { skills: migrated } });
    updated++;
  }

  console.log(`Scanned ${scanned} resumes, migrated ${updated}.`);
  await mongoose.connection.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});