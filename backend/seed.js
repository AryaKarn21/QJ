/**
 * One-time seed script to create the first superadmin account.
 *
 * Usage:
 *   1. Add SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD to your .env
 *   2. Run: node seed.js
 *   3. Log in with those credentials, then delete/rotate the password if you want
 *
 * This bypasses the OTP/email verification flow since it's meant for local
 * setup, not for creating regular user accounts.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const dns = require("dns");
const User = require("./models/User");

dotenv.config();

// Same DNS fix as config/db.js
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const { MONGO_URI, SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

async function seedSuperAdmin() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is missing from .env. Aborting.");
    process.exit(1);
  }

  if (!SUPERADMIN_NAME || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.error(
      "Missing SUPERADMIN_NAME, SUPERADMIN_EMAIL, or SUPERADMIN_PASSWORD in .env.\n" +
      "Add these three variables before running this script."
    );
    process.exit(1);
  }

  if (SUPERADMIN_PASSWORD.length < 8) {
    console.error("SUPERADMIN_PASSWORD must be at least 8 characters long.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const existing = await User.findOne({ email: SUPERADMIN_EMAIL });
    if (existing) {
      console.log(`A user with email ${SUPERADMIN_EMAIL} already exists (role: ${existing.role}).`);
      if (existing.role !== "superadmin") {
        console.log("Promoting this existing account to superadmin...");
        existing.role = "superadmin";
        existing.isVerified = true;
        existing.emailVerified = true;
        await existing.save();
        console.log("Done. This account is now a superadmin.");
      } else {
        console.log("This account is already a superadmin. Nothing to do.");
      }
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);

    const superadmin = new User({
      name: SUPERADMIN_NAME,
      email: SUPERADMIN_EMAIL,
      password: hashedPassword,
      role: "superadmin",
      isVerified: true,
      emailVerified: true,
      authMethod: "email",
    });

    await superadmin.save();

    console.log("Superadmin account created successfully:");
    console.log(`  Email: ${SUPERADMIN_EMAIL}`);
    console.log(`  Role:  superadmin`);
    console.log("You can now log in with this email and the password you set in .env.");
  } catch (error) {
    console.error("Error seeding superadmin:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedSuperAdmin();