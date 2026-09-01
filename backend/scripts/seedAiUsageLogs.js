/**
 * Backfills the AiUsageLog collection with demo "resume builder" activity,
 * so the AI Center dashboard has meaningful numbers to show right away
 * instead of starting at zero.
 *
 * This is clearly demo/seed data (isSeedData: true on every row) — it does
 * NOT fabricate real users. Genuine usage will keep accumulating on top of
 * this via the real /api/ai-usage/log-resume-build endpoint every time
 * someone actually downloads a resume from the app.
 *
 * Usage (from the backend/ folder):
 *   node scripts/seedAiUsageLogs.js
 *   node scripts/seedAiUsageLogs.js --count=1500   (optional, default 1200)
 *   node scripts/seedAiUsageLogs.js --clear         (delete existing seed rows first)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const AiUsageLog = require("../models/AiUsageLog");

const TEMPLATES = [
  { templateId: "green-simple", templateName: "Science & Engineering", weight: 0.42 },
  { templateId: "white-sales", templateName: "Sales Representative", weight: 0.33 },
  { templateId: "blue-professional", templateName: "Professional CV", weight: 0.25 },
];

function pickTemplate() {
  const r = Math.random();
  let cumulative = 0;
  for (const t of TEMPLATES) {
    cumulative += t.weight;
    if (r <= cumulative) return t;
  }
  return TEMPLATES[0];
}

// Spreads builds over the last 90 days with more activity on recent days
// (a mild upward trend) rather than a flat random distribution, so the
// dashboard's trend chart looks like real, growing usage.
function randomTimestampWithinLastNDays(days) {
  const now = Date.now();
  // Bias towards more recent days: square the random value.
  const biased = 1 - Math.pow(Math.random(), 2);
  const msAgo = biased * days * 24 * 60 * 60 * 1000;
  return new Date(now - msAgo);
}

async function seed() {
  const args = process.argv.slice(2);
  const countArg = args.find((a) => a.startsWith("--count="));
  const count = countArg ? parseInt(countArg.split("=")[1], 10) : 1200;
  const shouldClear = args.includes("--clear");

  await connectDB();

  if (shouldClear) {
    const { deletedCount } = await AiUsageLog.deleteMany({ isSeedData: true });
    console.log(`Cleared ${deletedCount} existing seed rows.`);
  }

  const docs = Array.from({ length: count }).map(() => {
    const template = pickTemplate();
    return {
      feature: "resume_builder",
      action: Math.random() < 0.15 ? "created" : "downloaded",
      templateId: template.templateId,
      templateName: template.templateName,
      user: null,
      isSeedData: true,
      createdAt: randomTimestampWithinLastNDays(90),
    };
  });

  await AiUsageLog.insertMany(docs);
  const total = await AiUsageLog.countDocuments({ feature: "resume_builder" });

  console.log(`Inserted ${docs.length} demo resume-build events.`);
  console.log(`Total resume_builder events in the database now: ${total}`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});