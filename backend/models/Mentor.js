const mongoose = require("mongoose");
const User = require("./User");

// A Mentor shares career guidance/interview-experience content and can be
// followed for that content specifically (Career Tips / Interview
// Experiences feed filters surface their posts).
const mentorSchema = new mongoose.Schema({
  profilePic: { type: String },
  currentRole: { type: String, trim: true },
  currentCompany: { type: String, trim: true },
  expertise: [String],
  yearsOfExperience: { type: Number },
  bio: { type: String, trim: true, maxlength: 1000 },
});

const Mentor = User.discriminator("mentor", mentorSchema);
module.exports = Mentor;
