const mongoose = require("mongoose");
const User = require("./User");

// A Recruiter posts and hires on behalf of a company. Kept intentionally
// close to the Employer schema so the Community module can treat both
// similarly, but a recruiter is a distinct login the way a real ATS/CRM
// would model a "team member" who isn't the company's primary account.
const recruiterSchema = new mongoose.Schema({
  profilePic: { type: String },
  companyName: { type: String, trim: true },
  // Optional link to a real Employer account this recruiter works for.
  // Left optional (freelance/agency recruiters exist too) rather than
  // required, so the Community module isn't blocked on the separate
  // "link recruiter to employer" admin workflow.
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  designation: { type: String, trim: true },
  industryType: { type: String, trim: true },
});

const Recruiter = User.discriminator("recruiter", recruiterSchema);
module.exports = Recruiter;
