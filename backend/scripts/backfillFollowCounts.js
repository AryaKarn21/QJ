// One-off maintenance script: (re)computes User.followersCount /
// User.followingCount from the canonical Follow collection.
//
// Run this:
//   - once, after deploying the denormalized-counters change, to seed
//     counts for accounts that existed before it;
//   - any time count drift is suspected (e.g. a crashed process left a
//     Follow write applied without its counter increment).
//
// Safe to re-run any number of times — it always recomputes from Follow
// documents rather than incrementing, so it's idempotent.
//
// Usage: node scripts/backfillFollowCounts.js
require("dotenv").config();
const mongoose = require("mongoose");
const Follow = require("../models/Follow");
const User = require("../models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Recomputing follow counters...");

  const [followerAgg, followingAgg] = await Promise.all([
    Follow.aggregate([{ $group: { _id: "$following", count: { $sum: 1 } } }]),
    Follow.aggregate([{ $group: { _id: "$follower", count: { $sum: 1 } } }]),
  ]);

  const followerCounts = new Map(followerAgg.map((r) => [String(r._id), r.count]));
  const followingCounts = new Map(followingAgg.map((r) => [String(r._id), r.count]));

  const allUserIds = new Set([...followerCounts.keys(), ...followingCounts.keys()]);

  // Reset every user to 0 first so accounts that lost all their
  // followers/following (or never had any) end up correct too.
  await User.updateMany({}, { $set: { followersCount: 0, followingCount: 0 } });

  const bulkOps = [...allUserIds].map((id) => ({
    updateOne: {
      filter: { _id: id },
      update: {
        $set: {
          followersCount: followerCounts.get(id) || 0,
          followingCount: followingCounts.get(id) || 0,
        },
      },
    },
  }));

  if (bulkOps.length) {
    const result = await User.bulkWrite(bulkOps, { ordered: false });
    console.log(`Updated ${result.modifiedCount ?? bulkOps.length} user(s).`);
  } else {
    console.log("No Follow documents found — nothing to backfill.");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
